# Native-owner handoff

Status: isolated candidate only. No shared Rivune source, UI, installed app, provider session, bridge, or account state was changed.

The component in `Sources/PhoneDurableJournalCandidate/RemoteRequestJournal.swift` provides:

- atomic request reservation before provider dispatch;
- immutable ID-to-fingerprint and admitted-identity binding;
- matching duplicate reattachment and completed-result replay by workspace reference;
- conflict rejection with no dispatch;
- restart recovery to `interruptedUnknown`, never automatic redispatch;
- explicit separation of view detachment from user Stop;
- fail-closed corrupt/oversized storage behavior;
- bounded records with consumed-ID tombstones and fail-closed full-journal behavior;
- a schema that excludes prompts, answers, credentials, sessions, and raw diagnostics.

Run `swift test` from this directory. The fixtures exercise write failure, restart while running, restart after completion, duplicate/conflict behavior, detach versus Stop, corruption, bounds/pruning, and metadata privacy.

Before integration, replace the candidate's documented non-cryptographic `identityDigest` helper with the production canonical SHA-256 utility already used by `RivuneStore.remoteRequestFingerprint`. Preserve the ordering and exact admitted fields. The helper is adequate only for isolated behavior tests and must not ship.

Integration must be manual because current 0623 source is active and the phone path spans `Models.swift`, `RivuneStore.swift`, `RivuneRunCoordinator.swift`, bridge cancellation semantics, and iPhone rendering. Apply the host sequence in `INTEGRATION_CONTRACT.md`; do not paste this component over newer source wholesale.
