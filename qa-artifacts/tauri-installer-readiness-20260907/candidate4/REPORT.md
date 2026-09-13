# Candidate 4 review response

Date: 2026-09-07

## Packaging corrections

1. `findCommandEvidence` validates the resolved executable while preserving its invocation path. The real workspace link is now recorded as `.../.toolchains/cargo/bin/cargo` resolving to `.../.toolchains/cargo/bin/rustup`; invoking the resolved target would select rustup behavior.
2. macOS is split into `build-reviewable-app` and `bundle-accepted-app`. The latter verifies a prior full-app hash, copies into an empty external staging directory, and passes that exact directory to `hdiutil`. A recording-runner test proves the command uses staging and contains no Cargo rebuild.
3. External Cargo path dependencies fail closed. This means the current runtime with `../../../tauri-migration-audit-20260907/...` dependencies is honestly blocked until those dependencies are moved into the accepted tree or separately bound by a later reviewed design.
4. `src-tauri/.cargo` config is now included alongside working-directory ancestors and Cargo home. Lockfile and build-script requirements remain explicit.

## Product identity

The offline gate now rejects generic product/binary names, empty icons, the `targets: "all"` shorthand, missing icon files, and malformed PNG/ICO/ICNS containers. It requires Rivune naming and explicit native formats for DMG, Windows NSIS, Linux AppImage, and Debian output.

The inspected runtime has the correct visible product/window name, but its Cargo package is `rivune-desktop`, `bundle.icon` is empty, and its local PNG is a different V mark. The approved galaxy/R master PNG and matching existing ICNS are recorded by hash. No approved ICO was found, so the identity patch remains prepared and unapplied.

## Verification

- `npm test`: 12 passed, 0 failed.
- `npm run check`: passed.
- Existing approved assets passed direct native-format inspection: 1024×1024 PNG and 98,123-byte ICNS.
- No packaging, Rust target, dependency download, runtime edit, website edit, or borrowed Traycer code/branding occurred.
