# Rivune

Rivune is a native Mac AI workspace with local conversation history, projects,
CLI/API connections, and inspectable multi-model collaboration. The website is
for product information and downloads. An internal browser workspace is a local
QA tool, not the shipped public product.

## Current source and distribution

This checkout is newer than the website download. The offered source ZIP is
version 0.1/build 1; it is not the current private Mac review build or a DMG.
Current source has Codex/Claude CLI adapters, OpenAI/Anthropic API transports,
and a separate API workspace for compatible endpoints. Provider support depends
on the implemented protocol; discovery alone does not make an arbitrary CLI
executable. Account services are disabled in the public candidate. Local
provider sign-in and a Rivune cloud account are separate.

The Mac client/local runtime is Apache-2.0. A future managed Rivune Cloud service
is separate and is not required for local CLI/BYOK use. See
[the source strategy](docs/OPEN_SOURCE_STRATEGY.md), [trademark boundary](TRADEMARKS.md)
and [dependency notices](THIRD_PARTY_NOTICES.md).

See [build and source-export commands](docs/BUILD_FROM_SOURCE.md) for prerequisites,
exact commands and configuration sanitization. No public installer, repository
or cloud service is claimed by this local preparation.

## Working now

### Direct providers and Rivune

- Live ChatGPT and Claude text prompts on Mac, with model and reasoning controls.
- Rivune mode first chooses a stable collaboration shape suited to the request: direct response, complementary workstreams, research and verification, comparison and decision, or solution and challenge. Substantive work normally uses seven coordinated model requests: Codex drafts the work brief, Claude challenges and finalizes it, Codex and Claude complete complementary tasks in parallel, both providers independently review the other's concrete work and their own assumptions, and Codex resolves one answer. If that integration fails or exposes coordination notes, Claude gets one bounded integration retry. Short conversational prompts take a bounded direct path instead of inventing a work plan.
- The integrated **Final answer** is the primary transcript result. A compact Plan → Split → Work → Review → Resolve card opens a responsive inspector for the shared brief, both contributions, and both reciprocal reviews.
- An optional, persisted collaboration trace shows the selected shape, current phase, shared brief, and cross-reviews. Each contribution is retained as soon as its provider finishes, including when a later phase fails.
- Claude's revised plan is accepted only when all seven required sections are meaningful: **Goal**, **Collaboration approach**, **Shared requirements**, **Codex task**, **Claude task**, **How the work connects**, and **Definition of done**. The validator rejects missing or repeated placeholder text and identical model assignments, then normalizes the accepted plan to at most 12 KiB.
- One stable, bounded attachment-evidence packet is reused throughout the workflow. Each visible contribution card is capped at 8 KiB and strips private coordination tails; the peer reviews and integration receive bounded 24 KiB copies of each provider's work so they can evaluate the same substantive material without flooding the chat.
- Stop/cancellation, request timeouts, output limits, readiness checks, partial-failure states, copy, share, and retry. Stopped and crash-interrupted turns remain visible and retryable after relaunch.
- Retry actions are hidden while any generation is active. If a Rivune mode phase ends without a contribution, the empty card truthfully says that work did not begin, did not finish, or was not produced instead of remaining in a misleading waiting state.
- Local conversation history with search, favorites, archive, rename, delete, and optional recent-turn context.
- UTF-8 text attachments, Markdown rendering, response timing, and model provenance.
- A native Settings workspace with General, Providers, Models, Privacy, Devices,
  and Appearance sections. The Providers page scans only registered executable
  names in a bounded set of trusted macOS install locations and never launches
  a CLI during discovery. Installed CLIs without a reviewed Rivune adapter are
  shown as **Adapter needed**, not silently executed or misreported as ready.

Rivune mode sends material across provider boundaries and, for substantive work, normally consumes seven model requests, with an eighth only if Claude must retry a failed or leaking final integration. Before the first Rivune mode request, Rivune explains that both providers receive the prompt, recent context, attached text, shared plan, coordinated contributions, and peer-review material; the final integrator receives the complete bounded collaboration.

