# Settings pending hint and Dock reopening: source recheck

Read current source and `CONSTELLATION_NATIVE_VALIDATION_RECEIPT_20260909.md` only. No private supplemental record, test execution, build, native launch, SystemUIServer access, provider use or cross-task forwarding. Builder retains sole implementation ownership.

Source root below: `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2`.

## Superseded findings

**Early registration race closed for successful in-process delivery.** `src-tauri/src/main.rs:27–46` now maintains an AtomicBool Settings hint outside HostState. `open_settings` at line 127 restores/focuses the existing window, stores the hint, then emits. Repeated requests before consumption coalesce; atomic swap returns true once. `web/desktop-host.mjs:9–41` installs the listener before invoking `take_pending_settings_request`, so requests before or during registration are consumed after registration. A renderer boolean retains a successful command result for a live receiver or replacement. This supersedes the earlier report's unconditional “early click disappears” finding.

**Startup recovery disable closed in source.** `main.rs:420` disables the actual Settings item for recovery; `tray.rs:51` calls set_enabled. `SettingsNavigation::request` separately rejects recovery mode before storing a hint. Recovery is startup state, not an implemented live transition needing queue migration. The approved receipt reports compiled tests for these guards; this review did not rerun them or observe the menu.

**React subscription gap remains closed.** React `src/host/lifecycle.ts:149` connects onOpenSettings, and HostWorkspace opens the dialog via state/effect. Subscription cleanup and capability gating remain intact.

**Packaging uncertainty narrowed.** The approved native receipt explicitly identifies `tauri-override.json` selecting an isolated React stage and separate source/embedded-file hashes. Baseline frontendDist still naming legacy web is therefore not proof that the reported staged binary excludes React. This audit has not independently opened the staged files/binary; receipt claims remain attributed, not fresh artifact verification.

## Exact limits of the implemented contract

- This is a coalesced, volatile navigation hint, not acknowledgement of a visible dialog. `take` clears before IPC response delivery. A lost response or webview reload between take and delivery loses that request. The receipt explicitly disclaims this stronger guarantee; do not relabel it durable navigation.
- Bridge clears retainedSettings after a synchronous handler return. React lifecycle intentionally ignores Settings outside idle, and a disposed coordinator callback may return without opening UI while asynchronous subscription cleanup completes. A consumed hint in those intervals is not proof of successful dialog presentation. **P2 residual if stronger delivery is required:** test remount/disposal between consume and callback, and a non-idle callback, then decide whether to retain until a live receiver accepts it. Do not introduce workspace persistence for navigation.
- Ready repeated events can call the handler repeatedly. React's boolean open state makes the intended operation idempotent, but focus containment/return and visible one-dialog behavior remain native/rendered acceptance gaps.
- Registration failure remains fail-closed and reported by lifecycle. No change establishes Settings availability in an incomplete bridge.

The smallest current acceptance statement is: an early request survives until successful bridge consumption in the same process; recovery Settings is disabled and host-guarded. Stronger lost-response, visible-open acknowledgement and cross-webview guarantees are not established.

## Smallest Dock reopen fix for builder

`main.rs:470–496` handles CloseRequested by hiding main and handles ExitRequested; there is no explicit Reopen case. Reuse `open_main` at line 114 for a macOS-only `RunEvent::Reopen { .. }` match arm, confirming the exact enum variant against the pinned Tauri dependency during implementation. Call the existing show/unminimize/set_focus path; do not create another App, webview, tray, profile or event loop. Do not restrict restoration solely to “no visible windows,” since a minimized existing window should also be restored. Respect an already accepted exit (`ready_to_exit`) so reopening cannot restart shutdown completion. Surface a restore error through the existing attention mechanism rather than constructing a replacement window.

This addresses Dock activation of the current process. It does not implement second-process activation forwarding or change profile locking. Recovery should reopen the same recovery window, not bypass its gating.

Acceptance for a later authorized check: close then Dock activate restores the same window; minimize then activate restores/focuses it; repeated activation retains one window/tray/process and existing state; activation during completed exit does not recreate UI; recovery activation preserves recovery restrictions. First use a mock action seam to verify routing and exit guard. Any native check must inspect only Rivune, be bounded, and stop on inspection failure. No such checks were run here.
