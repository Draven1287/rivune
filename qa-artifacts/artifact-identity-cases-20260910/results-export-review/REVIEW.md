# Accepted Results export — independent identity review

**PASS — source export identity.** No mismatch found within the assigned scope. This result clears the source identity gate for the builder's isolated native build; it does not establish native runtime, rendered UI, installer, or release acceptance.

## Frozen identity

- Commit: `5fa49168a9284efeec713b7222e0e5c74be16c8a`
- Parent: `5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b`
- Git tree: `22d9ca92334b250506cf14cf2b066a8acf2392ff`
- Manifest aggregate SHA-256: `90a35cef0ec595e0c7050dbef6d42b8219a0409507df167134daa06bec4b4319`

## Independently verified

The accepted map reconstructs exactly as 13 foundation paths, two connection-copy paths, and eight Results paths with the six subsequent corrections overlaid. All 23 accepted hashes match the live accepted inputs and committed blobs. Their baseline hashes match the parent, with six additions and 17 modifications.

All 147 committed blobs match manifest hashes and byte lengths, the candidate working files, and the staged tree. The allowlist contains exactly the same paths. All 124 paths outside the accepted delta are byte-identical to the parent. The manifest count, total bytes, and canonical aggregate recompute correctly.

The accepted calm styles remain SHA-256 `7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643`. Previously excluded live deltas remain excluded, and their recorded live hashes still match. No additional live source dependency was imported in this delta.

Stage validator hashes match their files, and the stage static-check report matches the export evidence. Local import metadata agrees with the commit, parent, tree, aggregate, and delta paths. HEAD and branch match the import record; no remotes are configured. The two pre-existing untracked paths are exactly those recorded: frontend `node_modules` and the native candidate's `src-tauri/gen/` directory.

## Evidence and limits

The independent assertions and result are retained in [verify.py](verify.py) and [result.json](result.json). The producer's receipt reports TypeScript, seven artifact tests, six guidance/selector tests, and static composition checks passing. Test-log tails were inspected; these suites were not independently rerun for this identity review.

The accepted foundation includes the provenance corrections documented in `docs/coordination/ARTIFACT_PROVENANCE_CLOSURE_20260910.md`; the Results input includes the correction reviewed in the sibling `results-correction-review/REVIEW.md`. Identity acceptance applies to these corrected bytes. Existing asset/notice holds remain in force.

Production and candidate sources were read only. No browser or native tests, build, launch, provider action, publication, or Git mutation was performed.
