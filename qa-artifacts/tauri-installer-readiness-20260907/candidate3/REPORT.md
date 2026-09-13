# Candidate 3 review response

Date: 2026-09-07

## Corrections

- Executable discovery accepts a valid symlink, follows it, verifies the resolved target is a file, checks execute permission on POSIX, and records the resolved path. The workspace rustup-backed Cargo link now resolves rather than returning null.
- Receipt-controlled renderer and host roots were removed. The gate derives `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/build.rs`, a required `Cargo.lock`, and `build.frontendDist` from the actual `cwd`. The frontend must remain inside that working tree.
- The v3 receipt binds hashes of the complete working tree, derived renderer tree, derived host tree, and every Cargo config reachable from the working directory or configured Cargo home. Mutating a build script or parent Cargo config is rejected.
- Tree hashes include permission modes and reject broken or externally resolving symlinks. Reachable Cargo config symlinks are bound by their path, resolved path, mode, size, and content hash.
- The receipt architecture must equal the actual build-host architecture. Artifact paths resolve from the effective `CARGO_TARGET_DIR` instead of a fixed `src-tauri/target` assumption.
- macOS validation is now called by the `--execute` path. It requires a prior accepted full-tree hash for a `.app` in the effective Tauri bundle directory, validates `Info.plist` and resources, stages it outside `cwd`, and verifies the complete staged copy before execution continues.
- All three platform commands remain Tauri: DMG, NSIS, and AppImage plus Debian.

## Verification

- `npm test`: 10 passed, 0 failed.
- `npm run check`: passed.
- Direct workspace probe: Cargo resolved through `.toolchains/cargo/bin/cargo` to `.toolchains/cargo/bin/rustup`.

## Evidence boundary

Only source, documentation, and offline Node fixtures were created. No installer or Rust target was built; no dependency, package, or toolchain was downloaded; no website or runtime source was changed.
