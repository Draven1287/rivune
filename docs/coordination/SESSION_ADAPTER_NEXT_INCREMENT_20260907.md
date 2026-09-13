# Session adapter next increment — 2026-09-07

**Status:** implementation-ready contract; zero provider calls; no source, authentication, configuration, or account changes.

## Decision

Add a versioned session runtime beside the current one-shot `AITextRunning` seam. The first increment supports direct ChatGPT/Codex and Claude conversations only. It gives each Rivune conversation a provider-owned session, streams normalized progress, preserves the admitted model and effort request, enforces a closed tool profile, and gives Stop a provider/process cancellation target.

Use two supported provider paths:

- **Codex:** a long-lived local `codex app-server --stdio` child process per session binding, initialized once per connection. Use `thread/start` for a new Rivune provider session, `thread/resume` after reconnect or process restart, `turn/start` for each user turn, streamed notifications for progress, and `turn/interrupt` for Stop. The tool profile is immutable for that binding, so a process launched with all tools disabled is never widened later.
- **Claude:** one `claude -p` child process per turn with persisted Claude Code sessions. Start with an app-generated UUID via `--session-id`; continue with `--resume <session-id>`. Use `--output-format stream-json --include-partial-messages` for events and remove the current `--no-session-persistence` flag. Stop cancels the owned process through the existing SIGINT/SIGTERM/SIGKILL ladder; a stopped session is resumed only after a fixture and one authorized live check prove the installed CLI retains a coherent session after interruption.

Do not replace the existing one-shot adapters in place. Register versioned routes so existing route receipts keep their meaning:

| Provider | New transport ID | New adapter ID | Existing fallback |
|---|---|---|---|
| Codex | `openai.codex-app-server` | `rivune.session.codex.app-server.v1` | `openai.codex-cli` / `alloy.terminal.codex` |
| Claude | `anthropic.claude-session-cli` | `rivune.session.claude.cli.v1` | `anthropic.claude-code-cli` / `alloy.terminal.claude` |

The new routes stay opt-in until their synthetic suite and the blocked live acceptance conditions below pass. There is no CLI-to-API fallback and no silent fallback from a session route to its one-shot route.

## Why this is the smallest supported increment

The installed implementation is intentionally one-shot:

- `AITextRunning.run` returns one buffered `TerminalRunResult` (`Rivune/TerminalAIService.swift:385-395`).
- Codex uses `exec --ephemeral --json`; Claude uses `--no-session-persistence --output-format json` (`Rivune/TerminalAIService.swift:588-655`).
- `TerminalProcessJob` writes stdout and stderr to temporary files and reads them after process exit (`Rivune/TerminalAIService.swift:972-1071`). It already owns cancellation and escalating signals (`Rivune/TerminalAIService.swift:1080-1107`).
- Direct execution constructs a single wrapped prompt, waits for the final result, then writes one answer (`Rivune/RivuneRunCoordinator.swift:207-285`). Stop cancels that task (`Rivune/RivuneRunCoordinator.swift:344-357`).
- Role-aware history is bounded to 16 messages/eight turns and 12,000 encoded bytes (`Rivune/Models.swift:930-946`; `Rivune/RivuneStore.swift:2446-2479`).

Codex app-server is documented as the rich-client interface for threads, turns, streamed item events, approvals, and interruption. Claude Code documents resumable print sessions, realtime `stream-json`, partial messages, model/effort flags, safe mode, restricted mode, and exact tool lists. These paths reuse the installed account-authenticated CLIs and avoid inventing a proprietary provider protocol.

An API migration is larger and has different account, billing, and entitlement behavior. Claude Managed Agents is beta and API-key/cloud based. Neither is part of this increment.

## Shared adapter contract

Add these concepts as concrete Swift value types; names may change, semantics may not.

```swift
enum SessionContinuation: Codable, Hashable, Sendable {
    case new(seed: ApprovedPromptContext)
    case resume(ProviderSessionIdentity)
}

struct ProviderSessionIdentity: Codable, Hashable, Sendable {
    let providerID: String
    let transportID: String
    let adapterID: String
    let opaqueSessionID: String
    let adapterProtocolVersion: Int
}

enum ProviderToolProfile: Codable, Hashable, Sendable {
    case none
    case readOnlyWorkspace(canonicalRoots: [String])
}

struct SessionTurnRequest: Sendable {
    let localRunID: UUID
    let conversationID: UUID
    let route: AIExecutionRoute
    let continuation: SessionContinuation
    let currentUserMessage: String
    let options: TerminalRunOptions
    let toolProfile: ProviderToolProfile
}

struct SessionTurnHandle: Sendable {
    let localRunID: UUID
    let session: ProviderSessionIdentity
    let opaqueProviderTurnID: String?
    let events: AsyncThrowingStream<ProviderSessionEvent, Error>
}

protocol AISessionTextRunning: Sendable {
    func startTurn(_ request: SessionTurnRequest) async throws -> SessionTurnHandle
    func stop(_ handle: SessionTurnHandle) async
}
```

