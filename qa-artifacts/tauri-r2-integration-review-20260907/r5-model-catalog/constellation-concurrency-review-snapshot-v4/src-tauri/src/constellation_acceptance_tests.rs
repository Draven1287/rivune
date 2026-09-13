// Included inside host.rs's existing #[cfg(test)] mod tests by the runtime owner.
// These tests use HostState and local Fixture providers only.

#[test]
fn acceptance_duplicate_route_save_preserves_durable_draft_and_reopens() {
    let path = profile("acceptance-duplicate-save");
    let host = HostState::open(path.clone()).unwrap();
    let lead = {
        let mut workspace = host.workspace.lock().unwrap();
        let lead = configured_fixture(&mut workspace, "fixture:acceptance-route");
        host.save(&workspace).unwrap();
        lead
    };
    let baseline = SaveRichDraftRequest {
        conversation_id: "welcome".into(),
        mutation_id: "acceptance-existing-draft".into(),
        expected_revision: 0,
        draft: "Keep the original draft".into(),
        attachment_ids: Vec::new(),
        selection: Some(lead.clone()),
        team: None,
    };
    assert_eq!(
        save_rich_draft_in(&host, baseline, false).unwrap().state,
        "durable"
    );
    let before = serde_json::to_value(&*host.workspace.lock().unwrap()).unwrap();
    let mut duplicate = lead.clone();
    duplicate.catalog_revision = "another-catalog-revision".into();
    let rejected = save_rich_draft_in(
        &host,
        SaveRichDraftRequest {
            conversation_id: "welcome".into(),
            mutation_id: "acceptance-invalid-team".into(),
            expected_revision: 1,
            draft: "Must not replace the original".into(),
            attachment_ids: Vec::new(),
            selection: Some(lead.clone()),
            team: Some(TeamSelection {
                schema_version: 1,
                lead_index: 0,
                members: vec![lead, duplicate],
            }),
        },
        false,
    );
    assert_eq!(rejected.unwrap_err(), "DUPLICATE_TEAM_MEMBER");
    assert_eq!(
        serde_json::to_value(&*host.workspace.lock().unwrap()).unwrap(),
        before
    );
    drop(host);
    let reopened = HostState::open(path.clone()).unwrap();
    let workspace = reopened.workspace.lock().unwrap();
    assert_eq!(workspace.conversations[0].draft, "Keep the original draft");
    assert_eq!(workspace.conversations[0].rich_draft.revision, 1);
    assert!(workspace.conversations[0].rich_draft.team.is_none());
    assert!(!workspace
        .draft_mutations
        .iter()
        .any(|m| m.mutation_id == "acceptance-invalid-team"));
    drop(workspace);
    drop(reopened);
    fs::remove_dir_all(path).unwrap();
}

