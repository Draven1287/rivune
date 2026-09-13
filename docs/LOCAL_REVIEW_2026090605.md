# Native review — 0.2 (2026090605), September 6, 2026

Installed /Applications/Rivune.app. Rollback 0604:
/private/tmp/rivune-review-2026090605/Rivune-previous.app.
Release build succeeded, deep strict ad-hoc signature verified, all 200 native
XCTest cases passed. Logs: /private/tmp/rivune-0605-build.log and
/private/tmp/rivune-0605-tests.log. Local review only; account disabled.

## Fix

Update preparation now refuses to continue after project-library load failure.
It cannot replace unreadable/future-schema project data with an empty library.
Regression coverage uses temporary isolated storage, not the user's library.
Additional tests cover draft attachment persistence across store recreation and
excluded missing files versus explicitly included missing files.

## Actually observed

- 0604 Home: logo clears window controls, central reading surface, contained model
  popover; Escape closes it; Command-comma opens Settings.
- 0604 Settings: Scan Mac returns three installed tools; Account honestly shows
  Local workspace without a Keychain prompt. No account/credential changes.
- 0605 cold reopen: startup observed at 4%, then Home/Ready. An unsent disposable
  draft survived Command-Q and reopening; afterward only that draft was cleared.
  No test request was sent to an AI.
- 0605 compact Home and model popover fit the window; Projects list renders.

## Reproducible inspection blocker

Opening the synthetic project details repeatedly causes the computer-use tool to
report "Sky Computer Use native pipe closed before response". Screenshot and AX
calls fail thereafter; Rivune process remains alive. Reset alone did not recover;
a later app restart recovered Home inspection. This does not prove whether the
project page itself has a rendering/accessibility defect or the helper fails on
its contents. Full Project detail CRUD/file-picker/keyboard checks remain pending.
Do not mark this page visually approved based on unit tests.

Other pending rendered checks: startup wordmark during the animation (Home logo
is verified), full-screen transitions, long-answer composer clearance, per-chat
draft switching, full VoiceOver, file selection/changed/missing states and explicit
per-request approval. The corresponding underlying state tests passed, but are
not substitutes for rendered verification.

Live Google/Apple/email callback/cancel/logout/deletion tests and real Sparkle
upgrade tests require separately configured stable signed builds and provider/feed
credentials. Review auth stays disabled; no Keychain entries were modified.
No public release, notarization, deployment, paid model calls, or App Store claim.

## Additional auth source review received after installation

Before enabling auth, fix two native lifecycle gaps: monitor currently exits before
lazy client creation and is not restarted, while the restore latch prevents later
reverification; failed sign-out clears identity and hides its only retry button.
The review build is disabled, so these are release blockers rather than verified
live integrations. Account deletion remains unimplemented. Native auth needs
explicit-client observer ownership, repeatable verification, stale-request guards,
and a persistent reachable sign-out recovery state, with injected failure tests.

Count correction: saved xcresult summary reports 200 passed, 0 failed, 0 skipped.
The earlier 199 count came from an incomplete text-log scan.
