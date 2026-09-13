# R3 independent project/context review

September 8, 2026. Assignment: R3-INDEPENDENT-CONTEXT.

**No actionable defect established in the requested host paths by this source review.** This is not runtime acceptance or a passing-test claim. No Cargo, compilation, build, UI, provider or account execution occurred. Canonical source was not edited. No behavioral reproduction fixture was created because no concrete failure was identified; a translated model would not establish Rust host behavior.

Source: `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs`, SHA-256 `c2f42a713698d38651c565d17c3d6317f9ef31cac8a0f39cf1506e8d9f5b1643`.

| Concern | Source evidence reviewed | Conclusion within review scope |
|---|---|---|
| Project edits versus retry | `retry_run` at 2713 clones the source admitted request; changes only request ID and retry ancestry. `HostState::execute` at 708–750 rechecks eligibility, uncertainty markers, existing retry child and exact original context equality under the workspace lock. | Editing or moving a project does not cause retry to substitute current instructions. Retry intentionally retains the original admitted context. |
| Cross-project instruction isolation | `prepare_submission` at 2126 reads the conversation's linked project, rejects a missing linked project, clears instructions for no project, and assembles history for that conversation. It does not use the active sidebar project for an existing chat. | Selecting project B while chatting in A does not itself inject B instructions. A move affects subsequent newly prepared requests; an already prepared request retains its captured context. |
| Import move rejection | `move_conversation_to_project_in` at 1926 checks destination existence and conversation existence, then rejects `read_only` before publication. | Imported read-only conversations cannot acquire a live project link through this path. |
| Save/publication ordering | Create/update/select/move work on a cloned candidate and call `commit_candidate` at 1755. It publishes only after save success, or after a save error explicitly marked committed; the latter returns an uncertainty error. | Precommit failures leave the in-memory workspace unchanged. Postcommit uncertainty publishes the matching visible state rather than falsely claiming rollback or success. Filesystem fault behavior was inspected, not executed. |
| Shutdown | Project mutations call `lock_mutation` at 470 before the workspace lock and retain that guard through save/publication. Execute shares the lifecycle lock with shutdown and registers cancellation after durable admission within that barrier. | New mutations/admissions are rejected after shutdown begins. No reversed lock ordering identified in the reviewed project paths. Concurrency was not stress-tested. |
| Search | `search_workspace_in` at 1965 bounds query bytes and result count, searches project names/conversation titles, propagates project association/read-only metadata and detects an additional matching row for truncation. | No draft or project mutation in search; no instruction text returned. Search is workspace-wide rather than limited by the active sidebar filter. |

Existing tests inspected, not run: project link/search/persistence/instruction isolation at 2873; import/shutdown guards at 2971; generic precommit/postcommit publication faults around 3240/3291; frozen-context retry around 3690 and duplicate retry identity around 3761.

Coverage limits: the frozen-context test mutates conversation approved context directly rather than exercising the new project editor/move commands. No combined project-edit/move→retry or project-mutation save-fault fixture was executed here. Actual released-build IPC, native UI, restart recovery, save failures and concurrency remain separate acceptance work. Source identity matches the earlier inspected R3 host; this review does not repair the held build's provenance.

Next ready review: frontend attachment contract/fixtures when delivered. Existing build/UI ownership and R3 HOLD remain unchanged.
