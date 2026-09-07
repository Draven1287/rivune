# Rivune website integration handoff

September 7, 2026. Status: reviewed local V5 candidate, draft pull request, not deployed. The current user direction is app/installer-first launch; website visual approval and actual installer acceptance remain separate from source and browser checks.

## Verified remote state before this update

Repository: `Draven1287/rivune`, public. Public main is `68747456c17692784ba0924fc9ed41392ce6c7af`. Draft PR 3 is open on `codex/publish-rivune-preview`, previously at `c4d3889fb50b209ec63bee4a19b3441b39b97c56`. It is unmerged. Pages is configured for workflow builds; the API reported status null. `RIVUNE_PAGES_PREVIEW_APPROVED=false`. No publication dispatch has been performed. Earlier draft website and Apple CI checks passed; that is not deployment or installer evidence.

## Integration scope

The final addition relative to public main is 21 static-site source files under `pages-site/` plus `.github/workflows/rivune-pages.yml` (22 files). The update adds five dedicated pages and removes the rejected app screenshot from the previous draft payload. Existing public native source, Xcode project, native CI, license and security files are not part of this change. Only `dist/` is deployed; fixtures, source and review evidence stay out of that artifact.

Use an isolated checkout of the real repository. Do not push the unrelated development workspace wholesale. If public main advances, preserve its changes and re-evaluate the website-only diff.

## Independent evidence

The frozen V5 candidate manifest is `1c87f658dd09f88e2f2d745cd9c0cb1e37fcb2bdbace94f431dbcacf48d1350d`. All 61 listed payload files matched their hashes. Its source matched the independent test snapshot exactly. The operator documents were updated during integration to replace stale V4 instructions. A subsequent CI-artifact audit found the Pages uploader omits dotfiles. The builder now omits the unnecessary `.nojekyll` file, and an upload-inventory regression test verifies that uploaded file inventory and hashes match the manifest. HTML, CSS, images and interaction behavior remain identical to the reviewed candidate.

Independent UI checks used 23 Python tests; the package-inventory regression raises the current suite to 24. Browser checks covered 32 direct-load/refresh page states at 320, 390, 768 and 1280 pixels; canonical/sitemap/current-page checks; keyboard navigation and browser history; More/Menu open, Escape focus return, outside dismissal and FAQ navigation; App example disclosure controls; skip link; reduced-motion scrolling; essential routes with JavaScript disabled. All passed. The simulated ready fixture passed 18 demo states and six platform selections, with no wrong-platform Mac download. No external page-resource or AI requests were observed. The removed screenshot URL returned 404 in the local preview.

These checks verify the website and simulated conditional presentation. They do not verify live model orchestration, native app acceptance, Windows/Linux desktop builds, a signed installer, payment handling, search indexing or a production deployment. A narrow-layout test is not proof of browser zoom behavior beyond that reflow check.

## Launch sequence remains held

1. Complete native-app review and the agreed installer/pilot acceptance. Obtain final review of the website experience.
2. Review the exact website diff and its CI result. Keep the PR draft and approval variables false while launch is held.
3. Only after the applicable launch authorization, merge the reviewed website change and manually dispatch the approved target from main. Informational preview and validated beta use separate approval variables and release requirements.
4. Verify the deployed URL, all eight routes, assets, navigation, disclosures, platform choices and metadata before reporting the site live.

Current `release.json` is coming-soon. No Mac DMG is available from this payload; Windows/Linux installers are planned. No purchases, paid services, account changes or cloud activation are part of this handoff.
