use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub draft: String,
    #[serde(default)]
    pub approved_context: ApprovedContext,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedContext {
    pub project_instructions: String,
    pub conversation_history: String,
    pub documents: String,
    pub selected_artifact: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProviderKind {
    Codex,
    Claude,
    Fixture,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub id: String,
    pub kind: ProviderKind,
    pub executable_path: String,
    pub model: Option<String>,
    pub timeout_ms: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdmittedRequest {
    #[serde(rename = "requestID")]
    pub request_id: String,
    #[serde(rename = "conversationID")]
    pub conversation_id: String,
    pub prompt: String,
    pub mode: String,
    pub provider: ProviderConfig,
    pub approved_context: ApprovedContext,
    pub retry_of: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RunRecord {
    pub id: String,
    #[serde(rename = "conversationID")]
    pub conversation_id: String,
    pub status: String,
    pub updated_at: String,
    pub admitted: AdmittedRequest,
    pub answer: Option<String>,
    pub error: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
    pub schema_version: u32,
    pub conversations: Vec<Conversation>,
    pub runs: Vec<RunRecord>,
    pub providers: Vec<ProviderConfig>,
    #[serde(rename = "selectedProviderID")]
    pub selected_provider_id: Option<String>,
}

impl Default for WorkspaceSnapshot {
    fn default() -> Self {
        Self {
            schema_version: 1,
            conversations: vec![Conversation {
                id: "welcome".into(),
                title: "New conversation".into(),
                draft: String::new(),
                approved_context: ApprovedContext::default(),
            }],
            runs: Vec::new(),
            providers: Vec::new(),
            selected_provider_id: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitRunRequest {
    pub id: String,
    #[serde(rename = "conversationID")]
    pub conversation_id: String,
    pub prompt: String,
    pub mode: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetryRunRequest {
    #[serde(rename = "sourceRunID")]
    pub source_run_id: String,
    #[serde(rename = "newRequestID")]
    pub new_request_id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Acknowledgement {
    pub state: String,
    #[serde(rename = "requestID")]
    pub request_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

