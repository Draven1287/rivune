#[path = "../cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/legacy_inspection.rs"]
mod legacy_inspection;
use legacy_inspection::inspect_legacy_import;
use rivune_legacy_import_preview::{preview_import, LegacySource, SourceKind};
use serde_json::{json, Value};

fn input(kind: SourceKind, value: Value) -> LegacySource {
    LegacySource { kind, bytes: serde_json::to_vec(&value).unwrap() }
}
fn project(name: &str, instructions: &str, id: usize) -> Value {
    json!({"id":format!("30000000-0000-4000-8000-{id:012}"),"name":name,"instructions":instructions,
        "createdAt":810000000,"updatedAt":810000001,"isArchived":false,"defaultMode":"Together","files":[]})
}

#[test]
fn allowlisted_projection_excludes_secrets_and_bookmarks() {
    let mut p=project("Reading project","Readable instructions",1);
    p["files"]=json!([{"id":"40000000-0000-4000-8000-000000000001","name":"Notes", "path":"/synthetic/notes.txt","bookmark":"SECRET_BOOKMARK","apiKey":"SECRET_KEY","byteCount":42,"fingerprint":"synthetic-fingerprint","included":true}]);
    let preview=preview_import(vec![input(SourceKind::Projects,json!({"schemaVersion":1,"projects":[p]})),
        input(SourceKind::Preferences,json!({"rivune.subtleMotion":false,"rivune.defaultMode":"Together","secret":"SECRET_VALUE","rivune.togetherSharingApproved":true})),
        input(SourceKind::Drafts,json!({"drafts":{"new":{"text":"Unsent 🌎","attachments":[]}}}))]);
    assert!(preview.reviewable(),"{:?}",preview.summary.issues);
    let result=inspect_legacy_import(&preview).unwrap();
    let output=serde_json::to_string(&result).unwrap();
    for expected in ["Reading project","Readable instructions","Unsent 🌎","Notes","/synthetic/notes.txt","Background motion"] {assert!(output.contains(expected),"{expected}");}
    for secret in ["SECRET_BOOKMARK","SECRET_KEY","SECRET_VALUE","togetherSharingApproved"] {assert!(!output.contains(secret),"{secret}");}
    assert_eq!(result.sections.len(),5);
}

#[test]
fn bounds_unicode_and_escaped_serialization() {
    let projects=(0..130).map(|id|project(&"🌎".repeat(100),&"\"\n🌎".repeat(2000),id)).collect::<Vec<_>>();
    let preview=preview_import(vec![input(SourceKind::Projects,json!({"schemaVersion":1,"projects":projects}))]);
    let result=inspect_legacy_import(&preview).unwrap();
    assert_eq!(result.sections[0].total_count,130);
    assert!(result.sections[0].truncated);
    assert!(result.sections[0].items.len()<=100);
    assert!(serde_json::to_vec(&result).unwrap().len()<=128*1024);
    for section in &result.sections {for item in &section.items {assert!(item.label.len()<=256);assert!(item.detail_text.len()<=4096);}}
}

#[test]
fn item_limit_reports_omissions_even_with_small_details() {
    let projects=(0..105).map(|id|project("P","",id)).collect::<Vec<_>>();
    let result=inspect_legacy_import(&preview_import(vec![input(SourceKind::Projects,json!({"schemaVersion":1,"projects":projects}))])).unwrap();
    assert_eq!(result.sections[0].items.len(),100);
    assert_eq!(result.sections[0].total_count,105);
    assert!(result.sections[0].truncated);
}

#[test]
fn rejects_unreviewable_and_invalid_binding() {
    let preview=preview_import(vec![LegacySource{kind:SourceKind::History,bytes:b"[".to_vec()}]);
    assert!(inspect_legacy_import(&preview).is_err());
    let mut empty=preview_import(vec![input(SourceKind::History,json!([]))]);
    assert!(inspect_legacy_import(&empty).is_ok());
    empty.summary.fingerprint="wrong".into();
    assert!(inspect_legacy_import(&empty).is_err());
}

#[test]
fn prepared_inputs_have_real_orphans_and_three_source_attachments() {
    let mut inputs=vec![];
    for (kind,raw) in [(SourceKind::History,include_str!("native-synthetic-inputs/conversations.json")),
        (SourceKind::Projects,include_str!("native-synthetic-inputs/projects.json")),
        (SourceKind::Drafts,include_str!("native-synthetic-inputs/drafts.json")),
        (SourceKind::Preferences,include_str!("native-synthetic-inputs/preferences.json"))] {
        inputs.push(LegacySource{kind,bytes:raw.as_bytes().to_vec()});
    }
    let preview=preview_import(inputs);assert!(preview.reviewable(),"{:?}",preview.summary.issues);
    let result=inspect_legacy_import(&preview).unwrap();
    assert_eq!(result.sections[0].total_count,1);
    assert_eq!(result.sections[1].total_count,2);
    assert_eq!(result.sections[2].total_count,2); // historical attachment and project file reference
    assert!(!serde_json::to_string(&result).unwrap().contains("U1lOVEh"));
}
