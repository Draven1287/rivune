# Rivune static website

Current local operator instructions, September 8, 2026. These supersede the September 6 three-page instructions. The authoritative build is `pages-site/build.py`, invoked by `../.github/workflows/rivune-pages.yml`. The separate `../website/` project is not this workflow's input.

## Scope and availability

The site presents Rivune's desktop direction for macOS, Windows, and Linux, with **Single AI** and **Constellation** experiences. Council and Swarm are strategy/development context, not a claim that the public source release implements the current team experience. The intentional `/app/` route is a browser DOM design tour with sample content and memory-only drafts, not a connected AI app or account service.

`release.json` remains `coming-soon`. The download page initially selects macOS and also exposes Windows/Linux availability; there is no installer link for any platform. The referenced `v0.2.0-source-preview.4` is the legacy SwiftUI/Xcode developer source preview, not the forthcoming Tauri application or an installer. Current remote release availability has not been refreshed in this documentation correction.

The approved galaxy, centered hero, rounded footer, Gmail/copy contact controls, and layout are preserved. Privacy links to the contact page and has a canonical `og:url`. No account backend, AI request service, analytics, external fonts, or contact-form submission service is provided. Python 3.9+ builds the static files; browser JavaScript supports the intentional interactions.

## Routes and artifact

`build.py:PUBLIC_PAGES` explicitly registers these nine routes beneath `/rivune/`:

| Template | Route |
| --- | --- |
| `index.html` | `/rivune/` |
| `app.html` | `/rivune/app/` |
| `how-it-works.html` | `/rivune/how-it-works/` |
| `faq.html` | `/rivune/faq/` |
| `about.html` | `/rivune/about/` |
| `contact.html` | `/rivune/contact/` |
| `download.html` | `/rivune/download/` |
| `privacy.html` | `/rivune/privacy/` |
| `council-vs-swarm.html` | `/rivune/council-vs-swarm/` |

The export also contains `site.css`, `refinements.css`, `tour.css`, `tour.js`, four approved assets, a project-relative `404.html`, a nine-route absolute canonical `sitemap.xml`, and `build-manifest.json`. Public preview pages omit a robots noindex directive so the deployed marketing site can be indexed. Simulated fixture pages and the 404 page retain `noindex,nofollow`; the sitemap itself does not guarantee indexing.

`dist/` is the artifact root. The existing custom workflow uploads it with `actions/upload-pages-artifact@v4`; it has no Jekyll build step. Omission of `.nojekyll` is intentional. Do not add an extra `rivune` wrapper. Source, tests, fixtures, `.qa`, caches and QA reports are not deployable content. No `robots.txt` or `llms.txt` is generated.

## Local validation

From `pages-site`:

```sh
python3 -m unittest -v
python3 build.py
```

The current suite has **20 tests**. Tests build an explicit preview artifact; run the no-target build afterward so the final checkout ends with `publishTarget=review`. The final build does not publish or start a server. Current evidence is in `../qa-artifacts/rivune-interactive-site-20260907/privacy-consistency-v1/VALIDATION.json` and its `HANDOFF.md`.

Coverage includes approved page/style/script hashes with the exact privacy correction accounted for, local links, canonical metadata and production indexing, unavailable downloads, contact routing, source/fixture separation, release metadata validation, mocked public-asset matching, and publication authorization. These checks are not a fresh browser review, email-delivery test, or proof of installer readiness.

## Publication and installer gates

| Build selection | Current result |
| --- | --- |
| No target | Local `review` artifact; publication checker refuses it |
| `--publish-target preview` | Informational `coming-soon` artifact; public pages are indexable; does not deploy by itself |
| `--publish-target validated-beta` | Blocked: actual accepted installer binding is pending |

Ready metadata and simulated ready fixtures are currently refused by `build()` before network access. The old ready-fixture layout command no longer produces an artifact. `--require-ready` remains a validated-beta alias, not a way around this restriction. Supplying metadata alone does not enable a download.

Next download work depends on an accepted installer and reviewed link metadata: exact version/tag/direct Rivune Release DMG URL, architecture, minimum macOS, positive byte size, SHA-256, timestamped evidence, Developer ID signing, notarization, stapling, Gatekeeper and pilot acceptance. `validate_release()` and `verify_public_asset()` retain validation helpers, but the current ready-build guard prevents automatic binding or public lookup. Future authorized integration must verify the accepted artifact and exact public asset and re-review the link behavior before removing that guard.

The unchanged workflow tests/builds push and pull-request events. Publication requires manual dispatch on main, `publish=true`, the matching `RIVUNE_PAGES_PREVIEW_APPROVED` or `RIVUNE_PAGES_BETA_APPROVED` variable, a matching non-simulated manifest, and the deployment job/environment. Preview approval does not authorize beta; an approval variable does not override the ready-build guard. No remote settings, workflow dispatch or publication are authorized by these instructions.

See [PUBLICATION_HANDOFF.md](PUBLICATION_HANDOFF.md) for current integration scope, historical remote observations and remaining prerequisites.
