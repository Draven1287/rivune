# Independent terminal process cleanup review

**BOUNDED ACCEPT of this one-file candidate.** The early-input-error cleanup and descriptor-local SIGPIPE changes close the reproduced defects. No new P1/P2 was found in the delta. This review proves bounded direct-child lifecycle behavior in local fixtures, not provider integration or descendant process-tree termination.

## Exact candidate and reconstruction

Verified every entry of the frozen MANIFEST.json at `/private/tmp/rivune-terminal-cleanup-v1-jd7110os`. Baseline source is `884d1af71174edf0a8bc3955fa8d4f82f75f177d9e561a1e3ac183516f0f7cd9`; candidate is `85a22a69dc96bbb61e61ca24b5754797cb9af79fb12f9b3174bca4ca713df30c`; patch is `f4816301c52fd2d7d38d36af3f13eca3d528a17e0eaa8824e73920868c598f6f`.

Applied the patch to an isolated copy of the verified baseline and compared the resulting file byte for byte with the frozen candidate. Independently confirmed the complete TerminalProcessJob class in all four supplied probes exactly matches the relevant baseline/candidate class, excluding only the enclosing platform compilation guard. The provider/error/output carrier types remain documented synthetic stubs. Frozen files were not changed.

## Independently executed evidence

Compiled each probe with Swift 6 and no compiler warnings, then ran the finite local fixtures:

- BaselineProbe exits 10: when SIGPIPE is ignored by the harness, the write error returns while the directly owned child remains alive. The fixture then terminates that recorded child.
- BaselineDefaultSignalProbe exits -13: the harness terminates from SIGPIPE. Its directly owned sleep has a finite three-second lifetime.
- CandidateProbe exits 0 under default signal handling: the write error returns after the directly owned child has exited.
- ProcessRegressions passes all eight supplied cases: Unicode success, nil-input EOF, nonzero/stderr output, launch error, output bound, timeout, cancellation and closed stdin.

Added three independent adjacent cases using a small C fixture that ignores SIGINT and SIGTERM and has a five-second alarm as a hard natural bound. The candidate must escalate and reap it in under 3.5 seconds, before returning:

1. Closed stdin with a one-megabyte write returns an ordinary write error after cleanup.
2. Blocked one-megabyte stdin write with a 100ms timeout returns the typed timedOut error after cleanup.
3. Blocked one-megabyte stdin write with task cancellation returns CancellationError after cleanup.

All three pass, including direct-PID liveness checks. The Swift harness and C fixture are retained in `independent-evidence/`; probes used only disposable fixture directories, their owned child processes and temporary compiler outputs. The isolated test copy is `/private/tmp/rivune-process-independent-41443t8c`.

## Source reasoning

F_SETNOSIGPIPE is set only on this request's owned input write descriptor before launch, without changing the application's process-wide signal disposition. Failure to configure it returns before starting a child.

The post-launch defer executes before the older descriptor-close and output-directory cleanup defers. If an error escapes while the direct Process is still running, it invokes the existing cancellation escalation, closes the input writer and waits for exit before resource cleanup or return. The asynchronous escalation holds a weak job reference, but the executing job remains retained through this wait. Existing guarded PID/process checks remain in place. Normal completion already waits for exit, so the new defer does not cancel successful completed work or change returned stdout/stderr/status.

The independently run resistant-child cases exercise SIGKILL escalation as well as cancellation/timeout while input writing is blocked; they are stronger evidence than a sleep that immediately responds to SIGINT. No process-wide SIGPIPE suppression was needed in candidate runs.

## Scope and remaining checks

A full native compile/test run is still required after the native owner integrates this exact delta against a matching baseline. No provider executable, account, credential, network, private project, UI, shared source or installation was used or changed. These probes do not establish child-process-group cleanup, descendant inheritance behavior, session reuse, output streaming, provider parity or live cancellation guarantees. Those boundaries are retained rather than inferred from direct-process tests.
