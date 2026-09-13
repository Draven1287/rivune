# R3 corrected R2 executor V2 preflight

Date: 2026-09-08

Disposition: **validation refused; no build executed**.

## What was corrected

- The accepted two-file executor V2 overlay was applied to a dedicated
  packaging execution workspace, not to the canonical product source.
- Full Cargo metadata was run with the same `custom-protocol` feature and
  `aarch64-apple-darwin` platform as the prospective app build. The invalid V1
  `--no-deps` shortcut was removed.
- Metadata resolved 257 packages and both external local path dependencies.
- The reachable Cargo configuration set is explicitly empty (`[]`) and its
  executor-computed empty-set hash is
  `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`.
- A validator-ready v5 input is preserved at
  `R3_R2_EXECUTOR_V2_INPUT.json`; SHA-256
  `fc39381a2f64dc4873161f05ad910661316c7a39b2f6a17c25cfacfb67658d5e`.

## Actual validator result

The concrete V2 `validateExecution` runner was invoked without `--execute` and
refused before any build command:

```text
Error: Cargo package/binary name must be rivune
```

Canonical `src-tauri/Cargo.toml` currently declares:

```toml
[package]
name = "rivune-desktop"

[[bin]]
name = "rivune"
```

The accepted executor's `identity-core.mjs` requires the package name itself to
be exactly `rivune`, in addition to the explicit `rivune` binary. Therefore an
actual passing validation cannot be produced from the frozen canonical source.
Changing the manifest or weakening the accepted executor would violate the
current source/executor review boundary, so neither was done.

## Concrete paths and hashes

Dedicated execution workspace:

`/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/tauri-r2-integration-review-20260907/r3-integration/executor-v2-workspace`

Validator runner:

`executor-v2-workspace/scripts/validate-r3-v5-preflight.mjs`

Validator command:

```text
/Users/Aaravshah/.local/bin/node executor-v2-workspace/scripts/validate-r3-v5-preflight.mjs
```

Key runner hashes:

- Patched `scripts/package-local.mjs`:
  `9b37974db1ffd7b9128cd182db67a5533977ab6a3a0c57d5e3ca8e142e61c523`
- Unmodified identity guard `scripts/identity-core.mjs`:
  `1acfcc59b51aee7542ddd81951b8b15b2c538634ab29e5156f78f2e690563b2b`
- `scripts/packaging-core.mjs`:
  `d1e6e81b788bff26a662c0bd577f2d9aedf51ef5be3578a41792168f803076c3`
- Receipt generator:
  `bbb9fb6793a7e74a1e23908c0174bd463a6d7d406f05ba96f590d296ad9db8fd`
- Validate-only runner:
  `f4f52743c3635d409dc16933221bd0714f46973e3e18704711737f2ef022813e`

## Preserved boundaries

- Canonical product source remained frozen.
- `CARGO_TARGET_DIR` remained exactly `target-candidate4-r2` during metadata.
- The R2 release app output remains absent.
- The held R3-cache app remains untouched.
- Only the existing R2 and R3 target directories exist; no third target was
  created.
- No compile, build runner, launch, installation, packaging, signing,
  notarization, deletion, or publication occurred.

Central review must now choose one explicit correction before a build can be
released: accept and review a canonical Cargo package rename to `rivune`, or
review a new executor identity rule that deliberately allows the package
`rivune-desktop` with the explicit `rivune` binary. The old held app must not be
relabeled either way.
