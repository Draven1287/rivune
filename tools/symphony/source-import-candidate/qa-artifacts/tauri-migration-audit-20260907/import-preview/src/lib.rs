//! Host-only, read-only legacy import preview. No filesystem, credential,
//! process, provider or destination-store access exists in this crate.
use serde::de::{self, MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Number, Value};
use serde_json::value::RawValue;
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fmt;

const MAX_SOURCE_BYTES: usize = 32 * 1024 * 1024;
const MAX_TOTAL_BYTES: usize = 64 * 1024 * 1024;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum SourceKind { History, HistoryBackup, Projects, Drafts, Preferences }

impl SourceKind {
    fn label(self) -> &'static str {
        match self { Self::History => "history", Self::HistoryBackup => "history-backup",
            Self::Projects => "projects", Self::Drafts => "drafts", Self::Preferences => "preferences" }
    }
}

/// Construct only after the host has obtained the user's source selection.
/// Keep these bytes private to the host and its protected recovery archive.
pub struct LegacySource { pub kind: SourceKind, pub bytes: Vec<u8> }

#[derive(Debug, Clone, Serialize)]
pub struct Issue {
    pub source: SourceKind,
    pub code: &'static str,
    /// Static structural path, never a user filesystem path or field value.
    pub field: String,
    pub blocking: bool,
    pub line: Option<usize>,
    pub column: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SourceReceipt { pub kind: SourceKind, pub sha256: String, pub byte_count: usize }

#[derive(Debug, Default, Serialize)]
pub struct PreviewSummary {
    pub fingerprint: String,
    pub sources: Vec<SourceReceipt>,
    pub conversation_count: usize,
    pub turn_count: usize,
    pub project_count: usize,
    pub draft_count: usize,
    pub issues: Vec<Issue>,
}

/// Deliberately not Serialize: renderer gets only `summary` by default. The
/// host owns retention of raw records and the later atomic import transaction.
pub struct ImportPreview {
    pub summary: PreviewSummary,
    pub originals: Vec<LegacySource>,
    pub conversations: Vec<PreservedRecord>,
    pub projects: Vec<PreservedRecord>,
    pub drafts: BTreeMap<String, PreservedRecord>,
    pub selected_conversation_id: Option<String>,
    pub preferences: Option<Box<RawValue>>,
}

/// Persist `raw_json()`, never the derived inspection value. RawValue retains
/// unknown integer/decimal lexemes exactly, beyond f64's precision.
pub struct PreservedRecord { decoded: Value, original_json: Box<RawValue> }
impl PreservedRecord {
    pub fn raw_json(&self) -> &str { self.original_json.get() }
    pub fn id(&self) -> Option<&str> { self.decoded.get("id").and_then(Value::as_str) }
    pub fn text_field(&self, field: &str) -> Option<&str> { self.decoded.get(field).and_then(Value::as_str) }
}
#[derive(Deserialize)]
struct RawProjects { projects: Vec<Box<RawValue>> }
#[derive(Deserialize)]
struct RawDrafts { drafts: BTreeMap<String, Box<RawValue>> }

impl ImportPreview {
    /// This means structurally reviewable, not permission to commit or execute.
    pub fn reviewable(&self) -> bool { !self.summary.issues.iter().any(|x| x.blocking) }
    /// Imported records never create a runnable admitted request. Retry requires
    /// explicit host validation of saved context or a new reviewed request.
    pub fn may_dispatch_imported_work(&self) -> bool { false }
    fn issue(&mut self, source: SourceKind, field: impl Into<String>, code: &'static str, blocking: bool) {
        self.summary.issues.push(Issue { source, field: field.into(), code, blocking, line: None, column: None });
    }
}

pub fn preview_import(sources: Vec<LegacySource>) -> ImportPreview {
    let mut result = ImportPreview { summary: PreviewSummary::default(), originals: sources,
        conversations: vec![], projects: vec![], drafts: BTreeMap::new(), selected_conversation_id: None, preferences: None };
    let mut seen_sources = BTreeSet::new();
    if result.originals.is_empty() { result.issue(SourceKind::History, "/", "no-sources-selected", true); }
    let mut total = 0usize;
    for i in 0..result.originals.len() {
        let kind = result.originals[i].kind;
        let len = result.originals[i].bytes.len();
        if !seen_sources.insert(kind) { result.issue(kind, "/", "duplicate-source-kind", true); }
        total = total.checked_add(len).unwrap_or(usize::MAX);
        if len > MAX_SOURCE_BYTES { result.issue(kind, "/", "source-too-large", true); }
    }
    if total > MAX_TOTAL_BYTES { result.issue(SourceKind::History, "/", "import-too-large", true); }
    if seen_sources.contains(&SourceKind::HistoryBackup) && !seen_sources.contains(&SourceKind::History) {
        result.issue(SourceKind::HistoryBackup, "/", "history-source-selection-required", true);
    }
    if !result.reviewable() { return result; }

    // Sorting makes file-selection order immaterial; length prefixes keep the
    // binding unambiguous. Raw bytes bind unknown fields and whitespace too.
    let mut order: Vec<usize> = (0..result.originals.len()).collect();
    order.sort_by_key(|i| result.originals[*i].kind);
    let mut digest = Sha256::new();
    digest.update(b"rivune-legacy-import-preview-v1\0");
    let mut parsed = Vec::new();
    for i in order {
        let source = &result.originals[i];
        let sha256 = format!("{:x}", Sha256::digest(&source.bytes));
        digest.update(source.kind.label().as_bytes());
        digest.update([0]);
        digest.update((source.bytes.len() as u64).to_be_bytes());
        digest.update(&source.bytes);
        result.summary.sources.push(SourceReceipt { kind: source.kind, sha256, byte_count: source.bytes.len() });
        match serde_json::from_slice::<StrictJson>(&source.bytes) {
            Ok(value) => match serde_json::from_slice::<Box<RawValue>>(&source.bytes) {
                Ok(raw) => parsed.push((source.kind, value.0, raw)),
                Err(_) => result.summary.issues.push(Issue { source: source.kind, code: "raw-preservation-failed",
                    field: "/".into(), blocking: true, line: None, column: None }),
            },
            Err(error) => result.summary.issues.push(Issue { source: source.kind,
                code: if source.kind == SourceKind::HistoryBackup { "backup-invalid-retained" } else { "invalid-or-ambiguous-json" },
                field: "/".into(), blocking: source.kind != SourceKind::HistoryBackup,
                line: Some(error.line()), column: Some(error.column()) }),
        }
    }
    result.summary.fingerprint = format!("{:x}", digest.finalize());
    // A valid backup cannot erase an unreadable primary. All originals stay
    // available to the host's explicit recovery UI; no implicit fallback.
    if !result.reviewable() { return result; }
    let mut conversation_ids = BTreeSet::new();
    let mut project_ids = BTreeSet::new();
    for (kind, value, raw) in &parsed {
        match kind {
            SourceKind::History => {
                let Some(items) = value.as_array() else { result.issue(*kind, "/", "history-not-array", true); continue };
                let Ok(raw_items) = serde_json::from_str::<Vec<Box<RawValue>>>(raw.get()) else {
                    result.issue(*kind, "/", "raw-preservation-failed", true); continue;
                };
                if items.len() != raw_items.len() { result.issue(*kind, "/", "raw-preservation-failed", true); continue; }
                for (i, (item, original_json)) in items.iter().zip(raw_items).enumerate() {
                    let field = format!("/{i}");
                    if !record(item, &["id", "title", "preview", "mode"], &["isFavorite", "isArchived"])
                        || !date(item.get("updatedAt")) || !uuid_field(item, "id") || !optional_uuid(item, "projectID") {
                        result.issue(*kind, &field, "invalid-conversation", true); continue;
                    }
                    let id = item["id"].as_str().unwrap().to_ascii_lowercase();
                    if !conversation_ids.insert(id) { result.issue(*kind, &field, "duplicate-conversation-id", true); }
                    let Some(turns) = item.get("turns").and_then(Value::as_array) else {
                        result.issue(*kind, &field, "turns-not-array", true); continue;
                    };
                    let mut turn_ids = BTreeSet::new();
                    for (t, turn) in turns.iter().enumerate() {
                        let path = format!("/{i}/turns/{t}");
                        if !record(turn, &["id", "prompt", "mode"], &[]) || !uuid_field(turn, "id")
                            || !date(turn.get("createdAt")) || !attachments(turn.get("attachments")) {
                            result.issue(*kind, &path, "invalid-turn", true); continue;
                        }
                        if !turn_ids.insert(turn["id"].as_str().unwrap().to_ascii_lowercase()) {
                            result.issue(*kind, &path, "duplicate-turn-id", true);
                        }
                        for key in ["chatGPTAnswer", "claudeAnswer", "combinedAnswer"] {
                            if let Some(answer) = turn.get(key).filter(|x| !x.is_null()) {
                                if !record(answer, &["id", "source", "content"], &[]) || !uuid_field(answer, "id")
                                    || answer.get("responseTime").and_then(Value::as_f64).filter(|x| x.is_finite() && *x >= 0.0).is_none() {
                                    result.issue(*kind, format!("{path}/{key}"), "invalid-answer", true);
                                }
                            }
                        }
                        if turn.get("retryContext").filter(|x| !x.is_null()).is_some() {
                            result.issue(*kind, format!("{path}/retryContext"), "retry-context-needs-host-validation", false);
                        } else {
                            result.issue(*kind, &path, "legacy-exact-retry-unavailable", false);
                        }
                        if turn.get("councilRun").filter(|x| !x.is_null()).is_some()
                            || turn.get("togetherTrace").filter(|x| !x.is_null()).is_some() {
                            result.issue(*kind, &path, "collaboration-record-retained-not-executable", false);
                        }
                    }
                    result.summary.turn_count += turns.len();
                    result.conversations.push(PreservedRecord { decoded: item.clone(), original_json });
                }
            }
            SourceKind::HistoryBackup => {
                result.issue(*kind, "/", "backup-retained-not-auto-selected", false);
            }
            SourceKind::Projects => {
                if value.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
                    result.issue(*kind, "/schemaVersion", "unsupported-project-schema", true); continue;
                }
                let Some(items) = value.get("projects").and_then(Value::as_array) else {
                    result.issue(*kind, "/projects", "projects-not-array", true); continue;
                };
                let Ok(raw_items) = serde_json::from_str::<RawProjects>(raw.get()) else {
                    result.issue(*kind, "/projects", "raw-preservation-failed", true); continue;
                };
                if items.len() != raw_items.projects.len() { result.issue(*kind, "/projects", "raw-preservation-failed", true); continue; }
                for (i, (project, original_json)) in items.iter().zip(raw_items.projects).enumerate() {
                    let field = format!("/projects/{i}");
                    if !record(project, &["id", "name", "instructions", "defaultMode"], &["isArchived"])
                        || !uuid_field(project, "id") || !date(project.get("createdAt")) || !date(project.get("updatedAt")) {
                        result.issue(*kind, &field, "invalid-project", true); continue;
                    }
                    if !project_ids.insert(project["id"].as_str().unwrap().to_ascii_lowercase()) {
                        result.issue(*kind, &field, "duplicate-project-id", true);
                    }
                    let Some(files) = project.get("files").and_then(Value::as_array) else {
                        result.issue(*kind, &field, "project-files-not-array", true); continue;
                    };
                    let mut file_ids = BTreeSet::new();
                    for (f, file) in files.iter().enumerate() {
                        if !record(file, &["id", "name", "path", "fingerprint"], &["included"])
                            || !uuid_field(file, "id") || file.get("byteCount").and_then(Value::as_u64).is_none() {
                            result.issue(*kind, format!("{field}/files/{f}"), "invalid-project-file", true);
                        } else if !file_ids.insert(file["id"].as_str().unwrap().to_ascii_lowercase()) {
                            result.issue(*kind, format!("{field}/files/{f}"), "duplicate-project-file-id", true);
                        }
                    }
                    if !files.is_empty() { result.issue(*kind, &field, "file-permission-reauthorization-required", false); }
                    result.projects.push(PreservedRecord { decoded: project.clone(), original_json });
                }
            }
            SourceKind::Drafts => {
                if !optional_uuid(value, "selectedConversationID") {
                    result.issue(*kind, "/selectedConversationID", "invalid-selected-conversation", true);
                }
                result.selected_conversation_id = value.get("selectedConversationID").and_then(Value::as_str).map(str::to_owned);
                let Some(drafts) = value.get("drafts").and_then(Value::as_object) else {
                    result.issue(*kind, "/drafts", "drafts-not-object", true); continue;
                };
                let Ok(mut raw_drafts) = serde_json::from_str::<RawDrafts>(raw.get()) else {
                    result.issue(*kind, "/drafts", "raw-preservation-failed", true); continue;
                };
                let mut draft_ids = BTreeSet::new();
                for (i, (key, draft)) in drafts.iter().enumerate() {
                    if (key != "new" && !uuid(key)) || !record(draft, &["text"], &[]) || !attachments(draft.get("attachments")) {
                        result.issue(*kind, format!("/drafts/{i}"), "invalid-draft", true); continue;
                    }
                    if !draft_ids.insert(key.to_ascii_lowercase()) { result.issue(*kind, format!("/drafts/{i}"), "ambiguous-draft-id", true); }
                    if let Some(original_json) = raw_drafts.drafts.remove(key) {
                        result.drafts.insert(key.clone(), PreservedRecord { decoded: draft.clone(), original_json });
                    } else { result.issue(*kind, format!("/drafts/{i}"), "raw-preservation-failed", true); }
                }
            }
            SourceKind::Preferences => {
                if !value.is_object() { result.issue(*kind, "/", "preferences-not-object", true); }
                else { result.preferences = Some(raw.clone()); result.issue(*kind, "/", "preferences-require-host-allowlist-and-consent-review", false); }
            }
        }
    }
    for i in 0..result.conversations.len() {
        if let Some(id) = result.conversations[i].decoded.get("projectID").and_then(Value::as_str) {
            if !project_ids.contains(&id.to_ascii_lowercase()) {
                result.issue(SourceKind::History, format!("/{i}/projectID"), "project-reference-not-in-selection", false);
            }
        }
    }
    let orphan_count = result.drafts.keys().filter(|id| *id != "new" && !conversation_ids.contains(&id.to_ascii_lowercase())).count();
    if orphan_count > 0 { result.issue(SourceKind::Drafts, "/drafts", "orphan-drafts-retained-for-recovery", false); }
    result.summary.conversation_count = result.conversations.len();
    result.summary.project_count = result.projects.len();
    result.summary.draft_count = result.drafts.len();
    result
}

