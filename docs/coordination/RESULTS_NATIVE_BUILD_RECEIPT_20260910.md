# Results QA — unlaunched debug build

Built from exact accepted local commit `5fa49168a9284efeec713b7222e0e5c74be16c8a`, Git tree `22d9ca92334b250506cf14cf2b066a8acf2392ff`, manifest aggregate `90a35cef0ec595e0c7050dbef6d42b8219a0409507df167134daa06bec4b4319`. All147 source files verified before and after; source unchanged. Independent export PASS read before build.

Artifact: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/results-native-build-20260910/Rivune Results QA.app`. Binary SHA-256 `65be23620d739570e301d16706055c49584e1194c1c5918e53c78223e652f776`. Bundle ID `com.rivune.desktop.qa.results20260910`; build version2026091004. Reserved isolated profile `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/results-native-build-20260910/profile-reserved-not-launched` is configured and does not exist. Bundle has not been launched.

Frontend desktop build passed, followed by one Cargo `build --locked --offline --features custom-protocol --bin rivune` using existing shared toolchain/cache. This is a dev/debug build, unoptimized with debug information; not an installer or release. Native log reports one existing unused-variable warning in model_capabilities.rs. No unrelated tests rebuilt or rerun.

Seven generated frontend asset hashes and three bundle-file hashes recorded in frontend-assets.json/build-receipt.json. Bridge bytes match accepted desktop-host.mjs; native dependency record references the new isolated frontend path. Galaxy and icon image assets match prior reading QA frontend. CSS hash `eccf56420f56ceeef6163a3462a4b7cb0d7f3a666c561d36cbe7a11daff6fd66`; JS hash `ce74803d71b11368f402d3098b6c7eedbe177d9321acf30d8b4f7e553983a84c`. Candidate calm source styles remain `7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643`.

Preservation comparison covers 518 files: installed Rivune bundle, discovered prior QA app bundles/profile directories, and manifest-addressable live source. All captured files and path sets are unchanged. Candidate tracked tree remains clean with the same two pre-existing untracked paths. Prior QA artifacts were not overwritten. Process inventory was denied by the sandbox before compilation; no process-control commands, launch or restart were issued. No claim of independently enumerated running-process identity is made.

Evidence in qa-artifacts/results-native-build-20260910/: build.py, source-before/after.json, source-manifest.json, frontend/native build logs, tauri-override.json, build-receipt.json, frontend-assets.json, native-asset-dependencies.d, preserved-before/after.json and identity-verification.json.

No launch, provider operation, installed replacement, signing/notarization action, new server/dependency, installer or publication. Stopped for independent artifact identity review. Runtime acceptance remains untested for this bundle.
