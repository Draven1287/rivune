# In-progress Tauri r2 review

2026-09-07. Source was still being edited by its owner; this is not frozen acceptance.

Target: `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2`.

## Executed

`node --test tests/wire.test.mjs` invoked the real Rust `wire_fixture` example with locked offline Cargo. After approximately 196 seconds of compilation it failed with E0432 (`use fs2::FileExt`, host.rs:2) and E0599 (`File::try_lock_exclusive`, host.rs:181). The wire assertions were not reached. No app was launched and no installed profile was opened. Runtime and central owners received the failure; build slot released.

## Source concerns for owner tests

- `persist_with_fault` creates a fixed generation pending file. A failure after write/sync leaves it behind while `HostState::save` advances generation only on success. Test a failed save followed by a successful save in the same host; reopening alone does not cover recovery. Also test failure after rename during directory sync and its effect on in-memory versus committed state.
- Config sets `connect-src 'none'`. Exact downloaded Tauri 2.11.5 `scripts/ipc-protocol.js` falls back to `window.ipc.postMessage` after custom-protocol fetch/CSP failure. Therefore this setting is not proof that invoke fails. Verify the intended IPC allowlist and actual commands in the launched packaged webview.

## Remaining acceptance

Wait for owner freeze and manifest before replay. Compile success, wire success, rendered app commands, migration, and installer rollback are distinct gates. This review does not authorize installation or deletion.
