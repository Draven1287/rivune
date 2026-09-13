# Startup and connection handoff source export — ready for identity review

Local commit `2ea834a1e2385c34b8f516854b5317c6a08a0607`, parent `c84cc2d07fffc1050c2be52ef31b62fbd3c1181a`, branch `codex/s00-source-import`. Git tree `9da0c197e0b5d81a0ee96398eda787984f0150fe`;148-file manifest aggregate `171ccf39b8cbee0189968505950f1085e12d5b261ecfeb61813e2e878d2c7f28`.

Exactly six accepted paths:

- prototypes/ai-native-workspace/src/host/HostWorkspace.tsx
- prototypes/ai-native-workspace/src/host/ProviderSetup.tsx
- prototypes/ai-native-workspace/tests/hostRenderer.test.tsx
- prototypes/ai-native-workspace/tests/rendererScenarios.ts
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/main.rs

Accepted startup2 input is startup-contention-correction-20260910/source-hashes.json, including the P1 Ready/setup boundary correction, not the rejected earlier main implementation. Accepted handoff4 input is connection-handoff-implementation-20260910/source-hashes.json. Handoff UI/state reviews read; coordinator's startup closure authorization applied. Every candidate baseline matched the recorded before hash, and every live input matched its accepted after hash before copying. No extra dependency or unrelated live delta was required.

All148 committed Git blobs, candidate files, staged tree and manifest hashes agree. All142 other paths retain exact parent bytes, including calm styles `7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643`. All148 manifest-addressable live files match the before-export capture. Excluded live style/component changes were not copied. Tracked candidate is clean with the same two pre-existing untracked node_modules/gen paths; no remotes configured. Root workspace index was not used.

Stage tree, ALLOWLIST.txt, SOURCE_MANIFEST.json, GIT_IMPORT_CANDIDATE.json, STATIC_CHECKS.json and VALIDATOR_HASHES.json updated. TypeScript PASS;3 selector tests PASS; static export validation PASS with148 exact files and148 dependency references. git diff --check PASS before commit. Accepted native/browser matrices were not repeated.

Both Results QA and Sent Draft QA bundle files match their original build receipts. Sent Draft QA remains an older unlaunched c84cc2d build with binary SHA-256 `a3ba0fd767e18033b27d2af1f03d20f1de1975bdfb4383d0b574a91376605281`; it does not contain this export. No installed app, profile or prior artifact writes were performed; this export only mutated the isolated candidate and stage bookkeeping plus new evidence files.

Evidence: qa-artifacts/startup-handoff-source-export-20260910/accepted-delta-hashes.json, source-manifest.json, source-result.json, source.patch, identity-verification.json, live-before.json, stage before-images and validation logs.

No native build/launch, process control, provider, new server/dependency, installer or publication. Stopped for independent export identity review. Source identity and prior bounded tests do not establish native runtime exit/handoff behavior.
