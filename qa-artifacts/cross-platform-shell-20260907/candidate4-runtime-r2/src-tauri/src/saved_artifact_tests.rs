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
    let accepted_retry = complete(&mut s, success("second"));
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
        assert_eq!(w.artifacts[1].invocation_id.as_deref(), Some(accepted_retry.invocation_id.as_str()));
        assert_eq!(w.artifacts[1].attempt_id.as_deref(), Some(accepted_retry.attempt_id.as_str()));
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
    assert_eq!(h.workspace.lock().unwrap().artifacts[1].attempt_id.as_deref(), Some(accepted_retry.attempt_id.as_str()));
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

// Append inside host::saved_artifact_tests. Uses the captured module's helpers.
fn persistence_case_disk(p: &std::path::Path) -> WorkspaceSnapshot {
    let mut files: Vec<_> = fs::read_dir(p.join("snapshots"))
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("json"))
        .collect();
    files.sort(); // Host generation filenames are zero-padded.
    serde_json::from_slice(&fs::read(files.last().unwrap()).unwrap()).unwrap()
}
fn persistence_case_council(h: &HostState, r: RunRecord, s: &TeamSession) {
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
fn persistence_case_member(h: &HostState, s: &TeamSession) -> Result<RunEvent, String> {
    h.save_constellation_checkpoint(
        "council",
        s,
        (
            "memberCompleted",
            "contribute",
            "running",
            None,
            None,
            "fixture member saved",
            None,
        ),
        None,
    )
}

#[test]
fn saved_artifact_p03_terminal_fault_immediate_reopen() {
    for fault in [
        PersistFault::AfterWrite,
        PersistFault::AfterSync,
        PersistFault::AfterRename,
    ] {
        let p = profile();
        let h = HostState::open(p.clone()).unwrap();
        {
            let mut w = h.workspace.lock().unwrap();
            w.runs.push(run("direct", "welcome"));
            h.save(&mut w).unwrap();
        }
        h.fail_next_save(fault);
        assert_eq!(
            h.finish_execution("direct", Ok("P03 exact 🪐".into()))
                .state,
            "uncertain"
        );
        assert!(h.workspace.lock().unwrap().artifacts.is_empty());
        let committed = fault == PersistFault::AfterRename;
        let disk = persistence_case_disk(&p);
        assert_eq!(
            disk.runs[0].answer.as_deref(),
            if committed {
                Some("P03 exact 🪐")
            } else {
                None
            }
        );
        assert_eq!(
            disk.runs[0].status,
            if committed { "completed" } else { "running" }
        );
        assert_eq!(disk.artifacts.len(), usize::from(committed));
        if committed {
            assert_eq!(
                artifacts::inspect(&disk, &query(&disk.artifacts[0]))
                    .unwrap()
                    .text,
                "P03 exact 🪐"
            );
        }
        // No reconcile/save occurs between fault and reopen.
        drop(h);
        let h = HostState::open(p.clone()).unwrap();
        {
            let w = h.workspace.lock().unwrap();
            assert_eq!(
                w.runs[0].status,
                if committed { "completed" } else { "failed" }
            );
            assert_eq!(w.runs[0].answer, disk.runs[0].answer);
            assert_eq!(w.artifacts, disk.artifacts);
        }
        drop(h);
        fs::remove_dir_all(p).unwrap();
    }
}

#[test]
fn saved_artifact_p05_checkpoint_double_fault_immediate_reopen() {
    for fault in [
        PersistFault::AfterWrite,
        PersistFault::AfterSync,
        PersistFault::AfterRename,
    ] {
        let p = profile();
        let h = HostState::open(p.clone()).unwrap();
        let (r, mut s) = council();
        persistence_case_council(&h, r, &s);
        complete(&mut s, success("P05 member A"));
        persistence_case_member(&h, &s).unwrap();
        let before = persistence_case_disk(&p);
        assert_eq!(before.artifacts.len(), 1);
        complete(&mut s, success("P05 member B"));
        let new_checkpoint = s.checkpoint().unwrap();
        h.fail_checkpoint_saves("memberCompleted", fault, 2);
        assert!(persistence_case_member(&h, &s).is_err());
        assert_eq!(h.workspace.lock().unwrap().artifacts, before.artifacts);
        let disk = persistence_case_disk(&p);
        let committed = fault == PersistFault::AfterRename;
        assert_eq!(disk.artifacts.len(), if committed { 2 } else { 1 });
        assert_eq!(disk.artifacts[0], before.artifacts[0]);
        assert_eq!(
            disk.constellation_sessions[0].checkpoint,
            if committed {
                new_checkpoint
            } else {
                before.constellation_sessions[0].checkpoint.clone()
            }
        );
        assert!(disk.runs[0].answer.is_none());
        assert!(disk
            .artifacts
            .iter()
            .all(|a| a.summary.origin.kind == "memberAnswer"));
        drop(h);
        let h = HostState::open(p.clone()).unwrap();
        {
            let w = h.workspace.lock().unwrap();
            assert_eq!(w.runs[0].status, "failed"); // Prior committed run was still running.
            assert_eq!(w.artifacts, disk.artifacts);
            assert_eq!(
                artifacts::inspect(&w, &query(&before.artifacts[0]))
                    .unwrap()
                    .text,
                "P05 member A"
            );
        }
        drop(h);
        fs::remove_dir_all(p).unwrap();
    }
}

#[test]
fn saved_artifact_p06_final_checkpoint_double_fault_immediate_reopen() {
    for fault in [
        PersistFault::AfterWrite,
        PersistFault::AfterSync,
        PersistFault::AfterRename,
    ] {
        let p = profile();
        let h = HostState::open(p.clone()).unwrap();
        let (r, mut s) = council();
        persistence_case_council(&h, r, &s);
        complete(&mut s, success("P06 member A"));
        persistence_case_member(&h, &s).unwrap();
        complete(&mut s, success("P06 member B"));
        persistence_case_member(&h, &s).unwrap();
        let before = persistence_case_disk(&p);
        assert_eq!(before.artifacts.len(), 2);
        complete(&mut s, success("P06 synthesis"));
        let answer = s.delivery().unwrap().text.clone();
        let terminal_checkpoint = s.checkpoint().unwrap();
        h.fail_checkpoint_saves("finalCompleted", fault, 2);
        assert!(h
            .save_constellation_checkpoint(
                "council",
                &s,
                (
                    "finalCompleted",
                    "final",
                    "completed",
                    None,
                    None,
                    "fixture final",
                    None
                ),
                Some(("completed", Some(answer.clone()), None))
            )
            .is_err());
        assert_eq!(h.workspace.lock().unwrap().artifacts, before.artifacts);
        let disk = persistence_case_disk(&p);
        let committed = fault == PersistFault::AfterRename;
        assert_eq!(
            disk.runs[0].status,
            if committed { "completed" } else { "running" }
        );
        assert_eq!(
            disk.runs[0].answer,
            if committed {
                Some(answer.clone())
            } else {
                None
            }
        );
        assert_eq!(disk.artifacts.len(), if committed { 3 } else { 2 });
        assert_eq!(&disk.artifacts[..2], before.artifacts.as_slice());
        assert_eq!(
            disk.artifacts
                .iter()
                .filter(|a| a.summary.origin.kind == "finalAnswer")
                .count(),
            usize::from(committed)
        );
        assert_eq!(
            disk.constellation_sessions[0].checkpoint,
            if committed {
                terminal_checkpoint
            } else {
                before.constellation_sessions[0].checkpoint.clone()
            }
        );
        if committed {
            assert_eq!(
                artifacts::inspect(&disk, &query(&disk.artifacts[2]))
                    .unwrap()
                    .text,
                answer
            );
        }
        drop(h);
        let h = HostState::open(p.clone()).unwrap();
        {
            let w = h.workspace.lock().unwrap();
            assert_eq!(
                w.runs[0].status,
                if committed { "completed" } else { "failed" }
            );
            assert_eq!(w.runs[0].answer, disk.runs[0].answer);
            assert_eq!(w.artifacts, disk.artifacts);
        }
        drop(h);
        let h = HostState::open(p.clone()).unwrap();
        assert_eq!(h.workspace.lock().unwrap().artifacts, disk.artifacts);
        drop(h);
        fs::remove_dir_all(p).unwrap();
    }
}

// Simulate an attacker who knows the public deterministic-ID algorithm. Rejection
// must come from checkpoint evidence, not from an accidentally stale digest/ID.
fn provenance_reidentify(a: &mut artifacts::PersistedArtifact) {
    a.summary.byte_length = a.text.len();
    a.summary.content_sha256 = format!("{:x}", Sha256::digest(a.text.as_bytes()));
    let tuple = serde_json::to_string(&(
        1,
        &a.summary.conversation_id,
        &a.summary.request_id,
        &a.summary.origin,
        &a.invocation_id,
        &a.attempt_id,
        &a.summary.content_sha256,
    ))
    .unwrap();
    a.summary.artifact_id = format!("result-v1-{:x}", Sha256::digest(tuple.as_bytes()));
}
fn provenance_workspace(mut r: RunRecord, s: &TeamSession) -> WorkspaceSnapshot {
    if let Some(d) = s.delivery() {
        r.status = "completed".into();
        r.answer = Some(d.text.clone());
    }
    let routes = vec![r.admitted.provider.clone(); 2];
    let mut w = WorkspaceSnapshot::default();
    w.runs.push(r);
    w.constellation_sessions.push(PersistedConstellation {
        request_id: "council".into(),
        checkpoint: s.checkpoint().unwrap(),
        routes,
        activity: RunActivity::default(),
    });
    artifacts::materialize(&mut w).unwrap();
    w
}
fn provenance_final_retry() -> (WorkspaceSnapshot, TeamBinding, TeamBinding) {
    let (r, mut s) = council();
    complete(&mut s, success("same"));
    complete(&mut s, success("same"));
    let failed = complete(
        &mut s,
        TeamOutcome::Failed {
            message: "synthetic integrate failure".into(),
        },
    );
    assert_eq!(failed.role, TeamRole::Integrate);
    s.retry_failed(&failed).unwrap();
    let accepted = complete(&mut s, success("same"));
    (provenance_workspace(r, &s), failed, accepted)
}
#[test]
fn saved_artifact_provenance_identical_text_cannot_swap_member_bindings() {
    let (r, mut s) = council();
    complete(&mut s, success("same"));
    complete(&mut s, success("same"));
    let w = provenance_workspace(r, &s);
    assert_eq!(w.artifacts[0].text, w.artifacts[1].text);
    for (target, other) in [(0, 1), (1, 0)] {
        let mut forged = w.clone();
        forged.artifacts[target].invocation_id = w.artifacts[other].invocation_id.clone();
        forged.artifacts[target].attempt_id = w.artifacts[other].attempt_id.clone();
        provenance_reidentify(&mut forged.artifacts[target]);
        assert!(artifacts::validate(&forged).is_err());
        assert!(artifacts::inspect(&forged, &query(&forged.artifacts[target])).is_err());
    }
}
#[test]
fn saved_artifact_provenance_rejects_failed_member_attempt_after_retry() {
    let (r, mut s) = council();
    let failed = complete(
        &mut s,
        TeamOutcome::Failed {
            message: "synthetic member failure".into(),
        },
    );
    s.retry_failed(&failed).unwrap();
    let accepted = complete(&mut s, success("same"));
    let mut w = provenance_workspace(r, &s);
    assert_eq!(
        w.artifacts[0].invocation_id.as_deref(),
        Some(accepted.invocation_id.as_str())
    );
    assert_eq!(
        w.artifacts[0].attempt_id.as_deref(),
        Some(accepted.attempt_id.as_str())
    );
    w.artifacts[0].attempt_id = Some(failed.attempt_id);
    provenance_reidentify(&mut w.artifacts[0]);
    assert!(artifacts::validate(&w).is_err());
}
#[test]
fn saved_artifact_provenance_integrate_retry_binds_successful_attempt_and_reopens() {
    let (mut w, failed, accepted) = provenance_final_retry();
    let final_record = w.artifacts.last().unwrap().clone();
    assert_eq!(final_record.summary.origin.kind, "finalAnswer");
    assert_eq!(final_record.summary.origin.member_id, None);
    assert_eq!(
        final_record.invocation_id.as_deref(),
        Some(accepted.invocation_id.as_str())
    );
    assert_eq!(
        final_record.attempt_id.as_deref(),
        Some(accepted.attempt_id.as_str())
    );
    assert_ne!(accepted.attempt_id, failed.attempt_id);
    let p = profile();
    persist_with_fault(&p, &w, 1, PersistFault::None).unwrap();
    let h = HostState::open(p.clone()).unwrap();
    assert_eq!(h.workspace.lock().unwrap().artifacts, w.artifacts);
    drop(h);
    fs::remove_dir_all(p).unwrap();
    w.artifacts.last_mut().unwrap().attempt_id = Some(failed.attempt_id);
    provenance_reidentify(w.artifacts.last_mut().unwrap());
    assert!(artifacts::validate(&w).is_err());
}
#[test]
fn saved_artifact_provenance_identical_final_bytes_distinguish_attempt_identity() {
    let (w, failed, _) = provenance_final_retry();
    let mut forged = w.clone();
    let a = forged.artifacts.last_mut().unwrap();
    a.attempt_id = Some(failed.attempt_id);
    provenance_reidentify(a);
    assert_eq!(a.text, w.artifacts.last().unwrap().text);
    assert_eq!(
        a.summary.content_sha256,
        w.artifacts.last().unwrap().summary.content_sha256
    );
    assert_ne!(
        a.summary.artifact_id,
        w.artifacts.last().unwrap().summary.artifact_id
    );
    assert!(artifacts::validate(&w).is_ok());
    assert!(artifacts::validate(&forged).is_err());
}
#[test]
fn saved_artifact_provenance_final_rejects_independent_and_decide_roles() {
    let (w, _, _) = provenance_final_retry();
    let session = TeamSession::restore(&w.constellation_sessions[0].checkpoint).unwrap();
    for role in [TeamRole::IndependentAnswer, TeamRole::Decide] {
        let c = session
            .contributions()
            .iter()
            .find(|c| c.binding.role == role)
            .unwrap();
        let mut forged = w.clone();
        let a = forged.artifacts.last_mut().unwrap();
        a.invocation_id = Some(c.binding.invocation_id.clone());
        a.attempt_id = Some(c.binding.attempt_id.clone());
        provenance_reidentify(a);
        assert!(artifacts::validate(&forged).is_err());
    }
}
#[test]
fn saved_artifact_provenance_full_member_bytes_exceed_transcript_excerpt() {
    let (r, mut s) = council();
    let text = "🪐e\u{301}\n".repeat(5000);
    assert!(text.len() > 24 * 1024);
    complete(&mut s, success(&text));
    let mut w = provenance_workspace(r, &s);
    assert_eq!(w.artifacts[0].text, text);
    assert_eq!(
        artifacts::inspect(&w, &query(&w.artifacts[0]))
            .unwrap()
            .text,
        text
    );
    let public = public_snapshot(&w).unwrap();
    assert_eq!(public["runs"][0]["memberResults"][0]["truncated"], true);
    assert!(
        public["runs"][0]["memberResults"][0]["text"]
            .as_str()
            .unwrap()
            .len()
            < text.len()
    );
    w.artifacts[0].text = "different claimed bytes".into();
    provenance_reidentify(&mut w.artifacts[0]);
    assert!(artifacts::validate(&w).is_err());
}
#[test]
fn saved_artifact_provenance_final_requires_run_delivery_and_contribution_equality() {
    let (w, _, _) = provenance_final_retry();
    let mut wrong_run = w.clone();
    wrong_run.runs[0].answer = Some("different".into());
    assert!(artifacts::validate(&wrong_run).is_err());
    let mut wrong_text = w.clone();
    wrong_text.artifacts.last_mut().unwrap().text = "different".into();
    provenance_reidentify(wrong_text.artifacts.last_mut().unwrap());
    assert!(artifacts::validate(&wrong_text).is_err());
    let mut missing = w;
    missing.constellation_sessions.clear();
    assert!(artifacts::validate(&missing).is_err());
}
