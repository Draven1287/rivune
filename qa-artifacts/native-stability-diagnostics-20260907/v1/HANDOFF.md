# Rivune native stability diagnostics and window recovery — build 2026090727

The user's reported process exit could not be reproduced or attributed. Installed build 2026090725 had no recent crash report, no available crash/exit/kill event, no direct app-owned quit call, and no active updater configuration. The post-report process ran continuously; the later computer shutdown was user initiated.

This candidate adds two bounded changes on the exact 0725 source baseline:

1. AppKit explicitly keeps Rivune running when its last window closes and restores the hidden Rivune workspace window when macOS sends a reopen request.
2. A local, content-free, 160-event lifecycle record stores only time, build, PID, session ID, controlled event kind, and controlled status detail. Per-PID markers distinguish an orderly quit from a session that did not reach `applicationWillTerminate`. An unclosed marker is not proof of a crash; force quit, power loss, and test interruption can create it too. No prompts, answers, tokens, attachment paths, provider values, or credentials are recorded.

Marker ownership is per PID. One session cannot delete another session's marker. Dead prior markers retain their original build, PID, and session ID. Window notifications use documented `NSWindow.didChangeOcclusionStateNotification` and `NSWindow.willCloseNotification` and filter to the normal Rivune workspace window.

Verification:
- 4 focused lifecycle/window tests pass, including the production app-delegate reopen callback through an injected recovery seam.
- Full Mac native suite: 330 passed, 0 failed, 0 skipped.
- Mac Release build passes.
- iOS Simulator Release build passes; lifecycle additions are macOS-only.

Scope and limitation:
- The window recovery is a concrete repair for a closed/hidden workspace while the process remains alive.
- The diagnostics improve the next exact process-exit investigation. They do not prove or fix an unobserved process crash.
- No provider call, paid request, public release, deployment, or user-data migration occurred.
- Do not install until independent source review accepts this exact manifest and the single replacement restart is announced while the app is idle.
