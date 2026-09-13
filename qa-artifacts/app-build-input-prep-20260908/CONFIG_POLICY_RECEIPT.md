# Canonical macOS development-floor receipt

The first leased canonical edit added only `bundle.macOS.minimumSystemVersion: "11.0"` to `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/tauri.conf.json`.

- Before SHA-256: `2572bd9c641c2357640a867366c14272a3568830d248169899a96ac942a87991`
- After SHA-256: `ba521035106e1f6ad4d198f4a854ef1d9649b41b8cd3ee1fc3656c4ac41cf44e`
- Development identity preserved: `Rivune`, `com.rivune.desktop.development`, version `0.0.1`, binary `rivune`.
- Architecture policy: `arm64`.
- Meaning: development build floor selected by central coordination. This is not tested macOS 11 compatibility and is not a public support statement.

Pinned local Tauri evidence:

- Schema: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/tauri-cli/node_modules/@tauri-apps/cli/config.schema.json`; SHA-256 `923a41898c978c93616b9c1b6ae4d346f5586987459cfa877bacea21e7c85f1a`. Its MacConfig allows a string or null and documents that the value controls `LSMinimumSystemVersion` and the deployment target.
- Native CLI: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/tauri-cli/node_modules/@tauri-apps/cli-darwin-arm64/cli.darwin-arm64.node`; SHA-256 `a4537b8db7de55e5c988d47c6c0be8d345178a9ae7d42a87da1112b5322d83ee`.

`PROPOSED_RECEIPT_FRAGMENT.json` now binds the same 11.0 floor, arm64 architecture, development identity, validator/helper/interpreter/system-tool hashes, and the post-edit config hash. It intentionally leaves the external output root, evidence/report paths, final source set, candidate bundle hash, and seal status unresolved until central freeze.

Static tests verify the exact full config shape, schema/receipt agreement, and local Carbon-key origin. No build, Cargo command, bundle mutation, signing, app launch, provider call, or public change occurred.

## Conventional macOS plist merge input

A second narrow lease adds `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/Info.plist` with exactly one key: `LSRequiresCarbon = false` (SHA-256 `068c5b4e0124c0f7f36411cc56c6b60e30fb1be2b1de0cf9aff66daa5a632a0f`). The config remains at exact SHA-256 `ba521035106e1f6ad4d198f4a854ef1d9649b41b8cd3ee1fc3656c4ac41cf44e` and does not need an `infoPlist` reference: the pinned Tauri schema explicitly documents automatic discovery of `Info.plist` beside `tauri.conf.json`. This is an accepted build input expectation; only a future fresh bundle can prove the merged generated value.
