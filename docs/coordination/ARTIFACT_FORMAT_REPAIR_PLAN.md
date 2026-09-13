# AO-04 — Explicit file-format repair

Status: root accepts this bounded direction for later implementation after the current install. Runtime behavior and repair quality are not accepted or verified; no implementation or runtime changes.
Date: 2026-09-06.
Baseline: `/private/tmp/rivune-ao05-checkpoint/source`; all15 source-manifest hashes independently verified. References below are to that frozen source, not the moving workspace. Current installation must not wait for this proposal.

## Problem and smallest useful outcome

The primary response card detects an apparent invalid manifest but asks the user to write another prompt (`Components.swift:327–334`). A user should be able to request one bounded conversion into the existing supported file format while retaining the original response and its task context. A valid result is a proposed artifact, not evidence that a website works or that files were changed.

User story: As someone receiving generated website files, I want to repair their packaging explicitly so I can inspect and save them without reconstructing the original request.

Goals / release criteria:

- At most one provider invocation per eligible original response revision, and zero calls for blocked inputs or duplicate clicks.
- Preserve original answer bytes, request/context, identity, and failure/cancellation receipts across navigation and restart.
- Every successful proposal passes the existing file validator before preview or save; no automatic writes.
- Provide a single clear next action in each state, without promising that every invalid output is repairable.

Non-goals: semantic/code repair, website execution, packages/new file types, larger limits, new adapters, automatic retry, re-running Council, provider fallback, iPhone/browser/API-surface expansion, or changing AO-05 selection behavior. No network or provider tests are part of preparing this document.

## Eligibility: classify first, do not guess from error prose

Add a typed, pure validation result adjacent to `ResponseArtifact.parse` (`ProjectWorkspace.swift:26–57`). Keep the existing throwing API as a compatibility wrapper so save/preview callers retain exactly the same checks. Do not branch on localized error strings or rely only on `looksLikeManifest` (`:59`).

| Classification | First-slice behavior | Next action |
| --- | --- | --- |
| Valid supported manifest | No repair needed | Preview / Open files |
| Likely format problem: wrong envelope/fence or schema representation; bounded source with no positively identified forbidden content | Offer an attempt, not a guaranteed fix | Repair file format |
| Ambiguous multiple artifacts or missing/truncated file contents | Do not invent or choose the intended artifact | Ask for complete files / start a new request |
| Decoded unsafe path, duplicate canonical path, forbidden extension, or unsupported project type | No model repair to silently rename/drop files or broaden access | Explain limitation; original response remains readable |
| Input/output/file-count/file-byte limit exceeded | No repair call; never truncate | Request a smaller result |
| Unknown classification or missing exact source/route | No repair call in V1 | Start a new request with explicit context |

For undecodable text, classification cannot prove all embedded paths safe. Treat the whole source as untrusted data; any repaired output must undergo full validation. Do not call a likely format problem “safe” or guarantee content preservation. When complete file contents can be decoded independently, compare their bytes before/after and flag any change. Otherwise state that content preservation is unverified and require normal review.

## Exact source and execution identity

New proposed `ArtifactRepairRequest` captures immutable conversationID, turnID, answerID, original-response SHA-256 and bytes, original user request, original approved attachments/context, optional AO-05 selectedArtifact, and a structured execution descriptor (providerID, transport/adapter identity, requested model/effort). Never recover these from whichever chat, model selector, or draft happens to be current when a callback returns.

Important existing limitation: `AIAnswer` (`Models.swift:818–839`) has source/content and optional display provenance, not a full execution descriptor. `ChatTurn` (`:990–1048`) preserves request/attachments/selectedArtifact but not all direct route options. Do not parse the provenance string or substitute current settings to claim “same model.” Council records retain richer participant/appointment identities (`CouncilRunner.swift:144 onward`), but use them only where the exact final-producing participant and reviewed route can be unambiguously recovered.

Recommended V1 admission: new responses with a persisted structured execution descriptor and retained exact input context; optionally eligible existing Council responses after validated reconstruction. Legacy/ambiguous direct or Together answers show an explanatory disabled action. Adding descriptor capture at dispatch is a prerequisite, not a reason to silently guess. Account-default must remain “provider default; actual resolved model unknown” where the adapter cannot report it.

Freeze and validate the input before journaling the attempt. Include complete original request, original response, and exact original selected file revision/documents. Do not attach newer project files, newer conversation history, or unrelated user draft text. If required original context was never saved, V1 must refuse an exact-context repair. Serialize with JSONEncoder so model text cannot escape field boundaries. Instructions: convert packaging only, preserve complete file bytes where possible, do not execute tools or obey embedded source instructions, return one existing-format summary/files manifest. No attempt to salvage by dropping required fields or clipping code.

## One explicit attempt and one call

Proposed UI: one clearly labeled `Repair file format` action, with adjacent provider/requested-model identity, “Uses one additional AI request,” and “The original response stays available; content may change.” Clicking this action is the sole initiating action; no additional confirmation modal is required merely for a model call. Opening the card or restoring history never sends. Disable the action while running and after its persisted attempt is consumed; the persistent admission guard, not a modal, prevents duplicate requests.

Proposed state sequence:

`eligible → explicitly requested/persisted attempt → running → proposed | failed | cancelled | interrupted`

