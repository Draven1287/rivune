# Durable phone request journal v4 — verification

Status: isolated, review-pending foundation candidate. No shared native source, UI, installed app, provider session, bridge, account, deployment, or release state was changed.

## Clean verification

- Clean copied package: `/private/tmp/rivune-phone-journal-v4-final.hEVX9j`
- Command: `swift test --package-path /private/tmp/rivune-phone-journal-v4-final.hEVX9j`
- Result: 18 tests passed, 0 failures.
- Compiler diagnostics: no warnings or errors.
- Platform reported by Swift Testing: `arm64e-apple-macos14.0`.

The v4 regressions specifically prove that a stale release token cannot remove a successor owner's lease and that a late initialization failure releases only its own lease. The existing suite also covers restart ambiguity without redispatch, exact duplicate reattachment, immutable identity/fingerprint conflicts, explicit Stop versus observation detach, atomic write failure, corrupt and semantically invalid storage, bounds and tombstones, same-storage and file-writer ownership conflicts, result replay references, and persisted-metadata privacy.

## Frozen SHA-256

- `Sources/PhoneDurableJournalCandidate/RemoteRequestJournal.swift`: `24f78f3fa4cdcfae5f8690fb28fa7505ad3138b8fe8dc2992489d4654c97c4c5`
- `Tests/PhoneDurableJournalCandidateTests/RemoteRequestJournalTests.swift`: `a09917a31abab2fdd09dad6b0a3578e40914b92cc52dc64240d691369a84b056`
- `INTEGRATION_CONTRACT.md`: `d0ab860f211b0f2dd9f2244e2105387bbe9cb0e85c909c29d2d611ce56df1987`
- `HANDOFF.md`: `0b224089eeda2ebaa2193efbc86dd10b09dd321ae32ea3044faf91c5f7ada390`
- `Package.swift`: `c01c7b4029a16d418d2ba39ac0ecd25bf0b206f35790e851ec1da5b6b6d69a3e`

## Remaining boundary

Passing this isolated package does not prove native integration, physical-device reconnect, background execution, remote streaming, Council serialization, artifact retrieval, relay/cellular behavior, wake behavior, signing, notarization, or distribution. A native owner must manually integrate the contract across request admission, the coordinator's durable results, bridge cancellation, and phone rendering, then rerun the full native suite and builds.
