# Rivune launch logistics

Verified September 7, 2026 (America/Denver). This is a release-readiness package, not authorization to publish, enroll, purchase, upload, sign agreements, or launch.

## Decision

Use direct Mac distribution: a versioned GitHub Release DMG, a small GitHub Pages project/download surface, and Sparkle for later in-app updates. Do not buy a domain or run a Rivune cloud backend before product validation. The existing local-first app can remain usable without a Rivune account; users supply supported provider access.

There is a real cost boundary. Source distribution, local development, the project repository, a public informational Pages site, and developer-led pre-pilots can remain $0. A normal, low-friction download for ordinary Mac users cannot currently be completed at $0 unless an existing eligible Apple Developer Program membership or Apple fee waiver is available. Apple lists the program at US$99 per membership year and includes Developer ID and notarization for Mac apps. [Apple membership comparison](https://developer.apple.com/support/compare-memberships/)

Recommended spend timing: finish current native acceptance and a small developer-led pre-pilot first. Then use an existing membership or enroll immediately before producing the two signed builds needed for clean-install and update testing. Do not add hosting, domain, analytics, database, email, or payment spend for this beta.

## Current verified state

| Area | Evidence | Status |
| --- | --- | --- |
| Public repository | [`Draven1287/rivune`](https://github.com/Draven1287/rivune) is public; default `main` is still `68747456c17692784ba0924fc9ed41392ce6c7af`. The public API reports no branch protection. | Source is public; local work is substantially newer and is not represented by public `main`. |
| Public release | Latest release remains [`v0.2.0-source-preview.4`](https://github.com/Draven1287/rivune/releases/tag/v0.2.0-source-preview.4), a prerelease with an 11,064,421-byte ZIP and checksum. Digest: `c2c816c818aa3150c3f0f47634fa599626f735e1879fc38815d34dec021aadb1`. | Developer source only; no DMG asset. |
| Pages | Repository API reports `has_pages=false`; the Pages API and `https://draven1287.github.io/rivune/` return 404. Public `main` contains only `ci.yml`, not the prepared Pages workflow. | Not live. |
| Frozen Pages handoff | All 17 recorded source hashes still match `pages-site/.qa/publication-review/integration.json`; patch SHA-256 is `3859f1310b26c634d9157b8c5e49f07ac22c152c092777dbdd671a3312779292`. Its 21 tests pass. | Reviewable and unchanged; no hosted Actions or public-origin acceptance yet. |
| Current native worktree | Project metadata currently says version `0.2`, build `2026090621`, minimum macOS `26.0`. This lane did not freeze, build, install, or accept that moving source. | Development evidence only. |
| Local release artifacts | Existing preview DMG is version `0.1 (1)`, ad-hoc, not notarized, not Gatekeeper assessed. Its SHA-256 is `1827654db9341c01fd1e60ac165bd17895e85b298f7a40c451405ea8e4b21f7e`. | Must never be offered as the public installer. |
| Apple credentials | `security find-identity -v -p codesigning` reports `0 valid identities found`. Membership status itself was not queried. | Public signing is blocked on an eligible membership, Developer ID Application identity, and notary profile. |
| Release safeguards | `scripts/test_dmg_release_guards.py`: 7 passed. `scripts/test_update_signatures.py` with bundled Sparkle tools: valid disposable archive accepted; modified archive rejected. | Offline mechanics pass; no real Apple signing, notarization, hosted feed, or installed update proven. |
| Public links | Repository, release, issues, license, security policy, provider docs, Apple references, and GitHub privacy links returned HTTP 200. The intended Pages image URL returns 404 because Pages is disabled. | No unexpected external link defect found. |

## $0-before-revenue path

### Phase 0 — finish the product locally: $0

- Freeze one exact native candidate after current integration, then build and run the full native test suite from that snapshot.
- Complete installed acceptance for launch-critical behavior: quit/reopen, drafts and local history, first-run setup, provider failure/recovery, Council results, artifact preview/save/reopen, export, deletion, and no data loss.
- Record version, build, architectures, minimum macOS, bundle ID, source commit, binary hash, and accepted limitations. Current macOS 26.0 targeting sharply limits the audience; treat it as a deliberate beta constraint or lower and retest it before release.
- Run a developer-led pre-pilot only with people who can build from source or knowingly use a local test build. Do not call that an easy public download.

### Phase 1 — informational project page: $0

- After separate approval, integrate only the frozen 17-file Pages handoff against the current public `main`; recheck if `main` moves.
- Configure GitHub Pages with Actions, the `github-pages` environment, main-only protection/reviewer settings, and only `RIVUNE_PAGES_PREVIEW_APPROVED=true`.
- Dispatch `preview` with `publish=false` for artifact review, then `publish=true` only after the publication decision. Verify all public routes, assets, privacy/support links, mobile navigation, canonical URLs, sitemap, and disabled installer controls at the real origin.
- Keep it informational. GitHub Pages is available for public repositories on GitHub Free, but GitHub prohibits using it primarily for commercial transactions or commercial SaaS. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

This phase publishes no installer, takes no payment, and creates no account service.

### Phase 2 — five-person signed pilot: first unavoidable distribution spend

Required user-controlled step: use an existing eligible Apple membership, obtain a fee waiver if genuinely eligible, or enroll in the Apple Developer Program and personally accept Apple's agreement/payment. The project should not purchase or accept terms automatically.

Then the release operator:

1. Creates/installs a Developer ID Application certificate and a `notarytool` Keychain profile; records the exact team ID without committing credentials.
2. Freezes a reviewed native candidate and runs the public DMG packager. Apple recommends signing Mac software distributed outside the App Store with Developer ID and notarizing it; `notarytool` and `stapler` support custom workflows. [Apple Developer ID](https://developer.apple.com/developer-id/), [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
3. Confirms hardened runtime, secure timestamps, Apple `Accepted` status for app and DMG, stapled tickets, strict code-sign verification, Gatekeeper acceptance, `/Applications` link, architectures, minimum OS, and checksum from the mounted immutable DMG.
4. Tests download → mount → drag → first open on a clean supported Mac under a non-developer account. Test without Xcode and without signing certificates installed.
5. Runs five-person setup/task acceptance. Each tester must install without bypass instructions, reach one provider, finish one real task without developer rescue, reopen their saved result, and understand what data went to which provider. Record failures, not private prompts or credentials.

Do not upload the DMG until those gates pass. The packager's current fail-closed design is appropriate; an ad-hoc preview is never a fallback release.

### Phase 3 — public beta download and updates

Publish a versioned GitHub prerelease containing exactly the accepted `.dmg`, `.sha256`, release notes, source provenance, supported Macs, and known limitations. Link the exact versioned DMG asset from Pages; ordinary users should not land on a source ZIP or release asset list. GitHub documents stable links for individual release assets. [GitHub release links](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)

Populate `pages-site/release.json` from the real asset and validation evidence, switch only through the `validated-beta` gate, set `RIVUNE_PAGES_BETA_APPROVED=true`, and publish after a final artifact diff. Do not alter planned-feature truth merely because the installer is ready.

For the closed pilot, manual replacement can be disclosed. Before a broad public beta, enable the existing Sparkle path and prove it with two signed versions:

- Generate and retain the EdDSA private key outside the repository and hosting tree; embed only its public key.
- Choose a stable HTTPS appcast/release-notes endpoint. A future reviewed Pages addition can serve the static feed for a free open-source beta; the frozen 17-file handoff does not contain that feed and must not be silently expanded.
- Build the earlier signed version with `DIRECT_UPDATES`, exact feed URL, public key, and Developer ID team. Publish a strictly higher signed build to a staging feed and perform the real Check for Updates → download → verify → wait for active work → relaunch flow.
- Test offline feed, malformed/altered archive rejection, skip/later, interrupted download, update during an active task, restored draft/history/project state, and successful rollback to a previously retained signed DMG when policy allows.
- Merge the new entry with feed history; never overwrite the feed with only the latest local item. Sparkle recommends cryptographically signing updates and its `generate_appcast` tool creates the EdDSA signature. [Sparkle publishing](https://sparkle-project.org/documentation/publishing/)

## First-run contract

The current source already separates three concepts and the release must preserve them:

1. **Rivune account:** optional for local use. The Account step has `Continue locally`; disabled/unconfigured cloud account services must not block the workspace.
2. **Provider connection:** model access comes from the user's supported CLI sign-in or API key. CLI authentication remains provider-managed; API keys stay in Keychain and provider billing/limits apply.
3. **Readiness:** installed or configured does not equal authenticated or proven usable. Setup may advance from Connect AI only with at least one ready provider. The first real message verifies generation; Council requires its admitted team, not merely two discovered executables.

Public setup copy must name the actual prerequisites: macOS 26+ unless retested lower, supported Codex/Claude client or API access, provider account/charges, and that Rivune does not supply model access. Acceptance covers `Account → Continue locally → Connect AI → Ready`, a provider refresh, one direct response, and then Council only where its selected team is ready. A failed provider should lead to one clear recovery action without losing the draft.

## Privacy, export, support, and recovery

- Public privacy copy already states that history is local while AI processing occurs at selected providers, provider terms govern retention/charges, a Rivune account is separate, and the static site has no analytics or account service.
- Before beta, add release-specific confirmation that Settings → Privacy exports conversation JSON including messages and attached text but excludes API keys and pairing credentials. Test export, inspect the saved file, and import/recovery expectations honestly; no import feature is established.
- Conversation and project deletion exist individually. Verify those operations and Evaluation Lab deletion against persisted/recovery copies. A one-click “delete all” path was not found; either add and test it later or document the exact manual reset procedure. Do not imply account deletion when local-only mode created no account.
- Support can start at [public GitHub issues](https://github.com/Draven1287/rivune/issues); users must be told not to post private prompts or credentials. Security reports go through [private vulnerability reporting](https://github.com/Draven1287/rivune/security/advisories/new). No response SLA is promised. Add an in-app Help/About route to these destinations before broad beta or include them prominently in release notes; no in-app support URL was found in this source pass.
- Keep the prior signed DMG, its checksum, release metadata, and source revision for rollback. User data must remain forward/backward safe across the two update-test builds or the public update is blocked.

## Release acceptance checklist

### Informational preview

- [ ] Root/user approves the exact 17-file scope and rendered preview.
- [ ] Patch reapplies cleanly to current public `main`; unrelated native/public files are unchanged.
- [ ] Pages environment and preview-only approval variable are configured.
- [ ] Manual preview deployment succeeds and real-origin routes/assets/privacy/support are checked.
- [ ] Installer remains disabled; page says source preview and coming soon.

### Signed pilot

- [ ] Exact candidate is frozen, reviewed, fully tested, and identified by commit/build/hash.
- [ ] Developer ID identity and notary profile exist; no secrets enter source or logs.
- [ ] App and DMG are signed, notarized, stapled, mounted, checksummed, and Gatekeeper accepted.
- [ ] Clean supported Mac installation and first launch work without security bypass instructions.
- [ ] Local-account path and provider-account distinction are clear.
- [ ] Five testers complete setup/task/reopen/export checks; no open data-loss/security blocker.

### Public beta

- [ ] Exact accepted DMG and checksum are uploaded to one versioned GitHub prerelease.
- [ ] Release notes state minimum OS, architectures, provider prerequisites, data sharing, update method, support, and known limitations.
- [ ] `release.json` exactly matches the public asset size/digest and all required acceptance evidence.
- [ ] Validated-beta Pages gate passes and public download retrieves the identical digest.
- [ ] Two-version Sparkle update succeeds end to end, or a small closed pilot explicitly remains on manual updates.
- [ ] Rollback artifact and user-data recovery procedure are tested and retained.

## iPhone companion distribution appendix

The native iPhone companion is a separate release track. Current source contains an iOS target plus encrypted local discovery and pairing with the Mac; simulator compilation and source review do not prove installation on a physical iPhone, reliable background behavior, TestFlight availability, or internet remote control. Public site and release copy must continue to describe the phone app as planned or in private development until those states are separately accepted.

For a same-network pilot, validate a real iPhone against the exact Mac candidate: pair and revoke an expiring device credential, select the same durable task, send and stop work, stream progress, open exact artifacts, survive background/foreground and disconnect/reconnect, reject duplicate commands, and show a clear Mac unavailable state. Provider credentials and execution remain on the awake Mac.

TestFlight/App Store distribution requires Apple Developer Program and App Store Connect access. Apple lists TestFlight and App Store Connect as program resources, and the membership is US$99/year unless an eligible waiver applies. External TestFlight builds are uploaded to App Store Connect; the first build submitted for external testing requires TestFlight App Review, while later builds may not require a full review. [Apple programs overview](https://developer.apple.com/help/account/membership/programs-overview) [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)

Away-from-home control is another acceptance increment. It needs authenticated encrypted transport through a secure relay or explicitly configured private connection, device-scoped revocable credentials, replay protection, bounded requests, durable request IDs, and tested offline/sleep/locked behavior. It must not expose a Mac port directly. This path still depends on the user's awake, connected Mac and does not create hosted AI inference. Execution while the Mac is off requires a cloud backend/provider-execution design with separate privacy, operating-cost, account, and billing decisions; pricing owns that distinction.

Do not publish an iPhone download claim until a clean external TestFlight install and real-device acceptance pass. Do not publish an away-from-home claim until a phone on a different network completes a task through the accepted relay, reconnects to the same run without duplication, preserves artifact integrity, and proves revocation. App Store release remains a later review and policy gate.

## Rollback and stop triggers

Stop publication or remove the download link if Gatekeeper rejects the DMG, the public digest differs, first launch requires a security bypass, provider setup misstates access, the wrong build is served, saved data disappears, export contains credentials, a selected provider receives undisclosed material, or an update cannot preserve drafts/history/projects. Pause broad rollout for repeated setup failures or any unbounded provider-request behavior. Restore the last accepted versioned asset and coming-soon/paused site state; never replace evidence with fixture metadata.

## Required decisions and ownership

No immediate purchase is needed. After current native acceptance, the user must choose one of: existing eligible Apple membership, valid fee waiver route, or US$99/year enrollment. They must personally complete enrollment terms/payment. Root separately owns publication authorization and pricing decisions.

Release owner freezes/signs/notarizes and records evidence. Website owner integrates the already-frozen Pages patch and later a separately reviewed appcast addition. Native owner verifies onboarding, export/deletion, clean install, and update-safe persistence. Root decides when pilot evidence is good enough to expose the public DMG.

## Verification record

Read-only remote checks used GitHub's repository, branch, release, Pages, workflow-content, and issue APIs on September 7. Local validation ran the 21 Pages tests, 7 DMG guard tests, and Sparkle's disposable-signature test. These checks made no remote changes. The Pages unit suite regenerated ignored `pages-site/dist` review output but did not change any of the 17 frozen source hashes.
