# First-launch acceptance script

## Boundary

- Candidate: `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2`
- Renderer state tests: synthetic host only, with zero provider calls.
- Rust wire fixture: real serde serialization from the source-bound field contract, isolated from host runtime behavior.
- Tauri app launch and packaged IPC: not performed in this package.
- Import preview: review-only; never commit, dispatch, or relabel imported work.

## User-visible scenarios

| Case | Reproduction | Required visible behavior |
|---|---|---|
| Empty | Open with no conversations and no provider; hold the initial snapshot briefly. | Announce “Connecting…” while loading; disable message entry and Send; then explain how to start a conversation without calling the state connected. |
| No provider | Open one conversation with no selected provider. | Keep the conversation available, state that provider setup is required, and keep Send disabled. Do not say connected. |
| Invalid provider | Expand Local provider, enter `relative/provider`, and choose Connect locally. | Reject the configuration, remain unconnected, and tell the user an absolute executable path is required. |
| Save failure | Type a draft while synthetic persistence returns `permission denied writing snapshot`. | Keep the draft visible, announce that it was not saved, and give a useful recovery action. Do not expose only the raw storage error or throw an unhandled rejection. |
| Retry | Open a failed task and choose Retry task. | Admit exactly one retry from the original context, show the replacement task state, and avoid claiming a provider connection succeeded. |
| Cancel | Open a running task and choose Stop. | Send one cancellation, show the task as cancelled, and remove Stop after cancellation. |
| Import preview | Open first launch with legacy data available. | Require explicit source choice, show counts/warnings before commit, keep original bytes recoverable, and make no provider request. The current renderer has no import-preview surface, so this case remains blocked. |
| Unsupported mode | Present a synthetic imported Council draft while only single-AI chat is supported. | Identify Council as unavailable, preserve the draft/history for review, and never relabel or dispatch it. The current renderer has no unsupported-mode surface, so this case remains blocked. |

## Keyboard, focus, contrast, and errors

For every fixture, the harness focuses New conversation and requires the existing 3px focus indicator. It also requires the connection/error region to retain `role="status"` and records renderer errors. Manual launched-window review should Tab through New conversation, conversation choices, Retry host, Local provider, its fields, message entry, recovery controls, and Send; focus must remain visible and follow reading order.

The current source uses high-contrast dark surfaces and a light blue focus ring, but packaged-window contrast remains a rendered acceptance check. Verify warning text, disabled controls, placeholder text, and focus at default appearance and increased contrast. Error copy must name what failed, preserve user work, and tell the user what to do next.

## Required launched-window IPC gate

This gate is blocked until the runtime owner provides a build that compiles and can be launched with an isolated profile. The configured CSP currently includes `connect-src 'none'`; that is only a potential IPC blocker until reproduced in the packaged WebView.

From the launched Tauri window, with developer diagnostics capturing command names and results but no credentials:

1. Confirm the effective packaged CSP equals the reviewed policy and record any WebView CSP violation.
2. Call `get_snapshot`; require a schema-v1 response using the Rust-produced `selectedProviderID`, `conversationID`, and `requestID` field spellings where applicable.
3. Call `create_conversation` with a new synthetic ID/title; require one persisted conversation and no provider call.
4. Call `save_draft` for that conversation, restart with the same isolated profile, and require the exact draft to return.
5. Call `configure_provider` with an invalid relative path; require rejection and no selected provider.
6. Only in a separate test-fixture build, configure a fixture adapter. Do not use a real provider account or present the fixture as connected production behavior.
7. Record whether all four calls crossed `window.__TAURI__.core.invoke`. A browser-host mock is insufficient.

Acceptance remains blocked if the app fails to compile or launch, CSP behavior is unknown, any invoke name/argument casing mismatches Rust, persistence does not survive restart, or a missing provider is labeled connected.

