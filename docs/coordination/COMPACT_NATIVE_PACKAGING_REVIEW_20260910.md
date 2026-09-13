# Compact native packaging — independent review

2026-09-10. Verdict: bounded PASS for source identity and manually staged local review packaging. No blocking mismatch found. This is not installer, signing, launch, runtime or visual acceptance. Code-review skill used to structure provenance and correctness checks; no production changes or native execution.

## Independently checked

- Candidate HEAD `3bc19ce0bd7e7a9a1f59dbf11c16a35f0d089f8d`, Git tree `9c588772e018a7b1cbbd1f742497f4c69c9ae71f`. All 141 current source files and committed blobs match the accepted manifest. Recomputed path-NUL-hash-newline aggregate: `2fd881e5fe5f5579f0e1d4b7f7a094b894ba7a6d2453afb21d1fab9d8fe7c46e`. Tracked state clean; only recorded node_modules and gen untracked entries remain.
- All three actual bundle files and seven staged frontend files match build-receipt.json. Executable is Mach-O arm64, LC_BUILD_VERSION minimum macOS 11.0, consistent with plist. Binary SHA-256 `efbd99a1bfb9b149057874f942aa07f72ebbcd9e3ccee41628429a925575850a`.
- Info.plist SHA-256 `24ad1071559b9ba7bcad3d8a52167f05650d765a574e86b47592db3f4058a083`; executable rivune, APPL, identity `com.rivune.desktop.qa.compact20260910`, name Rivune Compact QA, version 0.0.1 / 2026091002. LSEnvironment contains only reserved isolated profile and /usr/bin:/bin PATH. Reserved profile does not exist at inspection. This does not prove LaunchServices environment delivery.
- icon.icns SHA-256 `487636baa681f9a1c61fa1d42bf7c2f85cb0db052408512a11867aa73693cd02`, byte-identical to accepted icon; plist references it correctly. No rendered icon judgment made.
- Absolute frontendDist override points to this review's isolated frontend-dist. Saved compiler dependency record SHA-256 `6680e9959a47e38118903c4768c993bb8da0d15aa919c2f1e16aa07a18b4206f` matches packaging receipt and references all seven exact isolated paths. This supports compile-time inputs, not runtime asset loading.
- desktop-entry imports desktop-host before the application JS. Generated bridge and accepted native bridge both hash `0d23ea7fb3bdc3cb521994fad953ca568f0e73ef88ac46ef5fdd2fa1a722c17f`. Inspected accepted build-desktop script, generated HTML and base Tauri config: browser CSP removed intentionally; native CSP retained and override does not replace security settings. No preview server used in this build path.
- Builder logs show frontend compilation (54 modules) and native dev build completion; existing unused-variable warning only. These are inspected builder-run evidence, not independently rerun builds.
- source-before/source-after are equal. preserved-before/preserved-after are equal for the recorded installed/S02 binaries, plists and profile files. Process preservation is attributed to builder's recorded checks, not independently resampled. No assertion that historical receipts can prove absence of every transient process or write.

## Remaining boundaries

Artifact is `qa-artifacts/compact-native-build-20260910/Rivune Compact QA.app`, manually staged from a debug/dev executable. No distributable installer, developer signing/notarization or runtime acceptance is established. No launch, restart, process modification, installed replacement, provider call, signing, new server or publication was performed by this review. Binary dependency evidence does not replace a rendered webview/IPC test.

Exact-export styles differ from previously accepted live preview styles per the independent export review; rendered exact-export acceptance remains separate. Native startup, Dock/focus, list/viewer/composer interactions, profile isolation at launch and lifecycle/restart remain separately authorized gates. Asset/distribution-notice holds recorded in the export review remain unchanged. No new source/package blocker identified within this narrow assignment.
