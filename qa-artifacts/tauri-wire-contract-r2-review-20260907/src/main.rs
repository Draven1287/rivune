mod host_types;
use host_types::*;
fn main(){
 let provider=ProviderConfig{id:"fixture".into(),kind:ProviderKind::Fixture,executable_path:"/fixture-only".into(),model:None,timeout_ms:1000};
 let admitted=AdmittedRequest{request_id:"r1".into(),conversation_id:"welcome".into(),prompt:"fixture".into(),mode:"direct".into(),provider:provider.clone(),approved_context:ApprovedContext::default(),retry_of:None};
 let run=RunRecord{id:"r1".into(),conversation_id:"welcome".into(),status:"completed".into(),updated_at:"2026-09-07T00:00:00Z".into(),admitted,answer:Some("fixture answer".into()),error:None};
 let mut snapshot=WorkspaceSnapshot::default();snapshot.runs.push(run);snapshot.providers.push(provider);snapshot.selected_provider_id=Some("fixture".into());
 let submit=serde_json::from_value::<SubmitRunRequest>(serde_json::json!({"id":"r2","conversationID":"welcome","prompt":"fixture","mode":"direct"}));
 let retry=serde_json::from_value::<RetryRunRequest>(serde_json::json!({"sourceRunID":"r1","newRequestID":"r2"}));
 let ack=Acknowledgement{state:"accepted".into(),request_id:"r1".into(),error:None};
 println!("{}",serde_json::json!({"snapshot":snapshot,"ack":ack,"submitAccepted":submit.is_ok(),"submitError":submit.err().map(|e|e.to_string()),"retryAccepted":retry.is_ok(),"retryError":retry.err().map(|e|e.to_string())}));
}
