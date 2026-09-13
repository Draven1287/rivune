# Settings and AI connections

Date: September 5, 2026

## Product structure

Settings separates three different connections: a Rivune account identifies a person, an AI connection determines where a request runs, and device pairing authorizes access to a local Mac workspace. Signing into one does not sign into the others.

The navigation groups Account, General, AI Connections, Models & reasoning, Appearance, Data & privacy, Devices, and About. Search should find the relevant category by its controls, not only by the category title. Returning to the workspace must retain the current conversation, draft, and in-flight request.

Use the established black glass surfaces, restrained blue highlights, silver provider marks, thin separators, and generous row spacing. Settings is a reading surface: keep stars outside the text column and avoid animating controls. Every editable control needs a visible saved value and keyboard access. Disabled actions explain their prerequisite; unsupported features do not appear as working toggles.

## Connection behavior

| State | What the interface shows |
|---|---|
| Ready CLI | Active CLI name and sign-in state, supported models and reasoning controls |
| Ready API | Active API name, configured model, API key status, provider-managed reasoning where adjustable reasoning is not implemented |
| Both ready | Automatic selection: ready CLI first, API as fallback |
| Checking | Checking state; no ready badge or new sends based on an old result |
| Neither ready | Relevant sign-in/key/model error and a connection setup action |
| Mac offline | Last-known data is labeled; connection actions require pairing/reconnection |
| Registered provider without execution adapter | Catalog entry with unsupported status; not selectable for a chat |

The Mac remains authoritative for the active route and supported controls. The browser renders provider metadata rather than assuming every provider has the same settings. An API-only provider does not acquire a CLI row by convention. Provider discovery does not confer execution support.

Current execution adapters are Codex CLI, Claude Code CLI, OpenAI Responses API, and Anthropic Messages API. The catalog can describe other providers, but each new executable integration still needs an adapter, capability mapping, readiness checks, and tests. The current two-provider chat mode and saved-history identifiers stay compatible.

Changing readiness may change the route for the next request. A running request retains its captured route. Browser model overrides must be checked against the latest active transport and supported model/effort combinations before submission.

### Browser contract

`schemaVersion: 1` gains an optional `providerCatalog` array. Each entry has a stable ID, display title, transport list, optional active transport ID, and `selectionPolicy: "automatic"`. Each transport describes its kind, supported status, readiness, active state, and whether model settings exist. Credentials, executable paths, authentication commands, and custom endpoint URLs are excluded. Existing snapshots still work through a conservative fallback from their reported connections.

`capabilities.settingsNavigation` advertises `POST /v1/settings/open`. The body contains a fixed section name: `account`, `connections`, `models`, `privacy`, or `devices`. The local server checks its existing allowed-origin and bearer-token boundary and does not interpret URLs or shell commands. A successful response presents native settings without changing the conversation or execution configuration. The readiness POST is also explicitly accepted by the local HTTP router.

`capabilities.connectionManagement` enables the shared connection form in setup and Settings:

| Endpoint | Method | Behavior |
|---|---|---|
| `/v1/connections` | GET | Read CLI inventory and safe API configuration metadata |
| `/v1/connections/scan` | POST | Refresh executable discovery without running programs |
| `/v1/connections/cli` | POST | Register an installed executable name or absolute path; no arguments or shell syntax |
| `/v1/connections/api` | POST | Save an OpenAI or Anthropic key and exact model ID to Mac Keychain, invalidate readiness, and request an access check |

All endpoints retain the exact origin, loopback Host, bearer token, and fixed-method checks. Configuration writes are blocked during active requests or access checks. API responses include only provider, title, model ID, and whether a key is present. The browser discards connection form state on pairing changes and rejects responses from a previous pairing. It does not retry writes automatically.

The CLI inventory scans common install locations, not terminal history or shell startup files. ChatGPT (`codex`) and Claude (`claude`) remain defaults; known additional AI executables appear when installed. A custom executable can be registered by name or absolute path. Discovery verifies an executable file exists without launching it. Additional entries explicitly show **Adapter needed** until an execution adapter is implemented; they are not automatically selectable in chat. The CLI/API tabs configure connections, while the existing automatic CLI-first routing policy selects the next request's route.

## Account and data

Provider keys are stored in Mac Keychain. A paired browser can submit a new key directly to the authenticated local Mac endpoint. The password field is cleared on submission and when switching away from the API form; keys are never returned in metadata, included in URLs, or saved to browser storage. CLI sign-in opens the corresponding native settings page, and no arbitrary command can be run through these settings endpoints. A provider's consumer subscription and developer API credentials are separate access methods.

Rivune account sign-in depends on owner-configured authentication. Unconfigured email, Google, or Apple methods remain unavailable. Account identity does not imply cloud history synchronization or account-bound local device authorization. See [Account setup](ACCOUNT_SETUP.md).

Browser appearance and input preferences apply to that browser. Conversation history and execution preferences belong to the Mac. Provider training, billing, and account policies remain with the provider; Rivune does not display a toggle that pretends to change them.

## Design references

The useful patterns are discoverable categories, clear ownership of preferences, and connection details near the connected item. Rivune keeps its own visual identity and reflects its implemented capabilities.

- ChatGPT distinguishes appearance/contrast from other account controls: [visual experience](https://help.openai.com/en/articles/11958281-u).
- ChatGPT separates data controls from app permissions: [data controls](https://help.openai.com/en/articles/7730893-data-controls-faq/), [apps and permissions](https://help.openai.com/en/articles/11487775-apps-in-chatgpt).
- Claude exposes appearance settings and data export in dedicated sections: [appearance](https://support.claude.com/en/articles/8887527-customizing-your-appearance-settings), [data export](https://support.claude.com/en/articles/9450526-export-your-claude-data).
- Claude's connector management keeps connection configuration and access visible: [connectors](https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities).

## Verification requirements

Check desktop and narrow layouts; search and empty search; keyboard navigation; browser preferences and persistence; active CLI and API states; unsupported catalog entries; live transport changes; old Mac snapshots; offline and checking states; draft preservation; and account/setup gates. Validate local settings navigation against the exact origin, bearer token, HTTP method, and section whitelist. Fixture checks must not call real providers or expose credentials.
