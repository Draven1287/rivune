# SITE-DOCS-CORRECTION

Resolved canonical handoff at pages-site/PUBLICATION_HANDOFF.md. Updated that file and README.md only. DOCS.diff is the exact delta; VALIDATION.json records hashes. Source, export, build, tests, release metadata, publication checks and workflow were hash-verified unchanged. No build, test rerun, server, network or publication operation occurred. The documented 20-pass result cites the prior privacy validation; AST inspection confirms 20 current tests and nine registered routes.

Reconciled nine routes, Single AI/Constellation and Tauri direction, intentional DOM tour, four CSS/JS and four artwork files, no .nojekyll, noindex, review-after-tests command order, current unconditional ready-build guard and blocked ready fixtures. Historical remote and old patch/browser observations are explicitly stale/unverified. No operator-doc instructions confer launch authorization.

## Factual code references

- `pages-site/build.py:20` — `PUBLIC_PAGES = (`
- `pages-site/build.py:123` — `if ready:`
- `pages-site/build.py:213` — `if ready:`
- `pages-site/build.py:216` — `tokens["ROBOTS"] = '<meta name="robots" content="noindex,nofollow">'`
- `pages-site/build.py:239` — `sitemap = ET.Element(f"{{{namespace}}}urlset")`
- `pages-site/build.py:244` — `# Custom Pages workflows serve this artifact directly; the uploader excludes dotfiles.`
- `pages-site/test_site.py:105` — `def test_ready_build_waits_for_accepted_installer_binding(self):`
- `pages-site/test_site.py:137` — `def test_nine_routes_and_styles_scripts_match_approved_v2(self):`
- `pages-site/test_site.py:191` — `def test_sitemap_contains_nine_routes_with_canonical_and_noindex(self):`
- `pages-site/test_site.py:204` — `def test_privacy_routes_questions_to_supported_contact_options(self):`
- `pages-site/check_publish.py:9` — `def authorize_publication(env, manifest):`
- `.github/workflows/rivune-pages.yml:34` — `if: github.event_name != 'workflow_dispatch'`
- `.github/workflows/rivune-pages.yml:37` — `if: github.event_name == 'workflow_dispatch'`
- `.github/workflows/rivune-pages.yml:42` — `if: github.event_name == 'workflow_dispatch' && inputs.publish`
- `.github/workflows/rivune-pages.yml:49` — `- name: Upload static site only`
- `.github/workflows/rivune-pages.yml:52` — `path: pages-site/dist`
- `.github/workflows/rivune-pages.yml:54` — `if: github.event_name == 'workflow_dispatch' && inputs.publish && github.ref == 'refs/heads/main' && ((inputs.target == 'preview' && vars.RIVUNE_PAGES_PREVIEW_APPROVED == 'true') || (inputs.target == 'validated-beta' && vars.RIVUNE_PAGES_BETA_APPROVED == 'true'))`

Bounded reviewer request: report-only check these two documents against cited code and diff. Do not build or edit source. Documentation lane is released; next implementation dependency is an accepted installer and verified link metadata.