fn record(value: &Value, strings: &[&str], booleans: &[&str]) -> bool {
    value.is_object() && strings.iter().all(|k| value.get(*k).and_then(Value::as_str).is_some())
        && booleans.iter().all(|k| value.get(*k).and_then(Value::as_bool).is_some())
}
fn uuid(value: &str) -> bool {
    value.len() == 36 && value.bytes().enumerate().all(|(i, b)| {
        if [8,13,18,23].contains(&i) { b == b'-' } else { b.is_ascii_hexdigit() }
    })
}
fn uuid_field(value: &Value, key: &str) -> bool { value.get(key).and_then(Value::as_str).map(uuid).unwrap_or(false) }
fn optional_uuid(value: &Value, key: &str) -> bool { value.get(key).filter(|x| !x.is_null()).map(|x| x.as_str().map(uuid).unwrap_or(false)).unwrap_or(true) }
fn date(value: Option<&Value>) -> bool { value.and_then(Value::as_f64).and_then(foundation_to_unix_milliseconds).is_some() }
pub fn foundation_to_unix_milliseconds(seconds: f64) -> Option<f64> {
    let milliseconds = (seconds + 978_307_200.0) * 1000.0;
    (seconds.is_finite() && milliseconds.is_finite() && milliseconds.abs() <= 9_007_199_254_740_991.0).then_some(milliseconds)
}
fn attachments(value: Option<&Value>) -> bool {
    let Some(items) = value.and_then(Value::as_array) else { return false };
    let mut ids = BTreeSet::new();
    items.iter().all(|item| record(item, &["id", "name", "textContent"], &[]) && uuid_field(item, "id")
        && item.get("byteCount").and_then(Value::as_u64).is_some()
        && ids.insert(item["id"].as_str().unwrap().to_ascii_lowercase()))
}

