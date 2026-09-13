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

## Truth boundaries

- `runtimeCapabilities.constellation = "available"` means that at least two distinct supported, installed provider-default routes are configured. It does **not** claim that either account is signed in or that a live response test passed.
- Execution is currently serial. The drafts are independent because each invocation receives a fresh provider process and only the approved phase context, but this checkpoint does not claim parallel speed.
- Explicit model and effort choices remain blocked until a trustworthy provider catalog can verify them. Provider-managed defaults are the only admissible current route.
- An uncertain dispatched call is never automatically retried. The user may cancel recovery; replay requires trusted reconciliation evidence that is not implemented here.
- Provider executable paths are still present in the broader settings snapshot because the current connection editor depends on them. The private Council checkpoint is redacted, but a dedicated host-owned connection-settings DTO is still required before claiming that no executable path reaches the renderer.
- This is source-and-test evidence only. No application build, launch, install, DMG, signing, notarization, provider-account request, or release was performed for this checkpoint.

## Verification

- Rust library suite: 93 passed, 0 failed.
- Rust binary suite: 2 passed, 0 failed.
- Node renderer/contract suite: 52 passed, 0 failed.
- Keyboard fixture: passed with focus preserved and no reported errors.
- Rust/JavaScript wire fixture: both directions passed.
- JavaScript syntax checks: passed.
- Actual host acceptance covers durable team admission, restart, frozen-route retry, failed save atomicity, retained provenance, one final answer, and no draft loss.
- A fault-injected final checkpoint test forces two consecutive pre-commit save failures, returns an uncertain acknowledgement, reconciles the already completed strategy delivery without provider redispatch, and reopens with one durable answer.
- A repeated provider-failure test proves that replaying the prior attempt's retry payload cannot admit another call; only the newly exposed failed attempt ID can continue recovery.

## Frozen evidence

- `src-tauri/src/host.rs`: `6275d028b15e85bf319136bed996780a0edbe09cf565e2e5c5c1130709692568`
- `src-tauri/src/main.rs`: `e1d25ff5db187cc7f2908dc96610e4c63b5dd1a9ca3edef1b97840e7123cdbba`
- `src-tauri/src/constellation_acceptance_tests.rs`: `6b196e444c1caa2cc1c6c163865d0cfc3c8a9e6f84a0ed8f284e9b100bacb45f`
- `src-tauri/src/team_strategy.rs`: `f972a09dc3a905bcd55eccc18415be7948f19282ecd2080c40e8d4b522942a64`
- `src-tauri/examples/r5_contract_fixture.rs`: `a31b1d7d663eb17072e252a40b88d1ef131debb169e133d70d0ab3a8b003527f`
- `CONSTELLATION_PUBLIC_FIXTURES_20260908.json`: `f022c63703aa7a1e8192f16f3ea4141b38eff0534b9e8dee9dfeca7e52341c04`

The normalized public fixture contains one completed Council run, one stopped-for-recovery run, the exact activity/event shapes, the admitted team, and the invocation-specific retry command payload. It intentionally contains no machine-specific executable paths.

## Next integration gate

The renderer must consume the exact public fixture, expose `retryConstellationInvocation`, and make the combined answer primary while keeping the task split, contributions, and cross-review inspectable on demand. A fresh integrated desktop build then needs user-visible QA for setup, run progress, failure recovery, restart, cancellation, and final-answer readability before any packaging or release claim.
