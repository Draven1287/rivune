# Independent native transcript smoothness review

**ACCEPT the bounded scroll-routing patch for isolated integration. Rendered viewport behavior remains unverified.** No new P1/P2 regression was identified in that two-file delta. The audit's separate “missing composer focus observer” finding is false and must not drive an implementation change.

## Exact evidence

Verified all accepted 0623 base, candidate and artifact hashes in source-manifest.json. WorkspaceView.swift candidate SHA-256 is `9713bf01499d18e8306bf49ff78abc811a27dc5e4d1e47f55a90a8e6628e760e`; candidate test SHA-256 is `1015a7007876e4c409171f41d5bb7ca81323600ca5b45ffcc10868b7e976f349`; patch is `efe9c3d7bbf6d0ef1a4487f112bfaaeb580c4823a57832cb746c0dabc094e8a1`.

Read the actual onChange integration, geometry observer, scroll helpers, IDs and completed-Together detector. Independently executed the exact extracted candidate policy against a behavior-equivalent representation of the old inline branch across all **eight boolean input combinations**. All checks passed: only an existing-turn update near the bottom without a newly completed Together answer changes from latest-turn-start to transcript-bottom. The other seven combinations retain baseline behavior, including completion precedence when multiple conditions coincide.

Independent static checks confirmed the new action calls the existing scrollToBottom helper, the transcript-bottom ID exists, and both reduce-motion and animated helper branches use the bottom anchor. Probe and structured evidence are under `independent-evidence/`. Owner's 325 full native/two focused tests were not independently rerun for this narrow routing review.

## Accepted routing behavior

Existing-turn updates near the bottom now target the bottom sentinel instead of the latest turn's top. Newly appended turns preserve the prior turn-start behavior. Newly completed Together answers preserve their final-answer anchor and precedence. Readers away from the bottom retain position for existing-turn updates and get the existing new-content indicator. No styling or presentation control changes are introduced.

The predicate is still supplied by SwiftUI geometry. This policy test does not prove when geometry updates relative to model changes, whether layout has completed when scrollTo executes, or whether animation remains smooth during repeated large updates. It also does not establish conversation-switch restoration: turns-count changes can represent a different conversation, and equal-count switches reuse view state. Those are retained integration/viewport cases, not newly reproduced defects from this patch. Mounted native tests should cover a tall transcript, repeated same-turn updates, reader-away behavior, Together completion and equal-count long-history switches before claiming rendered acceptance.

## Required audit correction: composer focus already exists

Independently confirmed root's correction against accepted0623 `Rivune/Components.swift`, SHA-256 `e920757f668ab2a8b08a52ad721cbcba98410e8a6fb8826dc5f40bd5b3532dc4`:

- `.task(id: store.newConversationFocusRequest)` at line1889 consumes the new-conversation focus request with current-window/visibility checks.
- `.onReceive(store.$showSettings.removeDuplicates())` captures focus/selection before Settings.
- `.onChange(of: store.workspaceReturnFocusRevision)` at line1941 restores composer focus and caret state subject to owner-window guards.

Therefore AUDIT.md's assertion that those observers/FocusState are absent is contradicted by the frozen source. Do not duplicate or replace the existing implementation on that premise. Its actual rendered round-trip behavior remains an appropriate future test, but “not rendered here” is not “not implemented.” Preserve the audit receipt and add a correction rather than silently rewriting historical evidence.

This review covers the scroll patch only and does not accept every separate claim in AUDIT.md. No native UI control, shared-source edit, install or provider call occurred. Existing user authorization is unchanged; no new approval gate is introduced.
