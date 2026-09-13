# Native phone host integration candidate 3

Candidates 1 and 2 remain preserved and rejected. Candidate 3 closes all three candidate-2 findings: peer validation and the actual send share one bridge-queue transaction; a pending iPhone operation is durably bound to the original paired Mac identity; and repeated Stop after a terminal run verifies the persisted full-result reference before returning data, otherwise settling the phone as interrupted without redispatch or disclosure.

The candidate also preserves owner-bound request admission, durable request and Stop recovery, navigation detachment, exact full-turn terminal digests, duplicate suppression, restart-safe result reuse, and explicit terminal cancellation/failure/interruption updates.

Verification on this exact isolated source: 15 focused host tests passed; the full native Mac suite passed 339 tests with zero failures and zero skips; Mac Release and generic iOS Simulator Release both succeeded. The only build diagnostics are Xcode's expected AppIntents metadata-skip warning because the targets do not link AppIntents.

No live provider call, physical-iPhone session, shared-source apply, installed-app replacement, publishing, or release occurred. A physical same-network iPhone run remains required before claiming real-device pairing and execution.
