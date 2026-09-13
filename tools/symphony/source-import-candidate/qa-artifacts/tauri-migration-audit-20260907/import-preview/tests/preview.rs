use rivune_legacy_import_preview::{foundation_to_unix_milliseconds, preview_import, LegacySource, SourceKind, PreservedRecord};
use serde_json::{json, Value};

fn decoded(record: &PreservedRecord) -> Value {
    serde_json::from_str(record.raw_json()).unwrap()
}
fn decoded_records(records: &[PreservedRecord]) -> Vec<Value> {
    records.iter().map(decoded).collect()
}
fn decoded_drafts(drafts: &std::collections::BTreeMap<String, PreservedRecord>) -> serde_json::Map<String, Value> {
    drafts.iter().map(|(key, record)| (key.clone(), decoded(record))).collect()
}

fn fixture(name: &str) -> Value {
    let raw = match name {
        "history" => include_str!("../../fixtures/conversation-project-reference.json"),
        "drafts" => include_str!("../../fixtures/drafts-multiple-and-new.json"),
        "legacy" => include_str!("../../fixtures/legacy-optional-selected-artifact.json"),
        "orphan" => include_str!("../../fixtures/orphan-draft.json"),
        "malformed" => include_str!("../../fixtures/malformed-drafts.json"),
        "truncated" => include_str!("../../fixtures/truncated-drafts.json"),
        "projects" => include_str!("../../fixtures/project-needs-new-file-permission.json"),
        "future" => include_str!("../../fixtures/future-project-schema.json"),
        "preferences" => include_str!("../../fixtures/settings-and-stale-consent.json"),
        "retry" => include_str!("../../fixtures/unknown-explicit-retry-context.json"),
        _ => panic!("unknown test fixture"),
    };
    serde_json::from_str(raw).unwrap()
}
fn source(kind: SourceKind, value: &Value) -> LegacySource {
    LegacySource {kind, bytes: serde_json::to_vec(value).unwrap()}
}

#[test]
fn valid_selection_preserves_all_raw_records_and_links() {
    let history=fixture("history")["input"].clone();
    let projects=fixture("projects")["input"].clone();
    let drafts=fixture("drafts")["input"].clone();
    let sources=vec![source(SourceKind::History,&history),source(SourceKind::Projects,&projects),source(SourceKind::Drafts,&drafts)];
    let original:Vec<Vec<u8>>=sources.iter().map(|s|s.bytes.clone()).collect();
    let result=preview_import(sources);
    assert!(result.reviewable(),"{:?}",result.summary.issues);
    assert_eq!(decoded_records(&result.conversations),history.as_array().unwrap().clone());
    assert_eq!(decoded_records(&result.projects),projects["projects"].as_array().unwrap().clone());
    assert_eq!(decoded_drafts(&result.drafts),drafts["drafts"].as_object().unwrap().clone());
    assert_eq!(result.selected_conversation_id.as_deref(),drafts["selectedConversationID"].as_str());
    assert_eq!(result.originals.iter().map(|s|s.bytes.clone()).collect::<Vec<_>>(),original);
    assert_eq!(result.summary.turn_count,1);
    assert!(result.summary.issues.iter().any(|i|i.code=="file-permission-reauthorization-required"));
    assert!(result.summary.issues.iter().any(|i|i.code=="legacy-exact-retry-unavailable"));
    assert!(!result.may_dispatch_imported_work());
}

#[test]
fn legacy_optional_artifact_and_orphan_draft_are_retained() {
    for name in ["legacy","orphan"] {
        let input=fixture(name)["input"].clone();
        let result=preview_import(vec![source(SourceKind::Drafts,&input)]);
        assert!(result.reviewable());
        assert_eq!(decoded_drafts(&result.drafts),input["drafts"].as_object().unwrap().clone());
        if name=="orphan" {assert!(result.summary.issues.iter().any(|i|i.code=="orphan-drafts-retained-for-recovery"));}
    }
}

#[test]
fn malformed_and_truncated_drafts_return_recovery_without_losing_bytes() {
    let malformed=source(SourceKind::Drafts,&fixture("malformed")["input"]);
    let truncated=LegacySource {kind:SourceKind::Drafts,bytes:fixture("truncated")["rawUTF8"].as_str().unwrap().as_bytes().to_vec()};
    for input in [malformed,truncated] {
        let original=input.bytes.clone();
        let result=preview_import(vec![input]);
        assert!(!result.reviewable());assert_eq!(result.originals[0].bytes,original);
        assert!(!result.may_dispatch_imported_work());
    }
}

#[test]
fn corrupt_primary_never_falls_back_to_valid_backup() {
    let primary=LegacySource {kind:SourceKind::History,bytes:b"[{\"turns\":[{\"retryContext\":".to_vec()};
    let backup=source(SourceKind::HistoryBackup,&fixture("history")["input"]);
    let original=primary.bytes.clone();let backup_bytes=backup.bytes.clone();
    let result=preview_import(vec![primary,backup]);
    assert!(!result.reviewable());assert!(result.conversations.is_empty());
    assert_eq!(result.originals[0].bytes,original);assert_eq!(result.originals[1].bytes,backup_bytes);
    assert!(result.summary.issues.iter().any(|i|i.source==SourceKind::History&&i.line.is_some()&&i.column.is_some()));
}

