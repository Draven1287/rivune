# Quiet Conversation working preview QA

Final result: passed

Scope: bounded shadcn component integration and calm reading preview, pending independent review and user visual acceptance. This is not a pixel-identical reproduction or native/provider acceptance.

Source visual truth: /Users/Aaravshah/.codex/generated_images/01a0847d-ff64-7d21-9285-20c144268a56/exec-7cb96637-eda1-4493-a4e7-748eb6dc2353.png
Implementation: ../../qa-artifacts/shadcn-quiet-preview-20260910/preview-desktop.png
Both source and implementation 1487 × 1058 pixels, implementation CSS viewport 1487 × 1058 at 1x. Same synthetic SQLite conversation, results closed. Both images were emitted together in a single browser comparison call; no density rescaling needed.

## Comparison and findings

- Typography: source has larger display text and an explicitly formatted answer heading. Implementation keeps the current safe plain-text host renderer and system font at 16px/1.65. This is an intentional bounded integration difference; structured answer typography remains a later design decision, not an implied capability of saved text.
- Spacing: compact 224px sidebar, 52px headers and 720px reading measure. Source uses a wider sidebar and larger type; implementation retains search and explicit Refresh. Composer remains anchored while transcript scrolls. These proportions are intentional for the working desktop slice.
- Colors: dark opaque reading and typing planes, subdued galaxy only on sidebar and far-right edge. This corrects the distracting full-screen clear-glass screenshot. Visible star detail no longer intersects the central text column.
- Images: existing packaged Rivune icon and galaxy retained. The generated silver-orbit logo and its exact crop are not yet production assets; no fabricated SVG replacement was introduced. Existing icon is sharp at its displayed size but not the final selected identity.
- Copy: synthetic content matches the design topic. Artifact uses contract-defined “Final answer”, not invented filename. Completion derives from saved run status. Constellation evidence remains on demand and explicitly distinguishes synthesis from peer review. Provider readiness remains unverified rather than simulated as connected.

The full-resolution comparison made labels and spacing readable, so separate image crops were not needed. Configuration and Settings were inspected separately as live interaction states; screenshots are in the same evidence directory.

## Corrections and comparison history

1. Initial preview could not hydrate: synthetic lead identity and artifact display name violated existing host contracts. Corrected fixture only; no production validation weakened. All four mounted cases pass.
2. Initial rendering hid peripheral galaxy entirely. Added scoped dark-overlay backgrounds at sidebar/right edge; compared reference and corrected desktop screenshot together.
3. Compact configuration editor inherited overflow clipping. Made composer overflow visible and editor independently scrollable; rendered editor rectangle fits desktop viewport.
4. Keyboard menu selection returned focus to the trigger instead of the form. Added open-form focus and prevented Radix close autofocus only when editor opens. Verified ArrowDown/Return → Execution mode, Escape → Choose execution mode, editor closed.

## Validation

Four mounted synthetic scenarios pass at 1487, 390 and 320 CSS pixels: new/open/save/send and visible synthetic response; rejected save retains draft and prevents send; Settings close preserves draft and returns focus; result inspection preserves composer without mutation. No horizontal document overflow at 320/390. Settings Escape returns focus to Settings. Results open on demand and display the captured saved answer. Frontend typecheck/build pass. Earlier preserved controller/scenario/desktop-build tests: 62/62 pass.

Console inspection found historical fixture failures and React test-act notices during interactive preview/HMR. No new duplicate React-hook crash after dedupe/server recovery. These logs are not a clean-console claim. Native launch, real provider response, clipboard and paid services were not tested.

## Follow-up

Independent UI/state review and user feedback remain pending. Refine final logo, structured answer hierarchy and Constellation presentation after design feedback. Claude Design handoff is prepared locally, with access unverified and no external submission.
