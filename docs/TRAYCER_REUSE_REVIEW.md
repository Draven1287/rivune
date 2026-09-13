# Traycer reuse review

Status: read-only, bounded source review; recommendations, not integration approval.
Reviewed September 6, 2026 local / September 7 UTC.
Pinned repository: [traycerai/traycer, 76459f8d3ed5151a0d946c9dd2d5ec2260bc956d](https://github.com/traycerai/traycer/tree/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d), commit timestamp 2026-09-07T02:38:09Z.

## Recommendation

Keep Rivune's Swift execution layer. Adapt three narrow contract/algorithm ideas below, with attribution if translating code. Do not import the full TypeScript CLI/protocol stack expecting it to supply working provider adapters. The inspected public CLI delegates execution to a Host; its client contracts are valuable, but do not establish that the relevant Host implementation is available to reuse here.

No clone, source import, dependency installation, upstream script/test execution, provider call, or shared Rivune source change occurred. Tests below were inspected, not run. API tree response was non-truncated and contained clients/protocol, but no `host/` or `traycer-host/` tree. This is a boundary finding for this revision, not a claim about every Traycer repository or distribution.

## 1. Model-catalog matching without changing saved selections

**Code confirmed:** [model-slug-resolution.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/protocol/src/host/agent/gui/model-slug-resolution.ts) implements exact match first, then optional canonical metadata match with ambiguity reporting. It scopes catalogs by harness and has a stale-catalog marker. Critically, matching an alias does not authorize replacing a saved explicit model selection with a floating alias.

**Tests inspected:** [model-slug-resolution.test.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/protocol/src/host/agent/gui/__tests__/model-slug-resolution.test.ts) asserts exact precedence, duplicate aliases, missing metadata, changed decoration, empty selection and harness scoping. Fixture model names are test data, not Rivune account availability evidence.

**Rivune fit:** highest-value small Swift translation: a pure resolver over Rivune capability rows with exact/alias/none and ambiguity. Preserve frozen requestedModelID and effort on retry; catalog metadata is not an execution-resolved identity. Tied rows may differ in capabilities, so do not use the first match blindly for effort admission.

**Cost:** low, relative to the other candidates: Codable/value types plus XCTest fixtures, no runtime JavaScript dependency. Still requires extending current enum-filtered catalogs deliberately; this helper alone does not discover models or forward settings to a provider.

## 2. Explicit child configuration and compatibility refusal

**Code confirmed:** [agent-create.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/clients/traycer-cli/src/commands/agent-create.ts) forwards separate sender ID, harness, model, reasoning effort, profile selection and workspace to `agent.create`; the response returns a new agent ID and warnings. Workspace parsing validates absolute paths and deduplicates entries. Its default GUI permission is `full_access`—do NOT copy that default into Rivune. An absolute directory binding is not a sandbox.

**Contract evidence:** [shared.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/protocol/src/host/agent/shared.ts#L431) separates agent identity from harness and versioned create/profile configuration. [profile-selection-compat.test.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/protocol/src/host/agent/__tests__/profile-selection-compat.test.ts) includes rejection tests when older contracts cannot represent explicit profile/permission choices. [agent-create.test.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/clients/traycer-cli/src/commands/__tests__/agent-create.test.ts) tests workspace parsing, not real child execution.

**Rivune fit:** implement native frozen memberID + routeRef + requested model/effort + parent/task/session IDs; fail rather than discard unsupported explicit settings. This supports several members on the same CLI. Keep approved permissions and work budget enforced by Rivune. Continue the already-agreed TeamRunConfiguration proposal rather than adopting Traycer's epic/profile vocabulary wholesale.

**Cost:** medium for contract/persistence migration; high for actual tool workers. Direct CLI reuse would additionally require its Host transport/auth stack, a compatible Host service, version negotiation, deployment and another process lifecycle. Request forwarding proves neither exact provider option application nor workspace confinement. No reusable provider launcher was established by this inspected path.

## 3. Correlated messages and explicit subtree-stop receipts

**Code confirmed:** [agent-send.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/clients/traycer-cli/src/commands/agent-send.ts) sends sender/receiver IDs and an expected-reply flag, and exposes a response correlation ID. [a2a-message-format.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/protocol/src/agent/a2a-message-format.ts) builds attributed envelopes and reply instructions, with a terminal inbox recovery hint. Its [tests](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/protocol/src/agent/__tests__/a2a-message-format.test.ts) check GUI/terminal envelope formatting, not delivery.

[agent-stop.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/clients/traycer-cli/src/commands/agent-stop.ts) sends an agent ID and cascade flag; displays the Host-returned stopped IDs. Its [stop tests](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/clients/traycer-cli/src/commands/__tests__/agent-stop-archive.test.ts) mock the RPC. Therefore actual descendant termination, authorization and prevention of post-cancel revival remain unverified here.

The [capability predicates and tests](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/protocol/src/host/agent/__tests__/a2a-capability.test.ts) distinguish sending tools from receiving messages: the inspected shared predicates permit TUI tool use for Claude/Codex/OpenCode but receiving only for Claude; GUI predicates differ. Do not translate those flags into universal CLI support in Rivune.

**Rivune fit:** native durable envelope with run/member/task/attempt/message/correlation IDs, bounded payloads, duplicate handling, and delivery status separate from read/reply status. Cancellation needs a parent-owned task tree and observed completion receipts, not merely a submitted stop command. Treat peer content as untrusted data, never permission to expand scope.

**Cost:** low for format concepts, medium for durable messaging, high for verified runtime cancellation across provider children. Reimplement atop Swift actors/process ownership; copying the envelope formatter does not provide a broker. [host-rpc.ts](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/clients/traycer-cli/src/internal/host-rpc.ts) imports authentication, credentials, WebSocket/versioned transport and shared client modules: not a standalone adapter.

## Council behavior: what this audit establishes

The pinned [README](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/README.md) describes parallel agents, model switching and peer communication. Inspected create/send/transcript/role contracts provide general coordination primitives. They do not implement or test Rivune's exact sequence: freeze one question, gather independent unseen drafts, then have a user-selected orchestrator synthesize with saved evidence/fallback.

That sequence could be composed over suitable coordination primitives, but its availability/configurability in Traycer is NOT established by this review. No project-wide absence claim is justified: Host implementation and broader workflows were not exhaustively audited. Keep Council independence, selected-orchestrator behavior and quality evaluation in Rivune's acceptance tests.

## Licenses and reuse gate

The pinned [root LICENSE](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/LICENSE) is MIT, copyright 2026 Traycer AI—not Apache. The [protocol manifest](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/protocol/package.json) and [CLI manifest](https://github.com/traycerai/traycer/blob/76459f8d3ed5151a0d946c9dd2d5ec2260bc956d/clients/traycer-cli/package.json) also declare MIT; the tree's LICENSE-path search found only the root file. Retain applicable copyright and permission notices for copied/substantially translated code. This is source-license inspection, not legal clearance for an entire product or branding.

The pure resolver has a type-only import; the message formatter has no imports. Native reimplementation of their ideas does not need their TypeScript runtime dependencies. Shared schemas use Zod; protocol pins 4.4.3 and its [published package LICENSE](https://unpkg.com/zod@4.4.3/LICENSE) is MIT, copyright 2025 Colin McDonnell. The full protocol additionally lists noble/curves, async-mutex, fflate, tldts, y-utility and yjs; CLI adds Sentry, commander, archive/network packages. Their entire resolved transitive license inventory was NOT reviewed. Full-package reuse is therefore not cleared by this audit; audit the lockfile-resolved dependency notices and any separately distributed Host before considering it.

## Next bounded step

Agree and test native team identity/options first. Optionally translate the pure resolver with attribution and native fixtures in a separate approved increment. Before any execution reuse proposal, locate the actual licensed Host/adapter implementation at a matching revision and inspect process-tree cancellation, permission enforcement and integration tests. Do not enable Swarm from these client contracts alone.
