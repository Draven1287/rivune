# Native space workspace — September 5, 2026

The Mac app uses the silver R with its tilted ring, central pearl and starry background across the Dock icon, sidebar, connection marks and browser design. Startup uses the same identity in its landscape composition. This is the existing native SwiftUI app, not an embedded localhost website.

## Using the Mac app

- Launch Rivune from Applications. Its 12-second arrival runs alongside the existing CLI/API readiness checks.
- Existing signed-in Codex and Claude Code installations are detected directly by the Mac app. The browser's “Connect your Mac” code is not needed inside the Mac app.
- The main ChatGPT, Claude, and Rivune conversations retain their existing local history and execution paths.
- Connections → More AI providers opens native API conversations. The same entry is available in the composer’s model controls and the workspace options menu.
- Add a provider, its base URL, API format, exact model ID, and API key. Saved connections each retain a separate conversation. “Check available models” makes a metadata request only; sending a message verifies actual generation.
- Connection settings include replacing the API key, starting a new conversation, checking models, and removing a connection with confirmation.

## API support

Presets: OpenRouter, OpenAI, Anthropic, Google Gemini, xAI/Grok, DeepSeek, Mistral, Groq, Together AI, and Ollama. Custom endpoints can use OpenAI-compatible Chat Completions, OpenAI Responses, or Anthropic Messages. Only text conversations are implemented here. Other protocols, media generation, streaming, and arbitrary CLI executables need additional adapters; a provider’s presence in a list is not a claim that every one of its features works.

The new API conversation workspace is local to the Mac. These additional providers do not yet participate in the two-provider Rivune collaboration or phone/browser bridge. Existing OpenAI and Anthropic API routes remain available to those surfaces.

Credentials are stored in macOS Keychain per connection, separate from the two default provider keys. Connection endpoints are fixed at creation, so a saved key is not silently reused with a changed destination. HTTP is accepted only for explicit loopback servers. Redirects are rejected by the shared HTTP transport. Metadata and conversation history live in `~/Library/Application Support/Rivune/api-workspace-v1.json`, with file mode 0600. Failed storage reads are not overwritten.

Cloud account sign-in remains separate. The web implementation supports Google, Apple, and email once an owner-controlled authentication project is configured; native account buttons remain unavailable. This update does not invent a cloud account or change existing CLI sign-ins.

## Checks

- Installed `/Applications/Rivune.app`, version 0.2, build 2026090502, with the ring-and-stars icon. Release build and strict code-signature verification passed; launch and the 12-second arrival were checked in the actual Mac app.
- Live native end-to-end check: started a new ChatGPT conversation without attachments, sent `Reply with exactly: Rivune is connected.`, and received `Rivune is connected.` through Codex CLI (GPT-5.6 Sol). The UI reported 4.5 seconds and signed-in CLI status. Existing history remained visible. Claude was detected ready; this check did not send a Claude request.
- 44 selected native tests passed, covering the default API routes, startup policy, and the new custom API runtime/storage.
- Mac Debug and generic iOS builds passed. A Mac Release package is used for installation to avoid Xcode’s debug-dylib library-validation issue outside Xcode.
- Real third-party API credentials were not supplied; remote API generation has not been independently verified for every preset.

## Protocol sources

Preset endpoints follow the providers’ documentation, checked September 5, 2026:

- [OpenRouter](https://openrouter.ai/docs/quickstart)
- [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)
- [xAI API](https://docs.x.ai/developers/rest-api-reference/inference)
- [DeepSeek](https://api-docs.deepseek.com/)
- [Mistral models](https://docs.mistral.ai/api/endpoint/models)
- [Groq](https://console.groq.com/docs/overview)
- [Together AI authentication](https://docs.together.ai/docs/api-keys-authentication)
- [Ollama compatibility](https://docs.ollama.com/api/openai-compatibility)


## Brand and CLI parity update — build 2026090503

- The web companion and installed SwiftUI Mac app now share a continuous, softly masked startup poster instead of split logo/wordmark rectangles. The twelve-second percentage and readiness handoff remain intact. The motion study was visually checked at 50%; native launch was checked from loading through the workspace.
- A shared SVG silver wordmark is used for prominent Rivune brand labels; the approved R, orbit, pearl, and stars icon is retained. Ordinary sentences remain readable UI text.
- Model controls stay at the composer. The native popover has two independently scrolling columns; redundant sidebar model controls and the outer popover scrollbar are removed. The disconnected browser uses one compact explanation instead of two large empty panels.
- Native startup reads bounded, recent Codex model-cache metadata and installed Claude CLI help. Models and reasoning are published through the same browser workspace contract and validated against it. Built-in fallback options are labeled when metadata is unavailable. Discovery and runtime executable resolution use the same Mac search locations.
- Other discovered tools remain explicitly marked as needing an adapter; finding an executable does not mean arbitrary CLI syntax is supported. Custom API endpoints continue to support the implemented API formats.
- Added SwiftUI Settings scene: Rivune > Settings…, Command-comma, and the sidebar button open the same separate native window. Additional API connections open correctly within Settings.

### Verification of this build

- Release build, installation at `/Applications/Rivune.app`, and strict signature verification passed. Local preview is ad hoc signed, not a notarized public release.
- Installed UI: silver sidebar wordmark and orbit/stars icon, compact picker with Astra/Sol/Terra/Luna and Claude Fable/Opus/Sonnet, settings window, Command-comma, Back to workspace, and additional API provider sheet checked.
- Live fresh ChatGPT conversation: `Reply with exactly: Native Rivune is ready.` returned `Native Rivune is ready.` through Codex CLI / GPT-5.6 Sol in 4.4 seconds. No files or prior conversation context were attached.
- 36 focused native tests passed: CLI capability parsing, future model identifiers and persistence, browser/native capability validation, startup routing, provider catalog, and connection settings. Web workspace and account contract tests plus TypeScript checks passed. iOS Simulator build passed after isolating Mac-only filesystem discovery.
- Account provider configuration remains outstanding; no Google, Apple, or email account sign-in is claimed as live. Full native accessibility, draft restoration across quit, and release/notarization validation are not certified by this visual update.

### Ongoing delivery rule

User requested that web changes also ship in the Mac app. Treat brand, startup, connection state, models/reasoning, and account behavior as paired changes. Preserve platform-native interaction (for example a Mac Settings window) and verify the installed Mac build, not only localhost. Report any parity gap explicitly.

## Account update — build 2026090504

Installed the Release Mac app at `/Applications/Rivune.app` with Supabase Swift Auth 2.55.1, shared Settings/onboarding account UI, PKCE system-browser Google/Apple flow, passwordless email links (optional OTP fallback), project-scoped Keychain sessions, server-verified identity restoration and persistent local sign-out intent. Anonymous identities are not treated as signed-in accounts. CLI credentials/history are separate.

Connected the owner's project `tbiviqglzozlyijrhbug` using its public publishable key in both native and web configuration. Verified its public Auth settings: email enabled; Google and Apple disabled. Saved exact native and localhost callback allowlist entries. No sign-in email sent, no completed live sign-in yet. Google/Apple credentials and public SMTP remain owner setup items; details in `ACCOUNT_SERVICE_SETUP.md`.

Mac Release and iOS simulator builds passed. Native account configuration/callback checks passed (5 tests); the earlier startup suite also passed. Web TypeScript and 18 account tests passed, including the email callback redirect assertion. Rendered Mac Account settings and web email entry were inspected. Browser account/PKCE storage now persists across same-origin tabs so emailed links can open another tab. This does not add cloud conversation sync.
