# Rivune architecture

## Product boundary

Rivune removes the back-and-forth between separate AI apps. A user asks once and selects ChatGPT, Claude, or Rivune. Rivune mode preserves three visible results:

1. ChatGPT's assigned contribution to a shared plan.
2. Claude's complementary contribution to that plan.
3. A Codex-authored final integration informed by ChatGPT's adversarial review and Claude's direct debate response.

Rivune is a native SwiftUI macOS and iPhone app. It unifies the core text workflow and adopts a familiar sidebar, transcript, premium Codex-style composer, and settings structure, but it does not copy vendor branding or claim to merge the proprietary ChatGPT and Claude account systems. Its provider catalog and council configuration are provider-neutral foundations; the executable product boundary is still Codex CLI, Claude Code CLI, and the fixed two-provider Rivune mode workflow.

## Components and data flow

```text
Rivune Mac SwiftUI
        |
        +-- RivuneStore
        |     +-- local conversation persistence
        |     +-- recent-turn context and text attachments
        |     +-- single-provider and Rivune mode coordination
        |     +-- remote-request limit and result cache
        |
        +-- AITextRuntimeRegistry
        |     +-- reviewed Codex CLI adapter
        |     +-- reviewed Claude Code CLI adapter
        |     +-- TerminalAIService process boundary
        |     +-- process lifecycle and structured result parsing
        |
        +-- PeerBridge / Network.framework
              +-- Bonjour listener: _alloy-bridge._tcp (legacy wire identifier)
              +-- TLS 1.2 PSK transport

                    same local network

Rivune iPhone SwiftUI
        |
        +-- RivuneStore
        |     +-- local UI/history
        |     +-- typed prompt, update, readiness, and cancel messages
        |
        +-- PeerBridge / Network.framework
              +-- Bonjour discovery after deliberate pairing
              +-- TLS 1.2 PSK transport
```

The Mac is the execution host. The iPhone never receives an executable path, shell command, or arbitrary argument list, and it never tries to run a terminal client locally.

Alongside that executable path, the shared model layer defines an
`AIProviderCatalog` and `AICouncilConfiguration`. They describe providers,
transports, capabilities, models, effort levels, secret references,
participants, and collaboration roles without requiring a vendor-specific
enum for every future provider. These configuration records do not dispatch
requests by themselves.

## Composer surface

The composer is a functional request-control surface, not a decorative mockup:

- Its multiline **Do anything** field and toolbar adapt across full, compact,
  and split layouts.
- The file picker accepts selected UTF-8 text, source-code, JSON, and CSV files.
  Attachments are removable before send, limited to six documents and 20,000
  bytes of prepared document JSON in total. Rivune rejects an oversized
  selection rather than silently clipping it.
- The permissions menu describes the actual read-only text boundary, manages
  selected files, and leaves workspace editing, shell commands, and
  unrestricted access disabled.
- The context-window ring estimates Rivune's prepared message, attachment, and
  optional recent-history input. Its **Include previous messages** control says
  exactly what changes: up to eight Rivune turns, capped at 12 KiB, are added
  to the next request only. It does not import provider history, train a model,
  or pretend to know a provider's exact token accounting.
- The inline configuration menu selects the active CLI model and effort. Send
  changes to stop during generation, while phase and readiness feedback remain
  visible.
- Microphone dictation is available on Mac and iPhone and writes recognized
  text into the composer before send. Photo and AI-camera input remain
  unavailable, and Rivune does not provide a live two-way voice conversation.
  Compact controls expose accessibility labels, values, and hints.

## Provider catalog and council foundation

| Layer | State in the 2026-09-03 working tree |
| --- | --- |
| Provider catalog | Provider-neutral Codable schema for any number of providers, CLI/API transports, capabilities, models, efforts, and credential references |
| Council configuration | Provider-neutral array of participants with contributor, critic, synthesizer, verifier, coordinator, or custom roles |
| Codex CLI | Runtime-wired through reviewed adapter ID `alloy.terminal.codex` and an exact provider/transport route |
| Claude Code CLI | Runtime-wired through reviewed adapter ID `alloy.terminal.claude` and an exact provider/transport route |
| CLI discovery | Registered executable names only; bounded trusted install locations; discovery never launches a process |
| OpenAI Responses API and Anthropic Messages API | Configuration preview only; no network executor is registered |
| Custom or additional providers | Catalog entries and installed executables can be presented dynamically; execution remains disabled until a reviewed runtime adapter is registered |
| Arbitrary councils | Serializable and bridge-compatible preview data; execution still uses the current ChatGPT + Claude council and seven-request workflow |