/// Reject duplicate object keys instead of losing a field before preservation.
struct StrictJson(Value);
impl<'de> Deserialize<'de> for StrictJson {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct StrictVisitor;
        impl<'de> Visitor<'de> for StrictVisitor {
            type Value = StrictJson;
            fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result { f.write_str("unambiguous JSON") }
            fn visit_bool<E: de::Error>(self, value: bool) -> Result<Self::Value, E> { Ok(StrictJson(Value::Bool(value))) }
            fn visit_i64<E: de::Error>(self, value: i64) -> Result<Self::Value, E> { Ok(StrictJson(Value::Number(value.into()))) }
            fn visit_u64<E: de::Error>(self, value: u64) -> Result<Self::Value, E> { Ok(StrictJson(Value::Number(value.into()))) }
            fn visit_f64<E: de::Error>(self, value: f64) -> Result<Self::Value, E> {
                Number::from_f64(value).map(|n| StrictJson(Value::Number(n))).ok_or_else(|| E::custom("nonfinite number"))
            }
            fn visit_str<E: de::Error>(self, value: &str) -> Result<Self::Value, E> { Ok(StrictJson(Value::String(value.to_owned()))) }
            fn visit_string<E: de::Error>(self, value: String) -> Result<Self::Value, E> { Ok(StrictJson(Value::String(value))) }
            fn visit_unit<E: de::Error>(self) -> Result<Self::Value, E> { Ok(StrictJson(Value::Null)) }
            fn visit_none<E: de::Error>(self) -> Result<Self::Value, E> { Ok(StrictJson(Value::Null)) }
            fn visit_seq<A: SeqAccess<'de>>(self, mut sequence: A) -> Result<Self::Value, A::Error> {
                let mut values = Vec::new();
                while let Some(value) = sequence.next_element::<StrictJson>()? { values.push(value.0); }
                Ok(StrictJson(Value::Array(values)))
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let mut values = Map::new();
                while let Some((key, value)) = map.next_entry::<String, StrictJson>()? {
                    if values.insert(key, value.0).is_some() { return Err(de::Error::custom("duplicate object key")); }
                }
                Ok(StrictJson(Value::Object(values)))
            }
        }
        deserializer.deserialize_any(StrictVisitor)
    }
}