A fresh account-backed Mac run completed the current symmetric-review path end to end and produced both coordinated contributions, two peer reviews, and one integrated result. The tested brief returned exactly five features, three launch risks, and one recommendation without exposing private coordination in the final answer.

### Evaluation Lab

- The Mac app includes a local **Evaluation Lab** for checking whether Rivune collaboration is actually more useful for the user's own work. It sends one fresh prompt to Codex alone, Claude alone, and the same shared `RivuneCollaborationRunner` used by normal local Rivune chat. Conversation history and attachments are deliberately excluded, and the two baseline envelopes are byte-identical. Baseline answers are never supplied to the Rivune candidate.
- A substantive comparison normally uses nine CLI requests: two isolated baselines plus the seven-request Rivune workflow. A rejected Codex integration can add one Claude fallback request. Direct small-talk prompts use fewer requests. The selected model and effort settings are frozen for the run, and retry executes only candidates that are still missing.
- Results appear as a per-run shuffled **Answer A / B / C**. All three anonymous answers are presented in one adaptive comparison view, while provider labels, model settings, provenance, timing, and past scorecard results remain hidden during judging. Self-identifying candidate text is withheld and can be retried. After the user chooses or explicitly reveals without choosing, identities appear and the scorecard reports Rivune, Codex, and Claude selections plus abstentions.
- This is a blind-preference aid, not an automated judge, a cryptographic blind, or proof of objective or statistically significant model superiority. A useful review should weigh correctness, honest uncertainty, completeness, and practical value—not style alone.
- Up to 40 evaluations are stored locally in Application Support, with a 240,000-byte bound per saved answer and synchronized, revisioned primary/recovery snapshots. The prompt, answers, frozen settings, candidate mapping, workflow receipt, and selection are local JSON data; deletion writes a newer empty-of-that-run snapshot to both copies, and recovery chooses the newest valid revision after an interrupted write. Evaluation Lab runs on Mac in this version because it invokes both installed CLI clients; iPhone explains that boundary rather than simulating a run.

### Premium Codex-style composer

- A responsive, multiline **Do anything** composer adapts between full, compact, and split toolbars on Mac and iPhone.
- Selected UTF-8 text, source-code, JSON, and CSV files appear as removable attachment chips. A prompt can include up to six documents and at most 20,000 bytes of prepared document JSON in total; Rivune rejects the selection rather than silently clipping it.
- A permission menu exposes the actual boundary for the next request: read-only text plus only the files the user selects. Workspace editing, shell commands, and unrestricted access are visibly unavailable rather than simulated.
- A context-window control toggles recent Rivune conversation context and estimates the prepared bytes and approximate tokens for the next request. It is a Rivune input estimate, not a claim about a provider's exact context limit.
- Model and reasoning controls stay in the composer. The send control becomes stop while work is active, and the current phase, provider readiness, retry boundary, and live-request state remain visible.
- Microphone dictation is available on Mac and iPhone and transcribes speech into the composer before send. Photo and AI-camera input remain visibly unavailable. Rivune does not yet provide a live two-way voice conversation. Compact controls include accessibility labels, values, and hints.

### iPhone through the Mac

The iPhone app does not attempt to run macOS terminal binaries. It discovers and connects to a paired Mac over the same local network, then sends typed prompt, readiness, progress, result, and cancellation messages. The Mac performs the model work and returns updates to the phone. The phone and Mac negotiate Rivune mode workflow capability version 2 before enabling coordinated requests. A per-request watchdog recovers from a stalled bridge, and oversized final answers are adaptively clipped to the protocol budget instead of disappearing while the phone keeps spinning. When later bridge updates contain a shorter fitted copy of an answer, iPhone merging preserves the longer earlier contribution with the same answer ID.

