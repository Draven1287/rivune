# Proposed first configurable-team slice

Status: concrete implementation proposal after installed617; schema agreement requested from adapter owner. No team runtime/UI integration performed yet. Existing617 source/test/render/install evidence remains frozen and unchanged.

## Outcome

The next Council run can use a saved team of two to six distinct entries, including several entries using one supported CLI, with a user-selected orchestrator. Each entry's route/model/reasoning remains attributable through drafting, synthesis, cancellation, restart and retry. This is an app execution limit, not a provider-account quota or a recommendation that larger teams are better.

Keep the current text-only Codex CLI and Claude Code CLI adapters. Do not enable Auto, Swarm, arbitrary executables, cloud accounts or new provider routes as part of this slice. Traycer reuse is a separate component review; no code import or replatforming is needed to establish this seam.

## Shared schema proposed for agreement

Use Foundation-only versioned Codable/Hashable/Sendable values in `Rivune/TeamConfiguration.swift`:

| Type | Fields and rules |
| --- | --- |
| `TeamRouteReference` | `transportID`, `providerID`, `adapterID`: registered opaque strings. No executable paths, credentials or guessed account identity. Multiple-connection routing is deferred rather than inventing a connection ID. |
| `TeamMemberConfiguration` | `memberID`: UUID string created once for an entry; `displayName`; `routeRef`; optional `requestedModelID` and `requestedEffort`. Editing options preserves the entry ID; duplicating an entry creates a new ID. Identical route/options are permitted for different IDs. |
| `TeamOrchestratorFallback` | `.stop` or `.orderedMemberIDs([String])`. IDs must be unique, belong to the frozen team and exclude the selected orchestrator. No automatic new member/model. |
| `TeamExecutionLimits` | Persist app-owned maximum members, draft concurrency, per-route concurrency, input/output byte bounds and maximum length repairs. The app enforces hard ceilings independently of serialized values. Preserve current112KiB/240KiB and one length repair. Per-route concurrency initially1; global Council process gate initially2. These are conservative local limits, not known account capacities. |
| `SavedTeamConfiguration` | `schemaVersion=1`, preset UUID, display name, members, orchestratorMemberID, fallback and limits. One editable saved team is enough for this slice; a preset library can follow. |
| `TeamRunConfiguration` | `schemaVersion=1`, immutable copy of members, orchestratorMemberID, fallback, workflow and limits. Initially only Council is admitted. A later schema/adapter extension can admit Swarm without making it available now. |

The orchestrator is one selected team entry and contributes its own independent draft in this first slice. Its later synthesis is a distinct call after drafting. UI roles remain orchestrator/member; no mandatory third consolidation role. Selecting an orchestrator is a preference, never a claim that it is the smartest model.

Runtime options are derived solely from each frozen member. New request validation rejects participant identity/options that disagree with its saved team entry. Unknown resolved model, resolved effort, usage and account capacity stay unknown. Model/effort options must match evidence exposed by the registered adapter; unsupported explicit identifiers fail before execution instead of silently becoming defaults. Nil is an intentional account default whose resolved model may change between attempts and must be disclosed.

## Smallest integration order

1. **Types, validation and storage.** Add versioned team values and a small atomic storage helper separate from conversation/run journals. Reject malformed files, duplicate IDs, unknown orchestrator/fallback IDs, unsupported workflow/routes/options and over-budget configurations. Do not overwrite unreadable team storage. Isolated previews/tests use injected or memory-only storage and do not touch a real team preset.
2. **Admission and identity.** Add optional frozen `teamConfiguration` to Council request/record. Add optional `routeRef` to new participant identities while keeping existing `id` as the member ID. Add a Council-specific submit path that validates the selected team and freezes the complete configuration before appending/publishing the run. Keep old direct/Together entry points intact. Remove new Council's hard-coded one-Codex/one-Claude construction and route-ID/member-ID equality assumption.
3. **Execution and retries.** Schedule independent drafts by member ID with a shared cancellation-aware gate (two total Council calls, one per route across active Council runs). Keep the frozen prompt/context identical and do not share peer drafts before completion. Select the saved orchestrator rather than rotation; it must have a successful independent answer and fit full synthesis input. If unavailable/failed, stop or try only the explicitly ordered eligible fallback entries, recording each appointment and reason. Failed-member retries reuse successful drafts and request only the failed stable member with its frozen options. Terminal word-budget repair failures keep617's no-retry decision.
4. **Compact team control.** After runtime tests pass, add a composer Team control showing entries with provider/model/reasoning and a clear orchestrator choice. Save the reusable team separately, and show that composer edits affect later requests only. Use supported options/readiness evidence and label unavailable choices. Repeated CLI entries remain distinct rows. The final record disclosure names the actual member and its requested options, including an explicitly used fallback. No Auto/Swarm activation.

