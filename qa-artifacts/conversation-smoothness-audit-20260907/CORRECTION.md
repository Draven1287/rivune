# Correction — composer focus restoration

Date: 2026-09-07

The P2 claim in `AUDIT.md` that Settings return and new-conversation focus requests have no production consumer is retracted.

The accepted frozen 0623 source and the shared source both contain the implementation in `Rivune/Components.swift`, SHA-256 `e920757f668ab2a8b08a52ad721cbcba98410e8a6fb8826dc5f40bd5b3532dc4`:

- `composerFocused` is declared and bound to the composer at line 1791.
- `.task(id: store.newConversationFocusRequest)` consumes new-conversation focus requests at line 1889.
- `.onChange(of: store.workspaceReturnFocusRevision)` restores composer focus and caret position after Settings at line 1941.

The earlier search was incorrectly limited to `WorkspaceView.swift`, `WelcomeView.swift`, `RootView.swift` and `SettingsView.swift`; it omitted `Components.swift`, which owns `ComposerView`. The state-level Settings test and production focus wiring are consistent. No focus fix is needed, and none was made.

The scroll-policy reproduction, isolated candidate and test results are unaffected. `AUDIT.md` and `source-manifest.json` remain byte-for-byte frozen so this correction is explicit and reviewable rather than silently rewriting the original receipt.

