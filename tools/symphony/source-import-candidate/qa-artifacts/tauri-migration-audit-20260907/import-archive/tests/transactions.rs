#[cfg(feature="fault-injection")]
use rivune_legacy_import_archive::Checkpoint;
#[cfg(feature="fault-injection")]
use std::process::Command;
use rivune_legacy_import_archive::{ArchiveError, ArchiveStore, CommitOutcome, PreparedImport};
use rivune_legacy_import_preview::{preview_import, LegacySource, SourceKind};
use std::{fs, path::PathBuf, sync::atomic::{AtomicUsize,Ordering}};
// Process-exit tests spawn children. Serialize cases so another case cannot
// temporarily inherit a just-closing lock descriptor during fork/exec.
static TEST_PROCESS_GATE: std::sync::Mutex<()> = std::sync::Mutex::new(());
static SEQUENCE: AtomicUsize = AtomicUsize::new(0);
struct Temp(PathBuf);
impl Temp {
    fn new() -> Self {
        let path=std::env::temp_dir().join(format!("rivune-archive-test-{}-{}-{}",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos(),SEQUENCE.fetch_add(1,Ordering::SeqCst)));
        fs::create_dir(&path).unwrap(); Self(path)
    }
    fn root(&self)->PathBuf{self.0.join("archive")}
}
impl Drop for Temp {fn drop(&mut self){let _=fs::remove_dir_all(&self.0);}}
fn sources(text:&str)->Vec<LegacySource>{vec![LegacySource{kind:SourceKind::Drafts,bytes:serde_json::to_vec(&serde_json::json!({"drafts":{"new":{"text":text,"attachments":[]}}})).unwrap()}]}
fn prepare(text:&str)->PreparedImport{
 let preview=preview_import(sources(text));PreparedImport::from_reviewed(sources(text),&preview.summary.fingerprint).unwrap()
}

#[test]
fn commits_exact_originals_and_deduplicates_after_reopen(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 let temp=Temp::new();let prepared=prepare("An unsent draft");
 {let mut store=ArchiveStore::open(&temp.root()).unwrap();assert_eq!(store.commit(&prepared).unwrap().outcome,CommitOutcome::Created);}
 let mut store=ArchiveStore::open(&temp.root()).unwrap();
 assert_eq!(store.commit(&prepared).unwrap().outcome,CommitOutcome::AlreadyPresent);
 let restored=store.load(prepared.fingerprint()).unwrap();
 assert_eq!(restored.originals[0].bytes,sources("An unsent draft")[0].bytes);
 assert_eq!(restored.drafts["new"].text_field("text"),Some("An unsent draft"));
 assert!(!restored.may_dispatch_imported_work());
 assert_eq!(store.inventory().unwrap().committed,vec![prepared.fingerprint()]);
}

#[test]
fn mismatched_review_or_corrupt_sources_are_rejected_before_writes(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 let preview=preview_import(sources("old"));
 assert!(matches!(PreparedImport::from_reviewed(sources("new"),&preview.summary.fingerprint),Err(ArchiveError::BindingMismatch)));
 assert!(matches!(PreparedImport::from_reviewed(vec![LegacySource{kind:SourceKind::Drafts,bytes:b"broken".to_vec()}],&preview.summary.fingerprint),Err(ArchiveError::InvalidSelection)));
 // Public preview mutations are irrelevant: admission uses original bytes again.
 let mut tampered=preview_import(sources("original"));tampered.drafts.clear();tampered.summary.draft_count=0;
 let prepared=PreparedImport::from_reviewed(tampered.originals,&tampered.summary.fingerprint).unwrap();
 let temp=Temp::new();let mut store=ArchiveStore::open(&temp.root()).unwrap();store.commit(&prepared).unwrap();
 assert_eq!(store.load(prepared.fingerprint()).unwrap().summary.draft_count,1);
}

#[test]
fn same_legacy_ids_in_different_imports_never_overwrite(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 let temp=Temp::new();let mut store=ArchiveStore::open(&temp.root()).unwrap();let first=prepare("first");let second=prepare("second");
 store.commit(&first).unwrap();store.commit(&second).unwrap();
 assert_eq!(store.inventory().unwrap().committed.len(),2);
 assert_eq!(store.load(first.fingerprint()).unwrap().drafts["new"].text_field("text"),Some("first"));
 assert_eq!(store.load(second.fingerprint()).unwrap().drafts["new"].text_field("text"),Some("second"));
}

#[test]
fn malformed_existing_archive_blocks_instead_of_being_overwritten(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 let temp=Temp::new();let prepared=prepare("keep");let mut store=ArchiveStore::open(&temp.root()).unwrap();store.commit(&prepared).unwrap();
 let path=temp.root().join(prepared.fingerprint()).join("records.json");fs::write(&path,b"corrupt").unwrap();
 assert!(store.commit(&prepared).is_err());assert_eq!(fs::read(&path).unwrap(),b"corrupt");
 assert!(store.inventory().is_err());
}

