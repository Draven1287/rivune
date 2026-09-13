# Dock activation source review

## Final receipt reconciliation — 2026-09-09

Independently reread the actual helper, production Reopen wiring and both focused tests against `DOCK_SHUTDOWN_DISTINCTION_RECEIPT_20260909.md`. Current main.rs SHA-256 remains `7be8c39f381884a6dbd6fa540d964edec436bee610eda0b13434611bb3a3cb60`, matching the builder's `qa-artifacts/dock-shutdown-distinction-20260909/source-hashes.json`. Current tray.rs SHA-256 is `ee09b9d495e65ba0ef31bbb69450a4b0fc2e9bc8cf8ee6bff926321747639149` (auditor snapshot, not separately included in that test manifest).

The completed receipt reports 14/14 main tests, and its saved `main-tests.log` was inspected. This supplies builder-run compile/test evidence for the hash-matched helper and its two tests; no tests were rerun by this auditor. It supersedes the earlier remaining request below for a matching receipt. Both missing-Reopen and healthy-completed-shutdown findings are closed in source. No new actionable defect identified in the reviewed change.

Remaining gate is rendered, separately authorized native verification of Dock activation, minimization, recovery restoration and same-window/one-tray behavior. Mock action counts cannot establish those OS behaviors. Error attention remains best-effort if tray update itself fails; this is an explicit limitation, not a newly introduced blocker. Prior packaged/installed artifacts do not establish delivery of this patch. All sections below are dated checkpoints and must be read subject to this final reconciliation. No production changes or native execution occurred.

## Latest recheck — shutdown distinction closed in source

Inspected `main.rs` SHA-256 `7be8c39f381884a6dbd6fa540d964edec436bee610eda0b13434611bb3a3cb60`. This supersedes both earlier open findings below. The new `reopen_existing_window` helper (line 127) skips restoration only for healthy completed shutdown (`!recovery_required && ready_to_exit`). Recovery remains restorable despite its permission-to-exit flag; healthy pending/failed shutdown restores its unchanged existing surface. The macOS Reopen arm (line 485) calls this helper with the existing `open_main` action.

**Closed in source:** absent Dock handler and unconditional restoration after healthy completed shutdown. The production call chain only looks up main, shows, unminimizes and focuses it; no window/tray/profile creation, model dispatch, navigation, shutdown abort or gate mutation is introduced. Restoration errors propagate to the event arm's existing NeedsAttention update. That update is best-effort: its own error is discarded, so this is not guaranteed user-visible error reporting.

Two focused tests are now present (lines 526 and 551). They cover healthy, pending-or-failed, completed and recovery decisions; verify request/ready/sequence/recovered state remains unchanged; check repeated action invocation and restoration-error propagation. These are meaningful helper-level tests, not proof of native focus, actual window count, tray count, or each underlying show/unminimize/focus failure. Tests were inspected, not executed by this auditor. The earlier receipt's 12/12 result predates this hash and must not be treated as execution evidence for these newly added tests.

**Remaining verification:** builder compile/test receipt tied to this or a later frozen hash; separately authorized rendered Dock close/minimize/recovery and same-window/one-tray checks. No remaining source blocker identified in this narrowly scoped reopen change. No production edits, builds, native launch, N5, provider calls or private QA forwarding performed.

## Superseding recheck — newly added Reopen arm

Current read now contains a macOS-only `RunEvent::Reopen { .. }` arm at `main.rs:472`. This supersedes the historical “absent” finding below. Read `DOCK_REOPEN_SELECTED_TEAM_RECEIPT_20260909.md`: builder reports 12/12 main tests compiling this arm; those are attributed results, not tests executed by this auditor. Current command-reported main.rs SHA-256: `8b23ebb9bcdb07c69213b760e2afc42f6d7bfad1b1987544263cd27d62db75b1`. Source is actively changing; freeze the next corrected file before acceptance.

**Closed in source:** Dock event explicitly calls existing open_main; helper looks up main, shows/unminimizes/focuses it. The added arm performs no window/tray/profile creation, navigation, shutdown abort or editing enablement. Recovery content therefore remains the same content. Missing-window or restoration errors set existing tray NeedsAttention; no unwrap/panic or replacement allocation is introduced in this branch. Actual native focus and one-visible-window behavior remain unverified.

