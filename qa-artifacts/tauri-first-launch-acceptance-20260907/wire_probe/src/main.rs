use serde::{Deserialize, Serialize};
use serde_json::json;

// This probe isolates the serialized first-launch boundary from the currently
// non-compiling host implementation. Field names and serde annotations mirror
// the source-bound candidate4-runtime-r2 host types.
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApprovedContext {
    project_instructions: String,
    conversation_history: String,
    documents: String,
    selected_artifact: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Conversation {
    id: String,
    title: String,
    draft: String,
    approved_context: ApprovedContext,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum ProviderKind { Codex, Claude, Fixture }

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderConfig {
    id: String,
    kind: ProviderKind,
    executable_path: String,
    model: Option<String>,
    timeout_ms: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSnapshot {
    schema_version: u32,
    conversations: Vec<Conversation>,
    runs: Vec<serde_json::Value>,
    providers: Vec<ProviderConfig>,
    #[serde(rename = "selectedProviderID")]
    selected_provider_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SubmitRunRequest {
    id: String,
    #[serde(rename = "conversationID")]
    conversation_id: String,
    prompt: String,
    mode: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RetryRunRequest {
    #[serde(rename = "sourceRunID")]
    source_run_id: String,
    #[serde(rename = "newRequestID")]
    new_request_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Acknowledgement {
    state: String,
    #[serde(rename = "requestID")]
    request_id: String,
}

fn main() {
    let snapshot = WorkspaceSnapshot {
        schema_version: 1,
        conversations: vec![Conversation {
            id: "conversation-1".into(),
            title: "Synthetic wire fixture".into(),
            draft: "draft".into(),
            approved_context: ApprovedContext::default(),
        }],
        runs: vec![],
        providers: vec![ProviderConfig {
            id: "codex:fixture".into(),
            kind: ProviderKind::Fixture,
            executable_path: "/synthetic/no-provider-call".into(),
            model: None,
            timeout_ms: 2_000,
        }],
        selected_provider_id: Some("codex:fixture".into()),
    };
    let submit: SubmitRunRequest = serde_json::from_value(json!({
        "id": "request-2", "conversationID": "conversation-1",
        "prompt": "next", "mode": "direct"
    })).expect("JS submit shape must decode");
    let retry: RetryRunRequest = serde_json::from_value(json!({
        "sourceRunID": "request-1", "newRequestID": "request-3"
    })).expect("JS retry shape must decode");
    let acknowledgement = Acknowledgement { state: "accepted".into(), request_id: submit.id.clone() };
    println!("{}", serde_json::to_string(&json!({
        "synthetic": true,
        "providerCalls": 0,
        "snapshot": snapshot,
        "acknowledgement": acknowledgement,
        "decodedSubmitConversationID": submit.conversation_id,
        "decodedSubmitPrompt": submit.prompt,
        "decodedSubmitMode": submit.mode,
        "decodedRetrySourceRunID": retry.source_run_id,
        "decodedRetryNewRequestID": retry.new_request_id
    })).unwrap());
}
