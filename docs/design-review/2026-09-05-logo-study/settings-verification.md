# Settings verification

September 5, 2026. Local source and preview only.

This records the original settings pass. The later [connection setup pass](connection-setup-verification.md) adds browser API-key configuration, CLI inventory, and updated verification totals; it supersedes the browser-management limitation below.

## Implemented

- Eight searchable settings sections on web and native.
- Unified native provider cards with real CLI setup and API Keychain configuration.
- Browser provider catalog and active CLI/API state supplied by the Mac.
- Models and reasoning follow the active route; a transport change clears browser overrides for future requests.
- Authenticated browser navigation to fixed native settings destinations.
- Local browser stars, galaxy, text-size, reduced-motion, and send-shortcut preferences.
- Native local history export with a preservation test.
- Corrected local HTTP routing for the browser readiness check.

## Checks

| Check | Result |
|---|---|
| Mac XCTest | 157 passed, 0 failed, 0 skipped |
| Generic iOS simulator build | Passed |
| Web contract, preferences, account tests | 36 passed |
| Full web ESLint and TypeScript | Passed |
| Web production build | Passed |
| Source/preview web files | Agent compared ten owned files byte-for-byte |

Native logs: `/private/tmp/rivune-native-settings-mac-tests.log`, `/private/tmp/rivune-native-settings-ios-build.log`. Mac xcresult: `/private/tmp/rivune-space-mac-build/Logs/Test/Test-Rivune Mac-2026.09.05_15-34-04--0600.xcresult`.

## Rendered browser inspection

Used a hidden browser tab at `http://localhost:3187/workspace` with a fictional memory-only loopback fixture. The fixture reports a ChatGPT CLI route, a Claude API route, and an unsupported API-only provider. No model, provider login, auth email, or native app was invoked.

- Inspected Settings at CSS 893×789, 819×461, 312×675, and 1536×864. Navigation adapts to a horizontal category strip in narrow views. Mobile document scroll width was 312px, equal to the viewport.
- Inspected General, Account, AI Connections, Appearance, and Data & privacy. Larger text remained readable in compact/mobile layouts.
- Verified CLI/API setup guidance is visible before Mac pairing.
- Paired fixture displayed correct active CLI/API badges, model values, and provider marks.
- Changed the fixture from ChatGPT CLI to API while the model dialog was open. It changed to the configured API model with disabled provider-managed reasoning. Sidebar and connection card updated, and the old CLI override was cleared.
- Open connection settings generated exactly the fixed `connections` navigation action in the fixture. This is UI request verification; native presentation was covered by isolated tests, not a normal app launch.
- Unsupported API-only catalog entry appeared with its own name and a “Not supported yet” label. It did not become a selectable chat mode.
- Search for “API” found AI Connections. A nonsense query produced a clear empty state and recoverable Clear search action.
- Stars, galaxy, larger text, and reduced motion updated rendered styles. Preferences survived a development refresh.
- A typed draft survived opening Settings, visiting privacy, and returning to the workspace. With the modifier-enter preference, Enter inserted a newline.
- Restored default stars/galaxy, System motion, Standard text, and Enter shortcut through the UI after testing. Reset the test viewport.

## Remaining boundaries

Provider metadata is extensible; execution adapters remain Codex CLI, Claude Code CLI, OpenAI Responses API, and Anthropic Messages API. Account sign-in still requires owner configuration; native account sign-in is not connected. Browser connection management opens native settings, where keys remain in Keychain. Cloud history synchronization is not implemented. This change was not published or installed over the user’s native app.

See [settings behavior and references](../../SETTINGS_AND_PROVIDER_CONNECTIONS.md).
