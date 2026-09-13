# Rivune premium interface pass

Superseded visually by [SCREENSHOT_UI_MATCH.md](SCREENSHOT_UI_MATCH.md), following the user's request to match the four supplied AnythingLLM screens closely. This page records the earlier pass and its validation.

September 5, 2026. Local development build; changes are uncommitted.

## Test this build

- Native: `/Users/Aaravshah/Applications/Rivune Premium.app`.
- Browser: `http://localhost:3187/workspace` (development server).

Quit other normal Rivune instances before opening Premium: these builds use the same bundle ID and local history. Earlier installed builds are preserved. Choose **Connections** to review setup; the stepper can revisit Welcome and Account. First-time users start at Welcome; users who already completed setup land directly on Connections.

## Interface changes

LobeHub's compact navigation and task-oriented home, and AnythingLLM's focused startup presentation, informed the layout. Rivune retains its silver emblem and its own typography, graphite surfaces, and restrained lavender accents.

- Native Home places the composer near the heading with real provider readiness, short starter prompts, and recent conversation cards. Conversations retain the bottom composer. Only one composer is mounted at a time.
- The sidebar has clearer Home and Project actions, compact conversation rows, and distinct original provider marks. Codex uses angular woven forms; Claude uses a soft folded form. These are Rivune interface emblems, not official provider logos.
- Welcome → Account → Connections introduces the product and separates Rivune identity from model access. Installed CLI and API key have distinct selectable cards. A detected, ready CLI is recommended for setup convenience.
- Google sign-in remains explicitly unconfigured. API execution remains unavailable; its panel explains access without accepting or storing keys. The local development fallback does not create a cloud account.
- The web workspace has Home and a searchable Conversations library, the same provider emblems, and real recent-work records after pairing. Disconnected providers say “Not checked.” Selecting one opens the Mac connection dialog.

Connection method does not establish answer quality. A CLI uses its configured authentication and provider limits. API use has its own account/billing relationship. Relevant official references: [Claude Code authentication](https://code.claude.com/docs/en/authentication), [Claude Code API-key environment variables](https://support.claude.com/en/articles/12304248-manage-api-key-environment-variables-in-claude-code), and [OpenAI Codex sign-in](https://help.openai.com/en/articles/11381614-api-codex-cli-and-sign-in-with-chatgpt).

## Validation and limits

- Mac: **115 tests passed, zero failures** on the final native source. The tests use deterministic provider runners; no paid model request was made.
- Generic iOS Simulator build succeeded. Build warnings were limited to expected App Intents metadata extraction. Hosted tests also logged macOS shortcut-service connection noise, without test failures.
- Website: **7 contract tests passed**, lint and TypeScript passed, and the final production build succeeded. Vinext printed informational route-classification notices for `/` and `/workspace`.
- Browser visual checks covered Home, new provider marks, disabled send while disconnected, starter prompt filling, direct/team selection, Connections dialog, and navigation to the Conversations library. The test draft was cleared and the page returned to Home.
- Native visual testing remains pending. Automatic approval review previously rejected launching the ad-hoc native preview because executing a locally built app required action-time confirmation. No alternate launch method was used. Premium is packaged, not launched by the agent.
- No claim is made of Google auth, API execution, cloud synchronization, or a production release. The local bridge and project workflow retain their existing boundaries in `CONNECTED_WORKSPACE_BUILD.md`.

Package signature verified with `codesign --verify --deep --strict`; the generated copy excludes the XCTest plugin. Executable SHA-256: `70f6f8babe241c213ff0fcc5a828dda8379b13fb1bc00aba47ce96cb3132532f`.

Native evidence: `/private/tmp/rivune-premium-tests.log`, `/private/tmp/rivune-premium-ios.log`.

Web evidence: `/private/tmp/rivune-web-final-contract-tests.log`, `/private/tmp/rivune-web-final-production-build.log`.
