# Durable saved-result host foundation — bounded review receipt

Implemented in canonical workspace source against accepted candidate `5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b`. This is an unexported 13-file scoped delta ready for independent review. The candidate's 141 files and HEAD remain unchanged. No pane wiring, native app launch/restart, provider execution, managed-file admission/I/O, dependency installation, package build, installed-app change or publication.

## Persistence decision and contract deviations

Inspected `team_strategy.rs`: retry changes the failed invocation's attempt identity; successful contributions are append-only and remain present. Direct retries have a new request identity. Although current successful member slots remain stable, a mutable run/projection reference would tie inspection integrity to future projection/retry changes. The implementation therefore persists exact immutable UTF-8 text with each artifact version in the same workspace JSON generation. Private invocation/attempt IDs bind member results; public metadata never contains them. This adds storage duplication, deliberately avoiding filesystem storage machinery or a second transaction.

`artifactSchemaVersion` migrates absent/zero to 1. Each record has a strict persisted summary plus owned text and private optional invocation/attempt identity. IDs are SHA-256 of an unambiguous versioned JSON tuple containing conversation, request, origin/member/provider, private attempt binding and exact content digest. Same text in another conversation/run produces another identity. Repeated materialization is idempotent; later same-slot output appends with a backward supersession link. Existing records are validated and retained, not resolved against/replaced by current output slots or configured providers.

This slice only supports `plainText` and `available` owned text. There is no disabled managed-file variant, path/key field, preview executor, or speculative file machinery. Corrupt/unknown persisted records fail open/inspection closed rather than silently repairing/removing a row; unavailable-file rows belong to the deferred file-storage slice. Bounds are 400,000 records and 2MiB exact UTF-8 per final, matching the existing final capture limit; member text uses the existing bounded public Council projection (24KiB/item,96KiB total). A bound failure rejects persistence rather than truncating a final answer. Older profiles migrate only existing completed/preserved final answers and retained independent member results; failed/cancelled runs do not synthesize a final answer.

## Atomicity and read boundary

Host save now materializes/validates into a private candidate and publishes the enriched workspace only after the existing write/sync/rename/directory-sync transaction succeeds. Every caller uses the mutable save result, including terminal/checkpoint persistence and recovery. A rejected or unresolved save exposes no newly created artifact. Pre-existing artifacts remain available. Direct after-rename uncertainty now retains the existing terminal-persistence recovery marker even when the answer is already committed, so reconciliation confirms and exposes the artifact exactly once rather than returning success without materializing it. Original terminal status remains completed for the post-rename case; pre-rename failures retain the prior failed/uncertain behavior.

Public snapshots replace private records with metadata summaries and remove the migration marker. `inspect_artifact({request:{artifactID,conversationID,requestID,expectedSHA256}})` uses a deny-unknown-fields Rust request and exact ASCII/hash validation; wrong tuple, invalid binding or corrupt content returns a generic error without content. The JavaScript bridge forwards that request, and the typed adapter validates a plain data object before invocation. Strict response parsing checks exact keys, identity, schema, preview/availability enums, byte length and recomputed SHA-256 before returning text. The controller exposes a read-only inspection method with no draft save, submission or state mutation and rejects results after disposal or loss of the referenced metadata. Future pane selection/conversation lifecycle remains unwired; existing SavedResult dialog remains unchanged.

## Validation

- 9 focused Rust host tests PASS, using synthetic in-memory Council outcomes and temporary profiles; no child/provider execution. Covers old-field migration and repeat reopen, corrupted persisted record rejection, final Unicode bytes/hash, cross-conversation identity rejection, metadata redaction, idempotent identity and supersession validation, terminal pre-rename failure, write/sync/rename fault atomicity, post-rename reconciliation/restart, rejected Council checkpoint save, successful retained same-provider member results, failed-attempt retry, cancellation preservation, and completed Council member/final separation.
- 4 focused TypeScript parser/adapter/controller tests PASS. Covers private/extra field rejection, wrong provenance/tuple/version/hash/length/size, getter-free plain request validation, inert exact script-tag/Unicode text, bridge receiver and invocation count, read-only controller state and disposed late response rejection.
- `npm run typecheck` PASS. `node --check` on desktop-host.mjs PASS. Existing unrelated functional audits were not rerun. New Rust files formatted after semantic checks; no functional changes from formatting. The existing unused `d` warning in constellation_projection.rs remains.

Initial test preparation exposed invalid synthetic Council proposal casing/routes and a parallel temporary-directory collision; fixtures were corrected. The final recorded host run passes all 9 tests. No runtime/provider acceptance is claimed.

## Exact review inputs

`qa-artifacts/durable-artifact-foundation-20260910/source-hashes.json` records all 13 source paths with candidate baseline SHA256 and current SHA256. `scoped-source.patch` is the full deliberately bounded delta; `preservation.json` verifies candidate identity and unchanged live styles, HostWorkspace and SavedResult. `host-tests.log`, `renderer-tests.log`, `typecheck.log` and `run-host-tests.py` provide validation evidence. The 4 pre-existing acceptance-test callsite edits only pass a mutable workspace to the revised save helper.

Stop point: independent foundation review before pane wiring, source export/commit or native packaging. Future file storage, result-list presentation, unavailable states and selection/focus behavior remain deferred.

## Follow-up correction

See DURABLE_ARTIFACT_CORRECTION_RECEIPT_20260910.md for the reviewed adapter-defect corrections, immediate-reopen matrices, updated hashes and final 12-host/7-TypeScript test results. The 13-file source boundary remains unchanged.

## Provenance correction

DURABLE_ARTIFACT_PROVENANCE_CORRECTION_RECEIPT_20260910.md supersedes the original member projection/storage and final private-binding descriptions: full member bytes and exact successful checkpoint producer bindings are now required. Final native result:19 focused tests pass, including the persistence matrices.
