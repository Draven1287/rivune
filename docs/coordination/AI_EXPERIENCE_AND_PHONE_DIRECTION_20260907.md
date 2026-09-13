# AI experience and phone remote direction — September 7

User request: chatting through Rivune should feel and work as well as the ChatGPT or Claude interfaces, plus a phone app for remote control. This is an acceptance goal, not a statement that the current implementation has parity. Continue the one-app manager/team direction and overnight pricing work.

## Verified current source gaps

- `Rivune/TerminalAIService.swift:260–320` disables Codex tools/browser/image generation/multi-agent and Claude built-in tools/customizations. It starts ephemeral/nonpersistent calls. Selected model/effort arguments are present, but arguments alone do not prove the effective response model or entitlement.
- `Rivune/RivuneStore.swift:1723` wraps direct chat as a text-only workspace and forbids tools. Prior conversation and user-selected documents are flattened as reference data with a blanket instruction not to follow instructions in either. Inspect multi-turn user preference continuity: legitimate earlier user requests need to remain usable without promoting instructions embedded in attached documents or model outputs.
- `conversationContext` at `RivuneStore.swift:2080` uses at most eight recent turns and a 12,000-byte budget. This is not full provider session continuity. Selected generated files have a separate exact-file contract and must not regress.
- `Rivune/PeerBridge.swift` contains native iOS/Mac local discovery and encrypted pairing; current phone bridge is not an internet remote product. `handleRemoteRequest` at `RivuneStore.swift:808` explicitly rejects current Council and Swarm. The phone audit records additional protocol, team and disconnect gaps.

These are source observations. Neither iOS compilation nor pairing code proves physical-device acceptance.

## Meaning of a comparable AI experience

1. Show the provider route, requested model and supported reasoning clearly; record effective identity when the provider exposes it. Unknown stays unknown. Never silently downgrade or invent an intelligence rank.
2. Preserve a conversation's actual user intent, follow-up corrections, selected files and project instructions across turns, restarts and device changes. Keep user-role instructions separate from untrusted document/tool/model content. Use a supported provider session or tested role-aware compaction with explicit context changes; a larger arbitrary history cap alone is not the solution.
3. Stream readable output and meaningful progress; support stop, error recovery and retained partial results without duplicate billable work.
4. Add supported web research, file/artifact work and bounded agent execution through deliberate capability negotiation and scoped permissions. Do not remove all tool restrictions in the existing text-only route as a shortcut. A visible permission/capability choice must correspond to actual backend behavior.
5. Keep Council members independent for their first answers while preserving the same legitimate user context. The lead integrates supported conclusions and unresolved uncertainty. Swarm needs real scoped workers and checked integration before activation.
6. Treat consumer ChatGPT/Claude interfaces, their CLIs and their APIs as distinct products. Login does not prove transfer of consumer history, personalization, connectors, proprietary prompts or every app feature. No claim of identical answers, automatic memory import or universal subscription entitlement.