Pairing supports either the displayed QR code or manual code entry. The pairing code expires after 120 seconds. After the first encrypted connection, Rivune rotates that temporary credential to a new reconnect credential and saves the durable credential in each device's Keychain only after an encrypted acknowledgement. Replacing an existing pairing requires confirmation because issuing a new code revokes the old phone credential immediately.

Current operating requirements:

- The Mac and iPhone must be on the same local network.
- Rivune must remain open and the Mac must remain awake while the phone is using it.
- Keep Rivune in the foreground on iPhone during a request.
- There is no internet relay, router port, cloud bridge, or sleeping-Mac helper.

The transport design and its current verification boundary are detailed in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Models and reasoning

Rivune applies an app-maintained compatibility filter before passing a selection to the installed CLI.

| Codex model | Reasoning choices shown |
| --- | --- |
| GPT-5.6 Sol / Terra | Automatic, Low, Medium, High, Extra High, Max, Ultra |
| GPT-5.6 Luna | Automatic, Low, Medium, High, Extra High, Max |
| GPT-5.5 / GPT-5.4 | Automatic, Low, Medium, High, Extra High |
| Codex default | Automatic, Low, Medium, High, Extra High |

| Claude model | Reasoning choices shown |
| --- | --- |
| Account default / Best available / Fable / Opus / Sonnet | Automatic, Low, Medium, High, Extra High, Max |
| Haiku | Automatic only |

The installed CLI and signed-in account are the final authority for model availability, subscription entitlements, quotas, and accepted effort levels. Standard model jobs have a 10-minute timeout and Ultra jobs have a 15-minute timeout. The iPhone watchdog uses matching 10.5- and 15.5-minute windows so it does not cancel a healthy Mac process first. Ultra can take longer and consume more plan usage; in Rivune mode, the selected settings are reused across all relevant stages.

## Open-source previews

Rivune is licensed under Apache-2.0 and includes contribution, conduct, and
private security-reporting guidance. The public project is independent and is
not affiliated with OpenAI, Anthropic, Apple, Tesla, or their products.

The provider-independent configuration foundation models CLI and API
transports, provider capabilities, model and effort catalogs, secret
references, and councils made from an arbitrary array of participants and
roles. Settings renders its provider and model rows from that catalog and can
safely discover registered CLI executables without running them. Today, only
the Codex CLI and Claude Code CLI adapters execute requests, and the running
Rivune mode workflow still uses the current two-provider council. Current source also implements OpenAI/Anthropic API transports and a separate
compatible-endpoint API workspace. Arbitrary CLI execution and arbitrary
multi-provider councils remain unsupported; each adapter needs explicit review.
The older downloadable preview does not imply these newer capabilities.

The repository includes a source-preview website, a checksum-backed source
archive, and separate local-preview and public-release DMG paths. The
source packaging script at
[`scripts/package_source_preview.sh`](scripts/package_source_preview.sh)
produces `website/public/downloads/rivune-source-preview.zip` and its matching
SHA-256 checksum. [`scripts/package_macos_dmg.sh`](scripts/package_macos_dmg.sh)
builds a universal `arm64 x86_64` `Rivune.app`, creates a DMG with an
Applications shortcut, remounts it, and verifies its metadata, signature,
architectures, contents, and checksum.

Public packaging fails closed unless a valid Developer ID Application identity
and Apple notarization profile are supplied and the app, DMG, stapling, and
Gatekeeper checks all pass. A local ad-hoc package requires the explicit
`--allow-adhoc-preview` flag, uses separate `Rivune-Preview` filenames, and must
not be published. The website offers the source archive while the public DMG is
held behind that release gate. This is not an App Store build.

The intended split between reusable community code and Aarav's private local
configuration is documented in
[docs/OPEN_SOURCE_STRATEGY.md](docs/OPEN_SOURCE_STRATEGY.md). Do not commit API
keys, provider sessions, signing material, pairing credentials, private prompts,
or user history.

## Setup

