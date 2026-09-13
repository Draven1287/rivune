# Accepted Results source export — ready for identity review

Local candidate commit `5fa49168a9284efeec713b7222e0e5c74be16c8a`, parent `5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b`, branch `codex/s00-source-import`. Git tree `22d9ca92334b250506cf14cf2b066a8acf2392ff`. Exactly23 changed files:13 durable foundation,2 connection-copy files containing3 strings,8 corrected Results integration files. Six files are new; manifest now147 files.

Both narrow correction reviews were read and accepted. Every candidate delta baseline matched its accepted baseline hash before export, including HostWorkspace. Every live source matched its latest accepted hash (correction over integration where applicable). Therefore no additional dependency, startup, sent-draft or unrelated live HostWorkspace delta was needed. The entire23-file composition is byte-identical to those accepted source versions.

Candidate calm styles remain `7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643`. All124 other candidate files retain their parent bytes. Excluded live styles, ChatPanel and Sidebar were not copied or edited. No dependency changes, artifact rebuilds or prior artifact writes occurred.

Stage tree, ALLOWLIST.txt, SOURCE_MANIFEST.json, GIT_IMPORT_CANDIDATE.json, STATIC_CHECKS.json and VALIDATOR_HASHES.json updated. Manifest tree SHA-256 `90a35cef0ec595e0c7050dbef6d42b8219a0409507df167134daa06bec4b4319`. All147 committed blobs match manifest and stage bytes. Tracked candidate is clean; only the two previously present untracked node_modules symlink and native gen directory remain. No remotes configured, no push or publication.

## Bounded exported-composition validation
- Candidate TypeScript check PASS.
- Candidate saved-artifact contract/controller/adapter checks7/7 PASS.
- Candidate connection-copy and scenario selector checks6/6 PASS.
- Static export validator PASS, including147 exact files,148 dependency references, direct dependency lock integrity and native output wiring. This is source validation, not compilation of Rust or runtime/native proof.
- git diff --check PASS before commit. No repeated browser matrix.

Exact evidence: qa-artifacts/accepted-results-source-export-20260910/ contains accepted-delta-hashes.json, source-manifest.json, source-result.json, source.patch, identity-verification.json, validation logs and historical export bookkeeping before-images.

No native build, launch, new dependency, installed-app change, provider call, remote or publication. Stopped for independent export identity review. Sent-draft/startup fixes remain later.
