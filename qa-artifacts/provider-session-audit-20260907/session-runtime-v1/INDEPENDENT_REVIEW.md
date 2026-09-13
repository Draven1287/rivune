# Independent provider-session runtime v1 review

**REJECT pending one P1 ownership correction.** This verdict concerns the isolated actor/effect contract only. Live CLI adapters, tools enforcement, Store/UI integration and consumer-product parity are explicitly outside the candidate and are not reported as implemented defects.

## Exact evidence

Verified all three MANIFEST.json hashes in `/private/tmp/rivune-session-runtime-v1-eidg1ajw`:

- Source: `34c9d67da22ea83a6f13483937d7fe6c5190238c5fe21905aba1d8cbcbc4f97f`.
- Tests: `79209ab5c596736ad912364b1e72431c0c9eb7ba4c1a9aa555f54bdc9eefdcdc`.
- Package: `c699065862d9fabe2fb1724658e3a855f113531b96a4fec3e4bd926171ba4e41`.

Independently ran the final frozen suite: **18 passed, 0 failed**. Independently added two ownership assertions in a separate copied package with unchanged production source: **both failed** because the runtime accepted identities expected to be rejected. Logs, exact added tests, hash checks and results are under `independent-evidence/`. No frozen source/tests, shared native code, provider credentials, UI or installed app were changed. No live provider calls.

## P1 — A new or reset conversation can adopt another binding's provider history

`Sources/SessionRuntime/SessionRuntime.swift:258-264` accepts the first acknowledgement for a binding when that binding's own providerSessionID is nil. It does not check whether the same provider session ID is already owned by another binding on the same route. `validate` at lines 309-327 likewise permits that duplicate ownership in saved state.

Consequently, two unrelated Rivune conversations can become bound to the same provider history after an erroneous/crossed acknowledgement. Explicit reset has the same problem: the archived sensitive session may be accepted by the new binding even though its launch requested a fresh session. Subsequent launch effects will resume that adopted session, defeating the intended conversation/reset isolation boundary.

Two exact runtime reproductions:

1. Complete conversation A with provider session `private-session-A`. Begin unrelated conversation B on the same route, acknowledge B with `private-session-A`, and require `foreignEvent`. No error is thrown; B is saved as running with A's provider session.
2. Complete a session, explicitly reset its key, begin with a new approved seed, and acknowledge the new binding with the archived provider session ID. Again no error is thrown.

These are synthetic identity-boundary failures; they do not claim an observed live-provider data leak. Enforce uniqueness of `(route, providerSessionID)` across binding IDs, including archived bindings, before committing an acknowledgement and when validating loaded state. Existing-binding continuation remains valid. Same identifier strings on distinct provider routes need not collide. Add cross-conversation, reset/rebind, duplicate-corrupt-reload and legitimate-resume regressions. Preserve this v1 evidence and freeze v2 separately.

## Other reviewed behavior

The isolated contract carries typed per-turn message/documents/artifact/project instructions independently of one-time history seeding; reserves run identity before emitting launch; blocks duplicate launch and simultaneous active turns per key; emits a local pending-operation interrupt before provider acknowledgement; preserves provider completion when Stop races it; requires reset after unknown/failed/interrupted work; maintains consumed IDs through reset/capacity refusal; validates event sequence and bound IDs; and withholds saved-success effects after persistence failure. File storage uses private permissions and atomic replacement, with object and file ownership controls.

Those passing synthetic behaviors establish this component's state transitions. Its launch and interrupt effects do not guarantee that a future driver launched once, prevented tools, or terminated a provider process. Driver execution/permissions must be qualified separately under the existing controlled-input prerequisites. No additional live-call or install approval gate is introduced here.
