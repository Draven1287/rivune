# Candidate 3 response to central review

Reviewed inputs:

- `/private/tmp/rivune-central-shell1/REVIEW.md`
- `/private/tmp/rivune-central-shell1/probes.mjs`
- `/private/tmp/rivune-central-shell1/source/` (frozen reviewer copy of candidate 1)
- `/private/tmp/rivune-central-shell2/REVIEW.md`
- `/private/tmp/rivune-central-shell2/reconcile-probes.mjs`

Candidate 1 remains frozen at `../candidate1/`; its manifest still verifies with SHA-256 `ce2ba146a27358c5518bf609ad7b4a80ec7ab6fef3babde8303effe6f9d358a4`. Candidate 2 remains frozen at `../candidate2/`; its manifest verifies with SHA-256 `c2b323cf79dc7da50b3a00f1939a68bc32369355265836333d47d541c6dca744`.

## Corrections

| Central finding | Candidate 2 correction | Acceptance evidence |
|---|---|---|
| Invalid refresh left stale conversation admission enabled | Invalid snapshots clear both the snapshot and selection. Render admission now requires a validated snapshot and a selection present in its current conversation set. Removed selections rebase only to a conversation actually reported by the new snapshot. | `tests/app.test.mjs` invalid-schema and changed-conversation assertions |
| Delayed acceptance erased a newer draft | Submit captures conversation, exact draft text, and monotonic draft revision. Accepted acknowledgement clears only if all three are unchanged. A new edit or conversation switch preserves current text. | `tests/app.test.mjs` delayed-edit, switched-context, and unchanged-accepted assertions |
| Rejected/unknown acknowledgement cleared the prompt; uncertainty had no retained identity | The acknowledgement contract is request-bound `accepted`, `rejected`, or `uncertain`. Malformed/mismatched responses normalize to uncertain. Rejected/uncertain preserve the prompt. One unresolved request ID blocks resubmission and can call only `reconcileRun(requestID)`. | `tests/core.test.mjs` acknowledgement and reconciliation assertions; `tests/app.test.mjs` rejected/uncertain assertions |
| Electron comparison used an unequal all-platform scope | Both options now preserve the native SwiftUI Mac lane and target Windows/Linux only. The ADR weighs Electron's JavaScript runner-reuse advantage against Tauri's smaller system-WebView runtime, explicit command surface, Rust cost, and WebView variance. | `ADR-002-CROSS-PLATFORM-DESKTOP-SHELL.md` Options and Trade-off Analysis |
| Confirmed reconciliation left the unchanged accepted draft sendable | The renderer retains the submitted conversation, exact draft, and revision through uncertainty. Confirmed acceptance applies the same conditional consumption as immediate acceptance; changed revisions and different contexts remain untouched. | `tests/app.test.mjs` unchanged, edited, and switched-context reconciliation assertions |
| Reconciliation transport errors escaped the event handler | The reconciliation handler now catches errors, shows a request-bound retryable status, retains the original request ID and draft, and restores the reconciliation control in `finally`. | `tests/app.test.mjs` failed-then-successful reconciliation assertions |

## Evidence boundary

- `npm test`: 9/9 Node tests pass, including a minimal DOM-event harness adapted from the central probes into desired-outcome assertions.
- `npm run check`: renderer/core syntax passes.
- All manifest entries verify.
- The harness is not browser, WebView, native app, installer, Windows, Linux, accessibility, or rendered QA.
- Rust/Cargo/Tauri dependencies remain absent. No desktop binary or package was built.
- No shared app source, provider, authentication, credential, user data, native UI, purchase, or public artifact was touched.
