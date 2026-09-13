# Independent review of the iPhone remote audit — September 7, 2026

Verdict: **accept the audit as an accurate bounded source assessment; current phone remote is not release-ready.** The 12 frozen files match `qa-artifacts/phone-remote-audit-20260907/source-manifest.json` by SHA-256 and byte count. No source was changed, no app was launched, and no socket, account, provider, simulator, or physical device was used.

The source supports the audit's central conclusion: encrypted local pairing and legacy direct/Together requests exist, but the phone does not control the current durable Mac workspace. Council, saved Team/manager state, Mac history/projects, selected generated-file continuation, durable reconnect/resume, exact route admission, complete artifact retrieval, and away-from-home transport are absent.

## Release-blocking findings

### P1 — requested model and displayed provenance can describe different executions

`BridgePromptRequest` carries legacy Codex/Claude model and effort fields, but `BridgeReadiness` advertises only provider readiness and the legacy Together workflow version. On the Mac, `executeRemoteRequest` constructs options from the phone, then `RouteMappedTextRunner` maps the nominal CLI route to the Mac's current route. When that route is an API, it replaces the phone options with account defaults. For a CLI run, `routeDescription` uses the Mac's current local model setting rather than the model carried by the phone request.

The phone can therefore request model B while the Mac executes an API default or displays provenance derived from local model A. The current protocol has no requested-versus-resolved execution receipt. This must fail closed before provider dispatch until the handshake advertises admissible route/model/effort tuples and the response records requested and resolved values separately. Unknown remains unknown; no paid API fallback may be implicit.

### P1 — Mac host admission can silently discard malformed or oversized request content

The normal Mac workspace validates a 16KiB prompt, no more than six attachments, and a complete encoded attachment context before submission. `handleRemoteRequest` performs none of these checks before creating `remoteGenerationTasks`.

For attachments, `independentPrompt` substitutes `[]` when `preparedAttachmentContext` rejects the documents, so an invalid or oversized remote document can disappear while the provider still receives a call. For a remote prompt large enough that the protected `user_request` alone exceeds the 112KiB JSON payload, `jsonPayload` returns `{}`. The wrapper can then reach the provider without the user's request instead of rejecting it. The one-megabyte transport frame limit does not replace semantic host admission.

Add host-boundary tests that send 16KiB and one-byte-over prompts, seven attachments, a per-file overflow, aggregate encoded overflow, escape-heavy data, and malformed context. Every invalid case must produce an explicit response with zero provider calls and preserve the phone draft/request identity.

### P1 — request-ID reuse has no immutable request binding

The Mac returns `remoteResultCache[request.id]` before comparing prompt, turn, mode, attachments, context, or execution options. A paired client that reuses an ID for different content can receive the cached result for the earlier request. In-flight duplicate IDs are simply ignored. The cache is process-memory-only and capped, so it is neither durable idempotency nor conflict detection.

Bind every client idempotency key to an immutable request fingerprint. A matching duplicate returns the same durable run; a conflicting duplicate returns an explicit conflict with zero calls. Persist coordinator state and revisions so dropped acknowledgement, reconnect, navigation, and restart do not create duplicate billable work or return an unrelated answer.

### P1 — disconnect and navigation cancel work instead of detaching observation

Mac link loss cancels every `remoteGenerationTask`; iPhone disconnection marks the active turn failed. New Chat and conversation selection call `cancelGeneration`, which sends cancel when an ID is active. This cannot provide remote continuity. Remote work must run through the durable Mac coordinator; disconnection and navigation should detach observation, while explicit Stop alone requests cancellation and receives an acknowledgement.

## Confirmed product boundaries

- Current Council and Swarm rejection is honest. Legacy Together and the optional older `providerPlan` encoding do not establish current Team execution.
- The outer protocol silently ignores unsupported versions. Capability negotiation must complete before Send becomes available.
- Project instructions/files and selected generated artifacts are absent from the wire. A future design must separate explicitly approved project instructions from untrusted project-file contents and preserve per-request consent.
- Large prose can be clipped to fit. Artifact-shaped results may intentionally refuse clipping and disconnect when oversized. Complete artifacts need a digest-checked catalogue/chunk retrieval path.
- TLS 1.2 PSK with AES-128-GCM, 120-second temporary pairing, a fresh reconnect credential, Keychain storage, Bonjour discovery, and one active connection are present in source. They do not prove a physical-device session, background behavior, cellular access, or distribution.
- The source targets iOS 26. Simulator compilation is compatibility evidence only; supported devices, provisioning, installation, local-network permission, lock/background behavior, and real Mac/iPhone reconnection remain untested.

## Acceptance order

First define a versioned capability and command contract around the durable Mac coordinator. Then close host admission and immutable idempotency, route/model/provenance fidelity, Team/Council serialization and admission, revision-based resume/cancel acknowledgement, and complete artifact retrieval. Run deterministic recording tests before sockets. After Mac and iOS builds pass on a frozen source set, perform a physical same-network test with exact build IDs. Away-from-home relay, wake behavior, TestFlight/App Store distribution, and recurring infrastructure cost remain separate increments.

This review does not reopen accepted 0620 behavior or the 0621 compact-layout crash work.

