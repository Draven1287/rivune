# Rivune Tauri identity and M1 packaging handoff

Date: 2026-09-08

## Applied bounded correction

The native rejection boundary was recorded before these edits. The frozen `native-m1/Rivune M1 QA.app`, its profile, and its evidence remain unchanged.

The reserved canonical lane now uses the approved silver R/Milky Way assets:

- `src-tauri/icons/icon.png` is the accepted 512px PNG derivative.
- `src-tauri/icons/icon.ico` is the accepted six-size Windows derivative.
- `src-tauri/icons/icon.icns` is the accepted macOS icon reused byte-for-byte.
- `src-tauri/tauri.conf.json` explicitly lists those three icons and `dmg`, `nsis`, `appimage`, and `deb` targets.
- `src-tauri/src/tray.rs` retains the existing tray lifecycle API and obtains the packaged default window icon. It explicitly keeps the approved artwork in color instead of applying a macOS template mask.

The canonical file hashes and the preserved M1 hashes are in `VALIDATION.json`. Actual Dock and menu-bar legibility remain pending the next owner-controlled native launch; asset inspection alone is not visual acceptance.

`TAURI_IDENTITY_CORRECTION.patch` is the source-only patch prepared before the lease release. `assets/` contains the exact bytes copied to the canonical icon directory. `scripts/prepare-review-wrapper.py` creates a new isolated QA wrapper with `CFBundleIconFile=AppIcon.icns`, copies the accepted ICNS, emits hashes, and refuses to overwrite an existing app. It was syntax/CLI checked but not run, so it did not create or modify a wrapper.

Candidate5's older `TAURI_IDENTITY.patch` is not consumable by `patch` or `git apply` because its hunk headers are bare `@@` lines without ranges. The candidate6 patch has valid unified-diff ranges and passed an isolated dry-run/application check.

## M1 provenance finding

M1's `SOURCE_BEFORE.json` exactly matches the current 37 canonical `web` and `src-tauri` files at the time of this review, but `build_exact.py` scoped that manifest to those two directories. `Cargo.toml` compiles two external path dependencies:

- `qa-artifacts/tauri-migration-audit-20260907/import-preview`
- `qa-artifacts/tauri-migration-audit-20260907/import-archive`

Their earlier crate receipts bind their own test executions and currently reported source files still match those receipts. They do not prove which dependency-tree bytes the later M1 binary compiled: the M1 preflight and build receipt never hashed the external roots, and a current match cannot retroactively establish no edit-and-revert between those events.

Current candidate5 full-tree observations, for planning only, are `import-preview` `c875d2895c6fc439d194bd5a2989bc6330a0a43e79c57f5ef32fc1f906e194c5` and `import-archive` `b56ca8d0e712b11fc918c9dc71ea09cb34379e2811a9cedeb8221b488ac2afc2`. These include each root's existing `target` tree because candidate5 hashes the entire external root, so they are volatile and must be regenerated at freeze time. With `CARGO_HOME` set to the workspace `.toolchains/cargo`, no applicable parent/root Cargo config files were found; candidate5's empty config-set hash is `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`. This is current observation, not M1 proof.

For the next build, central must issue a `rivune-tauri-installer-input-v5` `central-accepted-stable` receipt immediately before execution. It must bind the complete project, renderer, host, reachable `Cargo.lock`, every applicable Cargo config under the exact build environment, and both external local dependency roots discovered by real `cargo metadata --locked --offline`. The build should recheck all hashes before execution and record them again after the build.

## Remaining distribution blockers

1. The frozen M1 artifact is a rejected, manually assembled debug QA wrapper. Its Info.plist has no `CFBundleIconFile`, it contains no icon resource, its display name is `Rivune M1 QA`, its executable is `rivune-desktop`, and its receipt says `signedDistribution: false`. It must not be packaged or published.
2. The canonical Cargo package remains `rivune-desktop` and has no explicit `[[bin]]` named `rivune`. This lane was explicitly barred from Cargo edits. The runtime owner must integrate that accepted identity change before candidate5's product gate can pass.
3. The canonical identifier is still `com.rivune.desktop.development` and version is `0.0.1`. A release identifier/version decision and receipt are required before distribution.
4. No v5 central acceptance receipt binds the corrected source and full local dependency closure. M1's 37-file receipt is insufficient for the next build.
5. No real Tauri `Rivune.app` produced from the corrected source has a full-tree acceptance receipt. The next macOS sequence is: build an app-only bundle from the accepted project, native-review that exact app, then issue an `accepted-mac-app` receipt and create the DMG from a verified empty staging directory.
6. Dock and tray identity must be observed in the running corrected Tauri app at normal and minimum supported window sizes. The user rejected M1 visually, so source hashes and icon containers cannot substitute for rendered approval.
7. Signing, notarization, Gatekeeper/install behavior, Windows NSIS, and Linux AppImage/deb artifacts remain unverified. Each platform must build on its matching host from a platform-specific accepted receipt.

No build, launch, package, installed-app action, provider call, or frozen-M1 mutation occurred in this lane.
