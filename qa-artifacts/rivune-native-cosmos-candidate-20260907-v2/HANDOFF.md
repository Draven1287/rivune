# Rivune native cosmos website candidate V2

V2 preserves the user-approved native galaxy background and revises only the homepage typography, messaging hierarchy, and demo placement.

## Review

- Preview: `http://127.0.0.1:4296/rivune/`
- Frozen source: `source/`
- Built preview: `dist/`
- Browser and visual evidence: `evidence/`
- Delta from native cosmos V1: `evidence/native-cosmos-v2-text.patch`

The headline is centered and deliberately wraps as “Your AI tools.” / “Working together.” The single prewritten Council example now follows the hero and has three stage controls. Lower sections explain independent perspectives, mediator synthesis, everyday thinking, coding, and draft review. The copy states that Council is in development and does not claim correctness.

The exact native background remains byte-identical to the app asset with SHA-256 `0e758d81cd77a3ad9e73fe3db997e45eb91c34107cf538dfa95254996fe0878f`. No font, background, app screenshot, or other visual asset was added.

## Verification

All 24 static tests pass. Browser QA passes all eight routes, direct loads and reloads, history navigation, desktop and mobile menus, three-stage demo behavior and focus retention, platform states, reduced motion, widths of 1280/768/390/320 pixels, and a 640-pixel zoom equivalent. No tested page has horizontal overflow or console errors.

This is a local review candidate. It was not published or deployed.
