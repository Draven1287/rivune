# Failed-invocation retry acceptance preparation

2026-09-09. Source-only baseline; builder implementation in progress. Await builder receipt before rendered acceptance. No production edits, native execution, provider calls, full-suite/N5 or private supplemental evidence.

## Authoritative contract inspected

`qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:749,1788,5463` defines `retry_constellation_invocation({requestID, invocationID, failedAttemptID})`. It reuses the original run ID and admitted request; it does not submit a new conversation request. Host requires a failed Constellation run, saved session and exact failed unresolved invocation/attempt. Lifecycle active/shutdown state blocks admission. Checkpoint mutation is saved before execution and an admission recovery event is emitted. The async command awaits execution; a pending response alone does not mean admission failed. Stale-attempt rejection is exercised in existing native test source around line 6178; those native tests were not run here.

Legacy `web/desktop-host.mjs:77` exposes the command; `web/app.mjs:759` uses saved failed IDs. React `src/host/tauriAdapter.ts` currently lacks this method; `contracts.ts` does not project failedInvocationID/failedAttemptID. Existing controller pending submission/cancel recovery must not be reused blindly: reconciliation of an already-existing run proves the run exists, not that this particular retry attempt was admitted.

## Exact isolated acceptance cases for builder checkpoint

Use public synthetic DTO fixtures only. Record bridge calls and persisted snapshots; no provider implementation. Baseline failed run R in conversation C, failed invocation I, failed attempt A1; successful member contribution S with fixed bytes and provider/model attribution. Independent failed run Q/C2 must never be targeted from R's action.

1. **DTO and optional capability.** Preserve authoritative failure IDs from public snapshot. Both absent means action unavailable for older hosts. Malformed, empty, oversized or partially supplied identity must not enable retry. A bridge lacking retry support remains usable for ordinary chat. Never derive I/A1 from display member ordinal, text, current catalog or event sequence.
2. **Exact payload.** Click retry on R: exactly one call `{requestID:R, invocationID:I, failedAttemptID:A1}`. No new run ID, submitRun, retry_run, new conversation, draft save or prompt mutation. Existing composer draft stays unchanged.
3. **Stale protection before action.** Render R/A1; refresh authoritative snapshot to running, completed, cancelled, missing R, or failed A2 before activation. Old A1 closure must not dispatch. For a race after refresh, host rejection is surfaced without clearing contributions/draft or silently retrying A2.
4. **Repeated clicks and pending transport.** Hold retry promise; double-click/Enter/Space/programmatic second controller call. Exactly one bridge invocation. Announce pending state and disable repeat action promptly. Avoid locking cancellation of the exact newly active R if the supported controller permits it. Switching conversations must not retarget the pending request.
5. **Successful contribution retention.** On admitted running R, retain S byte-for-byte with original role/provider/model; label historical member progress honestly. Final canonical answer remains distinct. A completed retry updates the same R; successful member contributions must not appear as newly regenerated just because the UI refreshed.
6. **Transport failure / malformed or mismatched acknowledgement.** Reject promise after host admission, or return wrong requestID/unknown state. Refresh/reconcile original R and compare authoritative attempt/state. Do not automatically replay I/A1. If R remains failed with A1, existence/reconcile accepted is insufficient to declare retry success; retain uncertainty or explicit retry choice. If failed A2 appears, show new failure and require a fresh explicit action using A2. If snapshot fails, pending uncertainty remains visible and repeated mutation blocked.
7. **Explicit host rejection.** Rejected retry leaves original failure, S and draft intact. Show actionable reason. No submit fallback. Ensure rejection does not overwrite a newer snapshot showing admitted running/completed state.
8. **Restart during unconfirmed retry.** If implementation claims restart recovery, verify recovery identity distinguishes retry attempt from original submission. Restoring R alone must not falsely acknowledge I/A1 or rerun it. If not supported, explicitly document the limitation and verify reload performs no automatic retry.
9. **Accessibility and eligibility.** Native button has a clear failed-work retry name and run context, keyboard activation works once, pending/failed outcomes are announced. Hide or explain unavailable action for non-Constellation, nonfailed, missing IDs, unsupported bridge, read-only/recovery/shutdown state or conflicting unresolved operation. Retain focus after failure, or move it deliberately if the action disappears after admission. No color-only eligibility.

## Evidence required to close

Current hashes for DTO/adapter/controller/component and test fixture; focused adapter/controller results; isolated selected mounted scenario that excludes unrelated shutdown tests. Record exact call payload/count and before/after S/draft content. Distinguish frontend fake-bridge proof from native checkpoint/execution proof. Do not run a full test document merely to obtain the retry case.

Status: acceptance specification ready; baseline missing React integration is expected work in progress, not a finding against the forthcoming implementation. No rendered retry acceptance yet.
