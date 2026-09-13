# Follow-up renderer review

Frozen app.mjs cb68d6162ca1d52bdfd0a9e8a7b1224ff61eb975c9c2757451dce25c096a75e6, core.mjs 9212ed6b78ceeed8534e83d560ba58fb76ca5e1076ee514b9b44989a124bae35. Captured source identity in SOURCE.json.

Resolved in these actual-module fixtures: accepted-send debounce resurrection and returning to a saved draft both pass. Asynchronous completed answers appear after a refresh. This is not desktop end-to-end acceptance.

Remaining reproduced failures:
- During a slow pre-submit save, two unchanged submit gestures can both reach admission sequentially, producing two requests. Submission is guarded only after the first await. Require a synchronous preparation guard that also survives background render updates.
- A failed pre-submit save escapes the event handler's try/catch, producing an unhandled rejection instead of a visible recoverable error. Preserve the draft and explain the failed save.
- In a rendered Chromium fixture, one normal status refresh replaces a focused conversation button; focus falls to BODY. Preserve keyed sidebar nodes and focus when only status changes.

Evidence: RESULTS.tap (three passes/two failures), KEYBOARD_REVIEW.json and keyboard-review.cjs. No real app, AI provider, account, or user workspace data was used. Runtime owner has all findings; root made no candidate4 edits.
