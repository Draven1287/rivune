# SITE-DOWNLOAD-PREP — isolated adapter and fixture checks

Canonical website/design/build/publication are unchanged. Everything for this assignment is in this directory. Existing render_tokens, validate_release, verify_public_asset and platform controls were inspected and reused from the exact baseline copies; canonical build still refuses ready builds.

Uncovered work: download_adapter.py supplies an unavailable fallback for missing/invalid metadata, clearing installer controls/details/instructions instead of crashing or retaining a prior ready link. Non-fixture admission requires both valid release metadata and a separately supplied matching public release snapshot; no network is performed. The snapshot's real provenance/freshness and installer acceptance must be established by the release owner, not this adapter. Synthetic data enters only with explicit fixture=True, a prominent fixture banner and noindex. No real installer exists in this package.

Ready rendering reuses existing version, architecture, minimum macOS, byte size, checksum, release notes and exact DMG link fields. Seven Python tests exercise architecture variants, missing/malformed metadata, each required field/acceptance gate, unsafe URLs, synthetic/production separation, missing/mismatched public snapshots, and ready-to-invalid clearing. The non-fixture branch uses a synthetic in-memory unit-test record; it is never exported as a real ready page.

Reproducible UX defect: initial ready Mac summary includes version, OS and architecture; original platform script replaces it with generic text after Windows/Linux -> Mac. platform-summary.patch preserves the original server-rendered title/body for that round trip. test_platform.cjs runs the original and patched actual scripts in a minimal DOM: original loss reproduced, patched ready/unavailable transitions preserve summaries, only one platform is selected, Mac controls hide on Windows/Linux and return on Mac, focus moves to status. This is unit evidence, not a rendered-browser/visual pass.

Run from this directory:

```sh
python3 -m unittest -v
node test_platform.cjs
```

synthetic-ready.html and synthetic-unavailable.html are marked text-rendering fixtures using the approved template and existing stylesheet URLs. They are not standalone deployable sites; no assets/server were started for them. Do not open synthetic DMG links. Adapter patch is the new download_adapter.py; platform-summary.patch shows the minimal proposed handler delta. Baseline files are preserved for reproducibility. Canonical build/download source hashes still match the copies. A broad initial protected-file inventory stalled reading unrelated generated duplicate files and was stopped; full-tree preservation by hashing is not claimed. No canonical file writes, release metadata edits, native build/UI, network, email or publication occurred.

Next dependency for real binding: accepted installer, verified release metadata/public asset snapshot, separate canonical integration authorization and review. Coordinator/PM: this task is ready for bounded review; please assign the next task.
