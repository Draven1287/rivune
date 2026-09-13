# Rivune connected workspace — local development build

The current September 5 interface update and test package are documented in [SCREENSHOT_UI_MATCH.md](SCREENSHOT_UI_MATCH.md). The paths and executable hash below record the earlier connected-workspace milestone; use **Rivune Premium.app** for the updated interface.

September 4, 2026. Implementation authorized by “take all this and start building the app.” This is the first working local milestone of ADR-001. Changes remain local and uncommitted.

## Try it

1. Quit the older Rivune instance, then open `/Users/Aaravshah/Applications/Rivune Connected.app`. Use one normal Rivune instance at a time because they share history and CLI connections. The previous installed apps are preserved.
2. Complete local setup and check **Connections**. Codex and Claude use their installed, signed-in CLIs. Their normal provider usage applies when you send a request.
3. Open **Browser workspace** in the sidebar. Enable access and copy the connection code.
4. Visit `http://localhost:3187/workspace`, choose **Connect Mac**, and paste the code. The website's **Open workspace** links lead to the same client.
5. Send a direct Codex/Claude request, or explicitly allow sharing with both providers for a Rivune request. The same conversation appears in the native app. Open another chat while it works, then return to its result.

The website development server is started from `website` using `npm run dev -- --host 127.0.0.1 --port 3187` with the project's supported Node runtime. Its production build is separate from the development server. See `website/README.md` for client details.

## What is implemented

- Native and web text requests enter one Mac run coordinator and update the same conversation records. UI navigation and browser disconnection do not cancel these runs.
- Each request has a durable ID. Duplicate submissions return the existing task; changed payloads conflict. Deleted tasks leave an ID-only tombstone, so a delayed replay cannot start them again.
- Progress, terminal results and cancellation are journaled atomically. App restart marks unfinished tasks interrupted and never automatically reexecutes them. A corrupt journal blocks new execution and is preserved for recovery.
- At most two coordinator tasks run concurrently, with one per conversation. Stop targets the correct run, and late provider responses cannot replace a cancellation or resurrect deleted history.
- Native drafts are retained while switching conversations. Browser drafts and connection material are held only in the current tab's memory.
- The browser reads real provider readiness, recent history, results and collaboration activity. It can cancel tasks and open a specific conversation in the native app.
- A native **Project** panel lets you choose a local folder, inspect a bounded text snapshot, put it into a prompt, review a returned file manifest, and explicitly apply or revert static website changes.

## Project workflow

Choose a folder through the native file picker. Inspect the listed snapshot, then add it to the composer alongside your request. Sending shares that selected source text with the chosen provider(s); merely choosing a folder does not send or modify it.

After a completed answer returns, reopen Project and review its proposed relative paths and contents. **Apply changes** is a separate native action. Paths, symlinks, duplicate targets, original hashes and changed files are checked before/during application. The last applied batch can be reverted only while its files still match the applied versions. Original files are available in a temporary backup; the in-app revert receipt lasts for the app session.

The preview displays local static files with JavaScript disabled and network access blocked. Checks cover structure and referenced files; they are not a claim that tests, JavaScript, a framework build, or a browser audit ran. No generated shell command is executed.

## Connection and data boundaries

The bridge listens only on an ephemeral `127.0.0.1` port and starts only after Enable. Requests require a per-start bearer token and exact local website Origin and Host checks. Stop revokes the code. Tokens are not placed in URLs or browser storage. Request/header/response size and connection time are bounded.

This is a same-Mac development connection. It does not expose the Mac publicly, pair another computer, upload history, or provide cloud synchronization. A browser reload requires pairing again. Keep the app open for running work; a background helper has not been installed.

Snapshots include the 50 most recent turns and 200 conversation summaries. Long answers are explicitly marked excerpts, with an Open in Mac link for the complete content. The native history remains intact.

Google account sign-in, API-key execution adapters, cloud accounts/device registration/synchronization, remote job delivery, MCP, framework development servers and general repository execution remain unimplemented or unconfigured. Google setup requires an owner-controlled auth project/OAuth configuration. Unavailable UI does not collect credentials or pretend that a cloud login succeeded.

The existing iPhone peer bridge and Evaluation Lab keep their previous execution behavior. They have not yet migrated to the new coordinator. Collaboration prompt/validation helpers remain in RivuneStore; separating that pure core is a further refactor.

## Validation

Verified on the final application source:

- **115 Mac tests passed, zero failures**, including a real Network.framework/URLSession loopback integration test with an injected fake provider: submit, shared snapshot, duplicate request, changed-payload conflict, cancellation, ignored late result, missing bearer and unapproved origin.
- Mac app build and generic iOS Simulator build succeeded. Only the expected App Intents metadata warning remains.
- Website: **7 contract tests passed**, lint and TypeScript checks clean, production build succeeded.
- Browser visual/interaction QA checked the rendered workspace, local pairing instructions, disabled send while disconnected, and rejection of a non-local endpoint. The client is open at `http://localhost:3187/workspace`.
- The packaged normal app's ad-hoc signature verifies strictly; test-only XCTest plugins were removed from the copied deliverable. Executable SHA-256: `bad4ced93ae740f027ee4e4109cb4165bef9b155ef2da730595a6c96dc58cbd0`.
- **Native visual QA is pending.** Automatic approval review rejected launching the separately signed native preview, stating that execution of a locally built ad-hoc app requires action-time confirmation. No alternate launch method was used. The normal connected app is packaged in Applications but has not been launched by the agent.

All automated provider execution used injected fake runners. No paid or signed-in model benchmark ran, and no real provider-backed project completion is claimed.

Local build/test logs: `/private/tmp/rivune-connected-build.log`, `/private/tmp/rivune-connected-tests.log`, `/private/tmp/rivune-connected-ios.log`.

## Next implementation boundary

Connect the owner-controlled identity service, validate Google/native session handling, register a revocable device, and synchronize explicitly selected work through that service. Then expand project execution with scoped check commands and owned preview processes. These are substantive follow-on pieces; the local bridge is not a substitute for their authorization and synchronization design.
