# Desktop startup review — request changes

2026-09-10. Reviewed actual live main.rs SHA-256 `3294fceae48998eb73de91ffef271d3094003b6e09e4c1917ce4feb78fe03298`, matching implementation manifest, scoped delta, six startup and two Dock test logs. Code-review skill guided the startup/error-boundary inspection. Host locking is separately owned. No native compile/launch, process action or production edit performed.

## P1: setup failure is not a Builder::build failure

Pinned local Tauri 2.11.5 `src/app.rs:1422–1426` calls setup on RuntimeRunEvent::Ready inside make_run_event_loop_callback; an Err explicitly panics with Failed to setup app. Builder::build does not run the user setup closure. Main's new match on build(context), therefore, cannot observe the later contention flag or catch typed contention returned from setup. When contention occurs, admitted_startup_ui returns Err, Tauri wraps it in SetupError and then panics on Ready. The process has already entered the event loop. This contradicts the implementation receipt's clean-success/no-event-loop claim. The atomic workaround does not cross this lifecycle boundary.

The same issue affects setup-time invalid profile path, explicit window and tray failures: they still follow Tauri's panic path, not startup_failure_exit(false). Build-time failures are correctly mapped to FAILURE, but are a different phase. Native exit code/crash presentation has not been measured and must not be inferred from helper tests.

## Closed source aspects / preserved invariants

Effective generated-context windows are set create=false before build. Tauri app.rs:2524 filters configured windows by create before user setup; hence the deferred configuration prevents automatic Rivune windows. Typed contention rejects the initializer before managed state, explicit window or tray construction. That supports zero Rivune UI construction in this code path, but not graceful process termination.

Healthy and genuine recovery paths manage status/navigation/shutdown gate (and HostState only when available) before explicit main construction, then tray. Recovery disables Settings and marks NeedsAttention. Existing Dock and shutdown handlers are unchanged by the scoped delta; recovery remains reopenable and healthy completed shutdown remains suppressed. The first-window configuration assumption remains consistent with the current single-main configuration; extra configured windows are intentionally not constructed.

## Evidence limits and corrective route

Saved logs report six startup and two Dock tests passing. The admission tests actually exercise callback helpers and exit-policy booleans. They never invoke Tauri Ready/setup error handling and do not establish the atomic flag's delivery to build's error branch. This concrete source counterexample is sufficient to reject the claimed exit behavior without launching anything.

Builder must move expected contention handling to a boundary that can complete normally: either resolve/admit before event-loop entry using a supported path-resolution route, or treat contention as an explicit non-error setup outcome, request a controlled exit and guard every state-dependent event path while startup was not admitted. Do not merely return Ok without exit, which leaves a headless process. Do not call request_quit or ordinary ExitRequested handling with missing ShutdownGate/HostState. Genuine recovery remains admitted. Setup fatal failures need equally explicit failure-exit handling if graceful nonzero exit is required. Keep deferred windows and typed host classification; no IPC/dependency expansion needed.

Required focused evidence: test the actual integration boundary, including denied admission before managed state, exit event handling without managed state, no window/tray callback, and distinguish contention-success from fatal-failure. A raw startup_failure_exit(true) assertion is insufficient. Then builder may provide scoped compilation/test evidence; separately authorized OS double-invocation validation remains pending. No Dock activation/IPC acceptance is implied.

Verdict: request changes for exit orchestration; source UI suppression is sound within inspected wiring. Do not package/accept this as clean contention shutdown based on current helper results.
