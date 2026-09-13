# Saved result inspection and reuse

Requirement: the result workflow must let users inspect and copy the specific saved response they selected. The native React transcript previously rendered text without a result action. Direct/lead answers and saved Constellation contributions now expose Inspect. Non-completed answers are labeled partial; host-shortened member contributions retain that label.

A read-only dialog captures exact text and its label when opened, preserving whitespace/code and avoiding latest-run lookups. No HTML, generated code, embedded resources or remote links are executed. Copy writes the captured text only on an explicit click. Failure never claims success: the text is selected for manual copying. Select all is independently available. Escape and Close return focus to the opener. A stale clipboard completion cannot update another opened result; unmount invalidates it. Clipboard writes already handed to the OS cannot be cancelled.

Four pure copy-session tests cover exact text, denial/retry, duplicate pending clicks and stale completion. TypeScript verifies integration. Actual browser/native rendering, clipboard permission behavior and keyboard/focus inspection remain unverified in this no-launch slice. No native bridge, provider invocation, persistence or installed app changes are introduced.
