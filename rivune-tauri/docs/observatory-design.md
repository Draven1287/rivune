# Observatory: Rivune galaxy design

September 12, 2026. This implements the user's direction to restore a larger, centered silver R with no background tile, improve the galaxy's apparent depth, and preserve the simple Single AI composer.

## Applied design

A new built-in Observatory environment uses a generated nebula asset with brighter sculptural foreground clouds and finer distant stars. The real transparent Rivune logo remains a separate foreground asset. At a 720px-high viewport it is 104px wide, twice the previous 52px; taller windows use 128px. The main welcome block is centered above the existing starter actions and composer.

Pointer-driven background translation and a small independent logo tilt create perceived depth. This is layered 2D artwork, not a real 3D galaxy simulation. There is no continuous render loop. Movement is disabled in conversations, hidden tabs, Still mode, and system reduced motion; touch does not trigger it. The conversation darkens the scenery for reading. Reduced transparency and increased contrast have explicit surface overrides.

Observatory is the default for new workspaces. Existing saved backgrounds remain selectable and are preserved. This user's browser preview was switched through the UI to Observatory.

## Apple Design Award references

These are product lessons, not claims that Rivune has won an award or acquired native Liquid Glass.

- [Moonlitt, Interaction winner, 2026](https://developer.apple.com/design/awards/): Apple highlights approachable onboarding, platform support, and Liquid Glass. Rivune implication: keep the common path clear and integrate native materials as actual native work.
- [Tide Guide, Visuals and Graphics winner, 2026](https://developer.apple.com/design/awards/): Apple links theme, animation, and readable information. Rivune implication: use galaxy atmosphere to support identity while preserving readable answers.
- [Guitar Wiz, Inclusivity winner, 2026](https://developer.apple.com/design/awards/): Apple highlights VoiceOver, Dynamic Type, contrast, and non-color cues. Rivune implication: visual quality must include accessible interaction, not only appearance. A complete accessibility audit is still pending.
- [Crouton, Interaction winner, 2024](https://developer.apple.com/design/awards/2024/): organized information and context-appropriate controls reduce effort. Rivune implication: keep advanced options in contextual menus and preserve the compact composer.
- [Rooms, Visuals and Graphics winner, 2024](https://developer.apple.com/design/awards/2024/): distinctive visual identity, details, sound, and interaction form a coherent experience. Rivune implication: retain the silver R and cosmic language rather than copying another company's branding.
- [Flighty, Interaction winner, 2023](https://developer.apple.com/design/awards/2023/): essential information appears where it is needed. Rivune implication: connection and work states must remain truthful and useful.

## Validation and limits

Production build and all 67 tests pass. Browser inspection confirms the new environment, centered logo, Single AI controls, readable existing Claude conversation, no horizontal overflow at 760 by 720, and Still mode removing both background and logo transforms. Native provider execution and native Liquid Glass remain unfinished. Award-level quality and broad usability require real user testing and performance/accessibility validation.

## Asset provenance

`public/rivune-observatory.png` was created with the built-in image generation tool from the existing `public/rivune-orbit-nebula.png` reference. Prompt: improve the existing blue galaxy with volumetric dust, occlusion, light scattering, bright upper-right/lower-left cloud regions, fine distant stars, a clean central text area and a low-contrast sidebar region; no text, UI, logo, planets, orbital line art, or center flare. Requested landscape 1792 by 1024. Original generated file remains unchanged in the generation output folder.
