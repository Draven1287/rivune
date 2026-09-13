# Updater recovery review

Date: September 6, 2026. Status: **source/fixture/compile follow-up closed; signed-runtime acceptance open**.

## R1 correction follow-up

The implementation owner subsequently corrected R1. Read-only inspection of
`RivuneApp.swift:35–47`, `RivunePendingInstall:118–126`, and updater recovery at
lines 269–275 confirms that rejected final termination now notifies the pending
installer. An invoking attempt resets its consumed handler/build generation
and retains a separate recovery action. Retry obtains fresh save admission;
an SDK-busy result preserves the recovery action. Once Sparkle permits another
check, Rivune requests a supported check and accepts a fresh same-build
continuation rather than reusing the consumed block. Generation checks also
cover synchronous replacement during recovery.

**R1 is addressed at source level; no remaining material source blocker was
found in this bounded follow-up.** This does not establish that Sparkle becomes
ready after every rejected termination; actual SDK ordering and recovery still
belong to two-signed-build acceptance.

`testRejectedFinalQuitRequestsSupportedRecoveryAndAcceptsSameBuildAgain` at
`RivuneTests/RivuneDeterministicTests.swift:3103` covers consumed old callback,
rejected final quit, SDK-busy retained retry, available recovery, fresh
same-build continuation and duplicate suppression. Final evidence was then
checked directly: `/private/tmp/rivune-0609-final-tests.log:480` records this
fixture passing, and line 512 records `TEST SUCCEEDED`.
`/private/tmp/rivune-direct-updates-final-compile.log:229` records
`BUILD SUCCEEDED` for the updated direct-updater compilation. The requesting
audit task independently reports 224 passed / 0 failed / 0 skipped from the
16-53-56 xcresult; that aggregate was not independently re-extracted by this
reviewer. The earlier seven-fixture results below remain historical evidence.

This closes the bounded source/fixture/compile review. No tests/builds were
rerun by the reviewer. No updater-related reason to hold a dormant local
Release install was identified; the implementation owner retains build/install
responsibility. Actual Sparkle recovery and every two-signed-build acceptance
case remain unproven by these logs.

## Follow-up review of 0609 candidate

This section supersedes the original finding statuses below. The original
descriptions are retained as the baseline checklist, not current unfixed claims.
Only this document was changed during follow-up. No build/test was rerun and
no application was launched or installed.

| Finding | Current source assessment |
| --- | --- |
| U1 | Addressed in source: `RivuneTerminationDelegate` at `RivuneApp.swift:33–47` checks fresh save admission for ordinary and updater quit. `willInstallUpdateOnQuit` at lines 330–334 preserves Sparkle scheduling and relies on that gate. Runtime delegate ordering remains unverified. |
| U2 | Addressed in source: `RivunePendingInstall` retains blocked callbacks, exposes retry/pause, and cancels obsolete generations. Final-termination rejection recovery (R1) is also closed at source/fixture/compile level; see the correction follow-up above. Actual signed-runtime recovery remains unverified. |
| U3 | Addressed in source: typed error classification at lines 110–118 and Sparkle mapping at 305–307 distinguish cancellation/no update from generic failure. |
| U4 | Addressed in source: attempt record at lines 121–152 consumes/reconciles stale state; begin replaces absent notes; abort/error cleanup at 314–320 clears pending state; startup message says “Now running” at 284–285. Actual signed lifecycle remains open. |

### R1 — original P1 recovery case (subsequently addressed in source above)

`RivuneApp.swift:91–93` clears the retained handler and enters `.invoking`
before calling the installer. The real termination delegate at lines 37–44
then obtains a fresh admission and can reject quit if work started or a save
began failing after the earlier check. This protects work, but the pending
installer cannot retry: `canRetry` requires the now-cleared handler (line 67),
and `begin` ignores the same build (line 71). The rejection branch does not
coordinate a reset or new continuation with the pending installer.

This is a source-level recovery gap, not a demonstrated signed-runtime hang.
Sparkle's exact behavior after rejected termination still needs runtime proof.
Minimal correction: coordinate rejected final termination with an
SDK-supported retry/new continuation, and distinguish duplicate delivery from
a fresh attempt for the same build. Do not blindly invoke an already-consumed
one-shot callback. Retain the fresh termination check; no cached save success
may authorize quitting later.

Add **F16**: first admission succeeds; installer requests termination; final
admission rejects for new active work or failed save; after recovery, the same
build can be retried exactly once without discarding work. Include a repeated
delegate callback and an abort/cancel variant. This case is not covered by the
existing fixture that intentionally ignores duplicate same-build delivery
after `.invoking`.

The pending check, state transition and callback run synchronously on the main
actor. There is no demonstrated interleaving inside that segment. The final
termination gate also checks again, so this review does not claim that an
intervening new run is terminated unsafely; R1 concerns recovery after the gate
correctly refuses termination.

### Evidence inspected, not executed by this reviewer