1. Sign in to the installed Codex and Claude Code clients on the Mac using their normal interactive login flows.
2. Open Rivune on Mac, open **Settings → Providers**, and choose **Refresh connections**. Rivune mode is ready when every enabled participant shows **Signed in**.
3. To use iPhone, enable **Allow iPhone connections** on the Mac and select **Pair iPhone**.
4. On iPhone, open **Settings**, scan the QR code or paste the manual pairing code, and connect while the code is still valid.

The terminal runs are ephemeral and do not reuse a vendor conversation session. Rivune maintains its own local conversation context instead.

## Privacy and security boundary

- Executable paths are fixed by the app; user prompts are sent through standard input and never interpolated into a shell command.
- Claude tools are disabled. Rivune aggressively disables Codex tool surfaces supported by the installed CLI and rejects unexpected result item types.
- Terminal jobs use temporary working directories, bounded input/output, timeouts, and escalating cancellation.
- Structured prompt payloads are measured after JSON escaping and fitted to at most 112 KiB, leaving room for fixed instructions inside the 128 KiB terminal prompt envelope. The complete user request is protected during fitting; contextual fields shrink first and the request is never silently trimmed.
- These CLI restrictions are defense in depth, not an OS-hard guarantee that a child process can never read another file available to the user's account. Descendant-process containment is also not yet OS-hard.
- Conversation history is stored locally in Application Support; iOS applies platform data protection. Cloud sync is not enabled.
- Local-network traffic uses an authenticated TLS 1.2 pre-shared-key connection with `TLS_PSK_WITH_AES_128_GCM_SHA256`. The Bonjour service remains `_alloy-bridge._tcp` so previously paired builds stay compatible; it is a legacy wire identifier, not the current product name.
- Bridge JSON messages use a four-byte length prefix and a 1 MiB maximum frame size. Final updates are measured after JSON encoding and fitted below that limit with safety headroom. Pairing and reconnect credentials are device-local and revocable.
- Rivune mode shares prompt-derived planning, both contributions, both providers' independent peer reviews, and the integration request with OpenAI and Anthropic. Use a single-provider mode for material that must not cross that boundary.
- Persistent “Always allow” consent is tied to Rivune mode workflow version 2. A future workflow-version change invalidates the old approval and requires a new disclosure.

The rename is migration-safe. Rivune copies legacy preferences and pairing
records forward, imports history from the former `Application Support/Alloy`
directory, and retains the existing bundle identifiers so preferences and app
container data migrate forward. Because the product name changed, dragging
`Rivune.app` into Applications does not automatically remove a separately named
`Alloy.app`; verify the Rivune migration before removing the old app. Serialized
`Together` mode and `Alloy` answer-source values,
provider adapter IDs, and the Bonjour service type remain compatibility
identifiers only; the interface and new storage use the Rivune name.

## Explicit limits

Rivune brings the core text workflows together; it does not claim complete feature parity with the proprietary ChatGPT or Claude consumer apps. It does not currently import or merge:

- Existing vendor chat histories, account memory, Projects, custom GPTs, Claude Projects, or Artifacts.
- Live two-way voice conversations, AI camera/image/video understanding, image generation, Deep Research, browser connectors, or consumer-app sharing. Composer dictation and the iPhone pairing-code scanner are supported, but neither is multimodal model input.
- Web search, MCP/plugins, repository editing, arbitrary shell commands, or autonomous tools. Text attachments are supported; those broader tools are not.
- Arbitrary CLI execution or arbitrary runtime councils. API compatibility is limited to implemented protocols; a provider name alone does not make an endpoint compatible.
- Cloud sync, remote relay, widgets, Shortcuts, Live Activities, or a background Mac helper.

Unavailable controls are presented honestly rather than simulating a successful feature.

## Open in Xcode Beta

1. Open `Rivune.xcodeproj` from the cloned project folder in Xcode Beta.
2. Select **Rivune Mac** with **My Mac**, or **Rivune iOS** with an installed iPhone simulator or physical iPhone.
3. For a physical iPhone, choose an Apple development team in **Signing & Capabilities**.
4. Press `Command-R`.

