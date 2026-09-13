# Candidate 2 report

Date: 2026-09-07

## Corrected boundaries

1. Windows executable discovery now expands `PATHEXT`, uses Windows `;` path separation, and matches filenames case-insensitively. Module entry detection uses `pathToFileURL(resolve(process.argv[1]))`.
2. Acceptance is tied to SHA-256 values calculated from the actual renderer and host directory trees. Directory inventory, file sizes and contents, and symlink targets are covered. The package command receives and reports an explicit absolute `cwd`.
3. A staged macOS `.app` must exactly match the complete source bundle. The gate explicitly requires `Contents/Info.plist` and `Contents/Resources`; the identity comparison covers all remaining files and symlinks too.
4. Every platform plan now uses `cargo tauri build`: DMG on macOS, NSIS on Windows, and AppImage plus Debian on Linux.

## Evidence boundary

This artifact contains source and offline Node fixture tests only. It does not build, download, install, package, sign, notarize, publish, or alter a Rust target. Passing tests establish the gate logic; they do not establish a usable installer or operating-system acceptance.

## Verification

- `npm test`: 7 passed, 0 failed.
- `npm run check`: passed.
- The fixtures exercised Windows `PATHEXT` lookup, URL-safe entry detection, tree mutation rejection, explicit working-directory binding, complete macOS bundle copy identity, and incomplete-bundle rejection.
