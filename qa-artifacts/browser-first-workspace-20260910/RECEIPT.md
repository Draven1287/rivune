# Browser-first workspace — September 10, 2026

Direct interactive entry: http://127.0.0.1:4317/ . No test harness runs on this route.

## Implemented slice

App.tsx routes ordinary browsers to BrowserWorkspace. Desktop-marker checks and HostWorkspace routing remain unchanged. The browser presentation uses the existing preview history adapter and draft store, with unchanged storage keys. No host controller, provider adapter, contracts, native binaries, accepted export, or production history files changed.

The composition uses a compact searchable conversation sidebar, a solid graphite transcript surface, a compact composer, native-modal Connections and on-demand Results, and an inline Constellation disclosure. The galaxy is confined to the lower sidebar; text and input have calm opaque surfaces. Existing packaged icon remains provisional, not the final selected silver identity.

Browser connections explicitly report unavailable desktop access. Send opens Connections and preserves the draft; it does not generate canned answers or claim a live provider response. Existing sample history/results are labeled. The retained older DemoWorkspace export is not the browser entry.

## Verification

- npm run typecheck: PASS.
- npm run build: PASS (Vite 8.0.13). Browser build only.
- Direct root entry observed at 1280×720 and 320×844; document scroll widths equal viewport widths.
- Connections showed installation Not checked, sign-in Not verified, response Not run.
- A synthetic QA draft survived Connections and Results opening/closing. Return to conversation restored focus to browser-message.
- Search with an unmatched phrase showed No conversations found without replacing the active conversation or draft.
- Opening Agent status labels displayed its sample plain text in Results.
- Narrow Connections opened with reachable close and return controls.
- Synthetic QA draft was cleared after checking; search cleared; viewport override reset; direct app tab marked deliverable.

Evidence: desktop.png, narrow.png, connections-desktop.png, connections-narrow.png, result-desktop.png. Screenshots are this new web entry, not inherited fixture acceptance.

## Limits and next slice

This is a concrete browser design slice, not visual approval or native integration. Browser preview shares existing sample storage, but is not yet the HostWorkspace presentation: next, after design selection, extract the accepted presentation into shared host/browser components and bind the real durable configuration/admission/result contracts. Do not replace the native controller with the demo hook. Constellation disclosure currently shows demonstration roles, not full member output. New-conversation switching, reload restoration, keyboard traversal, copying, and long transcript behavior need expanded interaction verification. No provider was executed. No native app was built or launched. No source was published.

## State-review correction

Independent review found that a deferred clipboard completion could publish feedback after its result was closed or changed. BrowserWorkspace now invalidates copy feedback on result selection/back, conversation change/new, open/close, Escape/native close and unmount. A synchronous pending-operation lock rejects duplicate writes, and the button remains disabled until the issued write settles. An issued OS write is not cancelled; only stale UI feedback is suppressed. Layout-effect identity invalidation covers external conversation/result/content changes. Sample participant count now comes from the displayed agent roster.

`node prototypes/ai-native-workspace/tests/browserCopyFeedback.cjs` passes 15 scenarios against the actual component with deterministic hook/element stubs and a deferred private clipboard. These cover current success/failure, selection/back, close/reopen, Escape/reopen, external conversation change, unmount, duplicate calls and a non-three-member roster. They do not write the OS clipboard or claim mounted browser scheduling coverage. Log: copy-feedback-closure/check.log. source-hashes.txt now includes this regression and the corrected component. Existing screenshots precede this behavior-only correction; CSS is unchanged.

## Focus-review correction

Narrow Conversations now focuses New conversation on opening, exposes an explicit Close conversations button, makes the covered main region inert, and wraps forward/reverse Tab within visible sidebar controls. Escape and explicit close restore the exact toggle. Changing to desktop removes modal behavior and keeps focus on visible navigation; shrinking with focus in the now-hidden sidebar restores the toggle. New/select still direct focus to the composer and preserve per-conversation drafts.

Results detail focuses its heading and resets detail scroll to the top. Back focuses the exact originating result row and restores saved list scroll. The native modal retains its external opener for Escape. Existing clipboard generation/operation fencing is preserved. Typography was not changed; CSS additions only style the navigation close control and result-heading focus outline.

Actual mounted root-route checks through CUA at 320×844 and 1280×900:

- Keyboard Enter on toggle focused New conversation. Eight consecutive Tabs stayed within visible sidebar controls; each DOM center hit test confirmed the focused element was uncovered. Escape and Close conversations returned the exact toggle, expanded=false, main inert removed.
- Open navigation at320 → resize1280: New conversation remained focused, main was not inert. Resize back320: hidden sidebar focus moved to toggle, expanded=false.
- At both widths: Results → Tab to result row → Enter focused H2#bw-results-title. Tab to All results → Enter focused the exact Agent status labels list row. Escape focused the original Results trigger. No BODY-focused transition reproduced.
- Draft before/after all checks compared exactly equal. No draft was edited during this correction. The retained builder tab already had a synthetic QA draft with trailing newlines; earlier empty-string fill did not clear it, correcting the earlier receipt's cleanup claim. It was preserved rather than silently overwritten here.
- Nonzero list scroll restoration (73px), exact second-row identity and detail top reset are deterministic actual-component checks; the mounted sample has only one short result row, so nonzero scrolling was not independently mounted.

`browserCopyFeedback.cjs` now passes16 scenarios including the additional row/scroll focus regression. Screenshots: focus-closure/navigation-320.png and focus-closure/result-heading-320.png. Viewport reset and direct app tab retained. These are bounded interaction checks, not final visual or native approval.
