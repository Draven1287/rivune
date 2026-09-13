use rivune_desktop::host::{
    Acknowledgement, ApprovedContext, Conversation, Project, ProviderConfig, ProviderKind,
    RetryRunRequest, RunRecord, SubmitRunRequest, WorkspaceSnapshot,
};
use serde_json::json;

fn main() {
    let provider = ProviderConfig {
        id: "codex:fixture".into(),
        kind: ProviderKind::Codex,
        executable_path: "/fixture/codex".into(),
        model: None,
        timeout_ms: 2_000,
    };
    let admitted = rivune_desktop::host::AdmittedRequest {
        request_id: "request-1".into(),
        conversation_id: "conversation-1".into(),
        prompt: "hello".into(),
        mode: "direct".into(),
        provider: provider.clone(),
        approved_context: ApprovedContext::default(),
        attachments: Vec::new(),
        model_selection: None,
        team: None,
        retry_of: None,
    };
    let snapshot = WorkspaceSnapshot {
        schema_version: 1,
        conversations: vec![Conversation {
            id: "conversation-1".into(),
            title: "Fixture".into(),
            read_only: false,
            draft: "draft".into(),
            rich_draft: rivune_desktop::host::RichDraft {
                schema_version: 1,
                ..Default::default()
            },
            approved_context: ApprovedContext::default(),
            project_id: Some("project-1".into()),
        }],
        projects: vec![Project {
            schema_version: 1,
            id: "project-1".into(),
            name: "Fixture project".into(),
            instructions: "Use the fixture brief.".into(),
        }],
        active_conversation_id: Some("conversation-1".into()),
        active_project_id: Some("project-1".into()),
        imported_archives: Vec::new(),
        legacy_imports: Vec::new(),
        runs: vec![RunRecord {
            id: "request-1".into(),
            conversation_id: "conversation-1".into(),
            status: "completed".into(),
            updated_at: "1".into(),
            admitted,
            answer: Some("answer".into()),
            error: None,
        }],
        providers: vec![provider],
        selected_provider_id: Some("codex:fixture".into()),
        ..WorkspaceSnapshot::default()
    };
    let submit: SubmitRunRequest = serde_json::from_value(
        json!({"id":"request-2","conversationID":"conversation-1","prompt":"next","mode":"direct"}),
    )
    .expect("JS submit request must decode");
    let retry: RetryRunRequest =
        serde_json::from_value(json!({"sourceRunID":"request-1","newRequestID":"request-3"}))
            .expect("JS retry request must decode");
    let configured: ProviderConfig = serde_json::from_value(json!({
        "id":"claude:local",
        "kind":"claude",
        "executablePath":"/fixture/claude",
        "model":"opus",
        "timeoutMs":120000
    }))
    .expect("JS provider request must decode");
    let acknowledgement = Acknowledgement {
        state: "accepted".into(),
        request_id: submit.id.clone(),
        error: None,
    };
    println!("{}", serde_json::to_string(&json!({"snapshot":snapshot,"acknowledgement":acknowledgement,"decodedSubmitConversationID":submit.conversation_id,"decodedRetrySourceRunID":retry.source_run_id,"decodedProviderPath":configured.executable_path,"decodedProviderTimeoutMs":configured.timeout_ms})).unwrap());
}
