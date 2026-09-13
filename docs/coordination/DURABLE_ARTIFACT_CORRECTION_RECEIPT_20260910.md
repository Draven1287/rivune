# Durable artifact adapter correction and immediate-reopen tests

Ready for independent review. Corrected both reproduced P2s from `qa-artifacts/artifact-identity-cases-20260910/REVIEW.md`. The accepted immutable owned-text foundation remains unchanged; only available/plainText is supported. No pane, export, commit, packaging, native app launch/restart, provider, server or managed-file operation occurred.

## Corrections

The typed adapter retains its privately parsed expected request and passes a separate flat copy to the bridge. A bridge can mutate its input across await without changing validation's expected artifact/conversation/run/hash. The controller has the same separation for custom adapters. Regression tests require rejection of a mutated B response for request A, including a controller case where both A and B are otherwise known saved artifacts. The caller's original request remains unchanged.

Inspection now requires a lossless UTF-8 encode/decode round trip before hashing. `TextDecoder` uses `ignoreBOM:true` to preserve a leading BOM. Lone high/low surrogates and malformed sequences are rejected rather than repaired to U+FFFD. Valid surrogate pairs, combining characters, a literal U+FFFD, BOM and exact whitespace remain unchanged. Both review defect characterizations are now desired-outcome regressions in the owned tests; the reviewer's captured package was not edited.

## Persistence patch coordination and results

Coordinated with the reliability worker before editing saved_artifact_tests.rs. Reviewed PATCH_INTEGRATION.md, p03-p05-p06.patch and additional_tests.rs, then appended the provided tests exactly once into the owned module. No concurrent/duplicate worker native run occurred.

P03, P05 and P06 each exercise AfterWrite, AfterSync and AfterRename: direct terminal immediate reopen, member checkpoint double-fault immediate reopen, and terminal Council checkpoint/run/final-artifact atomicity. Raw latest committed JSON is checked before reconcile or any recovery save. Pending files are excluded. Tests preserve earlier full member records and compare reopened vectors with committed vectors. P05/P06 inject two faults to exhaust the existing checkpoint retry. These are synthetic helper-driven tests; no provider process or application runs.

Validation: 12 focused Rust host tests PASS (the prior 9 plus 3 new fault matrices), 7 focused TypeScript parser/adapter/controller tests PASS, and typecheck PASS. Native execution used the single existing Cargo target/cache. The only warning is the pre-existing unused `d` in constellation_projection.rs. No additional native production changes were necessary for the immediate-reopen cases.

## Frozen review inputs

The original 13-file boundary is preserved. Seven of those paths changed in this correction: contracts.ts, tauriAdapter.ts, workspaceController.ts, their three owned TypeScript test files, and saved_artifact_tests.rs. Native production source, live UI/styles, and all 141 candidate files at 5d71ab remain unchanged.

Evidence directory: `qa-artifacts/durable-artifact-foundation-20260910/`.
- `source-hashes.json`: updated exact hashes for all 13 paths.
- `source-hashes-before-adapter-correction.json`: previous foundation hashes.
- `scoped-source.patch`: full current 13-file delta against accepted candidate.
- `correction-result.json`: correction paths, patch provenance hashes and result counts.
- `host-tests.log`: final 12 host tests, including P03/P05/P06.
- `renderer-tests-correction.log`: final 7 desired-outcome tests.
- `typecheck-correction.log`: successful TypeScript check.
- `preservation.json`: reverified preserved UI/styles and candidate identity.

Core corrected SHA256 values:
- contracts.ts: `668780d2fa0d9ba7ff32750b1547a9c7f52a3fa6e80227e7fd863779329eb992`
- tauriAdapter.ts: `eef4490bf8194325247533cf8f6f18e6c5c4d3c19622b4f61e37b6ff8f813e36`
- workspaceController.ts: `240221a02c3294ad7dbcaee75fab35caca5dfeb8608baaeb86ecaa17d98cae7d`
- saved_artifact_tests.rs: `ebff3cf1f6bd232ecac5f8d35dc5600ae318a820cde88950ca02b65939992c83`

This supersedes the earlier foundation receipt's test counts and current hash references. Stop point remains independent review before pane wiring, export or build.
