# Candidate 5 identity metadata correction

This is a small superseding patch for the accepted packaging executor. It does not edit candidate5, the R3 executor V2 workspace, or canonical product source.

## Defect closed

The previous identity guard required the Cargo package name itself to be `rivune`. The canonical package is intentionally `rivune-desktop`, with one explicit product binary named `rivune` at `src/main.rs`.

The patch validates product identity using the actual Cargo metadata target list after the accepted locked/offline metadata command. It requires exactly one root package for the accepted manifest and exactly one binary target. That target must be named exactly `rivune`, have binary crate type, and resolve to `src-tauri/src/main.rs`. The manifest must independently contain exactly one explicit `[[bin]]` with the same exact name and path. Package name equality is checked between the manifest and Cargo metadata, but the internal package is not renamed. Existing Tauri product name, window title, bundle target, icon containment, and native icon payload checks remain.

## Evidence

- `node --test tests/packaging.test.mjs`: 23 passed, 0 failed.
- The real R3 validate-only runner passed against the existing v5 receipt and canonical `rivune-desktop` manifest.
- Returned identity: product `Rivune`, internal package `rivune-desktop`, binary `rivune`, source `src-tauri/src/main.rs`, evidence `cargo-metadata`.
- Negative coverage rejects missing binaries, multiple binaries, substring names such as `rivune-helper`, wrong source paths, and manifest/metadata package disagreement.

The original candidate5 manifest still passes all 12 entries. The executor V2 workspace retains a preexisting manifest mismatch for its already-overlaid `package-local.mjs` and packaging test; this patch is bound to their actual current V2 hashes and does not treat the old manifest as current evidence.

No build command was executed. Review `CANDIDATE5_IDENTITY_METADATA_FIX.patch` and `RECEIPT.json`; if accepted, the runtime packaging executor should apply the patch in its owned workspace and regenerate its own manifest and receipt before another validation or build decision.