#[test]
fn unexpected_or_missing_payloads_and_unsafe_manifest_names_block(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 for change in ["extra","missing","traversal","duplicate"]{
  let temp=Temp::new();let prepared=prepare("keep");let mut store=ArchiveStore::open(&temp.root()).unwrap();store.commit(&prepared).unwrap();
  let root=temp.root().join(prepared.fingerprint());let manifest=root.join("manifest.json");
  match change{
   "extra"=>fs::write(root.join("unlisted.json"),b"extra").unwrap(),
   "missing"=>fs::remove_file(root.join("drafts.json")).unwrap(),
   "traversal"=>{let mut value:serde_json::Value=serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();value["files"][0]["name"]=serde_json::json!("../outside.json");fs::write(&manifest,serde_json::to_vec(&value).unwrap()).unwrap()},
   _=>{let mut value:serde_json::Value=serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();let first=value["files"][0].clone();value["files"].as_array_mut().unwrap().push(first);fs::write(&manifest,serde_json::to_vec(&value).unwrap()).unwrap()}
  }
  assert!(store.load(prepared.fingerprint()).is_err(),"{change}");
 }
}

#[test]
fn exclusive_lock_is_released_when_store_closes(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 let temp=Temp::new();let first=ArchiveStore::open(&temp.root()).unwrap();
 assert!(matches!(ArchiveStore::open(&temp.root()),Err(ArchiveError::Busy)));
 drop(first);assert!(ArchiveStore::open(&temp.root()).is_ok());
 assert!(temp.root().join("archive.lock").is_file());
}

#[cfg(unix)]
#[test]
fn files_are_private_and_links_are_rejected(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 use std::os::unix::fs::{PermissionsExt,symlink};
 let temp=Temp::new();let prepared=prepare("private");let mut store=ArchiveStore::open(&temp.root()).unwrap();store.commit(&prepared).unwrap();
 for path in [temp.root(),temp.root().join(prepared.fingerprint()),temp.root().join(prepared.fingerprint()).join("drafts.json")]{assert_eq!(fs::metadata(path).unwrap().permissions().mode()&0o077,0)}
 let link=temp.0.join("linked");symlink(temp.root(),&link).unwrap();assert!(matches!(ArchiveStore::open(&link),Err(ArchiveError::UnsafePath)));
 let payload=temp.root().join(prepared.fingerprint()).join("drafts.json");let outside=temp.0.join("outside.json");fs::write(&outside,b"unrelated").unwrap();fs::remove_file(&payload).unwrap();symlink(&outside,&payload).unwrap();
 assert!(store.load(prepared.fingerprint()).is_err());assert_eq!(fs::read(&outside).unwrap(),b"unrelated");
}

#[test]
fn full_records_and_invalid_backup_bytes_survive(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 let envelope:serde_json::Value=serde_json::from_str(include_str!("../../fixtures/conversation-project-reference.json")).unwrap();
 let history=serde_json::to_vec(&envelope["input"]).unwrap();
 let create=||vec![LegacySource{kind:SourceKind::History,bytes:history.clone()},LegacySource{kind:SourceKind::HistoryBackup,bytes:vec![0xff,0xfe,0x00]}];
 let preview=preview_import(create());let prepared=PreparedImport::from_reviewed(create(),&preview.summary.fingerprint).unwrap();
 let temp=Temp::new();let mut store=ArchiveStore::open(&temp.root()).unwrap();store.commit(&prepared).unwrap();
 let loaded=store.load(prepared.fingerprint()).unwrap();assert_eq!(loaded.conversations[0].raw_json(),preview.conversations[0].raw_json());
 assert_eq!(loaded.originals.iter().find(|s|s.kind==SourceKind::HistoryBackup).unwrap().bytes,vec![0xff,0xfe,0x00]);
}

#[cfg(feature="fault-injection")]
#[test]
fn interrupted_operations_preserve_prior_archives_and_reconcile_publication(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 for checkpoint in [Checkpoint::StageCreated,Checkpoint::PayloadWritten(0),Checkpoint::ManifestWritten,Checkpoint::StageSynced,Checkpoint::Published,Checkpoint::ParentSynced]{
  let temp=Temp::new();let prior=prepare("prior");let next=prepare("next");
  {let mut store=ArchiveStore::open(&temp.root()).unwrap();store.commit(&prior).unwrap();
   let result=store.commit_with_faults(&next,|point|if point==checkpoint{Err(ArchiveError::InjectedFailure)}else{Ok(())});
   let published=matches!(checkpoint,Checkpoint::Published|Checkpoint::ParentSynced);
   assert_eq!(result.unwrap_err(),if published{ArchiveError::CommitUncertain}else{ArchiveError::InjectedFailure});}
  let mut store=ArchiveStore::open(&temp.root()).unwrap();assert_eq!(store.load(prior.fingerprint()).unwrap().drafts["new"].text_field("text"),Some("prior"));
  let published=matches!(checkpoint,Checkpoint::Published|Checkpoint::ParentSynced);
  assert_eq!(store.inventory().unwrap().committed.len(),if published{2}else{1});
  let retained_stages=store.inventory().unwrap().incomplete_stages;
  assert_eq!(retained_stages,if published{0}else{1});
  assert_eq!(store.commit(&next).unwrap().outcome,if published{CommitOutcome::AlreadyPresent}else{CommitOutcome::Created});
  assert_eq!(store.inventory().unwrap().incomplete_stages,retained_stages);
 }
}

