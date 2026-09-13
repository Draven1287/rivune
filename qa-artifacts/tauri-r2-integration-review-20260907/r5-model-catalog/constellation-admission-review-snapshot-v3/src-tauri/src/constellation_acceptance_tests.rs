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