#[test]
fn corrupt_unselected_backup_does_not_invalidate_healthy_primary() {
    let history=fixture("history")["input"].clone();
    let result=preview_import(vec![source(SourceKind::History,&history),LegacySource{kind:SourceKind::HistoryBackup,bytes:b"broken backup".to_vec()}]);
    assert!(result.reviewable());assert_eq!(decoded_records(&result.conversations),history.as_array().unwrap().clone());
    assert_eq!(result.originals[1].bytes,b"broken backup");
    assert!(result.summary.issues.iter().any(|i|i.code=="backup-invalid-retained"&&!i.blocking));
}

#[test]
fn unsupported_project_version_is_not_silently_imported() {
    let input=source(SourceKind::Projects,&fixture("future")["input"]);let original=input.bytes.clone();
    let result=preview_import(vec![input]);assert!(!result.reviewable());assert!(result.projects.is_empty());
    assert_eq!(result.originals[0].bytes,original);
    assert!(result.summary.issues.iter().any(|i|i.code=="unsupported-project-schema"));
}

#[test]
fn backup_only_requires_an_explicit_history_selection() {
    for bytes in [serde_json::to_vec(&fixture("history")["input"]).unwrap(),b"broken backup".to_vec()] {
        let result=preview_import(vec![LegacySource{kind:SourceKind::HistoryBackup,bytes:bytes.clone()}]);
        assert!(!result.reviewable());
        assert!(result.conversations.is_empty());
        assert_eq!(result.originals[0].bytes,bytes);
        assert!(result.summary.issues.iter().any(|i|i.code=="history-source-selection-required"));
    }
    // The host may explicitly choose backup bytes as History after user review.
    let result=preview_import(vec![source(SourceKind::History,&fixture("history")["input"])]);
    assert!(result.reviewable());
    assert_eq!(result.summary.conversation_count,1);
}

#[test]
fn unknown_retry_record_is_preserved_but_cannot_be_executed() {
    let input=fixture("retry")["input"].clone();
    let result=preview_import(vec![source(SourceKind::History,&input)]);
    assert!(result.reviewable());assert_eq!(decoded_records(&result.conversations),input.as_array().unwrap().clone());
    assert!(result.summary.issues.iter().any(|i|i.code=="retry-context-needs-host-validation"));
    assert!(!result.may_dispatch_imported_work());
}

#[test]
fn preferences_are_preserved_without_granting_old_sharing_consent() {
    let input=fixture("preferences")["input"].clone();
    let result=preview_import(vec![source(SourceKind::Preferences,&input)]);
    assert!(result.reviewable());assert_eq!(result.preferences.as_ref().map(|raw| serde_json::from_str::<Value>(raw.get()).unwrap()),Some(input));
    assert!(result.summary.issues.iter().any(|i|i.code=="preferences-require-host-allowlist-and-consent-review"));
    assert!(!result.may_dispatch_imported_work());
}

#[test]
fn source_fingerprint_is_order_independent_and_content_bound() {
    let a=fixture("history")["input"].clone();let b=fixture("drafts")["input"].clone();
    let first=preview_import(vec![source(SourceKind::History,&a),source(SourceKind::Drafts,&b)]);
    let second=preview_import(vec![source(SourceKind::Drafts,&b),source(SourceKind::History,&a)]);
    assert_eq!(first.summary.fingerprint,second.summary.fingerprint);
    let mut changed=a.clone();changed[0]["futureUnknownField"]=json!({"must":"survive"});
    let third=preview_import(vec![source(SourceKind::History,&changed),source(SourceKind::Drafts,&b)]);
    assert_ne!(first.summary.fingerprint,third.summary.fingerprint);
    assert_eq!(decoded(&third.conversations[0])["futureUnknownField"],changed[0]["futureUnknownField"]);
}

#[test]
fn duplicate_json_keys_are_rejected_even_when_nested() {
    for bytes in [br#"{"drafts":{},"drafts":{}}"#.as_slice(),br#"{"drafts":{"new":{"text":"first","text":"second","attachments":[]}}}"#.as_slice()] {
        let result=preview_import(vec![LegacySource{kind:SourceKind::Drafts,bytes:bytes.to_vec()}]);
        assert!(!result.reviewable());assert_eq!(result.originals[0].bytes,bytes);
        assert!(result.summary.issues.iter().any(|i|i.line.is_some()));
    }
}

#[test]
fn duplicate_source_and_record_ids_require_review() {
    let history=fixture("history")["input"].clone();
    let result=preview_import(vec![source(SourceKind::History,&history),source(SourceKind::History,&history)]);
    assert!(!result.reviewable());assert_eq!(result.originals.len(),2);
    let duplicate=json!([history[0],history[0]]);
    let result=preview_import(vec![source(SourceKind::History,&duplicate)]);
    assert!(!result.reviewable());assert!(result.summary.issues.iter().any(|i|i.code=="duplicate-conversation-id"));
}

