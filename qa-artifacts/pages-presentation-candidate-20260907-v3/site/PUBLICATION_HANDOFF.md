# Informational preview publication handoff

Prepared September 6, 2026 (Denver). Status: local source/artifact and integration diff ready for review; not published. Launch decisions go through the coordinating task, Audit Rivune native app.

## Verified publication state

Read-only GitHub checks found `Draven1287/rivune` public, default branch `main`, `has_pages=false`, and a 404 response from the Pages configuration endpoint. No repository variables with the `RIVUNE_PAGES` prefix and no deployment environments were returned. The new Pages workflow is absent from public main. No Pages setting, approval variable, environment, branch, or release was changed remotely.

The exact inspected public main is `68747456c17692784ba0924fc9ed41392ce6c7af` (September 6, 22:41:50 UTC). A separate local checkout of that commit is in `.qa/public-main/`. The development checkout itself has no Git remote; do not push its entire tree or replace the public native source from it.

The most recent listed public release is `v0.2.0-source-preview.4`, published September 6 at 22:20:14 UTC, marked prerelease and not draft. Its assets are the 11,064,421-byte `Rivune-0.2-source-preview-4.zip` and a 98-byte checksum file. The ZIP digest is `c2c816c818aa3150c3f0f47634fa599626f735e1879fc38815d34dec021aadb1`. It is developer source, not a signed Mac installer.

## Exact integration scope

Only these files belong in the review branch:

- `.github/workflows/rivune-pages.yml`
- `pages-site/.gitignore`, `README.md`, `PUBLICATION_HANDOFF.md`
- `pages-site/build.py`, `check_publish.py`, `test_site.py`, `release.json`
- `pages-site/index.html`, `privacy.html`, `council-vs-swarm.html`, `site.css`
- `pages-site/fixtures/coming-soon.json`, `fixtures/ready.json`
- `pages-site/assets/rivune-wordmark.svg`, `assets/rivune-icon-128.png`, `assets/og.png`

There are 17 new files relative to the inspected public main. Source, fixtures, and test code are repository content; only generated `pages-site/dist` contents become the Pages artifact. `.qa/`, screenshot evidence, integration clone, patch, caches and `dist/` are excluded from Git integration. Existing native app source, Xcode project, published source history, CI, security policy and license remain untouched.

Local integration patch/evidence are under `.qa/publication-review/`. `integration.patch` is a binary-capable Git diff against the above public commit; `integration.json` records file hashes and native-tree preservation. `public-main` is an isolated local review branch named `codex/pages-informational-preview`, not a remotely published branch.

## Operator sequence after approval

1. Review the exact patch, rendered preview and intended informational scope with the coordinator. Preview does not authorize pricing, paid offers, checkout, signup forms or cloud-service promises.
2. Fetch current public `main` in a checkout of the real remote. If it advanced, rebase/reapply only the listed additions and recheck the diff; never overwrite newer native work. Apply the reviewed patch on `codex/pages-informational-preview`, run the checks below, and review the staged file list. Push/open/merge the site-only change only after publication/integration authorization. No push or PR was created during preparation.
3. Configure the existing repository's Pages source as GitHub Actions. Configure `github-pages` deployment environment with main-only branch protection and any required reviewer. Set `RIVUNE_PAGES_PREVIEW_APPROVED=true` only for the approved informational launch. Leave `RIVUNE_PAGES_BETA_APPROVED` unset/false until separate actual beta approval.
4. Manually dispatch “Rivune project site” on main with target `preview`, initially `publish=false` if another artifact review is wanted. After approval, dispatch with `publish=true`. Push/PR triggers never deploy. The tested approval checker and deploy condition both enforce event, branch and target-specific approval; the checker also confirms artifact target, non-simulation and release state.
5. Check the actual deployed URL returned by GitHub, all three public routes, sitemap, images, privacy and source links, mobile behavior, and disabled installer controls. Only then report the informational site live. Search indexing and AI citations remain unverified and are not launch guarantees.

Intended site: `https://draven1287.github.io/rivune/`. No custom domain or extra hosting account is required for this project URL. The effective robots policy is origin-root, outside the project subpath; this change makes no crawler-policy or training-preference changes.

## Validation and remaining gaps

Checks: `python3 -m unittest -v` from pages-site, then `python3 build.py --publish-target preview`. The 21 tests cover source-only preview output, canonical/navigation/assets, fixture isolation, separate preview/beta admission, failed/missing installer acceptance, matching-public-asset enforcement, and publication approval failure cases. A beta success path uses explicit mocked release metadata/public lookup in tests only; it supplies no real release evidence.

The actual preview build passed. Nine local routes/assets returned HTTP 200. Rendered checks passed at 1280×1000 and 390×844: no horizontal overflow, no missing homepage images, guide/privacy/anchor navigation, keyboard-opened mobile navigation, and disabled installer buttons. Screenshots and HTTP receipts are in `.qa/publication-review/`. The workflow YAML parses. GitHub-hosted Actions/deployment execution has not yet been tested.

Informational launch waits for scope/diff authorization and real-repository integration/Pages configuration. It does not need a signed installer. Downloadable beta separately waits for a real signed, notarized, stapled, Gatekeeper-accepted, pilot-accepted DMG with exact public asset evidence and beta approval. Council team development and future real Swarm/Auto remain app milestones, separate from publishing project documentation.