Secret fields in preview API records are references to a future Keychain or
credential-broker entry, never credential values. A transport is executable
only when it is explicitly marked with an implemented runtime adapter. The
native Settings UI renders provider/model rows from the catalog, separates the
two executable CLI transports from API preview entries, and does not report a
configuration-only transport as ready. It uses a `NavigationSplitView` with
General, Providers, Models, Privacy, Devices, and Appearance destinations;
Providers opens first so connection state is immediately visible.

## Terminal model engine

Every request now enters `AITextRuntimeRegistry` with an `AIExecutionRoute`, prompt, model, and effort. The registry resolves only compiled, reviewed adapters whose provider ID, transport ID, transport kind, runtime adapter ID, capabilities, implementation state, and executable name all match the catalog record. A catalog entry cannot make itself executable merely by copying a known adapter ID. Unknown, incomplete, duplicate, or mismatched routes fail closed.

The current reviewed Codex and Claude adapters delegate to `TerminalAIService`, which launches only their known executable locations through `Foundation.Process`; it does not invoke a shell. Prompt content is written through standard input. A third provider can now participate in the same runtime seam once a concrete adapter is added to the compiled registry. API previews and unreviewed custom providers remain non-executable.

Codex runs ephemerally in a temporary working directory with its read-only mode and supported tool surfaces disabled. The parser accepts only expected text/reasoning item types and rejects unexpected events. Claude runs without session persistence and with an empty tool set. Both adapters validate structured success envelopes rather than treating arbitrary stdout as a valid answer.

Each job has:

- A bounded prompt envelope and bounded stdout/stderr.
- An eight-second readiness-probe timeout, a 10-minute standard model timeout, and a 15-minute timeout for Ultra.
- Separate stdout and stderr capture with structured validation.
- Cancellation that escalates from interrupt to terminate to kill while waiting for process exit.
- Clear app-level errors for missing clients, authentication, incompatible settings, timeout, malformed output, cancellation, and provider failure.

The restrictions above reduce the attack surface, but they are not an OS-hard child-process sandbox. In particular, read-only CLI mode is not a universal guarantee against every file read available to the user's account, and Rivune does not yet establish an independently contained process group for every possible descendant. A future permissioned Agent mode needs an external isolation boundary and explicit user approvals.

Prompt JSON is measured after serialization rather than by the raw field strings, because quotes, backslashes, and control characters expand during escaping. Rivune repeatedly fits the largest contextual fields until the encoded payload is no more than 112 KiB, leaving headroom for fixed instructions within the terminal service's 128 KiB prompt envelope. The `user_request` or `original_user_request` field is protected: even an escape-heavy maximum-size request remains byte-for-byte intact while plans, history, evidence, contributions, and reviews are fitted around it. If only protected fields remain, Rivune drops the optional context together rather than shortening the user's instruction.

## Model and effort compatibility

The UI filters combinations before invoking a CLI:

| Provider model | Efforts exposed by Rivune |
| --- | --- |
| GPT-5.6 Sol / Terra | Automatic through Ultra |
| GPT-5.6 Luna | Automatic through Max |
| GPT-5.5 / GPT-5.4 / Codex default | Automatic through Extra High |
| Claude account default / Best / Fable / Opus / Sonnet | Automatic through Max |
| Claude Haiku | Automatic only |

This is an app-maintained compatibility matrix, not a live entitlement query. The installed CLI and authenticated account remain authoritative for exact model access, quota, and effort acceptance.

## Current CLI-compatible Rivune mode orchestration

`AIProviderCatalog.currentCLICompatibleCouncil` records the two current
participants and their roles, but the engine still consumes the legacy Codex
and Claude request fields. The arbitrary-participant council schema is a
forward-compatible contract, not a claim that any configured team can run.

