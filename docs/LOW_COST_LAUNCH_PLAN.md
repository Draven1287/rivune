# Rivune: a low-cost path to a usable public beta

Current refinement, September 6: [LAUNCH_AND_REVENUE_CYCLE.md](LAUNCH_AND_REVENUE_CYCLE.md) separates an informational open-source project preview from the signed Mac beta and a later paid cloud service. The preview can be published while the installer remains explicitly unavailable. GitHub Pages was freshly verified disabled (`has_pages=false`); website source is being prepared for distinct preview/beta publication targets. Historical build/provider/test references below remain dated evidence, not the current native build status. Paid SaaS/checkout hosting is separate from GitHub Pages; see its current [usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

Decision, September 6, 2026: prepare a free GitHub Pages project site and host
the eventual Mac installer in GitHub Releases. Do not buy a domain or server
to validate the app. Publish the end-user download after the quality and
installation checks below pass.

## The user's download experience

1. Visit `https://draven1287.github.io/rivune/` once Pages is enabled.
2. See what Rivune does, a real screenshot, supported Macs, provider requirements,
   and one clear **Download for Mac** button.
3. The button downloads the exact versioned DMG asset from GitHub Releases.
   It must not send ordinary users to a repository, release asset list, source
   ZIP, or instructions to run Xcode.
4. Open the DMG, drag Rivune into Applications, then open Rivune.
5. Connect supported providers, try a small Together project, and see the final
   artifact plus each provider's contribution and review.

Until there is a validated signed installer, the page says **Mac installer
coming soon** and offers a secondary **View source code** link. No fake active
download button, account signup, payment form, or waitlist backend is needed.

The website's ready state must name the actual release version, minimum macOS,
architectures, and measured file size. The current installed review app is
universal Intel/Apple silicon and requires macOS 26.0. Do not silently imply
support for older Macs or operating systems.

## Costs and limits

| Item | Approach |
| --- | --- |
| Project website | GitHub Pages on a public repository; no paid domain required |
| Source and installer files | Public GitHub repository and Releases |
| Custom domain | Optional later; not needed for this beta |
| Cloud backend | Defer; local Rivune use must not depend on a Rivune Cloud account |
| AI usage | Users connect supported provider access; a free chat account does not automatically grant a usable CLI/API entitlement |
| Normal signed Mac distribution | Apple Developer Program, currently US$99 per membership year; use an existing eligible membership if available |

GitHub Pages serves static project information and downloads. It does not supply
the account service or hosted AI execution backend. Check current GitHub policies
and limits again if adding a commercial hosted service later.

## Quality before launch

First audience: people who already use the currently supported Codex and Claude
connections and want both to collaborate on a real task. Do not advertise
arbitrary AI integrations or effortless setup for unsupported free accounts.

Before outside installation testing:

- Correct the ownership, truncation, and blank-preview defects from the Lantern
  Pages test; repeat the same task against the fixed build.
- Preserve complete provider artifacts and reviews. The shared contract must
  survive every stage, and planned roles must match executed roles.
- Keep onboarding honest: show supported, installed, signed-in, ready, and
  adapter-needed states separately. No inaccessible controls or required cloud
  account for local use.
- Test cancellation, provider failure, retry, saved projects, and restoration
  after closing and reopening the app.
- Complete the real signed/notarized DMG path, including clean download,
  drag-to-Applications, first launch, and local persistence on another Mac.
- Test the advertised update behavior with real signed versions, or clearly
  disclose manual updates for the beta. Do not claim automatic updates from
  scaffolding alone.

## Five-person pilot

This is a proposed decision rule for a small usability pilot, not a forecast or
statistical proof. Test the corrected app before spending on marketing.

1. Recruit five willing people from the first audience. Use participant IDs;
   keep their personal prompts, credentials, and documents out of public QA.
2. Give each person the download page and a real task they care about. Observe
   without coaching. Record where they ask for help.
3. Record time to first useful result, successful setup, artifacts that actually
   work, failures, amount of rescue work, and whether they would use it again.
4. For at least three representative tasks, compare Together with the person's
   normal single-provider workflow using equivalent input and an agreed budget.
   Judge outputs before revealing the route when practical. Measure task
   usefulness and time; do not reward confident prose or disagreement itself.
5. Ask whether they voluntarily returned during the next week. Treat praise,
   GitHub stars, and downloads as weaker signals than completing another task.

Suggested beta decision: all five can get through installation and setup without
an unresolved blocker; at least four finish their task without developer rescue;
at least three choose to return; no open data-loss or security defect. Failure
means fixing the observed bottleneck and retesting, not adding more features to
the homepage. Record actual results; none of these participant outcomes exist yet.

## Verified status and owners

- **Public now:** `Draven1287/rivune`, latest source prerelease
  `v0.2.0-source-preview.4`. Source availability is not a Mac download launch.
- **Pages:** repository Pages endpoint returned 404 during this check. The site
  is being prepared locally; the proposed URL is not claimed live.
- **Mac review build:** 2026090609, ad-hoc signature, no team identifier. No
  valid code-signing identity was found on this Mac. The user confirmed that
  they do not yet have an Apple Developer Program membership. Continue free
  product validation before enrolling; no purchase is authorized here.
- **Existing local DMG:** `release/preview/Rivune-Preview.dmg` is obsolete 0.1(1),
  dated September 1, local-only and not notarized. Never use it for the new page.
- **App owner:** Update Rivune product direction — Together integrity and static
  preview fixes, then a current identified review build.
- **Website owner:** Review and update website daily — static Pages-ready site,
  accurate unavailable/ready download states, deployment workflow, and rendered QA.
- **Audit/release owner:** Audit Rivune native app — installer pipeline, actual
  acceptance evidence, and coordination. Fixed the codesign hardened-runtime
  parsing defect; seven offline release-guard tests pass. The check was added to
  the CI workflow; GitHub has not run the new step yet.

## Sources

- GitHub Pages availability, static hosting, and default project URLs:
  https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Apple enrollment requirements and current price:
  https://developer.apple.com/programs/enroll/
- Developer ID signing and notarization for direct downloads:
  https://developer.apple.com/developer-id/
- Baseline Together evidence: `../qa-artifacts/together-website-20260906/REVIEW.md`
