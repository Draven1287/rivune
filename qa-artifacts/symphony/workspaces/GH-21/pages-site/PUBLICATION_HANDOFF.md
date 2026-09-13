# Rivune website: local review handoff

Updated September 8, 2026. This supersedes the September 6 operator sequence and its three-route/21-test/ready-fixture assumptions. Authoritative location: `pages-site/PUBLICATION_HANDOFF.md`. Status: canonical local review export; no publication or installer availability established by this handoff.

## Current source and export

The approved site is the nine-route Single AI plus Constellation presentation described in [README.md](README.md). It presents the Tauri desktop direction across macOS, Windows and Linux; the default macOS availability selection is not a Mac-only product scope. `/app/` is an intentional sample-content DOM tour, not a connected workspace. The legacy SwiftUI source preview is distinguished from the forthcoming application and installers.

Current website integration inventory:

- `.github/workflows/rivune-pages.yml` (existing, unchanged during local promotion/corrections).
- `pages-site/.gitignore`, `README.md`, `PUBLICATION_HANDOFF.md`.
- `pages-site/build.py`, `check_publish.py`, `test_site.py`, `release.json`.
- Nine templates: `index.html`, `app.html`, `how-it-works.html`, `faq.html`, `about.html`, `contact.html`, `download.html`, `privacy.html`, `council-vs-swarm.html`.
- `site.css`, `refinements.css`, `tour.css`, `tour.js`.
- `fixtures/coming-soon.json`, `fixtures/ready.json` (validation inputs, not publishable content).
- `assets/rivune-wordmark.svg`, `assets/rivune-icon-128.png`, `assets/og.png`, `assets/rivune-workspace-milky-way.png`.

This is a current local inventory, not a verified new-file count against remote main. Old `.qa/publication-review/integration.patch` and its 17-file count describe an earlier revision and must not be used to promote the current site. Current promotion evidence is under `../qa-artifacts/rivune-interactive-site-20260907/promotion-v2/`; the subsequent privacy-only delta is under `privacy-consistency-v1/` alongside that directory. Their reports, diffs and manifests preserve provenance; historical snapshots remain unchanged.

Only generated `pages-site/dist/` contents form the artifact. Source/tests, `.qa`, fixtures, caches and evidence stay outside it. The custom workflow uploads dist directly, with no Jekyll build; intentional absence of `.nojekyll` is retained. Export includes nine route pages, assets/styles/scripts, a noindex 404, nine-route sitemap and manifest. Public route pages omit a robots noindex directive for the authorized marketing launch; simulated fixtures and the 404 remain `noindex,nofollow`.

## Validation and exact current limits

From `pages-site`, run `python3 -m unittest -v`, then `python3 build.py` to leave the final export at `publishTarget=review`. The **20 tests passed** in the privacy-consistency receipt. They cover approved baseline parity with an explicit reversible privacy delta, links, metadata, preview/contact boundaries, release validation and independent publication gates. Public-asset validation uses mocks in tests and establishes no actual installer evidence.

The privacy delta replaces its mailto handoff with the existing contact page and adds canonical `og:url`; forwarding/delivery/security language is retained. The prior 64-check browser receipt covers the earlier approved static bytes. It is not a fresh browser pass on this corrected privacy page. Independent review is handled separately; this document does not claim its completion or any live delivery.

`release.json` is still `coming-soon`. Ready builds, including simulated ready fixtures, are blocked before public lookup. Next implementation dependency: an accepted installer plus verified link/asset metadata and separate binding validation. Signing, notarization, stapling, Gatekeeper, pilot acceptance and exact asset URL/size/digest remain required; neither a source ZIP, a test fixture, nor an approval variable meets that dependency.

## Future publication prerequisites

No push, merge, setting change or deployment is authorized by this handoff. After separate authorization, reconcile the current site-only diff with the current real repository rather than applying the historical patch blindly. Preserve native source and unrelated work.

The existing workflow builds/tests push and pull-request events without deploying. Manual preview publication additionally requires main, `publish=true`, target-specific approval, a matching non-simulated preview manifest and the deployment environment. A no-target review artifact fails the publication checker. Validated beta has a separate approval and remains blocked in the build pending accepted-installer binding. Review `check_publish.py` and `../.github/workflows/rivune-pages.yml` before an authorized operation; neither changed in this correction.

A future authorized launch must verify the actual deployed URL, all nine routes, assets, interactions and unavailable/accepted download state before claiming live operation. Current target URL remains `https://draven1287.github.io/rivune/`; remote hosting and configuration are verified during the September 9 launch pass; final deployed bytes and release status still require post-deploy verification.

## Historical remote observations — not current verification

The September 6, 2026 report recorded public repository `Draven1287/rivune`, main `68747456c17692784ba0924fc9ed41392ce6c7af` (22:41:50 UTC), `has_pages=false`, a 404 Pages configuration response, no returned `RIVUNE_PAGES` variables or deployment environments, and no Pages workflow in that inspected main. These observations may be stale. The old local `.qa/public-main/` checkout and review branch are historical evidence, not current remote truth.

That report listed prerelease `v0.2.0-source-preview.4` at 22:20:14 UTC with an 11,064,421-byte source ZIP and 98-byte checksum, no DMG; recorded ZIP SHA-256 was `c2c816c818aa3150c3f0f47634fa599626f735e1879fc38815d34dec021aadb1`. Those release details and a September 6 origin-root robots 404 observation were not refreshed. Historical HTTP, screenshot, YAML and browser results under `.qa/publication-review/` apply only to their inspected revision. No current remote or GitHub-hosted execution claim follows from them.
