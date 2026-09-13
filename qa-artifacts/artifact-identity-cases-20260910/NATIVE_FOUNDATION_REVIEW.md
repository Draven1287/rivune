# Frozen durable artifact native foundation — bounded source review

2026-09-10. PASS within this native source scope: no new actionable defect found in materialization validation, commit-gated publication, migration retention or public artifact redaction. This is not full foundation acceptance: the two earlier TypeScript adapter/parser defects await a corrected receipt and targeted regression closure; reliability owns additional fault execution. Immutable owned text is now an explicitly accepted design choice and is no longer an open contract question.

## Exact boundary and method

Captured seven native/bridge source and test paths listed in foundation source-hashes.json; every captured hash matched. Verified each existing file's baseline hash against candidate commit 5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b. Retained baseline copies, current copies, hashes and full scoped-source.patch under native-foundation/. Read the foundation receipt and relevant native delta/callers. End drift: none. The patch's TypeScript portions were not rerun or accepted in this review.

No production edits or native compilation/execution. Inspected owner's host-tests.log reporting 9/9 synthetic tests passed; this is owner evidence, not independently executed fault proof. No persistence test patch duplicates were created.

## Validation and immutable identity

saved_artifacts.rs validate requires supported migration/schema state, bounded count/text, exact Rust UTF-8 byte length and SHA-256, recomputed host tuple ID, known conversation/run with matching admitted identities, correct frozen provider mapping and host-generated labels. Final records forbid member/private attempt fields; member records require bounded private identities and a real admitted member index. Duplicate IDs fail. Supersession may reference only an earlier record in the same run/conversation/origin, excluding self/forward/cyclic links.

Materialization validates existing records before generating additions, derives only completed/preserved final answers and bounded independent Council member projections, then validates the resulting candidate. Content/attempt changes produce a distinct tuple-derived ID; repeated materialization does not append a duplicate. Existing owned versions and their supersession links are retained instead of being rebound to later run text or current configured providers. No renderer-supplied file paths, managed output or creation command is present.

Private invocation/attempt IDs are part of version identity and come from restored internal contribution bindings during creation. Validation binds owned records to their admitted run/member but deliberately does not compare old owned text with the current mutable result slot, consistent with the accepted version-retention decision. Hashes are integrity checks, not authorization against an attacker able to replace an entire trusted profile and recompute all records.

## Publication and recovery ordering

host.rs save(:1218-1244) clones its input into a private candidate, materializes/validates artifacts there, invokes existing write/file-sync/rename/directory-sync persistence, and assigns the enriched candidate back only on success. On error, the caller's candidate contains no newly materialized artifacts. Success-path callers publish that updated candidate; error paths that retain run/recovery metadata cannot accidentally publish the new artifact collection from the inner failed clone.

Direct terminal completion retains the terminal-persistence recovery marker on both pre- and post-rename uncertainty. Reconcile recognizes that marker and saves/materializes again before acceptance, preserving deterministic artifact identity. The post-rename branch retains completed status rather than falsely converting a committed final to a failed result. Council checkpoint saves use the same helper for initial and retry attempts; if both fail, retained session/run recovery metadata may be visible but new artifact records are not. Existing artifacts remain available. This is the source-ordering assessment; exact fault outcomes remain the reliability lane.

Migration materializes only after existing run/session validation and interrupted-run handling. It persists the repaired private workspace before returning HostState. Unsupported/corrupt records cause an error; they are not silently deleted. Missing/zero schema migrates to one, and retained deterministic records make repeat opening idempotent. Snapshot-generation pruning does not remove artifact versions from the retained current workspace; all retained versions are carried in each generation.

## Public boundary

Public snapshot serialization replaces private artifact records with validated Summary structs and removes artifactSchemaVersion. Summary has no text, invocationID, attemptID, storage/profile path or receipts. The snapshot also removes private constellation checkpoint fields through the existing projection. inspect_artifact validates its exact deny-unknown-fields request and the workspace, then matches artifact/conversation/run/digest before constructing the public Inspection struct. The public inspection includes only the explicit identity, metadata and text fields. desktop-host.mjs only forwards to this command; no creation, file I/O or execution command is introduced.

## Remaining dependencies

1. Corrected adapter/parser receipt and exact hashes, then recheck only shared-request mutation and invalid-surrogate regressions against a fresh bounded copy.
2. Reliability review's fault evidence and any resulting frozen native delta, before full foundation acceptance.
3. Pane/lifecycle wiring and rendered review remain separate, as do export/native packaging/provider/runtime claims.

## Captured hashes

- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs: `6540006813844f12b0cc745a6c1817d9d8273deb5dc5c6af802449ba341f2ce1`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/lib.rs: `e390e64b5e648dc9283a8b7a91bb4a4a518904a762aaf4c049652668766a5e0a`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/main.rs: `b5dc504c4f85b1a07876f9e0228cc146a25889f3918184d9dcc7f2bb5b6de061`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/saved_artifacts.rs: `47b1bc148c98a08da697e02c5bde89a890338274a955e2a458ac6a2122003e25`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/saved_artifact_tests.rs: `df571ea4e22b17b8e4ed1baa85debc2a6efee2a9d97e744eb43182b1ce879395`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/constellation_acceptance_tests.rs: `5457ffa30cd3dd6c23890e3aae9c6a34878a08ffc11dccdb6d1a17769aa8ccbc`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/desktop-host.mjs: `d5aea200cdbfd5e26f63467261a2c11c6b07c40a00d9d9dc6ea52b97b8f18dc7`

## Subsequent provenance findings

Lead reports checkpoint-binding and unlabeled-truncation gaps in ARTIFACT_PROVENANCE_IMPLEMENTATION_REVIEW_20260910.md, assigned to the builder. This earlier bounded review does not establish those semantics or grant full native-foundation acceptance. TypeScript defects are separately closed in TS_CORRECTION_CLOSURE.md.
