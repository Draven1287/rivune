# Native-owner handoff — v2

Status: isolated candidate only. No shared Rivune source, UI, installed app, provider session, bridge, or account state was changed.

The component in `Sources/PhoneDurableJournalCandidate/RemoteRequestJournal.swift` provides:

- atomic request reservation before provider dispatch;
- one enforceable writer per journal path using an in-process lease plus an OS advisory file lock;
- immutable ID-to-fingerprint and admitted-identity binding;
- matching duplicate reattachment and completed-result replay by workspace reference;
- conflict rejection with no dispatch;
- restart recovery to `interruptedUnknown`, never automatic redispatch;
- explicit separation of view detachment from user Stop;
- fail-closed corrupt/oversized storage behavior;
- bounded records with consumed-ID tombstones and fail-closed full-journal behavior;
- typed/canonical CryptoKit SHA-256 metadata that excludes prompts, answers, credentials, sessions, and raw diagnostics;
- result-reference validation on creation, transition, and reload.

Run `swift test` from this directory. The fixtures exercise write failure, restart while running, restart after completion, duplicate/conflict behavior, detach versus Stop, corruption, bounds/pruning, a real-file two-writer race, semantically corrupt loaded records, and adversarial metadata privacy.

v1 remains preserved one directory above as rejected evidence. v2 replaces its deferred FNV helper with CryptoKit SHA-256 and does not rely on later production surgery for the security boundary.

Integration must be manual because current 0623 source is active and the phone path spans `Models.swift`, `RivuneStore.swift`, `RivuneRunCoordinator.swift`, bridge cancellation semantics, and iPhone rendering. Apply the host sequence in `INTEGRATION_CONTRACT.md`; do not paste this component over newer source wholesale.