For substantive work, Rivune mode performs seven model requests across four coordinated phases, followed by presentation. Short conversational prompts use a bounded direct collaboration path so a greeting or simple question does not manufacture a work plan:

1. **Plan — two sequential requests:** Rivune first selects one of five deterministic collaboration shapes. Codex reads the complete user request, recent Rivune context when enabled, and supported text attachments, then drafts a work brief. Claude challenges that draft for gaps, duplication, incompatible dependencies, assumptions, and weak checks, then returns the complete revised brief. Rivune proceeds only if it has all seven sections—**Goal**, **Collaboration approach**, **Shared requirements**, **Codex task**, **Claude task**, **How the work connects**, and **Definition of done**—with minimum meaningful content. Repeated `N/A`/`TBD`/`None`-style placeholders and identical tasks are rejected. Valid sections are normalized and individually clipped so the complete downstream plan is at most 12 KiB.
2. **Contribute — two parallel requests:** Codex and Claude each receive the same finalized brief, know both tasks and their two-way dependencies, and produce the substantive artifact assigned to them. They work concurrently but with shared awareness instead of returning two duplicate full answers.
3. **Review — two parallel requests:** Codex and Claude independently receive the original request, shared brief, both contributions, and source context. Each must inspect the peer contribution itself, name the peer, cite or accurately paraphrase at least one concrete element from that work, check its own assumptions, and recommend exact resolutions for conflicts, gaps, duplication, interfaces, and unsupported claims. A review is accepted only when its required sections and peer grounding validate.
4. **Integrate — one request plus a bounded retry:** Codex receives the original request, shared plan, both contributions, both independent reviews, and bounded source context. It resolves conflicts and duplication and returns one coherent user-facing deliverable. If Codex fails or the output narrates private coordination, Claude receives the same integration envelope for one retry.
5. **Present:** the integrated result is the primary final-answer card. A compact phase strip opens an inspector containing the brief, both contributions, and both reciprocal reviews.

### Collaboration quality evaluations

Rivune tests three distinct quality cases rather than treating the number of
model calls as proof of quality:

| Case | Expected split | Passing outcome |
|---|---|---|
| Website or coding build | Complementary production work plus adversarial compatibility and completeness checks | The final response contains the usable artifact or implementation, satisfies explicit acceptance criteria, and does not merely summarize two suggestions. |
| Open-ended business ideas | Candidate generation and criteria grounded in the user's skills, access, motivation, and evidence, followed by independent downside testing | The recommendation distinguishes facts from assumptions, ranks against the stated criteria, and names the cheapest evidence needed before committing. |
| Existing idea challenged | Treat the user's idea as the incumbent and search seriously for stronger alternatives | Rivune may conclude that the incumbent remains strongest. It must not invent a replacement to appear creative, agree reflexively, or claim certainty beyond the evidence. |

Planning, contribution, reciprocal review, and synthesis prompts all carry the
same calibrated-judgment contract: no forced novelty, no sycophancy, explicit
criteria, facts separated from inferences and assumptions, confidence matched
to evidence, and a clear account of what could change the conclusion.

The normal seven-request count is therefore `1 plan + 1 plan challenge + 2 contributions + 2 peer reviews + 1 integration`; the optional Claude integration retry can make eight. Embedded history, documents, plans, contributions, reviews, and responses are labelled as untrusted quoted data in every prompt envelope. If the plan challenge fails, Rivune can continue only from an independently valid original plan. If either substantive contribution or required reciprocal review fails, Rivune stops without manufacturing a combined answer and keeps completed work available for inspection. If both integration attempts fail or leak coordination, Rivune fails closed rather than presenting unreconciled work as resolved.

At workflow start, Rivune creates one deterministic attachment-evidence packet with sanitized names, per-document bounds, and a 20,000-byte total bound. The same packet is supplied throughout the workflow so models do not reason from shifting excerpts. Peer-review and integration envelopes receive bounded 24,000-byte copies of each contribution. Visible contribution cards are separately cleaned and capped at 8 KiB: useful user-facing prefixes remain, private coordination tails are removed, and a fully contaminated result becomes one short neutral line. This keeps the chat readable without starving the reviewers of substantive work.