**P2 still open at inspected checkpoint:** Reopen calls open_main unconditionally. It has no distinction for a healthy workspace with completed shutdown (`ready_to_exit=true` after complete_shutdown), so an event queued before process exit can still restore its window. No focused reopen predicate tests are present in the inspected main.rs. Builder is reportedly addressing this; this review does not assume an unobserved correction is already present. Acceptance: restore healthy idle/pending/failed shutdown and startup recovery, but skip healthy completed shutdown; retain recovery restoration despite its startup ready_to_exit=true. Predicate tests must cover that full state table, with same-window-only action checks. Do not interpret startup recovery's permission-to-exit flag as exit-in-progress.

The sections below retain the earlier review for provenance. Their missing-Reopen statement is superseded by this recheck; the recovery-flag warning remains applicable. No production edit, build, native action, N5 execution or private evidence access/forwarding occurred.

Current `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/main.rs` inspected 2026-09-09. No implementation, build, native/UI, provider or test execution. Builder retains sole implementation ownership.

## Current finding

**P2: explicit Dock reopening is still absent.** The event match at lines 470–497 handles CloseRequested (hides main) and ExitRequested, then ignores other events. No Reopen branch exists at this checkpoint. Existing `open_main` at lines 115–125 uses only get_webview_window("main"), show, unminimize and set_focus; it neither allocates a window nor changes workspace state. The sole tray installation remains in setup at line 412.

## Important correction to the preceding recommendation

**Do not use `ready_to_exit` alone as a universal reopen guard.** `startup_shutdown_gate` at lines 61–64 initializes it to true when startup recovery is required. In that mode it means Quit is permitted without a normal workspace shutdown; it does not mean the user has requested exit. An unconditional early return on this flag would strand a hidden recovery window after Close. The earlier pending-hint recheck's suggestion to respect ready_to_exit needs this qualification.

For a healthy workspace, complete_shutdown sets ready_to_exit immediately before app.exit. For corrupted startup, recovery request_quit exits directly. Neither Dock activation nor recovery reopening should call abort_shutdown, resume editing, reconstruct HostState, reset the gate, or invoke startup loading again.

## Minimal builder change and guard semantics

Add a macOS-gated Reopen event arm using the existing open_main helper. Preserve the existing window and its current healthy, frozen-shutdown, or recovery content. Do not create a new application, tray, window or profile. Do not rely only on has_visible_windows: minimizing an existing window should also be restored.

A healthy workspace that has completed shutdown should not restore (ready_to_exit && !recovery_required is the existing-state distinction available here). A recovery window should remain restorable while the process exists. If exact discrimination of recovery exit-in-progress is needed, use a narrowly scoped exit-intent flag set only at actual exit request; do not redefine the existing recovery permission flag. This is a source recommendation, not permission to implement it here.

During pending/failed healthy shutdown, restoring the same window is useful so the user can see the frozen/recovery notice. It must leave shutdown admission and all disabled/editing gates untouched. Missing main window should surface an error through the existing attention mechanism, not silently construct a second window. Handle lock/error paths without panics.

## Acceptance for later authorized tests

| State/event | Required result |
| --- | --- |
| Healthy close then Dock activation | Same window shown/unminimized/focused; one tray/process. |
| Healthy minimized window, including visible-window hint true | Same restoration path; no new window. |
| Repeated activation | No additional setup/tray/profile initialization. |
| Pending or failed shutdown | Existing frozen/recovery UI visible; no abort/resume or draft mutation. |
| Healthy shutdown completed | No reopening after exit acceptance. |
| Corrupted startup, close then activate | Same recovery window restored despite ready_to_exit=true; no workspace initialization or provider capability bypass. |
| Missing main window | Explicit error/attention; no replacement window. |

Use a focused source-level decision/action mock first, asserting only visibility calls and no mutation/creation callbacks. Actual Dock/foreground behavior remains a separately authorized native check; no SystemUIServer inspection is needed for this source review.

## Reconciliation of prior reports

The earlier Settings-loss reproduction describes obsolete pre-hint code. The current AtomicBool pending hint plus subscribe-before-consume bridge closes successful in-process early delivery; recovery Settings is disabled and host-guarded. `TRAY_SETTINGS_PENDING_RECHECK_20260909.md` records the remaining consume-response/disposal limitations. None of those findings requires repeating old fixtures here. Native Settings visibility and Dock behavior remain unverified, consistent with the approved `CONSTELLATION_NATIVE_VALIDATION_RECEIPT_20260909.md`.
