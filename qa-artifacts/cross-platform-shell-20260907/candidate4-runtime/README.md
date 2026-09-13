# Rivune unified Tauri runtime — candidate 4

This durable candidate contains Rivune's first compiled Tauri renderer and Rust host slice. Read `FIRST_SOURCE_FREEZE.md` for exact evidence and remaining gates. It does not modify or launch the installed app.

Run the dependency-free renderer checks with `npm test` and `npm run check`. Run the host checks from `src-tauri` with the workspace-scoped Rust environment recorded in the freeze document, then `cargo test --locked --offline` and `cargo build --locked --offline`.

The production bridge is `web/desktop-host.mjs`; the Rust entry point is `src-tauri/src/main.rs`; host state and bounded direct-process execution are in `src-tauri/src/host.rs`.
