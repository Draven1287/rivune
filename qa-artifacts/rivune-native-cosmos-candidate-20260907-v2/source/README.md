# Rivune project information on GitHub Pages

A static open-source project information, documentation, and release-link surface for `https://draven1287.github.io/rivune/`. It is not the Rivune app, a cloud service, or a checkout. Existing silver identity, assets, and layout are preserved. Python 3.9+ builds plain files; no Node, account backend, analytics, external fonts, or form collection is used.

## Current content and availability

The public release `v0.2.0-source-preview.4` is a developer source ZIP and checksum, requiring Xcode. It is not a Mac installer. On September 6, 2026, the public release API reported a published prerelease with those two assets and no DMG. `release.json` remains `coming-soon`; both download buttons are disabled.

Copy follows the reconciled AI-team direction: one Mac app, a suggested reusable team and eligible manager, optional model/reasoning changes beside the prompt, and multiple members using the same provider tool. Council provides independent answers followed by one reviewed result. Council is the first development stage, while real divided Swarm work and Auto remain future milestones. The public source preview predates this configurable-team experience. Local implementation or private acceptance does not establish public feature availability. No superiority, commercial pricing, or cloud availability claim is made.

## Build and test

From this folder:

```sh
python3 -m unittest -v
python3 build.py --publish-target preview
```

The explicit `preview` target requires genuine coming-soon release metadata without installer fields. It generates the homepage, privacy page, guide, assets, 404, and a three-page absolute canonical sitemap. It has no installer link. The build command does not deploy anything.

`dist/` is the artifact root. Upload its contents only; do not wrap it in an extra `rivune` folder. GitHub provides the project URL prefix. Source, tests, `.qa`, fixtures, and review artifacts must not be uploaded. `.nojekyll` disables Jekyll processing.

To inspect the real base path locally:

```sh
mkdir -p .qa/http
ln -s ../../dist .qa/http/rivune
python3 -m http.server 4187 --bind 127.0.0.1 --directory .qa/http
```

Create the symlink only if absent. Check `/rivune/`, `/rivune/privacy/`, `/rivune/council-vs-swarm/`, and `/rivune/sitemap.xml` at `http://127.0.0.1:4187`.

## Two publication targets

| Target | Required metadata | Visible result | Approval variable |
| --- | --- | --- | --- |
| `preview` | `status=coming-soon`, no installer fields | Project/source information; disabled Mac installer | `RIVUNE_PAGES_PREVIEW_APPROVED=true` |
| `validated-beta` | `status=ready`, all installer validation and matching public DMG | Exact validated installer link and details | `RIVUNE_PAGES_BETA_APPROVED=true` |

A preview cannot hide or relabel ready metadata. Beta cannot use coming-soon or simulated metadata. Fixtures are refused by both targets. The old `--require-ready` flag remains an alias for the validated-beta gate; it cannot be combined with preview. A build without either flag is a local/CI `review` artifact, which `check_publish.py` refuses to authorize for deployment.

To prepare a future beta artifact, the release owner must supply the actual version, tag, direct Rivune GitHub Release `.dmg` URL, architecture, minimum macOS, positive byte size, lowercase SHA-256, timezone-aware validation timestamp, evidence reference, and boolean outcomes for Developer ID signing, notarization, stapling, Gatekeeper, and pilot acceptance. ZIPs, `latest` links, other repositories, incomplete metadata, false checks, and simulation markers are rejected. A non-fixture ready build also requires the exact public GitHub release asset URL, uploaded state, byte size, and digest to match. The site records maintainer attestations; it cannot perform macOS signing or pilot acceptance itself.

```sh
python3 build.py --publish-target validated-beta
```

This command currently refuses the actual coming-soon release. Installer approval does not enable new app modes or attest to features absent from that release.

## Workflow and launch authorization

`.github/workflows/rivune-pages.yml` adds a separate workflow to the real `Draven1287/rivune` repository without replacing native CI. Push and pull-request events only test/build. Manual dispatch takes `target` (`preview` or `validated-beta`) and `publish` (default false). A manual build can prepare either target without publication.

Publishing additionally requires: explicit `publish=true`, `main`, the matching target-specific repository approval variable, a matching non-simulated build manifest, and the `github-pages` deployment environment. Both the tested `check_publish.py` pre-upload gate and the deploy job enforce the target's approval. Preview approval cannot authorize beta. The previous generic launch variable is no longer consumed. No step enables Pages automatically.

After scope and concrete diff approval, the operator integrates these files into the actual public repository's main history, configures Pages to use GitHub Actions, configures the `github-pages` environment and branch/reviewer protections, sets only the approved target variable, and manually dispatches that target. No enabling, push, dispatch, or deployment was performed during preparation. See `PUBLICATION_HANDOFF.md` for the verified remote baseline and remaining prerequisites.

The workflow follows GitHub's supported checkout/configure/upload/deploy actions. Public repositories can use Pages with GitHub Free, subject to its terms and limits. No custom domain purchase is needed. [Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

GitHub Pages cannot be used for a site primarily facilitating commercial transactions or commercial SaaS. This preview therefore stays focused on the open-source project and source/download documentation. Pricing, paid offers, checkout, signup forms, and a dynamic cloud service require an appropriate separately approved host. [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

## Fixture and discovery boundaries

For layout tests only:

```sh
python3 build.py --release fixtures/ready.json --fixture --out .qa/ready
```

This output is visibly simulated and noindex. Its invented DMG URL must not be opened or published. It emits no sitemap and cannot be used with a publication target. The build restricts fixture output to `.qa/`.

The explicit public-page registry supplies routes, absolute canonical URLs and `sitemap.xml`. Only homepage, privacy, and Council/Swarm guide are included; 404, fixtures, source files and artifacts are excluded. No artificial modification dates are used. Sitemap generation does not prove publishing, indexing, ranking, or AI citations, and none has been submitted to a search engine.

No special AI file or schema is required by Google's AI-feature guidance. This site uses readable text and internal links; it adds no `llms.txt`, offers, synthetic ratings or hidden recommendation instructions. [Google AI-feature guidance](https://developers.google.com/search/docs/appearance/ai-features)

The effective robots policy belongs at `https://draven1287.github.io/robots.txt`, not `/rivune/robots.txt`. A September 6 read-only check returned GitHub's 404 HTML, not a readable robots policy. Absence alone does not prove blocked crawling. Origin-root ownership is separate; this project does not create or change that policy. OAI-SearchBot search access and GPTBot training controls are independent; no training preference was changed. Recheck the host and headers after an authorized launch. [Robots location](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt), [OpenAI crawler controls](https://developers.openai.com/api/docs/bots)
