# Rivune R3 integration receipt

Date: 2026-09-08

> **Held for provenance review:** the app build used a new
> `.toolchains/target-candidate4-r3` Cargo target cache, contrary to the
> existing R2 source-freeze requirement to use only
> `.toolchains/target-candidate4-r2`. This is a real path deviation, not a typo.
> See `CACHE_PATH_DEVIATION.md`. No further build, launch, packaging, install,
> or cache cleanup is authorized from this receipt.

## Outcome

The canonical Tauri R2 candidate now has the bounded R3 project and local-search slice integrated across the Rust host, JavaScript bridge, renderer, and tests.

Implemented behavior:

- Persist projects with a name and approved project-instructions field.
- Select an active project and create conversations in that project.
- Link or move ordinary conversations between projects.
- Reject project moves for read-only imported conversations.
- Search project names and conversation titles locally, case-insensitively, with a bounded result count.
- Admit project instructions from the conversation's linked project only; merely selecting a project does not inject its instructions into an unrelated conversation.
- Preserve clone-before-save publication, shutdown mutation guards, draft-safe navigation, uncertain-create recovery, and legacy snapshot decoding.
- Keep the renderer's project controls responsive to the projects actually present rather than assuming a fixed provider pair.

## Verification

All checks below were run against:

`qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2`

- `npm test`: 15 passed, 0 failed.
- `npm run test:wire`: passed.
- `npm run test:keyboard`: `focusPreserved: true`, no errors.
- `npm run check`: JavaScript syntax checks passed.
- Rust suite: 75 passed, 0 failed.
- Integrated browser regression: 65 checks, no errors.
- Focused project/search browser regression: 16 checks passed.
- Pinned Tauri CLI 2.11.4 app-only build: passed with locked, offline Cargo dependencies.

Two integration defects were found and corrected before the final run: the renderer test mock lacked `querySelectorAll`, and the Rust wire fixture lacked the new project schema fields.

## Built artifact

Path:

`/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r3/release/bundle/macos/Rivune.app`

Observed metadata:

- Product/display name: Rivune
- Bundle identifier: `com.rivune.desktop.development`
- Version/build: `0.0.1`
- Architecture: arm64 only
- Size: 17 MB
- Executable SHA-256: `30c11b6172f2412b097154031d5409aec0534c612096a5528672ad82b3d454b7`
- Packaged icon SHA-256: `487636baa681f9a1c61fa1d42bf7c2f85cb0db052408512a11867aa73693cd02`
- Symlinks found inside the app: none

## Release boundary

This is a development evidence bundle, not a public installer.

- It was not launched or installed.
- No real provider call or account-backed workflow was run.
- It is arm64, not universal.
- It is not Developer ID signed, notarized, or stapled.
- `codesign --verify --deep --strict` fails because the linker/ad-hoc signature has no sealed resource envelope.
- Native visual acceptance, clean-Mac installation, restart recovery, provider authentication, update delivery, and DMG acceptance remain unverified.

Do not replace the installed Rivune app or advertise this build as downloadable until those gates pass.

## Source fingerprints

Key integrated files at verification time:

- `src-tauri/src/host.rs`: `c2f42a713698d38651c565d17c3d6317f9ef31cac8a0f39cf1506e8d9f5b1643`
- `src-tauri/src/main.rs`: `67b3358967b807bc03e9e46779d60f63e71a0b2e130de9dce32bd7c752c06194`
- `src-tauri/src/lib.rs`: `beb3366980a3a8efef9873e198acbf2476d93ad9e96621636ba2c7456b508211`
- `web/core.mjs`: `5faeb2ed8d1099e6ab6dbb34d925898e9cedfb05249bc693d3df710d4a1969c6`
- `web/desktop-host.mjs`: `ea4ab2c2d02cbcd9b08987c2abdc068f522c07b3d8fd62349b16fac9bafb4e5a`
- `web/app.mjs`: `b5f45a52e0ba6ecdb45501ab3312753b227e47b96ff7a8c3ce0a9a38f175a5a8`
- `web/index.html`: `fb9a31dff825c127e749739553b292af802f76347e46f5aa8ac074debbbb2c52`
- `web/styles.css`: `5ce60e76d12d3d49dafd090d5884cf091e86bb3f82a396edb94b82d747decd21`
- `web/chrome.mjs`: `e1b3c88cd8d83b5f7055e4336fbe9b52d71733c59e79ab1bd1e113048413e446`
