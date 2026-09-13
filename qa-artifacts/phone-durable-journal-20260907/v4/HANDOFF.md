# Native-owner handoff — v4

Status: isolated candidate only. No shared Rivune source, UI, installed app, provider session, bridge, or account state was changed.

The component in `Sources/PhoneDurableJournalCandidate/RemoteRequestJournal.swift` provides:

- atomic request reservation before provider dispatch;
- one enforceable writer per journal path using an in-process lease plus an OS advisory file lock;
- one enforceable journal-state owner per storage lease key, including when the exact same storage object is reused;
- token-owned RAII release semantics, so failed initialization or stale deinitialization cannot release a successor owner's lease;
- immutable ID-to-fingerprint and admitted-identity binding;
- matching duplicate reattachment and completed-result replay by workspace reference;
- conflict rejection with no dispatch;
- restart recovery to `interruptedUnknown`, never automatic redispatch;
- explicit separation of view detachment from user Stop;
- fail-closed corrupt/oversized storage behavior;
- bounded records with consumed-ID tombstones and fail-closed full-journal behavior;
- typed/canonical CryptoKit SHA-256 metadata that excludes prompts, answers, credentials, sessions, and raw diagnostics;
- result-reference validation on creation, transition, and reload.

Run `swift test` from this directory. The fixtures exercise write failure, restart while running, restart after completion, duplicate/conflict behavior, detach versus Stop, corruption, bounds/pruning, a real-file two-storage race, an exact same-storage/two-journal attempt, lease release after normal and failed initialization, stale-release ownership isolation, semantically corrupt loaded records, and adversarial metadata privacy.

v1, v2, and v3 remain preserved above as rejected evidence. v4 retains v2's accepted CryptoKit and semantic-validation corrections, v3's journal-state ownership above the storage writer lock, and replaces key-only release with token-owned RAII after the v3 stale-release race was independently reproduced.

Integration must be manual because current 0623 source is active and the phone path spans `Models.swift`, `RivuneStore.swift`, `RivuneRunCoordinator.swift`, bridge cancellation semantics, and iPhone rendering. Apply the host sequence in `INTEGRATION_CONTRACT.md`; do not paste this component over newer source wholesale.
