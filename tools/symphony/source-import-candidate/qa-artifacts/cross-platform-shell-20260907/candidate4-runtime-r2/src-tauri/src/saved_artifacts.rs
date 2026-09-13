//! Immutable saved result versions, committed inside the workspace generation.
//! No file storage, provider admission, or renderer-provided provenance.
use crate::host::{RunRecord, WorkspaceSnapshot};
use crate::team_strategy::{Contribution, Role, Session, Strategy};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashSet};

pub const MAX_ARTIFACTS: usize = 400_000;
pub const MAX_TEXT: usize = 2 * 1024 * 1024;
fn err() -> String {
    "Saved result identity or content is invalid.".into()
}
fn id(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 128
        && s.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"-_: .".contains(&b))
        && !s.contains(' ')
}
fn digest(s: &str) -> String {
    format!("{:x}", Sha256::digest(s.as_bytes()))
}
fn hash(s: &str) -> bool {
    s.len() == 64
        && s.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Origin {
    pub kind: String,
    #[serde(rename = "memberID")]
    pub member_id: Option<String>,
    #[serde(rename = "providerID")]
    pub provider_id: Option<String>,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Summary {
    pub schema_version: u32,
    #[serde(rename = "artifactID")]
    pub artifact_id: String,
    #[serde(rename = "conversationID")]
    pub conversation_id: String,
    #[serde(rename = "requestID")]
    pub request_id: String,
    pub origin: Origin,
    pub display_name: String,
    pub preview_kind: String,
    pub language_hint: Option<String>,
    pub byte_length: usize,
    #[serde(rename = "contentSHA256")]
    pub content_sha256: String,
    pub availability: String,
    pub created_at: String,
    #[serde(rename = "supersedesArtifactID")]
    pub supersedes_artifact_id: Option<String>,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersistedArtifact {
    pub summary: Summary,
    // Owned immutable UTF-8 rather than a reference into a changing result projection.
    pub text: String,
    #[serde(rename = "invocationID")]
    pub invocation_id: Option<String>,
    #[serde(rename = "attemptID")]
    pub attempt_id: Option<String>,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InspectRequest {
    #[serde(rename = "artifactID")]
    pub artifact_id: String,
    #[serde(rename = "conversationID")]
    pub conversation_id: String,
    #[serde(rename = "requestID")]
    pub request_id: String,
    #[serde(rename = "expectedSHA256")]
    pub expected_sha256: String,
}
impl InspectRequest {
    pub fn validate(&self) -> Result<(), String> {
        if !id(&self.artifact_id)
            || !id(&self.conversation_id)
            || !id(&self.request_id)
            || !hash(&self.expected_sha256)
        {
            return Err(err());
        }
        Ok(())
    }
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Inspection {
    pub schema_version: u32,
    #[serde(rename = "artifactID")]
    pub artifact_id: String,
    #[serde(rename = "conversationID")]
    pub conversation_id: String,
    #[serde(rename = "requestID")]
    pub request_id: String,
    pub preview_kind: String,
    pub language_hint: Option<String>,
    pub byte_length: usize,
    #[serde(rename = "contentSHA256")]
    pub content_sha256: String,
    pub availability: String,
    pub text: String,
}
fn artifact_id(a: &PersistedArtifact) -> String {
    // JSON tuple is unambiguous even when user IDs contain punctuation.
    let tuple = serde_json::to_string(&(
        1,
        &a.summary.conversation_id,
        &a.summary.request_id,
        &a.summary.origin,
        &a.invocation_id,
        &a.attempt_id,
        &a.summary.content_sha256,
    ))
    .expect("serializable tuple");
    format!("result-v1-{}", digest(&tuple))
}
fn provider(run: &RunRecord, member: Option<&str>) -> Result<Option<String>, String> {
    match member {
        None => Ok(Some(run.admitted.provider.id.clone())),
        Some(member) => {
            let team = run.admitted.team.as_ref().ok_or_else(err)?;
            let index = member
                .strip_prefix("member-")
                .and_then(|n| n.parse::<usize>().ok())
                .and_then(|n| n.checked_sub(1))
                .ok_or_else(err)?;
            if member != format!("member-{}", index + 1) {
                return Err(err());
            }
            Ok(Some(
                team.members.get(index).ok_or_else(err)?.provider_id.clone(),
            ))
        }
    }
}
// Checkpoint replay is the authority for successful producer bindings, not the
// artifact's recomputable ID. Keep all private bindings out of public DTOs.
fn session_for(w: &WorkspaceSnapshot, run: &RunRecord) -> Result<Session, String> {
    if run.admitted.mode != "constellation" {
        return Err(err());
    }
    let mut found = w
        .constellation_sessions
        .iter()
        .filter(|s| s.request_id == run.id);
    let saved = found.next().ok_or_else(err)?;
    if found.next().is_some() {
        return Err(err());
    }
    Session::restore(&saved.checkpoint).map_err(|_| err())
}
fn producer<'a>(
    session: &'a Session,
    run: &RunRecord,
    member: &str,
    role: Role,
    invocation: Option<&str>,
    attempt: Option<&str>,
) -> Result<&'a Contribution, String> {
    let mut matches = session.contributions().iter().filter(|c| {
        c.binding.run_id == run.id
            && c.binding.input_digest == session.input_digest()
            && c.binding.member_id == member
            && c.binding.role == role
            && Some(c.binding.invocation_id.as_str()) == invocation
            && Some(c.binding.attempt_id.as_str()) == attempt
    });
    let exact = matches.next().ok_or_else(err)?;
    if matches.next().is_some() {
        return Err(err());
    }
    Ok(exact)
}
fn final_producer<'a>(
    session: &'a Session,
    run: &RunRecord,
) -> Result<&'a Contribution, String> {
    let delivery = session.delivery().ok_or_else(err)?;
    if delivery.strategy != Strategy::Council
        || run.answer.as_deref() != Some(delivery.text.as_str())
    {
        return Err(err());
    }
    let team = run.admitted.team.as_ref().ok_or_else(err)?;
    let lead = format!("member-{}", team.lead_index + 1);
    let mut matches = session.contributions().iter().filter(|c| {
        c.binding.run_id == run.id
            && c.binding.input_digest == session.input_digest()
            && c.binding.member_id == lead
            && c.binding.role == Role::Integrate
            && c.text == delivery.text
    });
    let exact = matches.next().ok_or_else(err)?;
    if matches.next().is_some() {
        return Err(err());
    }
    Ok(exact)
}
pub fn validate(w: &WorkspaceSnapshot) -> Result<(), String> {
    if w.artifact_schema_version > 1
        || (w.artifact_schema_version == 0 && !w.artifacts.is_empty())
        || w.artifacts.len() > MAX_ARTIFACTS
    {
        return Err(err());
    }
    let mut seen = BTreeMap::<&str, &PersistedArtifact>::new();
    for a in &w.artifacts {
        let s = &a.summary;
        let run = w
            .runs
            .iter()
            .find(|r| r.id == s.request_id && r.conversation_id == s.conversation_id)
            .ok_or_else(err)?;
        if !w.conversations.iter().any(|c| c.id == s.conversation_id)
            || run.admitted.request_id != run.id
            || run.admitted.conversation_id != run.conversation_id
        {
            return Err(err());
        }
        if s.schema_version != 1
            || !id(&s.artifact_id)
            || !id(&s.conversation_id)
            || !id(&s.request_id)
            || s.preview_kind != "plainText"
            || s.language_hint.is_some()
            || s.availability != "available"
            || s.byte_length != a.text.len()
            || a.text.len() > MAX_TEXT
            || s.content_sha256 != digest(&a.text)
            || s.artifact_id != artifact_id(a)
            || s.created_at.is_empty()
            || s.created_at.len() > 128
        {
            return Err(err());
        }
        let label = match s.origin.kind.as_str() {
            "finalAnswer" if s.origin.member_id.is_none() => {
                if run.admitted.mode == "constellation" {
                    let session = session_for(w, run)?;
                    let c = final_producer(&session, run)?;
                    if a.invocation_id.as_deref() != Some(c.binding.invocation_id.as_str())
                        || a.attempt_id.as_deref() != Some(c.binding.attempt_id.as_str())
                        || a.text != c.text
                    {
                        return Err(err());
                    }
                } else if a.invocation_id.is_some() || a.attempt_id.is_some() {
                    return Err(err());
                }
                "Final answer".to_owned()
            }
            "memberAnswer"
                if s.origin.member_id.as_deref().is_some_and(id)
                    && a.invocation_id.as_deref().is_some_and(id)
                    && a.attempt_id.as_deref().is_some_and(id) =>
            {
                let session = session_for(w, run)?;
                let member = s.origin.member_id.as_deref().unwrap();
                let c = producer(
                    &session,
                    run,
                    member,
                    Role::IndependentAnswer,
                    a.invocation_id.as_deref(),
                    a.attempt_id.as_deref(),
                )?;
                if a.text != c.text {
                    return Err(err());
                }
                format!("{member} answer")
            }
            _ => return Err(err()),
        };
        if s.display_name != label
            || s.origin.provider_id != provider(run, s.origin.member_id.as_deref())?
        {
            return Err(err());
        }
        if let Some(previous) = s.supersedes_artifact_id.as_deref() {
            let old = seen.get(previous).ok_or_else(err)?;
            if old.summary.request_id != s.request_id
                || old.summary.conversation_id != s.conversation_id
                || old.summary.origin != s.origin
            {
                return Err(err());
            }
        }
        if seen.insert(&s.artifact_id, a).is_some() {
            return Err(err());
        }
    }
    Ok(())
}
fn record(
    run: &RunRecord,
    text: String,
    member: Option<String>,
    invocation: Option<String>,
    attempt: Option<String>,
) -> Result<PersistedArtifact, String> {
    let origin = Origin {
        kind: if member.is_some() {
            "memberAnswer"
        } else {
            "finalAnswer"
        }
        .into(),
        provider_id: provider(run, member.as_deref())?,
        member_id: member.clone(),
    };
    let mut a = PersistedArtifact {
        summary: Summary {
            schema_version: 1,
            artifact_id: String::new(),
            conversation_id: run.conversation_id.clone(),
            request_id: run.id.clone(),
            origin,
            display_name: member
                .map(|m| format!("{m} answer"))
                .unwrap_or("Final answer".into()),
            preview_kind: "plainText".into(),
            language_hint: None,
            byte_length: text.len(),
            content_sha256: digest(&text),
            availability: "available".into(),
            created_at: run.updated_at.clone(),
            supersedes_artifact_id: None,
        },
        text,
        invocation_id: invocation,
        attempt_id: attempt,
    };
    a.summary.artifact_id = artifact_id(&a);
    Ok(a)
}
/// Called on a private candidate before the same atomic workspace save. Existing
/// versions are validated, never rebound to a newer member slot or current route.
pub fn materialize(w: &mut WorkspaceSnapshot) -> Result<bool, String> {
    validate(w)?;
    let mut additions = Vec::new();
    for run in &w.runs {
        if run.admitted.mode == "constellation" {
            let session = session_for(w, run)?;
            for c in session
                .contributions()
                .iter()
                .filter(|c| c.binding.role == Role::IndependentAnswer)
            {
                additions.push(record(
                    run,
                    c.text.clone(),
                    Some(c.binding.member_id.clone()),
                    Some(c.binding.invocation_id.clone()),
                    Some(c.binding.attempt_id.clone()),
                )?);
            }
            if matches!(run.status.as_str(), "completed" | "preserved") && run.answer.is_some() {
                let c = final_producer(&session, run)?;
                additions.push(record(
                    run,
                    c.text.clone(),
                    None,
                    Some(c.binding.invocation_id.clone()),
                    Some(c.binding.attempt_id.clone()),
                )?);
            }
        } else if matches!(run.status.as_str(), "completed" | "preserved") {
            if let Some(text) = &run.answer {
                additions.push(record(run, text.clone(), None, None, None)?);
            }
        }
    }
    let mut seen = w
        .artifacts
        .iter()
        .map(|a| a.summary.artifact_id.clone())
        .collect::<HashSet<_>>();
    let mut changed = w.artifact_schema_version != 1;
    for mut a in additions {
        if seen.insert(a.summary.artifact_id.clone()) {
            a.summary.supersedes_artifact_id = w
                .artifacts
                .iter()
                .rev()
                .find(|old| {
                    old.summary.request_id == a.summary.request_id
                        && old.summary.origin == a.summary.origin
                })
                .map(|old| old.summary.artifact_id.clone());
            w.artifacts.push(a);
            changed = true;
        }
    }
    w.artifact_schema_version = 1;
    validate(w)?;
    Ok(changed)
}
pub fn summaries(w: &WorkspaceSnapshot) -> Result<Vec<Summary>, String> {
    validate(w)?;
    Ok(w.artifacts.iter().map(|a| a.summary.clone()).collect())
}
pub fn inspect(w: &WorkspaceSnapshot, q: &InspectRequest) -> Result<Inspection, String> {
    q.validate()?;
    validate(w)?;
    let a = w
        .artifacts
        .iter()
        .find(|a| {
            a.summary.artifact_id == q.artifact_id
                && a.summary.conversation_id == q.conversation_id
                && a.summary.request_id == q.request_id
                && a.summary.content_sha256 == q.expected_sha256
        })
        .ok_or_else(err)?;
    let s = &a.summary;
    Ok(Inspection {
        schema_version: 1,
        artifact_id: s.artifact_id.clone(),
        conversation_id: s.conversation_id.clone(),
        request_id: s.request_id.clone(),
        preview_kind: s.preview_kind.clone(),
        language_hint: s.language_hint.clone(),
        byte_length: s.byte_length,
        content_sha256: s.content_sha256.clone(),
        availability: s.availability.clone(),
        text: a.text.clone(),
    })
}
