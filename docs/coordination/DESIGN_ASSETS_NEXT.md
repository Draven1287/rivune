# Rivune app design asset handoff

Date: September 10, 2026  
Scope: approved local Rivune app artwork inventory for RIVUNE APP BUILDER  
Boundary: reference and integration guidance only. No artwork was regenerated, cropped, extracted, uploaded, changed, published, or written into production by this audit.

## Current design sources

| Role | Exact local source | Intrinsic size | Bytes | SHA-256 | Readiness |
| --- | --- | ---: | ---: | --- | --- |
| Selected silver orbit concept | `brand-assets/explorations/2026-09-10-premium-refinements/orbit.png` | 1536 × 1024 PNG | 1,450,714 | `17b9205f1e0ddbd0df02ca299b3289eb4ae4874f85708ddbe7fcab8e1d7ffd43` | Approved visual reference; presentation board, not a production icon |
| Milky Way workspace background | `brand-assets/explorations/rivune-workspace-milky-way.png` | 1672 × 941 PNG | 2,731,560 | `0e758d81cd77a3ad9e73fe3db997e45eb91c34107cf538dfa95254996fe0878f` | Packaged master with byte-identical runtime copies |
| Existing Rivune wordmark | `Rivune/Assets.xcassets/RivuneWordmark.imageset/RivuneWordmark.svg` | 650 × 64 SVG; `viewBox="0 0 650 64"` | 786 | `7db356aaa01e424f8b39976df835f3e387a2b6910212c7e71e0c6bbf4f018b06` | Project-created vector with packaged provenance |

These are separate design sources. The current logo direction comes from the concept board; the galaxy is a workspace background; the SVG is the existing wordmark. Do not combine them into a star-filled app icon.

## Silver orbit: selected direction and extraction boundary

The selected concept is the **large left-hand rounded-square icon** in `brand-assets/explorations/2026-09-10-premium-refinements/orbit.png`: a clear all-silver ribbon R, a tilted silver orbit, and a smooth near-black tile.

Preserve its R geometry, orbit angle, overlap, proportions, metal treatment, spacing, and composition. The accepted icon direction has **no stars, galaxy, blue glow, or central pearl**. The same R-and-orbit silhouette should become a flat single-color menu/tray mark, with only the optical gap adjustments required for legibility at 16–22 px.

The PNG is a presentation board containing a Dock/app-icon rendering, a separate black silhouette study, a small menu-bar mockup, and the word “Rivune.” It cannot be shipped whole and should not be treated as an icon crop. The production icon and monochrome menu/tray source have not yet been extracted or rebuilt. RIVUNE APP BUILDER remains the only owner allowed to perform that production work and must compare the result directly with the selected board.

Related unselected concepts:

- `brand-assets/explorations/2026-09-10-premium-refinements/ribbon.png` — 1536 × 1024 PNG, 1,408,437 bytes, SHA-256 `52670aeb3285ad91541220ddbfa78acb9166acfd3007e95185a1782b7a3ad5f2`.
- `brand-assets/explorations/2026-09-10-premium-refinements/aperture.png` — 1536 × 1024 PNG, 1,472,003 bytes, SHA-256 `5e18aadb697f301b636d5720459292072f4cfec22de8bc1a1dc68deede3be469`.

Do not use either alternative or regenerate a lookalike.

## Galaxy background: approved packaged asset

These files are byte-identical to the background master and share its dimensions, byte count, and SHA-256:

- `Rivune/Assets.xcassets/RivuneWorkspaceCosmos.imageset/rivune-workspace-milky-way.png`
- `prototypes/ai-native-workspace/src/assets/rivune-workspace-milky-way.png`
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/assets/rivune-workspace-milky-way.png`

The existing Tauri-oriented prototype references the runtime copy in `prototypes/ai-native-workspace/src/host/quiet-workspace.css`. Its latest rule keeps the image in peripheral space: the sidebar and the right edge of chat. `prototypes/ai-native-workspace/src/styles.css` also contains older full-workspace treatments; the later peripheral treatment matches the current direction.

Keep the galaxy sharp at workspace edges and in the welcome area, subdued behind navigation, and away from sustained reading and typing. Use calm opaque dark surfaces under the transcript, composer, editor, results, menus, and settings. Do not restore the distracting galaxy-behind-everything treatment or a foggy whole-pane blur.

## Existing wordmark

These copies are byte-identical to the canonical SVG and share its dimensions, byte count, and SHA-256:

- `pages-site/assets/rivune-wordmark.svg`
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/assets/rivune-wordmark.svg`

The native asset catalog sets `preserves-vector-representation: true`. Preserve the SVG paths and vector behavior where the Tauri shell supports it. The typed “Rivune” shown inside the orbit concept board is presentation context, not an extractable production wordmark and not evidence of a new approved type treatment.

Use the wordmark only where horizontal space and hierarchy support a full brand lockup, such as a welcome or connection surface. Use the compact orbit mark in narrow navigation after the builder creates and validates the production asset.

## Existing icon files that are superseded or incomplete

