# Connection setup follow-up

September 5, 2026. Local source and preview; not published or installed over the user's Mac app.

## Changes

- Replaced the improvised Apple sign-in silhouette with Apple's public website asset, recorded in `NOTICE`.
- Centered the setup card below 1150px, aligned the wide layout at the top, and corrected inherited spacing. The same silver ribbon R now appears in setup, the local account avatar, and the pairing dialog.
- Added a shared CLI/API connection manager in startup and Settings. API opens provider, password key, exact model ID, and Save & check controls. CLI opens defaults, installed-tool discovery, and manual executable registration.
- Added authenticated local settings endpoints, safe metadata parsing, Keychain-backed API saving, write locks during active work, and read-only executable discovery. CLI sign-in and API key removal remain available in native settings.
- Updated pairing and privacy copy to explain what browser access authorizes and where credentials are stored.

## Verification

| Check | Result |
|---|---|
| Mac XCTest | 161 passed, 0 failed, 0 skipped |
| Generic iOS simulator build | Passed |
| Web workspace, preferences, connection, and account tests | 39 passed |
| Web ESLint, TypeScript, production build | Passed |

Mac tests: `/private/tmp/rivune-connection-settings-tests.log`; result bundle: `/private/tmp/rivune-space-mac-build/Logs/Test/Test-Rivune Mac-2026.09.05_16-39-56--0600.xcresult`. iOS build: `/private/tmp/rivune-connections-ios-build.log`. Web build: `/private/tmp/rivune-connections-web-build.log`.

New native tests use injected in-memory credentials and temporary executable fixtures. They verify no key in responses or defaults, validation before saving, active-work rejection, isolation from live Keychain, discovery without execution, and preservation of the draft, mode, and captured route. HTTP parser coverage includes the exact authenticated settings paths and methods. Web tests reject malformed/secret-bearing metadata and invalid API fields.

## Rendered checks

Used the actual unpaired local preview and a separate hidden tab paired to a fictional memory-only loopback server. No real API key, CLI login, provider request, cloud account, or Keychain write was used in browser QA.

- At CSS 893×789, account setup is centered and the Apple icon is white and readable; connection setup uses the same alignment and silver mark.
- At CSS 1024×576, setup and Settings expose the same CLI/API forms. Long forms scroll within the app.
- At CSS 312×675, Settings and its connection forms remain inside the viewport; document scroll width is 312px.
- A simulated API save clears the key field and displays saved-key metadata. Switching from API to CLI and back also leaves the password field empty.
- Simulated additional CLI discovery and manual registration appear with **Adapter needed**; defaults use reported CLI sign-in status.
- A typed draft survives opening Settings, visiting both connection tabs, and returning to the workspace.

## Current scope

Execution support remains Codex CLI, Claude Code CLI, OpenAI Responses API, and Anthropic Messages API. Additional executable discovery does not create a runtime adapter. Routing remains ready CLI first, API fallback. Google, Apple, and email account sign-in still need owner-controlled authentication configuration. The native backend was built and tested in isolation; normal native presentation and live provider access were not exercised in this pass.
