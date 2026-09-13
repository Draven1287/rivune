# Artifact provenance implementation review — September 10, 2026

**Review target:** `DURABLE_ARTIFACT_FOUNDATION_RECEIPT_20260910.md`, `qa-artifacts/durable-artifact-foundation-20260910/source-hashes.json`, and `scoped-source.patch`  
**Accepted foundation:** owned immutable UTF-8 text committed in the same workspace generation  
**Scope:** Council member/final invocation and attempt provenance only. The state/transaction reviewer owns general native validation, fault behavior and transaction review. No production source, tests or builds were changed or run for this review.

## Decision

Keep the implemented owned-text design. It already gives every saved version stable bytes and avoids the mutable `runText` locator concern from the earlier proposal. A separate result-revision layer is not required solely to satisfy provenance: `PersistedArtifact` is itself the immutable saved-result version.

Two concrete provenance gaps remain before the foundation can claim that its private bindings prove which Council execution produced a saved result.

## Findings

### P1 — Stored member attempt identity is self-consistent but not attested by the Council checkpoint

`saved_artifacts.rs:288-303` initially obtains a member's `invocationID` and `attemptID` from a successful `IndependentAnswer` contribution, which is correct at materialization time. The artifact ID includes those private fields (`saved_artifacts.rs:115-128`).

However, open/save validation checks only that the member, invocation and attempt strings are syntactically valid and that the provider matches the frozen admitted team (`saved_artifacts.rs:148-205`). It does **not** restore the run's persisted Council checkpoint and require one successful contribution whose full binding matches:

```text
requestID
memberID
role = independentAnswer
invocationID
attemptID
```

It also does not require the owned member text to be the bytes attributed to that matched contribution.

Therefore a persisted member artifact can substitute another syntactically valid invocation/attempt pair, recompute its deterministic artifact ID and pass `validate`. This remains possible when both members use the same provider and return identical text, because the current checks see a valid member/provider, valid strings and a matching owned-text digest; they never prove that the private binding belongs to that member's successful contribution. The deterministic SHA-256 ID is an integrity-derived identifier, not a secret authentication tag.

**Required correction:** during `validate`, restore the exact `PersistedConstellation` for the run and locate exactly one successful `Contribution` matching the artifact's full private binding, member and `Role::IndependentAnswer`. Reject missing, duplicate, cross-member, cross-role, stale-attempt or foreign-attempt bindings. Then require the saved bytes to match the admitted representation of that exact contribution.

This correction does not require changing owned-text storage or exposing private bindings publicly.

### P1 — Council final artifacts have no Integrate invocation or attempt provenance

All completed/preserved final answers are currently created with `invocationID = None` and `attemptID = None` (`saved_artifacts.rs:306-309`). Validation explicitly requires both fields to be absent for every `finalAnswer` (`saved_artifacts.rs:185-200`). The artifact ID therefore cannot include the Council Integrate attempt, even though its tuple has optional slots for those fields (`saved_artifacts.rs:115-128`).

The completed-Council test checks only that there is one final artifact and that its text is `"synthesis"` (`saved_artifact_tests.rs:443-471`). It does not assert that the final came from the successful `Integrate` contribution, that its attempt is the successful attempt, or that stale/foreign attempt substitution is rejected.

Under the current engine, a retryable failed Council run has no final answer and a completed run cannot be retried, so this omission does not overwrite a previously completed final. It still means the implemented record cannot prove the claimed final provenance. If an Integrate invocation fails and is retried, the final artifact records the resulting text but discards the exact retry attempt that produced it. Identical final text under a different Integrate attempt would generate the same ID for the same run because both private tuple fields are `None`.

**Required correction:** when materializing a completed Council final, restore the checkpoint and require:

1. `Session.delivery` exists and is Council delivery;
2. `RunRecord.answer` exactly equals `delivery.text`;
3. exactly one successful `Role::Integrate` contribution has text equal to that delivery; and
4. the final artifact privately stores that contribution's `invocationID` and `attemptID`.

Validation must repeat the binding/equality checks on open. For a direct run, retaining `None` for engine binding is acceptable because the direct request ID is its execution identity. The public final origin may remain `memberID = null`; private producer binding does not require presenting the integrator as a member artifact.

### P2 — Member artifacts silently turn a full contribution into an unlabelled projection excerpt