Legacy Council records with nil `teamConfiguration`/`routeRef` continue using the explicit legacy route resolver and disclosed rotation behavior. Their original transport-based IDs, outputs and lack of new validation claims remain unchanged. Do not manufacture a new team snapshot for old history. Legacy retry is covered separately from new configurable-team retry.

## Recording-transport acceptance before UI or live calls

- Two same-route members with different supported model/effort options receive two independent requests and uniquely keyed results. Identical options with different member IDs remain separate too.
- Editing/saving the composer team after submit cannot change in-flight configuration; restart/retry retains exact member/route/options and successful drafts. Only a failed member repeats.
- The selected orchestrator receives all successful complete drafts in its separate synthesis call. Its own draft sees no peers. `.stop` and ordered fallback enforce the saved policy; no unlisted provider/model is called.
- Unknown options, duplicate IDs, stale unsupported explicit settings, malformed storage and invalid limits fail before journal mutation or provider calls. Nil defaults remain explicitly unresolved.
- Cancellation while queued or running releases gate capacity, launches no late member/synthesis, preserves completed work and never permits late final overwrite. Global/per-route in-flight counts respect local caps, including two simultaneous Council runs.
- Legacy records decode/render/retry without ID migration or retroactive team/budget claims. Existing Together/direct/artifact behavior stays intact.
- Existing length receipt/repair/retry tests pass for configurable teams and selected/fallback orchestrators; complete original outputs survive.

Use the installed617 rollback and old recordings as preservation references. No new live evaluation, install, or quality claim follows merely from these tests. The first implementation handoff should state the exact schema, adapter admission evidence, test counts and remaining UI/live boundaries before expanding further.

## Coordination

Native owner sent this schema proposal to the adapter/worker task after617 UI release. Agreement is required before shared integration. The worker task's optional Swarm effort-forwarding correction is not bundled into this Council slice; it can consume the agreed member/route seam later without enabling tools. Reuse recommendations for Traycer require a pinned component-level source/license/dependency review first.

### Adapter agreement received

The adapter owner agreed the v1 naming/seam and nil-routeRef legacy path. Required invariants are now explicit: all member IDs are nonempty and unique; orchestrator and unique fallback IDs resolve within frozen members; the full routeRef tuple matches the registered transport independently of member identity; a new team snapshot derives participants/options and rejects conflicting duplicate serialized identities. Unsupported explicit model/effort cannot become nil. Per-route serialization is local policy, and distinct routes may still share an unknown account quota. A selected orchestrator with a failed draft follows the saved stop/fallback policy. No Swarm source changes are included; the separate Traycer component review does not block this foundation.

## Installed native checkpoint — 2026090618

The configurable Council foundation and native Team composer are installed in `/Applications/Rivune.app` (0.2 build2026090618). Detailed immutable source/test/install/rollback evidence is in `qa-artifacts/team-foundation-20260906/build-0618/REVIEW.md`. Native Team saves, member/orchestrator editing, repeated CLI identities, custom menu rendering and actual other-app activation dismissal were checked;276 native tests pass. Journal corruption and freshness defects were independently closed for checkpoint4. Swarm/Auto and broader registered provider adapters remain explicit next milestones, not delivered functionality. No new live provider evaluations were run.
