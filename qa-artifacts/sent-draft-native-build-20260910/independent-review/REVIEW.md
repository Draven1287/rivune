# Sent Draft QA native build identity review

**BOUNDED PASS.** No mismatch found in the source, artifact, configuration, or recorded preservation scope. This accepts build identity evidence, not native runtime behavior.

## Verified identity

- Source commit: `c84cc2d07fffc1050c2be52ef31b62fbd3c1181a`
- Git tree: `df3dd55c10992ee653bfb9fb82a9bd373151f7b0`
- Manifest aggregate: `ac15ded7187b8c85fbbfb600bfc196e4e55234f2d2c8132e41fbcb0584acacc8`
- Binary SHA-256: `a3ba0fd767e18033b27d2af1f03d20f1de1975bdfb4383d0b574a91376605281`
- Bundle identifier: `com.rivune.desktop.qa.sentdraft20260910`
- Bundle version: `2026091005`

All 148 source blobs match the accepted export manifest, candidate working files, and identical source-before/source-after records. Manifest bytes and aggregate recompute correctly. HEAD and tree match the accepted identity; tracked candidate state is clean with exactly the two recorded pre-existing untracked paths.

All three bundle files and all seven frontend files match their recorded hashes and exact file sets. The binary matches the claimed hash. Info.plist, Tauri override and recorded build environment agree on the QA identity and isolated frontend location. The configured `profile-reserved-not-launched` path is absent, including no dangling symlink at that path.

The preservation records contain exactly the same 522 paths and hashes before and after. Every captured path also matches its current bytes. This is verification of the recorded file scope, which includes installed/prior QA files and live source; it is not a claim about uncaptured paths, metadata, or all machine state. The driver's collection excludes symlink files.

## Build mapping and evidence limits

The retained native dependency record references each of the seven files under this build's isolated frontend directory. That path agrees with the override and receipt. The desktop entry loads the bridge before the new compiled JavaScript asset; its old Results JavaScript reference is absent. Five frontend files retain the prior Results hashes: CSS, two images, bridge and index.html. The compiled JavaScript and desktop-entry hashes differ.

This establishes recorded build-input mapping. Assets were **not extracted from the executable**, and no claim is made that this review independently proves the binary's embedded asset contents or runtime use of those assets. The build driver was inspected but not executed. The receipt records two successful commands, and the native log records a completed unoptimized dev build with debug information and one unused-variable warning.

The receipt reports no launch, installation replacement, or signing. This reviewer performed none of those operations. Profile absence supports the current reserved-profile state; it alone does not prove historical non-launch. No process inventory/control, provider execution, tests, build, publication, or source/artifact mutation was performed.

## Reproduction

Run `python3 qa-artifacts/sent-draft-native-build-20260910/independent-review/verify.py` from the workspace root. The script only reads source/artifacts and writes its own result.

Evidence: [verify.py](verify.py) and [result.json](result.json). Native sent-draft behavior, startup/instance behavior, and provider continuation remain unverified by this identity review.
