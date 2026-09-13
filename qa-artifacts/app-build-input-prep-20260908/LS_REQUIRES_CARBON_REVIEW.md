# LSRequiresCarbon local origin review

## Observation

The existing generated app bundles in `.toolchains/target-candidate4-r2` and `.toolchains/target-candidate4-r3` contain:

- `LSMinimumSystemVersion = 10.13`
- `LSRequiresCarbon = true`

These are historical generated outputs. They were inspected only and do not prove compatibility with macOS 10.13 or 11.0.

`LSRequiresCarbon` is absent from the candidate Tauri config and there is no candidate `src-tauri/Info.plist`. The literal key is present in the pinned Tauri CLI native executable at `.toolchains/tauri-cli/node_modules/@tauri-apps/cli-darwin-arm64/cli.darwin-arm64.node`. The same executable contains the macOS bundler's default Info.plist key set. This binds the observed key to pinned bundler generation rather than current Rivune source configuration.

## Implemented merge input

The approved narrow fix adds `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/Info.plist` with exactly one property, `LSRequiresCarbon = false` (SHA-256 `068c5b4e0124c0f7f36411cc56c6b60e30fb1be2b1de0cf9aff66daa5a632a0f`). No `bundle.macOS.infoPlist` reference was added because the pinned local schema says Tauri automatically looks for `Info.plist` beside the configuration file.

This proves the intended merge input only. The accepted validator treats `false` as a warning and does not let that warning alone block native-review qualification; `true` remains an error. Acceptance of the future candidate still requires a fresh build to show `LSRequiresCarbon = false` in its generated `Contents/Info.plist`, followed by the existing metadata and seal checks. No generated bundle was mutated, built, or signed here.
