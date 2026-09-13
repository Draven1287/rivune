# Retry context restoration candidate — September 7, 2026

Status: reconstructed isolated source and native integration tests; not app-integrated, typechecked, installed or accepted. The original temporary directories were absent after reboot. This package does not replace historical evidence with a new passing claim.

## Preserved implementation

`source/Rivune/WorkspaceRetryContext.swift` restores the optional immutable, checksummed, conversation/turn/prompt-bound ApprovedPromptContext. It stores approved project instructions, original role-aware history, selected document bytes and selected artifact reference. Legacy absence is explicit and blocks silent reconstruction. Declared and actual document sizes are bounded before summing. Checksum validation detects accidental corruption; ordinary new-run readiness, consent and source validation remain required.

`restore_candidate.py` reconstructs the four integration deltas only onto the exact pre-reboot baseline hashes. It requires accepted0725 Models, WebWorkspace and Coordinator, plus corrected FS02 r2 Store. It refuses unknown baselines, ambiguous anchors or an existing output directory. It writes only a new isolated output and never edits its inputs. Exact baselines are still being recovered by the native owner; the current shared Store has a different hash and is not an accepted substitute.

The reconstructed r2 includes a material correction caught during source review: Together's runner rebuilds ChatTurn on progress and completion. Coordinator `update` must carry the run's admitted retryContext forward rather than losing it when replacing the turn. Source matching also checks the stored mode. This correction has not yet run in the actual coordinator.

## Fresh evidence

- Python syntax of the restoration script passed.
- Four restoration safety checks passed: reject wrong baseline, create no partial output on mismatch, preserve baseline bytes, and preserve existing output. See RESTORATION_GUARD_CHECKS.json. These do not validate app behavior.
- Swift syntax-only parsing of the restored snapshot source and reconstructed integration test file exited 0. Xcode emitted local event-stream/cache warnings. Syntax parsing does not resolve production types or execute tests.

Historical pre-reboot evidence was seven hostless snapshot test functions / fifteen cases passing. The temporary harness and logs are missing, so no current functional-test pass is claimed. The uncompleted pre-reboot test-patch tool was missing after restart; the native test source here is a new reconstruction.

## Tests prepared; not executed

`source/RivuneTests/WorkspaceRetryContextIntegrationTests.swift` calls actual production entry points with a recording runner:

1. Save completed original context, load through RivuneHistoryStorage, append later history, retry through RivuneStore, and compare the two provider-bound prompts exactly while preserving the current draft and mode.
2. Observe Together progress and terminal updates, then reopen the coordinator journal and verify that the admitted snapshot survives every replacement.
3. Corrupt an explicit snapshot while a valid backup exists and confirm history cannot silently fall back, save over the primary, or alter the backup.
4. Retry a legacy turn without a snapshot and confirm a clear notice, no dispatch and no draft loss.

Before running the full native suite, update existing FS02 synthetic retry fixtures to attach valid original snapshots. Otherwise the new intended legacy guard prevents those fixtures from exercising consent, unavailable-provider and oversized-request behavior. Preserve their original assertions. Include the stale-consent conversation-switch/deletion fixture as well; do not weaken or delete it. Add target membership for the new source/test files. Run the recording-runner, history, journal, consent and draft tests after central clears the test-host/lifecycle restrictions. Preserve Council behavior.

iOS retry remains unchanged and requires separate bridge integration. This candidate freezes prompt context, not model/effort selection. No general native or release readiness claim is made. Do not bundle it into the bounded stability diagnostic build.
