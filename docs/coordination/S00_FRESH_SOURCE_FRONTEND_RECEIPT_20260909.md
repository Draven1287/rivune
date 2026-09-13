# S00 fresh-source frontend validation

Validated source export SHA-256 `ab1d34946ad5d3ba96c30726032f2c32dde12e703f4e1cbcba1c28d7a57f5518`: 93 allowlisted files copied byte-for-byte into a new temporary tree at `/private/tmp/rivune-s00-fresh-3qmgz0k4`. This is a source-export reconstruction, not a Git checkout or named reviewed commit. No source files changed during installation/checks/build. The canonical working preview and its shared dependency symlink were untouched.

## Result

- Locked frontend install passed: 51 packages installed in the temporary frontend with npm lifecycle scripts disabled and an isolated temporary cache. No global installation.
- All **118 Node unit tests passed** (`node --test tests/*.test.mjs`). No mounted browser suite, shutdown/N5 scenario or native app was run.
- `npm run build:desktop` passed, including TypeScript checking and a fresh Vite production build. The generated desktop output hashes are in `verification.json`; source files and lockfile remained byte-identical.
- Source stage hash remains unchanged. Generated dependencies/output and private validation reports are outside the export allowlist.

## Exact validation commands and environment

From the temporary `prototypes/ai-native-workspace` directory:

```sh
npm ci --ignore-scripts --no-audit --no-fund --cache /private/tmp/rivune-s00-fresh-3qmgz0k4/npm-cache --logs-dir /private/tmp/rivune-s00-fresh-3qmgz0k4/npm-logs --fetch-retries=0 --fetch-timeout=20000
node --test tests/*.test.mjs
npm run build:desktop
```

Node **22.23.1**, npm **10.9.8**, macOS arm64. Frontend declares Node >=22.13.0; installed Vite declares ^20.19.0 or >=22.12.0. The tested version satisfies both; older minimum versions were not exercised. Dependency installation was permitted network access after the sandbox DNS attempt failed; no lifecycle scripts were enabled.

The initial `npm ci --offline` using existing cache failed with ENOTCACHED for Vite metadata. A sandbox network attempt failed ENOTFOUND and npm's “Exit handler never called”; the authorized network retry succeeded. Thus this is verified online locked installation, not offline cache completeness. The lockfile has **97 dependency entries, 51 without integrity fields**. Installation passed unchanged, but immutable artifact integrity coverage and improved lock provenance remain review items; this task did not regenerate the lock.

## Rust prerequisites inspected only

Existing compiler/cache reports rustc **1.98.1** / cargo **1.98.1**, host aarch64-apple-darwin. No compiler target was created and no Rust compilation ran. `cargo metadata --locked --offline --format-version 1 --filter-platform aarch64-apple-darwin` on matching authoritative source resolved **257 package metadata entries** using the existing cache/target settings. Maximum declared rust-version in that metadata is **1.89**; this is metadata, not proof that the minimum compiler builds the entire app. Native SDK/linker/system-library readiness is untested here.

An unfiltered all-platform metadata attempt stopped at uncached `android_system_properties 0.1.6`. No Rust dependencies were downloaded. Cross-platform metadata/build closure remains unverified.

## Attribution inputs and remaining blockers

`dependency-attribution-inputs.json` inventories all npm lock entries, installed versions/license metadata/notice-file hashes, and macOS-filtered Cargo license/rust-version metadata/notice hashes. These are attribution inputs, **not legal clearance or final distribution notices**. No dependency binaries or notices were copied to the source export. Optional packages for other operating systems need separate coverage and license text review.

The selected new silver-R logo handoff is pending integration. Current old icons and galaxy assets remain local fidelity inputs only; do not treat them as final export assets. Rights/provenance, selected-logo integration, independent secret/source review, a named canonical revision, native runtime CSP/assets/retry/Dock verification, and target-platform build checks remain open. Existing staged node_modules entry must not be included in a wholesale index publication.

No Git index/commit/push, publication, provider run, native build/launch/install, N5 action or Symphony startup/configuration change occurred. Symphony monitoring status is lead-provided context; this task did not inspect or change it, and workers remain disabled per that handoff.
