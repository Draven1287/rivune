# Conversation-history coalescing candidate — 2026-09-07

## Verdict

The measured write amplification supports a small coalescing candidate. The run journal remains unchanged and is still synchronously committed before every publication. The duplicate conversation-history projection is kept in memory while a run is active and written once when that run becomes complete, failed, cancelled or interrupted.

The candidate is isolated from shared source and ready for independent integration review. It has not been installed or run with live providers.

## Behavior

- Every workspace-run merge updates the in-memory conversation and selected transcript immediately.
- A running merge marks the conversation-history projection dirty and skips its full history write.
- A terminal merge flushes the complete conversation snapshot once.
- New conversation, conversation selection and Settings entry flush dirty progress before navigation.
- Termination admission forces a history save when no task is active. Existing active-work refusal remains unchanged.
- A failed projection remains dirty, exposes the existing storage notice and retries at the next flush boundary without provider work.
- Explicit conversation mutations and privacy deletion still call `saveConversations` immediately. Privacy deletion keeps its primary-and-backup rewrite mode.
- Launch recovery still merges journal records into conversations with `persist: false`, then performs one history save.

The candidate adds an injectable history saver solely to make persistence counts and failure recovery deterministic in tests. The production default calls the same `RivuneHistoryStorage.save` path and preserves isolated-test no-op behavior.

## Durability boundary

`RivuneRunCoordinator.swift` is byte-for-byte unchanged from frozen 0623. Its `update` method still calls `persist()` before `publish()`, including terminal updates. Coalescing therefore removes no authoritative journal commit and cannot expose a terminal provider result before the journal accepts it.

Conversation history remains a projection of that journal during active work. If a crash occurs before terminal projection, the existing launch path restores the journal, marks interrupted work explicitly, merges it into conversations and writes the projection once. No provider work starts during restoration.

## Synthetic verification

`ConversationHistoryProjectionTests` verifies:

1. A real synthetic Council execution emits seven workspace publications but invokes the history saver exactly once with the complete final answer.
2. New-chat navigation, conversation selection, Settings entry and termination admission flush dirty projections.
3. A failed terminal projection remains dirty and succeeds at the next boundary without any provider call.

Results:

- Focused candidate suite: 3 passed, 0 failed, 0 skipped.
- Complete `Rivune Mac` suite: 326 passed, 0 failed, 0 skipped.
- Shared source edits: 0.
- Live provider calls: 0.

The full count is frozen 0623 plus the three candidate tests. It does not include other independently staged patches.

## Measured basis and expected reduction

The separate controlled profile used a 1.94 MB history and 0.76 MB journal. Seven publications caused 21 source-counted atomic writes and 197–208 ms of directly measured main-actor history-save time across three runs. This candidate reduces history-saver invocations from seven to one for the same publication shape, yielding nine source-counted writes: seven journal writes plus one history backup and one history primary.

This suite verifies the reduced call count. It does not rerun the wall-time profile against the candidate, so the earlier 28–32 ms single-save observation remains an estimate of candidate history-write time rather than a post-change benchmark.

## Limits

Journal encoding and I/O still run synchronously on the main actor for each publication. Moving them requires a larger serial persistence-actor refactor with ordering and failure semantics; this candidate deliberately does not attempt that. History projection also remains synchronous at terminal and navigation boundaries.

