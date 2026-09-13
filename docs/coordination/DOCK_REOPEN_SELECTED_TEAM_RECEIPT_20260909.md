# Dock reopen source and exact selected team assertions

Completed bounded source/test batch. The existing preview manager remains untouched on port 4317. No native app launch, installation, provider operation, N5 retry, or private QA forwarding occurred.

## Selected team checks

Strengthened the existing selected scenarios without expanding their scope:

- Dirty form: clicking **Load saved team** restores the remote participants and third-provider lead, clears the conflict, and performs no save.
- Keep choices: the single save payload preserves all three original local route IDs in order, leadIndex 1, and the selected second-provider lead; it uses refreshed expectedRevision 2.
- Failed save: after the rejected save and an unchanged refresh, an actual external saved-team change now must show explicit conflict resolution and disable Save while retaining the local participant choices and lead. No save replay is allowed.

Actual browser result: **5/5 selected team-form checks passed** at `http://127.0.0.1:4317/tests/hostRenderer.html?scenario=team-form`. The existing guard still rejects any selected scenario invoking submit or shutdown methods. No full mounted-suite rerun was used for this batch.

## Dock reopen

Current `main.rs` had no `RunEvent::Reopen` branch. Added a macOS-only branch that calls the existing `open_main` function: locate the authoritative main window, show it, unminimize it, then focus it. The handler does not navigate or replace the content, so it preserves a recovery view. It creates no windows, trays, or processes. If the window is absent or restoration fails, it reports NeedsAttention through the existing tray status path.

The variant was checked against the installed Tauri source and compiled on the existing macOS toolchain/cache. `cargo test --locked --offline --bin rivune -- --test-threads=1` passed **12/12 main lifecycle/startup tests**, including the pending Settings and recovery guards. These tests compile the new branch but do not prove a rendered Dock click.

Production frontend build and scoped diff check passed. Logs and current hashes: `qa-artifacts/dock-reopen-selected-team-20260909/`.

## Next gate

Independent source review can inspect the small Reopen branch now. The next runtime gate, only when separately authorized, is a clean isolated build with an existing main window: hide it via normal window close, activate the Dock icon, and verify the same window restores/unminimizes/focuses; repeat with recovery content already shown and verify it remains recovery content. Confirm one window and one tray. No dirty draft or failed-flush path is needed. Native inspection previously stalled beyond its timeout, so do not call that rendered gate complete from compilation or restart fixture evidence.
