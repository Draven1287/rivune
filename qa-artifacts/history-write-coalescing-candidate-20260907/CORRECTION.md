# Correction — journal-write failure publication

Date: 2026-09-07

The durability wording in `AUDIT.md` is too absolute where it says no terminal state is exposed before the journal accepts it.

The accurate frozen 0623 behavior is:

- `RivuneRunCoordinator.update` attempts to persist the provider-derived state before publication.
- If that write succeeds, it publishes the admitted running or terminal state.
- If that write fails, the coordinator cancels the task, changes the in-memory run to explicit `.failed`, attaches the storage error, marks journal storage unavailable and publishes that failed state so the UI can report the problem.
- The failed notification state itself was not written to the unavailable journal. A provider-success terminal state is not published as successful after the failed commit.
- The coalescing candidate preserves this behavior. Its terminal history projection may save the explicit failed state after the journal-write failure.

Supplemental storage-backed tests now exercise this branch, interrupted running-journal recovery, real history-projection failure and retry, and deletion nonresurrection. They are kept outside the frozen candidate patch and are documented in `qa-artifacts/history-write-coalescing-benchmark-20260907/`.

The original candidate `AUDIT.md`, `source.patch`, candidate files and `source-manifest.json` remain byte-for-byte unchanged.

