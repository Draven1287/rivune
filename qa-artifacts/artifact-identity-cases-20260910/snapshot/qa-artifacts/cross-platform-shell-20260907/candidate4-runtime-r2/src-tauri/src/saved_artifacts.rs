//! Immutable saved result versions, committed inside the workspace generation.
//! No file storage, provider admission, or renderer-provided provenance.
use crate::constellation_projection::project_council;
use crate::host::{RunRecord, WorkspaceSnapshot};
use crate::team_strategy::{Role, Session};
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
            "finalAnswer"
                if s.origin.member_id.is_none()
                    && a.invocation_id.is_none()
                    && a.attempt_id.is_none() =>
            {
                "Final answer".to_owned()
            }
            "memberAnswer"
                if s.origin.member_id.as_deref().is_some_and(id)
                    && a.invocation_id.as_deref().is_some_and(id)
                    && a.attempt_id.as_deref().is_some_and(id) =>
            {
                format!("{} answer", s.origin.member_id.as_ref().unwrap())
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
        if let Some(saved) = w
            .constellation_sessions
            .iter()
            .find(|s| s.request_id == run.id)
        {
            let session = Session::restore(&saved.checkpoint)?;
            let team = run.admitted.team.as_ref().ok_or_else(err)?;
            let mapping = team
                .members
                .iter()
                .enumerate()
                .map(|(i, m)| (format!("member-{}", i + 1), m.provider_id.clone()))
                .collect();
            let projected = project_council(
                &session,
                &mapping,
                &format!("member-{}", team.lead_index + 1),
            );
            for m in projected.member_results {
                let c = session
                    .contributions()
                    .iter()
                    .find(|c| {
                        c.binding.member_id == m.member_id
                            && c.binding.role == Role::IndependentAnswer
                    })
                    .ok_or_else(err)?;
                additions.push(record(
                    run,
                    m.text,
                    Some(m.member_id),
                    Some(c.binding.invocation_id.clone()),
                    Some(c.binding.attempt_id.clone()),
                )?);
            }
        }
        if matches!(run.status.as_str(), "completed" | "preserved") {
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