- `brand-assets/rivune-orbit-stars.png` and the byte-identical `brand-assets/RivuneAppIcon-master.png` are the previous 1254 × 1254 starfield-and-pearl identity, SHA-256 `17c311ea8690d5c8c3ca43c787ffbc5525ae37165d692442573e78b912795c84`. They remain documented historical assets but are superseded for the app/Dock identity by the September 10 silver orbit selection.
- `prototypes/ai-native-workspace/src/assets/rivune-icon-128.png`, `pages-site/assets/rivune-icon-128.png`, and `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/assets/rivune-icon-128.png` are byte-identical 128 × 128 derivatives of the older starfield-and-pearl direction: 27,206 bytes, SHA-256 `3f4a35786f677e0cddc9a4fa71f15269344cb330b65530022584778814b0aba4`.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/icons/icon.png` is a 512 × 512 older starfield-and-pearl Tauri candidate icon: 317,119 bytes, SHA-256 `1a33682351c6f7c811d99bdd4780851fe756fda52a636e95b4ce3fcb6e64c0f2`.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/icons/rivune-mark.svg` is an obsolete rounded-tile V/Y-style mark with a purple dot. It is not the selected silver orbit R.
- `brand-assets/explorations/rivune-silver-orbit-space.png`, `brand-assets/explorations/rivune-silver-orbit-space-v2.png`, `brand-assets/explorations/rivune-silver-orbit-space-v3.png`, and `brand-assets/explorations/rivune-galaxy-slim-r.png` are earlier studies and must not replace the selected September 10 concept.

Provider icons for Claude and Codex are compatibility marks, not Rivune brand artwork. Do not use them as the Rivune identity or imply endorsement.

## App placement and behavior

The approved product direction is chat first. Files, editors, and artifacts open beside the conversation when useful; dense IDE chrome should not be the default. Tauri with React, TypeScript, and Tailwind remains the desktop foundation.

- Use the new silver orbit as the app identity and in deliberate welcome/brand moments after faithful asset production and review. Avoid repeating a large emblem throughout dense conversation screens.
- Keep the Milky Way peripheral so the identity remains visible without compromising long-form readability.
- Use the vector wordmark sparingly and keep narrow navigation compact.
- Constellation must show actual provider states, observable coordinated work, and a clear result. Branding cannot imply that Constellation ran successfully.

Exact logo placement, background intensity, typography, and the broader icon system remain open design decisions in `docs/RIVUNE_DESIGN_DIRECTION.md`. The builder should present them in the shared app preview for review before treating them as approved.

## Provenance and rights evidence

- The September 10 selection record identifies `brand-assets/explorations/2026-09-10-premium-refinements/orbit.png` as a built-in image-generation concept and records the user's choice of the first/orbit option. Its generated originals are under `/Users/Aaravshah/.codex/generated_images/01a088b1-3d09-7021-8915-13766c04b03f/`. There is no current project provenance entry or production-asset hash for an extracted silver-orbit icon; the builder should add that evidence when it creates the asset.
- `docs/design-review/2026-09-05-logo-study/milky-way-arrival-verification.md` records the Milky Way asset as a new background made with the built-in image-generation tool, gives its master and packaged paths, and records the final prompt. Its older SwiftUI/Tauri architecture text is historical and does not override the current Tauri direction.
- `docs/ARTWORK_PROVENANCE.md` records the packaged September 5 raster artwork as created specifically for Rivune with OpenAI's built-in image-generation tool; the project owner directed, reviewed, selected, and packaged it. It contains the packaged hashes and says the wordmark SVG was created for the project. This record predates the September 10 silver-orbit concept.
- Project artwork is covered as project material by Apache-2.0, subject to `TRADEMARKS.md`. That file reserves the Rivune name, ringed-R logo, and wordmark as product identity and requires forks to choose their own identity.
- The provenance record is evidence of origin, not trademark clearance or a guarantee of uniqueness. Keep that limitation attached to external rights claims.
- Third-party provider marks retain their owners' rights and their packaged notices. They are not relicensed as Rivune artwork.

## Builder acceptance checks

1. Use `brand-assets/explorations/2026-09-10-premium-refinements/orbit.png` as the visual reference but never ship or crop the full presentation board.
2. Reproduce the selected silver R/orbit faithfully, with near-black Dock tile and no stars, galaxy, blue glow, or pearl.
3. Create a flat single-color menu/tray silhouette from the same geometry and verify actual 16–22 px rendering in supported light and dark system appearances.
4. Inspect every required Tauri/macOS/Windows/Linux icon size in the built package; confirm no old V/Y or starfield-and-pearl icon remains.
5. Confirm the workspace galaxy stays peripheral while transcript, composer, editor, and result text remain readable during long sessions.
6. Confirm narrow layouts preserve chat and composer clarity and do not force the wordmark into insufficient space.
7. Confirm Constellation visuals come from real runtime state and never manufacture success or private model reasoning.
8. Record source hashes, production transformations, screenshots, and packaged-size inspection in builder-owned QA evidence before installation or publication.
