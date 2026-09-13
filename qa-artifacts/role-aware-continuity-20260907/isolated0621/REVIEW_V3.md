# Independent V3 review — role-aware production candidate

Status: **accepted as a frozen source-integration candidate.** The V1 direct-artifact P1 and V2 nondeterministic-test P2 are closed. No new blocker was found in the V3 delta.

## Verification

- `role-aware-production-v3.patch` is 801 lines, has SHA-256 `420ddecd98d0b19bf34eeda62748c592c3774254b7a4358855817f5904896cb5`, dry-runs cleanly against `base/`, and reconstructs all seven candidate files byte-for-byte.
- All seven candidate Git blob hashes match `HANDOFF.md`.
- The V3 delta from V2 changes only `RivuneRunCoordinatorTests.swift`: fixed `Task.yield()` sampling is replaced with a bounded observable-state wait of up to 300 ten-millisecond intervals.
- The helper waits for the requested recorded-call count and, for Council, the exact run to leave `.running`. Final assertions still require exactly three calls, exactly two independent-draft prompts, exactly one appointed-lead prompt, the typed authority fields on every call, and `.complete` status.
- Four consecutive independent runs of `RoleAwareProductionEntryPathTests` passed: six tests per run, 24 test executions, zero failures. Exact command and result-bundle paths are preserved in `INDEPENDENT_V3_TEST_RECEIPT.json`.
- The direct selected-artifact test continues to pass for both ChatGPT and Claude coordinator routes, including exact immutable artifact equality, current-request precedence, the untrusted-reference boundary, and the exact complete-file JSON/no-patch instructions.

## Integration boundary

Acceptance applies to the frozen seven-file source candidate and its deterministic recording tests. The native owner must merge `RivuneStore.swift` with the newer shared phone admission and immutable request-ID work rather than applying the frozen patch blindly, then rerun the complete Mac suite and Mac/iOS builds on the merged source.

The owner-reported 303/303 full Mac suite and generic iOS Simulator build were not repeated in this V3 review. No shared source, installed app, provider, account, physical phone, publishing, or release state was changed. Phone host rejection with zero provider calls remains a separate acceptance item.
