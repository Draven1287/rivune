# Candidate5 macOS executor patch

This is a reviewable overlay for candidate5. It does not alter the frozen candidate5 files, the canonical Tauri project, or any built application.

## Apply and validate in a disposable copy

```sh
cp -R candidate5 /tmp/candidate5-next
patch -d /tmp/candidate5-next -p1 < candidate5-cli-executor-patch/CANDIDATE5_EXECUTOR.patch
npm --prefix /tmp/candidate5-next run check
npm --prefix /tmp/candidate5-next test
```

The patch changes only `scripts/package-local.mjs` and `tests/packaging.test.mjs`.

## Executor behavior

For macOS `build-reviewable-app`, the executor now:

- requires a centrally accepted v5 project receipt;
- validates the accepted SHA-256 of `.toolchains/tauri-cli/INSTALL_RECEIPT.json`;
- requires `rivune-workspace-tauri-cli-v1` and `tauri-cli 2.11.4`;
- verifies the npm CLI symlink, JavaScript wrapper, arm64 native binding, workspace Cargo executable, and their receipt-bound hashes;
- binds `CARGO_HOME`, `RUSTUP_HOME`, `CARGO_TARGET_DIR`, `SDKROOT`, `PATH`, and forced `CARGO_NET_OFFLINE=true` to the accepted environment;
- rejects a target inside the source tree or a target different from the accepted shared target;
- separately binds `tauri.conf.json`, `Cargo.toml`, `build.rs`, and `Cargo.lock`, in addition to the existing complete project/renderer/host/Cargo-config tree hashes;
- runs Cargo metadata with `--features custom-protocol --filter-platform aarch64-apple-darwin` on this arm64 Mac, matching the app build command;
- refuses a pre-existing `Rivune.app` output; and
- emits the installed npm CLI directly with the accepted Cargo runner:

```text
<accepted-cli>/node_modules/.bin/tauri build --runner <accepted-cargo> --features custom-protocol --bundles app -- --locked --offline
```

For `bundle-accepted-app`, it also refuses an existing DMG output before copying into the already-required empty staging directory.

## Additional accepted-project fields

The central receipt must add these fields using exact current values. This document intentionally does not label a generated example as accepted.

```json
{
  "buildEnvironment": {
    "CARGO_HOME": "<absolute workspace cargo home>",
    "RUSTUP_HOME": "<absolute workspace rustup home>",
    "CARGO_TARGET_DIR": "<absolute shared target outside source>",
    "SDKROOT": "<absolute validated SDK>",
    "PATH": "<sanitized exact PATH>",
    "CARGO_NET_OFFLINE": "true"
  },
  "metadataFeatures": ["custom-protocol"],
  "metadataFilterPlatform": "aarch64-apple-darwin",
  "sourceInputs": {
    "tauriConfigSHA256": "<64 hex>",
    "cargoManifestSHA256": "<64 hex>",
    "rustBuildScriptSHA256": "<64 hex>",
    "cargoLockSHA256": "<64 hex>"
  },
  "toolchain": {
    "tauriCliReceiptPath": "<absolute .toolchains/tauri-cli/INSTALL_RECEIPT.json>",
    "tauriCliReceiptSHA256": "<64 hex>",
    "cargoPath": "<absolute workspace cargo>",
    "cargoSHA256": "<64 hex>",
    "cargoTargetDir": "<absolute shared target outside source>"
  }
}
```

## Validation scope

Syntax checks passed. All 19 tests passed, including rejection of a changed CLI payload, wrong CLI receipt hash, wrong target, wrong source receipt, existing app output, dirty DMG staging, and wrong accepted app hash. The emitted app-only command and metadata flags are asserted exactly. Patch application to a fresh candidate5 copy was also verified.

No real Cargo metadata command, Tauri build, bundle command, UI launch, app installation, signing, notarization, or publication occurred.