`ProviderSessionEvent` is an allowlisted enum rather than raw JSON:

```swift
enum ProviderSessionEvent: Sendable {
    case sessionStarted(ProviderSessionIdentity)
    case turnStarted(providerTurnID: String?)
    case textDelta(String)                 // display preview only
    case progress(kind: String, label: String?)
    case toolStarted(idHash: String, kind: String)
    case toolFinished(idHash: String, kind: String, succeeded: Bool)
    case usage(input: Int?, cachedInput: Int?, output: Int?, reasoning: Int?)
    case rerouted(from: String?, to: String?, reason: String?)
    case completed(finalText: String, receipt: SessionExecutionReceipt)
    case interrupted(partialText: String?, receipt: SessionExecutionReceipt)
    case failed(code: String?, message: String, receipt: SessionExecutionReceipt)
}
```

Contract rules:

1. `startTurn` returns after the provider acknowledges a session/turn, before completion. Every event carries the local run association internally; adapters reject events whose session or turn identifiers do not match the active handle.
2. Sequence numbers are monotonic per handle. Exactly one terminal event is accepted. Late deltas and duplicate terminal events are ignored and counted in a private diagnostic.
3. `textDelta` is a replaceable preview. Only `completed.finalText` becomes an `AIAnswer` and provider session history. Interrupted partial text may be retained visibly as **Stopped draft** but is never labeled a completed answer.
4. `SessionExecutionReceipt` retains requested model/effort, route identity, hashed provider session/turn/item IDs, known event names, usage fields when documented, terminal state, hashes/byte counts, CLI/parser versions, and null for unavailable resolved-model, request-ID, tier, finish-reason, or billing evidence. Raw prompts, answers, stderr, unknown payloads, paths, and tool output stay out of shareable receipts.
5. A model/effort value is admitted against the same fresh capability snapshot used for the route. It is sent on every turn. It remains labeled **requested** unless a documented event confirms an effective or rerouted model. Unknown stays unknown.
6. A binding is keyed by `(conversationID, providerID, transportID, adapterID)` and includes the hash of its frozen tool profile. Never share one provider session across Rivune conversations, providers, direct/Council lanes, changed profiles, or changed adapter versions.
7. Persist a binding only after session start is acknowledged. Persist `lastCompletedLocalTurnID` only after the authoritative completion event. A stopped or failed request is never automatically resubmitted; retry requires a new local run ID and an explicit user action.
8. If the binding is missing, corrupt, belongs to a different route, or cannot resume, show **Provider session unavailable — start a new provider session**. Do not silently seed a replacement session and call it continuity.

## Role and context rules

For a new provider session, Rivune sends one frozen seed generated from the already admitted `ApprovedPromptContext`, followed by the current user request. The seed preserves these authority levels:

1. current user message;
2. explicit prior user-role messages, with later corrections winning;
3. separately approved project instructions;
4. assistant messages, selected documents, artifacts, tool output, and legacy references as untrusted reference.

The existing `ApprovedPromptContext` structural limits and selected-artifact validation remain the admission gate. The session adapter must not rebuild context from the mutable conversation after admission.

After the provider session starts, each later Rivune user message becomes one new provider user turn. Do not resend the rolling eight-turn wrapper on every resumed turn; doing so duplicates history and can promote quoted role labels. This removes the eight-turn continuity ceiling for turns created after the provider-session binding.

For existing Rivune conversations, the first session turn is honestly labeled **Context seeded from Rivune history**. It does not claim that prior turns were imported into ChatGPT or Claude history. Codex `thread/inject_items` could later import native role items, but it is outside this smallest increment because it adds migration, deduplication, and provenance rules. Claude Code's documented CLI resume path does not document arbitrary historical role import.

Selected documents and exact artifact continuation remain per-turn inputs under the current `ApprovedPromptContext` and `ArtifactContinuation` rules. Their bytes are not turned into user-role history and are not mounted as provider-readable files in this increment.

## Tool permission profiles

