# Focused reproduction steps

## Inherited demo focus-order issue

1. Open either the live homepage or frozen Galaxy V2 homepage.
2. Keyboard-focus `Review a proposal`.
3. Press Enter.
4. Observe `document.activeElement` is `.demo-panel` with `tabindex="-1"` and `aria-live="polite"`.
5. Press Tab once.
6. Observe focus lands on `Reset example`, skipping the stage-choice buttons in forward order.

Expected: activating a toggle-like demo choice keeps focus on that button while the polite live region announces the result, or otherwise provides a predictable forward path into stage choices.

## Recheck after integration

- Desktop: Tab to More → Enter → Tab reaches FAQ → Escape closes and restores focus.
- Demo: select an example by keyboard; next forward Tab should reach the next meaningful control, not skip the stage group.
- Mobile 390px: Menu target at least 44px high; Enter opens; next Tab reaches The app; Escape closes and restores focus.
- 640px CSS width: `document.documentElement.scrollWidth === document.documentElement.clientWidth`.
- Reduced motion: emulated `prefers-reduced-motion: reduce` produces computed root `scroll-behavior: auto`; no non-zero animation/transition durations.
