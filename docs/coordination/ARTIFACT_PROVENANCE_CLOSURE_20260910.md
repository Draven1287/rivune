# Artifact provenance correction — independent closure

**Date:** September 10, 2026  
**Review scope:** the two P1 producer-binding findings and the P2 silent-truncation finding in `ARTIFACT_PROVENANCE_IMPLEMENTATION_REVIEW_20260910.md`  
**Decision:** **closed for provenance; release the durable artifact foundation to pane integration**  
**Boundary:** this is not a general native state/transaction review, build receipt, provider run, UI acceptance, export, commit or release. The state/transaction reviewer retains ownership of general native validation and persistence behavior.

## Reviewed evidence

- `docs/coordination/DURABLE_ARTIFACT_PROVENANCE_CORRECTION_RECEIPT_20260910.md`
- `qa-artifacts/durable-artifact-foundation-20260910/scoped-source.patch`
- `qa-artifacts/durable-artifact-foundation-20260910/source-hashes.json`
- `qa-artifacts/durable-artifact-foundation-20260910/source-hashes-before-provenance-correction.json`
- `qa-artifacts/durable-artifact-foundation-20260910/provenance-correction-result.json`
- `qa-artifacts/durable-artifact-foundation-20260910/host-tests.log`
- Current corrected `saved_artifacts.rs` and `saved_artifact_tests.rs`

The 13 entries in `source-hashes.json` matched the current scoped source files at review time. The accepted candidate repository remained at `5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b` with only its two previously recorded generated/untracked paths.

Exact evidence hashes:

```text
saved_artifacts.rs
94f9ebc82ee01c8beb36c3f7de33dcb55bb836f1dd7041f09c7c449f88aa2963

saved_artifact_tests.rs
f67127605a8629e55d6c0b8319a3923ae6008c8756560117339e03a92956519c

scoped-source.patch
890f22b2d4559af21ecb4bce115de3223b4cabca29901d2067330199acf55913

source-hashes.json
1c59084e28221536c82fa679b9d8c278a2713a141e03e3e6e93d3f50b88ebddb

host-tests.log
7091dcd26c57d5c53ca46bc9dad02cc739ae23ee525acefac90f06c576b9d792

provenance-correction-result.json
7389ecf86dcd9d6fb975230a25e123d1896f1e9853afa56c42a2311fdb4e85ff
```

## Closure of P1 — member producer binding

**Closed.** `saved_artifacts.rs:147-184` now makes checkpoint replay authoritative:

- exactly one persisted Constellation session must exist for the run;
- the saved checkpoint must restore;
- the producer must match the run ID and the checkpoint's input digest;
- member, `Role::IndependentAnswer`, invocation ID and attempt ID must all match one successful contribution; and
- duplicate matches fail closed.

Validation then requires the artifact's full owned text to equal that exact contribution (`saved_artifacts.rs:263-280`). The deterministic artifact ID remains useful identity, but no longer substitutes for checkpoint evidence.

The focused evidence covers the previously exploitable cases:

- identical text and same provider cannot permit cross-member binding swaps (`saved_artifact_tests.rs:792-806`);
- a failed member attempt cannot replace the successful retry attempt (`saved_artifact_tests.rs:808-830`); and
- the existing retry/cancel/reopen case now asserts the recovered artifact's exact successful invocation and attempt before and after reopen (`saved_artifact_tests.rs:257-380`).

This closes the prior finding that private IDs were merely syntactic, self-consistent metadata.

## Closure of P1 — final Integrate provenance

**Closed.** `saved_artifacts.rs:185-209` now derives a Council final producer only when:

- the restored session has Council delivery;
- `RunRecord.answer` equals the delivery text;
- exactly one successful contribution belongs to the frozen lead member;
- that contribution has `Role::Integrate`; and
- its text equals the delivery text.

Council final materialization stores that Integrate contribution's private invocation and successful attempt (`saved_artifacts.rs:353-376`). Validation requires those exact IDs and exact text again (`saved_artifacts.rs:247-260`). Direct finals keep absent engine bindings, which is correct because their request ID is the direct execution identity.

The focused evidence covers:

- failed Integrate attempt followed by successful retry, exact successful binding, reopen preservation and failed-attempt rejection (`saved_artifact_tests.rs:776-790,832-855`);
- identical final bytes/digest producing a distinct ID under another attempt while only checkpoint-supported identity validates (`saved_artifact_tests.rs:857-874`);
- Decide and IndependentAnswer bindings rejected as final producers (`saved_artifact_tests.rs:876-892`); and
- run answer, delivery, contribution text and checkpoint presence required to agree (`saved_artifact_tests.rs:921-932`).

This closes the prior finding that a Council final discarded the Integrate retry identity.

## Closure of P2 — full member bytes

**Closed.** Member materialization now copies `Contribution.text` directly rather than the 24 KiB public projection (`saved_artifacts.rs:353-366`). The owned artifact therefore contains the exact accepted member output. Transcript projection remains independently bounded and retains its existing `truncated` signal.

The 40,000-byte Unicode test verifies that artifact inspection returns every original byte while the public transcript explicitly reports truncation; forged owned bytes are rejected even after digest and ID recomputation (`saved_artifact_tests.rs:894-919`).

This closes the prior mismatch where a private attempt binding named a full contribution but the saved artifact silently contained only an unlabelled excerpt.

## Historical and retry compatibility

- Successful checkpoint contributions remain the immutable authority across retry and cancellation; validation resolves old artifacts against their original full successful binding rather than current display slots.
- Retry preserves the logical invocation identity, assigns a new attempt, and artifacts bind only the successful attempt. Failed attempts do not become saved results.
- Council final identity is distinct from member results and includes the successful Integrate attempt even when text and digest are identical to another output.
- Pre-contract profiles with absent artifact fields and no artifact records still pass schema-zero admission, derive records from saved run/checkpoint truth on open, and persist the migration once (`host.rs:1182-1200`; `saved_artifact_tests.rs:169-200`).
- There is deliberately no compatibility shim for the earlier unexported, unaccepted pre-correction artifact shape. Invalid or missing producer evidence fails closed instead of fabricating provenance.

## Evidence boundary and release

The recorded focused native log reports 19 passed tests, zero failures and one pre-existing unused-variable warning. I inspected that log and the corrected source; I did not rerun compilation or tests, consistent with this review's no-competing-build boundary.

No remaining defect was found within the assigned artifact provenance scope. The durable artifact foundation may proceed to **pane integration**, provided the pane consumes only the existing public summaries and exact inspection contract and does not expose or reconstruct private invocation/attempt IDs.

