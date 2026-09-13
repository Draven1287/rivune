# Next Mac artifact — read-only preparation

## Current evidence

M4 is a debug binary in a manually assembled isolated QA wrapper, not an app produced by the Tauri bundler. BUILD_RECEIPT.json binds 59 stable canonical/local-dependency files, Cargo feature/target resolution and compiler environment. QA_WRAPPER_RECEIPT.json says signedDistribution=false. Its custom QA identifier/profile and development version must not become the public download. Native visual/recovery acceptance remains blocked by inspection timeouts.

Verified command availability: `/usr/bin/hdiutil`, `/usr/bin/codesign`, `/usr/bin/xcrun` exist, and Xcode's `notarytool` is available at version 1.1.3. Tauri's [official setup documentation](https://v2.tauri.app/start/create-project/) recommends a project-local npm CLI. The official npm package currently identifies 2.11.4 as the stable release, matching the source's Tauri 2.11 family (`tauri` 2.11.5, `tauri-build` 2.6.3, `tauri-runtime` 2.11.3 and `tauri-runtime-wry` 2.11.4).

`@tauri-apps/cli` 2.11.4 and its `@tauri-apps/cli-darwin-arm64` 2.11.4 native package are now installed only in `.toolchains/tauri-cli`, from `https://registry.npmjs.org/`, with exact versions and registry integrity values in `package-lock.json`. Installation used `--ignore-scripts --no-audit --no-fund`; no lifecycle script ran. `INSTALL_RECEIPT.json` records Node/npm versions, package integrity, wrapper/native-binding hashes and the executable symlink. `BUILD_HELP.txt` records a successful `tauri-cli 2.11.4 build --help` check, including `--bundles app`, `--runner`, forwarded arguments and `--no-sign`. This setup did not edit the canonical project and did not build, bundle, launch, install, sign or notarize Rivune.

## Minimal planned app-only command

After accepted inputs, from the canonical project directory, use the same sanitized environment as M4 (explicit workspace CARGO_HOME/RUSTUP_HOME/shared CARGO_TARGET_DIR, validated Mac SDK, no inherited Rust/Cargo overrides). With `WORKSPACE` set to the repository root, invoke the pinned npm CLI directly and explicitly name the workspace Cargo runner:

```sh
export CARGO_HOME="$WORKSPACE/.toolchains/cargo"
export RUSTUP_HOME="$WORKSPACE/.toolchains/rustup"
export CARGO_TARGET_DIR="$WORKSPACE/.toolchains/target-candidate4-r2"
export SDKROOT="/Applications/Xcode-beta.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk"
export PATH="$CARGO_HOME/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export CARGO_NET_OFFLINE=true
"$WORKSPACE/.toolchains/tauri-cli/node_modules/.bin/tauri" build \
  --runner "$CARGO_HOME/bin/cargo" \
  --bundles app \
  -- --locked --offline
```

The installed CLI's help verifies this syntax, but the build command itself has not been executed. Candidate5's existing executor still emits `cargo tauri`; update its tool resolution to call this pinned executable while retaining its receipt validation before using `--execute`. With the existing shared target directory and default release profile, expected app location is `.toolchains/target-candidate4-r2/release/bundle/macos/Rivune.app`; verify the actual output rather than assuming the path. This new release binary cannot inherit M4's debug-binary acceptance.

## Packaging changes needed before execution

- Preserve corrected M4 ICNS (487636baa681f9a1c61fa1d42bf7c2f85cb0db052408512a11867aa73693cd02). Candidate5/6 ICNS56609... contains the rejected angular mark. Their structural icon validation did not prove artwork identity. Use decoded representation review and current approved-source hashes; never recopy candidate5 icons or apply its stale identity patch.
- Candidate6 prepare-review-wrapper.py pins the wrong ICNS hash; corrected local copy is native-m4/prepare-review-wrapper.py. It is for isolated QA only, not real release packaging.
- Candidate5 metadata currently resolves without custom-protocol or platform filter; update it to match the actual build features and Mac target, as M4 does, before accepting a dependency closure. Preserve external import-preview/import-archive source inputs and applicable Cargo configs. Reject or explicitly bind symlinks and sanitize build-affecting environment. The helper's project/full-tree digest format differs from M4's manifest: do not rename M4 JSON as a v5 receipt.
- Set CARGO_TARGET_DIR explicitly; the plan-only invocation without it reports src-tauri/target, which would create a second target and select the wrong artifact location. Candidate5's plan output also displays a stale v4 gate message although loadAcceptance requires rivune-tauri-installer-input-v5.
- Decide release identifier/version before distribution; canonical com.rivune.desktop.development/version0.0.1 remains development identity. Explicit Cargo bin rivune is now present. Build the app-only bundle, then bind executable, resources, icons, Info.plist, permissions/symlinks and full-tree content to that exact artifact.

## Acceptance then DMG

Required first receipt: v5 central-accepted-stable input matching actual project/renderer/host/Cargo.lock/configs/transitive local packages/toolchain/environment and approved artwork. Recheck before and after build. Required second receipt: accepted-mac-app for the exact newly built app tree after native launch, correct Dock/tray/close controls, minimum/normal layouts, fixture import/export/cancel/failure, drafts/restart/Quit recovery, and applicable provider workflows. M4 module/browser tests are not these gates.

Candidate5 bundle-accepted-app validates a real empty staging directory, copies only the accepted app, and compares full-tree hashes. Its planned final command is:

```sh
hdiutil create -volname Rivune -srcfolder "$STAGING" -ov -format UDZO "$OUTPUT_DMG"
```

STAGING and OUTPUT_DMG must be explicit fresh absolute paths; refuse an existing output before this command because -ov allows overwrite. Do not stage the QA wrapper. Record staged/app/DMG hashes and inspect the resulting mounted content plus installation behavior before publication. No command here was executed.

## Signing and delivery state

No Developer ID-signed or notarized distribution artifact is evidenced. Direct inspection of the M4 QA wrapper reports only an automatic linker ad hoc signature (`Signature=adhoc`, no TeamIdentifier, Info.plist not bound, no sealed resources); `signedDistribution=false` is therefore accurate. Developer ID signing, hardened-runtime/entitlement decisions, notarization and stapling/Gatekeeper verification remain separate release work. User previously reported no paid Apple Developer membership; availability is not rechecked here. Do not purchase anything or describe the QA wrapper as a frictionless public Mac download. A DMG container alone does not provide signing, update readiness or provider parity. Current app-wide Constellation and native acceptance gaps also remain open.
