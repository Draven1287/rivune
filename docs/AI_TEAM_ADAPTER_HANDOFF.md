# Proposed: team identity and adapter contract

Status: proposed interface handoff, not implementation or availability evidence.
Date: September 6, 2026 (local)
Decider/integration owner: Update Rivune product direction. Preserve current 0617 QA scope.

## Context and inspected evidence

- `RivuneRunCoordinator.swift:131–132` constructs two participants with transport IDs as member IDs; `:191–196` retry requires identity.id == transportID. This prevents independent same-route members.
- `CouncilRunner.swift:4–19` already records requested model/effort and optional resolved model; participant options are separate from identity and must not diverge. Current lead choice is rotation, not a selected orchestrator.
- `TerminalAIService.swift:54–76` exposes text and elapsed time only. Its route/options interface accepts model and effort; Codex receives `--model` and `model_reasoning_effort`, Claude receives `--model` and `--effort` (`:288–323`). These are existing source paths, not live execution verified in this review.
- `ProviderRegistry.swift:577–649` parses Codex model-cache metadata (bounded, under seven days old) and Claude help. Both filter through known enums. Claude effort advertisement is not a verified per-model matrix. This is neither universal model discovery nor proof of account entitlement. No supported usage/account concurrency metadata is exposed here.
- `SwarmWorkerFoundation.swift` separates task UUID and parent identity, but has no member ID or effort. `SwarmTextWorkerAdapter.swift:29` passes effort:nil. This remains staged-text execution with tools disabled, not native delegated/tool-enabled Swarm.

## Proposed contract

| Identity/configuration | Meaning |
| --- | --- |
| memberID | Stable opaque ID for one team entry, independent of provider, route or display name. Two identical configurations may still be distinct members. |
| routeRef | Existing registered transport ID plus provider/adapter IDs and an opaque connection reference if multiple connections are later supported. Never executable paths or credentials from model output. |
| requestedModelID / requestedEffort | Frozen optional adapter-supported identifiers. Nil means provider default, not a known resolved value. |
| orchestratorMemberID | Exactly one selected team entry, with explicit saved fallback policy (stop or ordered eligible member IDs). |
| runID / taskID / attemptID / parentMemberID | Run, logical assignment, individual execution attempt, and assigning member. A member's independent draft and later orchestration are separate sessions. |
| resolvedModelID / resolvedEffort | Optional execution observations with provenance; stay unknown unless the runtime returns them. |

Freeze a versioned `TeamRunConfiguration` containing entries, orchestrator ID, workflow, fallback policy and limits at admission. Derive runtime options from each frozen entry; reject any mismatch rather than keeping two conflicting option copies. Council draft results, retry lookup and UI disclosure key by memberID; transport lookup keys by routeRef only. Two members on one CLI must not collapse into one participant.

Retry uses the saved member, route and exact requested model/effort, never current composer choices. A replacement orchestrator is a separately recorded appointment, not an in-place identity change. If a route or explicit option is no longer supported, retain work and fail with a clear explanation rather than silently selecting defaults. A nil model/default can resolve differently on retry; disclose that limitation. Legacy records keep their original IDs and behavior through an explicit decoder/migration path; do not reinterpret transport IDs as a new configurable team.

### Minimal compatible Swarm effort correction (implemented in isolated foundation; not integrated)

Implemented `var requestedEffort: String? = nil` on `SwarmWorkerTask`, forwarded as `TerminalRunOptions(model: request.task.modelID, effort: request.task.requestedEffort)`. Historical records without the key decode as nil; scheduler requests, repairs and attempt receipts retain it. Explicit settings require an exact `SwarmTextWorkerSelection` in an immutable-per-instance app-supplied admission list; the default empty list permits only nil/nil defaults. No capability discovery or UI wiring was added. Proposed later: optional memberID and routeRef through a versioned compatibility path rather than deriving member identity from provider or task ID. Existing parentLeaderID is not a substitute for the executing memberID.

Validate explicit model/effort pairs against the adapter's available capability evidence before launch; unsupported or unknown explicit settings must not be silently dropped. Nil remains intentional default. Future child delegation must receive its frozen selected member configuration; parent configuration is not implicitly inherited. This correction alone does not enable Swarm tools or agents.

## Options and trade-offs

Recommended: reuse the registered route/options seam with new member IDs and a frozen team contract. Low transport churn; requires coordinated persistence and retry migration.

Rejected: use model+route as member ID. It collides for duplicate configurations and changes identity when preferences change. Rejected: rewrite existing adapters or enable native agents in this increment; neither is needed to establish team identity and both expand the permission/testing scope.

## Capacity and evidence boundaries

Several members sharing a CLI generally share its configured account limits; separate member IDs do not create separate quotas. The current interface exposes no account-level concurrency allowance, remaining usage, pricing or resolved reasoning. Keep those unknown. Bound app concurrency globally and conservatively per configured connection, without presenting those local limits as provider limits. On throttle/failure retain attributable work; do not rotate accounts automatically or retry indefinitely. CLI inference locality must not be inferred from the local process.

Metadata should record source, observation time, advertised options and evidence level separately from authenticated readiness and successful execution. Unknown options require adapter support, not arbitrary argument interpolation. No provider calls, credential inspection, clone/import, installation or source integration occurred for this handoff. Subsequent user correction: the intended project is **Traycer**, https://github.com/traycerai/traycer. See AI_TEAM_DIRECTION.md for the corrected documentation/license findings; component selection and reuse remain subject to a separate source audit.

## Acceptance before integration

1. Recording transport: two members on one route with different models/efforts produce two requests and separately keyed results.
2. Failed-member retry preserves exact original options and only repeats that member; changing the composer has no effect.
3. Selected orchestrator receives both full drafts; dual-role independent draft precedes access to peers; saved fallback policy is enforced.
4. Legacy decode, restart, unavailable options, duplicate IDs, member limits and cancellation retain correct identities and outputs.
5. Swarm effort survives old/new decoding and one repair; resolved values remain nil without runtime observations.
6. Separate tool-worker acceptance must establish project isolation, child receipts, cancellation, actual checks and integration before Swarm availability.

Native owner should agree the shared identity/configuration schema first. No shared runner, store, UI or test source was changed in this review; this document is the sole added artifact. These are proposed acceptance tests, not tests run here.

## Isolated effort follow-up verification

Under the subsequent bounded implementation assignment, only SwarmWorkerFoundation.swift, SwarmTextWorkerAdapter.swift, scripts/SwarmFoundationChecks.swift and this handoff were edited. Native owner confirmed no overlapping edits and no Xcode registration of these files.

Standalone Swift 6 compilation and execution passed **33 checks**, including legacy missing-key decoding, new option round trips, exact model/effort forwarding for both recording routes on original and repair, saved attempt options, unknown resolved model, and unsupported/missing-capability rejection before transport. Existing nil/default route, cancellation, staging and fixed printf process checks also pass. Command: `swiftc -swift-version 6 Rivune/SwarmWorkerFoundation.swift Rivune/SwarmTextWorkerAdapter.swift scripts/SwarmFoundationChecks.swift -o /tmp/rivune-swarm-foundation-checks`, then run that executable.

This is a test-double runtime compilation, not an app/Xcode build or live CLI acceptance. The admission list must be supplied by a future reviewed native capability layer; it is not itself provider evidence. No model calls, installs, shared team/UI changes or Swarm activation. Tool-enabled execution, native agent delegation and exact provider-resolved effort remain unverified.
