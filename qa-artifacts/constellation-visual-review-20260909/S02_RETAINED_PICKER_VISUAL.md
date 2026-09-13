# S02 retained Settings picker — independent bounded visual receipt

Receipt completed: 2026-09-10T03:12:59.313374+00:00

## Verdict

No actionable visual defect was established in the retained synthetic Settings preview checks actually observed. The retained preview resolves the prior results-only access dependency in S02_CONNECTION_GUIDANCE_VISUAL.md. This is partial visual acceptance, not completed desktop/mobile/focus acceptance or live provider verification.

## Observed retained-preview evidence

Authorized URL: http://127.0.0.1:4317/tests/hostRenderer.html?scenario=provider-setup&preview=1&settings=1. Only this selected synthetic fixture was opened.

- Settings remained mounted. Close settings initially had focus. Installation, Sign-in and Response test were distinct semantic labels, with Installed / Not verified / Not tested values. Next-step guidance explicitly avoided treating installation or an earlier response as proof of account access.
- Add a connection explained that the workspace default preserves saved conversation/provider and Constellation-team bindings and draft text. Find installed providers was deliberately placed before the route selector/save action.
- At 320×568, authorized fake Find installed providers revealed a native Installed route selector with Choose a provider and Codex · /synthetic/preview/codex. Save as workspace default was disabled before selecting a route. Guidance explicitly said sign-in and response readiness had not been checked.
- The 320px screenshot was observed: explanatory text wrapped readably, selector and disabled save did not overlap, and vertical scrolling was necessary. Measured dialog client width 269px and scroll width 269px (no dialog horizontal overflow); client height 481px and scroll height 1136px.
- Selected the synthetic Codex option and pressed Tab on the selector without activating Save. Viewport was then changed to 390×844. No manual save, real provider inspection/configuration, native launch, source edit, or unfiltered harness was performed.

## Source wording review

Current ProviderSetup.tsx explicitly says an uncertain save must be checked before another attempt. A matching snapshot says crash durability remains unconfirmed and no request was replayed; persistent guidance says equality does not prove survival of a crash. Check saved configuration and Review routes for a new save are distinct actions. These are source-observed strings and controls, not manually exercised uncertain-save transitions in this review. Builder-reported selected tests in S02_ROUTE_PICKER_RECEIPT_20260910.md remain owner evidence.

## Remaining evidence limits

The final prior browser invocation requested a 390px screenshot, Escape dismissal/focus inspection, and a 1440×900 viewport. Its result was lost to context truncation; those outcomes were not observed and are not accepted here. Desktop layout, 390px overflow, centered close alignment, post-selection Save focus, and Escape focus restoration therefore remain unverified by this reviewer. The initial Close focus and 320px observations above are retained evidence. No browser checks were repeated merely to reconstruct this receipt. No current browser availability or viewport restoration is claimed.

There is no longer a missing-retained-preview dependency. The remaining dependency is a bounded reviewer observation of the listed viewport/focus outcomes if full visual acceptance is required. No product defect or provider readiness conclusion follows from missing observations.

## Provenance and boundaries

This receipt preserves observations from the preceding retained-preview review. Hashes below were captured at receipt completion, not at the original rendered observation; the builder may have changed files meanwhile. They identify the current source checkpoint and do not prove the rendered bundle matched these hashes. Builder receipt names frozen successor dd9706b37e2b5fe162bf0390b2b1bf073e3fd4a0; that is attributed provenance, not independently verified here.

No private screenshots or artifacts were forwarded. This local report contains only the bounded verdict, observed UI facts, source checkpoint and explicit limits.

Current SHA-256 checkpoint (paths relative to prototypes/ai-native-workspace):
- `src/host/ProviderSetup.tsx`: `359f30358b61e428eebc9a38badc217cba9fe8dff72a232fe2cbe7f88e61e764`
- `src/host/HostWorkspace.tsx`: `8fdaba93c94edeaf52f5cbf7789b09538e6522ce9d67ea3977b9be14e04dbd6b`
- `src/host/connectionGuidance.ts`: `59970e52d3ca3935540d83a085329d10f97b3cd78b8c9d3af51d86f6ad9c4b49`
- `src/styles.css`: `d4f550a06c734f66fa0667f7da3ccfeda0f9a5a444e897ff3c3c0f534e31363c`
- `tests/rendererScenarios.ts`: `37ed01e2f1c7093206ce154163bf8afd74d79db79000693b94c87ed35b9ae19d`
- `tests/hostRenderer.test.tsx`: `6b695b5703a4f54de4621a7d377abba4dc94a9d3b10b983286607c17e55fefd8`

