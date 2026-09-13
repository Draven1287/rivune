# Independent demo-focus correction review

**Disposition:** Accepted as a bounded functional patch; integration into the forthcoming actual-app-background candidate remains pending.

Reviewed:

- `/private/tmp/rivune-demo-focus-fix/focus.patch`
- `/private/tmp/rivune-demo-focus-fix/check-focus.cjs`
- `/private/tmp/rivune-demo-focus-fix/dist/`

The patch removes programmatic `panel.focus()` calls after example, stage, and reset activation. It keeps the existing `aria-live="polite"` result panel and `aria-pressed` updates. HTML, CSS, visual design, copy, platform-picker behavior, and publication state are outside this patch.

Independent execution:

```text
{"pass":true,"cases":28,"failed":0,"errors":[]}
```

Coverage: seven demo controls × Enter/Space × 1280/390 widths. Every case retained focus on the activated control, preserved two selected `aria-pressed` controls, kept the polite live region, updated content, and continued to the next control in forward Tab order. Evidence file:

- `/private/tmp/rivune-demo-focus-fix/INDEPENDENT_AFTER.json`
- SHA-256 `5d5c5b613d6c0f44ab13dbab8214479af2cd862fa56791fa1511246056839147`

The initial sandboxed run could not bind `127.0.0.1` (`EPERM`). An approved loopback-only rerun completed; this is an environment permission distinction, not a product failure.

Acceptance remains source/browser-functional only. The patch must be applied selectively to the newer website build logic and retested in the final integrated design; replacing that script with this older baseline copy would be unsafe.