Only two closed profiles exist. Catalog data and model output cannot construct flags, paths, commands, or tool names.

### `none` — default

- Codex: a per-binding app-server with restricted read sandbox rooted at a fresh empty task directory, network disabled, `approvalPolicy: never`, an empty MCP configuration, and the existing reviewed feature/tool disables at launch.
- Claude: `--safe-mode --restricted --strict-mcp-config --mcp-config <reviewed empty config> --no-chrome --disable-slash-commands --tools "" --permission-mode dontAsk`.
- Any tool item/request is recorded as denied or unexpected; no tool executes.

### `readOnlyWorkspace(canonicalRoots:)` — opt-in after focused fixtures

- Roots come only from user-selected Rivune project access, are canonicalized before launch, and are frozen into the run. Empty, relative, missing, symlink-escaping, or changed roots fail admission.
- Codex: a separate per-binding app-server that exposes only the reviewed read path, with `sandboxPolicy.type = readOnly`, restricted readable roots, no network, an empty MCP configuration, and `approvalPolicy = never`. Any write/network approval request receives a decline response and becomes a visible denied event.
- Claude: `--safe-mode --restricted --tools Read,Glob,Grep --permission-mode dontAsk`; launch in the primary canonical root and pass only the remaining admitted roots through `--add-dir`. `--restricted` is required so command/code and WebFetch tools are absent unless explicitly named.
- No Bash, edit/write, browser, web fetch/search, MCP, connector, skill, plugin, subagent, computer-use, or image-generation capability is enabled.

No interactive approval UI is added here. A request for a capability outside the frozen profile fails closed and shows **This session does not have permission to use that capability.** A later increment can add approval requests, but it must bind every grant to a local run/session, exact roots or network destination, scope, and expiry.

## Provider mappings

### Codex app-server v1

1. Launch one reviewed executable per frozen session/tool-profile binding in a fresh task directory with `app-server --stdio --strict-config`, explicit execution-affecting overrides, `-c 'mcp_servers={}'`, `project_doc_max_bytes=0`, and memories disabled. The `.none` process also receives the existing explicit feature/tool disables; the read-only process exposes only its reviewed read path. Do not change `HOME` or `CODEX_HOME`; authentication stays provider managed. Installed inspection on this date found `codex-cli 0.144.3` and local help for app-server stdio/config/feature controls.
2. Send `initialize` once with Rivune client name/title/version, then `initialized`. Do not opt into experimental APIs for v1.
3. On new session, call `thread/start` with the admitted requested model, tool-profile sandbox, approval policy, frozen cwd, and `serviceName: "rivune"`. Require a thread ID and store it as opaque.
4. Check the returned `instructionSources` before `turn/start`. Under the Rivune-isolated policy, any unexpected source path fails closed before a provider turn. This is useful model-free evidence but does not by itself close QE01 because product-required base instructions are not represented by file paths.
5. On continuation, call `thread/resume` with the stored thread ID and the same frozen policy. A missing/unreadable thread is an explicit session failure.
6. Call `turn/start` with one text input plus requested model and effort. Normalize `item/agentMessage/delta`, item lifecycle/progress, token usage, model reroute, and `turn/completed` notifications. The final accumulated `agentMessage`/completed turn is authoritative; delta concatenation alone is not.
7. Stop sends `turn/interrupt(threadId, turnId)` and waits for `turn/completed` with `status: interrupted`. If the server dies, mark the local turn interrupted and retain the last preview as a stopped draft.

