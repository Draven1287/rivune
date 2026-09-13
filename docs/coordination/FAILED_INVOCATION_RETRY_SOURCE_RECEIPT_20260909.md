# Exact failed-invocation retry — frontend receipt

Read the current product review, native DTO/admission/command/projection, desktop bridge, and independent `FAILED_INVOCATION_RETRY_ACCEPTANCE.md`. Implemented source and fake-host browser integration only. No Rust orchestration change, native launch/build/install, provider call, N5 retry, or private evidence forwarding.

## Contract and behavior

The optional adapter method forwards exactly `retryConstellationInvocation({requestID, invocationID, failedAttemptID})` to the existing bridge. The run parser preserves the host's paired opaque failure identifiers and rejects partial, empty, whitespace-only, oversized, or non-Constellation bindings. Older hosts without this optional method retain direct-chat support and show retry unavailable.

The controller refreshes saved state immediately before dispatch and requires a failed Constellation run with the same invocation and attempt, an editable conversation, no active work, and no conflicting pending operation. It neither saves the draft nor reserves/submits a new prompt. The host remains authoritative over retries and frozen routes.

Retry has a separate in-memory pending state. The command may remain awaited for execution: duplicate actions and conflicting workspace mutations are blocked, polling continues, and exact active cancellation remains available. Saved contributions are never replaced by notifications. Explicit rejection is displayed with a bounded host reason. Uncertain, thrown, malformed, mismatched, and uncorroborated accepted replies retain the retry fence and offer **Check retry status** or **Cancel recovery**.

Reconciliation checks the original run's authoritative state/attempt, not existence alone. A failed run with the same invocation/attempt remains uncertain even when reconcile returns accepted. Running/terminal progression or a changed failed attempt permits following the updated saved state; a new failure requires a fresh explicit action. No automatic retry or whole-prompt fallback exists. Cancellation can resolve a persisted failed checkpoint. Late uncertain submission/reconciliation replies cannot resurrect a cancelled retry.

## UI

One inline **Retry failed step** action appears beneath the saved run's Constellation disclosure. “Step” is deliberate: the host can report a failed decision, contribution, or integration invocation, not only an answer. Saved activity identifies member/provider issues when supplied; opaque IDs are never inferred from member order or display text. Partial answers, role/provider/model attribution, and canonical final answer remain separate.

The native button supports keyboard activation. Pending/failed state is announced; focus moves to a stable recovery group when the action disappears. The recovery action is disabled for read-only/frozen/conflicting states, and missing optional capability is explained. Existing errors do not trigger prompt replay.

## Evidence

- **115 unit tests passed**, zero failed/skipped, including 10 new retry cases covering exact payload, stale/nonfailed/missing/read-only targets, duplicate pending requests, cancellation, uncertain/rejected/malformed replies, unchanged-vs-changed reconciliation, retained output/draft, optional capability/identifier validation, remount without replay, and late reconciliation after cancellation.
- **3 selected mounted retry scenarios passed** in the actual app browser. They exercise real React/controller code against fake public DTOs and exclude unrelated submit/shutdown suites. The selected guard asserts no submit or shutdown method was called.
- Manual keyboard Enter on the preview retry button displayed its synthetic rejection, retained the saved contribution, and focused the recovery group. No provider was called.
- Production frontend build and scoped diff check passed. Current logs/hashes/observation record: `qa-artifacts/failed-invocation-retry-source-20260909/`.

Selected results URL: `http://127.0.0.1:4317/tests/hostRenderer.html?scenario=invocation-retry`.

Retained interactive fake rejection preview: `http://127.0.0.1:4317/tests/hostRenderer.html?scenario=invocation-retry&preview=1&team=1&retry=1`.

Individual safe selectors: `retry-pending`, `retry-uncertain`, `retry-rejected`. Existing team-form selectors and default full-suite behavior remain available. The preview manager on 4317 was unchanged.

## Limits and next gate

The frontend's retry-pending marker is intentionally in memory; this does not claim durable client attempt recovery across renderer reload. A fresh controller reads host history and never automatically retries, but it cannot reconstruct a lost client pending marker from original run existence. Native checkpoint/attempt identity remains the host's guard against stale dispatch. The remount test proves no automatic replay, not full native restart recovery for this new UI.

Next: independent current-source/selected-fixture acceptance. A later separately authorized packaged synthetic test should hold an exact retry after admission, retain a sibling contribution, lose the reply, and verify UI reconciliation/cancel against actual host checkpoints. This batch does not establish that native test or real-provider retry success. Prior native artifacts do not include this frontend change.
