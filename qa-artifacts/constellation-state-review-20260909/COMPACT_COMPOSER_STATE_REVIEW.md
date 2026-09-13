# Compact composer source/state review — 2026-09-10

## Verdict

Acceptance withheld for one reproduced P2 contract violation in unconfirmed-save summary handling. Atomic configuration CAS construction, detached intent, draft/attachment preservation, stale input rejection and execution fences passed the bounded checks below. This is not native durability, UI, provider, installation or release acceptance.

Reviewed the full COMPACT_COMPOSER_CONTRACT_REVIEW_20260910.md, implementation receipt and validation.json. Retained exact tested source and evidence in compact-composer-state-snapshot/ beside this report. Only reviewer files were written. No browser, provider, native command, app process or product edit occurred.

## P2 — Unconfirmed applied configuration is promoted into the resting summary on refresh

Locations in captured source: workspaceController.ts refreshOnce (snapshot publication at lines 89–93), save receipt/recovery path (lines 154–170); composerConfiguration.ts composerSummary; ComposerExecutionControl.tsx summary (line 48).

Reproduction using the actual captured controller and summary helper:

1. Start with saved Single AI; retain local message text.
2. Configure a valid two-member team. The synthetic host applies the pair, then throws instead of returning its receipt.
3. configureExecution rejects and pendingSaves retains the original mutation. The displayed summary initially remains Single AI.
4. Call the normal controller refresh. The new host snapshot is published without accounting for the unresolved configuration mutation. composerSummary now returns Constellation, although no matching durable receipt was received.
5. Attempting another configuration still rejects because the original mutation remains pending. No replacement save or submission occurs; local text survives.

This violates the explicit contract that the resting summary changes only after a matching durable receipt plus refresh and that an uncertain save retains the existing summary until recovery. The snapshot may reflect an applied operation, but the control cannot present it as confirmed while its own mutation is still unresolved. Refresh is a normal exposed action; the reproduction does not require a provider or exotic timing.

Correction should expose unresolved configuration state to the summary/control and retain the last confirmed presentation (or explicitly present the observed new state as unconfirmed under an amended contract). Do not hide host changes globally or clear the unresolved mutation merely because a snapshot matches. Preserve exact mutation replay for recovery. Add a regression with apply-then-lost-reply, explicit refresh before recovery, unchanged confirmed summary, and transition only after the exact durable acknowledgement. Also cover malformed acknowledgements and refresh failure after acknowledgement.

The last reviewer test is a characterization that PASSES when this defect reproduces; its pass is not acceptance.

## Bounded verified behavior

- configureExecution synchronously structured-clones the complete intended pair and expected key before action/refresh. A deferred-refresh test mutates the caller's original key/team while editing the message: the request retains the original pair and latest local draft.
- The key covers saved richDraft revision/attachments/selection/team, workspace default, provider configuration, runtime capability and catalog. Captured capability/revision changes during refresh reject before mutation. Existing tests cover default/catalog/path changes. Local text alone does not invalidate the configuration key; rich-draft revision conflict still gates save.
- Valid team changes rebuild 2–6 distinct current provider-default members, validate lead bounds/membership and exact lead-selection equality. Explicit model/effort values are not accepted. Single AI explicitly saves either null/null inheritance or current selection/null pin in one save. Existing former-lead/other-pin/default tests retain exact draft, attachment IDs and expected revision; zero submit/journal-write calls.
- save verifies matching mutation/conversation, durable state, revision+1, attachments, selection and team, then refreshes and verifies saved draft/configuration. Wrong identity/revision/team acknowledgement rejects and prevents a replacement mutation. Exact previous-save replay is used for recovery. The synthetic bridge is not a native CAS/idempotency implementation, so these tests establish frontend payload and acknowledgement checks only.
- Active run, unresolved submission, unresolved retry and shutdown each reject configureExecution before any new save. The normal action mutex also fences concurrent operations. Send continues to derive mode/team from saved state and records the rich-draft revision; configuration itself never submits.
- Later configuration leaves historical admitted team/provider, partial output and failure state intact. The host workspace renders run labels from admitted run data and keeps retry/cancel/result controls separate from the composer.
- Dirty form conflict logic keeps local choices and disables save when its base key changes; explicit Load saved or Keep my choices is required. Close reloads saved choices. Unavailable saved team IDs stay visible and are not silently cleared. These are source observations; no React mounting/focus/layout claim from this review.
- Duplicate-label correction was captured during review: helper now adds stable IDs for matching normalized labels, and summary/pin labels use it. Independent helper assertions cover duplicate and missing IDs. No visual acceptance is implied.

