# Coalesced history persistence: matched timing and durability supplement

Date: 2026-09-07  
Candidate under review: `qa-artifacts/history-write-coalescing-candidate-20260907/source.patch`

## Candidate disposition

The production candidate remains byte-for-byte frozen, isolated and not integrated. Its independent durability and product acceptance decision belongs to the Audit Rivune project updates hub. It is not part of the currently accepted core list by implication.

No shared source, build, installed application, rendered UI or live provider was changed or exercised by this supplement.

## Comparable before and after timing

Both harnesses use:

- 120 conversations and 720 turns
- approximately 1.94 MB encoded history
- 300 pre-existing journal runs and approximately 0.76 MB encoded journal
- two immediate independent Council drafts and one immediate lead synthesis
- seven workspace publications
- `@MainActor` execution with a main-queue precondition
- three repeated runs on the same local MacBook Air Xcode destination

| Measurement | Frozen 0623 | Coalescing candidate |
| --- | ---: | ---: |
| History saves per run | 7 | 1 |
| Source-counted total atomic writes | 21 | 9 |
| Measured history-save main-actor time | 197.11–207.75 ms | 31.63–34.38 ms |
| End-to-end zero-latency synthetic run | 470.29–523.78 ms | 76.62–92.23 ms |

The measured history-save reduction is 82.6%–84.8% across the observed ranges. End-to-end values include journal persistence, scheduling and test polling; they are comparable controlled harness results rather than claims about rendered UI responsiveness.

The post-change harness uses the actual coalescing `RivuneStore` path and production `RivuneHistoryStorage.save`. It observed exactly one history save in every run. The frozen candidate still performs seven synchronous journal commits.

## Journal-write failure correction

The frozen candidate audit previously overstated the persistence guarantee. `RivuneRunCoordinator.update` attempts the journal commit first. If it fails, it converts the in-memory run to explicit failed state, records a storage error, and publishes that failure notification. The failed notification was not committed to the unavailable journal. It does not publish provider success as a successful terminal state.

This behavior is unchanged by coalescing and is explicitly corrected in `qa-artifacts/history-write-coalescing-candidate-20260907/CORRECTION.md`.

## Storage-backed durability evidence

Four supplemental tests use real temporary journal and conversation-history files:

1. **Crash after running publication:** a copied running journal is reopened; recovery marks it interrupted, invokes the production merge/projection path once, preserves the interrupted turn, and makes zero provider calls.
2. **Journal-write failure:** after initial admission, the journal directory is replaced by a blocking file. Provider completion becomes an explicit failed state with storage error and is never reported as successful terminal completion.
3. **Projection failure:** a real invalid history root causes the terminal projection to fail and stay dirty. Repairing the path and navigating flushes the complete projection without another provider call.
4. **Deletion nonresurrection:** deletion during a dirty running projection removes the conversation from primary and backup history, removes the journal run, retains the consumed request identity, rejects reuse, and ignores late provider success.

Focused durability result: 4 passed, 0 failed. The complete frozen-candidate-plus-supplement suite passed 331 tests with 0 failures and 0 skips.

The isolated test process intentionally skips normal application launch recovery. The crash test therefore invokes the same production journal-to-conversation merge and single projection explicitly after reopening the journal; this distinction is asserted in the fixture and does not represent an installed-app launch test.

## Remaining limit and decision

Coalescing removes repeated full conversation-history saves. Journal JSON encoding, atomic write and permission update still run synchronously on the main actor for all seven publications. No actual rendered-frame stall has been measured.

Decision requested from the audit owner: accept or reject the frozen coalescing patch for shared integration based on the storage-backed evidence and matched timing. Moving journal I/O to a serial persistence actor remains a separate design and should not block this bounded decision.