#[cfg(unix)]
#[test]
fn acceptance_council_restart_retry_preserves_provenance_and_failed_retry_is_atomic() {
    let path = profile("acceptance-council-restart");
    let (executable, marker) = council_fail_once_fixture_script("acceptance-council-provider");
    let host = HostState::open(path.clone()).unwrap();
    let (lead, second) = {
        let mut workspace = host.workspace.lock().unwrap();
        for id in ["fixture:acceptance-lead", "fixture:acceptance-second"] {
            workspace.providers.push(ProviderConfig {
                id: id.into(),
                kind: ProviderKind::Fixture,
                executable_path: executable.to_string_lossy().into_owned(),
                model: None,
                timeout_ms: 5_000,
            });
        }
        let revision = model_catalog(&workspace).revision;
        let selection = |id: &str| ModelSelection {
            schema_version: 1,
            provider_id: id.into(),
            model_id: None,
            effort_id: None,
            catalog_revision: revision.clone(),
        };
        host.save(&workspace).unwrap();
        (
            selection("fixture:acceptance-lead"),
            selection("fixture:acceptance-second"),
        )
    };
    let saved = save_rich_draft_in(
        &host,
        SaveRichDraftRequest {
            conversation_id: "welcome".into(),
            mutation_id: "acceptance-council-draft".into(),
            expected_revision: 0,
            draft: "Original admitted question".into(),
            attachment_ids: Vec::new(),
            selection: Some(lead.clone()),
            team: Some(TeamSelection {
                schema_version: 1,
                lead_index: 0,
                members: vec![lead, second],
            }),
        },
        false,
    )
    .unwrap();
    assert_eq!(saved.state, "durable");
    let admitted = prepare_submission(
        &host.workspace.lock().unwrap(),
        SubmitRunRequest {
            id: "acceptance-council-run".into(),
            conversation_id: "welcome".into(),
            prompt: "Original admitted question".into(),
            mode: "constellation".into(),
            rich_draft_revision: Some(1),
        },
    )
    .unwrap();
    let original_admitted = serde_json::to_value(&admitted).unwrap();
    assert_eq!(host.execute(admitted).state, "accepted");
    let (failed_id, failed_attempt_id, failed_checkpoint, completed_before) = {
        let workspace = host.workspace.lock().unwrap();
        assert_eq!(workspace.runs[0].status, "failed");
        assert!(workspace.runs[0].answer.is_none());
        let public = public_snapshot(&workspace).unwrap();
        let failed_id = public["runs"][0]["failedInvocationID"]
            .as_str()
            .unwrap()
            .to_owned();
        let failed_attempt_id = public["runs"][0]["failedAttemptID"]
            .as_str()
            .unwrap()
            .to_owned();
        let persisted = &workspace.constellation_sessions[0];
        let completed = persisted
            .activity
            .entries
            .iter()
            .filter(|e| e.kind == "memberCompleted")
            .map(|e| serde_json::to_value(e).unwrap())
            .collect::<Vec<_>>();
        assert!(!completed.is_empty());
        assert!(!persisted
            .activity
            .entries
            .iter()
            .any(|e| e.kind == "finalCompleted"));
        (
            failed_id,
            failed_attempt_id,
            persisted.checkpoint.clone(),
            completed,
        )
    };
    drop(host);
    let host = HostState::open(path.clone()).unwrap();
    {
        let workspace = host.workspace.lock().unwrap();
        assert_eq!(workspace.runs[0].status, "failed");
        assert!(workspace.runs[0].answer.is_none());
        assert_eq!(
            workspace.constellation_sessions[0].checkpoint,
            failed_checkpoint
        );
        assert_eq!(
            serde_json::to_value(&workspace.runs[0].admitted).unwrap(),
            original_admitted
        );
    }
    // Later editable context and provider configuration cannot alter the admitted retry.
    {
        let mut workspace = host.workspace.lock().unwrap();
        workspace.conversations[0].draft = "A newer unsent question".into();
        for provider in &mut workspace.providers {
            provider.executable_path = "/usr/bin/false".into();
        }
        host.save(&workspace).unwrap();
    }
    let retry = RetryConstellationInvocationRequest {
        request_id: "acceptance-council-run".into(),
        invocation_id: failed_id,
        failed_attempt_id: failed_attempt_id.clone(),
    };
    let before = serde_json::to_value(&*host.workspace.lock().unwrap()).unwrap();
    assert!(host
        .admit_constellation_retry(&RetryConstellationInvocationRequest {
            request_id: retry.request_id.clone(),
            invocation_id: "foreign-invocation".into(),
            failed_attempt_id,
        })
        .is_err());
    assert_eq!(
        serde_json::to_value(&*host.workspace.lock().unwrap()).unwrap(),
        before
    );
    host.fail_next_save(PersistFault::AfterWrite);
    assert!(host.admit_constellation_retry(&retry).is_err());
    assert_eq!(
        serde_json::to_value(&*host.workspace.lock().unwrap()).unwrap(),
        before
    );
    assert!(host.lifecycle.lock().unwrap().cancellations.is_empty());
    host.fail_next_save(PersistFault::AfterRename);
    let uncertain = host.admit_constellation_retry(&retry).unwrap_err();
    assert_eq!(uncertain.state, "uncertain");
    assert!(host.lifecycle.lock().unwrap().cancellations.is_empty());
    {
        let workspace = host.workspace.lock().unwrap();
        assert_eq!(workspace.runs.len(), 1);
        assert_eq!(workspace.runs[0].status, "failed");
        assert!(workspace.runs[0].answer.is_none());
        assert!(workspace.runs[0]
            .error
            .as_deref()
            .unwrap()
            .starts_with(ADMISSION_UNCERTAIN_PREFIX));
        assert_eq!(workspace.conversations[0].draft, "A newer unsent question");
        assert_eq!(
            serde_json::to_value(&workspace.runs[0].admitted).unwrap(),
            original_admitted
        );
        assert_eq!(
            TeamSession::restore(&workspace.constellation_sessions[0].checkpoint)
                .unwrap()
                .status(),
            &TeamStatus::Reserved
        );
        let events = &workspace.constellation_sessions[0].activity.entries;
        for original in completed_before {
            assert_eq!(
                events
                    .iter()
                    .filter(|e| serde_json::to_value(e).unwrap() == original)
                    .count(),
                1
            );
        }
        assert!(events.iter().any(|e| e.kind == "recoveryRequired"));
        for pair in events.windows(2) {
            assert_eq!(pair[1].sequence, pair[0].sequence + 1);
        }
    }
    assert_eq!(host.reconcile(&retry.request_id).state, "rejected");
    assert_eq!(
        host.cancel_persisted_constellation(&retry.request_id).state,
        "accepted"
    );
    drop(host);
    let reopened = HostState::open(path.clone()).unwrap();
    let reopened_workspace = reopened.workspace.lock().unwrap();
    assert_eq!(reopened_workspace.runs[0].status, "cancelled");
    assert!(reopened_workspace.runs[0].answer.is_none());
    assert_eq!(
        TeamSession::restore(&reopened_workspace.constellation_sessions[0].checkpoint)
            .unwrap()
            .status(),
        &TeamStatus::Cancelled
    );
    drop(reopened_workspace);
    drop(reopened);
    fs::remove_dir_all(path).unwrap();
    fs::remove_file(executable).unwrap();
    fs::remove_file(marker).unwrap();
}

