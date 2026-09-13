# V5 intermediate route review

Status: structural route checks PASS; visual redesign and final acceptance pending.

Frozen built output: /private/tmp/rivune-v5-routes-g288f98m/dist. Source and copy hashes matched before and after copy. Evidence: snapshot.json and route-observations.json. This is intermediate output, not the website owner final freeze.

Eight routes were loaded directly and refreshed at 320, 390, 768 and 1280 pixels: Home, App, How it works, FAQ, About, Download, Privacy and Council/Swarm guide. All 32 page states passed. Core routes have matching canonical URLs, sitemap entries and active navigation. Keyboard navigation to App and browser Back/Forward passed at all four widths. No horizontal overflow, missing images, browser errors or external resource requests observed. Contact links used only the approved public alias.

Personally inspected the 1280-pixel Home screenshot. It still uses oversized tightly spaced headline type, a disabled primary installer action and a static product screenshot starting below the hero. These are known pre-redesign characteristics; brand direction and illustrative interactive demo are being implemented separately. Passing route tests is not visual acceptance.

Publication remains held under the newer app/installer-first launch order and user rejection of the older appearance. Draft PR 3 is not merged or deployed. Next review must use the final owner snapshot and include interactive demo, final download availability labels, mobile/zoom/reduced-motion and visual checks.

## Supplemental keyboard and script-failure checks

The same immutable intermediate build passed the expanded independent browser audit. At 320, 390, 768 and 1280 pixels: first Tab reaches the skip link, activation focuses main; reduced-motion emulation is active and computed root scroll behavior is not smooth; FAQ disclosures open with Enter and close with Space. With JavaScript disabled at 390 pixels, the mobile disclosure navigation reaches App and all six core pages load meaningful content. Evidence: accessibility-observations.json. This is bounded keyboard/progressive-enhancement evidence, not a complete accessibility certification or a check of the upcoming interactive demo.

Rendered 390-pixel Home and Download also personally inspected. No clipped page text was visible. The old disabled installer emphasis and repeated coming-soon messaging remain pre-redesign issues. Final platform choices and typography require the next frozen candidate.
