# Rivune website review — 2026-09-08 15:01 MDT

## Corrected decision

The authoritative user-approved website baseline is `qa-artifacts/rivune-interactive-site-20260907/static-review-v2/rivune`, supported by `STATIC_BROWSER_REVIEW_V2.json`. Frozen V6 is an earlier source baseline and must not be restored as the accepted design or copy direction.

The live GitHub Pages site still contains older Mac-native product language. Record that as a pending release difference. Do not overwrite the approved local design and do not publish until the interactive overlay has been integrated into the authoritative build and the resulting current preview is reviewed.

## Approved direction to preserve

- Unified product naming: the two user-facing experiences are **Single AI** and **Constellation**. Council and Swarm are internal Constellation strategies, not separate top-level modes.
- Centered galaxy hero with the approved concise invitation.
- Intentional DOM-based interactive tour on `/app/`; do not replace it with a screenshot or move a side-by-side product mockup into the hero.
- Rounded footer and no hero divider.
- Contact flow with **Copy email address** and **Write in Gmail**.
- Mac-first platform selection on Download, while macOS, Windows, and Linux installers all remain unavailable.
- Explicit preview limits: sample content, no AI requests, memory-only drafts, and no sign-in or account creation.

## Current public release difference

The live site at `https://draven1287.github.io/rivune/` still includes older phrases such as “Native Mac app,” “Mac installer coming soon,” “native Mac workspace,” macOS 26 requirements, and top-level Auto/Council/Swarm framing. Those differences remain valid release work, but the replacement source is the approved interactive overlay rather than frozen V6.

Required release integration:

1. Integrate the approved overlay templates, `tour.css`, `tour.js`, and `refinements.css` into the authoritative static-site build.
2. Produce one current nine-page preview from that build.
3. Verify that the approved visual treatment and Single AI/Constellation language survive integration.
4. Re-run desktop, tablet, and mobile route checks, including the `/app/` tour, contact copy/Gmail behavior, appearance switch, settings focus return, and unavailable platform states.
5. Publish only after explicit approval of that integrated preview.

## Verification of the approved artifact

- `STATIC_BROWSER_REVIEW_V2.json` records 64 passing checks with no errors or blocked items.
- All 15 files in its source manifest currently match their recorded SHA-256 hashes.
- The checks cover nine direct routes at 320, 390, and 1280 px; no unresolved templates or horizontal overflow; centered-hero refinements; removed divider; rounded footer; Single AI and Constellation; Constellation disclosure; default macOS and working Windows selection; Gmail recipient and copy feedback/fallback; memory-only draft behavior; sample lead changes; appearance switch; settings focus return; no external requests; and no uncaught browser errors.
- The artifact remains unpublished and marked as a review preview.

## Benchmark boundary

Traycer remains useful for observing clarity, interaction density, and proof techniques. Its side-by-side or above-fold product presentation does not override the approved Rivune composition. No competitor-driven hero or mode redesign is recommended.

## Boundary

No website implementation or public deployment was changed. This report corrects the earlier baseline-dependent recommendation and routes the remaining work to the coordinator/product-direction task.
