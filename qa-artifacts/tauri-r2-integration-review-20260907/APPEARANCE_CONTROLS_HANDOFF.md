# Graphite appearance controls

Two new production files are released for runtime integration. Exact hashes and browser acceptance are in APPEARANCE_CONTROLS_SOURCE_RECEIPT.json. Existing app/chrome/index/styles files were not edited.

Initialize once from the canonical appearance setup, after the Appearance panel exists:

```js
import { initializeAppearanceControls } from './appearance-controls.mjs';
initializeAppearanceControls({
  container: document.querySelector('#settings-panel-appearance .settings-section')
});
```

The optional storage argument accepts synchronous getItem/setItem methods, defaulting to this window's localStorage. A document-level singleton prevents duplicated controls. destroy() removes controls, disconnects the theme observer, and clears owned CSS variables. The external stylesheet loads once using import.meta.url, without inline style blocks or CSP changes.

Runtime must remove “color controls are not available yet” from the existing Appearance note when integrating, retaining the truthful custom-image/video limitation. Do not expose a second native settings window. This module is in the existing in-app Appearance panel.

Backgrounds: Graphite, Midnight, Charcoal, or an accepted six-digit dark hex color. Accents: Ice, Mint, Lavender, or an accepted light hex color. Color editing updates an in-panel sample; Save applies and persists. Reset writes defaults. Invalid drafts never alter the active workspace. Invalid saved data falls back visibly. Failed saves apply only to this window and disclose that reopening may restore previous saved colors.

Only Graphite applies the owned background/accent variables, including the opaque ambient layer. Galaxy/Orbit keep their existing artwork and colors. The module observes the current data-background attribute without changing the selected theme. Validation retains at least4.5:1 normal-text contrast for affected dim labels, accent text on the darkest/brightest affected surfaces, and dark button text on accents. It does not claim a full-app accessibility audit.

Validation: 29 actual-module DOM checks against canonical app markup/styles under canonical Tauri CSP, including error/recovery, presets, keyboard, theme switching and widths390/760/1120. Independent read-only review found the ambient backdrop issue; fixed and re-reviewed with no remaining concrete P1/P2 in this scope. No provider/account calls. No native build was tested.

Next native acceptance: open Appearance, switch Graphite, Save a color, inspect sidebar and main workspace, switch Galaxy/Orbit and back, Quit/reopen to confirm saved choice. Verify save-failure feedback through supported QA storage failure handling without altering real user data. Test keyboard focus/scrolling in the integrated settings window. Color controls are not complete user-facing app behavior until this integration and native acceptance happen.