The first Rivune mode send requires a disclosure because the workflow moves prompt-derived material across OpenAI and Anthropic boundaries. The disclosure covers both the direct and seven-request paths.

### Blind Evaluation Lab

Evaluation Lab is a Mac-only, local preference experiment. Each run freezes the
current Codex and Claude model/effort settings and constructs one fresh baseline
envelope with no conversation history and no attachments. That byte-identical
envelope is sent independently to Codex and Claude in parallel. Their outputs
are stored as baseline candidates but are never inserted into any planning,
contribution, review, or integration prompt.

The third candidate is produced by `RivuneCollaborationRunner`, the same runner
used by normal local Mac Rivune chat. A substantive comparison therefore uses
two baseline requests plus Rivune's seven-request path, normally nine provider
requests in total; the bounded Claude integration fallback can make ten. A
direct small-talk comparison uses the shorter direct path. Retry inspects the
saved run and invokes only a missing baseline or a missing Rivune candidate,
using the original frozen configuration.

Each run stores a UUID-derived permutation of the three provider identities.
Before commitment, the presentation exposes only Answer A, B, and C and omits
provider, model, effort, provenance, timing, workflow details, and prior
scorecard results. All three anonymous answers are rendered together in an
adaptive horizontal-or-stacked comparison so long work can be inspected
without a memory-based tab switch. The user can select one candidate or
abstain; that immutable action reveals the mapping and updates a scorecard
whose denominator includes only actual selections. The UI asks the user to
consider correctness, calibrated uncertainty, completeness, and usefulness.
Baseline and Rivune candidates that explicitly self-identify are rejected
before judging.

This is UI-level blinding, not a cryptographic blind: the saved local JSON has
to retain candidate identity and model configuration, and wording can still
carry stylistic clues. There is no automated model judge, fixed benchmark set,
rubric scorer, confidence interval, or statistical-significance calculation.
The scorecard measures one user's blind preferences and must not be described
as objective model quality.

Evaluation lifecycle states are `runningBaselines`, `runningRivune`,
`awaitingSelection`, `revealed`, `needsAttention`, `cancelled`, and
`interrupted`. On load, any record with all three candidates is normalized to
`awaitingSelection` unless already revealed; incomplete running records become
retryable interruptions. The active-run identity guards terminal callbacks so
a cancelled older task cannot clear a newer run.

Evaluation history uses revisioned snapshot envelopes in primary and recovery
files. Save writes recovery first and canonical storage second; load decodes
both, chooses the newest valid revision, and repairs a stale or missing peer.
This prevents a valid older primary file from resurrecting deleted prompts and
answers after a crash between the two atomic replacements. Legacy array-only
history remains readable as revision zero.

### Collaboration trace and UI

Every new Rivune mode turn starts with an optional `TogetherTrace`. The legacy type name remains unchanged for saved-history and bridge compatibility. It persists the selected collaboration shape, richer phase (`planning`, `contributing`, `reviewing`, `integrating`, `complete`, `failed`, or `cancelled`), finalized shared brief, both independent peer reviews when available, and failed phase when applicable. The transcript renders a compact Plan / Split / Work / Review / Resolve strip and one primary final-answer card; the full brief, contributions, and reviews live in a responsive inspector. Direct requests mark unnecessary planning, splitting, and review steps as skipped. Because the trace is part of `ChatTurn`, it is saved in local history and carried in Mac-to-iPhone turn updates.

Response actions reflect the actual engine state. Retry controls are omitted from every response card while a request is active, preventing overlapping retry attempts. After a failed or cancelled Rivune mode phase, an unanswered contribution card derives its terminal message from the trace: **Contribution did not begin**, **Contribution did not finish**, or **Contribution was not produced**. It no longer presents a permanent “Waiting” state after execution has ended.

`TogetherTrace` remains optional for history and transport compatibility. The bridge still sends the original `CouncilStage` values: planning and contribution map to `asking`, review maps to `comparing`, integration maps to `synthesizing`, and terminal states remain `complete`, `failed`, or `cancelled`. No new `CouncilStage`, envelope kind, or protocol-version change is required, so histories without the trace and peers that ignore the extra optional turn field retain the existing coarse progress path.