## Tests and evidence

Run from the retained snapshot directory:

`node --experimental-strip-types --test --test-name-pattern='compact composer|partial Constellation|retry.*identity|cancellation' tests/hostController.test.mjs`

Result: 4/4 selected owner tests passed. Log: owner-focused-tests.log.

`node --experimental-strip-types --test tests/reviewerComposer.test.mjs`

Result: 6/6 reviewer tests completed; five positive boundary tests and one positive reproduction of the P2 defect. Log: reviewer-tests.log. Reviewer fixture is extracted from the owner's synthetic fixture with its two-provider helper. There are no real subprocess/provider hooks in these tests.

Coverage limits: the owner's uncertain-save controller case replays the save before sending; it does not assert the summary after an intervening refresh. Its mounted uncertain-save fixture throws before host apply, so it also misses this path. The owner's seven-member input also contains duplicates and therefore does not independently isolate the upper cardinality boundary (the source explicitly checks >6). Owner mounted/typecheck results were read, not independently rerun. Native admission/persistence was not executed or newly accepted. Existing native/source reviews are not converted into this compact control's native proof.

An initial attempt to write the reviewer test used a workspace-relative destination while the shell was already in the snapshot directory; that file write failed. It was corrected before the six tests ran. No product defect or test result was attributed to that setup error.

## Exact boundary

The controller still matches the original eight-file receipt. Three captured files differ from that receipt due to the ongoing duplicate-label correction: ComposerExecutionControl.tsx, composerConfiguration.ts and hostRenderer.test.tsx. All eight captured source hashes were rechecked against current files after tests and remained unchanged. The table below, not a blanket acceptance of the original manifest, identifies this review boundary. The label-only helper addition leaves configurationKey unchanged and does not fix the P2.

| Path relative to frontend | Captured SHA-256 | Original receipt |
| --- | --- | --- |
| src/host/ComposerExecutionControl.tsx | `25d924811c956b4f9620f44c59f58d468d1ab4443a1f34e0f7d9083beac87be2` | changed |
| src/host/ComposerExecutionControl.css | `32826f66be0fc2b142ddac9f5e4db1a89dd7154d1754e61341a3f266fb36bea2` | matches |
| src/host/composerConfiguration.ts | `49cd0bce2b8a78fdb9a1236e328bfad40b99c931f0e02e00cf6567fa73bca433` | changed |
| src/host/workspaceController.ts | `86f6bb4b8c1b9825471f506c700d6ac8be5eee3471687458b0e6dc33301330df` | matches |
| src/host/HostWorkspace.tsx | `1311183148c39f91cc5a8a3cefd56dc84ba1acba80c20da620f1c10fd06f5b37` | matches |
| tests/hostController.test.mjs | `3734a51eb3cff9191b4f1353bb43401f391f63b110c31dc934e47386fc9173d3` | matches |
| tests/hostRenderer.test.tsx | `7456685f86302b93238affdb798321d96e7bb77678434aad9bbe5b8743ab1f81` | changed |
| tests/rendererScenarios.ts | `2b6abffffc5b3ff9636cd08c18d05acbdc6475cf0d42a878ed5c763aaf546708` | matches |

All copied dependency hashes are retained in compact-composer-state-snapshot/source-hashes.json. Follow-up scope is the uncertainty-summary correction and a refreshed exact manifest; the passing unrelated boundaries need not be re-audited without further changes.

## Confirmation correction follow-up

See COMPACT_COMPOSER_CONFIRMATION_REVIEW.md: original summary P2 closed at the matching confirmation-fix boundary; acceptance remains blocked by reproduced superseded-acknowledgement recovery P2. Exact tests, hashes and limits are recorded there.

## Supersession closure follow-up

COMPACT_COMPOSER_SUPERSESSION_REVIEW.md closes the remaining acknowledged-supersession P2 at the exact supersession-fix boundary with 10/10 independent focused tests. Earlier findings above are historical; bounded source/state acceptance is now granted, with native/UI/provider/release limits retained.
