use super::*;
use crate::saved_artifacts::{self as artifacts, InspectRequest};
static PROFILE_COUNTER: AtomicU64 = AtomicU64::new(0);
fn profile() -> PathBuf {
    std::env::temp_dir().join(format!(
        "rivune-artifact-test-{}-{}-{}",
        std::process::id(),
        PROFILE_COUNTER.fetch_add(1, Ordering::SeqCst),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ))
}
fn run(id: &str, conversation: &str) -> RunRecord {
    RunRecord {
        id: id.into(),
        conversation_id: conversation.into(),
        status: "running".into(),
        updated_at: "2026-09-10T00:00:00Z".into(),
        admitted: AdmittedRequest {
            request_id: id.into(),
            conversation_id: conversation.into(),
            prompt: "private prompt".into(),
            mode: "direct".into(),
            provider: ProviderConfig {
                id: "fixture:old-provider".into(),
                kind: ProviderKind::Fixture,
                executable_path: "/bin/cat".into(),
                model: None,
                timeout_ms: 1000,
            },
            approved_context: ApprovedContext::default(),
            attachments: vec![],
            model_selection: None,
            team: None,
            retry_of: None,
        },
        answer: None,
        error: None,
    }
}
fn query(a: &artifacts::PersistedArtifact) -> InspectRequest {
    InspectRequest {
        artifact_id: a.summary.artifact_id.clone(),
        conversation_id: a.summary.conversation_id.clone(),
        request_id: a.summary.request_id.clone(),
        expected_sha256: a.summary.content_sha256.clone(),
    }
}
fn success(text: &str) -> TeamOutcome {
    TeamOutcome::Success {
        text: text.into(),
        artifacts: vec![],
        inspected_artifact_digest: None,
    }
}
fn complete(s: &mut TeamSession, outcome: TeamOutcome) -> TeamBinding {
    let b = s.next_invocation().unwrap().binding.clone();
    s.mark_dispatched(&b).unwrap();
    s.record_outcome(&b, outcome).unwrap();
    b
}
fn council() -> (RunRecord, TeamSession) {
    let mut r = run("council", "welcome");
    r.admitted.mode = "constellation".into();
    r.admitted.team = Some(TeamSelection {
        schema_version: 1,
        lead_index: 0,
        members: (0..2)
            .map(|_| ModelSelection {
                schema_version: 1,
                provider_id: "fixture:old-provider".into(),
                model_id: None,
                effort_id: None,
                catalog_revision: "frozen".into(),
            })
            .collect(),
    });
    let frozen = TeamFrozenRun {
        run_id: r.id.clone(),
        prompt: "private prompt".into(),
        approved_context: "private context".into(),
        lead_member_id: "member-1".into(),
        members: (1..=2)
            .map(|i| TeamMember {
                member_id: format!("member-{i}"),
                route_ref: "private route".into(),
                model: None,
                effort: None,
                capability_receipt: "private receipt".into(),
                capabilities: vec![TeamCapability::Text, TeamCapability::Decide],
            })
            .collect(),
        scope_grants: vec![],
        manual_strategy: None,
        maximum_calls: 12,
        maximum_tasks: 4,
    };
    let mut s = TeamSession::new(frozen).unwrap();
    let proposal = serde_json::json!({"schemaVersion":1,"runId":r.id,"inputDigest":s.input_digest(),"leadMemberId":"member-1","reason":"independent views","councilMemberIds":["member-1","member-2"],"tasks":[],"strategy":"council"});
    complete(&mut s, success(&proposal.to_string()));
    (r, s)
}
#[test]
fn saved_artifact_direct_exact_unicode_identity_and_metadata_only() {
    let p = profile();
    let h = HostState::open(p.clone()).unwrap();
    {
        let mut w = h.workspace.lock().unwrap();
        w.runs.push(run("direct", "welcome"));
        h.save(&mut w).unwrap();
    }
    let text = " \n🪐 e\u{301} é\r\n<script>no()</script> [x](file:///private)\t";
    assert_eq!(
        h.finish_execution("direct", Ok(text.into())).state,
        "accepted"
    );
    let w = h.workspace.lock().unwrap();
    assert_eq!(w.artifacts.len(), 1);
    let a = &w.artifacts[0];
    let q = query(a);
    let got = artifacts::inspect(&w, &q).unwrap();
    assert_eq!(got.text.as_bytes(), text.as_bytes());
    assert_eq!(got.byte_length, text.len());
    for field in [
        "artifactID",
        "requestID",
        "conversationID",
        "expectedSHA256",
    ] {
        let mut v = serde_json::to_value(&q).unwrap();
        v[field] = serde_json::json!(if field == "expectedSHA256" {
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        } else {
            "wrong"
        });
        let wrong: InspectRequest = serde_json::from_value(v).unwrap();
        assert!(artifacts::inspect(&w, &wrong).is_err());
    }
    let meta = public_snapshot(&w).unwrap()["artifacts"].to_string();
    for private in [
        text,
        "text\"",
        "storage",
        "invocationID",
        "attemptID",
        "private prompt",
        "/private/provider",
        "approvedContext",
    ] {
        assert!(!meta.contains(private), "{private}");
    }
    let mut bad = serde_json::to_value(&q).unwrap();
    bad["path"] = serde_json::json!("/private");
    assert!(serde_json::from_value::<InspectRequest>(bad).is_err());
    drop(w);
    drop(h);
    let h = HostState::open(p.clone()).unwrap();
    assert_eq!(
        artifacts::inspect(&h.workspace.lock().unwrap(), &q)
            .unwrap()
            .text,
        text
    );
    drop(h);
    fs::remove_dir_all(p).unwrap();
}
#[test]
fn saved_artifact_migration_idempotent_and_corruption_rejected() {
    let p = profile();
    let mut w = WorkspaceSnapshot::default();
    let mut r = run("legacy", "welcome");
    r.status = "completed".into();
    r.answer = Some("same".into());
    w.runs.push(r);
    persist_with_fault(&p, &w, 1, PersistFault::None).unwrap();
    // Explicitly emulate a pre-contract file with both fields absent.
    let file = p.join("snapshots/workspace-v1-00000000000000000001.json");
    let mut json = serde_json::to_value(&w).unwrap();
    json.as_object_mut().unwrap().remove("artifacts");
    json.as_object_mut()
        .unwrap()
        .remove("artifactSchemaVersion");
    fs::write(file, serde_json::to_vec(&json).unwrap()).unwrap();
    let h = HostState::open(p.clone()).unwrap();
    let baseline = h.workspace.lock().unwrap().artifacts.clone();
    assert_eq!(baseline.len(), 1);
    drop(h);
    let h = HostState::open(p.clone()).unwrap();
    assert_eq!(h.workspace.lock().unwrap().artifacts, baseline);
    let mut changed = h.workspace.lock().unwrap().clone();
    changed.artifacts[0].text.push('!');
    assert!(h.save(&mut changed).is_err());
    assert!(artifacts::inspect(&changed, &query(&baseline[0])).is_err());
    changed = h.workspace.lock().unwrap().clone();
    changed.artifact_schema_version = 2;
    assert!(h.save(&mut changed).is_err());
    drop(h);
    fs::remove_dir_all(p).unwrap();
}
#[test]
fn saved_artifact_save_faults_are_atomic_and_uncertainty_reconciles_once() {
    for fault in [
        PersistFault::AfterWrite,
        PersistFault::AfterSync,
        PersistFault::AfterRename,
    ] {
        let p = profile();
        let h = HostState::open(p.clone()).unwrap();
        let w = h.workspace.lock().unwrap();
        let mut candidate = w.clone();
        let mut r = run("result", "welcome");
        r.status = "completed".into();
        r.answer = Some("exact".into());
        candidate.runs.push(r);
        h.fail_next_save(fault);
        assert!(h.save(&mut candidate).is_err());
        assert!(candidate.artifacts.is_empty());
        assert!(w.artifacts.is_empty());
        drop(w);
        h.save(&mut candidate).unwrap();
        assert_eq!(candidate.artifacts.len(), 1);
        let expected = candidate.artifacts.clone();
        h.save(&mut candidate).unwrap();
        assert_eq!(candidate.artifacts, expected);
        drop(h);
        let h = HostState::open(p.clone()).unwrap();
        assert_eq!(h.workspace.lock().unwrap().artifacts, expected);
        drop(h);
        fs::remove_dir_all(p).unwrap();
    }
}
#[test]
fn saved_artifact_terminal_failure_does_not_publish_unsaved_final() {
    let p = profile();
    let h = HostState::open(p.clone()).unwrap();
    {
        let mut w = h.workspace.lock().unwrap();
        w.runs.push(run("result", "welcome"));
        h.save(&mut w).unwrap();
    }
    h.fail_next_save(PersistFault::AfterWrite);
    assert_eq!(
        h.finish_execution("result", Ok("retained only".into()))
            .state,
        "uncertain"
    );
    assert!(h.workspace.lock().unwrap().artifacts.is_empty());
    drop(h);
    let h = HostState::open(p.clone()).unwrap();
    assert!(h.workspace.lock().unwrap().artifacts.is_empty());
    drop(h);
    fs::remove_dir_all(p).unwrap();
}
#[test]
fn saved_artifact_council_checkpoint_retry_and_cancel_keep_exact_history() {
    let p = profile();
    let h = HostState::open(p.clone()).unwrap();
    let (r, mut s) = council();
    {
        let mut w = h.workspace.lock().unwrap();
        let routes = vec![r.admitted.provider.clone(); 2];
        w.runs.push(r);
        w.constellation_sessions.push(PersistedConstellation {
            request_id: "council".into(),
            checkpoint: s.checkpoint().unwrap(),
            routes,
            activity: RunActivity::default(),
        });
        h.save(&mut w).unwrap();
    }
    complete(&mut s, success("first 🪐"));
    h.fail_checkpoint_saves("memberCompleted", PersistFault::AfterWrite, 2);
    assert!(h
        .save_constellation_checkpoint(
            "council",
            &s,
            (
                "memberCompleted",
                "contribute",
                "running",
                None,
                None,
                "saved member",
                None
            ),
            None
        )
        .is_err());
    assert!(h.workspace.lock().unwrap().artifacts.is_empty());
    h.save_constellation_checkpoint(
        "council",
        &s,
        (
            "memberCompleted",
            "contribute",
            "running",
            None,
            None,
            "saved member",
            None,
        ),
        None,
    )
    .unwrap();
    let first = h.workspace.lock().unwrap().artifacts[0].clone();
    let failed = complete(
        &mut s,
        TeamOutcome::Failed {
            message: "synthetic failure".into(),
        },
    );
    s.retry_failed(&failed).unwrap();
    assert_ne!(
        s.next_invocation().unwrap().binding.attempt_id,
        failed.attempt_id
    );
    assert!(s.retry_failed(&failed).is_err());
    complete(&mut s, success("second"));
    h.save_constellation_checkpoint(
        "council",
        &s,
        (
            "memberCompleted",
            "contribute",
            "running",
            None,
            None,
            "second saved",
            None,
        ),
        None,
    )
    .unwrap();
    {
        let w = h.workspace.lock().unwrap();
        assert_eq!(w.artifacts.len(), 2);
        assert_eq!(w.artifacts[0], first);
        assert_ne!(
            w.artifacts[0].summary.artifact_id,
            w.artifacts[1].summary.artifact_id
        );
    }
    s.cancel().unwrap();
    h.save_constellation_checkpoint(
        "council",
        &s,
        (
            "cancelled",
            "recovery",
            "cancelled",
            None,
            None,
            "cancelled",
            None,
        ),
        Some(("cancelled", None, None)),
    )
    .unwrap();
    let w = h.workspace.lock().unwrap();
    assert_eq!(w.artifacts.len(), 2);
    assert_eq!(
        artifacts::inspect(&w, &query(&first)).unwrap().text,
        "first 🪐"
    );
    drop(w);
    drop(h);
    let h = HostState::open(p.clone()).unwrap();
    assert_eq!(h.workspace.lock().unwrap().artifacts.len(), 2);
    assert_eq!(
        artifacts::inspect(&h.workspace.lock().unwrap(), &query(&first))
            .unwrap()
            .text,
        "first 🪐"
    );
    drop(h);
    fs::remove_dir_all(p).unwrap();
}
#[test]
fn saved_artifact_cross_conversation_and_historical_owned_versions() {
    let mut w = WorkspaceSnapshot::default();
    let mut second = w.conversations[0].clone();
    second.id = "second".into();
    w.conversations.push(second);
    for (id, c) in [("a", "welcome"), ("b", "second")] {
        let mut r = run(id, c);
        r.status = "completed".into();
        r.answer = Some("identical".into());
        w.runs.push(r);
    }
    artifacts::materialize(&mut w).unwrap();
    let first = w.artifacts[0].clone();
    assert_ne!(
        first.summary.artifact_id,
        w.artifacts[1].summary.artifact_id
    );
    w.runs[0].answer = Some("new version".into());
    artifacts::materialize(&mut w).unwrap();
    assert_eq!(w.artifacts.len(), 3);
    assert_eq!(
        w.artifacts[2].summary.supersedes_artifact_id,
        Some(first.summary.artifact_id.clone())
    );
    assert_eq!(
        artifacts::inspect(&w, &query(&first)).unwrap().text,
        "identical"
    );
    w.providers.clear();
    assert!(artifacts::validate(&w).is_ok());
    w.artifacts[2].summary.supersedes_artifact_id =
        Some(w.artifacts[2].summary.artifact_id.clone());
    assert!(artifacts::validate(&w).is_err());
}
#[test]
fn saved_artifact_direct_postrename_reconciliation_is_idempotent() {
    let p = profile();
    let h = HostState::open(p.clone()).unwrap();
    {
        let mut w = h.workspace.lock().unwrap();
        w.runs.push(run("direct", "welcome"));
        h.save(&mut w).unwrap();
    }
    h.fail_next_save(PersistFault::AfterRename);
    assert_eq!(
        h.finish_execution("direct", Ok("durable but uncertain".into()))
            .state,
        "uncertain"
    );
    assert!(h.workspace.lock().unwrap().artifacts.is_empty());
    assert_eq!(h.reconcile("direct").state, "accepted");
    let a = h.workspace.lock().unwrap().artifacts.clone();
    assert_eq!(a.len(), 1);
    assert_eq!(h.reconcile("direct").state, "accepted");
    assert_eq!(h.workspace.lock().unwrap().artifacts, a);
    drop(h);
    let h = HostState::open(p.clone()).unwrap();
    assert_eq!(h.workspace.lock().unwrap().artifacts, a);
    drop(h);
    fs::remove_dir_all(p).unwrap();
}
#[test]
fn saved_artifact_completed_council_has_only_member_answers_and_final() {
    let (mut r, mut s) = council();
    complete(&mut s, success("one"));
    complete(&mut s, success("two"));
    complete(&mut s, success("synthesis"));
    r.status = "completed".into();
    r.answer = Some(s.delivery().unwrap().text.clone());
    let mut w = WorkspaceSnapshot::default();
    w.runs.push(r);
    w.constellation_sessions.push(PersistedConstellation {
        request_id: "council".into(),
        checkpoint: s.checkpoint().unwrap(),
        routes: vec![],
        activity: RunActivity::default(),
    });
    artifacts::materialize(&mut w).unwrap();
    assert_eq!(w.artifacts.len(), 3);
    assert_eq!(
        w.artifacts
            .iter()
            .filter(|a| a.summary.origin.kind == "finalAnswer")
            .count(),
        1
    );
    assert_eq!(w.artifacts[2].text, "synthesis");
    assert!(w
        .artifacts
        .iter()
        .all(|a| !a.text.contains("independent views")));
}
#[test]
fn saved_artifact_corrupt_persisted_record_fails_open_without_repair() {
    let p = profile();
    let mut w = WorkspaceSnapshot::default();
    let mut r = run("r", "welcome");
    r.status = "completed".into();
    r.answer = Some("exact".into());
    w.runs.push(r);
    artifacts::materialize(&mut w).unwrap();
    w.artifacts[0].text = "tampered".into();
    persist_with_fault(&p, &w, 1, PersistFault::None).unwrap();
    assert!(HostState::open(p.clone()).is_err());
    fs::remove_dir_all(p).unwrap();
}
