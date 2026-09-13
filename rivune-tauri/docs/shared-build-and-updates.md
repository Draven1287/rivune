# One interface, two desktop hosts

The approved Stillwater workspace remains in `src` and `public`. SwiftUI owns the Mac app lifecycle and native menu commands. `SharedWorkspace: NSViewRepresentable` embeds the same bundled workspace that Tauri loads from `dist`. This is a SwiftUI application with a shared web workspace, not a second implementation of every screen in SwiftUI. The historical neighboring `Rivune.xcodeproj` is not the new host and is not silently rewritten or migrated.

## Edit and build

`package.json` is the application version source. Tauri reads it; Swift's bundle versions are generated from it. Increment it before a release. Ordinary features belong in `src`; host-only features belong in `src-tauri` or `macos-preview`.

```sh
npm run build:desktop -- swift
npm run build:desktop -- tauri
npm run build:desktop -- both
```

Swift/both require macOS. Tauri requires Rust and the OS build prerequisites. Development Tauri builds produce a debug executable; release builds produce platform installers. Windows and Linux must be built and smoke-tested on their supported environments.

The orchestrator builds Vite once, generates `dist/bundle-manifest.json`, verifies the source digest and every output asset, and packages the selected hosts from that same `dist`. The Swift host validates the bundled hashes and version again before rendering. `--skip-web-build` refuses a stale bundle. Source changes do not hot-update an already packaged app: rerun this command. Website deployment is separate too.

The manifest is a parity/integrity check, not an alternative to code signing. Developer ID/Sparkle and Tauri's update signatures establish release authenticity.

## Updates for installed apps

- Swift Mac: Sparkle 2, a native **Check for Updates…** command, and Settings → Updates. Sparkle handles the signed update, consent and restart UI. Automatic checking and installation start disabled.
- Tauri: official updater/process plugins, Settings → Updates, check → explicit **Install and restart**, download progress, signature verification, then restart. Active replies and draft conflicts block installation. Failed downloads/installations require a new check; no unsigned fallback or downgrade override.
- Browser: no installer updater. Rebuild/redeploy the website separately. Development settings show updates unavailable.

`release/config.json` contains only public configuration. Both updater feeds are unset initially. Put the actual HTTPS Tauri JSON feed and Sparkle appcast URL there, plus their respective public keys. They are different formats and are not interchangeable. Never put private keys in this file, frontend code, or Git. Beta and stable builds must use separate feeds if both channels are shipped.

A release is deliberately blocked until real endpoints, valid public-key shapes and a beta/stable channel are provided. No placeholder domain is contacted. Configure the initial app before distributing it; copies without a configured updater need one manual reinstall to gain updates.

## Release procedure

1. Choose the production application identities and hosting location before the first public release. The Swift host currently retains `com.rivune.sharedpreview` to preserve existing local preview chats; Tauri retains `ai.rivune.desktop`. Do not change identities or the `rivune://app` origin after shipping without a tested data migration. The two hosts have separate data stores and must never receive each other's update archives.
2. Generate and securely back up separate Sparkle and Tauri signing keys using the official tools. Store only public keys in configuration. Protect signing secrets in Keychain/CI. Losing updater keys can prevent future updates.
3. Set the new package version and public release config. Run tests, then `npm run build:desktop -- swift --release` on Mac or `npm run build:desktop -- tauri --release` on the target OS. `RIVUNE_SIGNING_IDENTITY` must be a Developer ID Application identity for Swift. Tauri also needs its documented Apple/Windows signing environment and `TAURI_SIGNING_PRIVATE_KEY`.
4. Swift: with an existing `RIVUNE_NOTARY_PROFILE`, run `bash macos-preview/script/package-release.sh`. It verifies the app matches the source, requires Developer ID signing, submits to Apple, staples/assesses the app, prepares a DMG and Sparkle ZIP/appcast. It uses Sparkle's signing key in Keychain. It does not upload to the public feed. This release-only path needs a real certificate/key/feed and has not been exercised end to end.
5. Tauri emits signed updater artifacts and `.sig` files. Publish version-specific URLs and generate the standard JSON feed containing version, release notes, OS/architecture, artifact URL and signature contents. The installer and feed must describe the same artifact. Do not point a Tauri app at the Sparkle appcast or vice versa.
6. On a test machine, install the previous signed release, create a draft and archived chat, upgrade to the candidate, verify saved data and core flows, test interrupted download and offline handling, and verify the wrong-key update is refused. Test Intel/Apple Silicon/Windows architectures you advertise. Promote feeds only after this succeeds.
7. Upload immutable artifacts first, then replace the live feed last. Keep previous artifacts. Roll back an issue by shipping a corrected higher version, not by disabling version/signature checks. Website download buttons should identify the platform/architecture and match that release.

There is no paid AI call in this build/update flow. Real AI reply integration, original Swift-store migration, native Liquid Glass within web controls, App Store delivery, and public release acceptance are separate work.

References: [Tauri updater](https://v2.tauri.app/plugin/updater/), [Sparkle setup](https://sparkle-project.org/documentation/), [Sparkle publishing](https://sparkle-project.org/documentation/publishing/).
