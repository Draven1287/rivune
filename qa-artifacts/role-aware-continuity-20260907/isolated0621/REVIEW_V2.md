# Independent V2 re-review — role-aware production candidate

Status: **P1 closed; changes requested for deterministic verification.** The corrected implementation restores the direct selected-artifact provider contract, but the six-test production-path suite is timing-dependent and did not pass an independent rerun.

## V1 P1 disposition — closed

`candidate/Rivune/RivuneStore.swift` now appends the exact existing `ArtifactContinuation.instructions` string only when `selectedArtifactReference` is present. The role-aware wrapper still marks artifacts as untrusted reference and keeps `currentUserRequest` at highest precedence.

The new `testActualDirectArtifactPathsPreserveTypedAuthorityAndCompleteFileContract` submits the same immutable artifact through direct ChatGPT and Claude coordinator routes. It verifies one call per route, exact artifact equality, current-request precedence, the artifact reference boundary, and the complete-file JSON/no-patch contract. This test passed independently.

## P2 — Council production-path test is timing-dependent

The test class uses a fixed `for _ in 0..<200 { await Task.yield() }` settle helper before asserting Council completion. In the independent V2 run, the Council test observed two calls instead of three, zero lead calls instead of one, and a still-running coordinator. The other five tests passed. The Xcode result recorded:

- `XCTAssertEqual failed: ("2") is not equal to ("3")`
- `XCTAssertEqual failed: ("0") is not equal to ("1")`
- `WorkspaceRunStatus.running` instead of `complete`

This is consistent with the assertions running before the asynchronous lead phase completes; it is not evidence that production Council omitted the lead. It does mean the handoff's `6 passed` receipt is not independently repeatable and cannot serve as a stable acceptance gate.

Required correction: replace the fixed-yield settle helper with an event-driven or bounded condition wait for the recording runner to receive three calls and the coordinator run to reach a terminal state. Fail with a clear timeout if either condition is not met. Then rerun the six-test class and the full Mac suite.

## Identity and scope

- `role-aware-production-v2.patch` has 783 lines, dry-runs cleanly against `base/`, and reconstructs all seven candidate files byte-for-byte.
- All seven candidate Git blob hashes match the corrected `HANDOFF.md`.
- Only `RivuneStore.swift` and `RivuneRunCoordinatorTests.swift` differ between the V1 and V2 candidate payloads; the substantive V2 changes are the conditional artifact contract and its recording test.
- The V1 rejection remains preserved in `REVIEW.md`.
- Full-suite 303/303 and generic iOS build success remain owner-recorded results in this re-review. No shared source, installed app, physical phone, provider, account, or release state was changed.
- Phone host rejection and zero-provider-call acceptance remain explicitly deferred to the newer native phone integration.
