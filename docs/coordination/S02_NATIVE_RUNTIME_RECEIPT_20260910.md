# S02 isolated native runtime receipt

Accepted source: `dd9cfedd6130c4704e5addeb28307a12b20c341f`; source tree SHA256 `70d4cc948d720c5c6c336706a06c8431d3abbf27cd43b0cb53faf9d6bcd6f766`. Source files were verified against all 125 manifest entries before build. No product source changes. Built the accepted candidate React desktop output with TypeScript/Vite and its matching desktop-host.mjs, then compiled native custom-protocol rivune with the existing shared Cargo target/cache. No new dev server or dependency cache.

## Exact instance and provenance

- PID 64247, executable `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/s02-native-runtime-20260910/Rivune S02 QA.app/Contents/MacOS/rivune`.
- Binary SHA256 `45f3e373f34213a0d25e51050aa18d301b50c00b10dd60e465aecc71b88575bb`; rechecked after interactions.
- Bundle ID `com.rivune.desktop.qa.s0220260910`; window `Rivune S02 QA · isolated test data`; configured 1200x900.
- Isolated data `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/s02-native-runtime-20260910/profile`. RIVUNE_ISOLATED_PROFILE_DIR passed explicitly at launch; matching Info.plist LSEnvironment retained for this sole test bundle.
- Inert metadata route `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/s02-native-runtime-20260910/inert-routes/codex`; plain non-provider text with executable mode for discovery, never invoked. PATH starts with this directory. Discovery also listed an existing Claude route; it was neither selected nor configured.
- Existing installed `/Applications/Rivune.app/Contents/MacOS/Rivune`, PID1250, was left untouched. Process inspection after verification showed one isolated test process and no provider child.
- Full effective override, embedded asset/bridge hashes, profile path and binary hash are in qa-artifacts/s02-native-runtime-20260910/provenance.json; process.json records launch identity. Native/frontend logs in the same directory. No app installation, signing, publication or replacement.

## Actual native results

1. CUA selected the exact isolated bundle. Native AX reported tauri://localhost, host workspace, empty provider selection, and disabled Send. This was the actual native webview, not the browser harness. The compiled custom-protocol output uses desktop-entry.mjs to import the matching bridge before the React entry.
2. Settings opened. Screenshot visibly showed a centered contained X with focus ring. Escape dismissed it. Reopening and clicking Close settings also dismissed it. This is visual native confirmation, not a new subpixel center measurement or whole-layout approval.
3. Find installed providers read local metadata. Selected only the inert Codex test route. Save as workspace default completed through native persistent operation commands; visible result was Default connection saved. Sign-in remained Not verified and Response test Not tested.
4. Entered an isolated unsent draft, pinned the conversation to the configured route, then explicitly selected Follow workspace default. Both displayed success and preserved the same draft. No Send action, provider execution or dirty-draft quit path was used.
5. Read the isolated persisted snapshot after interactions: configuration operation applied and acknowledged, draft revision2, null inherited selection, exact test draft retained, six committed snapshots and zero runs. saved-state-evidence.json records the synthetic state. Runtime stderr/stdout log is empty.

The first native CUA inspection took about467 seconds despite a30-second requested timeout; subsequent interactions returned promptly. This is an inspection-tool latency observation, not an observed app startup failure. Build emitted the existing unused-variable warning in constellation_projection.rs; no new runtime errors were observed.

## Scope and remaining dependencies

This completes the authorized startup, matching build/bridge, Settings and safe configuration/binding checks. No concrete defect required a fix. One isolated test instance remains open for review, with its draft saved. No second instance/app copy/server was launched. Native restart/power-loss, real AI discovery/auth/inference, Hello/follow-up timing, installed/release readiness, and N5 dirty-draft quit/failed-flush flows were not exercised. Prior synthetic recovery tests remain separate evidence.

Local receipt is ready for independent review. Private QA forwarding remains excluded; no cross-task send was attempted.
