# Accepted sent-draft source export — ready for identity review

Local commit `c84cc2d07fffc1050c2be52ef31b62fbd3c1181a`, parent `5fa49168a9284efeec713b7222e0e5c74be16c8a`, branch `codex/s00-source-import`; Git tree `df3dd55c10992ee653bfb9fb82a9bd373151f7b0`.

Exactly six accepted paths exported: four implementation/host-controller test paths from sent-draft-implementation-20260910/source-hashes.json and two mounted fixture/selector paths from sent-draft-mounted-20260910/source-hashes.json. All six candidate baselines matched the recorded before hashes; all six live inputs matched accepted after hashes before copying. No additional dependency or unrelated live delta was needed. Mounted UI independent bounded PASS read before export; coordinator acceptance covers the separate host/controller reviews.

The manifest now contains148 files (one new sent_draft_tests.rs). Aggregate SHA-256 `ac15ded7187b8c85fbbfb600bfc196e4e55234f2d2c8132e41fbcb0584acacc8`. Every committed blob matches manifest, candidate and stage bytes. All142 paths outside this delta retain exact parent bytes, including calm styles SHA-256 `7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643`. Manifest-addressable live source and the additional new source file remain unchanged.

Updated stage tree, ALLOWLIST.txt, SOURCE_MANIFEST.json, GIT_IMPORT_CANDIDATE.json, STATIC_CHECKS.json and VALIDATOR_HASHES.json. Tracked candidate clean; same pre-existing node_modules symlink and native gen/ directory remain untracked. No remotes configured; root workspace index unused.

Exported-composition validation: TypeScript PASS;12 focused controller tests PASS;3 selector tests PASS; static validator PASS with148 exact files and148 checked dependency references. git diff --check passed before commit. Native tests and mounted browser matrix were not repeated for this identity export.

Evidence: qa-artifacts/sent-draft-source-export-20260910/ contains accepted-delta-hashes.json, source-manifest.json, source-result.json, source.patch, identity-verification.json, live-before.json, historical stage before-images and validation logs.

Existing Rivune Results QA remains the older unlaunched build from5fa49168, binary SHA-256 `65be23620d739570e301d16706055c49584e1194c1c5918e53c78223e652f776`. All three bundle files still match its original build receipt. No native build/launch, installer, provider, publication, installed change or single-instance work performed. Stopped for independent export identity review.