#[cfg(feature="fault-injection")]
#[test]
fn process_exit_releases_lock_and_never_publishes_partial_archive(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 for checkpoint in ["payload","manifest","published"]{
  let temp=Temp::new();let output=Command::new(std::env::current_exe().unwrap()).arg("--exact").arg("crash_child").arg("--nocapture").arg("--ignored").env("RIVUNE_ARCHIVE_TEST_ROOT",temp.root()).env("RIVUNE_ARCHIVE_TEST_CRASH",checkpoint).output().unwrap();
  assert_eq!(output.status.code(),Some(77),"{}",String::from_utf8_lossy(&output.stderr));
  let prepared=prepare("child");let mut store=ArchiveStore::open(&temp.root()).unwrap();let inventory=store.inventory().unwrap();
  assert_eq!(inventory.committed.len(),if checkpoint=="published"{1}else{0});
  assert_eq!(store.commit(&prepared).unwrap().outcome,if checkpoint=="published"{CommitOutcome::AlreadyPresent}else{CommitOutcome::Created});
  assert_eq!(store.load(prepared.fingerprint()).unwrap().drafts["new"].text_field("text"),Some("child"));
 }
}

#[cfg(feature="fault-injection")]
#[test]
#[ignore = "helper executed only as an owned child in process-exit tests"]
fn crash_child(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 let Some(root)=std::env::var_os("RIVUNE_ARCHIVE_TEST_ROOT")else{return};
 let crash=std::env::var("RIVUNE_ARCHIVE_TEST_CRASH").unwrap();let mut store=ArchiveStore::open(&PathBuf::from(root)).unwrap();
 store.commit_with_faults(&prepare("child"),|point|{
  if matches!((crash.as_str(),point),("payload",Checkpoint::PayloadWritten(0))|("manifest",Checkpoint::ManifestWritten)|("published",Checkpoint::Published)){std::process::exit(77)} Ok(())
 }).unwrap();
 panic!("child failed to reach checkpoint");
}


#[test]
fn altered_records_with_matching_manifest_hash_still_fail_source_binding(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 use sha2::{Digest,Sha256};
 let temp=Temp::new();let prepared=prepare("keep");let mut store=ArchiveStore::open(&temp.root()).unwrap();store.commit(&prepared).unwrap();
 let root=temp.root().join(prepared.fingerprint());let records=root.join("records.json");let manifest_path=root.join("manifest.json");
 let changed=fs::read_to_string(&records).unwrap().replace("keep","evil").into_bytes();fs::write(&records,&changed).unwrap();
 let mut manifest:serde_json::Value=serde_json::from_slice(&fs::read(&manifest_path).unwrap()).unwrap();
 let entry=manifest["files"].as_array_mut().unwrap().iter_mut().find(|e|e["name"]=="records.json").unwrap();
 entry["bytes"]=serde_json::json!(changed.len());entry["sha256"]=serde_json::json!(format!("{:x}",Sha256::digest(&changed)));
 fs::write(&manifest_path,serde_json::to_vec(&manifest).unwrap()).unwrap();
 assert!(matches!(store.load(prepared.fingerprint()),Err(ArchiveError::CorruptArchive)));
 assert!(store.commit(&prepared).is_err());assert_eq!(fs::read(&records).unwrap(),changed);
}

#[test]
fn exact_unknown_numeric_text_survives_archive_records(){
 let _test_process_guard=TEST_PROCESS_GATE.lock().unwrap_or_else(|e|e.into_inner());
 let bytes=br#"{"drafts":{"new": {"text":"draft","attachments":[],"unknown":18446744073709551617,"precise":0.1234567890123456789012345}}}"#.to_vec();
 let create=||vec![LegacySource{kind:SourceKind::Drafts,bytes:bytes.clone()}];let preview=preview_import(create());
 let prepared=PreparedImport::from_reviewed(create(),&preview.summary.fingerprint).unwrap();let temp=Temp::new();let mut store=ArchiveStore::open(&temp.root()).unwrap();
 let receipt=store.commit(&prepared).unwrap();
 #[cfg(unix)]{assert_eq!(receipt.sync_scope,rivune_legacy_import_archive::SyncScope::FilesAndDirectories);assert_eq!(receipt.access_scope,rivune_legacy_import_archive::AccessScope::UnixOwnerOnlyModes);}
 let restored=store.load(prepared.fingerprint()).unwrap();assert_eq!(restored.originals[0].bytes,bytes);
 assert_eq!(restored.drafts["new"].raw_json(),preview.drafts["new"].raw_json());
 let records=fs::read_to_string(temp.root().join(prepared.fingerprint()).join("records.json")).unwrap();
 assert!(records.contains("18446744073709551617"));assert!(records.contains("0.1234567890123456789012345"));
}