#[cfg(unix)]
#[test]
fn acceptance_overlapping_providers_restore_durable_checkpoint_without_replay() {
    use std::os::unix::fs::PermissionsExt;
    let path = profile("acceptance-overlap-live");
    let captured = profile("acceptance-overlap-captured");
    let fixtures = profile("acceptance-overlap-fixtures");
    fs::create_dir_all(&fixtures).unwrap();
    let executable = fixtures.join("provider.py");
    let release = fixtures.join("release");
    // On assertion failure, let blocked fixture children exit instead of waiting for timeout.
    struct ReleaseOnDrop(PathBuf);
    impl Drop for ReleaseOnDrop {
        fn drop(&mut self) {
            let _ = fs::write(&self.0, b"release");
        }
    }
    let release_guard = ReleaseOnDrop(release.clone());
    let source = r#"#!/usr/bin/python3
import json, os, sys, time
root = __FIXTURE_ROOT__
outer = json.loads(sys.stdin.read().split("JSON PAYLOAD\n", 1)[1])
binding = json.loads(outer["currentUserRequest"])["binding"]
# A unique file for every process invocation makes accidental replay observable.
with open(os.path.join(root, "call-" + binding["attemptId"] + "-" + str(os.getpid())), "x") as f:
    f.write(binding["role"])
role = binding["role"]
if role == "decide":
    print(json.dumps({"schemaVersion":1,"runId":binding["runId"],
        "inputDigest":binding["inputDigest"],"leadMemberId":binding["memberId"],
        "strategy":"council","reason":"Independent views",
        "councilMemberIds":["member-1","member-2"],"tasks":[]}))
elif role == "independentAnswer":
    member = binding["memberId"]
    with open(os.path.join(root, "arrived-" + member), "x") as f: f.write("arrived")
    deadline = time.monotonic() + 15
    while not all(os.path.exists(os.path.join(root, "arrived-" + m)) for m in ["member-1", "member-2"]):
        if time.monotonic() > deadline: sys.exit(31)
        time.sleep(0.01)
    with open(os.path.join(root, "overlap-" + member), "x") as f: f.write("both arrived")
    while not os.path.exists(os.path.join(root, "release")):
        if time.monotonic() > deadline: sys.exit(32)
        time.sleep(0.01)
    print("Independent overlap answer from " + member)
elif role == "integrate":
    print("One overlap final answer")
else:
    sys.exit(33)
"#.replace("__FIXTURE_ROOT__", &serde_json::to_string(&fixtures.to_string_lossy()).unwrap());
    fs::write(&executable, source).unwrap();
    fs::set_permissions(&executable, fs::Permissions::from_mode(0o700)).unwrap();
    let host = Arc::new(HostState::open(path.clone()).unwrap());
    let (lead, second) = {
        let mut workspace = host.workspace.lock().unwrap();
        for id in ["fixture:overlap-one", "fixture:overlap-two"] {
            workspace.providers.push(ProviderConfig {
                id: id.into(),
                kind: ProviderKind::Fixture,
                executable_path: executable.to_string_lossy().into_owned(),
                model: None,
                timeout_ms: 20_000,
            });
        }
        let revision = model_catalog(&workspace).revision;
        let select = |id: &str| ModelSelection {
            schema_version: 1,
            provider_id: id.into(),
            model_id: None,
            effort_id: None,
            catalog_revision: revision.clone(),
        };
        host.save(&workspace).unwrap();
        (select("fixture:overlap-one"), select("fixture:overlap-two"))
    };
    save_rich_draft_in(
        &host,
        SaveRichDraftRequest {
            conversation_id: "welcome".into(),
            mutation_id: "overlap-draft".into(),
            expected_revision: 0,
            draft: "Compare independent answers".into(),
            attachment_ids: Vec::new(),
            selection: Some(lead.clone()),
            team: Some(TeamSelection {
                schema_version: 1,
                lead_index: 0,
                members: vec![lead, second],
            }),
        },
        false,
    )
    .unwrap();
    let admitted = prepare_submission(
        &host.workspace.lock().unwrap(),
        SubmitRunRequest {
            id: "acceptance-overlap-run".into(),
            conversation_id: "welcome".into(),
            prompt: "Compare independent answers".into(),
            mode: "constellation".into(),
            rich_draft_revision: Some(1),
        },
    )
    .unwrap();
    let worker_host = host.clone();
    let worker = thread::spawn(move || worker_host.execute(admitted));
    let deadline = Instant::now() + Duration::from_secs(10);
    while !(fixtures.join("overlap-member-1").exists()
        && fixtures.join("overlap-member-2").exists())
    {
        assert!(
            Instant::now() < deadline,
            "Both actual provider processes must overlap"
        );
        thread::sleep(Duration::from_millis(10));
    }
    let calls = || {
        fs::read_dir(&fixtures)
            .unwrap()
            .filter(|entry| {
                entry
                    .as_ref()
                    .unwrap()
                    .file_name()
                    .to_string_lossy()
                    .starts_with("call-")
            })
            .count()
    };
    assert_eq!(calls(), 3); // Decide and two blocked independent calls; no integrate yet.
                            // Copy committed bytes, not a reconstructed WorkspaceSnapshot, while providers are latched.
    fs::create_dir_all(captured.join("snapshots")).unwrap();
    let captured_checkpoint = {
        let workspace = host.workspace.lock().unwrap();
        let mut generations = committed_generations(&path.join("snapshots")).unwrap();
        generations.sort_by_key(|(generation, _)| *generation);
        let latest = &generations.last().unwrap().1;
        fs::copy(
            latest,
            captured.join("snapshots").join(latest.file_name().unwrap()),
        )
        .unwrap();
        workspace.constellation_sessions[0].checkpoint.clone()
    };
    let recovered = HostState::open(captured.clone()).unwrap();
    {
        let workspace = recovered.workspace.lock().unwrap();
        assert_eq!(workspace.runs[0].status, "failed");
        assert!(workspace.runs[0].answer.is_none());
        assert_eq!(
            workspace.constellation_sessions[0].checkpoint,
            captured_checkpoint
        );
        let restored = TeamSession::restore(&captured_checkpoint).unwrap();
        let unresolved = restored.unresolved_invocations();
        assert_eq!(unresolved.len(), 2);
        assert!(restored.next_invocations().is_empty());
        for invocation in unresolved {
            assert_eq!(
                restored.invocation_status(&invocation.binding),
                Some(&TeamStatus::Uncertain)
            );
        }
        let public = public_snapshot(&workspace).unwrap();
        assert!(public["runs"][0]["failedInvocationID"].is_null());
        assert!(public["runs"][0]["failedAttemptID"].is_null());
    }
    let bindings = {
        let session = TeamSession::restore(&captured_checkpoint).unwrap();
        session
            .unresolved_invocations()
            .iter()
            .map(|i| i.binding.clone())
            .collect::<Vec<_>>()
    };
    for binding in bindings {
        assert!(recovered
            .admit_constellation_retry(&RetryConstellationInvocationRequest {
                request_id: "acceptance-overlap-run".into(),
                invocation_id: binding.invocation_id,
                failed_attempt_id: binding.attempt_id,
            })
            .is_err());
    }
    assert!(recovered.lifecycle.lock().unwrap().cancellations.is_empty());
    assert_eq!(
        recovered
            .cancel_persisted_constellation("acceptance-overlap-run")
            .state,
        "accepted"
    );
    drop(recovered);
    let reopened = HostState::open(captured.clone()).unwrap();
    assert_eq!(
        reopened.workspace.lock().unwrap().runs[0].status,
        "cancelled"
    );
    assert_eq!(
        calls(),
        3,
        "Recovery must not dispatch any provider process"
    );
    drop(reopened);
    fs::write(&release, b"release").unwrap();
    assert_eq!(worker.join().unwrap().state, "accepted");
    assert_eq!(
        calls(),
        4,
        "Only the original run may add one integration call"
    );
    {
        let workspace = host.workspace.lock().unwrap();
        assert_eq!(
            workspace.runs[0].answer.as_deref(),
            Some("One overlap final answer\n")
        );
        let public = public_snapshot(&workspace).unwrap();
        let results = public["runs"][0]["memberResults"].as_array().unwrap();
        assert_eq!(results.len(), 2);
        for member in ["member-1", "member-2"] {
            assert!(results
                .iter()
                .any(|r| r["memberID"] == member && r["text"].as_str().unwrap().contains(member)));
        }
        let events = &workspace.constellation_sessions[0].activity.entries;
        assert_eq!(
            events.iter().filter(|e| e.kind == "finalCompleted").count(),
            1
        );
        for pair in events.windows(2) {
            assert_eq!(pair[1].sequence, pair[0].sequence + 1);
        }
    }
    drop(host);
    drop(release_guard);
    fs::remove_dir_all(path).unwrap();
    fs::remove_dir_all(captured).unwrap();
    fs::remove_dir_all(fixtures).unwrap();
}
