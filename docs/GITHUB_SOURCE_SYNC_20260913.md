# GitHub source synchronization — September 13, 2026

This update imports the current local Rivune code into the existing GitHub history, based on main commit `201cb07`. The local source folder had an unborn Git branch and no configured remote, so synchronization was prepared in a separate clean clone without changing the local index or files.

## Included source

- Current `rivune-tauri/` frontend, native shell and macOS preview sources, tests, public assets, lockfiles, and development updater configuration.
- `prototypes/ai-native-workspace/` React implementation and its supporting historical Tauri runtime under `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/`.
- Current SwiftUI app and tests, website workspace, brand assets, scripts, documentation, third-party notices, and local development tooling.
- Historical QA source/configuration and Markdown handoffs. These are historical material, not alternative accepted releases.

Dependencies, build output, installers, signing material, local credentials, toolchains, logs, and most QA captures/receipt data are excluded. The website's newer GitHub publication/SEO changes are preserved in `pages-site/build.py`, `test_site.py`, `README.md`, and `PUBLICATION_HANDOFF.md`; the older local copies were not used to roll them back. No site deployment or application release was performed.

## Validation of this source snapshot

- Clean `npm ci`, frontend build, and all 88 tests passed for `rivune-tauri/`.
- Clean dependency installation and production build passed for the React prototype.
- Source exporter: 20 tests passed.
- DMG release guards: 7 tests passed; these do not create or validate a release installer.
- Gitleaks scan reviewed: detected strings were versioned storage-key names, not credentials.
- Imported files were compared with the working source after preparation; no drift was found, excluding the intentional README/ignore edits and preserved GitHub website files.

Native compilation, real provider calls, multi-provider execution, signing, packaging, and end-to-end release acceptance were not performed for this source synchronization. Existing source contains historical whitespace warnings; this import preserves it instead of mass-formatting old snapshots.

See `rivune-tauri/docs/quiet-preview.md` and `rivune-tauri/docs/claude-local-chat.md` for previously recorded runtime evidence. Those checkpoints remain dated evidence rather than a fresh live-provider test.
