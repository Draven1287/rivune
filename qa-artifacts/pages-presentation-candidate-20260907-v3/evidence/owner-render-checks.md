# Owner mobile polish checks

Local generated preview: `http://127.0.0.1:4288/rivune/`, served from `site/dist` under the `/rivune/` base path. No non-loopback navigation or public action occurred.

- Viewport: 390 x 844.
- Product enlargement link was visible with rendered size 130 x 44 px, text `View larger image`, href `/rivune/assets/native-workspace.png`, `target="_blank"`, and `rel="noopener"`.
- Enlargement URL returned HTTP 200, `image/png`, 108,787 bytes, byte-identical to the source 1152 x 768 screenshot.
- Mobile Menu opened and its `The app` anchor was activated. After navigation, URL hash was `#product`, product top was 0, and the `<details>` element had `open=false`.
- Repeated with keyboard Enter activation: hash became `#product` and menu remained closed.
- No horizontal overflow at 390 px.
- Browser console contained no warnings or errors.
- Visual inspection showed the larger-image link directly beneath the contained screenshot, before its unchanged development-preview caption. The following workflow section remained correctly spaced.