- `/private/tmp/rivune-0609-tests.log` contains `TEST SUCCEEDED` and seven named
  passing `UpdateAdmissionLifecycleTests`: independent save failures, fresh
  quit admission, retained callback retry, pause/supersession, pause/resume,
  record/notes reconciliation, and error classification.
- `RivuneTests/RivuneDeterministicTests.swift:3024–3128` implements these
  injected lifecycle fixtures. They exercise the helper, not an actual
  Sparkle installer or AppKit termination sequence.
- `/private/tmp/rivune-direct-updates-target-compile.log` contains
  `BUILD SUCCEEDED`. Compilation does not prove callback ordering or updates.
- `RivuneStore.swift:183–197` uses the shared admission evaluator; isolated
  mode still bypasses real history/project writes. The independent injected
  save-result fixture improves failure coverage, not real multi-store upgrade
  coverage.
- Local builds still compile the dormant updater implementation. No new
  dormant-path defect was found; zero-network runtime measurement remains open.

F01–F15 below are not collectively closed by these seven fixtures. In
particular real termination wiring, final work admission/recovery, complete
multi-store restoration, and every two-signed-build case remain unverified.
R1 was sent immediately to the implementation owner and requesting audit task.

This is the stable checklist for the next bounded updater fix, after the
implementation owner's account-cancellation work. Documentation only: this
review did not edit production code, run tests, launch/install an app, access
signing credentials, or publish anything. Line numbers describe the reviewed
snapshot and may move; use the named symbols when implementing.

## Evidence boundary

- **Source inspection:** `RivuneSoftwareUpdates` in `Rivune/RivuneApp.swift`,
  `prepareForUpdate` and draft/history storage in `Rivune/RivuneStore.swift`,
  and `RivuneProjectStorage` in `Rivune/ProjectWorkspace.swift`.
- **Existing fixture source inspected, not rerun:** draft recreation at
  `RivuneTests/RivuneDeterministicTests.swift:2778` and refusal to overwrite an
  unreadable/future-schema project library at
  `RivuneTests/ProjectWorkspaceTests.swift:272`.
- **Live upgrade acceptance: not performed.** Neither those fixtures nor the
  signature test described in [Software Updates](SOFTWARE_UPDATES.md) proves a
  working download/install/relaunch between two provisioned signed builds.

## Findings and minimal corrections

### U1 — P1: install-on-quit bypasses the relaunch-only save gate

At `RivuneApp.swift:137–147`, `shouldPostponeRelaunchForUpdate` is the only
updater call to `prepareForUpdate`. Automatic downloads are exposed at line
178, but this implementation has no application-termination save gate.
Sparkle documents that the postponement delegate may not run when the app is
not relaunching; a scheduled install-on-quit attempts installation on termination.
Consequently the documented active-run/save protection does not cover every
termination path.

Minimal correction: share a termination-admission gate across ordinary quit
and updater termination. Defer or cancel termination while work is active or
saving fails. Authorize termination only after a successful flush and prevent
new run admission during the final handoff. Avoid delegate recursion and ensure
every pending termination reply is resolved once. Do not rely solely on the
relaunch delegate or assume a notification after termination can veto it.

### U2 — P1: failed save loses the deferred installation continuation

At `RivuneApp.swift:142`, a failed `prepareForUpdate` exits the only task holding
`installHandler`, while the delegate returns `true` at line 147. Sparkle is
waiting for the handler; Rivune retains no pending callback and exposes no
save/install retry. The missing-store branch at line 138 also returns `true`
without a resumption path. A transient failure can therefore leave an
indefinitely paused installation.

Minimal correction: retain one pending install context, its callback and a
save-blocked state. Expose a retry that flushes again and invokes the callback
once. Provide an SDK-compatible cancel/reset path; do not invoke installation
merely to unblock the UI after a failed save. Handle missing store explicitly.
Own the waiting task and use cancellation plus an attempt/generation guard so
abandoned or superseded work cannot invoke a stale callback. The current task
at lines 140–146 has neither ownership nor a cancellation check, and `try?`
discards sleep cancellation.

### U3 — P2: cancellation and no-update results look like network failure

At `RivuneApp.swift:133–135`, every non-nil update-cycle error produces an
instruction to try again online. Sparkle explicitly lists `SUNoUpdateError`
and `SUInstallationCanceledError` as possible results of this delegate.
Neither result establishes a connectivity problem.

Minimal correction: classify typed Sparkle outcomes into up-to-date,
installation-canceled, and actual failure states. Keep unknown errors sanitized
and actionable; do not guess that all errors are offline failures.

### U4 — P2: aborted updates leave stale version and release-note state

At `RivuneApp.swift:143–144`, expected-build and release-note values are written
before installation is invoked. Lines 111–114 consume the expected build only
on an exact match; update-cycle completion does not reconcile cancellation or
failure. An aborted attempt followed by a manual installation of that build
can display a success notice attributed to the pending update. If a later
item has no release-note URL, the previous item's URL remains visible.

