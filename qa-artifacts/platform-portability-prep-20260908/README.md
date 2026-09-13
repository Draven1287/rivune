# Rivune provider discovery portability patch

## Scope

This isolated candidate fixes one Windows executable-discovery mismatch in the current R2 host source. Provider validation admits direct `.exe` and `.com` executables, while discovery currently checks only `.exe`. The patch makes discovery consider both safe direct formats.

The candidate does not modify the source tree. It does not run a provider, access an account, build the native app, add a Cargo cache, or admit shell wrappers.

## Behavior

- PATH directory order remains primary.
- Within one Windows directory, `.exe` is preferred over `.com`.
- If an earlier PATH directory contains only `.com`, it wins over an `.exe` in a later directory.
- `.cmd`, `.bat`, and `.ps1` remain undiscoverable.
- Paths containing spaces remain structured `PathBuf` values.
- POSIX discovery and its executable-bit check are unchanged.

## Proposed integration

Review and apply `HOST_RS.patch` only if the recorded source SHA-256 still matches:

`e942af4a13457debf9285b1a8c42aaefe6a978a8cd3dbf1d8c9e994a27c7caf2`

The patch adds a private platform selector, a platform-injected discovery helper, and two unit tests to:

`qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs`

Because the runtime is moving, this artifact must not be auto-applied to a later source snapshot. Regenerate or review the hunk if the hash differs.

After this package was completed, the shared source continued moving. The generator now refuses any hash mismatch and reports the observed hash, so it cannot silently rewrite the reviewed patch. The patch remains bound to the earlier hash above.

## Validation and limits

`git apply --check HOST_RS.patch` passes against the recorded source. A deterministic Python filesystem oracle passes three matching scenarios without launching any executable. The included Rust tests are compile-ready in the host module, but they were not compiled here because the workspace has only Rustup shims and no installed/default Rust toolchain. Installing one would violate this task's no-toolchain-download and no-Cargo-cache boundary.

The Windows cases are simulated filesystem-selection tests executed on macOS. They do not prove native Windows filesystem behavior, process creation, cancellation, packaging, signing, or installation. After integration, run the focused Rust tests in the established source environment, then run them on native Windows before claiming platform readiness.

## Files

- `HOST_RS.patch` — exact proposed host integration.
- `build_artifact.py` — deterministic patch generator that refuses an unexpected source body.
- `verify_behavior.py` — independent filesystem-selection oracle; it never executes the created files.
- `VALIDATION.json` — structured result and proof boundary.
- `MANIFEST.sha256` — artifact hashes.
