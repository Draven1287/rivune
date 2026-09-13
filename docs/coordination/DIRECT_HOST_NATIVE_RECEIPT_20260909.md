# Direct host native validation — 2026-09-09

Status: source tests pass; packaged acceptance is incomplete. Do not claim fixture-ready, provider-ready, installer-ready, or user-approved design.

## Artifact and boundary

Evidence directory: `qa-artifacts/direct-host-native-validation-20260909/run-20260909T155759Z`.
Isolated wrapper: `Rivune Recovery QA.app` in that directory; bundle ID `com.rivune.desktop.qa.recovery20260909`.
Earlier cancellation-validation binary SHA-256: `ca02002aebbab88d020bc4ed675da666ddfd97bdeb2a74f07245493a9eb53a70`.
Current N6-fixed binary SHA-256: `0fc03958dab48b918623b9a0e89a305f8b5084ff7945d44049ad7030d77c163b`.
Profile: `/private/tmp/rivune-recovery-qa-hja6fhqu/profile`. This is a newly-created synthetic QA profile, not an installed profile.

Provider ID `qa:synthetic-only` uses a reviewed local Python executable named `codex` in the disposable profile root. It emits a fixed synthetic answer, logs each start, and holds QA_LONG requests; it makes no provider/account/network calls. Four starts total correspond to four admitted runs. No additional start occurred on recovery/reconciliation. The real bridge and native host were used. A staged QA toolbar logs actual bridge calls and injects controlled operations; it is not shipped in production renderer source. Its second-controller cancellation test is distinguished below from the normal mounted UI.

Build commands/config and exact embedded-source hashes are in `build-receipt-162657.json`, `source-hashes-162657.json`, and `tauri-override.json`. `build.py` uses cargo `build --locked --offline --features custom-protocol --bin rivune` and temporary `TAURI_CONFIG`; baseline frontendDist remains `../web`. The final extra host.rs changes are tests only and are recorded in `final-source-hashes.json`.

## Native test results

Repository-local cargo/rustc 1.98.1; CARGO_HOME `.toolchains/cargo`, RUSTUP_HOME `.toolchains/rustup`, CARGO_TARGET_DIR `.toolchains/target-candidate4-r2`; toolchain bin prepended to PATH.

Command: `cargo test --manifest-path qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/Cargo.toml --locked --offline -- --test-threads=1`.
110 library + 7 main lifecycle/profile tests passed. Initial focused recovery run was 7/8: a test fixture used an invalid provider ID. Corrected to `fixture:test-route`; strengthened the fence case to use `fixture:recovery-fence` and assert the reservation rejection. Focused recovery rerun passed 8/8.

Additional command with filter `subprocess_faults_reopen` passed both parent tests, executing eight child process cases (reserve/clear at write, file sync, rename, and successful directory sync). Children exit 73 before HostState destruction. One ignored helper is intentionally invoked explicitly by those parents, not a skipped recovery check. Full output: `../N7-tests.log`. These prove process-exit/reopen behavior, not power-loss durability.

## Packaged observations against the acceptance matrix

| Case | Actual result and limit |
|---|---|
| N1 | Reserved `qa-orphan-aebbd17e-ddb2-4f20-90d4-b953d63a3d81` in welcome; PID49669 killed, reopened PID49903. Exact orphan reconciled rejected and cleared; zero provider starts. Reopened again PID50032 with no replay. `N1-*.json`. Delayed-dispatch fence additionally covered by native test. |
| N2 | Request `27e29500-10bf-4881-a07f-aacd96b8307a` admitted running in PID50032, one fixture start50095; killed then reopened50166. Same ID became failed/interrupted, recovery cleared, no replay; next launch50365 retained it. `N2-*.json`. |
| N3 | Actual mounted UI submitted `8a55b858-f2e0-443c-b8f3-2fffa8b36cc0`. Cancel became available after durable running state while original submit awaited. Observed actual trace: submit start, cancel start, cancel accepted, submit accepted, clear. One submit/one cancel. Reopen51126 retained cancelled. `N3-cancelled-before-reopen.json`, `N3-reopened-and-terminal-before-clear.json`. Rejected/thrown late submit variants are source tests, not separate packaged variants. |
| Terminal recovery | `e0b90724-786a-4e70-ae76-6b913db02cbc` completed with synthetic answer, reserved record deliberately retained by QA toolbar; killed51126 then reopened51272. Answer retained, exact reconciliation/clear, no replay. |
| N4 | QA secondary source controller rejected unknown/terminal cancellation locally and raced duplicate active cancellations. Native trace showed exactly one cancel of `5302d1d3-a012-4326-b1b0-b5b01c0ee5b7`; authoritative snapshot cancelled, completed B unchanged. Secondary controller had cleared the recovery record; original controller's late clear correctly failed and kept send blocked. Explicit Reconcile recovered authoritative null without replay. `N4-conflict-and-saved-draft.json`. Mismatched unresolved-ID packaged variant and post-N4 restart remain unverified. |
| Draft conflict | External QA edit committed revision5 while composer kept local draft. Save returned REVISION_CONFLICT against expected4. Review showed remote text; Keep my draft + explicit save committed revision6. Subsequent synthetic text explicitly saved as revision7. No submit from conflict recovery. |
| Settings | Packaged Settings showed provider installation, unknown authentication, and response not tested. Native tray-origin Settings event was not independently exercised. |
| N5 | Not executed: automatic approval review rejected dirty-draft Cmd-Q as potential unsaved-state loss. Restored snapshots directory from0500 to0700, saved synthetic draft revision7, then clean Cmd-Q succeeded. `clean-exit.json` verifies no own QA process. Dirty flush failure, abort and reopen remain unverified; explicit user approval requested. |
| N6 | Separate disposable profile copy with invalid recovery state. Canonical-path packaged launch aborted (-6): `Invalid saved submission recovery record`. All profile file hashes remained unchanged; no empty replacement. **FAIL** recoverable bounded UI requirement: startup aborts rather than displaying recovery UI. `N6-corrupt-profile.json`; copied evidence retained, temporary corrupt profile removed. First attempt rejected a symlinked temp path before reaching recovery validation, separately retained as `N6-invalid-test-path.json` and excluded from N6 proof. |
| N7 | Eight native subprocess persistence/reopen scenarios passed. Production packaged fault hooks were not added. No power-loss claim. |

