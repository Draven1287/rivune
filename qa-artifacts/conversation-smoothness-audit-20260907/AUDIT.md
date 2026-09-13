# Native conversation smoothness audit — 2026-09-07

## Verdict

A P1 transcript auto-follow defect was reproduced from the accepted frozen 0623 source and corrected in an isolated candidate. When an existing turn changed while the reader was near the bottom, the view scrolled to the start of the latest turn. A long answer or multi-stage Council update could therefore rewind the viewport away from new content. The candidate follows the transcript bottom for existing-turn updates while preserving new-turn placement, Together final-answer anchoring and the unread-content indicator.

The candidate is ready for independent integration and rendered-native review. It has not been copied into shared source, installed or exercised with live providers.

## Reproduced finding

### P1 — Existing-turn updates rewind auto-follow to the start of the turn

In the frozen 0623 `WorkspaceView`, `onChange(of: store.turns)` combines two cases (`Rivune/WorkspaceView.swift`, lines 288–302):

- a newly appended turn; and
- any existing-turn mutation while `isNearTranscriptBottom` is true.

Both call `scrollToLatestTurnStart`, whose anchor is `.top` (`Rivune/WorkspaceView.swift`, lines 323–331). The concrete trigger is a response whose latest turn is taller than the viewport, followed by another result or stage publication while the reader is near its bottom. `mergeWorkspaceRun` replaces the selected conversation's turn array for every coordinator publication (`Rivune/RivuneWebWorkspace.swift`, lines 283–308), so the faulty branch applies to normal multi-stage Council progress. Current transports publish coarse phase/results rather than token streams; the same branch would also rewind on every incremental stream update when streaming is added.

The policy was extracted without changing behavior. The initial synthetic test then failed with:

`XCTAssertEqual failed: ("latestTurnStart") is not equal to ("transcriptBottom")`

The correction distinguishes four actions:

- a new turn scrolls to that turn's start;
- an existing-turn update near the bottom follows `transcript-bottom`;
- a completed Together result near the bottom uses its final-answer anchor;
- a reader away from the bottom keeps position and receives the new-content indicator.

No visual styling or control changed.

## Additional audit findings

### P2 — Progress publication performs redundant synchronous full-history writes on the main actor

`RivuneRunCoordinator` is `@MainActor`. Every update encodes and atomically writes the complete run journal before publishing (`Rivune/RivuneRunCoordinator.swift`, lines 398–434). The synchronous callback then calls `mergeWorkspaceRun`, which calls `saveConversations()` for every publication (`Rivune/RivuneWebWorkspace.swift`, lines 283–308). Standard history save encodes the complete conversation list, reads and decodes the existing primary, atomically writes a backup, then atomically writes the new primary (`Rivune/RivuneStore.swift`, lines 3441–3472).

The concrete trigger is any Council progress event in a large history. One event can synchronously perform two full JSON encodes and up to three atomic writes on the UI actor. This is a source-proven write amplification path; elapsed UI stalls were not measured, so no latency number is claimed. No candidate was made because safely coalescing durable writes needs a separate persistence contract and crash-recovery test.

### P2 — Settings return publishes a focus request that no composer consumes

`closeWorkspaceSettings()` increments `workspaceReturnFocusRevision`, and the existing state-level test verifies only that counter. Frozen 0623 source contains no production observer of `workspaceReturnFocusRevision`, no observer of `newConversationFocusRequest`, and no composer `FocusState`; the only `FocusState` found is for the Settings back button. The concrete trigger is Settings → Back to workspace: state is preserved, but programmatic composer focus restoration is not implemented or verified.

Draft preservation itself is covered by existing isolated tests for Settings round-trip, conversation switching, relaunch and attachment persistence. No draft-loss defect was reproduced in this pass.

### Open rendering case — conversation switch scroll state

The transcript owns `isNearTranscriptBottom` independently of the selected conversation and has no selection-change scroll policy. Switching between histories with equal turn counts can reuse the prior scroll geometry until layout updates. This remains a source-level risk, not a reproduced defect; it needs a mounted native scroll-position fixture before correction.

## Verification

- Behavior-equivalent extracted baseline policy: 1 passed, 1 failed; the existing-turn case returned `latestTurnStart`.
- Corrected focused policy suite: 2 passed, 0 failed, 0 skipped.
- Corrected complete `Rivune Mac` suite: 325 passed, 0 failed, 0 skipped.
- Shared source edits: 0.
- Provider calls: 0.
- Installs: 0.

The full-suite count uses frozen 0623 plus the two new smoothness tests. It does not include the separately staged Council appointment patch.

Exact result bundles and hashes are recorded in `verification.json` and `source-manifest.json`.

## Remaining limits and next case

The pure policy suite proves routing of scroll actions, not AppKit/SwiftUI viewport motion. Independent integration should mount a transcript taller than the viewport, place it near the bottom, publish several mutations to one turn, and assert that the visible bottom remains stable. The next highest-impact untested case is a conversation switch between two long histories with equal turn counts and different saved positions, followed by Settings open/close, verifying deterministic scroll restoration and actual composer focus without altering either draft.

