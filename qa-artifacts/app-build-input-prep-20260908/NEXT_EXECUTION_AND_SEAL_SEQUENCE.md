# Exact review and packaging sequence

Status: preparation only. No command below has been executed.

## 1. Central receipt release

Central independently revalidates `NEXT_SOURCE_TOOL_FREEZE_MANIFEST.json`, copies `NEXT_EXECUTOR_ACCEPTED_PROJECT_REVIEW.json` to a separately named receipt, changes only its status to `central-accepted-stable`, records the new receipt SHA-256, and explicitly releases the build. The review receipt intentionally fails the executor status guard.

## 2. Exact build and qualification invocation

```sh
/Users/Aaravshah/.local/bin/node \
  "/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/app-build-input-prep-20260908/next-executor-proposal/scripts/package-local.mjs" \
  --platform macos \
  --phase build-reviewable-app \
  --cwd "/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2" \
  --receipt "/ABSOLUTE/PATH/TO/CENTRAL_ACCEPTED_PROJECT_RECEIPT.json" \
  --execute
```

The executor preflights all aggregate, explicit source, toolchain, metadata, external dependency, policy, and fresh-path bindings. Its internal build command is the accepted Tauri CLI `build --runner <accepted cargo> --features custom-protocol --bundles app -- --locked --offline`. The expected app is `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r2/release/bundle/macos/Rivune.app`, with bundle identifier `com.rivune.desktop.development`, executable `rivune`, version `0.0.1`, arm64 architecture, and minimum macOS `11.0`.

Immediately after the build, the executor collects `plutil`, `file`, `vtool -show-build`, `codesign -d --verbose=4`, and `codesign --verify --deep --strict --verbose=4` evidence, then runs the accepted validator through the path-safe writer. Native-review qualification requires a valid bundle-level seal and matching metadata. Build success alone is insufficient.

## 3. Seal boundary

This executor never signs or mutates the app. If Tauri produces an unsealed or linker-only bundle, validation fails and the evidence/report paths become consumed. Stop there. A later QA ad hoc sealing lane would require separate explicit authorization, a frozen unsealed bundle hash, a fresh external staging directory, a defined codesign command, a new sealed-bundle hash, and new fresh evidence/report paths. That lane is not currently accepted and must not be improvised. Developer ID signing and notarization remain separate release gates.

## 4. DMG staging after native-review acceptance

Only after central accepts the exact qualified `.app` path and full-tree hash in an `accepted-mac-app` receipt may the existing executor run `bundle-accepted-app`. It copies the exact app into a fresh empty external staging root, proves the copy is tree-identical, and then invokes `hdiutil`. The resulting DMG remains outside distribution approval until its own integrity, signing, notarization, stapling, Gatekeeper, clean-machine, and user-acceptance gates pass.
