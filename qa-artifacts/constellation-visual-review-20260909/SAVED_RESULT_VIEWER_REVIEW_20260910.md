# Saved-result viewer — independent source/UI review

Reviewed at 2026-09-10T15:03:35.964990+00:00. Scope: new saved-result dialog only; galaxy/sidebar untouched.

## Verdict and exact obstacle

No confirmed source defect found in the requested close/focus/literal-content/copy-failure scope. Rendered acceptance is BLOCKED: existing builder-owned http://127.0.0.1:4317/tests/hostRenderer.html?scenario=provider-setup&preview=1&settings=1 returned net::ERR_CONNECTION_REFUSED. No server was started or restarted. No matching rendered source, focus trap, small-window layout or clipboard-selection behavior is attested. This is a source review, not a visual pass.

## Source-observed behavior

- Close uses visible text `Close`, accessible name `Close saved result`, and type=button. It is not an X glyph, so the prior Settings X-centering failure is not directly applicable. Header uses wrapping flex layout and vertical alignment; actual alignment remains unverified.
- Native dialog.showModal() is used; browser modal focus containment is relied upon, with no custom trap. Escape cancellation is prevented and routed through close(), which closes the copy session and dialog and focuses the original Inspect button. No explicit autofocus exists; initial focus relies on native dialog behavior. Actual Tab/Shift+Tab and restoration need rendered proof.
- Open captures both selected text and label. Text appears in a read-only textarea, not HTML rendering; code/HTML remains literal. Direct/lead non-completed answers receive saved partial answer; truncated member labels include shortened by host. No requirement is inferred to label every successful contribution partial merely because the aggregate run is incomplete.
- Clipboard failure sets truthful status, focuses the textarea and selects its content. Select all text is independently available. Copy-session generation checks suppress stale success/failure after close/reopen/unmount and duplicate pending calls. Four pure test bodies cover session behavior, but none proves DOM focus/selection. Builder test success remains attributed; tests were not rerun.
- Dialog has viewport-bounded width/max-height and overflow:auto; textarea has internal overflow with white-space:pre, preserving long code lines. Header/footer wrap. These rules support scrolling but do not establish rendered small-window readability or overflow acceptance.

## Minimum fixture needed

Builder supplies an already running, explicitly selected synthetic retained saved-result fixture on4317, using these manifest-matching component files and identifying the served global stylesheet. It must avoid unfiltered host checks, real providers/persistence and real clipboard writes. Include two distinct result openers (completed and partial), one host-shortened member, multi-line literal HTML/code with whitespace and a long line, plus enough content for scrolling. Provide fixture-owned clipboard denial and deferred resolve/reject controls; no OS clipboard permission changes needed.

At390×844 and1440×900 (and320×568 for small-window coverage), verify: close text/control alignment and accessible name; initial focus and Tab/Shift+Tab containment; Escape/Close restoration to each opener; exact selected text and partial/shortened label isolation; long content confined to textarea/dialog with reachable actions; denial selects the whole captured text and announces failure without success; stale completion does not move focus or change another viewer. Inspecting pure source cannot substitute for these observations.

## Hash boundary

All seven files matched the supplied manifest before review. End-of-review hashes below; no app edits, native launches, provider calls, screenshot export or private forwarding performed. The isolated import candidate is not asserted to contain this slice.
- `prototypes/ai-native-workspace/SAVED_RESULT_VIEWER.md`: `78cc35cc117b430a790acbf8c09709ded5da69381432c873c286a1a7442aaaf4`; matches manifest, unchanged.
- `prototypes/ai-native-workspace/src/host/SavedResult.tsx`: `b0e10166cedc44d55ef6d5ae76e6c5397cc82df945454e67e183982519a430d2`; matches manifest, unchanged.
- `prototypes/ai-native-workspace/src/host/SavedResult.css`: `9f442dc0a113bc35864064731aecde968ef8c65e66e631846e3906ab279a7acc`; matches manifest, unchanged.
- `prototypes/ai-native-workspace/src/host/savedResultCopy.ts`: `5dae7824119a9248236c5448b29f3817217179539ef2a2c70a2533adc6655f0a`; matches manifest, unchanged.
- `prototypes/ai-native-workspace/src/host/HostWorkspace.tsx`: `c746dc94c32a7f65768fcf42cd61c5a91726fd60e9f3a79f77c3bde445528ff4`; matches manifest, unchanged.
- `prototypes/ai-native-workspace/src/host/Constellation.tsx`: `78b0f763433c26505e5ba0e97de82ba540d147c4499597cf2f9ac7031b9119b0`; matches manifest, unchanged.
- `prototypes/ai-native-workspace/tests/savedResultCopy.test.mjs`: `588780ef2b4a8d7d70617749f496b09da7c05cb4c3c8ec14d803e013cfb4118e`; matches manifest, unchanged.
