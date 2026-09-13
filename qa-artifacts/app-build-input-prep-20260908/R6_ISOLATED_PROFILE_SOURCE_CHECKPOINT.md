# R6 isolated-profile source checkpoint

Status: source correction and focused debug/release tests passed. No app build, bundle mutation, signing, launch, installation, provider call, or publication was performed.

## Frozen source

- File: `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/main.rs`
- SHA-256: `175ec732e9505e4a64b364b071ca53a156040ca2747d67007395dea12e2a2fe0`
- Scope: `resolved_profile_path` and five same-file focused tests only.

The release-only rejection was removed. When `RIVUNE_ISOLATED_PROFILE_DIR` is absent, the ordinary app-data `profile-v1` path remains unchanged. When supplied, the value must be an absolute, non-root, non-default directory path; it may not contain relative components, traverse an existing symlink, or resolve to a regular file. Invalid supplied values fail before `HostState::open` and never fall back to the default profile. Existing physical identity and macOS/Windows ASCII case aliases of the default profile are rejected.

This is appropriate for the controlled fresh `/private/tmp` QA profile. It does not claim race-proof confinement against a hostile local process between path validation and `HostState::open`.

## Verification

Deviation: the optimized focused test used `/private/tmp/rivune-profile-release-proof-target`, which caused Cargo to compile a full alternate dependency/test target rather than a small extracted helper. That violated the standing single-heavy-target constraint. The directory is preserved for evidence and was not cleaned. It produced no `.app`, native launch, signing, provider use, or installation and does not substitute for an exact accepted app build. All subsequent Rust compilation, tests, and app builds must reuse `.toolchains/target-candidate4-r2`; no additional target directory is authorized.

- `cargo fmt -- --check`: passed after formatting.
- Debug focused command: `cargo test --bin rivune profile_path -- --test-threads=1`
  - Result: 5 passed, 0 failed, 2 filtered out.
- Release focused command used a disposable target directory: `CARGO_TARGET_DIR=/private/tmp/rivune-profile-release-proof-target cargo test --release --bin rivune profile_path -- --test-threads=1`
  - Result: 5 passed, 0 failed, 2 filtered out.
  - Compiled release test executable: `/private/tmp/rivune-profile-release-proof-target/release/deps/rivune-772014096d0d9338`
  - Binary contains the new fail-closed validation messages and does not contain the removed `RIVUNE_ISOLATED_PROFILE_DIR is development-only` message.

Covered cases: absent override uses default; explicit absolute isolated directory is accepted; relative, root, default, and parent-component paths are rejected without fallback; an existing symlink ancestor and regular file are rejected; a case alias of the default profile is rejected on case-insensitive supported platforms.

## Next gate

Central coordination must independently accept this exact source hash, refresh all project/source/tool aggregate receipts, and issue a new one-build authorization before any R6 app build. The sealed R5 artifact remains immutable historical evidence and does not contain this correction.
