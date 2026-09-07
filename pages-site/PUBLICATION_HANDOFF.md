# Informational website publication handoff

Prepared September 7, 2026. This is a locally reviewed informational website, not a published site or an available Mac installer.

## Exact scope

The review patch adds 18 files: the Rivune Pages workflow and 17 files under pages-site. These include the authentic native development screenshot, homepage, team guide, privacy page, styles, static builder, release metadata, tests and documentation. Only generated pages-site/dist is deployed. QA evidence, local checkouts, caches, fixtures and tests are not deployed. All 111 existing files in the inspected public base remain unchanged.

Public base: 68747456c17692784ba0924fc9ed41392ce6c7af. Recheck public main before integration. The public repository is Draven1287/rivune; Pages was disabled at the last read-only check. Source preview 4 provides a developer ZIP and checksum, not a DMG. Do not push the unrelated native development checkout or replace public native source.

## Website behavior

The site shows Rivune's current development direction, a real native development screenshot, illustrative use cases, developer introduction, FAQs, provider prerequisites, privacy information and source links. The Mac installer stays explicitly unavailable. Council in later local development and future Auto/Swarm work are distinguished from public source preview 4.

The public contact alias is rivune.crave757@slmails.com. The link opens the visitor's email app. No private destination mailbox, form backend, analytics, paid checkout or cloud account service is included. GitHub support remains available. Alias enablement was confirmed, but inbound forwarding and private reverse-alias replies still require a delivery test.

## Validation and publication

Run python3 -m unittest -v from pages-site, then python3 build.py --publish-target preview. The reviewed version passes the complete 22-test suite. Rendered desktop and mobile review covers image loading, menu and FAQ keyboard interaction, skip navigation, image enlargement, reduced motion and overflow. Root review evidence is maintained separately from the public artifact.

After the exact source diff and preview receive publication approval:

1. Integrate only the reviewed website and workflow additions against current public main.
2. Configure the repository's Pages source as GitHub Actions and the github-pages deployment environment for main, including required review settings where applicable.
3. Set RIVUNE_PAGES_PREVIEW_APPROVED=true only for the approved informational release. Leave RIVUNE_PAGES_BETA_APPROVED unset until an actual beta is separately accepted.
4. Manually dispatch Rivune project site on main with target preview. publish=false builds an artifact only; publish=true deploys after its approval checks. Push and pull-request builds do not deploy.
5. Verify the actual public homepage, team guide, privacy page, images, sitemap, mobile behavior and disabled installer controls before reporting the site live.

The standard project URL is https://draven1287.github.io/rivune/. A custom domain is optional; none is needed for this launch. Search indexing is not guaranteed. A signed, notarized and independently accepted DMG remains a separate app-release milestone.
