# Verification receipt

Date: 2026-09-07

Scope: isolated Swift package only. Shared native source remained unchanged by this work.

`swift test` was run from a fresh `/private/tmp` copy because the synced workspace stalled while SwiftPM read the package. Result: **11 tests passed, 0 failures** on arm64 macOS 14 target compatibility using Apple Swift 6.4.

Covered behavior:

- atomic reservation failure returns `storageUnavailable` and leaves no dispatchable record;
- a write failure during record pruning restores the original completed record;
- matching duplicates reattach/replay and conflicting ID reuse never dispatches;
- running and stop-requested records recover as `interruptedUnknown` after restart;
- completed records replay a verified workspace reference after restart;
- detachment is read-only while explicit Stop durably records cancellation intent;
- corrupt and oversized journals fail closed without overwrite;
- bounded record pruning preserves consumed-ID tombstones;
- a full active journal refuses new work;
- persisted metadata excludes prompts, answers, credentials, sessions, and diagnostics;
- unsafe free-form metadata is rejected before persistence.

SHA-256:

```text
c01c7b4029a16d418d2ba39ac0ecd25bf0b206f35790e851ec1da5b6b6d69a3e  Package.swift
6664b8e57435f47fff79c6457c622da3b8c4c8dd0db3c7666bbf72e95a158efa  Sources/PhoneDurableJournalCandidate/RemoteRequestJournal.swift
9e3b41b0aa6f8297158b8dc821de5e8c0075f86992f8a587fd939ae36138d3b0  Tests/PhoneDurableJournalCandidateTests/RemoteRequestJournalTests.swift
04c0b677fc4ce9f881fd910d1ef9fc14f15e79472445ea619abf8b466fe98c9d  INTEGRATION_CONTRACT.md
a21ffc198ae9bfa89036979f19d91c663f26875e8bff0eaa8e14e92217b81cf8  HANDOFF.md
```

The candidate intentionally does not prove physical pairing, reconnect transport, background execution, live provider calls, Council/Team serialization, complete artifact retrieval, cellular relay, wake behavior, installation, or distribution.
