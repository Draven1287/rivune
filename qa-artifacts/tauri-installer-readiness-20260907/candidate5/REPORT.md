# Candidate 5 review response

Date: 2026-09-07

## Transitive Cargo input binding

The regex-only external path check is removed. The gate now invokes the selected Cargo proxy with:

`cargo metadata --locked --offline --format-version 1 --manifest-path <cwd>/src-tauri/Cargo.toml`

It requires the accepted root manifest in the returned graph, selects every `source: null` package, canonicalizes each manifest, and hashes each transitive package root outside `cwd`. The receipt must provide the exact canonical root/hash set. Added, removed, redirected, or mutated local dependencies fail validation. Registry packages remain bound through the required lockfile and the already hashed reachable Cargo configuration.

Build plans append `-- --locked --offline`; execution also sets `CARGO_NET_OFFLINE=true`. The fixtures assert both metadata flags and the environment guard.

## Product identity

The approved Rivune galaxy/R master was converted directly into native PNG and ICO derivatives. The existing verified ICNS was reused byte-for-byte. Stronger validation rejects header-only ICO and ICNS placeholders by walking their actual directory/chunk entries and checking payload boundaries. PNG validation requires a complete chunk stream with IHDR, nonempty IDAT, and terminal IEND.

The identity gate now requires an explicit `[[bin]]` named `rivune`; matching an unrelated Cargo `name` line is insufficient. The prepared runtime patch changes the package name, adds that binary declaration, lists the three native icon files, and keeps explicit DMG, NSIS, AppImage, and Debian targets.

## Verification boundary

- `npm test`: 13 passed, 0 failed.
- `npm run check`: passed.
- Direct derivative inspection passed: 512×512 PNG with complete chunk stream, six-entry ICO with bounded image payloads, and 98,123-byte ICNS with native image chunks.
- No real Cargo metadata command, compile, package, installer, network call, runtime edit, website edit, or publication occurred.
