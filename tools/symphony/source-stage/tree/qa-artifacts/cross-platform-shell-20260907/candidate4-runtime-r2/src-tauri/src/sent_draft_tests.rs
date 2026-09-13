use super::*;
use std::time::{SystemTime,UNIX_EPOCH};
fn fixture() -> (HostState,PathBuf,AdmittedRequest,DraftAdmissionGuard) {
 let p=std::env::temp_dir().join(format!("rivune-sent-draft-{}-{}",std::process::id(),SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
 let h=HostState::open(p.clone()).unwrap();
 let a=AdmittedRequest{request_id:"sent-1".into(),conversation_id:"welcome".into(),prompt:"Exact sent text".into(),mode:"direct".into(),provider:ProviderConfig{id:"fixture:sent".into(),kind:ProviderKind::Fixture,executable_path:"/never-executed".into(),model:None,timeout_ms:1000},approved_context:ApprovedContext::default(),attachments:vec![],model_selection:None,team:None,retry_of:None};
 let g=DraftAdmissionGuard{conversation_id:a.conversation_id.clone(),prompt:a.prompt.clone(),revision:Some(2)};
 {let mut w=h.workspace.lock().unwrap();w.conversations[0].draft=a.prompt.clone();w.conversations[0].rich_draft.revision=2;h.save(&mut w).unwrap();}
 (h,p,a,g)
}
#[test]
fn sent_draft_atomic_admission_restart_and_replay() {
 let(h,p,a,g)=fixture();h.reserve_recovery(SubmissionRecoveryIdentity{request_id:a.request_id.clone(),conversation_id:a.conversation_id.clone()}).unwrap();
 {let mut w=h.workspace.lock().unwrap();let mut next=admission_candidate(&w,&a,Some(&g)).unwrap();assert_eq!(next.conversations[0].rich_draft.revision,3);assert_eq!(next.conversations[0].draft,"");assert_eq!(next.runs.len(),1);h.save(&mut next).unwrap();*w=next;}
 drop(h);let h=HostState::open(p.clone()).unwrap();assert_eq!(h.reconcile(&a.request_id).state,"accepted");
 {let w=h.workspace.lock().unwrap();let next=admission_candidate(&w,&a,Some(&g)).unwrap();assert_eq!(next.runs.len(),1);assert_eq!(next.conversations[0].rich_draft.revision,3);assert_eq!(next.conversations[0].draft,"");let replay=SubmitRunRequest{id:a.request_id.clone(),conversation_id:a.conversation_id.clone(),prompt:a.prompt.clone(),mode:a.mode.clone(),rich_draft_revision:Some(2)};assert_eq!(prepare_submission(&w,replay).unwrap(),a);}
 drop(h);fs::remove_dir_all(p).unwrap();
}
#[test]
fn sent_draft_guard_rejects_plain_stale_identity_readonly_overflow() {
 let(h,p,a,g)=fixture();let w=h.workspace.lock().unwrap();
 for which in 0..6 {let mut candidate=w.clone();let mut guard=g.clone();match which {0=>guard.revision=None,1=>guard.revision=Some(1),2=>guard.prompt="different".into(),3=>guard.conversation_id="other".into(),4=>candidate.conversations[0].read_only=true,_=>{candidate.conversations[0].rich_draft.revision=u64::MAX;guard.revision=Some(u64::MAX);}}assert!(admission_candidate(&candidate,&a,Some(&guard)).is_err());assert!(candidate.runs.is_empty());assert_eq!(candidate.conversations[0].draft,a.prompt);}
 drop(w);drop(h);fs::remove_dir_all(p).unwrap();
}
#[test]
fn sent_draft_save_faults_never_persist_half_admission() {
 for fault in [PersistFault::AfterWrite,PersistFault::AfterSync,PersistFault::AfterRename] {
 let(h,p,a,g)=fixture();{let w=h.workspace.lock().unwrap();let mut next=admission_candidate(&w,&a,Some(&g)).unwrap();h.fail_next_save(fault);assert!(h.save(&mut next).is_err());}drop(h);
 let h=HostState::open(p.clone()).unwrap();{let w=h.workspace.lock().unwrap();if w.runs.is_empty(){assert_eq!(w.conversations[0].draft,a.prompt);assert_eq!(w.conversations[0].rich_draft.revision,2);}else{assert_eq!(w.runs.len(),1);assert_eq!(w.conversations[0].draft,"");assert_eq!(w.conversations[0].rich_draft.revision,3);}}drop(h);fs::remove_dir_all(p).unwrap();
 }
}
#[test]
fn sent_draft_preserves_other_conversation_metadata_and_retry_composer() {
 let(h,p,a,g)=fixture();let w=h.workspace.lock().unwrap();let mut source=w.clone();let mut other=source.conversations[0].clone();other.id="other".into();other.draft="Unrelated composer".into();source.conversations.push(other.clone());source.active_conversation_id=Some("other".into());source.conversations[0].rich_draft.attachment_ids=vec!["preserve-context-id".into()];
 let before=source.conversations[0].rich_draft.clone();let next=admission_candidate(&source,&a,Some(&g)).unwrap();assert_eq!(next.conversations[1],other);let mut expected=before;expected.revision+=1;assert_eq!(next.conversations[0].rich_draft,expected);
 let mut retry=a.clone();retry.request_id="retry".into();retry.retry_of=Some(a.request_id.clone());let mut composing=next.clone();composing.conversations[0].draft="New draft during retry".into();let result=admission_candidate(&composing,&retry,None).unwrap();assert_eq!(result.conversations,composing.conversations);assert!(admission_candidate(&composing,&retry,Some(&g)).is_err());
 drop(w);drop(h);fs::remove_dir_all(p).unwrap();
}
