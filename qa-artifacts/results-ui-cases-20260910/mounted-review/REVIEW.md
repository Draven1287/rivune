# Mounted Results UI review — 2026-09-10

Verdict: bounded PASS for manually observed desktop/320/390 behavior; no actionable visual defect found. Detached-opener fallback and full keyboard traversal remain untested. This is a synthetic browser review, not native/provider/release acceptance.

Read RESULTS_PANE_INTEGRATION_RECEIPT_20260910.md, current ResultsPane/useHostResults/CSS and selected renderer test source. Independently calculated all eight manifest hashes: 8/8 exact match; full expected/actual SHA-256 values in hashes.json. No production changes.

Opened only existing port4317/tests/hostRenderer.html?scenario=results-pane&preview=1 in reviewer-owned hidden in-app tab16. The page completed with Synthetic checks: PASSED (5). Independently inspected screenshots at 1280×900,390×844,320×844; screenshots were viewed locally, not saved or forwarded. No other reviewer was assigned browser use; state review is source-only.

## Manually observed

- Desktop has distinct Conversations, central Chat and right Results columns; transcript/composer/result surfaces are readable and opaque, galaxy confined to perimeter/navigation. Header Results entry point is deliberate and list opens without auto-selected content.
- At390, Results list fits the viewport with wrapping provenance; Results navigation is selected, Chat/Conversations remain available. At320, inspection title, Back, Close, text and copy/select controls fit; text scrolls internally. document scrollWidth equals320/390 respectively, with no page horizontal overflow.
- Open focuses Results heading. Selecting exact result-a focuses Final answer heading and displays literal Saved A Unicode/script-tag text. Back restores the exact result-a row accessible name. At320, Escape from the inspector heading closes Results and restores Results (2) opener.
- At320, Chat remains present with inert attribute and computed visibility:hidden while Results is open. Entered a local draft, opened Results and activated Chat: pane closed and exact draft remained. Conversations navigation closes Results and marks Conversations selected. Cleared the synthetic local draft afterward; no Save or Send action used.
- Visible wording matches current integrated copy: Back to results, Close results, Copy saved text, Select all text, Saved answer and frozen Provider ID. No manual Copy click or OS clipboard use. Full Constellation origin variants are not present in this two-direct-result preview, so their correctness is source/other-review dependent.

## Evidence precision and remaining checks

Read the five test bodies against the visible five-pass summary. They meaningfully assert exact adapter inspection, mounted node/draft/scroll preservation, A/B and same-tuple races, invalidation, retry duplicate guard, foreign identity rejection, disposal, clipboard-stub generations and failure selection fallback. The clipboard test replaces/restores navigator.clipboard; its pass does not prove OS clipboard behavior.

Navigation coverage is conditional: rejected/successful button navigation is tested only above1000px. Narrow tests change activeConversationID through a fake snapshot; they do not exercise a rejected narrow user navigation attempt. My manual320 checks cover Chat/Conversations pane navigation and retained draft, not failed host conversation opening. The receipt's five-pass-at-each-width claim must retain that distinction. This review observed one five-pass run then manually resized; it did not independently rerun all five scenarios at each width.

Detached opener cannot be produced through the exposed ordinary preview controls without changing/removing DOM or extending the fixture. Not attempted. Source close() checks connected/visible/non-inert opener and otherwise focuses chat heading, but this is not dynamic proof. Add an owner-controlled synthetic opener-removal case before calling fallback fully verified. Full Tab traversal, zoom and screen-reader operation were not tested this turn.

Layout uses a1000px threshold and proportional right column, differing from the earlier nominal320/minimum480 proposal. At requested1280/320/390 viewports it was readable. Intermediate widths and480px minimum central chat are not accepted by this review.

Next dependency: sole builder/state reviewer resolve any independent source findings; owner may add the detached-opener fixture if closure is required. No need to repeat already accepted visual screenshots. Native restart, packaging, provider execution and release remain separate.
