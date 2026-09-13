# Sent-draft host implementation — independent bounded review

Date: 2026-09-10  
Scope: native Rust host only. The controller edit-generation fence belongs to its separate reviewer.  
Result: **BOUNDED PASS — no host-source correctness defect found in the reviewed four-file receipt.**

## Frozen identity

The four current files match `qa-artifacts/sent-draft-implementation-20260910/source-hashes.json` byte for byte:

| File | Baseline SHA-256 | Reviewed source SHA-256 |
|---|---|---|
| `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs` | `6540006813844f12b0cc745a6c1817d9d8273deb5dc5c6af802449ba341f2ce1` | `f336d930ade7a0f1a6fc7b5cc370f9b49c67d94f03c9de2593c93c6bfd4f0a7e` |
| `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/sent_draft_tests.rs` | new file | `46768c174e239f95d855d18fe7a1910fa3247c41d1d496bd874d0766da65bec1` |
| `prototypes/ai-native-workspace/src/host/workspaceController.ts` | `240221a02c3294ad7dbcaee75fab35caca5dfeb8608baaeb86ecaa17d98cae7d` | `21b1845891ab840d78aabc3059ceced5eadf70306b54b04e4a5d1ca5b20d81e5` |
| `prototypes/ai-native-workspace/tests/hostController.test.mjs` | `81b5c78f5daf42a7d61b32e4c2ec6eeb2227123d373512862536f2226b046f74` | `747790c7a8da53b9e5edd7673792dfd9980d9b029f4d892d948cbffb752d0a97` |

The corresponding three baseline copies that exist under `before/` also match their recorded baseline hashes; the test file is correctly recorded as new. `preservation.json` records frozen candidate `5fa49168a9284efeec713b7222e0e5c74be16c8a`, 147 unchanged candidate files, three unchanged Results QA files, and Results QA binary SHA-256 `65be23620d739570e301d16706055c49584e1194c1c5918e53c78223e652f776`.

## Actual host call-path review

1. `dispatch_submission` captures `DraftAdmissionGuard` from the original request before preparation (`host.rs:5631-5633`). The guard therefore freezes the submitted conversation ID, prompt, and optional revision across the preparation/execution gap.
2. `prepare_reserved_submission` holds the existing mutation/workspace barrier, validates the recovery reservation, and calls `prepare_submission` (`host.rs:2509-2524`). For a new request, `prepare_submission` now requires the submitted revision to equal the saved rich-draft revision and the prompt to equal the saved draft for plain as well as rich drafts (`host.rs:5063-5071`).
3. The async continuation carries the same frozen guard into `execute_with_draft_guard` (`host.rs:5637-5648`). That function reacquires the lifecycle/workspace admission barrier and revalidates the recovery binding before any new run mutation (`host.rs:2051-2066`). This closes the preparation-to-admission time-of-check/time-of-use window.
4. Existing request-ID lookup occurs before draft mutation in both preparation (`host.rs:4988-4990`) and locked execution (`host.rs:2067-2079`). Exact admitted replays return without entering the clear helper; mismatched admitted content is rejected.
5. `admission_candidate` repeats exact admitted/guard conversation and prompt identity, editability, revision and current-draft checks (`host.rs:686-695`). On success it clones the workspace, clears only `Conversation.draft`, advances `RichDraft.revision` with checked arithmetic exactly once, and appends the exact admitted `RunRecord` to that same candidate (`host.rs:690-699`).
6. Constellation admission adds its prepared session to that same candidate before the one `save` call (`host.rs:2133-2147`). `save` materializes derived artifacts on a clone and persists that complete candidate before publishing it to memory (`host.rs:1240-1263`). The snapshot writer writes and syncs a pending file, then renames it to the committed snapshot (`host.rs:2685-2717`). Thus reopen can observe the complete old state or complete new run-plus-clear state, not a host-authored half mutation.
7. The direct retry command clones the original admitted request and invokes `host.execute`, which reaches `execute_with_draft_guard(..., None)` (`host.rs:2001-2017, 5678-5711`). Locked retry validation requires the exact original admitted content (`host.rs:2091-2131`). With no draft guard, `admission_candidate` appends the retry without reading, clearing, or incrementing the current composer.

## Seven-case contract mapping

| Acceptance case | Host finding |
|---|---|
| Accepted, same draft | PASS: exact guard match creates one candidate containing both the run and blank text at revision +1. |
| Newer edited draft | PASS at host boundary: a durable intervening edit changes prompt/revision and causes locked admission rejection; a post-admission local edit belongs to the controller fence review. |
| Uncertain admission | PASS: pre-rename failure rejects with old durable state; post-rename failure reports uncertain with the committed run-plus-clear candidate. |
| Rejected request | PASS: all guard failures occur before candidate publication/save, retaining the saved prompt and revision. |
| Lost reply/reconcile | PASS: exact request lookup precedes draft validation/mutation, and `reconcile` reads the existing run rather than dispatching another. |
| Switch conversation | PASS: every clear lookup is keyed by the frozen request/guard conversation ID, never `active_conversation_id`; unrelated conversations are cloned unchanged. |
| Restart | PASS: run, blank draft, and incremented revision live in the same committed snapshot; reconcile does not call the admission helper or increment the revision. |

## Recorded focused evidence inspected

`host-tests.log` records four selected groups passing, 0 failing, with 157 tests filtered out:

- atomic candidate save, reopen/reconcile, and duplicate helper/preparation replay;
- missing/stale revision, wrong prompt/conversation, read-only, and revision-overflow rejection;
- after-write, after-sync, and after-rename reopen outcomes, accepting only a complete old or complete new state;
- unrelated-conversation and rich-draft metadata preservation plus retry composer isolation.

The assertions in `sent_draft_tests.rs` call the same private `admission_candidate` and `HostState::save` used by production admission. They preserve the full `RichDraft` value except for the expected revision increment, preserve an unrelated conversation byte-for-value, and demonstrate that a retry without a guard leaves all composers unchanged.

The adjacent recorded controller log reports 12/12 selected tests passing and the TypeScript log reports `tsc --noEmit` success. Those results were inspected for receipt consistency only; this review does not accept or re-review the controller fence.

## Evidence limits and release boundary

- The four focused Rust groups do not invoke the Tauri async `dispatch_submission` entry point or execute a provider. Actual dispatch → preparation → locked guard wiring is therefore source-inspected, not exercised end to end by this focused host log.
- The focused plain/stale rejection group directly tests locked `admission_candidate`; the separate `prepare_submission` plain-draft revision change is source-inspected and is not isolated in a named focused test in this four-group log.
- No native compile, provider continuation, application launch, export, package, installed-app change, or runtime visual behavior was performed by this reviewer.

Within those explicit limits, the native host slice satisfies the sent-draft atomicity, replay ordering, retry isolation, and preservation contract and is acceptable to proceed to the separately reviewed controller fence and later integrated runtime validation.
