//! Pure bounded Council projection of accepted public adapter answers.
//! Never serialize Session, Invocation, lead proposals or artifact receipts.
//! The final delivery text remains the host's canonical run.answer.

use crate::team_strategy::{Contribution, Delivery, Role, Session, Strategy};
use serde::Serialize;
use std::collections::BTreeMap;

const MAX_ROWS: usize = 6;
const MAX_ITEM_BYTES: usize = 24 * 1024;
const MAX_TOTAL_BYTES: usize = 96 * 1024;
const MAX_ID_BYTES: usize = 128;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicMemberResult {
    pub schema_version: u32,
    #[serde(rename = "memberID")]
    pub member_id: String,
    #[serde(rename = "providerID")]
    pub provider_id: Option<String>,
    pub role: Role,
    pub text: String,
    pub truncated: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicResolution {
    pub schema_version: u32,
    pub kind: String,
    pub reviewed: bool,
    #[serde(rename = "reviewerMemberID")]
    pub reviewer_member_id: String,
    #[serde(rename = "providerID")]
    pub provider_id: Option<String>,
    pub summary: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicProjection {
    pub member_results: Vec<PublicMemberResult>,
    pub resolution: Option<PublicResolution>,
}

fn valid_id(s: &str) -> bool {
    !s.is_empty() && s.len() <= MAX_ID_BYTES && !s.chars().any(char::is_control)
}

fn bounded_text(text: &str, limit: usize) -> (String, bool) {
    let mut end = text.len().min(limit);
    while !text.is_char_boundary(end) {
        end -= 1;
    }
    (text[..end].to_owned(), end < text.len())
}

/// IDs come only from the host's frozen member/provider mapping. Unknown provider
/// IDs remain null; never substitute route references, paths or model labels.
/// This does not assert that models agree, that claims were verified, or that a
/// project was changed. Council integration is synthesis, not a separate review invocation. Legacy
/// delivery flags are not evidence of peer review.
pub fn project_council(
    session: &Session,
    member_providers: &BTreeMap<String, String>,
    lead_member_id: &str,
) -> PublicProjection {
    project_parts(
        session.contributions(),
        session.delivery(),
        member_providers,
        lead_member_id,
    )
}

fn project_parts(
    contributions: &[Contribution],
    delivery: Option<&Delivery>,
    providers: &BTreeMap<String, String>,
    lead: &str,
) -> PublicProjection {
    let provider = |member: &str| providers.get(member).filter(|id| valid_id(id)).cloned();
    let mut remaining = MAX_TOTAL_BYTES;
    let member_results = contributions
        .iter()
        .filter(|c| c.binding.role == Role::IndependentAnswer && valid_id(&c.binding.member_id))
        .take(MAX_ROWS)
        .map(|c| {
            let (text, truncated) = bounded_text(&c.text, MAX_ITEM_BYTES.min(remaining));
            remaining -= text.len();
            PublicMemberResult {
                schema_version: 1,
                member_id: c.binding.member_id.clone(),
                provider_id: provider(&c.binding.member_id),
                role: Role::IndependentAnswer,
                text,
                truncated,
            }
        })
        .collect();
    let resolution = delivery
        .filter(|d| d.strategy == Strategy::Council && valid_id(lead))
        .map(|d| PublicResolution {
            schema_version: 1,
            kind: "leadSynthesis".into(),
            reviewed: false,
            reviewer_member_id: lead.into(),
            provider_id: provider(lead),
            summary: "The lead synthesized the member answers into the final answer.".into(),
        });
    PublicProjection {
        member_results,
        resolution,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::team_strategy::{
        ArtifactReceipt, Binding, Capability, FrozenRun, HostOutcome, LeadProposal, Member,
    };

    fn contribution(role: Role, member: &str, text: &str) -> Contribution {
        Contribution {
            binding: Binding {
                run_id: "private-run".into(),
                input_digest: "private-input-digest".into(),
                invocation_id: "private-invocation".into(),
                attempt_id: "private-attempt".into(),
                member_id: member.into(),
                role,
                task_id: Some("private-task".into()),
            },
            text: text.into(),
            artifacts: vec![ArtifactReceipt {
                artifact_id: "private-artifact".into(),
                content_sha256: "private-sha".into(),
                scope_id: "private-scope".into(),
                verification_receipt: "private-receipt".into(),
            }],
        }
    }
    fn providers() -> BTreeMap<String, String> {
        [
            ("lead".into(), "provider-one".into()),
            ("second".into(), "provider-two".into()),
        ]
        .into_iter()
        .collect()
    }
    fn delivery(strategy: Strategy, reviewed: bool) -> Delivery {
        Delivery {
            strategy,
            text: "Canonical final answer, never duplicated".into(),
            artifacts: vec![],
            reviewed,
            applied: false,
        }
    }
    #[test]
    fn absent_delivery_does_not_invent_resolution() {
        let result = project_parts(&[], None, &providers(), "lead");
        assert!(result.member_results.is_empty());
        assert!(result.resolution.is_none());
        let partial = project_parts(
            &[contribution(
                Role::IndependentAnswer,
                "lead",
                "Public answer",
            )],
            None,
            &providers(),
            "lead",
        );
        assert_eq!(partial.member_results[0].text, "Public answer");
        assert!(partial.resolution.is_none());
    }
    #[test]
    fn structural_allowlist_excludes_private_decisions_bindings_receipts_and_final_text() {
        let rows = vec![
            contribution(Role::Decide, "lead", "private-decision"),
            contribution(
                Role::IndependentAnswer,
                "second",
                "Public answer\r\n\tunchanged",
            ),
            contribution(Role::Integrate, "lead", "private-integration"),
            contribution(Role::Review, "lead", "private-review-json"),
            contribution(Role::Worker, "second", "private-worker"),
        ];
        let result = project_parts(
            &rows,
            Some(&delivery(Strategy::Council, true)),
            &providers(),
            "lead",
        );
        assert_eq!(result.member_results.len(), 1);
        assert_eq!(
            result.member_results[0].text,
            "Public answer\r\n\tunchanged"
        );
        let wire = serde_json::to_string(&result).unwrap();
        for excluded in [
            "private-",
            "Canonical final answer",
            "inputDigest",
            "invocation",
            "attempt",
            "taskID",
            "artifacts",
            "checkpoint",
        ] {
            assert!(!wire.contains(excluded), "leaked {excluded}");
        }
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["memberResults"][0]["memberID"], "second");
        assert_eq!(json["memberResults"][0]["providerID"], "provider-two");
        assert_eq!(json["memberResults"][0]["role"], "independentAnswer");
        assert_eq!(json["resolution"]["reviewerMemberID"], "lead");
        assert!(!json["resolution"]["reviewed"].as_bool().unwrap());
    }
    #[test]
    fn utf8_item_and_aggregate_bounds_retain_attribution_and_mark_omitted_text() {
        let text = "😀".repeat(MAX_ITEM_BYTES);
        let rows: Vec<_> = (0..8)
            .map(|i| contribution(Role::IndependentAnswer, &format!("member-{i}"), &text))
            .collect();
        let result = project_parts(&rows, None, &BTreeMap::new(), "lead");
        assert_eq!(result.member_results.len(), 6);
        assert_eq!(
            result
                .member_results
                .iter()
                .map(|r| r.text.len())
                .sum::<usize>(),
            MAX_TOTAL_BYTES
        );
        assert!(result
            .member_results
            .iter()
            .all(|r| r.text.len() <= MAX_ITEM_BYTES && r.truncated && r.provider_id.is_none()));
        assert!(result.member_results[4].text.is_empty());
        assert_eq!(result.member_results[4].member_id, "member-4");
        let (text, truncated) = bounded_text("ab😀z", 5);
        assert_eq!(text, "ab");
        assert!(truncated);
    }
    #[test]
    fn unknown_provider_is_null_and_malformed_ids_are_not_truncated_into_new_identities() {
        let rows = vec![
            contribution(Role::IndependentAnswer, "unknown", "text"),
            contribution(Role::IndependentAnswer, &"x".repeat(129), "text"),
            contribution(Role::IndependentAnswer, "bad\nmember", "text"),
        ];
        let result = project_parts(
            &rows,
            Some(&delivery(Strategy::Council, true)),
            &providers(),
            "",
        );
        assert_eq!(result.member_results.len(), 1);
        assert_eq!(result.member_results[0].member_id, "unknown");
        assert!(result.member_results[0].provider_id.is_none());
        assert!(result.resolution.is_none());
    }
    #[test]
    fn review_flag_is_copied_and_non_council_delivery_does_not_get_council_resolution() {
        let result = project_parts(
            &[],
            Some(&delivery(Strategy::Council, false)),
            &providers(),
            "lead",
        );
        assert!(!result.resolution.unwrap().reviewed);
        for strategy in [Strategy::Normal, Strategy::Swarm] {
            assert!(
                project_parts(&[], Some(&delivery(strategy, true)), &providers(), "lead")
                    .resolution
                    .is_none()
            );
        }
    }
    fn complete(session: &mut Session, text: String) {
        let binding = session.next_invocation().unwrap().binding.clone();
        session.mark_dispatched(&binding).unwrap();
        session
            .record_outcome(
                &binding,
                HostOutcome::Success {
                    text,
                    artifacts: vec![],
                    inspected_artifact_digest: None,
                },
            )
            .unwrap();
    }
    #[test]
    fn actual_session_council_projects_only_accepted_answers_and_real_delivery() {
        let frozen = FrozenRun {
            run_id: "run".into(),
            prompt: "Give an answer".into(),
            approved_context: "private context".into(),
            lead_member_id: "lead".into(),
            members: ["lead", "second"]
                .into_iter()
                .map(|id| Member {
                    member_id: id.into(),
                    route_ref: "private-route".into(),
                    model: None,
                    effort: None,
                    capability_receipt: "private-capability".into(),
                    capabilities: vec![Capability::Text, Capability::Decide],
                })
                .collect(),
            scope_grants: vec![],
            manual_strategy: None,
            maximum_calls: 8,
            maximum_tasks: 2,
        };
        let mut session = Session::new(frozen).unwrap();
        assert!(project_council(&session, &providers(), "lead")
            .resolution
            .is_none());
        let proposal = LeadProposal {
            schema_version: 1,
            run_id: "run".into(),
            input_digest: session.input_digest().into(),
            lead_member_id: "lead".into(),
            strategy: Strategy::Council,
            reason: "private-decision".into(),
            council_member_ids: vec!["lead".into(), "second".into()],
            tasks: vec![],
        };
        complete(&mut session, serde_json::to_string(&proposal).unwrap());
        complete(&mut session, "First public answer".into());
        let partial = project_council(&session, &providers(), "lead");
        assert_eq!(partial.member_results.len(), 1);
        assert!(partial.resolution.is_none());
        complete(&mut session, "Second public answer".into());
        complete(&mut session, "Final synthesized answer".into());
        let result = project_council(&session, &providers(), "lead");
        assert_eq!(result.member_results.len(), 2);
        assert!(!result.resolution.unwrap().reviewed);
        assert_eq!(session.delivery().unwrap().text, "Final synthesized answer");
    }
}
