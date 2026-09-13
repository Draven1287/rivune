# Retry context — Tauri implementation requirements

The September 7 controlling direction is one Tauri desktop app for macOS, Windows and Linux. The recovered Swift candidate is now a behavior and regression reference only. Do not integrate a new Swift feature or depend on the missing temporary Swift baseline to start Tauri work.

## User-visible behavior

Retry creates a new attempt of the original request while preserving the user's current unsent draft, attachments, selected artifact and composer mode. It uses the original approved project instructions, original bounded conversation history, original document contents and artifact revision. Later conversation messages and edited project instructions must not silently enter the retried request.

The Tauri host owns an immutable admitted request snapshot and binds it to the original conversation and request IDs. Provider progress and final-response replacement must never discard that snapshot. Persist it with the run and conversation using the existing host's storage transaction/journal. Renderer clients reference a source request; they cannot declare arbitrary context approved by supplying their own snapshot or checksum. A checksum is corruption detection, not authorization.

Each retry goes through current provider readiness, budget, consent, artifact/source validity and cancellation checks. Original context must remain inspectable. If the provider/model configuration is changed for the new attempt, make the actual configuration explicit; do not claim an exact full rerun while silently changing it. Pinning model/effort is a separate choice from preserving prompt context.

Legacy records lacking original context cannot truthfully offer an exact retry. Explain the limitation, retain the current draft and offer an explicit new request using context the user can review. Invalid or inconsistent explicit snapshots require recovery; never silently fall back to older data and overwrite the damaged original or backup.

## Acceptance tests against real host entry points

1. Admit original project instructions A, history A and documents A; finish, persist and reopen. Change project instructions to B and append history C. Retry and inspect the actual runner request: it still contains A, excludes B/C and retains the current unsent draft.
2. Exercise all provider progress callbacks and final result replacement, including partner workflows. The same admitted snapshot survives every update and reload.
3. Corrupt a snapshot with a valid backup present. Verify recovery state, zero provider dispatch and no overwrite of either file. Test request/conversation binding and altered documents/artifact revision.
4. Cancel consent, switch/delete the origin conversation while consent is open, lose provider readiness, exceed budget and cancel an attempt. No unintended dispatch, duplicate attempt or draft loss.
5. Load a legacy record with no snapshot. Verify clear explanation and zero dispatch until the user explicitly starts a new request.
6. Reject oversized or inconsistent document metadata using actual byte counts and checked arithmetic. Never silently clip approved content.

Use host-owned temporary storage and recording/failing providers for automated tests. No real account calls, user data or installed-app operations are required for this contract. Follow with rendered desktop QA across the actual supported operating systems before claiming cross-platform runtime readiness.
