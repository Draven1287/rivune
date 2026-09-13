# Durable artifact checkpoint-provenance correction

Implemented both P1 corrections and the full-member-result P2 from ARTIFACT_PROVENANCE_IMPLEMENTATION_REVIEW_20260910.md. Ready for independent review. The accepted immutable owned-text design remains; no separate version layer, public private-binding fields, managed-file capability or UI wiring was added.

## Binding and exact content

Validation now restores exactly one saved Constellation checkpoint for the artifact's request. A member artifact must match exactly one successful IndependentAnswer contribution by request, checkpoint input digest, admitted member, role, invocation and attempt. Its complete owned UTF-8 bytes must equal that contribution's text. Syntax and recomputed deterministic IDs alone no longer establish provenance. Missing, foreign, cross-member, cross-role and failed-attempt substitutions fail closed.

A Council final requires Council delivery, exact run.answer == delivery.text == successful Integrate contribution text, and the frozen lead member's successful Integrate binding. Its private invocation and attempt IDs are included in its artifact identity and revalidated on inspection/open. Direct finals retain absent engine bindings because the direct request ID is their execution identity. Current native Constellation admission is explicitly Council; this change does not add another strategy.

Materialization now copies full accepted IndependentAnswer contribution text. The engine already limits each contribution to 128KiB, within the existing 2MiB artifact limit. There is no silent 24KiB artifact excerpt. Public transcript member previews remain bounded with their existing truncated flag; artifact metadata/inspection refers to the full owned text. Existing private successful checkpoint contributions are append-only across retry/cancel, so historical artifact validation resolves the original exact contribution rather than a mutable display slot or current composer/provider route.

The pre-export foundation was never imported into the accepted candidate or released. No compatibility shim for the earlier unaccepted artifact shape was added. Existing pre-contract profiles still derive artifact records from their saved run/checkpoint truth; absent/invalid producer evidence fails closed.

## Focused evidence

19 native host tests PASS through the one existing target/cache. This includes the earlier 12 persistence/identity tests and seven additional provenance tests:

- Identical-text, same-provider cross-member binding swaps rejected after recomputing IDs.
- Failed independent attempt substitution rejected; successful retry invocation/attempt asserted.
- Integrate retry stores the successful attempt, survives reopen, and rejects the failed attempt.
- Identical final bytes/digest with another attempt produce distinct IDs; only checkpoint-supported identity validates.
- Valid Decide and IndependentAnswer bindings cannot stand in for final Integrate provenance.
- A 40,000-byte Unicode member contribution is inspected in full while the transcript remains explicitly truncated; forged owned bytes fail validation even with a new digest/ID.
- Final run answer, delivery and contribution must agree; changed answer/text or absent checkpoint is rejected.

The existing cancellation/retry/reopen test also now asserts the exact successful member retry attempt after reopening. P03/P05/P06 immediate-reopen fault matrices continue to pass. Outcomes are synthetic and checkpoint-driven; no provider process or native application was launched. An initial compile caught helper placement inside an impl block; it was corrected before the passing run. The sole remaining compile warning is the pre-existing unused `d` in constellation_projection.rs.

TypeScript production/test files remain byte-identical to the corrected adapter receipt, whose seven focused tests and typecheck passed. No unrelated tests were repeated.

## Frozen source and scope

Only saved_artifacts.rs and saved_artifact_tests.rs changed in this correction. The full foundation remains exactly 13 source paths. All 141 accepted candidate files and live styles/HostWorkspace/SavedResult remain unchanged. No export, commit, package build, native launch/restart, provider, signing, publication or server action occurred.

SHA256:
- saved_artifacts.rs: `94f9ebc82ee01c8beb36c3f7de33dcb55bb836f1dd7041f09c7c449f88aa2963`
- saved_artifact_tests.rs: `f67127605a8629e55d6c0b8319a3923ae6008c8756560117339e03a92956519c`

Evidence: `qa-artifacts/durable-artifact-foundation-20260910/source-hashes.json`, `source-hashes-before-provenance-correction.json`, `scoped-source.patch`, `provenance-correction-result.json`, `host-tests.log` and `preservation.json`. This receipt supersedes earlier member-text/binding descriptions and native test counts. Stop remains independent review before pane wiring, export or build.