Official OpenAI documentation describes app-server as the supported interface for rich clients, including conversation history, approvals and streamed events. Evaluate it for a deeper local Codex adapter before inventing a replacement protocol. [Codex app-server](https://learn.chatgpt.com/docs/app-server)

Claude's official CLI reference documents session resumption, model/effort controls and selective tools; its safe mode disables customizations. Evaluate a supported persistent/session-aware path with explicit permissions and exact version checks. [Claude CLI reference](https://code.claude.com/docs/en/cli-reference)

## Phone product

Default target is the existing native iPhone app. The Mac remains execution owner; provider credentials remain on the Mac. The phone controls Rivune tasks, not arbitrary desktop input.

First qualify same-network operation: explicit expiring pairing and revocation, select a Mac task, preserve manager/member model and effort descriptors, send messages, display streamed progress, stop, show exact artifacts and recover the same task after disconnect. Define offline/sleep/locked/older-client states visibly. Preserve request IDs and durable run state so reopening or reconnecting does not launch a duplicate job. Remote actions must honor the Mac's task permissions and not expand them.

Then add away-from-home transport as a separate increment: authenticated encrypted transport with a relay or explicitly configured private connection, device-scoped revocable credentials, replay protection and bounded requests. No port exposure, network deployment or service purchase is authorized by this planning document. The Mac must remain available for Mac-hosted execution; cloud execution while it is off is a different product and cost model. Price remote connectivity separately from hosted AI inference in the revenue analysis.

Native iOS simulator work and local build preparation may proceed. Distribution and physical iPhone pairing require their own actual acceptance; the user does not yet have paid Apple Developer membership. Do not advertise an App Store/TestFlight download as live.

## Delivery and tests

Native owner finishes the reproduced 0621 crash and accepted review build first. Accounts task finishes its bounded pricing handoff, then owns provider capability/session proposal or an isolated candidate with explicit file ownership. Root phone_remote_audit owns PHONE_REMOTE_AUDIT_20260907.md; reviewer independently checks frozen candidates. Keep one native UI controller.

Required evaluation scenarios: exact model/effort receipt; follow-up honoring an earlier user constraint while rejecting an instruction embedded in a document; conversation beyond eight turns; cancellation and restart without duplicated execution; fresh web question with a real source/tool receipt when enabled; exact file continuation; Council independence. Phone adds expired/revoked pairing, incorrect protocol, team round-trip, disconnect/reconnect to the same run, duplicate command, Mac unavailable, artifact integrity and real-device background/foreground behavior.

No live benchmark can be called clean until the current global-instruction-isolation and sanitized execution-receipt preflight blockers are resolved. Small automated diagnostics remain preliminary, not proof of general superiority or consumer-app parity.

## Independent phone review checkpoint

`PHONE_REMOTE_INDEPENDENT_REVIEW_20260907.md` accepted the 12-file frozen source audit. Four P1s are confirmed at source level: requested/resolved execution mismatch, missing host semantic admission that can discard request content, request-ID cache reuse without immutable-content binding, and disconnect/navigation cancellation instead of durable observation. After the current 0621 crash closure, prioritize explicit host rejection with zero provider calls and conflicting-ID rejection before adding remote features. Matching retries must preserve run identity; an in-memory fingerprint check alone is not restart/reconnect durability. The separate role-aware history candidate must coordinate shared-store integration with the native owner. Physical-device and live-provider outcomes remain untested.

## Current implementation checkpoint — build 2026090622

This checkpoint supersedes the earlier 0621 sequencing above. Build 0622 is installed with role-aware history and reported phone semantic admission and request-content binding fixes. Root verified its installed identity and 16 source hashes. The build records 309 passing native tests. Independent merged acceptance remains pending; an isolated candidate acceptance does not establish merged acceptance. The native owner retains shared source and UI control.

The next phone increment preserves the exact admitted route, model and reasoning selection through execution, rejects unsupported requests before dispatch, and prevents implicit CLI-to-API fallback. Durable runs and reconnect observation are still separate work; the current in-memory request cache does not provide them.

The accounts task now owns an isolated opt-in CLI execution receipt candidate with fixture tests. The receipt must distinguish requested settings from provider-confirmed values and retain unknown fields as null. Shared integration follows independent review. The official-docs research at `CLI_ISOLATION_RECEIPTS_RESEARCH_20260907.md` identified documented isolation configuration candidates but did not prove exclusion of all personal instructions. Live quality comparisons therefore remain blocked; no provider calls are authorized by this checkpoint.

The user-facing target is a comparable conversation experience: faithful model selection, useful context continuity, streaming, supported tools and reliable cancellation. Identical consumer-app answers, memory, subscriptions or features are not promised. The iPhone target remains control of the same Mac-owned tasks, first on the same network, with physical-device acceptance before a readiness claim.

## Current implementation checkpoint — build 2026090623

This supersedes the 0622 checkpoint. Build 0623 is installed. Root independently verified the installed binary SHA-256 `5880a08cb176567fcf2d8edd81ec7e37108d5073a90ef0f6d2ad551a299368cc`, deep strict local code signature, and semantic equality of all five saved user-data files with preinstall snapshots. Native regression receipt: 323 passing tests, plus 40 focused checks; root inspected those existing result summaries. This remains an ad hoc local review build, not a notarized public download.

Accepted behavior includes exact phone route admission, a frozen route for each run, no silent CLI-to-API switch, and honest requested-model labels. CLI execution receipts are opt-in and in-memory. The API does not expose a confirmed response model here, so the UI must keep it unavailable rather than repurpose a prior connection-check model.

Native-owner inspection covered the workspace and Account screen. Project navigation could not be independently completed because the computer-use service closed its pipe; one recovery attempt is exhausted. See `qa-artifacts/phone-execution-contract-20260907/build-0623/UI_INSPECTION_LIMIT.md`. This is an inspection limit, not a verified Rivune crash.

Phone durability remains isolated. Journal v3 passed root's 16-test run and ordinary real-file duplicate/restart checks, but root rejected a failed-initialization lease lifecycle that can permit competing journal owners. Accounts owns the narrow v4 correction; native owner maps host integration in parallel. V1–v3 are not integrated. The phone is not ready to advertise resumable background tasks, remote Council/Swarm, or away-from-home operation.

The next user-visible milestone is a phone disconnect that leaves the Mac task running and a reconnect that attaches to the same task without another provider request. The following quality milestone is a verified supported provider-session path with legitimate conversation continuity and scoped tools. Neither milestone can be established by model names or synthetic tests alone.

### Durable journal v4 accepted

Root accepted the isolated v4 foundation after independently verifying final source/test/contract/handoff hashes, running all 18 final tests with no warnings, and replaying real-file duplicate, restart, malformed/semantic failure, stale-owner cleanup and separate-process locking checks. See `qa-artifacts/phone-durable-journal-20260907/v4/INDEPENDENT_REVIEW.md`. This supersedes the v4-pending note above. The native owner may proceed with manual integration under existing authorization; actual phone/host lifecycle acceptance and physical-device checks remain outstanding. Installed0623 is unchanged.
