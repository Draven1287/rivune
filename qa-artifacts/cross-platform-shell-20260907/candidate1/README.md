# Rivune cross-platform shell — candidate 1

This is an isolated architecture and interaction spike. It is **not** a Rivune desktop release, provider integration, packaged application, or parity claim.

## What is executable here

- Dependency-free browser renderer in `web/`
- Pure contract/dispatch tests in `tests/`
- Syntax checks through the installed Node 22 runtime

Run:

```sh
npm test
npm run check
```

Opening `web/index.html` shows the truthful disconnected state. A real desktop host must inject `globalThis.__RIVUNE_DESKTOP_HOST__` before `app.mjs` loads. This spike intentionally does not implement a fallback store, mock task, clipboard/screen access, network endpoint, native command, or provider dispatch.

## What is configuration only

`src-tauri/` is a minimal Tauri 2 packaging scaffold. It was not compiled because Rust/Cargo and the Tauri dependencies are not installed locally. `tauri.conf.json` sets a restrictive CSP and packages local static files, but the host adapter is not wired to Tauri commands.

Expected owner-run commands after approving and installing the official prerequisites in an isolated platform worktree:

```sh
cargo install tauri-cli --version '^2' --locked
cargo tauri build --bundles dmg
cargo tauri build --bundles nsis
cargo tauri build --bundles appimage,deb
```

Run each platform command on its matching OS. Do not cross-compile and call the result verified. Generate and commit `Cargo.lock`, pin the approved Tauri CLI/crate versions, add production icons, and record checksums before release-candidate use.

## Integration contract

The desktop host must provide exactly:

```js
globalThis.__RIVUNE_DESKTOP_HOST__ = {
  getSnapshot: async () => workspaceSnapshotV1,
  openConversation: async (conversationID) => undefined,
  submitRun: async ({ id, conversationID, prompt, mode }) => acknowledgement
};
```

The host—not the renderer—must enforce authentication, capability readiness, durable deduplication, filesystem permission, execution location, and provider invocation. An uncertain submission outcome must be reconciled by its request ID and never retried automatically.

## Acceptance gates before “desktop app” language

- Real host-backed conversations and task events; no fixture or duplicate database
- Draft preserved through navigation, relaunch, and update
- Exactly one provider dispatch under double-click, reconnect, timeout, and crash recovery
- Correct close/quit/single-instance behavior on each OS
- Keyboard, focus order, screen reader names, contrast, reduced motion, light/dark, DPI scaling
- Clean installer/uninstaller/upgrade behavior on real Windows and Linux machines
- Signed/notarized or explicitly internal-only artifacts with recorded architecture and hashes
