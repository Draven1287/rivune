# Independent review — Pages presentation candidate v2

**Verdict: accepted as a local informational-preview presentation, with two non-blocking polish notes below. This is rendered website acceptance at the listed viewports, not publication authorization, native-app acceptance, or installer readiness.** No public action was performed.

## Package integrity

Read `HANDOFF.md` and `manifest.json`. Independently verified all 17 source hashes and 12 generated-distribution hashes with no differences. Combined publication patch SHA-256 is `fcc961978d31269e667d25473fbe47fa3423f625e4a2642b93b2a2becdc56fd5`; copy-only patch SHA-256 is `74149311e5f16b7ff689e8a06d00222d6a8f6dd75b5a71df387e0cddf7a214d9`.

Applied the combined patch to a temporary copy of the original `pages-site` baseline. It applied successfully and produced the exact 17-file source set in the v2 manifest. See `independent-evidence/package-verification.json`. Source and generated files were preserved; post-review hashes are in `independent-evidence/post-review-integrity.json`.

## Actual rendered review

Served only the generated `site/dist` under `http://127.0.0.1:4269/rivune/`. Used existing **Chromium 148.0.7778.96 headless shell**, driven by the installed Playwright package in an isolated browser profile. Page requests to non-loopback hosts were blocked; no downloads, external links or accounts were activated. The local server and headless browser were stopped after review.

The normal Node REPL failed loading its module, IAB was unavailable, and Chrome CUA tab creation/acquisition timed out twice. These are tooling limitations, not site defects. The installed headless browser supplied fresh rendered evidence without installing dependencies or interacting with native app windows. Initial screenshots caught smooth-scroll animation in progress; the final `*-viewport.png` anchor screenshots wait for the actual target to settle and are the authoritative anchor evidence.

| Check | Observed result |
| --- | --- |
| Desktop home, product anchor, download anchor, 1280 × 1000 | No horizontal overflow. Clear headline and readable supporting text; screenshot placed beside product explanation. Download section and its heading are visible below the sticky header when anchor scrolling completes. |
| Mobile home/menu/product, 390 × 844 | Layout stacks correctly. Both hero controls remain inside the viewport. Menu is readable and does not cause horizontal overflow. Native screenshot is fully contained with its development-preview caption. |
| Small mobile homepage, 320 × 568 | No horizontal overflow. Headline wraps into three lines and long content continues naturally below the fold; no clipped body text or offscreen-width control. |
| Team guide and privacy, 390 × 844 | Readable single-column text, clear section hierarchy, no horizontal overflow. Local `/rivune/council-vs-swarm/` and `/rivune/privacy/` returned rendered pages. |
| Keyboard navigation | First Tab reaches visible “Skip to content”; Enter changes the hash to `#main` and focuses main. Focused mobile Menu opens with Enter; next Tab reaches “The app”. Selecting that link reaches `#product`. |
| Installer vs source | Both installer buttons are actually disabled and say “Mac installer coming soon”. Developer source preview 4 is a separate GitHub release-page link. Adjacent text states Xcode is required and the ZIP is not a signed installer/DMG. Installation steps are explicitly for the upcoming DMG. |
| Availability claims | Auto is labeled a target default, Swarm “Not implemented”, Council “Current native development”. Nearby text explicitly limits configurable Council to later local builds and says Auto/Swarm are not public source-release features. No paid plan, cloud availability, included model usage, guaranteed best-answer or Traycer-superiority claim appeared. |
| Runtime | No page script errors. Images loaded successfully at their expected intrinsic dimensions. |

The source screenshot was inspected at full resolution. It shows generic QA conversation labels, an empty composer, local-workspace account state and provider readiness. No personal email/name, credential, private prompt or account token is visible. This is a real supplied development screenshot, not evidence that its depicted state belongs to a public release.

## Non-blocking polish notes

1. **Mobile screenshot details are too small to read as product proof.** At 390 px the full Mac image is roughly 340 px wide. It successfully establishes appearance, but individual team controls are illegible. Before an installer launch, add an accessible larger-image link or a second close-up of the composer; preserve the full native screenshot as context. Do not invent UI or hide release limitations.
2. **Mobile Menu stays expanded after a navigation link is selected.** Its header is non-sticky at this breakpoint, so it scrolls out of view and does not obscure the destination. Returning to the top finds it still expanded. Closing it on successful link activation would feel more finished; current native disclosure keyboard operation remains usable.

The pictured manager label is “Set in Team”. When the latest native build is stable, refresh this screenshot to match the final manager copy and remove transient capture UI. Its existing development-preview caption prevents this from being a public-build claim, so this is not a blocker to the informational preview.

## Evidence and limits

`independent-evidence/render-observations.json` contains viewport sizes, measured document widths, rendered page text, image dimensions, button disabled states and keyboard observations. Nine full-page images and nine final viewport images cover the states above. `render-fullpage.cjs` and `render-viewports.cjs` preserve the reproducible checks.

This pass did not run Safari/WebKit, real phone touch/VoiceOver, 200% text zoom, an exhaustive contrast audit, external GitHub release-link validation, or site publication. It did not rerun the prior candidate's 21 build tests; package verification and fresh browser rendering are separate evidence. The frozen candidate and prior reviews remain intact. Keep Pages/DMG/paid-cloud publication decisions with the release owner.
