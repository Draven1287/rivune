# SITE-PROMOTION-REVIEW — independent report

Date: 2026-09-08

## Disposition

**PASS for the promoted source, rendered-output parity, privacy consistency delta, publication gates, and corrected operator handoff.**

This was a report-only, non-build review. No canonical source, generated export, workflow, release metadata, website, or external service was changed.

## Verified evidence

- The promotion is confined to the 19 paths in `PROMOTED_PATHS.json`. `CANONICAL.diff` covers the changed pre-existing templates/build/test/styles, while newly added templates, tour files, refinements, and artwork are listed explicitly in the promotion receipt.
- Eight of the nine generated pages plus all four CSS/JavaScript files are byte-identical to `static-review-v2`. The ninth page, `privacy/index.html`, differs only by the separately reviewed `privacy-consistency-v1` delta.
- The four packaged artwork files match the approved V2 hashes.
- `privacy-consistency-v1/FINAL.diff` is limited to `privacy.html` and `test_site.py`. The visible change replaces the handler-dependent privacy-page `mailto:` action with `/rivune/contact/`, where the approved Gmail, copy-address, and manual fallback controls live. The metadata change adds `og:url` from the existing canonical token.
- The privacy export has canonical and Open Graph URLs equal to `https://draven1287.github.io/rivune/privacy/`, retains `noindex,nofollow`, contains no `mailto:` action, and preserves the alias-forwarding, delivery-dependency, public-issue, and security-reporting text.
- The final `pages-site/dist/build-manifest.json` hashes every exported file without mismatch and records `publishTarget=review`, `releaseStatus=coming-soon`, and `simulation=false`.
- All nine pages retain `noindex,nofollow`; no generated page contains a `data-installer` link. The download page remains macOS-first and reports unavailable macOS, Windows, and Linux downloads.
- The generated sitemap names the nine intended routes. The standard canonical 404 and intentional absence of `.nojekyll` are recorded export differences rather than claimed approved-page parity.
- `pages-site/release.json`, `pages-site/check_publish.py`, and `.github/workflows/rivune-pages.yml` match their protected pre-promotion hashes.
- Independent direct calls to `authorize_publication` accepted only an exact manual-main preview artifact with preview approval. Review artifacts, push events, beta under preview approval, and simulated preview artifacts were rejected.
- The workflow uploads `pages-site/dist`, but its deploy job requires manual dispatch, `publish=true`, `main`, and the matching target-specific approval variable. Preview approval cannot admit a beta artifact.
- The privacy owner reports 20 tests passed and rebuilt the review artifact after the test run. This review verified the final hashes and protected set without rerunning tests or rebuilding.

## Required documentation correction before integration or publication

The canonical operator documents still describe the superseded three-page/Mac-first package:

- `pages-site/README.md:9` describes one Mac app with Council as the first stage and Swarm/Auto as future top-level milestones, conflicting with the approved cross-platform Single AI and Constellation direction.
- `pages-site/README.md:20`, `:32`, and `:73` say the exporter contains only three pages/routes. The promoted exporter contains nine.
- `pages-site/README.md:22` says `.nojekyll` disables processing even though the promoted workflow intentionally uploads `dist` without a `.nojekyll` file.
- `pages-site/PUBLICATION_HANDOFF.md:15-24` lists the former 17-file integration scope and omits the added page templates, tour files, refinements stylesheet, and Milky Way artwork.
- `pages-site/PUBLICATION_HANDOFF.md:34` tells the operator to validate only three public routes.
- `pages-site/PUBLICATION_HANDOFF.md:40` records 21 tests; the current suite reports 20.
- `pages-site/PUBLICATION_HANDOFF.md:44` repeats the superseded Council/Swarm/Auto milestone framing.

Before any public-repository integration, create a superseding `pages-site` README/publication handoff that names all current source paths and nine routes, records the current 20-test suite, explains the upload-pages-artifact/no-`.nojekyll` packaging choice, and preserves the manual preview/beta approval sequence. Recheck the remote main revision and Pages configuration at that time because the existing remote observations are dated September 6.

### Follow-up resolution

`docs-correction-v1` resolves every documentation item above. Independent recheck confirmed:

- `pages-site/README.md` SHA-256 `47ad5076477e1d335f156a40f274aaff3520cf089572f4e2d930396652196d02` and `pages-site/PUBLICATION_HANDOFF.md` SHA-256 `d76c09f2b5542bcffc0f73ab50d7dd53a4c1a612a9441837218d74092966ddc5` match the correction receipt.
- The docs name all nine `PUBLIC_PAGES`, the four CSS/JavaScript files, all four artwork files, and the current source/test/release/workflow inventory.
- They describe Single AI and Constellation, the cross-platform Tauri direction, the sample-only DOM tour, unavailable downloads, retained noindex, the direct Pages artifact upload, and intentional absence of `.nojekyll`.
- They give the correct `unittest` then no-target build order so the checkout ends with `publishTarget=review`, and accurately record 20 test definitions.
- They preserve manual target-specific publication gates, explain that ready and simulated-ready builds remain blocked before network access, and identify an accepted installer plus verified link metadata as the next dependency.
- They label September 6 remote, release, robots, patch, and browser observations as historical and potentially stale.
- All 45 protected files in the correction receipt independently hash unchanged.

The former documentation hold is closed. Public integration and publication remain separate authorization and live-verification steps.

## Boundaries

- This review does not authorize publication, Pages configuration, approval variables, branch changes, release metadata changes, or an installer link.
- Exact byte parity reuses the approved V2 browser evidence for unchanged files. The privacy delta was reviewed structurally and by hash; no fresh browser, email client, clipboard, email delivery, or external navigation test was performed.
- A review artifact and a passing gate are not evidence that the public site has been integrated or deployed.
