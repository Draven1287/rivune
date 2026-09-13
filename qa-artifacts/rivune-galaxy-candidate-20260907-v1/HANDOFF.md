# Rivune Galaxy V1

Status: isolated local visual candidate for review. Galaxy is the selected direction; this render has not replaced the accepted V5 site and was not published.

## Direction

The visual metaphor is many perspectives converging into one calm workspace. Original CSS radial gradients create nebula depth and fixed points of light around the hero and page edges. Product and demo surfaces remain opaque and quiet enough for long-form reading. Selected demo controls receive a restrained blue glow that connects interaction to the galaxy language.

The existing V5 content, real routes, header order, About/contact, Denver provenance, platform availability, prewritten demo, release gates, and no-screenshot rule are preserved. No image generation, paid assets, external fonts, particle library, autoplay, or live AI request is used.

## Review

- Local URL: `http://127.0.0.1:4293/rivune/`
- 23/23 unit tests passed.
- Browser QA passed for all eight routes at 1280x1000, 768x900, 390x844, and 320x568, plus a 640px 200%-zoom equivalent check.
- Direct load, refresh, Back/Forward, active navigation, More/mobile disclosures, demo stages, focus behavior, reduced motion, platform gating, and DOM product previews passed.
- No horizontal overflow, console errors, external page-resource requests, or public app-screenshot assets were found.
- Measured key text contrast ranges from 9.76:1 to 18.49:1.
- The generated CSS is 28,188 bytes and the generated homepage is 12,525 bytes. The galaxy treatment adds no new runtime request.
- `galaxy-v1.patch` recreates the 21-file Galaxy source exactly from frozen V5.

## Files

- `source/`: complete Galaxy V1 source.
- `dist/`: generated coming-soon preview.
- `evidence/`: browser report, desktop/mobile screenshots, build/test logs, contrast check, and patch validation.
- `galaxy-v1.patch`: exact frozen-V5-to-Galaxy-V1 source delta.
- `manifest.json`: SHA-256 inventory.
