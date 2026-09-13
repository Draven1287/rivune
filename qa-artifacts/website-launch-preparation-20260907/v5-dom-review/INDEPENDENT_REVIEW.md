# Screenshot-free V5 independent website review

Status: bounded functional acceptance PASS. This is not final user visual approval or acceptance of the native app and installer.

## Frozen source and browser evidence

Candidate manifest: `1c87f658dd09f88e2f2d745cd9c0cb1e37fcb2bdbace94f431dbcacf48d1350d`. All 61 listed files match their hashes. The source is identical to the independently tested snapshot.

All 23 Python tests passed. The browser audit passed 32 direct-load and refresh states at 320, 390, 768 and 1280 pixels, including real navigation, history, canonical URLs and active-page links. More/Menu opened by keyboard, closed with Escape and returned focus, dismissed on an outside pointer action, and closed after FAQ navigation. Download is the final desktop navigation item; on mobile it is available inside Menu. App perspective/review disclosures work by keyboard. Skip-to-main, reduced-motion scrolling and essential content without JavaScript also passed.

The simulated ready fixture passed 18 walkthrough states and six platform selections. No wrong-platform Mac installer remained actionable. No external page-resource or AI requests were observed. These are website tests with prewritten examples, not real provider execution.

I personally inspected desktop Home and mobile Home/App. They contain original HTML workspace illustrations with sample-content disclosures. All eight live routes returned HTTP 200 without the rejected screenshot or zoom link; the screenshot asset URL returned 404. The old preview redirects to the current one. The first outside-click test targeted text covered by the open mobile menu; correcting the target to an actual outside margin produced a passing result. That was a test-target issue, not a product dismissal failure.

## Draft integration

Runtime source was integrated unchanged into draft PR 3. README and PUBLICATION_HANDOFF were updated to reflect current routes, evidence and the launch hold. All 16 generated files match the frozen output. The diff against public main contains 21 site-source files and the separate workflow; existing native files are unchanged.

Commit `34fe97ecd7d71feece15a2528ea417681560f195` was pushed to the existing draft branch. Website CI passed, deployment was skipped, and Apple CI was still running at this receipt. No merge, release, installer upload or website deployment occurred.

Native provider/orchestration behavior, installer/pilot acceptance, final visual review and the agreed launch sequence remain separate outstanding requirements.

## Final CI result

GitHub Apple client CI run `34154517660` completed successfully in 5m8s, including source exporter, macOS build/tests and iOS build. Website CI had already passed and deployment was skipped. Draft PR remains unmerged. This does not replace installed-app or installer acceptance.

## Packaging correction and actual CI artifact

A later audit downloaded the GitHub artifact and found that the uploader excluded `.nojekyll` while the build manifest still listed it. Commit `036d1be9605a14153c0f895da64f21f9274f225a` omits that unnecessary file for this custom Actions workflow and adds an upload-inventory regression; all 24 tests pass. No page, asset, style or interaction bytes changed.

The new website CI run `34155427827` passed, with deployment skipped. Artifact `10030788646` was downloaded and its ZIP SHA-256 matched GitHub. All 15 packaged files and every manifest digest were verified. Page and asset bytes match the reviewed local output; the manifest correctly uses the nonpublishable `review` target for PR builds. The publication checker rejected that actual CI manifest even under a simulated manual-preview approval environment. No actual approval setting changed. Latest Apple CI run `34155427825` remained in progress at this receipt.

Local archive-test development also exposed BSD/GNU tar pattern differences on macOS; the portable unit test models the upload exclusion boundary, and the actual downloaded CI tar supplies the independent end-to-end package evidence. No GNU tar install was needed.
