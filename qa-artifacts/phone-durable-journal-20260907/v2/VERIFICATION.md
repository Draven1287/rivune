# v2 verification receipt

Date: 2026-09-07

Verdict: ready for independent review, not approved for native integration.

The exact candidate was copied to `/private/tmp/rivune-phone-journal-v2-final.H38IYf` and tested there to avoid the synced workspace read stall. `swift test` completed without compiler warnings: **13 tests passed, 0 failures**.

The v2 adversarial additions prove:

- two `FileRemoteJournalStorage` writers cannot own the same previously absent path;
- the writer lock can be reacquired only after the first owner is released;
- a negative result revision is rejected during construction and reload;
- malformed/non-hex result and metadata digests fail decoding;
- credential-shaped raw route/model/fingerprint strings are hashed with CryptoKit SHA-256 and are absent from persisted JSON;
- an atomic write failure before dispatch or during pruning restores the previous in-memory record set.

The original v1 remains unchanged one directory above. Its per-instance lock, unchecked free-form metadata, and deferred FNV replacement are rejected and must not be integrated.

Exact v2 SHA-256 values:

```text
c01c7b4029a16d418d2ba39ac0ecd25bf0b206f35790e851ec1da5b6b6d69a3e  Package.swift
af4db6cfcaf530345b5f4d7761779d87b89c860c101fbd77f3a00b3bfddddfeb  Sources/PhoneDurableJournalCandidate/RemoteRequestJournal.swift
66c4af3a70006045d2429660659ccd1e853d5fa2a6dce5c29214f47a421db618  Tests/PhoneDurableJournalCandidateTests/RemoteRequestJournalTests.swift
25a17df0cdee9a024a8e3a97043d28b7548f65d4de775ddd537ba260b0defa27  INTEGRATION_CONTRACT.md
8313341dec2e83e9f67e91c691b47ea362dd815e1f1acdd3796dd29af2f85311  HANDOFF.md
```

This remains a foundation candidate. It does not establish reconnect streaming, physical-device readiness, background execution, live provider behavior, Council/Team phone support, artifact transfer, relay/cellular operation, installation, or release readiness.