#[test]
fn foundation_dates_convert_without_a_thirty_one_year_shift() {
    assert_eq!(foundation_to_unix_milliseconds(810000001.0),Some(1788307201000.0));
    assert_eq!(foundation_to_unix_milliseconds(0.0),Some(978307200000.0));
    assert_eq!(foundation_to_unix_milliseconds(-978307200.0),Some(0.0));
    assert_eq!(foundation_to_unix_milliseconds(f64::NAN),None);
    assert_eq!(foundation_to_unix_milliseconds(f64::MAX),None);
}

#[test]
fn empty_selection_and_oversized_source_are_explicitly_rejected() {
    assert!(!preview_import(vec![]).reviewable());
    let result=preview_import(vec![LegacySource{kind:SourceKind::Drafts,bytes:vec![b' ';32*1024*1024+1]}]);
    assert!(!result.reviewable());assert_eq!(result.originals[0].bytes.len(),32*1024*1024+1);
    assert!(result.summary.issues.iter().any(|i|i.code=="source-too-large"));
}


#[test]
fn sibling_project_file_ids_cannot_collide() {
    let mut input=fixture("projects")["input"].clone();
    let mut duplicate=input["projects"][0]["files"][0].clone();
    duplicate["id"]=json!(duplicate["id"].as_str().unwrap().to_ascii_uppercase());
    input["projects"][0]["files"].as_array_mut().unwrap().push(duplicate);
    let original=source(SourceKind::Projects,&input);
    let bytes=original.bytes.clone();
    let result=preview_import(vec![original]);
    assert!(!result.reviewable());
    assert!(result.summary.issues.iter().any(|i|i.code=="duplicate-project-file-id"));
    assert_eq!(result.originals[0].bytes,bytes);
}

#[test]
fn attachment_ids_are_unique_within_each_snapshot_only() {
    let attachment=json!({"id":"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee","name":"note.txt","textContent":"abc","byteCount":3});
    let mut upper=attachment.clone();
    upper["id"]=json!(attachment["id"].as_str().unwrap().to_ascii_uppercase());
    let invalid=json!({"drafts":{"new":{"text":"draft","attachments":[attachment,upper]}}});
    let result=preview_import(vec![source(SourceKind::Drafts,&invalid)]);
    assert!(!result.reviewable());
    assert!(result.summary.issues.iter().any(|i|i.code=="invalid-draft"));
    let mut history=fixture("history")["input"].clone();
    history[0]["turns"][0]["attachments"]=json!([attachment,attachment]);
    let result=preview_import(vec![source(SourceKind::History,&history)]);
    assert!(!result.reviewable());
    assert!(result.summary.issues.iter().any(|i|i.code=="invalid-turn"));
    history[0]["turns"][0]["attachments"]=json!([attachment]);
    let mut second=history[0]["turns"][0].clone();
    second["id"]=json!("bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee");
    history[0]["turns"].as_array_mut().unwrap().push(second);
    let drafts=json!({"drafts":{"new":{"text":"draft","attachments":[attachment]}}});
    let result=preview_import(vec![source(SourceKind::History,&history),source(SourceKind::Drafts,&drafts)]);
    assert!(result.reviewable(),"{:?}",result.summary.issues);
    assert_eq!(result.summary.turn_count,2);
}

#[test]
fn raw_records_preserve_unknown_numeric_lexemes_exactly() {
    // Compare literal JSON, not Value equality: f64 rounding would hide a failure.
    let unknown=r#""future": { "integer": 18446744073709551617, "decimal": 0.123456789012345678901234567890, "exponent": 1.234567890123456789e+100 }"#;
    let extend=|value:&Value| {
        let mut raw=serde_json::to_string(value).unwrap();
        raw.pop(); raw.push(','); raw.push_str(unknown); raw.push('}'); raw
    };
    let conversation=extend(&fixture("history")["input"][0]);
    let project=extend(&fixture("projects")["input"]["projects"][0]);
    let draft=extend(&json!({"text":"draft","attachments":[]}));
    let preferences=format!("{{{unknown}}}");
    let sources=vec![
        LegacySource{kind:SourceKind::History,bytes:format!("[{conversation}]").into_bytes()},
        LegacySource{kind:SourceKind::Projects,bytes:format!("{{\"schemaVersion\":1,\"projects\":[{project}]}}").into_bytes()},
        LegacySource{kind:SourceKind::Drafts,bytes:format!("{{\"drafts\":{{\"new\":{draft}}}}}").into_bytes()},
        LegacySource{kind:SourceKind::Preferences,bytes:preferences.as_bytes().to_vec()},
    ];
    let result=preview_import(sources);
    assert!(result.reviewable(),"{:?}",result.summary.issues);
    assert_eq!(result.conversations[0].raw_json(),conversation);
    assert_eq!(result.projects[0].raw_json(),project);
    assert_eq!(result.drafts["new"].raw_json(),draft);
    assert_eq!(result.preferences.as_ref().unwrap().get(),preferences);
}