## Historical verification — 2026-09-02

These results describe an earlier checkout, not acceptance of the current source
candidate. Re-run the documented checks against the exact extracted archive.

- Rivune Mac tests and the generic iOS Simulator build succeed with the installed Xcode Beta toolchain. The checked build includes the final-answer-first transcript, collapsed Decision Record, contained Markdown tables, native Chat Options menu, six-section Settings navigation, provider-catalog-driven rows, and non-invoking trusted-path CLI discovery.
- The current substantial-request workflow selects a collaboration shape, drafts and challenges the shared brief, runs both coordinated contributions concurrently, runs two symmetric peer reviews concurrently, and gives both reviews to the final integrator. A plan-challenge failure can continue only from a valid original plan; a leaking or failed Codex integration is retried with Claude. If either substantive contribution is missing or both integrators fail, the run fails closed while keeping completed work available in the inspector.
- A fresh account-backed live Rivune mode run completed the current symmetric-review workflow: Codex drafted the plan, Claude challenged it, both providers produced coordinated contributions, both independently reviewed the complete work, and Codex integrated the result. The persisted turn finished in the `complete` state with a clean 5-feature / 3-risk / 1-recommendation brief; the visible cards reported **GPT-5.6 Sol · Extra High · 28.8 sec**, **Opus · Automatic · 62.1 sec**, and **GPT-5.6 Sol · Extra High · 280.5 sec** for the integrated answer.
- A prior end-to-end live Rivune mode run also validated the CLI boundary and earlier seven-request coordinator.
- The live prompt requested a fictional **Moonwhistle Robotics Club** single-file HTML page, assigning HTML/content and CSS/accessibility as complementary work, requiring the models to resolve conflicts, limiting the result to fewer than 80 lines, and forbidding external assets.
- The final result was a complete 44-line, 1,938-byte HTML document with inline CSS, no external-asset URLs, and accessibility hooks including a skip link, `:focus-visible` styling, and a navigation label. The final card reported **GPT-5.6 Sol · Ultra · 523.1 sec** for integration, exercising the extended Ultra window beyond the old five-minute limit.
- The deterministic Mac XCTest suite passes **67/67 tests**, adding coverage for trusted CLI search paths, exact executable discovery without process launch, third-provider presentation without false execution support, and honest authentication-versus-adapter status on top of the existing bridge, orchestration, persistence, privacy, Markdown, migration, and Evaluation Lab coverage.
- A real ChatGPT run passed Rivune's complete structured prompt envelope successfully.
- An adversarial tool-disable check against the installed Codex CLI returned no tool event and did not expose the sentinel file. This validates the installed version, not every future CLI release or an OS-hard sandbox.
- The QR/manual pairing interface was exercised; the implementation enforces the 120-second expiry.
- A pathological bridge-result regression expanded to 2,400,718 encoded bytes and was safely fitted to 1,013,257 bytes while retaining all three answer objects and completion metadata.
- The physical iPhone remained saved as paired but was offline/unavailable during the successful Mac run, so real-device prompt relay and returned results remain unverified.
- Process cancellation works through interrupt, terminate, and kill escalation, but containment of every possible descendant process is not yet OS-hard.
- The source ZIP is checksum-backed. The explicit local-preview packaging path produced and remounted a universal macOS 26+ `Rivune-Preview.dmg`; it is not published. Public packaging writes `Rivune.dmg` only after Developer ID signing, notarization, stapling, and Gatekeeper acceptance all pass.

Reference documentation:

- [OpenAI Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Anthropic Claude Code model configuration](https://code.claude.com/docs/en/model-config)
- [Apple: Moving from Multipeer Connectivity to Network framework (TN3213)](https://developer.apple.com/documentation/technotes/tn3213-moving-from-multipeer-connectivity-to-network-framework)
- [Apple: Understanding local network privacy (TN3179)](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy)