Official support: [Codex app-server](https://developers.openai.com/codex/app-server) documents initialize, `thread/start`, `thread/resume`, `turn/start`, streamed item/delta notifications, model and effort overrides, restricted sandbox policies, approval requests, and `turn/interrupt`.

### Claude session CLI v1

1. Keep the existing reviewed executable discovery and safe environment. Installed inspection on this date found Claude Code `2.1.251`, whose local help advertises `--session-id`, `--resume`, `--output-format stream-json`, `--include-partial-messages`, `--model`, `--effort`, `--safe-mode`, `--restricted`, `--tools`, `--permission-mode dontAsk`, and `--strict-mcp-config`.
2. New session arguments start with `-p --session-id <app UUID> --output-format stream-json --include-partial-messages`; resume arguments replace `--session-id` with `--resume <stored ID>`. Never use `--continue`, because it can attach to the wrong conversation. Remove `--no-session-persistence`.
3. Apply the exact tool-profile arguments above, then the admitted `--model` and `--effort`. Do not configure a fallback model.
4. Parse JSONL incrementally with a UTF-8 byte accumulator. Require one consistent `session_id`. Normalize assistant content deltas as previews and the final result as authoritative. Unknown types are counted without copying payloads into a shareable receipt.
5. Stop cancels the owned process through `TerminalProcessJob`. The process must exit before the local turn becomes interrupted. Do not start a replacement process automatically.
6. If a stopped session does not resume coherently in the authorized live check, v1 marks that binding unusable after Stop and offers **Start a new provider session**. It must not claim resumable Stop.

Official support: [Claude CLI reference](https://code.claude.com/docs/en/cli-usage), [headless/print mode](https://code.claude.com/docs/en/headless), and [session management](https://code.claude.com/docs/en/sessions) document session IDs/resume, stream JSON, partial messages, model/effort controls, safe/restricted modes, exact tool selection, and retained CLI sessions.

## Source seams for implementation

This document does not assign or edit shared source. The eventual owner should keep the change narrow:

- `Rivune/ProviderRegistry.swift`: add the two versioned routes, session adapter registration, and declared capability profiles. Preserve the current compiled-registry authority and exact catalog validation.
- `Rivune/TerminalAIService.swift`: keep the current one-shot service; add a streaming process actor and the two session adapters. Reuse executable discovery, safe environment, size limits, termination ladder, receipt hashing, and fail-closed parsing.
- `Rivune/Models.swift`: add the opaque session binding, normalized event/receipt values, requested capability profile, and a stopped-draft field. Provider IDs are data, never executable/configuration authority.
- `Rivune/RivuneRunCoordinator.swift`: freeze the session request before journaling; consume events into the existing run; persist binding/last completed turn atomically; route `cancel(_:)` to adapter Stop; ignore late events by local run ID.
- `Rivune/RivuneStore.swift`: build the one-time seed from the admitted `ApprovedPromptContext`, show requested/effective/unknown identity honestly, and render preview/progress/stopped draft. Do not change phone transport in this increment.
- `RivuneTests/SessionAdapterContractTests.swift`: fixture-only test suite below.

The provider-session binding should live in a separate bounded local file such as `provider-sessions.json`, written atomically with a backup and schema version. Store opaque session IDs and route/capability fingerprints, not provider transcript contents. Conversation deletion removes the local binding; deletion of provider-owned session history is a separate capability and must not be implied.

## Synthetic test plan

All tests use fixture processes/transcripts and temporary directories. They make zero provider calls and read no real auth/configuration.

### Shared contract

1. New session persists exactly one binding for the exact conversation/provider/transport/adapter tuple.
2. Resume sends only the new current user message; the rolling eight-turn wrapper is not resent. Twelve sequential fixture turns retain one provider session ID and preserve a user constraint introduced before turn eight.
3. A document containing `SYSTEM:` or `ignore previous instructions` remains document/reference data. A later explicit user correction remains user authority. Exact artifact bytes and hashes survive session seeding and continuation.
4. Route, requested model, requested effort, cwd, and tool profile are frozen before dispatch. A changed catalog/readiness snapshot does not mutate an active turn.
5. Missing, stale, corrupt, cross-provider, cross-conversation, wrong-profile, or wrong-adapter bindings fail before process/turn launch.
6. Deltas update preview; only final text writes `AIAnswer`. Interrupted partial text is retained as a stopped draft. Duplicate/out-of-order/late events cannot mutate a terminal run.
7. Stop targets the exact handle once. A retry never reuses the stopped local run ID and is never automatic.
8. Unknown event payloads, stderr, prompt/answer bytes, paths, tool outputs, and session IDs do not enter the shareable receipt. Missing evidence remains null.
9. `.none` rejects every tool event/request. `.readOnlyWorkspace` admits read/glob/grep inside canonical roots and denies writes, Bash, network, browser, MCP, connectors, plugins, skills, agents, and symlink escapes.
10. Oversized line, output, prompt, event count, identifier, or final answer terminates fail closed and cleans temporary files/processes.

### Codex fixtures

1. Handshake ordering: requests before initialization and duplicate initialization are rejected locally.
2. `thread/start` and `thread/resume` responses must match the pending JSON-RPC request ID and contain the expected thread ID.
3. Unexpected `instructionSources` reject before `turn/start`; an expected empty/allowlisted manifest proceeds.
4. `item/agentMessage/delta` streams preview; completed agent item plus `turn/completed` commits final text.
5. `model/rerouted` is retained distinctly from requested model. Absence leaves resolved model unknown.
6. A write/network approval request under either v1 profile is answered decline and surfaced as denied; no capability expansion occurs.
7. Stop sends one exact `turn/interrupt`; completion status must be `interrupted`. Server EOF, malformed JSON-RPC, wrong IDs, or a normal completion after local Stop cannot become success.

### Claude fixtures

1. Initial argv includes app UUID and omits `--no-session-persistence`; continuation uses exact `--resume` and never `--continue`.
2. Both argv variants include requested model/effort and the exact safe/restricted/tool flags. Unsafe or catalog-derived flags are impossible to encode.
3. Fragmented multibyte UTF-8 JSONL reconstructs without replacement characters; partial messages stream and final result commits once.
4. Missing/changing `session_id`, malformed/unknown terminal result, nonzero exit, provider error, or tool use outside the profile fails closed.
5. Task cancellation sends the existing signal ladder, waits for exit, retains preview as stopped draft, and never launches a retry.
6. A fixture resume after interrupted output either produces a coherent next turn under the same session or marks the binding unusable according to the explicit provider result; it cannot infer continuity from process exit alone.

## Unsupported capabilities and honest UI

These adapters cannot inherit consumer ChatGPT or Claude app capabilities:

- consumer web/app conversation history, project spaces, pinned chats, memory, personalization, custom GPTs, Claude Projects, styles, or hidden system prompts;
- consumer connectors, browsing state, browser sessions, uploaded-file libraries, Canvas/artifact editors, voice, image generation, scheduled tasks, notifications, sharing, or proprietary citations;
- consumer subscription feature parity, message limits, priority, effective model routing, plan entitlements, billing details, or identical answers;
- cloud execution or remote continuation while the Mac is asleep/off; Claude Remote Control and Codex/ChatGPT remote/cloud tasks are different products;
- automatic migration or deletion of provider-owned sessions.

Use capability-derived copy:

- **Provider session on this Mac** when a binding is active.
- **Context seeded from Rivune history** for the first turn of an existing Rivune conversation.
- **Requested: <model> · <effort>** and **Effective model: unavailable** unless a documented provider event establishes more.
- **Tools off** or **Read-only project access: <roots>** from the frozen profile.
- **Streaming preview** until the authoritative completion event.
- **Stopped draft** for retained partial output.
- **Not available in this Rivune provider session** for unsupported capabilities.

Avoid **same as ChatGPT**, **same as Claude**, **full memory**, **all tools**, **synced history**, **resolved model**, **subscription included**, or any parity/superiority claim.

## Blocked evidence and acceptance gates

### QE01 remains blocked

Codex app-server returning `instructionSources` improves the model-free preflight, but it does not prove that the final authenticated request contains only Rivune's admitted bytes plus product-required base instructions. The documented `project_doc_max_bytes=0` and memories-disabled settings remain candidates until a supported diagnostic or reviewed recording boundary proves what is included. Claude `--safe-mode` documents exclusion of user customizations, while admin-managed policy and product-required base behavior can remain. A strict cross-provider clean-context comparison must keep QE01 blocked until those residual sources are characterized without a provider call.

### Live-provider acceptance remains blocked

After synthetic tests pass and a separate user authorization permits provider calls, run a bounded live matrix for each installed/version-pinned adapter:

1. start plus resume beyond eight turns, with an early user constraint and a malicious selected document;
2. exact requested model/effort receipt and honest unknown/resolved display;
3. observable first delta, progress events, authoritative final text, and malformed-stream recovery;
4. Stop during generation, no late success, no automatic retry, and an explicit follow-up proving or disproving coherent resume after Stop;
5. `.none` tool denial and read-only root allow/deny behavior, including write, network, and symlink escape attempts;
6. exact artifact continuation and provider-session separation across two Rivune conversations;
7. CLI upgrade mismatch and session-not-found behavior.

Passing fixtures establish parser and state-machine behavior only. Passing the live matrix establishes the narrow installed-version session path. Neither establishes consumer-app parity, general answer quality, account entitlement, phone reconnect durability, or superiority.

## Definition of done for this increment

The increment is ready to merge only when the two versioned routes are opt-in, the fixture suite above passes, existing one-shot and artifact tests remain green, unsupported profiles reject before provider work, shareable receipts contain no private payloads, and UI copy matches the capability state. It is ready for live use only after the authorized live matrix passes for the exact installed CLI versions. QE01 and consumer-app parity remain separately labeled and cannot be closed by these implementation tests.
