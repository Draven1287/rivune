# Rivune native cosmos website candidate V6

V6 is a text-only successor to the reviewed V5 factual correction. It preserves the approved galaxy presentation, CSS, contact behavior, accessibility behavior, assets, release gates, and unpublished boundary.

- Preview: `http://127.0.0.1:4301/rivune/`
- Frozen source: `source/`
- Built preview: `dist/`
- Evidence: `evidence/`
- V5-to-V6 delta: `evidence/v6-text.patch`

Public product copy now uses plain status language: the desktop app is in development for macOS, Windows, and Linux; downloads and connected AI features are not ready; single-AI chat is being built first; team workflows will follow. App, FAQ, How it works, Council vs. Swarm, homepage metadata, availability cards, and platform status messages no longer expose internal implementation or verification vocabulary.

The Download developer-source disclosure and source documentation retain the exact Tauri/legacy SwiftUI architecture distinction. Privacy retains the detailed storage and routing boundary. The Council guide now says only the legacy Mac build stores history locally and that storage and routing for the new desktop app are still being developed.

Validation:

- All 26 Python release and site tests pass.
- All nine routes return HTTP 200 at 1280×900, 768×900, 390×844, and 320×568.
- No horizontal overflow or browser errors were detected.
- Contact actions, keyboard mode accordions, and all three unavailable platform states pass.
- Home, App, How it works, and Download were visually inspected on desktop and mobile.
- `site.css` and `contact.html` are byte-identical to V5; the galaxy asset retains SHA-256 `0e758d81cd77a3ad9e73fe3db997e45eb91c34107cf538dfa95254996fe0878f`.

No publication, redesign, installer, or application change occurred.
