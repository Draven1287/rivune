# R3 build cache path deviation

Date: 2026-09-08

Status: paused for review. No build, launch, packaging, installation, deletion,
or cache consolidation has occurred since the deviation was identified.

## What happened

The successful R3 app-only build used:

`CARGO_TARGET_DIR=/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r3`

The accepted R2 source freeze explicitly required:

`CARGO_TARGET_DIR=/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r2`

This was not a receipt typo or symlink. The R3 directory is a separate 2.2 GB
Cargo cache created on 2026-09-08. The preserved R2 directory is about 5.0 GB
and was not deleted or replaced.

The reason was an incorrect implementation choice: I created an isolated target
directory for the R3 integration so its release output would not mix with older
R2 artifacts. That isolation preference should not have overridden the explicit
single-target constraint in `R2_SOURCE_FREEZE.md`. The deviation was accidental
with respect to the requirement, even though the path itself was intentionally
typed.

## Effective build invocation

The following is the exact effective command/environment reconstructed from the
tool invocation. A separate pre-build command receipt was not written, which is
itself a provenance gap.

```sh
env \
  CARGO_HOME='/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/cargo' \
  RUSTUP_HOME='/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/rustup' \
  CARGO_TARGET_DIR='/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r3' \
  SDKROOT='/Applications/Xcode-beta.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk' \
  PATH='/Users/Aaravshah/.local/bin:/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin' \
  CARGO_NET_OFFLINE=true \
  '/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/tauri-cli/node_modules/.bin/tauri' \
  build \
  --runner '/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/cargo/bin/cargo' \
  --bundles app \
  -- \
  --locked \
  --offline
```

Working directory:

`/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2`

Toolchain observed after the build without rebuilding:

- Tauri CLI 2.11.4
- Cargo 1.98.1 (`797e8a9bc`, 2026-08-05)
- rustc 1.98.1 (`48a229cea`, 2026-09-01), aarch64-apple-darwin
- Node v22.23.1

## Source and dependency provenance

No complete full-tree source/dependency manifest was captured immediately before
the build. It would be misleading to invent one after the fact. Available
pre-build evidence is therefore partial:

- `candidate4-runtime-r2/R2_SOURCE_FREEZE.md` specifies the required R2 target
  and previously froze Cargo.lock as
  `265fb445b6724ed2476435dd9c45a4dab46ac063c7ec5f3be5dadab8be3a3513`.
- `r3-renderer/SOURCE_RECEIPT_FINAL_V2.json` freezes the five renderer/test files
  released before combined validation. Their hashes match the post-build source
  hashes in `R3_INTEGRATION_RECEIPT.md`.
- The post-build `src-tauri/Cargo.lock` hash remains
  `265fb445b6724ed2476435dd9c45a4dab46ac063c7ec5f3be5dadab8be3a3513`.
- Post-build manifest/config hashes are:
  - `src-tauri/Cargo.toml`: `9a650f2e067d17d0ff735d4801a2fac804f5caf56ae58bdf1ff0187fe1fe3f92`
  - `package.json`: `c6c714d897f06cadac58b8d4361831a8380797d6061e317087652b79f250ddf2`
  - `src-tauri/tauri.conf.json`: `2572bd9c641c2357640a867366c14272a3568830d248169899a96ac942a87991`

The Cargo-generated dependency file at
`.toolchains/target-candidate4-r3/release/rivune.d` names the canonical R2
candidate source files and local import crates used by the release executable.
Cargo.lock binds the resolved Rust dependency graph, but the missing complete
pre-build source manifest means the built artifact remains held rather than
accepted.

## App full-tree receipt

The complete app bundle contains three ordinary files and no symlinks:

- `Contents/MacOS/rivune`
  - SHA-256 `30c11b6172f2412b097154031d5409aec0534c612096a5528672ad82b3d454b7`
- `Contents/Resources/icon.icns`
  - SHA-256 `487636baa681f9a1c61fa1d42bf7c2f85cb0db052408512a11867aa73693cd02`
- `Contents/Info.plist`
  - SHA-256 `4997caef9671137a372946094b053cd1b4a178fb2fe1783dc5bc904be605d290`

App path:

`/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r3/release/bundle/macos/Rivune.app`

The app is 17 MB, arm64 only, development-identified, and fails strict bundle
signature verification. It is preserved solely as evidence.

## Minimal recoverable plan

1. Preserve the 17 MB app and both receipts exactly where they are.
2. Preserve both target caches; do not delete or move either without a separate,
   explicit cleanup decision.
3. Treat the R3 app as held evidence, not as an accepted replacement or release.
4. If a future build is authorized, first capture a full source/dependency/tool
   manifest, then return `CARGO_TARGET_DIR` to `target-candidate4-r2` and verify it
   again after the build.
5. Consider cache consolidation only as a separate recoverable cleanup task;
   it is not authorized by this review.
