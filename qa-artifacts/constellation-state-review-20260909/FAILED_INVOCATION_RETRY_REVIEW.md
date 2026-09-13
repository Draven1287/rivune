# Independent failed-invocation retry review

2026-09-09. Read builder receipt, current DTO/adapter/controller, selected scenarios and previous acceptance specification. No production edits, full suite, native/provider/N5 or private evidence operations. No confirmed blocking defect found in this bounded pass.

## Independently executed

- **10/10 focused unit tests passed**: `node --experimental-strip-types --test prototypes/ai-native-workspace/tests/invocationRetry.test.mjs`. Output `retry-unit-results.tap`.
- **3/3 selected mounted scenarios passed**, CUA observed individual PASS lines at exactly `http://127.0.0.1:4317/tests/hostRenderer.html?scenario=invocation-retry`. Source selector and guard inspected first; selected cases exclude full-suite/mode/startup loops and assert no submit or shutdown calls. Fake public DTOs only.
- Additional own controller probe `retry-refresh-race.mjs` passed its bounded assertion: when post-ack refresh fails while cancellation shares that refresh, cancellation remains unconfirmed and the retry fence stays uncertain. `retry-refresh-race.log` preserves output. Initial probe awaited cancellation before releasing its shared refresh and was interrupted; that test-ordering deadlock was not a product finding. Corrected probe releases the shared failure and awaits both outcomes.

## Acceptance results

Exact original run/invocation/failed-attempt payload and one admission on repeated calls verified. No draft save/new prompt/reservation fallback. Stale attempt, nonfailed/missing/read-only run and absent optional bridge reject safely. Paired malformed IDs fail closed. Saved partial answer and draft survive focused tests.

Unchanged failed attempt remains uncertain even when reconcile returns accepted; changed attempt resolves the fence without dispatch. Held command permits exact cancellation; late uncertain command and reconcile replies do not recreate a cancelled retry in tested cases. Explicit rejection remains visible; selected UI covers missing capability. Tests preserve contributions separately from canonical final output.

## Limits, not hidden acceptance

- Retry marker is in memory. Remount test verifies no automatic replay and host-history retention; it does **not** prove durable client attempt recovery. Original run existence alone remains insufficient evidence of retry admission.
- Native checkpoint/execution and real-provider retry success remain untested here. No installed artifact acceptance.
- Browser cases use mounted programmatic interactions. Independent manual keyboard/screen-reader/contrast testing was not repeated; builder manual keyboard claim remains owner-reported.
- Cross-conversation races, rejection arriving after a separately observed newer terminal state, and all possible refresh/transport orderings are not exhaustively tested. Current passed tests support bounded acceptance, not proof of every race.

Current checkpoint hashes: `retry-acceptance-hashes.json`. Source not frozen; subsequent changes supersede this evidence. The previous acceptance specification remains useful for future native/reload and expanded interaction coverage.