Coordinated Rivune mode has a separately negotiated capability version, currently version 2. Mac readiness advertises the supported version, iPhone enables Rivune mode only on an exact match, every Rivune mode request carries that version, and the Mac rejects a mismatch with an update-both-devices error. This preserves the existing bridge envelope and coarse stages while preventing two app versions from silently running different collaboration semantics. Persistent cross-provider consent stores the approved workflow version too, so changing the workflow invalidates old “Always allow” consent and displays the current disclosure again.

## Secure Mac-to-iPhone bridge

### Discovery and operating scope

Rivune uses Network.framework rather than Multipeer Connectivity. The Mac advertises Bonjour service `_alloy-bridge._tcp`; iPhone browsing begins only after the user deliberately pairs, keeping the local-network privacy prompt contextual. The legacy service type is intentionally unchanged so previously paired builds remain discoverable. `includePeerToPeer` is enabled, but the current product contract is still same-local-network operation.

Discovery is not authentication. The Bonjour service name is a random per-pairing service identifier, and a discovered endpoint is usable only with the associated credential. Rivune exposes no unauthenticated HTTP server, generic command endpoint, router port, internet relay, or cloud rendezvous service.

The Mac app must be open and the Mac awake. The iPhone app should remain in the foreground for discovery and requests. The current implementation has no background helper or wake-on-demand path.

### Pairing and credential rotation

1. **Begin pairing:** the Mac generates a random 32-byte PSK, random identity, and random service identifier. The credential remains in memory and is encoded into a QR/manual payload with a 120-second expiry.
2. **Validate locally:** iPhone accepts only the supported payload version, a valid service UUID, correctly sized credential material, and a narrow future expiry.
3. **First authenticated connection:** both devices connect using TLS 1.2 with `TLS_PSK_WITH_AES_128_GCM_SHA256` through Network.framework.
4. **Rotate inside TLS:** the Mac generates a fresh reconnect PSK and identity, sends them through the encrypted temporary connection, and waits.
5. **Commit by acknowledgement:** iPhone saves the new credential in Keychain and returns an encrypted `pairingAccepted` message. Only after that acknowledgement does the Mac save the matching credential in Keychain.
6. **Reconnect:** the Mac restarts its listener with the durable credential. The temporary QR credential is no longer accepted. Revoking pairing stops transport and removes the saved credential.

Saved bridge credentials use Keychain generic-password records with this-device-only accessibility after first unlock. They are not copied into Rivune's conversation JSON.

### Wire protocol

Bridge messages are Codable JSON envelopes preceded by a four-byte big-endian length. A frame must be non-empty and no larger than 1 MiB. Unknown protocol versions are ignored. Before a progress or final update is sent, Rivune measures the fully encoded envelope and adaptively clips answer text with 4 KiB of headroom. It preserves provider identity, provenance, timing, completion state, and all three Rivune mode answer objects; attachments already present on the phone are omitted from an update only if more space is needed.

Typed messages cover:

- Pairing credential rotation and encrypted acknowledgement.
- Provider readiness request/response.
- Prompt request with mode, context, attachments, model, and effort.
- Progressive turn/stage updates and final completion.
- Cancellation by request identifier.

Mac remote execution is capped at two concurrent requests. Recent final results are cached by request ID so a duplicate request can receive its prior result rather than starting another provider run. Connection callbacks are identity-guarded so cancelled or superseded listeners, browsers, and connections cannot mutate current state. A pending TLS handshake has a ten-second timeout. The iPhone refreshes a request watchdog on every update; its 630-second standard and 930-second Ultra windows add 30 seconds beyond the Mac's 600/900-second model limits. If the Mac still stalls, the phone cancels the remote request and records a visible retryable failure. A send failure tears down the active link so normal disconnect recovery runs instead of silently stranding the request.

iPhone merges progressive updates by turn and answer identity. If a later fitted bridge frame contains a shorter copy of an answer already received, Rivune retains the longer earlier content; it also retains local attachments when an oversized update omits their redundant echo. This prevents a completed contribution from shrinking or disappearing as later Rivune mode phases add more data to the same turn.