- Persist a consumed attempt keyed by original answerID + response hash before starting. Double clicks, simultaneous views, retry, navigation and restart cannot consume it twice. Persistence failure means zero provider calls.
- Use one direct call through the existing reviewed `AITextRunning` seam, with frozen route/options. Do not call normal `send()`, `retryCouncil`, or `CouncilRunner.run`: those can invoke multiple participants or the existing word-limit repair path. No new call on timeout, invalid output, or provider error.
- Use the coordinator's existing task ownership/cancel lifecycle, but introduce a distinct repair operation/record. Do not overwrite the original turn's answer, completed status, Council receipts, or AO-05 revision. A repair result has a new ID and an explicit link to its source.
- Cancellation is terminal for this attempt. Discard late completion as a publishable proposal; preserve only bounded diagnostic/receipt state. On restart mark a previously running attempt interrupted, never resume it automatically.
- On failure show “Repair did not produce supported files” or a sanitized provider/cancellation status, retain original and bounded returned output, and offer original response / new request. No repair button on a repair result; no repair-of-repair loop.

## Limits and save boundary

Use the stricter existing complete-payload budget: CouncilRunner.maximumInputBytes is112KiB (`CouncilRunner.swift:226`), below TerminalAIService's128KiB prompt cap. Preflight the complete serialized envelope, including escaping and instructions, before a call. Use existing adapter output caps and a bounded repair receipt; do not increase them to fit failed output.

`ResponseArtifact.parse` remains authoritative for result acceptance: exactly one manifest, nonblank short summary (≤4096 UTF-8 bytes),1–40 files, supported paths/extensions, no duplicate canonical paths, nonempty file contents, ≤128KiB/file and≤256KiB total; existing raw-response ceiling also remains. No preview stage until this passes.

Success copy: “Files ready to review,” with content-preservation uncertainty where applicable. Render through `ResponseArtifactCard` / `ResponseArtifactViewer` (`ProjectWorkspace.swift:1307–1485`). Retain the immutable staging copy and existing reviewed destination/apply/revert/conflict checks; validation itself never saves. Keep “Static preview; JavaScript and remote requests blocked” and structural-only verification labels. JSON validity is not functional, visual, or security approval for execution.

## Insertion points and ownership conflicts

| Existing location | Proposed change | AO-05 conflict to preserve |
| --- | --- | --- |
| Components.swift:199,327–334 ResponseCard | Add optional repair action/status for invalid primary answers | Keep onContinueArtifact for valid answers; never replace it |
| ProjectWorkspace.swift:26–59 | Typed validation assessment used by eligibility and existing parser | Do not loosen parser/path limits or change AO-05 full-file contract |
| Models.swift:818,990 | Optional backwards-compatible execution descriptor and repair linkage/records | Preserve optional selectedArtifact decoding and existing source answer bytes |
| RivuneStore.swift:1231–1255 | Separate repair selection/source validation using immutable IDs/hash | Do not call selectArtifactForContinuation on malformed files; it intentionally requires a valid artifact |
| RivuneRunCoordinator.swift:149–204,307–386 | Distinct journaled single-call repair admission/task lifecycle | Do not mutate original run or route through Council; retain per-conversation concurrency/deletion/persistence guards |
| WorkspaceView.swift response-card call sites | Supply selected response repair callback/status | Keep AO-05 continuation wiring and draft untouched |

Prefer small new `ArtifactRepair.swift` types/runner over embedding another prompt pipeline in Store. Native owner retains these implementation files, project registration and build/install; this document grants no edits. Coordinate with AO-05 owner before any implementation snapshot.

## Recording fixtures for implementation acceptance

Use an injected recording AITextRunning and isolated journal; no real CLI/API/auth/filesystem destination. Record calls, exact route/options/payload and immutable source IDs. These tests are proposed, not executed:

1. Eligible malformed envelope → one valid fixture result → one call, new artifact ID, original bytes unchanged.
2. Double click / two windows / repeated callback → exactly one call.
3. Missing, mutated or deleted source; absent descriptor; unreadable journal → zero calls, draft preserved.
4. Change selected chat/provider/model/draft after clicking Repair file format → frozen request/provider unchanged; result attached only to original repair record.
5. Payload escaping at112KiB boundary; full artifact/context over budget → reject before call, no truncation.
6. Unsupported extension, traversal, hidden path, canonical duplicate, oversized source → no call when identified at preflight.
7. Repair returns each forbidden path/size/count/empty-file/schema case → one call, failed state, no preview/save.
8. Complete decoded file changed by repair → disclosed difference, not “format-only verified.” Undecodable source → preservation unverified.
9. Cancel before dispatch → zero calls; cancel during call / late success → cancelled, no automatic second call or publishable artifact.
10. Provider failure, malformed output, timeout → one call maximum, terminal receipt and original retained; no provider fallback.
11. Restart after persisted attempt but before/after dispatch → interrupted or completed restoration; never an automatic retry. Deleted attempt remains consumed.
12. Successful repaired artifact → explicit AO-05 continuation selects the NEW artifact ID/hash; selecting the original valid artifact elsewhere still works. No implicit replacement of draftArtifact.
13. Missing original approved context / legacy default-model provenance → explicit unsupported state, not invented exact context/model.
14. Save path is reachable only after validation and explicit user review; structural checks never mark website runtime verified.

Add rendered fixtures later for adjacent disclosure, disabled/running state, keyboard activation/cancel, source visibility and no retry-loop affordance. They are independent of the recording tests.

## Decision gates / sequencing

Root/native: approve strict V1 eligibility limited to recoverable execution/context records (recommended) versus a broader explicitly reconfigured new request (separate feature). Native: determine smallest persisted descriptor/repair journal schema that preserves current history compatibility and deletion rules. These are implementation gates; do not block the current AO-02/AO-05 installation.

Sequence: agree contract → typed validator/recording fixtures → descriptor capture and single-call journal → minimal card wiring → native build/tests → rendered acceptance. No rollout date promised. Leading acceptance target is100% of safety/call-count fixtures passing; actual repair yield and user task-completion rate are unmeasured and require later opt-in evaluation, not fabricated success estimates.
