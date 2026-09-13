# Compact composer confirmation correction — independent state recheck

Date: 2026-09-10. Scope: closure of the P2 in COMPACT_COMPOSER_STATE_REVIEW.md only, plus directly affected acknowledgement/conflict recovery. No product edits, UI/browser execution, providers, native operations, servers or publication.

## Verdict

Original P2 CLOSED at the captured confirmation-fix boundary: applied-but-unacknowledged configuration no longer promotes the resting summary on refresh. Acceptance of the correction remains BLOCKED by a new P2: an acknowledged save whose exact saved revision has already been superseded cannot exit confirmation through the offered recovery actions.

## Verified correction

The private per-conversation record retains the original request, last confirmed summary and acknowledgement state. Public state exposes presentation/acknowledgement only. Host snapshots are still refreshed truthfully. ComposerExecutionControl consumes the held summary, shows explicit unconfirmed wording, and HostWorkspace disables both button and keyboard Send and configuration editing while confirmation exists. Recovery controls stay present independent of the general error message.

Actual copied-source tests cover:

- Apply then lost reply: snapshot reflects the new team after explicit refresh; held summary remains old; Send rejects while unacknowledged; recovery reuses the identical full request.
- Apply then malformed acknowledgement (wrong team): same fences, truthful snapshot and exact replay behavior.
- Valid acknowledgement then refresh failure: record remains acknowledged; Retry draft save refreshes only, with one total save. Ordinary refresh also resolves a matching acknowledged record without replay.
- Each recovery preserves attachment IDs, the original saved message, and a newer local edit made during uncertainty. No submit calls occur in these recovery tests.

One owner test containing the three outcomes passes. Four positive independent tests pass. A fifth independent characterization reproduces the new P2; its pass is not product acceptance. Exact logs and synthetic tests are in compact-composer-confirmation-recheck/.

## P2 — Superseded acknowledged revision leaves a permanent confirmation fence

Affected source: workspaceController.ts:64-66 (exact revision match), :92-95 (only matching acknowledged snapshot clears record), :165 (save/send fence), :239-249 (retry refresh and conflict review).

Reproduction:

1. Configuration save revision 2 -> 3 returns a matching durable acknowledgement, then its refresh fails.
2. Before the next refresh, a separate legitimate host writer saves revision 4 with changed text. This is the external revision conflict the existing draft-review flow supports.
3. Refresh truthfully publishes revision 4 but cannot confirm the exact revision-3 record. Retry draft save refuses because the record still differs.
4. Explicit keepLocalDraft(chat, 4) succeeds, but it changes only draftBases. It does not resolve the acknowledgement record.
5. Retry draft save, Save draft and Send remain blocked; configureExecution is also fenced by save(). No further host write occurs. As revisions advance monotonically, ordinary refresh cannot recover the old exact revision. No mounted recovery action clears this state during the controller lifetime.

The original save is already durably acknowledged, so indefinite uncertainty is misleading. Add an explicit, revision-checked resolution for a superseding saved snapshot (e.g. review and accept the current saved configuration while preserving local text, or explicitly rebase intended choices after review). Do not auto-promote an unacknowledged snapshot or replay an acknowledged write. Test supersession after both immediate acknowledgement and recovered acknowledgement, including a second change while the conflict review is open.

## Test commands and evidence limits

Run from compact-composer-confirmation-recheck:

`node --experimental-strip-types --test --test-name-pattern='compact composer confirmation' tests/hostController.test.mjs`

owner-focused-tests.log: 1 test / three scenarios passed.

`node --experimental-strip-types --test tests/confirmationReview.test.mjs`

reviewer-tests.log: 5 tests completed, including the positive reproduction of the blocker. Synthetic bridge caches and returns the original receipt on replay while asserting exact request equality; no native idempotency claim.

Initial reviewer test attempted direct controller Send between acknowledgement/refresh failure and recovery. Send itself refreshes, so matching acknowledged state was already confirmed before its later direct-attachment validation rejected; the next Retry draft save was then a normal new save. That test setup was corrected to use the requested refresh-only recovery path. reviewer-tests-initial.log is retained. This does not weaken the lost/malformed Send assertions; those remain exercised. Button/keyboard disablement is source-inspected, not mounted here.

The owner's mounted/typecheck claims were read from the receipt, not rerun. No native durability, renderer restart, layout or release acceptance is implied. Unrelated previous passing audits were not repeated.

## Exact captured boundary

All eight files matched confirmation-fix-hashes.json at capture. Post-test current-source drift: none. Full dependency hashes and copies are retained in source-hashes.json.

| File | SHA-256 |
| --- | --- |
| src/host/ComposerExecutionControl.tsx | `00bdcd86e6584acaa5584df39cbdb218c8dbb4f9125b12bd58d398af50b3c6db` |
| src/host/ComposerExecutionControl.css | `32826f66be0fc2b142ddac9f5e4db1a89dd7154d1754e61341a3f266fb36bea2` |
| src/host/composerConfiguration.ts | `49cd0bce2b8a78fdb9a1236e328bfad40b99c931f0e02e00cf6567fa73bca433` |
| src/host/workspaceController.ts | `e9471c715d20f2d6f3b5dd04e998a18fbede13c88f392b55a7126188065b0b8c` |
| src/host/HostWorkspace.tsx | `dd48692d1eda141b04e6c701fae3af335672d7d5c66d3af74fabe382ae441d1b` |
| tests/hostController.test.mjs | `3963e74f4a4df1006768a5d97b0fc6d52182528572729d999e1c5fe8dfbf6256` |
| tests/hostRenderer.test.tsx | `f9290b1bbfbe67ce2f831cf42081c51d9ea6a8c632e1e1b05e4b9a4fcfb9a068` |
| tests/rendererScenarios.ts | `2b6abffffc5b3ff9636cd08c18d05acbdc6475cf0d42a878ed5c763aaf546708` |

## Supersession closure follow-up

COMPACT_COMPOSER_SUPERSESSION_REVIEW.md closes the remaining acknowledged-supersession P2 at the exact supersession-fix boundary with 10/10 independent focused tests. Earlier findings above are historical; bounded source/state acceptance is now granted, with native/UI/provider/release limits retained.
