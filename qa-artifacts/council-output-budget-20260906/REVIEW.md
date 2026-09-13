# Council whole-response output budget — local implementation

Scope: deterministic word-budget enforcement only. No new live evaluation, app installation, extra general model-review stage, account changes, Swarm enablement or release work. Preserve the previous grounding evaluation's 0/3 full-quality result.

## Contract and limits

The optional persisted `outputBudgetAssessment` contains policy `whole-response-words-v1`, recognition status, numeric limit, strict `under` versus inclusive `atMost`, and the exact source instruction. The enclosing run retains the exact frozen prompt, context and criteria. Legacy records decode without these fields and do not acquire validation claims on retry.

The parser only recognizes complete imperative sentences of the form “Keep the [whole/entire/complete] response/answer/note under N words” or “at most N words”; an unqualified “response” or “answer” is also accepted. It reads only the current request, not approved context, criteria or drafts. Quoted/code-bearing requests are conservatively unchecked; indented, fenced and explicitly marked context lines are not interpreted as instructions. Multiple recognized instructions or additional unsupported numeric word-limit mentions are ambiguous and unchecked. Pronouns, approximate limits and unsupported grammar remain unchecked. This deliberately does not claim general natural-language constraint extraction.

A word is a maximal non-whitespace token. Every character-bearing token in headings, Markdown, code, file JSON, summaries and review notes is included. Under 250 permits at most 249; at most 250 permits 250. No prose is exempted. The synthesis prompt no longer requires an appended review note and defers to requested output format.

Each synthesis/repair receipt preserves full returned text, participant identity, transport error, count and optional check outcome. Original candidates are persisted through the normal update callback before repair. UI disclosure exposes original/repaired candidates, counts, errors and the explicit statement that semantic grounding is unverified.

One repair is allowed under the same frozen task, budget, participant and options. The complete original and frozen task must fit the existing 112 KiB input cap; nothing is truncated. Returned oversized outputs are retained as failed outputs, never admitted as finals. A failed or unavailable repair leaves a partial result with no final answer. The persisted repair flag and failed receipts prevent repeated attempts through retry. Cancellation before/during repair prevents further calls or late final publication and preserves completed original output. No deterministic correctness or code/file validity claim is made by a word-count pass; existing artifact validation remains separate.

## Verification

255/255 native macOS tests passed, 0 failures, 0 skips, no runtime warnings. Nine new recording-transport tests cover:

- Strict/inclusive boundary behavior and full review-note counting.
- Successful repair with unchanged frozen task/context and original text retention.
- Failed repair, Codable receipt roundtrip and no extra retry call.
- Repair transport failure with original retained.
- Unrecognized/quoted/code/context/ambiguous constraints left unchecked.
- Cancellation before repair and while repair is running.
- Repair input overflow and oversized returned output without truncation.
- Legacy records with no newly implied validation claims.

Result: `/private/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_20-15-02--0600.xcresult`.
Full log: `/private/tmp/rivune-budget-tests.log`.
Summary copied alongside this report. Source snapshots and SHA256 manifest also accompany it.

The native disclosure compiled in the tested app target; it has not been visually inspected in a newly installed build. No live provider quality re-evaluation occurred. Installed build remains 2026090616, executable SHA256 `28b5178c889422595983ad913cce507c2f828bf8ee618e9a0c10d4d7434ca412`.

## Revision 2 — review findings resolved locally

The retry decision is now `CouncilRunRecord.retryEligibility`, shared by WorkspaceView, RivuneStore, RivuneRunCoordinator and CouncilRunner. A consumed/failed length repair is rejected before journal/status/revision mutation or publication. UI no longer offers a no-op Retry Council action for these records; the disclosure and store/coordinator rejection explain that the user can edit the prompt or limit and explicitly start a new request. No automatic new run is created. Missing drafts and genuine transport failures remain retryable.

Measured `wordLimitPassed` now depends only on the whole-output count and frozen limit. Optional persisted `outputValid` separately records transport/output admission. An oversized one-token output can pass a three-word limit while remaining an invalid, rejected output. An invalid provider response alone cannot trigger the terminal length-retry gate; a repair attempt already spent remains terminal regardless of its outcome.

`CouncilParticipantResult.isSuccessful` drives draft counts, labels, events, reuse and final admission. Failed returned text is shown alongside its error instead of being presented as an independent successful answer. Failed draft attempts are also retained when a genuine retry replaces the current result.

259/259 native tests pass, 0 failures/skips/runtime warnings. Four added tests cover no-mutation retry rejection (journal bytes, turn/status/stage/time, revision, publication count and transport calls), successful transport retry for oversized one-token lead outputs, successful missing-draft retry with retained error/text and accurate event/count labeling, and independent length/output-validity outcomes. Existing nine budget tests still pass.

Final result: `/private/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_20-23-55--0600.xcresult`.
Log: `/private/tmp/rivune-budget-review-tests.log`.
Revision-2 source snapshots, hashes and test summary are in `revision-2/`; the first reviewed snapshot remains unchanged. No live evaluation or installation. Rendered verification is still pending; this is source and deterministic-test evidence only.

## Build 617 — rendered and installed locally

Native universal Release 0.2(2026090617) built successfully; 259/259 tests pass, 0 failures/skips. Test result: `/private/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_20-30-24--0600.xcresult`. Strict deep ad-hoc signature verification passed before and after installation. Installed `/Applications/Rivune.app` executable SHA256: `dbdc31a140cde3de62e003d8e02b0c1f43cd859c3d850bb8b105e30a9d262680`. Source manifest SHA256: `d12ae899971313f65bc9f1cab1126271c5a43c278ef06095440cb90a61d82bc7`. Frozen71native inputs and616rollback are retained under `/private/tmp/rivune-review-2026090617`.

Rendered QA used `--ui-preview --council-budget-qa`: four opt-in memory-only fixtures, no injected transport and no personal history. Synthetic success shows original13words/failed and repair3words/passed under8, with semantic validity explicitly unverified. Synthetic terminal failure shows original13/repair10, both retained, clear incomplete state and edit/start-new-request explanation, with no Retry Council button. Synthetic retryable provider failure shows Retry Council, counts only one successful answer, and displays failed text alongside its error. Synthetic legacy Council has no budget receipt or retroactive validation claim. Screenshot/AX evidence: `build-0617/success.*`, `terminal-failure.*`, `provider-failure.*`, `legacy.*` (AX files use `-ax.txt`). A minor existing pluralization issue remains in the one-answer heading (“1 independent answers”); it does not obscure the success/failure distinction.

The candidate was installed only after build/test/render checks passed. Normal app relaunch restored the24existing conversations and current CLI readiness. The existing real Council record also renders with its original lead/drafts and no new budget claims (`installed-legacy.png`, `installed-legacy-ax.txt`). `history-verification.json` confirms semantic equality for conversations, run journal, drafts and projects before/after. No synthetic fixtures were added to user history. No new live model evaluations occurred; startup connection readiness checks are separate. Previous grounding result stays0/3full-quality passes. Accounts remain disabled and direct updates uncompiled; no public release or Swarm enablement.
