// Append inside host::saved_artifact_tests. Uses the captured module's helpers.
fn persistence_case_disk(p: &std::path::Path) -> WorkspaceSnapshot {
    let mut files: Vec<_> = fs::read_dir(p.join("snapshots")).unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("json"))
        .collect();
    files.sort(); // Host generation filenames are zero-padded.
    serde_json::from_slice(&fs::read(files.last().unwrap()).unwrap()).unwrap()
}
fn persistence_case_council(h: &HostState, r: RunRecord, s: &TeamSession) {
    let mut w = h.workspace.lock().unwrap();
    let routes = vec![r.admitted.provider.clone(); 2];
    w.runs.push(r);
    w.constellation_sessions.push(PersistedConstellation {
        request_id: "council".into(), checkpoint: s.checkpoint().unwrap(),
        routes, activity: RunActivity::default(),
    });
    h.save(&mut w).unwrap();
}
fn persistence_case_member(h: &HostState, s: &TeamSession) -> Result<RunEvent, String> {
    h.save_constellation_checkpoint("council", s,
        ("memberCompleted", "contribute", "running", None, None, "fixture member saved", None), None)
}

#[test]
fn saved_artifact_p03_terminal_fault_immediate_reopen() {
    for fault in [PersistFault::AfterWrite, PersistFault::AfterSync, PersistFault::AfterRename] {
        let p = profile(); let h = HostState::open(p.clone()).unwrap();
        { let mut w = h.workspace.lock().unwrap(); w.runs.push(run("direct", "welcome")); h.save(&mut w).unwrap(); }
        h.fail_next_save(fault);
        assert_eq!(h.finish_execution("direct", Ok("P03 exact 🪐".into())).state, "uncertain");
        assert!(h.workspace.lock().unwrap().artifacts.is_empty());
        let committed = fault == PersistFault::AfterRename;
        let disk = persistence_case_disk(&p);
        assert_eq!(disk.runs[0].answer.as_deref(), if committed { Some("P03 exact 🪐") } else { None });
        assert_eq!(disk.runs[0].status, if committed { "completed" } else { "running" });
        assert_eq!(disk.artifacts.len(), usize::from(committed));
        if committed { assert_eq!(artifacts::inspect(&disk, &query(&disk.artifacts[0])).unwrap().text, "P03 exact 🪐"); }
        // No reconcile/save occurs between fault and reopen.
        drop(h); let h = HostState::open(p.clone()).unwrap();
        { let w = h.workspace.lock().unwrap();
          assert_eq!(w.runs[0].status, if committed { "completed" } else { "failed" });
          assert_eq!(w.runs[0].answer, disk.runs[0].answer);
          assert_eq!(w.artifacts, disk.artifacts); }
        drop(h); fs::remove_dir_all(p).unwrap();
    }
}

#[test]
fn saved_artifact_p05_checkpoint_double_fault_immediate_reopen() {
    for fault in [PersistFault::AfterWrite, PersistFault::AfterSync, PersistFault::AfterRename] {
        let p = profile(); let h = HostState::open(p.clone()).unwrap();
        let (r, mut s) = council(); persistence_case_council(&h, r, &s);
        complete(&mut s, success("P05 member A")); persistence_case_member(&h, &s).unwrap();
        let before = persistence_case_disk(&p);
        assert_eq!(before.artifacts.len(), 1);
        complete(&mut s, success("P05 member B"));
        let new_checkpoint = s.checkpoint().unwrap();
        h.fail_checkpoint_saves("memberCompleted", fault, 2);
        assert!(persistence_case_member(&h, &s).is_err());
        assert_eq!(h.workspace.lock().unwrap().artifacts, before.artifacts);
        let disk = persistence_case_disk(&p);
        let committed = fault == PersistFault::AfterRename;
        assert_eq!(disk.artifacts.len(), if committed { 2 } else { 1 });
        assert_eq!(disk.artifacts[0], before.artifacts[0]);
        assert_eq!(disk.constellation_sessions[0].checkpoint,
            if committed { new_checkpoint } else { before.constellation_sessions[0].checkpoint.clone() });
        assert!(disk.runs[0].answer.is_none());
        assert!(disk.artifacts.iter().all(|a| a.summary.origin.kind == "memberAnswer"));
        drop(h); let h = HostState::open(p.clone()).unwrap();
        { let w = h.workspace.lock().unwrap();
          assert_eq!(w.runs[0].status, "failed"); // Prior committed run was still running.
          assert_eq!(w.artifacts, disk.artifacts);
          assert_eq!(artifacts::inspect(&w, &query(&before.artifacts[0])).unwrap().text, "P05 member A"); }
        drop(h); fs::remove_dir_all(p).unwrap();
    }
}

#[test]
fn saved_artifact_p06_final_checkpoint_double_fault_immediate_reopen() {
    for fault in [PersistFault::AfterWrite, PersistFault::AfterSync, PersistFault::AfterRename] {
        let p = profile(); let h = HostState::open(p.clone()).unwrap();
        let (r, mut s) = council(); persistence_case_council(&h, r, &s);
        complete(&mut s, success("P06 member A")); persistence_case_member(&h, &s).unwrap();
        complete(&mut s, success("P06 member B")); persistence_case_member(&h, &s).unwrap();
        let before = persistence_case_disk(&p); assert_eq!(before.artifacts.len(), 2);
        complete(&mut s, success("P06 synthesis"));
        let answer = s.delivery().unwrap().text.clone(); let terminal_checkpoint = s.checkpoint().unwrap();
        h.fail_checkpoint_saves("finalCompleted", fault, 2);
        assert!(h.save_constellation_checkpoint("council", &s,
            ("finalCompleted", "final", "completed", None, None, "fixture final", None),
            Some(("completed", Some(answer.clone()), None))).is_err());
        assert_eq!(h.workspace.lock().unwrap().artifacts, before.artifacts);
        let disk = persistence_case_disk(&p); let committed = fault == PersistFault::AfterRename;
        assert_eq!(disk.runs[0].status, if committed { "completed" } else { "running" });
        assert_eq!(disk.runs[0].answer, if committed { Some(answer.clone()) } else { None });
        assert_eq!(disk.artifacts.len(), if committed { 3 } else { 2 });
        assert_eq!(&disk.artifacts[..2], before.artifacts.as_slice());
        assert_eq!(disk.artifacts.iter().filter(|a| a.summary.origin.kind == "finalAnswer").count(), usize::from(committed));
        assert_eq!(disk.constellation_sessions[0].checkpoint,
            if committed { terminal_checkpoint } else { before.constellation_sessions[0].checkpoint.clone() });
        if committed { assert_eq!(artifacts::inspect(&disk, &query(&disk.artifacts[2])).unwrap().text, answer); }
        drop(h); let h = HostState::open(p.clone()).unwrap();
        { let w = h.workspace.lock().unwrap();
          assert_eq!(w.runs[0].status, if committed { "completed" } else { "failed" });
          assert_eq!(w.runs[0].answer, disk.runs[0].answer); assert_eq!(w.artifacts, disk.artifacts); }
        drop(h); let h = HostState::open(p.clone()).unwrap();
        assert_eq!(h.workspace.lock().unwrap().artifacts, disk.artifacts);
        drop(h); fs::remove_dir_all(p).unwrap();
    }
}
