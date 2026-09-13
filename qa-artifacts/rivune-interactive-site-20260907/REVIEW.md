# Interactive website revision — September 7, 2026

Local preview: http://127.0.0.1:57036/rivune/
App walkthrough: http://127.0.0.1:57036/rivune/app/

This is an unpublished, text-only successor overlay on the frozen `rivune-native-cosmos-candidate-20260907-v6/source`. The frozen V6 and public website were not modified. The overlay reuses V6 assets and secondary pages in place; there are no duplicated images, build caches, dependencies, or app binaries.

## Changes

- Home now has a focused hero and one compact invitation, removing four dense explanatory sections.
- App has a DOM-based interactive design tour: sample conversations, per-example drafts, planned team/lead selection, in-page settings and galaxy toggle. No product screenshot or scaled raster UI.
- Header links lead to separate App, How it works, About, FAQ, Contact, Download, and Privacy pages. Existing V6 route behavior is retained.
- Historical home section links map to the corresponding full pages, on load and hash change.
- Download remains far right on desktop. Availability and illustrative/team-development disclosures remain explicit.
- Drafts are memory-only, isolated by preview view, and clear on leaving or reloading. No provider calls or account connections.

## Executed review

CUA rendered desktop Home/App; inspected app team view at390x844 and homepage at320x568. Read-only DOM measurements showed no horizontal overflow at390/320. Verified sample selection, draft restoration after switching, lead toggle, in-page Settings, galaxy switch, Escape dismissal and focus return. Mobile Menu → FAQ navigated to `/rivune/faq/`. Historical `/#faq` loaded the FAQ route after the hash handling fix. Final browser warning/error log was empty. Viewport override reset.

Independent source review found two issues: switch accessible name and ambiguous draft lifetime. Both fixed; actual AX now exposes `Galaxy background` as the switch name. Reviewer confirmed draft text never enters HTML and tour actions contain no network/provider/account/storage calls.

This proves the local design-tour slice, not actual desktop behavior or AI execution. The served site uses Python to render existing templates in memory. Before publishing, integrate these two page templates plus tour.css/tour.js into the authoritative static-site build and review that output; this server is not a GitHub Pages deployment artifact. No publication performed.

Run locally with `python3 qa-artifacts/rivune-interactive-site-20260907/preview.py` from the workspace. Stop only that preview process when it is no longer needed.

## Static review output

`build_static_review.py` now renders this exact overlay into `static-review/rivune/`. All nine generated HTML pages were checked byte-for-byte against the overlay, and267 local page/asset/anchor references resolve in the static output. A `.nojekyll` marker and404 page are included. The output needs no Python server or application backend when hosted.

The four approved artwork files use local hard links to frozenV6 assets; no additional artwork bytes were copied. Treat the output as read-only: never edit a hard-linked asset. The build records hashes and refuses to silently replace changed output. No frozen source, public repository, Pages configuration, or live deployment was changed.

This remains an unpublished **review artifact**, with noindex/nofollow retained. Publishing still requires reviewing/approving the current design and integrating the revised templates/tour assets into the authoritative release workflow. The serving root for local static review is `static-review/`; the eventual Pages artifact root would be its `rivune/` contents. Do not upload the entire QA directory or describe this artifact as a verified installer/download release.

## Static browser acceptance

`static-browser-review.cjs` renders the frozen static output directly through isolated browser request interception, without the Python template server. All53 checks passed: nine direct page routes, no unresolved templates, no horizontal page overflow at320/390/1280px, sample navigation, separate memory-only drafts, inert HTML-looking draft input, lead selection, settings/appearance, Escape focus return, and draft clearing after reload. No external service requests or uncaught browser errors were observed. Exact file hashes and check names are recorded in `STATIC_BROWSER_REVIEW.json`.

This validates the static artifact in Chromium; it does not establish live GitHub Pages delivery, Safari behavior, native application readiness, or actual provider execution.
