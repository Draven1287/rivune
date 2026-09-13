# Main-actor history write profile — 2026-09-07

## Result

The frozen 0623 persistence path performs measurable synchronous work on the main actor for every Council publication. In a controlled 1.94 MB conversation history with a 0.76 MB pre-existing run journal, one synthetic Council run published seven states. Each publication synchronously persisted the journal and then saved the full conversation history.

Across three identical runs on the local MacBook Air test destination:

| Measurement | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Publications | 7 | 7 | 7 |
| Median full-history save | 30.03 ms | 28.01 ms | 29.42 ms |
| Maximum full-history save | 30.15 ms | 29.10 ms | 32.18 ms |
| Total measured history-save time on main actor | 207.61 ms | 197.11 ms | 207.75 ms |
| Median history JSON encode alone | 8.02 ms | 7.79 ms | 8.25 ms |
| End-to-end zero-latency synthetic Council run | 523.78 ms | 470.29 ms | 482.08 ms |

These are local controlled measurements, not a general device benchmark. The end-to-end number includes journal persistence, synthetic Council scheduling and test polling. The history-save timings are directly measured around production `RivuneHistoryStorage.save` calls executed under an `@MainActor` test with a main-queue precondition.

## Controlled fixture

- 120 conversations
- 720 completed turns
- 1,944,590–1,944,596 bytes of encoded conversation history
- 300 pre-existing completed journal runs
- 757,530–757,549 bytes in the initial encoded journal
- 3 immediate synthetic provider calls: two independent Council drafts and one lead synthesis
- 7 coordinator publications
- No live provider, installed application or shared-source mutation

The small byte differences come from generated UUIDs. Counts, payload sizes and execution shape are otherwise fixed.

## Exact amplification per measured run

Source inspection plus seven successful publications establishes:

- 7 complete journal encodes
- 7 complete history encodes
- 14 existing-history reads and decodes: one in `artifactRecoveryRequired` and one before backup creation per history save
- 7 journal atomic writes
- 14 history atomic writes: backup plus primary
- 21 atomic writes total
- 7 journal permission updates

This count excludes the one fixture warm-up save and the profile-output write. It describes the production persistence calls made inside the measured publication seam.

`RivuneRunCoordinator` is `@MainActor`; `update` calls `persist()` before `publish`. `publish` synchronously calls `RivuneStore.mergeWorkspaceRun`, which calls `saveConversations()` for every publication. Standard history save validates the current primary, encodes all conversations, validates the primary again for backup, and writes both backup and primary.

## Minimal persistence strategy

Keep the run journal as the authoritative durable progress record and preserve its existing persist-before-publish order. Remove only the duplicate conversation-history save for nonterminal run publications:

1. `RivuneRunCoordinator` continues to persist every admitted state to its journal before calling `publish`. No terminal state, cancellation or retained draft is exposed before its journal snapshot succeeds.
2. `RivuneStore.mergeWorkspaceRun` continues to update in-memory conversations and the selected transcript for every publication.
3. While `run.status == .running`, mark conversation history dirty and skip `RivuneHistoryStorage.save`. The journal already contains the durable progress snapshot.
4. On `.complete`, `.failed`, `.cancelled` or `.interrupted`, save conversation history once. The terminal journal has already succeeded before this callback.
5. On launch, keep the existing journal-to-conversation merge and one conversation save. This recovers a crash during a running task without needing intermediate duplicate history files.
6. Keep privacy deletion, explicit user history mutations and termination admission as immediate flush boundaries. They must not use progress coalescing.
7. If the terminal conversation save fails, retain the journal as authoritative, report the storage error and retry the history projection later; never roll back or relabel the already durable run.

For the measured seven-publication shape, this first increment would retain all seven journal writes but reduce history saves from seven to one:

- atomic writes: 21 → 9
- full-history reads/decodes: 14 → 2
- full-history encodes: 7 → 1
- measured history-save main-actor work: roughly 197–208 ms → one observed save of roughly 28–32 ms for this fixture

The final estimate uses observed per-save measurements; it is not a post-change measurement. Moving the remaining journal/history I/O off the main actor requires a later serial persistence actor and explicit ordering tests. That broader refactor is not part of this proposal.

## Required synthetic acceptance

- Seven progress publications produce seven journal commits and one terminal history projection.
- A crash after any running publication restores the latest journal state, merges it once and never launches provider work automatically.
- Terminal publication remains impossible when the terminal journal commit fails.
- A terminal history projection failure preserves the terminal journal, exposes a storage problem and can be retried without provider execution.
- Cancellation and failed-lead retained drafts survive the same path.
- Privacy deletion rewrites primary and backup immediately and cannot be coalesced.
- Termination admission flushes dirty conversation history before allowing quit/update.
- Switching conversations during a run continues to update only the selected in-memory transcript while background progress remains recoverable.

## Artifacts

- `measurements/run1.json` through `run3.json`: raw measurements
- `harness/profile-harness.patch`: exact test-only instrumentation against frozen 0623
- Xcode result bundles are listed in `verification.json`

