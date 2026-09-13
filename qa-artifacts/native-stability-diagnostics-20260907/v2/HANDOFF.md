# Rivune native stability diagnostics and window recovery — build 2026090727, revision 2

Supersedes v1, which must not be installed. The v1 test host exposed an isolation flaw: lifecycle policy ran before the existing launch-context test detector became reliable, leaving an XCTest host alive and writing three content-free records to the normal Diagnostics folder. Root stopped that test process and removed only those test-created diagnostic files.

Revision 2 enables lifecycle recording and last-window persistence only when the app bundle runs from `/Applications/`, or through an explicit injected test seam. XCTest and other build-folder hosts terminate after their last window closes and cannot write real lifecycle diagnostics. A regression verifies this; after the focused and full suites, no test host remains and no real Diagnostics folder exists.

For the installed app, this candidate:
1. Explicitly stays running when its last window closes and restores the hidden Rivune workspace window on macOS reopen.
2. Stores a bounded 160-event, local, content-free lifecycle record: time, build, PID, session ID, controlled event kind, and controlled status. It never records prompts, answers, tokens, attachment paths, provider values, or credentials.
3. Uses per-PID markers. Dead prior markers retain their original build/PID/session. An unclosed marker is not crash proof; force quit or power loss also produces it.
4. Uses documented `NSWindow.didChangeOcclusionStateNotification` and `NSWindow.willCloseNotification`, filtered to the normal Rivune workspace window.

Evidence:
- 5 focused lifecycle/isolation/window tests pass.
- Full Mac suite: 331 passed, 0 failed, 0 skipped.
- Test host exits after each run; no real diagnostic folder is created.
- Mac Release and iOS Simulator Release pass. Additions are macOS-only.

The reported process exit remains unproven. Window recovery is a concrete fix for a disappearing window while the process lives; diagnostics narrow any future true process-exit investigation. No provider call, paid request, deployment, public release, or user-data migration occurred. Do not install until independent review accepts this exact v2 manifest and the authorized single restart is announced while Rivune is idle.
