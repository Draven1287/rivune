# Rivune native cosmos website candidate V1

This isolated candidate applies the exact background asset used by the native Rivune app and replaces the stacked homepage previews with one focused interactive hero.

## Review

- Preview: `http://127.0.0.1:4295/rivune/`
- Frozen source: `source/`
- Built preview artifact: `dist/`
- Browser and visual evidence: `evidence/`
- Asset provenance: `evidence/ASSET_PROVENANCE.md`
- Text delta from the accepted V5 presentation candidate: `evidence/native-cosmos-v1-text.patch`
- New binary asset: `source/assets/rivune-workspace-milky-way.png`, SHA-256 `0e758d81cd77a3ad9e73fe3db997e45eb91c34107cf538dfa95254996fe0878f`

## Verified behavior

All 24 static tests pass. Browser QA covers eight routes, direct loads and reloads, navigation history, desktop and mobile menus, the interactive demo, platform states, reduced motion, widths of 1280/768/390/320 pixels, and a 640-pixel 200%-zoom equivalent. No tested page has horizontal overflow or console errors.

The demo keeps keyboard focus on the activated control while its polite live region updates. The Pages artifact inventory uses the current no-dotfile packaging baseline.

## Integration boundary

This is a review candidate only. It was not deployed or published. The website owner should independently review the rendered result and port the intended HTML, CSS, asset, and verified functional corrections onto the current branch without replacing newer unrelated work.
