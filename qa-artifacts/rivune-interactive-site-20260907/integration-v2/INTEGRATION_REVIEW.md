# SITE-INTEGRATE-V2 local integration candidate

The authoritative Pages workflow is `.github/workflows/rivune-pages.yml`, which invokes `pages-site/build.py`. The separate `website/` project is not this workflow input.

This candidate integrates the approved current overlay into a self-contained static source tree in `source/`. Its renderer incorporates the nine-route frozen V6 builder and the current overlay transformations, with no runtime imports from QA snapshots. It preserves centered hero, rounded footer without divider, Gmail and copy controls, unavailable macOS-first downloads, Single AI and Constellation, and the intentional `/app/` DOM tour. Source templates, styles, scripts, metadata, and artwork are copied into the candidate; original snapshots and canonical source are untouched.

Rebuild from repository root:

```sh
python3 qa-artifacts/rivune-interactive-site-20260907/integration-v2/source/build.py
```

Output: `source/dist/`. `SOURCE_MANIFEST.json` hashes source inputs; `source/dist/build-manifest.json` hashes export files; `PARITY_REPORT.json` records verification. All nine page hashes and all four CSS/JS hashes equal the approved 64-check receipt, and artwork hashes match static-review-v2. All 273 HTML local references and anchors resolve. The earlier behavioral receipt applies to identical bytes; no fresh browser execution or visual acceptance is claimed.

Export-only differences from approved static-review-v2: the standard builder 404 page is retained, sitemap and build manifest are generated, and `.nojekyll` is omitted as in the nine-page V6 renderer. Pages retain noindex for local review. This is not publication approval.

Proposed canonical promotion paths, pending coordinating review: `pages-site/build.py`, `pages-site/index.html`, `pages-site/app.html`, `pages-site/how-it-works.html`, `pages-site/faq.html`, `pages-site/about.html`, `pages-site/contact.html`, `pages-site/download.html`, `pages-site/privacy.html`, `pages-site/council-vs-swarm.html`, `pages-site/site.css`, `pages-site/refinements.css`, `pages-site/tour.css`, `pages-site/tour.js`, and the exact assets recorded in SOURCE_MANIFEST. Preserve canonical release metadata and reconcile canonical tests/publication checks before promotion. No canonical files were edited in this assignment.

The candidate deliberately rejects ready-installer builds before any network access. Actual accepted installer metadata and download-link binding require separate verification; no installer availability is implied. No deployment, server launch/restart, email, paid calls, or Tauri changes occurred. Stop at this reviewable integrated export.
