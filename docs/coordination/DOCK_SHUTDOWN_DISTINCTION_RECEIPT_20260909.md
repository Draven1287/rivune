# Dock reopen shutdown distinction

Read `DOCK_ACTIVATION_SOURCE_REVIEW_20260909.md` against current source. Its earlier missing-Reopen observation was superseded; its warning about recovery's ready-to-exit flag remains applicable.

The current macOS Reopen branch now calls `reopen_existing_window`. It suppresses the existing-window restore action only when `ready_to_exit && !recovery_required`. Healthy completed shutdown therefore does not reopen. Recovery remains restorable even though startup grants it permission to exit. Healthy normal and pending/failed shutdown still restore their existing content.

The helper only reads startup status and the atomic flag, then optionally invokes the supplied restore action. It does not abort shutdown, reset gates, resume editing, initialize HostState, navigate, or create a window/tray/process. Production wiring supplies the existing `open_main` action (show, unminimize, focus). Missing-window errors still reach the existing NeedsAttention path.

## Verification

Two focused decision/action tests cover healthy normal, pending/failed, completed shutdown, and recovery; assert expected restore-call counts and unchanged request token, ready flag, sequence and recovered-token set; and cover repeated restoration plus missing-window error propagation. They use mock restore actions and do not create native windows.

`cargo test --locked --offline --bin rivune -- --test-threads=1` compiled current macOS source and passed **14/14 main tests**, zero failed/ignored, using the existing repository-local cache. Scoped diff check passed. Evidence and source hashes are in `qa-artifacts/dock-shutdown-distinction-20260909/`.

This batch is source/test-only. No native app launch, install, provider call, dirty-draft/failed-flush test, private QA forwarding, preview-manager change, or broader frontend rerun occurred. Previous packaged artifacts do not contain this new distinction.

Next gate remains an independently reviewed, separately authorized clean native check of existing-window Dock restoration for normal and recovery content. Actual Dock click/foreground/minimize behavior is not established by these decision tests. No N5-style test is needed for that gate.
