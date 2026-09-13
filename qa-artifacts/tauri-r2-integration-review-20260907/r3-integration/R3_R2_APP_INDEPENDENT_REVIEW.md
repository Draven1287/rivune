# R3 R2 produced-app independent review

Date: 2026-09-08

## Disposition

**PASS for build-receipt integrity, product identity, executable binding, and icon packaging. HOLD native acceptance on the current bundle because its resources are not sealed by a bundle-level signature. Distribution remains ineligible.**

This was a read-only produced-artifact review. No build, signing, launch, installation, DMG creation, test rerun, source edit, cache cleanup, or UI action occurred.

Reviewed bundle:

`/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r2/release/bundle/macos/Rivune.app`

## Independently verified

- The full tree hash is `15a3e72e9fe558efe3f39af37eca06aaa109f853bd1989cb7018fc3292df04fa`, exactly matching `R3_R2_APP_BUILD_RECEIPT.json`.
- The bundle contains three ordinary files and no symlinks:
  - `Contents/Info.plist`, 970 bytes, mode 0644, SHA-256 `4997caef9671137a372946094b053cd1b4a178fb2fe1783dc5bc904be605d290`.
  - `Contents/MacOS/rivune`, 15,345,600 bytes, mode 0755, SHA-256 `ec5e64fb231b3d9f0017983aff905ba4c971836e0f12510ad9214b29aa87cacb`.
  - `Contents/Resources/icon.icns`, 2,313,332 bytes, mode 0644, SHA-256 `487636baa681f9a1c61fa1d42bf7c2f85cb0db052408512a11867aa73693cd02`.
- The packaged executable is byte-identical to `.toolchains/target-candidate4-r2/release/rivune` and is a thin arm64 Mach-O.
- The plist identifies `Rivune`, executable `rivune`, development bundle identifier `com.rivune.desktop.development`, version/build `0.0.1`, and `icon.icns`.
- The icon hash matches the corrected accepted icon. Extraction showed the complete 16, 32, 64, 128, 256, 512, and 1024 pixel representations expected from the ten standard iconset entries.
- The binary links only system frameworks and libraries in the inspected load-command list; the bundle has no nested helper/framework tree to account for.
- Extended attributes are limited to `com.apple.provenance`; no quarantine attribute was present.

## Native-review blocker: incomplete ad hoc sealing

`codesign -d --verbose=4` reports an ad hoc, linker-signed Mach-O with no Team ID, no bound Info.plist, no sealed resources, and identifier `rivune-ed6f5226d88855c4`. Both strict bundle verification and local Gatekeeper assessment fail with:

`code has no resources but signature indicates they must be present`

This is consistent with a development binary that acquired the linker's executable signature but whose final `.app` tree was never signed as a bundle. It does not show product-code corruption, but it leaves the exact current app unsuitable as the accepted native-QA artifact because the plist and icon are outside a valid resource seal.

If native visual/runtime QA needs to proceed before Developer ID work, use a separate staged copy and apply one bundle-level ad hoc signature after its pre-sign tree is verified. A minimal later operator sequence is:

1. Copy this exact accepted app to a dedicated QA staging path.
2. Run `/usr/bin/codesign --force --sign - --timestamp=none <staged Rivune.app>` on that copy.
3. Require `/usr/bin/codesign --verify --deep --strict --verbose=4 <staged Rivune.app>` to pass.
4. Record the new signed tree hash, CodeDirectory/CDHash, plist values, and absence of unexpected files or symlinks.
5. Perform native acceptance only against that exact sealed copy.

The ad hoc copy would still be a local development artifact. It would not satisfy Developer ID, hardened-runtime/entitlement review, notarization, stapling, Gatekeeper distribution, clean-Mac installation, universal architecture, DMG, pilot, or publication requirements.

## Metadata correction required before distribution

The bundle plist declares `LSMinimumSystemVersion=10.13`, while `vtool -show-build` reports the arm64 executable's `LC_BUILD_VERSION minos 11.0` and SDK 27.0. Apple silicon support begins with macOS 11, so the current plist understates the binary's actual minimum by three major releases. Set the bundle minimum to the real supported deployment target and verify it on that oldest supported OS before beta packaging. Do not use the plist's 10.13 value in website or installer claims.

`LSRequiresCarbon=true` is also legacy metadata in this Tauri bundle. Remove or justify it before distribution metadata is frozen; it is not needed to establish this development build's integrity.

## Release boundary

- Architecture is arm64 only.
- Bundle identity is explicitly development-only and versioned `0.0.1`.
- No Developer ID identity, Team ID, distribution entitlements, notarization, stapling, accepted Gatekeeper result, DMG, clean-Mac result, or pilot evidence exists for this bundle.
- The older target-candidate4-r3 artifact is unrelated to this review and remains held.
- Source and test results from earlier receipts were not repeated or recharacterized as produced-app acceptance.
