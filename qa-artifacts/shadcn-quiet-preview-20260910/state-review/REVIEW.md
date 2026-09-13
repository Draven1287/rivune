# Quiet integration — state review

**CHANGES REQUESTED: one P2 confirmation-display regression.** No new save/send authority bypass or Results identity defect found in the inspected delta. Visual/browser acceptance is separate.

## P2 — Quiet toolbar presents unconfirmed configuration as current

At ComposerExecutionControl.tsx:64, the visible compact mode uses `saved.team` and the visible provider uses `saved.selection`/workspace default directly. During an unresolved configuration save, a refreshed snapshot can already contain the new configuration while `confirmation.confirmedSummary` must retain the last confirmed one. The previous presentation uses `restingSummary` for this purpose. Quiet hides that summary and only retains it in a title attribute; visible labels instead advance to the unconfirmed snapshot.

Concrete case: confirmed Single AI/old provider, change to Constellation/new provider, lose or fail to confirm the acknowledgement, then refresh the changed snapshot. The toolbar says Constellation/new while the status says it is showing the last confirmed configuration. Buttons remain disabled, so this is a display-authority regression, not permission to send. Acknowledged-but-not-snapshot-confirmed supersession can exhibit the same mismatch.

Keep visible Quiet resting labels based on the confirmed presentation while confirmation exists, or visibly show the existing `confirmedSummary` and withhold the new mode/provider labels until confirmation clears. Add a pending-confirmation snapshot-change case to the compact UI tests.

Reproduction: [confirmation.cjs](confirmation.cjs) executes the captured actual component with deterministic React/contract helper stubs and inspects its returned element props. [confirmation.log](confirmation.log) records the mismatch. This is not a browser test. The initial harness lacked `catalog.providers`; that fixture omission was corrected before the passing defect reproduction. No callbacks or writes are invoked.

## Remaining source findings

NativeDialog is a stable forwarded-ref wrapper that always returns a native dialog and its children. Settings closes through the existing showModal/close path; ProviderSetup remains mounted across open/close. Its bridge-keyed lifetime, stale completion guards and parent refresh/controller equality guard remain intact. Switching appearance does not recreate the controller effect, whose dependency remains bridge identity. Wrapper/icon/button changes also affect default rendering, so appearance is opt-in but not every markup change is Quiet-only; no new default lifecycle reset was found.

Button forwards refs, disabled and handlers to the button or Radix Slot. Dropdown selection opens the staged editor or Settings; it does not apply/save/send. Compact editor focus is scheduled on open and cancelled on cleanup. Dropdown close autofocus is suppressed while the editor is open; close and successful apply target the compact mode trigger. Actual Radix/native-dialog focus ordering requires UI verification, particularly Review connections and disabled-during-save transitions. Only producer-reported keyboard observations were read here.

The existing configuration apply guard still checks disabled/saving/conflict/catalog and passes expectedKey to the controller. Composer save/send callbacks and their pending/configuration gates remain unchanged. Host controller, contracts, lifecycle, ProviderSetup, useHostResults and inspectionSession are byte-identical to before-images. Results uses the same controller/session, metadata and digest checks; no hidden mutation was added to opening/closing it.

The actual corrected fixture uses valid lead/member identity, `Final answer` metadata and exact inspection fields, and preserves admitted team/provider identity on synthetic submission. Strict production contracts were retained. `quiet-cases.txt` is an older excerpt with the rejected filename/response form and should be regenerated or marked superseded; actual hashed hostRenderer.test.tsx is the reviewed authority.

## Frozen identity and limits

All 13 entries in final-source-hashes.json matched actual files. [hashes.json](hashes.json) retains the full map; changed components are copied here.

- ComposerExecutionControl.tsx: `42cc110289abc05bd678e4800ddbd92617d8e74b3fc9f01caa1e0e4e8add289b`
- HostWorkspace.tsx: `d50feba47ddbdcdd6e8b6b66e5d9b4fecd2e97179ecaf96955fbd69fe7727e1d`
- button.tsx: `af77931b986c4d5d97342a17c052096096d86820f37066b608a865888ef556a9`
- dialog.tsx: `747459d387e13886f5fb86e0dd35b31cf1f45294886dba67b558561e48868d21`
- dropdown-menu.tsx: `62acdb6e34c261e1dca58b4cd8e8ba035abde105c094032e1d347703bc7c86c2`

No live/candidate edits, browser/native execution, new server/build/provider action or unrelated host audit occurred. The targeted reproduction does not replace mounted focus/geometry, visual approval, native or provider acceptance.
