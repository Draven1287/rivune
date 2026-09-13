//! Bounded read-only projection of a host-verified archive. No filesystem or provider access.
use rivune_legacy_import_preview::ImportPreview;
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeSet;

const ITEM_LIMIT: usize = 100;
const TEXT_LIMIT: usize = 4096;
const TOTAL_LIMIT: usize = 128 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveInspection {
    pub schema_version: u32,
    pub fingerprint: String,
    pub sections: Vec<InspectionSection>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectionSection {
    pub kind: &'static str,
    pub items: Vec<InspectionItem>,
    pub total_count: usize,
    pub truncated: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectionItem {
    pub id: String,
    pub label: String,
    pub detail_text: String,
}

fn bounded(value: &str, limit: usize) -> (&str, bool) {
    let mut end = value.len().min(limit);
    while !value.is_char_boundary(end) {
        end -= 1;
    }
    (&value[..end], end != value.len())
}

#[derive(Default)]
struct Detail {
    text: String,
    truncated: bool,
}
impl Detail {
    fn add(&mut self, label: &str, value: &str) {
        for part in [
            if self.text.is_empty() { "" } else { "\n" },
            label,
            ": ",
            value,
        ] {
            let (part, clipped) = bounded(part, TEXT_LIMIT.saturating_sub(self.text.len()));
            self.text.push_str(part);
            self.truncated |= clipped;
        }
    }
    fn field(&mut self, value: &Value, key: &str, label: &str) {
        if let Some(text) = value.get(key).and_then(Value::as_str) {
            self.add(label, text);
        }
    }
    fn number(&mut self, value: &Value, key: &str, label: &str) {
        if let Some(number) = value.get(key).and_then(Value::as_u64) {
            self.add(label, &number.to_string());
        }
    }
}

struct Projection {
    output: ArchiveInspection,
    used: usize,
}
impl Projection {
    fn new(fingerprint: &str) -> Self {
        Self {
            output: ArchiveInspection {
                schema_version: 1,
                fingerprint: fingerprint.into(),
                sections: [
                    "projects",
                    "orphanDrafts",
                    "attachments",
                    "preferences",
                    "notices",
                ]
                .into_iter()
                .map(|kind| InspectionSection {
                    kind,
                    items: vec![],
                    total_count: 0,
                    truncated: false,
                })
                .collect(),
            },
            used: 2048,
        }
    }
    fn add(&mut self, index: usize, label: &str, detail: Detail) {
        let section = &mut self.output.sections[index];
        section.total_count += 1;
        let (label, clipped) = bounded(label, 256);
        section.truncated |= clipped || detail.truncated;
        if section.items.len() == ITEM_LIMIT {
            section.truncated = true;
            return;
        }
        let item = InspectionItem {
            id: format!("{}:{}", section.kind, section.total_count),
            label: label.into(),
            detail_text: detail.text,
        };
        // Count escaped JSON bytes, not only raw text bytes. Reserve envelope/count overhead.
        let cost = serde_json::to_vec(&item).map_or(TOTAL_LIMIT, |bytes| bytes.len() + 1);
        if self.used.saturating_add(cost) > TOTAL_LIMIT {
            section.truncated = true;
            return;
        }
        self.used += cost;
        section.items.push(item);
    }
    fn attachment(&mut self, value: &Value, owner: &str) {
        let mut detail = Detail::default();
        detail.add("Preserved in", owner);
        detail.field(value, "path", "Original path (not opened)");
        detail.number(value, "byteCount", "Recorded bytes");
        detail.field(value, "textContent", "Saved text");
        detail.add(
            "Access",
            "Read-only archive metadata; file permissions are not activated.",
        );
        self.add(
            2,
            value
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or("Unnamed attachment"),
            detail,
        );
    }
}

fn decode(raw: &str) -> Result<Value, String> {
    serde_json::from_str(raw)
        .map_err(|_| "A preserved archive record could not be inspected.".into())
}

/// The caller must load and verify the selected archive before supplying this preview.
/// Unknown preference keys, credentials, bookmark blobs and raw retry context never enter this DTO.
pub fn inspect_legacy_import(preview: &ImportPreview) -> Result<ArchiveInspection, String> {
    let fingerprint = &preview.summary.fingerprint;
    if !preview.reviewable()
        || fingerprint.len() != 64
        || !fingerprint
            .bytes()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase())
    {
        return Err("The archive is not available for verified inspection.".into());
    }
    let mut result = Projection::new(fingerprint);
    let mut conversation_ids = BTreeSet::new();
    for record in &preview.conversations {
        if let Some(id) = record.id() {
            conversation_ids.insert(id.to_ascii_lowercase());
        }
        let conversation = decode(record.raw_json())?;
        let title = conversation
            .get("title")
            .and_then(Value::as_str)
            .unwrap_or("Imported conversation");
        for turn in conversation
            .get("turns")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            for attachment in turn
                .get("attachments")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                result.attachment(attachment, title);
            }
        }
    }
    for record in &preview.projects {
        let project = decode(record.raw_json())?;
        let name = project
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or("Unnamed project");
        let mut detail = Detail::default();
        detail.field(&project, "instructions", "Instructions");
        detail.add(
            "Availability",
            "Archived only; this is not an active project or permission grant.",
        );
        result.add(0, name, detail);
        for file in project
            .get("files")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            result.attachment(file, name);
        }
    }
    for (id, record) in &preview.drafts {
        let draft = decode(record.raw_json())?;
        if !conversation_ids.contains(&id.to_ascii_lowercase()) {
            let mut detail = Detail::default();
            detail.field(&draft, "text", "Draft");
            detail.add(
                "Availability",
                "No matching imported conversation; preserved without sending.",
            );
            result.add(
                1,
                if id == "new" {
                    "Unsent new conversation"
                } else {
                    "Unmatched conversation draft"
                },
                detail,
            );
        }
        for attachment in draft
            .get("attachments")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            result.attachment(attachment, "Saved draft");
        }
    }
    if let Some(raw) = &preview.preferences {
        let preferences = decode(raw.get())?;
        for (key, label) in [
            ("rivune.subtleMotion", "Background motion"),
            ("rivune.conversationContext", "Conversation context"),
        ] {
            if let Some(value) = preferences.get(key).and_then(Value::as_bool) {
                let mut detail = Detail::default();
                detail.add("Saved value", if value { "On" } else { "Off" });
                detail.add(
                    "Availability",
                    "Archived preference; not applied to this workspace.",
                );
                result.add(3, label, detail);
            }
        }
        if let Some(mode) = preferences
            .get("rivune.defaultMode")
            .and_then(Value::as_str)
            .filter(|mode| ["ChatGPT", "Claude", "Together", "Council", "Swarm"].contains(mode))
        {
            let mut detail = Detail::default();
            detail.add("Saved value", mode);
            detail.add(
                "Availability",
                "Archived preference; not an active team configuration.",
            );
            result.add(3, "Default experience", detail);
        }
        let mut detail = Detail::default();
        detail.add("Privacy", "Only recognized non-secret preferences are shown. Other keys and old consent values are omitted. This view does not restore permissions; use Export originals for the preserved files.");
        result.add(4, "Preference inspection limits", detail);
    }
    for issue in &preview.summary.issues {
        let mut detail = Detail::default();
        detail.add("Record", &issue.field);
        detail.add(
            "Availability",
            "Preserved safety notice; no AI execution or file permission is granted.",
        );
        result.add(4, issue.code, detail);
    }
    let bytes = serde_json::to_vec(&result.output)
        .map_err(|_| "Archive inspection could not be prepared.")?;
    if bytes.len() > TOTAL_LIMIT {
        return Err("Archive inspection exceeded its response limit.".into());
    }
    Ok(result.output)
}