Bridge ordering above was observed in CUA's staged QA evidence field; snapshot JSON and fixture logs are machine-readable artifacts. Do not describe every call trace as independently archived or every sentence of N1–N7 as passed.

## Defects corrected during validation

- Native app initially could invoke commands but could not register lifecycle event listeners. Added narrowly scoped main-window `core:event:allow-listen` and `core:event:allow-unlisten` capability; rebuild started successfully.
- Cancelled run rendered generic failure text because its explanatory error was nonempty. Restrict that label to failed status; rebuilt and reopened with cancellation intact.
- Invalid native test fixture IDs corrected; no production provider policy weakened.

## Cleanup and next gate

Clean QA exit verified: no matching isolated executable process. Original synthetic profile is retained while the exact failed-shutdown test awaits approval; saved copy and fixture script/log are in `saved-profile-evidence`. Corrupt-test temporary copies were removed after evidence capture. QA wrapper remains an artifact, not installed. Browser preview4317 remains accessible.

Remaining: explicitly authorized failed-flush shutdown run; missing packaged matrix variants; independent review. Real provider use, signing, notarization, installation and update validation were not performed.

## N6 correction and superseding packaged check — 16:43 UTC

The earlier N6 failure is retained above as historical evidence. Current N6 now passes for the tested unsupported recovery record:

- Native startup handles load failure without propagating it into Tauri setup. It manages only safe startup status and recovery shutdown state, with **no HostState** available to workspace commands. Error details and file contents are not sent to the renderer.
- `get_startup_status` gates React before mounting any workspace controller or lifecycle listeners. The recovery screen contains a bounded explanation and Close Rivune; no composer, provider actions or replacement store.
- `exit_recovery_workspace` refuses normal mode before attempting exit. Normal workspaces retain their durable draft shutdown gate. No change or retry to the rejected N5 test.
- Native startup tests passed3/3, including corrupted latest-file preservation, invalid recovery record preservation, successful startup and normal exit protection. Frontend build and87/87 unit tests passed; mounted browser suite17/17, including no workspace calls on recovery/unknown startup and no sensitive error text.
- Complete main-binary lifecycle/profile regression rerun passed10/10 (`N6-main-regression.log`); no failures or ignored tests. Library source was unchanged by this startup fix.
- `build-receipt-164121.json` and `source-hashes-164121.json` freeze the corrected artifact. Staged entry imports only the real bridge and production React bundle; the previous QA toolbar is not imported in this build.
- Packaged PID54896 launched against fresh `/private/tmp/rivune-recovery-screen-qa-6z64u5au/profile`. CUA observed the actual recovery heading, explanation and Close Rivune button; no editable field. Clicking Close Rivune exited the process. `N6-fixed-launch.json` verifies every profile file hash unchanged, original fixture invocation log unchanged, process exited, and only this temporary corrupt copy removed after evidence capture in `N6-fixed-profile-evidence`.
- This tests one corrupt-record variant, not every possible storage failure. Earlier N1–N4 package results belong to their recorded earlier binaries; they are not silently reattributed to this new build.
