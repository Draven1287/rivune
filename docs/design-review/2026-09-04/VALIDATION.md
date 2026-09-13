# Design artifact inspection

Completed September 4, 2026, America/Denver. Scope: the isolated browser prototype in this directory only.

## Results

- 31 screen/size combinations inspected for horizontal page overflow; none found.
- Wide capture: all 11 screens at 1512 × 982.
- Compact capture: the eight app states and website concept at 900 × 800.
- Enlarged reading text: decision, connection, approval and project states at 900 × 800.
- Additional layout checks: seven states at 640 × 800.
- 10 interaction checks passed: work tabs/Escape, draft editing during work/Stop, attachments, draft team excluding a vendor, stale catalog and account-count states, simulated access approval, incomplete checkpoint, browser-local feedback, dialog keyboard focus, and transcript-scroll preservation.
- No JavaScript runtime errors, missing images or unnamed buttons were found in the wide screen set.
- Source preservation: all 148 files in `source-baseline.json` retain their original hashes. The production website Git status remained clean. New files are confined to this planning-artifact directory.

Evidence: `inspection.json`, `preservation-check.json`, and the `screenshots` directory. `inspect.cjs` can reproduce the browser inspection using the bundled Playwright library and installed Chrome. It requires this directory to be served at `http://127.0.0.1:8766/`.

## Visual critique and changes

The answer leads the conversation screen; work details occupy the optional panel. The homepage uses the actual mark and a single prompt surface. Website typography is larger and editorial while retaining the same colors and app imagery. Settings groups controls consistently, and error content names the failed account and unfinished evidence.

The first compact render left a narrow visible fragment of the transcript beside the overlaid panel. The final design replaces the detail pane with the work view at compact widths. Closing it restores the unchanged transcript. This gives the preview useful width without making the answer unreadable.

Keyboard cycling initially allowed focus to leave the dialog controls. The prototype now explicitly cycles first/last focusable controls; the focused inspection passes. The initial approval assertion also ran before the hash-navigation render completed; the inspection now waits for the active-run state before checking scope.

Native-scale reading text is 15 px in this browser artifact, increased to 19 px by the review toggle. Small metadata remains secondary; the final native design still needs Dynamic Type/accessibility sizing decisions. The transcript and Settings content scroll independently, so long answers and below-fold controls remain reachable. The composer occupies its own layout row.

## Limits

This is not SwiftUI/AppKit and does not prove native focus behavior, VoiceOver, macOS window restoration, native text selection, live streaming, tool enforcement, process cancellation, provider capabilities, account isolation, history migration, installer readiness, or production accessibility conformance.

No full WCAG or native screen-reader audit is claimed. Browser keyboard focus and layout checks are limited evidence for this design review. Wide tables and code have contained scrolling. Reduced-motion styling removes motion dependency; there is no animated progress required to understand fixture status.

The Fieldwork website, agent activity and green check receipts are illustrative fixtures. No end-to-end agent-built website was executed. The separate future proof must run on real integrated files and retain actual test output and responsive screenshots.

No production code was changed; no app build, install, model benchmark, release packaging or deployment was performed. Serving this review directory locally is solely for viewing the design artifact.

## Review status

Ready for the user's visual and scope review. Not approved for implementation. Feedback remains pending in `FEEDBACK.md`.

## Revision 03 screenshot comparison

Supersedes the earlier visual presentation. The supplied Codex screenshots were read as visual references only. Profile-converted sRGB samples yielded sidebar #202125, conversation #15171d, composer #2c2f34 and selected row #3c3c41. Layout uses a 240 px sidebar, 47 px title bar and 736 px reading/composer width at desktop scale. Settings replaces workspace navigation. Account menu anchors above the account row. Screenshot-matched presentation uses Rivune labels and fixture data; this is not a claim of identical implementation or all Codex features.

See reference-inspection.json for the latest 24 screen/width checks, account/Settings/back navigation, review navigation, Stop and draft preservation. The earlier inspect.cjs assumes an always-visible review toolbar; revision 03 moves it behind Design preview. No production app changes.
