# Native validation supplement — 2026-09-09

This supplements, and does not rewrite, `DIRECT_HOST_NATIVE_RECEIPT_20260909.md` (SHA-256 `81d68252e7ade7dafa1a348dabae58a56640c724ca0d69d1ec447aff089fee8e`). No production code, artifact, cache or build changed during this pass. One additional source test was added to `tests/cancelDuringSubmit.test.mjs`.

Artifact remains `run-20260909T155759Z/Rivune Recovery QA.app` under `qa-artifacts/direct-host-native-validation-20260909`, binary SHA-256 `0fc03958dab48b918623b9a0e89a305f8b5084ff7945d44049ad7030d77c163b`; native/renderer source manifest `source-hashes-164121.json`. All evidence below is in that run directory unless noted. Only one own QA process was active at a time. No real provider, installed profile, release or N5 test was used.

## N3/N4 variants

| Variant | Evidence and classification |
|---|---|
| N3 late accepted submit after Cancel | Earlier actual native trace and reopened cancellation remain as originally recorded. Supplement did not repeat submit or cancellation. |
| N3 late rejected/thrown submit after Cancel | Source/mock proof only. Existing targeted test explicitly cancels the held admitted request, then rejects or throws its original submission receipt, and creates a fresh controller over the fixture's saved state. Cancelled result survives; submit/save counts each remain1. The frozen native fixture has no supported injection hook at the IPC receipt boundary. Killing the process removes that renderer instead of delivering it a late failure. No package-wide claim is made. |
| N4 unknown and terminal cancellation | Earlier staged actual bridge trace showed only one active cancellation, with invalid requests rejected by source controller. Added deterministic mock test rejects unknown and completed B locally, count0 host cancellations and B's answer/status unchanged. |
| N4 different unresolved identity | New mock test places another active run beside a distinct unresolved request, refreshes authoritative fixture state, then asserts the explicit unresolved-identity rejection before host cancellation (count0). Normal mounted controls do not expose this invalid target; there is no supported frozen QA control to force it. This is source/mock proof, not a packaged variant. |
| N4 duplicate latch | Targeted existing source test holds the first cancel Promise, rejects the second attempt, and asserts exactly1 host cancellation. Earlier staged native concurrent attempt yielded one actual cancel call. No fabricated second native attempt here. |
| N4 restart and completed B preservation | **Packaged pass.** Reopened original synthetic profile in PID55901 using unchanged current artifact. CUA rendered both cancelled runs and completed synthetic answer. `supplemental-N4-reopened.json` and `supplemental-restart-comparison.json` compare against original N4 PID51272: every run, conversation, saved draft revision7, snapshot SHA and fixture log unchanged. Original four provider starts remain four; no restart dispatch. Clean Cmd-Q with no edits exited; `supplemental-clean-exit.json` has no own process. |

Targeted command: `node --experimental-strip-types --test tests/cancelDuringSubmit.test.mjs`, from `prototypes/ai-native-workspace`. Result7/7, zero failures/skips (`../supplemental-cancel-variants.log`). This comprises six existing tests plus one new test; do not add7 to the earlier87 as unique tests. The full frontend suite was not rerun in this supplement. Earlier native117, later subprocess2 parent tests/8 cases and main10 remain separate runs, unchanged.

## Additional N6 package variants

Both used the same frozen binary and real production bridge/renderer, with no QA toolbar imported. The supplemental helper creates an isolated copy, changes only its latest recovery record, logs PID and complete file hashes, then verifies exit/unchanged bytes and removes that temporary copy. Only the small corrupted latest snapshot is preserved as additional evidence.

| Variant | Process/profile | Observed result |
|---|---|---|
| Unsupported schema99 with valid conversation welcome and state reserved | PID60884; `/private/tmp/rivune-supplement-qa-9f1_w4op/profile` | Recovery heading and Close Rivune, no composer. Click exited. Every profile-file hash and original fixture log unchanged. Own temporary copy removed. `supplemental-unsupported-schema.json`. |
| Cross-bound recovery: schema1/reserved references nonexistent-conversation | PID61035; `/private/tmp/rivune-supplement-qa-0kidpsrt/profile` | Same bounded recovery screen, no composer. Click exited. Every profile-file hash and original fixture log unchanged. Own temporary copy removed. `supplemental-cross-bound.json`. |

These extend the earlier unsupported-state variant. They do not establish every possible corruption or filesystem failure.

## Tray settings and remaining limits

Tray-origin Settings remains unverified. The own QA app launched normally, but CUA inspection of `com.apple.systemuiserver` returned `timeoutReached` after1654.7 seconds without a menu-bar tree. No tray menu item was identified or clicked; no native Settings event or focus/return claim is made. This is a tool inspection timeout, not evidence of an app Settings failure. Closed the unchanged saved QA workspace; `supplemental-tray-inspection-clean-exit.json` confirms no own process and preserved revision7.

N5 remains pending the single user approval request. No dirty-draft quit, equivalent data-loss test, failed flush, abort or retry was attempted. Original synthetic profile remains saved with directory permissions0700 for that possible future test. N7 remains native fault/process-exit proof, not packaged fault injection or power-loss proof; no system shutdown or power interruption attempted.

External read-only reviewer accepted the earlier frozen N6 variant with no critical source blocker. Sending this supplement to the lead and external review tasks was blocked by automatic approval review because it considered the destinations unverified and the payload private QA evidence. The supplement remains local; approval to share is required. Full fixture acceptance, real providers, installer/signing/update, and visual user approval remain incomplete.
