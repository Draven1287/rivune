# v3 verification receipt

Date: 2026-09-07

Verdict: ready for independent review, not approved for native integration.

Exact readable copy: `/private/tmp/rivune-phone-journal-v3-final.BL3i6a`

The exact copy completed `swift test` with **16 tests passed, 0 failures, and no compiler warnings**.

V3 specifically closes the v2 P1 reproduction:

- two `RemoteRequestJournal` instances over the exact same storage object cannot coexist; the second initializer returns `journalAlreadyOwned` before it can cache or dispatch;
- a journal-state lease is released after failed initialization;
- a journal-state lease is released after normal deinitialization, allowing restart to load the durable record and convert running work to `interruptedUnknown` without redispatch;
- the separate per-path storage ownership and OS writer-lock tests continue to pass.

V2's accepted privacy and semantic validation remain covered: CryptoKit SHA-256 typed metadata, negative revision rejection, invalid digest rejection, credential-shaped canary exclusion, corrupt journal fail-closed behavior, atomic-write rollback, bounded tombstones, duplicate/conflict handling, and detach-versus-Stop semantics.

Exact SHA-256 values:

```text
c01c7b4029a16d418d2ba39ac0ecd25bf0b206f35790e851ec1da5b6b6d69a3e  Package.swift
1b0c8e664b2c1316c38006fb80fd81515475e4e507d88f5e1865b78217e7612f  Sources/PhoneDurableJournalCandidate/RemoteRequestJournal.swift
234463e1d8acce69342c3e7d97bdf606fc7c1821d50aa9d3857fca414cbbe063  Tests/PhoneDurableJournalCandidateTests/RemoteRequestJournalTests.swift
3a922ba3dec9ee974f8c30c27f0fe27987ae7b85a8c6f53fc19ee129ca63fcaa  INTEGRATION_CONTRACT.md
2d6b5d70d6b40d9ed4864ce5aec10881943a44dd40390ecbbea0186df061c9ea  HANDOFF.md
```

V1 and v2 remain preserved as rejected evidence. V3 remains only a durable-idempotency foundation candidate; it does not prove native integration, physical pairing, reconnect streaming, background execution, live provider behavior, Council/Team phone support, artifact transfer, relay/cellular operation, installation, or release readiness.