Minimal correction: persist a pending attempt with source/target build and an
attempt identifier. Clear or reconcile known failures, cancellations,
superseded attempts and rollback/mismatched startup. Update or remove release
notes per item. For an ambiguous manually recovered installation, say “Now
running version …” instead of claiming an automatically completed upgrade.
Do not clear legitimate install-on-quit state merely because an update-check
cycle finished; reconcile using the actual lifecycle outcome.

## Existing safeguards to preserve

- `RivuneStore.swift:184–190` rejects active runs, unavailable project storage
  state, and reported draft/history/project write failures.
- `ProjectWorkspace.swift:760–765` uses atomic writes and propagates failures.
  No separate corruption bug was established in that save method.
- The local-build branch at `RivuneApp.swift:151–166` does not start Sparkle.
  The direct-update branch checks distribution/feed/key/signature at lines
  95–101. This is source evidence, not a measured no-network claim.
- `RivuneStore.swift:470` includes local generation, remote generation,
  coordinator runs, and provider-connection saving in its busy check.

## Deterministic acceptance cases — not yet executed by this review

Use an injectable lifecycle controller with fake installer, manual scheduler,
isolated defaults and independent draft/history/project save results. Count
callback invocations and termination decisions. Do not enable production
Sparkle or use real user storage to exercise these cases.

| ID | Scenario | Required result |
| --- | --- | --- |
| F01 | Relaunch requested during local, paired-device, or coordinator work | No install/termination callback until work ends and all saves succeed. |
| F02 | Install-on-quit or ordinary quit during active work | Shared gate defers/cancels termination; no bypass of the save barrier. |
| F03 | Draft, history, then project save each fails independently | Installation stays blocked, reason/retry visible; no success notice. |
| F04 | Transient save failure repaired, then Retry | All required stores flush again; retained install callback runs exactly once. |
| F05 | Cancel/supersede while waiting, then old task finishes | Old callback never runs; new attempt remains independent. |
| F06 | Duplicate install/delegate/retry events | One owned pending attempt and at most one authorized invocation. |
| F07 | Missing store when delegate is called | Explicit recoverable state, not an orphaned deferred handler. |
| F08 | New run submitted during final termination handoff | Admission rejected or deferred; no work starts behind a completed save barrier. |
| F09 | No-update, canceled authorization, and real network failure | Distinct truthful statuses; only network failure suggests reconnecting. |
| F10 | Successful target build starts twice | Appropriate version notice once, pending marker consumed. |
| F11 | Abort/cancel, rollback, superseding update, or manual target install | Pending marker reconciled; no unsupported automatic-success claim. |
| F12 | Next item has no release-note URL | Old notes are removed, not relabeled as current. |
| F13 | Recreate store after successful flush | Draft text/attachments, history and projects restored from isolated stores. |
| F14 | Future-schema/unreadable project library | Termination blocked and original bytes preserved. |
| F15 | Local/isolated/invalid distribution configuration | Updater factory/network spy records zero starts or requests. |

The existing draft fixture reaches the isolated early return at
`RivuneStore.swift:185`, before history/project flush. It is useful draft
coverage, but not successful multi-store update-flush coverage. Add isolated
save seams rather than weakening production isolation to expand this test.

## Two signed-build upgrade acceptance — remains open

This requires separately authorized release credentials and two appropriately
signed/notarized builds A and B. A fixture, successful compilation, or a valid
archive signature alone cannot close these checks.

- [ ] Record exact A/B versions, bundle/team identities, hashes and test machine.
- [ ] Exercise actual discovery, download, verification, installation and B relaunch.
- [ ] Defer installation while local and paired-device work is active.
- [ ] Exercise install-on-quit as well as interactive install-and-relaunch.
- [ ] Cause a controlled save failure; verify installation is blocked and retry
      succeeds after repair without losing user work.
- [ ] Cancel download and installation authorization; verify truthful status and
      no later abandoned attempt installing unexpectedly.
- [ ] Verify draft text/attachments, history, project instructions/file references
      and selected conversation after relaunch; originals remain untouched.
- [ ] Verify once-only version notice and matching release notes, including an
      item without notes and failed/rolled-back installation recovery.
- [ ] Exercise offline/unavailable feed, interrupted download and rejected
      signature without weakening validation or corrupting installed A.
- [ ] Measure that a dormant local build makes no update-feed request.

For each case record source revision/build, fixture versus signed-runtime
evidence, expected/actual behavior and a redacted artifact. Leave unperformed
cases open. No publication or feed activation is implied by this checklist.

## Reference

[Sparkle 2.9.6 SPUUpdaterDelegate contract](https://sparkle-project.org/documentation/api-reference/Protocols/SPUUpdaterDelegate.html):
`shouldPostponeRelaunchForUpdate`, `willInstallUpdateOnQuit`, and
`didFinishUpdateCycleForUpdateCheck`. Checked during the source review.
