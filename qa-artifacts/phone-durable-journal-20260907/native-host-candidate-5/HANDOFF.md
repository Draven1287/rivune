# Native phone host integration candidate 5

Candidates 1 through 4 remain preserved and rejected. Candidate 5 retains Candidate 3's independently reconstructed connection/result foundation and Candidate 4's verified offline Stop persistence, then closes Candidate 4's sole remaining Stop-before-admission defect.

The Mac journal now persists a bounded pre-admission cancellation marker containing only request ID, request fingerprint, the hashed paired-device route identity, and time. It is written before acknowledging Stop. The phone receives an accepted terminal cancelled update and clears its pending operation. A delayed prompt with the same owner and fingerprint resolves as cancelled without provider dispatch, including after Mac restart; changed fingerprints or different paired devices conflict. Repeated Stops are idempotent. Version-1 journals decode with an empty marker list and are rewritten as version 2.

Verification on this exact isolated source: 19 focused durable-host tests passed; the full native Mac suite passed 343 tests with zero failures and zero skips; Mac Release and generic iOS Simulator Release both succeeded. Xcode emitted only its expected multiple-destination and AppIntents metadata-skip warnings.

No live provider call, physical-iPhone session, shared-source apply, installed-app replacement, publishing, or release occurred. Real-device pairing and execution remain explicitly unverified.
