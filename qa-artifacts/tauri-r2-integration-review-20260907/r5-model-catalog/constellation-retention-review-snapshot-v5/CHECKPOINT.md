# Constellation host checkpoint — 2026-09-08

This checkpoint supersedes only the `ENGINE_NOT_CONNECTED` limitation recorded in `RUNTIME_CHECKPOINT_20260908.md`. The earlier model-catalog and durable rich-draft contract remains in force.

## What is connected

- A saved 2–6 member team with an explicit lead is admitted into the existing Council strategy engine.
- The host freezes the selected provider routes, creates one fresh provider process for each invocation, and persists a checkpoint before every dispatch and after every outcome.
- Council execution produces at least two independent drafts and gives their actual text to the appointed lead for one reviewed delivery.
- The public snapshot exposes a bounded, contiguous activity feed and an opaque failed invocation ID while keeping the private strategy checkpoint out of the renderer.
- A failed invocation can be retried only in place, against its frozen route, invocation ID, and exact failed attempt ID. A delayed retry for an older attempt is rejected without mutation. Completed contributions remain retained.
- A failed, uncertain, or recovery-required Council session can be cancelled without replaying an uncertain provider call.
- The Tauri host emits `rivune://run-event` after the matching checkpoint is durable.
- Independent Council answers run in separate provider processes with a host-frozen concurrency ceiling of three. The complete dispatch batch is checkpointed before any provider process starts.
- Completed provider outcomes are consumed and checkpointed as they arrive. A slow or cancelled sibling cannot discard work that another member already finished, and all launched workers are drained and joined before the host returns an error or cancellation result.
- The public run projection includes only bounded accepted independent-answer text plus factual lead-synthesis metadata; decision JSON, private bindings, attempts, receipts, tool arguments, and the final answer are not duplicated there.

## Truth boundaries

- `runtimeCapabilities.constellation = "available"` means that at least two distinct supported, installed provider-default routes are configured. It does **not** claim that either account is signed in or that a live response test passed.
- Decide and final integration remain ordered; only mutually independent Council answer calls run concurrently.
- Explicit model and effort choices remain blocked until a trustworthy provider catalog can verify them. Provider-managed defaults are the only admissible current route.
- An uncertain dispatched call is never automatically retried. The user may cancel recovery; replay requires trusted reconciliation evidence that is not implemented here.
- Provider executable paths are still present in the broader settings snapshot because the current connection editor depends on them. The private Council checkpoint is redacted, but a dedicated host-owned connection-settings DTO is still required before claiming that no executable path reaches the renderer.
- This is source-and-test evidence only. No application build, launch, install, DMG, signing, notarization, provider-account request, or release was performed for this checkpoint.

## Verification

- Rust library suite: 102 passed, 0 failed.
- Rust binary suite: 2 passed, 0 failed.
- Node renderer/contract suite: 55 passed, 0 failed.
- Keyboard fixture: passed with focus preserved and no reported errors.
- Rust/JavaScript wire fixture: both directions passed.
- JavaScript syntax checks: passed.
- Actual host acceptance covers durable team admission, restart, frozen-route retry, failed save atomicity, retained provenance, one final answer, and no draft loss.
- A fault-injected final checkpoint test forces two consecutive pre-commit save failures, returns an uncertain acknowledgement, reconciles the already completed strategy delivery without provider redispatch, and reopens with one durable answer.
- A repeated provider-failure test proves that replaying the prior attempt's retry payload cannot admit another call; only the newly exposed failed attempt ID can continue recovery.
- A post-rename retry-admission fault test proves that no provider is launched after an uncertain acknowledgement. The durably reserved, not-dispatched attempt reopens as explicit recovery and can be cancelled without replay.
- A deterministic filesystem-barrier acceptance test proves that two real fixture-provider processes overlap, that a checkpoint captured with both calls unresolved reopens without replay, and that recovery cancellation is terminal. The completed original run exposes two public member results and one final answer.
- A second barrier test proves that member A remains publicly inspectable and durable while member B is still blocked; cancelling B preserves A through cancellation and restart and never starts synthesis.
- A persistence-fault barrier test forces both saves of member A's completion to fail while B remains blocked. The host still drains B, retains both independent answers in the next durable checkpoint, returns an uncertain result, and refuses to replay either member or start synthesis during recovery.

## Frozen evidence

- `src-tauri/src/host.rs`: `d6030259a728c8979af3a1568072f5e52457d2b6d5ca40f4bdc7553d788d43b1`
- `src-tauri/src/main.rs`: `e1d25ff5db187cc7f2908dc96610e4c63b5dd1a9ca3edef1b97840e7123cdbba`
- `src-tauri/src/lib.rs`: `ef139a35fea1f2b913fe53aa324c63d7b5251568bc9a1e4f1a7ab29a46e00269`
- `src-tauri/src/constellation_projection.rs`: `54198ee409d9da645396fdacf454b386613c14bbfd9c5babedc11d3486e9d998`
- `src-tauri/src/constellation_acceptance_tests.rs`: `b87b29eb36b03b36c090a82104cc4b8b23bf2ae7b2e7a4a9ab42600e9acd3fdb`
- `src-tauri/src/team_strategy.rs`: `f972a09dc3a905bcd55eccc18415be7948f19282ecd2080c40e8d4b522942a64`
- `src-tauri/examples/r5_contract_fixture.rs`: `a31b1d7d663eb17072e252a40b88d1ef131debb169e133d70d0ab3a8b003527f`
- `CONSTELLATION_PUBLIC_FIXTURES_20260908.json`: `9b138466525c55957ae7e39ebedebed34fb81c22e3167c9a1f17b596aa4c6eea`

Renderer hashes verified with this checkpoint:

- `web/core.mjs`: `6f3323f052ace287ebc19d7d96a33ad6f74c58c43f5b9e58c304ba60dbedfaa5`
- `web/app.mjs`: `807377544a40dc7769bf2856bcb897b857d84c60032abbf6db4e9072ed27100a`
- `web/desktop-host.mjs`: `55a7a740c9a29ebf7c313afd183fe119be4bc94f32df8d38137fabdecdbdca5e`

The normalized public fixture contains one completed Council run, one stopped-for-recovery run, the exact activity/event shapes, the admitted team, and the invocation-specific retry command payload. It intentionally contains no machine-specific executable paths.

## Next integration gate

The renderer must consume the exact public fixture, expose `retryConstellationInvocation`, and make the combined answer primary while keeping the task split, contributions, and cross-review inspectable on demand. A fresh integrated desktop build then needs user-visible QA for setup, run progress, failure recovery, restart, cancellation, and final-answer readability before any packaging or release claim.
