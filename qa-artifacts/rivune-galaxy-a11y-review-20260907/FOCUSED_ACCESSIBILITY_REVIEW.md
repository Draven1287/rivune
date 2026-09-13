# Focused accessibility and interaction review — Rivune Galaxy V2

**Standard:** WCAG 2.1 AA, with 44px touch-target advisory  
**Date:** September 7, 2026  
**Disposition:** Galaxy V2 visual/CSS direction accepted for integration; one inherited demo-focus correction required before broad interaction acceptance.

## Scope and evidence boundary

Compared:

- Live baseline: `https://draven1287.github.io/rivune/`
- Frozen candidate: `http://127.0.0.1:4294/rivune/`
- Candidate source: `qa-artifacts/rivune-galaxy-candidate-20260907-v2/`
- Candidate CSS SHA-256 independently confirmed: `d781bbbd7115309844f6e33fc8b0ee88cb8a78effbc453b616e46393c095fd1e`
- Candidate patch SHA-256 independently confirmed: `0d32f9bfcc7afbbc3d901808f29ee35221ba4a8249d7a3ce0805dbade68d829d`

This was a focused homepage review, not a repeat of the route suite. It used browser accessibility trees, computed styles, keyboard operation, screenshots, responsive viewport overrides, and reduced-motion emulation. It did not run Lighthouse, profile GPU/frame timing, use VoiceOver/NVDA, publish, or modify source.

## Summary

Galaxy V2 materially improves atmosphere without putting decoration through reading surfaces. Its nebula and irregular light points are CSS-only, page-level, noninteractive, and nonmoving. Workspace/demo card pseudo-stars resolve to `content: none`; both cards use opaque gradients. The selected-control glow is static and does not replace the pressed state or focus ring.

No contrast, overflow, menu, reduced-motion, or decoration-related blocker was found. One major interaction issue is inherited unchanged from the live baseline: demo selection moves focus away from the trigger to the live result panel, and the next forward Tab skips the remaining selection controls. One minor advisory remains: mobile demo controls are 42px high rather than the 44px target used by this review checklist.

## Findings

### Operable

| # | Finding | Criterion | Severity | Recommendation |
|---|---|---|---|---|
| 1 | Activating “Review a proposal” moves focus to `.demo-panel[tabindex=-1][aria-live=polite]`; the next Tab lands on “Reset example,” bypassing the stage buttons in forward order. This reproduces on both live V5 and Galaxy V2, so it is inherited rather than a Galaxy regression. | 2.4.3 Focus Order | Major | Keep focus on the pressed button and let the existing polite live region announce updated content. If focus movement is retained, restore a predictable forward path into the stage controls. |
| 2 | At 390px, all six demo choice/stage buttons are `301 × 42` CSS px and Reset is `114 × 42`; Menu is `60 × 44` and hero actions are `339 × 50`. | 2.5.5 Target Size (AAA/advisory, not a WCAG 2.1 AA failure) | Minor | Raise demo/reset minimum height from 42px to 44px, especially for touch use. |

### Perceivable

No blocking issue found. Computed candidate ratios against the relevant opaque/base endpoints:

| Element | Foreground / background | Ratio | AA requirement | Result |
|---|---|---:|---:|---|
| Primary text on base | `#f3f5f7` / `#060811` | 18.29:1 | 4.5:1 | Pass |
| Hero supporting copy on base | `#b8bbc1` / `#060811` | 10.39:1 | 4.5:1 | Pass |
| Small preview disclosure against lighter card endpoint | `#909daa` / `#171d2d` | 6.07:1 | 4.5:1 | Pass |
| Preview composer text against lighter card endpoint | `#d8e0e9` / `#171d2d` | 12.61:1 | 4.5:1 | Pass |
| Unselected demo control | `#b5c0cc` / `#11161d` | 9.84:1 | 4.5:1 | Pass |
| Selected demo control | `#eef6ff` / `#19293b` | 13.55:1 | 4.5:1 | Pass |

The page-level translucent nebula changes local pixels behind hero copy, so endpoint/token calculations are not a substitute for pixel sampling on every gradient position. Desktop/mobile visual inspection did not show a legibility loss; the opaque product/demo cards remove that uncertainty from dense reading areas.

### Understandable and robust

- More and Menu remain native `details/summary` controls with exposed collapsed/expanded semantics.
- Example and stage buttons retain `aria-pressed` names and values.
- The changed demo content remains in `aria-live="polite"`.
- Decorative icon instances use empty alternate text while the wordmark supplies “Rivune.”
- Galaxy decoration is CSS background/pseudo content and does not enter the accessibility tree.

No screen-reader certification is claimed because spoken VoiceOver/NVDA output was not tested.

## Reproducible interaction evidence

### Desktop baseline and Galaxy V2

- Default viewport: `1280 × 720`; document `scrollWidth = clientWidth = 1265` on both observed pages.
- More receives a 3px `rgb(224, 189, 255)` focus outline.
- Enter opens it, the next Tab reaches FAQ, Escape closes it and returns focus to More.
- Keyboard demo choice/stage changes update `aria-pressed`, content, and the result-panel focus outline.

### Mobile Galaxy V2

- Requested viewport: `390 × 844`; effective client width `375`; `scrollWidth = 375` (zero horizontal overflow).
- Menu receives the same visible 3px focus outline; Enter opens, next Tab reaches The app, and Escape closes with focus on Menu.
- Galaxy background remains behind—not inside—the opaque product card.

### 200%-equivalent reflow

- The in-app browser did not expose reliable browser zoom controls, so this check used a `640 × 500` CSS viewport as the 200%-equivalent width for a 1280px desktop.
- Effective client width and scroll width were both `625`; no horizontal overflow.
- The layout switched to the mobile Menu and the H1 reflowed at 48px/51.84px without clipping.

This is zoom-equivalent reflow evidence, not proof of the browser’s actual 200% zoom command.

### Reduced motion

- Normal emulation: `prefers-reduced-motion = false`, root scroll behavior `smooth`.
- Reduced emulation: `prefers-reduced-motion = true`, root scroll behavior `auto`.
- Scanning computed styles found zero elements with non-zero CSS animation or transition duration in either mode.

## Visual density and performance observations

- Live CSS: 26,245 bytes; Galaxy V2 CSS: 29,573 bytes; uncompressed increase: 3,328 bytes (12.7%).
- The frozen diff adds CSS only. No image, font, script, or external-resource dependency is introduced by Galaxy V2.
- The candidate uses three translucent nebula gradients and twelve sparse point gradients at page level, plus one blurred hero pseudo-element. They are static with `background-attachment: scroll`.
- This makes the hero more distinctive while retaining a quiet card interior. It does not reduce the page’s existing length or demo-control density.
- No frame-time, paint-time, energy, or low-end-device profile was run; no performance score is claimed. The static/no-request design keeps the risk bounded, but actual compositor cost remains unmeasured.

## Acceptance gates for integration

1. Integrate Galaxy V2 CSS/body class without reintroducing V1 card pseudo-stars or translucent card surfaces.
2. Correct the inherited demo focus sequence and retest keyboard choice → stage selection → Reset.
3. Prefer 44px minimum height for demo/reset controls; treat this as a small usability improvement rather than an AA blocker.
4. Preserve visible 3px focus rings, `aria-pressed`, Menu/More Escape behavior, opaque reading surfaces, and reduced-motion `scroll-behavior: auto`.
5. Recheck the integrated 390px and 640px-equivalent homepage only; the route suite belongs to the integration owner.

