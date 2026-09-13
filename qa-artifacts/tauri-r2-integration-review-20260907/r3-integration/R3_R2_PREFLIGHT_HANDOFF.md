# R3 corrected R2 app-only preflight handoff

Date: 2026-09-08

Disposition: **superseded V1**. The actual executor V2 validation and its
identity refusal are recorded in `R3_R2_PREFLIGHT_V2.md`.

The current canonical Tauri inputs are frozen in
`PREBUILD_INPUT_MANIFEST.sha256`. The machine-readable environment, toolchain,
identity, exact executor argument vector, and validation results are in
`R3_R2_APP_PREFLIGHT.json`.

Verified without compiling:

- `CARGO_TARGET_DIR` is exactly the existing workspace
  `.toolchains/target-candidate4-r2` directory and is outside the source tree.
- Sanitized, locked, offline Cargo metadata succeeds with
  `custom-protocol` for `aarch64-apple-darwin` and reports that exact R2 target.
- The pinned Tauri 2.11.4 receipt, symlink target, JavaScript wrapper, executed
  `main.js`, arm64 native binding, workspace Cargo executable, SDK, lockfile,
  build script, config, corrected icon, renderer, host, tests, and local path
  dependencies are hash-bound.
- The expected R2 release `Rivune.app` path does not exist, so a later approved
  executor run can enforce output freshness.
- Identity is internally consistent but explicitly developmental: Rivune,
  `com.rivune.desktop.development`, version `0.0.1`.
- The previously produced R3-cache app remains preserved and held; it is not
  relabeled by this preflight.

The approved executor command to run only after central release is:

```text
/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/tauri-cli/node_modules/.bin/tauri build --runner /Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/cargo/bin/cargo --features custom-protocol --bundles app -- --locked --offline
```

It must run from the canonical candidate directory with the exact sanitized
environment recorded in `R3_R2_APP_PREFLIGHT.json`. A runner must re-hash every
input immediately before execution, refuse any mismatch or pre-existing output,
and re-hash the input tree and produced full app tree afterward.

No build, app launch, installation, DMG creation, signing, notarization,
publication, deletion, or extra target directory occurred during this preflight.