Materialization iterates `project_council(...).member_results` and stores `m.text` (`saved_artifacts.rs:283-303`), not the matched contribution's `c.text`. The projection truncates each member to 24 KiB and caps the collection at 96 KiB (`constellation_projection.rs:77-101`). `PersistedArtifact` and its public summary do not retain the projection's `truncated` flag (`saved_artifacts.rs:31-72`).

As a result, the private binding may name the correct successful attempt while the artifact labelled `member-N answer` contains only an excerpt and gives no provenance signal that bytes were omitted. Its digest proves the excerpt, not the model's accepted full contribution.

**Required correction:** preferably persist `c.text` from the exactly matched contribution as the owned member result. It is already bounded by the engine's accepted outcome limit and the artifact's 2 MiB limit. If product policy intentionally saves only the bounded projection, rename the origin to an excerpt and persist `truncated = true` plus the full accepted contribution digest; do not present it as the exact member answer.

## Focused test additions

These tests are the minimum provenance supplement to the existing nine-test receipt. They need no provider process or native build.

1. **Cross-member binding substitution with identical text.** Build a two-member Council where both independent answers use the same provider and return identical bytes. Materialize both artifacts, swap their private invocation/attempt bindings, recompute each deterministic artifact ID, and assert `validate` rejects both. This proves the checkpoint binding—not provider, text or hash—owns provenance.
2. **Stale failed-attempt substitution.** Fail one independent invocation, retry it, succeed on the new attempt and materialize. Replace the saved artifact's successful `attemptID` with the failed attempt ID, recompute its artifact ID, and assert rejection even though request/member/invocation/text digest remain valid.
3. **Recovered member exact-attempt assertion.** Extend `saved_artifact_council_checkpoint_retry_and_cancel_keep_exact_history` to capture the successful retry binding and assert the recovered artifact's private `invocationID` and `attemptID` equal it. The current test only asserts that the engine generated a new attempt and that two artifact IDs differ (`saved_artifact_tests.rs:308-343`).
4. **Final Integrate retry provenance.** Complete both independent answers, fail Integrate, retry the exact invocation, then succeed. Assert the final artifact privately contains the stable Integrate `invocationID` and the new successful `attemptID`; the failed attempt is rejected as a substitution.
5. **Identical final bytes, distinct producer attempt.** In a synthetic validation fixture, hold request/origin/text/digest constant but construct two otherwise valid Integrate bindings with different attempts. Assert only the binding present in the durable checkpoint validates and the artifact IDs differ. This is an identity test, not a request to permit a second successful production final.
6. **Cross-role substitution.** Substitute a valid Decide or IndependentAnswer binding into a final artifact and assert rejection. Invocation/attempt syntax alone must not stand in for `Role::Integrate` provenance.
7. **Long member result exactness.** Save an accepted independent contribution larger than 24 KiB. Assert either the artifact returns the full exact bytes, or its schema explicitly identifies an excerpt with `truncated = true` and a digest of the full accepted contribution. Silent truncation must fail the exact-result contract.

## What passed this provenance review

- Owned immutable text is an acceptable historical-result strategy and makes inspection independent of later transcript projection changes.
- Artifact identity includes conversation, request, origin, private binding fields and content digest (`saved_artifacts.rs:115-128`).
- Initial member materialization selects only `Role::IndependentAnswer` and obtains binding fields from the session contribution (`saved_artifacts.rs:288-303`).
- Repeated materialization deduplicates by full artifact ID and preserves existing owned versions (`saved_artifacts.rs:312-335`).
- Public summaries omit private invocation/attempt identity, while inspection resolves the exact public tuple and digest (`saved_artifacts.rs:337-366`).
- The reviewed `source-hashes.json` matched the 13 current scoped source files at review time. The accepted candidate repository itself remained unchanged.

These passes do not override the three gaps above and do not certify general transaction, parser, UI, file-storage, provider-runtime, build or native-app behavior.

## Exact next dependency

The **RIVUNE APP BUILDER** should make the two P1 binding changes and choose an explicit policy for the P2 full-result/excerpt distinction, then return the seven focused test receipts. The provenance acceptance gate is:

> Every Council member and final artifact is rejected unless its private producer binding exists in the exact durable checkpoint with the correct role, member and successful attempt; identical bytes never permit attempt, member or role substitution.

