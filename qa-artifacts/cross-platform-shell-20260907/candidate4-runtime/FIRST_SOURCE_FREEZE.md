# Rivune Tauri runtime — first source freeze

Date: 2026-09-07

This is the first executable host slice for the user-directed unified Tauri application. It is isolated from the installed app and from the legacy SwiftUI source. It is not yet an installer, migration-complete replacement, Council/Swarm implementation, or cross-platform verification claim.

## Implemented

- Tauri invoke bridge and Rust commands for snapshot, conversation selection/creation, draft persistence, provider configuration, submit, reconcile, cancel and retry.
- Host-owned versioned workspace snapshots in an explicit profile directory. Saves are immutable generations; an interrupted pending-only store fails closed instead of creating an empty workspace.
- Startup converts persisted `queued`/`running` records to an explicit interrupted failure while preserving the admitted request.
- Direct Codex/Claude adapter allowlist with absolute existing executable paths, fixed host-owned argument templates, optional bounded model choice, sanitized environment and no shell.
- Durable admission before process execution, exact request-ID/content deduplication and rejection of altered content under a reused ID.
- Approved project instructions, conversation history, documents and selected artifact stored as a distinct host-owned context snapshot and reused by retry.
- Concurrent stdin/stdout/stderr handling, 2 MiB capture limits, ten-minute maximum timeout, owned-child kill/reap and bounded post-exit pipe collection.
- Renderer displays answers and errors, preserves drafts, recovers an uncertain request ID across renderer reload, exposes cancellation/retry, and refreshes host state while work is active.
- Development bundle identity `com.rivune.desktop.development`; debug-only absolute `RIVUNE_ISOLATED_PROFILE_DIR` override prevents tests from opening the default store.

## Verification

- `npm test`: 11 passed, 0 failed.
- `npm run check`: passed.
- Independent draft regression harness against this exact `web/`: 2 passed, 0 failed.
- `cargo fmt --check`: passed with Rust 1.98.1.
- `cargo test --locked --offline`: 7 passed, 0 failed. Fixture subprocesses are explicitly test-only; no provider account was called.
- `cargo build --locked --offline`: passed for `aarch64-apple-darwin`. The app was not launched.

## Still required before replacement

- Independent review of this exact manifest and process/storage failure paths.
- Integrate the accepted legacy import preview/archive behind explicit review, confirmation, activation and rollback. Do not flatten retained legacy records into the minimal conversation view.
- Build and rendered-test the isolated Tauri application with an isolated profile; then verify migration and rollback before the separately announced `/Applications/Rivune.app` replacement.
- Real Codex and Claude CLI smoke tests require explicit non-paid fixture or owner-approved account use; none occurred here.
- Windows and Linux builds, ACL/durability behavior, installers and rendered QA remain unverified.
- Council and Swarm are rejected by this slice rather than silently routed as direct. Their real coordinator integration is a later gated milestone.

## Exact toolchain environment

All Rust commands used workspace-scoped paths only; shell settings were not changed:

```text
CARGO_HOME=<workspace>/.toolchains/cargo
RUSTUP_HOME=<workspace>/.toolchains/rustup
CARGO_TARGET_DIR=<workspace>/.toolchains/target-candidate4
PATH=<workspace>/.toolchains/cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin
```
