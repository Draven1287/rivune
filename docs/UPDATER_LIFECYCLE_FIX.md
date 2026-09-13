# Bounded updater lifecycle correction — 2026-09-06

Source: RivuneApp.swift, RivuneStore.swift, native deterministic tests. Website, source exporter, public releases and service configuration are outside this change.

## Implementation

Ordinary quit and Sparkle termination now share fresh admission through NSApplicationDelegate.applicationShouldTerminate. Active provider runs/project loading cancel termination. Draft, conversation history and project writes run in order and all must succeed. A prior successful save is never a reusable permission for a later quit. Admission is synchronous on MainActor and returns one terminateNow/terminateCancel response; there is no unresolved asynchronous termination reply.

A postponed installation owns one build, callback, generation and cancellable task. Active work is waited on; a failed save retains the callback in a typed blocked state with Retry save and install. Keep working cancels the waiting task but retains retry. Old/cancelled generations and duplicate item callbacks cannot invoke installation. Known Sparkle abort/error resets owned pending state. Missing workspace is an explicit retriable failure.

Keep working is deliberately not labeled Cancel update: Sparkle 2.9.6 says downloaded install-on-quit updates still attempt installation on application termination. Rivune keeps Sparkle's scheduler (willInstallUpdateOnQuit returns false); its shared quit gate protects that path. No unsupported Sparkle cancellation API is implied.

Sparkle no-update and installation-cancelled results get typed messages, not invented offline errors. Other failures get a generic sanitized retry message. Each new valid item replaces/removes release notes. Persisted attempt records contain an ID and from/to build; known aborts clear them. Launch consumes matching/stale/superseded/rollback records once. A match says Now running Rivune, not that automatic installation was proven. Reconciliation intentionally removes the prior notes link.

## Test boundary

Isolated fixtures inject active-work status, independently failing draft/history/project flushes, a deferred cancellable wait, and install callback counters. They cover failed save/retry, repeated callback admission, pause/resume, superseded/late wait completion, fresh quit admission after earlier success, error classification, aborted/manual/superseded version reconciliation, and release-note removal. They use no updater network, account service or real user storage. Production persistence wiring uses the same ordered admission function; these fixtures do not establish disk durability across a real update.

The pinned local Sparkle 2.9.6 headers SPUUpdaterDelegate.h and SUErrors.h supplied delegate signatures/behavior. DIRECT_UPDATES must be separately compiled because the installed local configuration excludes it. The initial command-line compilation-condition override incorrectly replaced dependency conditions and failed in swift-crypto; validation uses a temporary target-only condition instead. No source package changes were made.

## Remaining release gate

Two provisioned, signed/notarized builds must still demonstrate download, signature verification, install-on-quit/relaunch, active-run defer, failed save/retry, cancel/recovery, preserved drafts/history/projects, version notice, feed/signature failures and dormant no-feed behavior. This local code/test pass is not that acceptance. No feed/key/team configuration is enabled here.

## Final-termination rejection correction (R1)

Review caught the gap after an install callback was consumed but AppKit's later fresh save gate refused quit. The termination delegate now informs the pending installer of that rejection. It invalidates the consumed callback/generation and removes same-build deduplication for the new attempt. Retry performs fresh admission and opens Sparkle's supported check/progress/resume flow only when canCheckForUpdates permits it; SDK-busy leaves retry available. A fresh SDK continuation for that same build is accepted once. The one-shot relaunch callback is never reused. Known attempt metadata is cleared on this rejection, avoiding an automatic-install claim.

The added deterministic fixture covers initial admission/callback, rejected final quit, temporarily unavailable SDK recovery, successful recovery request and a new same-build callback with duplicate suppression. Actual Sparkle recovery after canceled termination remains part of the two-signed-build gate. Source documentation: pinned SPUUpdater.h checkForUpdates/canCheckForUpdates/sessionInProgress; resumed downloaded installations are supported through a new user check.

## Final build evidence

Combined account/updater suite: 224 passed, 0 failures, 0 skipped.
/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_16-53-56--0600.xcresult
/private/tmp/rivune-0609-final-tests.log

Final DIRECT_UPDATES target-only Release compilation succeeded (arm64 and x86_64); it was not launched or installed:
/private/tmp/rivune-direct-updates-final-compile.log

Final dormant Release build succeeded:
/private/tmp/rivune-0609-final-build.log
Its compiler invocation excludes DIRECT_UPDATES. The source/mirror/final freeze matched all70 native inputs. The earlier source/manifest in the review directory predates R1; use source-final/ and source-final-manifest.json.

Installed /Applications/Rivune.app version0.2 build2026090609, ad-hoc signed with deep strict verification. Account Enabled=false. SHA256 of installed Contents/MacOS/Rivune:
f544dd3ba777d1bbfbf085612edcb9a25c437b7f218bd6ed3dac5793b55275d4
Final source manifest SHA256:
f255337cdd02d3fbc568a8ba01a01f480c85f541cab3b804acf0ce05fc683780

Freeze/report evidence: /private/tmp/rivune-review-2026090609/source-final/, source-final-manifest.json, installation.json, rollback.json.
Previous0608 retained at /private/tmp/rivune-review-2026090609/Rivune-previous.app; rollback was not exercised. One replacement installation only. No DMG, public upload, notarization, account activation or live update cycle was performed.

Installed app opened successfully with startup at5%, the ring-and-stars logo description and native close/full-screen/minimize controls exposed. This installed smoke observation is separate from isolated account and updater fixtures.

Post-install startup completed at Home/Ready. Existing16-chat count and both named QA projects remained visible, with the composer empty and Send disabled. No account/Keychain prompt appeared during this smoke check. App left at Home for coordinator's separate Settings inspection; no live message was sent.
