# Independent focused rendered review — website v3

**PASS for the two mobile-polish changes.** The v3 successor closes both non-blocking interaction notes from the v2 review. Together with `CENTRAL_REVIEW.md` and the preserved v2 whole-page review, this supports local informational-preview acceptance. It does not authorize publication or establish native-app, signed-DMG, or cloud readiness.

## Scope and identity

Read `CENTRAL_REVIEW.md` and v3 `manifest.json`. Independently verified all **12 generated-distribution hashes** before rendering and again afterward; no differences. The exact homepage is `37c9e08a5e53cd3667f0537ae4c0a2858560f9901208766b4fb4379fb67e3650`; CSS is `c0a24f334d41d59e9b0336c4334984229faf63be854af29bfeafb59cf7f3e8a6`. Central source/patch/test verification was not repeated.

Rendered the frozen `site/dist` through `http://127.0.0.1:4270/rivune/` using the existing **Chromium 148.0.7778.96 headless shell**, isolated profile, viewport **390 × 844**, plus the new link at **320 × 568**. External page requests were blocked. No installation, native UI interaction, account use, download/publication or shared source edit occurred. The temporary local server and headless browser were stopped after the check.

## Observations

- **Pointer menu dismissal:** opened Menu and clicked “The app”. The disclosure became closed, URL became `#product`, and the product section settled at its anchor. The heading/image were not obscured by the menu.
- **Keyboard menu dismissal:** focused Menu, pressed Enter, then Tab. Focus reached “The app”. Enter activated it, closed the disclosure, and reached the same settled `#product` target.
- **Larger-image control:** “View larger image” is exposed as a link, measured **130.375 × 44 CSS px**, and shows a clear visible keyboard-focus outline. Its exact href is `/rivune/assets/native-workspace.png`, target `_blank`, rel `noopener`.
- **Keyboard opening and actual enlargement:** pressing Enter on the focused link opened the exact PNG in a new tab. The image fully loaded at **1152 × 768 intrinsic pixels**, with `window.opener === null`. Chromium initially fits it to the 390 px viewport; activating the image switches the viewer from `zoom-in`/390 px to `zoom-out`/**1152 px**. This verifies an actual full-size viewing path, not merely another tiny inline thumbnail.
- **Small mobile link layout:** at 320 × 568, document width remained 320 px and the link remained 130.375 × 44 px. Caption and link stayed inside the card. No horizontal overflow was introduced on the page.
- **Runtime:** no warning/error console entries or page errors during these focused actions.

Screenshots were visually inspected. Product and anchor screenshots wait for smooth scrolling to settle. `independent-evidence/focused-observations.json` records the exact values; `focused-render.cjs` preserves the checks. Evidence images: `pointer-product.png`, `keyboard-product.png`, `image-link-focused.png`, `enlarged-image.png`, `full-resolution-image-view.png`, and `small-mobile-image-link.png`.

No new blocker found. The existing v2 note to refresh the development screenshot to final native manager copy before an installer launch remains separate. This was a viewport-based Chromium check, not physical-phone touch, Safari/WebKit, VoiceOver, or a repeat of the full v2 visual/availability audit.
