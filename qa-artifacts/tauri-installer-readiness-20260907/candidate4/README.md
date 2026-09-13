# Rivune installer readiness candidate 4

Candidate 4 is an offline packaging gate and identity handoff. It does not build an installer.

- Cargo/rustup proxies are validated through their resolved targets but invoked through the original `cargo` path.
- macOS uses two explicit phases: Tauri builds a reviewable `.app`; after separate acceptance, `hdiutil` consumes only its hash-verified staging directory. The bundling phase does not rerun Cargo.
- Cargo path dependencies outside `cwd` fail closed. Project, renderer, host, lockfile, build script, `src-tauri/.cargo`, ancestor Cargo config, OS, architecture, and effective target directory are bound.
- Product validation requires `Rivune` for the product, window, and `rivune` Cargo binary; explicit DMG/NSIS/AppImage/deb targets; and valid ICNS/ICO/PNG files.

The included identity patch is intentionally unapplied because an approved Windows ICO derivative is not present. See `IDENTITY_ASSET_MANIFEST.md`.

Run `npm test` and `npm run check`. Tests use temporary fixtures and a recording runner; they do not invoke Cargo, Tauri, hdiutil, a package manager, or the network.
