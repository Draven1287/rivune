# Rivune unified Tauri runtime — candidate 4 revision 2

This is the single runnable revision of Rivune's first Tauri renderer and Rust host slice. It remains isolated from `/Applications/Rivune.app` and the superseded SwiftUI implementation. Read `R2_SOURCE_FREEZE.md` for exact evidence, scope, and remaining gates.

The production bridge is `web/desktop-host.mjs`. The Rust entry point is `src-tauri/src/main.rs`; host-owned durable state, direct CLI admission, and bounded process execution are in `src-tauri/src/host.rs`.

Use the workspace-bundled Node executable for renderer checks. Use the workspace-scoped Rust environment recorded in the freeze document for `cargo test --locked --offline` and `cargo build --locked --offline`. No real provider is called by these tests.