These measures provide authenticated, encrypted local transport and basic duplicate-request handling. They do not claim a formally verified protocol, remote relay security, background-delivery reliability, or a separate cryptographic replay protocol beyond TLS and app-level request IDs.

## Persistence

Conversations are encoded as JSON in the app's Application Support directory. The store records:

- Conversation and turn identifiers, title, preview, timestamps, and selected mode.
- User prompts and selected UTF-8 text attachments.
- Coordinated contributions and the combined answer, provenance, timing, errors, and explicit pending, complete, failed, cancelled, or interrupted execution state.
- The optional Rivune mode trace (`TogetherTrace` internally): current collaboration phase, finalized shared plan, ChatGPT review, Claude debate response, and failed phase.
- Favorite and archive state.

The store keeps a recovery backup when replacing the history file. Legacy answerless turns left by a stop, crash, or older build are migrated to a visible interrupted state with retry; successful and failed legacy turns retain their inferred outcome. iOS applies platform data protection. There is no cloud sync. Recent-turn context can be disabled without deleting visible history.

Evaluation history is separate: `evaluations.json` and
`evaluations.backup.json` contain at most 40 runs, with every answer bounded to
240,000 UTF-8 bytes. They include the prompt, frozen configuration, blind
mapping, three candidate results, full Rivune turn/trace, errors, selection or
abstention, and timestamps. Both files are owner-readable/writable only on
supported filesystems; they are still local JSON, not end-to-end encrypted
records. The recovery copy is replaced before the canonical copy. A UI delete
first persists the post-delete collection and commits the in-memory removal
only after that succeeds, so the deleted prompt is removed from both copies.

Bridge credentials are separate Keychain items. The short-lived QR credential is memory-only on Mac; only the post-acknowledgement reconnect credential becomes durable.

### Rename compatibility

Rivune migrates identity without abandoning data written by earlier builds:

- New preferences use `rivune.*`; a one-time migration copies values from the
  former `alloy.*` keys only when a Rivune value does not already exist.
- New history is written under `Application Support/Rivune`. The loader also
  reads and imports the former `Application Support/Alloy` primary and backup
  files.
- New bridge credentials use `com.aaravshah.rivune.bridge`; the Keychain loader
  can copy forward the former `com.aaravshah.alloy.bridge` item.
- macOS and iOS bundle identifiers remain `com.aaravshah.alloy.mac` and
  `com.aaravshah.alloy.ios` so Rivune reuses the existing app container and can
  migrate its data. Because the bundle filename changed, `Rivune.app` and an old
  `Alloy.app` can both remain in Applications; the old app bundle should be
  removed only after verifying Rivune, without deleting the shared container.
  The Bonjour protocol type remains `_alloy-bridge._tcp` so paired versions
  remain discoverable.
- `IntelligenceMode.together` keeps serialized raw value `Together`, and the
  combined `AnswerSource.alloy` keeps serialized raw value `Alloy`. The source
  names are legacy compatibility details; both display as Rivune concepts.
- Existing adapter and preview identifiers beginning with `alloy.` remain
  stable IDs. They are not presented as the current product name.

These retained values must not be mechanically renamed without a versioned
history, defaults, Keychain, and bridge migration.

## Capability limits

Implemented scope is text chat, the premium composer controls, the current two-provider Rivune mode collaboration, local history, text attachments, the provider/council configuration foundation, and the same-network phone bridge. Rivune does not currently provide:

- Import of ChatGPT/Claude histories, account memory, Projects, custom GPTs, Claude Projects, or Artifacts.
- Image or video understanding, AI camera input, live two-way voice conversations, image generation, Deep Research, or native consumer-app connectors. Composer dictation and the iPhone pairing-code scanner are supported but are not multimodal model inputs.
- Web browsing, MCP/plugins, repository edits, arbitrary shell actions, or autonomous tool use.
- API or custom-provider execution, editable provider catalogs, arbitrary CLI execution, or arbitrary runtime councils. The registry can discover and describe additional known CLIs, but a reviewed adapter remains mandatory before execution.
- Token-by-token CLI streaming. Results arrive at the end of each individual CLI process, while Rivune mode and bridge stage updates can still appear progressively.
- Cloud sync, internet relay, sleeping-Mac operation, widgets, Shortcuts, Live Activities, or a background helper.
- An automated Evaluation Lab judge, fixed benchmark corpus, rubric scoring, cryptographic provider blinding, confidence intervals, or statistically significant superiority claims.