## Missing-outcome continuation — 390px observed

At 390×844, selected the fake Codex route, then pressed Tab on Installed route. Focus moved to enabled Save as workspace default; Save was not activated. Screenshot showed readable wrapping, fully visible selected route/save focus ring and Saved work text, with no overlapping controls. Dialog client/scroll width both339px; client height715px, scroll height980px. Vertical scrolling correctly brought focused Save into view. Close header was scrolled above the visible region at this point, so its centering is assessed separately below. An initial measurement selector incorrectly assumed role=dialog rather than native dialog; corrected read-only measurement succeeded (not a product failure).

390px close finding: **P3 — close glyph is off-center and extends below its button.** Screenshot visibly shows × at lower-right of the32×32 button. DOM text-range center offset from button center: +4.34375px horizontal, +11px vertical; glyph bounds x315,y107.796875,w14.6875,h28 versus button x302,y94.796875,w32,h32. Computed style: display:grid, align-items:center, padding:8px12px, font-size24px, line-height36px. Recommend explicit zero padding and centered glyph/line-height within the existing button; verify visually and geometrically at both widths. No source change made.

Escape at390px closed Settings. Focus went to Message textarea in this automatically opened fixture; that is observed fallback behavior, not proof of restoration to a manually clicked Settings opener. Desktop manual-opener restoration is checked next.

1440×900 observed: dialog client/scroll width both507px; client height763px, scroll height869px. Screenshot showed readable guidance, route and Save with no horizontal overflow or overlapping controls. Close glyph has the same +4.34375px/+11px center offset and visibly sits at the button's lower-right (same P3, not a second defect). Opening via Settings focused Close. Tab from Installed route focused enabled Save. Escape from Save closed the dialog and restored focus to the exact Settings button. No Save activation.


390px manual-opener restoration: after navigating Conversations and clicking Settings, the immediate same-invocation Escape did not dismiss the opening dialog. Once mounting was observed, Escape closed it and restored focus to Settings. This records the timing limitation rather than attributing it to a confirmed product defect. Viewport override successfully reset after the final check.

## Final bounded verdict (supersedes earlier incomplete verdict)

The missing responsive and keyboard observations are now completed. At390×844 and1440×900, no horizontal dialog overflow; route-selector Tab reaches enabled Save without activation; Escape from mounted Settings restores its manually used opener. Guidance remains readable. One confirmed P3 visual defect remains: × is off-center and extends below its32px close button at both widths. Acceptance for this fix: visible glyph centered and contained within the button at both widths, preserving accessible name, focus and Escape behavior. No real save/provider/native action, app edit, unfiltered harness, or private screenshot forwarding occurred. No screenshots were exported.

### Before/after source checkpoint for this continuation

- `src/host/ProviderSetup.tsx` before `359f30358b61e428eebc9a38badc217cba9fe8dff72a232fe2cbe7f88e61e764`; after `359f30358b61e428eebc9a38badc217cba9fe8dff72a232fe2cbe7f88e61e764`; unchanged.
- `src/host/HostWorkspace.tsx` before `8fdaba93c94edeaf52f5cbf7789b09538e6522ce9d67ea3977b9be14e04dbd6b`; after `fab2125c2ea7fc2009052511aea3991755fb0a5b2efc48d5236a9c78bb333681`; CHANGED DURING REVIEW.
- `src/styles.css` before `d4f550a06c734f66fa0667f7da3ccfeda0f9a5a444e897ff3c3c0f534e31363c`; after `d4f550a06c734f66fa0667f7da3ccfeda0f9a5a444e897ff3c3c0f534e31363c`; unchanged.
- `tests/hostRenderer.test.tsx` before `6b695b5703a4f54de4621a7d377abba4dc94a9d3b10b983286607c17e55fefd8`; after `3ad8faec601ddfea114048a45b57cf621beba08f6fa5b538e20e5a3ebb198a68`; CHANGED DURING REVIEW.

HostWorkspace.tsx and hostRenderer.test.tsx changed during this continuation; ProviderSetup.tsx and styles.css remained unchanged. Findings describe the observed rendered session, not acceptance of one immutable build. The unchanged stylesheet supports a stable close-layout finding, but no independent bundle-to-source attestation is claimed. Builder should recheck focus behavior against its final frozen candidate.
