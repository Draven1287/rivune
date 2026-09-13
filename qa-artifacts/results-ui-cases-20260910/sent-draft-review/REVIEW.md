# Sent-draft mounted UI review — 2026-09-10

Bounded PASS: all five selected actual React cases independently observed passing at verified1280×844 and390×844 on the existing4317/tests/hostRenderer.html?scenario=sent-draft-mounted. The initial1280×720 run also passed but is not needed for the requested matrix. Viewport reset afterward. No Results suite or native/provider/OS clipboard work performed.

Read SENT_DRAFT_MOUNTED_RECEIPT, actual five scenario branches and Message/type/click helpers. Independently hashed two fixture files and four implementation files against the frozen manifests:6/6 exact matches, recorded in hashes.json. The controller hash also matches the independent controller review's captured hash.

## What the mounted assertions prove

Each case obtains the accessible Message textarea, drives React input/change events, clicks enabled Send, captures the synthetic request and verifies visible textarea value remains populated before admission. At completion it asserts identical textarea DOM node, exactly one submission and unchanged non-text rich-draft metadata (normalizing only revision).

- Exact authority: accepted acknowledgement without a saved run retains composer text. A foreign request in history with blank advanced host draft does not clear it. Matching saved admission followed by explicit Reconcile request clears that same textarea.
- Newer distinct text and ABA: textarea remains writable during pending submission; typing a different value, or typing away and back to identical sent text, survives matching admission. Explicit Save draft then uses revision+1.
- Rejection: no run, revision advance or visible/saved text loss.
- Uncertainty: no speculative clear; explicit no-run reconciliation retains text.

This reviewer observed the mounted verdict page at both verified widths and inspected the assertions establishing the intermediate textarea states. The harness unmounts each case, so final screenshot shows the five-result report, not a paused intermediate composer. There was no separate manual delayed-authority interaction or screenshot claim for each intermediate state. DOM .value/node assertions are actual mounted behavior, not source-only controller tests; they do not prove pointer geometry, focus or real keystroke fidelity. Helpers invoke native value setter plus input/change events and enabled button.click within React act.

## Boundaries and dependency

No actionable defect found in requested cases. Fake host supplies authority; this does not prove native disk atomicity, async provider continuation, OS restart or release. Those remain the independent host/controller/native scopes. Source manifest hashes are frozen evidence at review time. Ready for coordinator's bounded acceptance/export decision; no production files changed.