“All features” is treated as a capability matrix: a feature is shown as working only when its provider path, permissions, failure behavior, and security boundary exist. Sharing a subscription or terminal client does not expose every proprietary consumer-app feature.

## Verification status — 2026-09-02

Verified in the current workspace:

- Rivune Mac tests and the generic iOS Simulator build succeed with the installed Xcode Beta toolchain after adding the final-answer-first transcript, collapsed Decision Record, contained Markdown tables, native Chat Options menu, six-section Settings navigation, provider-catalog-driven rows, and non-invoking trusted-path CLI discovery.
- A fresh account-backed live Mac run completed the current symmetric-review coordinator: Codex plan draft, Claude plan challenge, both assigned contributions, two independent peer reviews grounded in the partner work, and Codex final integration. The persisted turn reached `complete`; its clean result contained exactly five features, three launch risks, and one recommendation. The visible cards reported **GPT-5.6 Sol · Extra High · 28.8 sec**, **Opus · Automatic · 62.1 sec**, and **GPT-5.6 Sol · Extra High · 280.5 sec** for the integrated answer.
- A prior live Mac run completed the earlier seven-request coordinator and independently validated the installed CLI boundary.
- The prompt requested a fictional **Moonwhistle Robotics Club** single-file HTML page. It divided HTML/content from CSS/accessibility, required explicit conflict resolution, limited the integrated artifact to fewer than 80 lines, and prohibited external assets.
- The returned artifact was a complete 44-line, 1,938-byte HTML document. Inspection confirmed inline CSS, no external asset URLs, and accessibility hooks for skip navigation, `:focus-visible`, and labelled primary navigation. The final result reported **GPT-5.6 Sol · Ultra · 523.1 sec**, so the extended Ultra process window was exercised live beyond the superseded five-minute limit.
- All **67/67 deterministic Mac XCTest cases pass**. The suite includes trusted CLI search paths, exact executable discovery without process launch, third-provider presentation without false execution support, and honest authentication-versus-adapter states in addition to the bridge, orchestration, persistence, privacy, Markdown, migration, and Evaluation Lab coverage.
- A real ChatGPT request passed the complete structured prompt envelope.
- A single adversarial tool-disable test against the installed Codex CLI attempted to read a unique sentinel through a shell tool. The run emitted no tool event, did not reveal the sentinel, and returned the expected unavailable marker. This result is version-specific defense-in-depth evidence, not proof of an OS-hard sandbox.
- The QR/manual pairing UI was exercised; the implementation enforces the 120-second expiry.
- A standalone pathological bridge-budget regression verified that a 2,400,718-byte encoded Rivune mode result is fitted to 1,013,257 bytes while preserving all three answer objects and completion semantics.
- The repository includes the open-source website, a checksum-backed source ZIP, and separate universal macOS 26+ local-preview and public-release DMG paths. The website does not publish an ad-hoc app. Public packaging writes its artifact only after Developer ID signing, notarization, stapling, and Gatekeeper assessment pass.

Not yet verified:

- Real-device request relay and returned results. The physical iPhone remained saved as paired but showed offline/unavailable throughout the successful Mac run.
- Real-device behavior across varied routers, local-network permission changes, sleep/wake, and disconnect/reconnect cycles.
- OS-hard containment of all possible child-process descendants.
- The optional Claude retry after a failed or leaking Codex integration has deterministic coverage but was not exercised in the successful live run because the first integration passed.

Relevant platform and provider references:

- [OpenAI Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Anthropic Claude Code model configuration](https://code.claude.com/docs/en/model-config)
- [Apple TN3213: Moving from Multipeer Connectivity to Network framework](https://developer.apple.com/documentation/technotes/tn3213-moving-from-multipeer-connectivity-to-network-framework)
- [Apple TN3179: Understanding local network privacy](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy)
