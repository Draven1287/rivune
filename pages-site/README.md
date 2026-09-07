# Rivune project website

A static informational website for the open-source Rivune project. It is separate from the desktop app. Python 3.9+ builds plain HTML, CSS and local JavaScript; there is no account backend, analytics, checkout or live AI request.

## Pages and examples

The eight public routes are `/rivune/`, `/rivune/app/`, `/rivune/how-it-works/`, `/rivune/faq/`, `/rivune/about/`, `/rivune/download/`, `/rivune/privacy/`, and `/rivune/council-vs-swarm/`. The last route retains the detailed strategy guide. Navigation uses real page URLs, with About directly available, secondary links in More, and Download last in the desktop header.

Home and App contain original HTML workspace illustrations. Their example content is prewritten and explicitly labeled. The three-example, three-stage walkthrough sends no AI requests. App screenshots and screenshot zoom links are excluded from the public package. Brand icons and the social-preview graphic are original project assets.

The Download page has macOS, Windows and Linux choices. Windows and Linux are planned and have no installer links. Current production metadata is `coming-soon`: the page shows one availability state and a secondary developer-source disclosure, with no installer button or installation tutorial. Source preview 4 requires Xcode and a Mac to build; it is not an installer. A future validated Mac download is visible only while macOS is selected.

## Build and check

Run from this directory:

```sh
python3 -m unittest -v test_site
python3 build.py --publish-target preview
```

Only generated `dist/` contents are a Pages deployment artifact. Do not upload source, fixtures, `.qa/`, tests or review evidence. Do not add an extra `rivune` wrapper: the project URL provides that prefix. The builder emits canonical URLs, an eight-route sitemap, a 404 page and `.nojekyll`.

For a local preview that stays current after builds:

```sh
mkdir -p .qa/http
ln -s ../../dist .qa/http/rivune
python3 -m http.server 4187 --bind 127.0.0.1 --directory .qa/http
```

Create the symlink only if absent, and verify it resolves to `dist`. Open `http://127.0.0.1:4187/rivune/`. A copied preview directory must be refreshed separately; prefer the symlink to avoid serving an older build.

## Release and publication gates

The `preview` target accepts genuine coming-soon metadata without installer fields. `validated-beta` requires a real ready release with version, architecture, minimum macOS, exact size/SHA-256, timestamped evidence, and true Developer ID signing, notarization, stapling, Gatekeeper and pilot-acceptance checks. A production ready build also verifies the exact public GitHub DMG asset URL, upload state, size and digest. These checks consume maintainer evidence; the website cannot perform signing or a pilot itself.

```sh
python3 build.py --publish-target validated-beta
```

That command refuses the current coming-soon release. Installer approval does not attest to unavailable Council, Swarm or Auto features. The source preview and later local development builds remain distinct.

For a deliberately simulated layout check only:

```sh
python3 build.py --release fixtures/ready.json --fixture --out .qa/ready
```

The fixture is visibly simulated and noindex, and cannot be published. Do not open its invented DMG URL. A build with no publication target is a local/CI review artifact and is also refused by the publication checker.

The separate `rivune-pages.yml` workflow tests builds on push/PR; those events never deploy. Publishing requires manual dispatch from `main`, `publish=true`, the matching `RIVUNE_PAGES_PREVIEW_APPROVED` or `RIVUNE_PAGES_BETA_APPROVED` variable, and a matching non-simulated artifact. Both `check_publish.py` and the deploy job enforce the boundary. Building, opening a draft PR or configuring Pages does not itself authorize deployment. See `PUBLICATION_HANDOFF.md` for the current hold and review scope.

## Content boundaries

The site makes no claim that multiple models guarantee a better answer or that unavailable features are live. Provider access, entitlements and usage are separate. Public contact uses the approved forwarding alias; it does not expose a private destination mailbox or collect a form. Paid offers and cloud services are outside this informational site.

The sitemap describes public routes; it does not prove indexing, ranking or AI citations. No search-engine submission or crawler-policy change is part of this build. The intended project URL is `https://draven1287.github.io/rivune/`; no custom domain is configured.
