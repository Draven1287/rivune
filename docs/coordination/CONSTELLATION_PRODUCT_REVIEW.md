# Constellation product semantics review

Date: September 9, 2026  
Scope: read-only review of the current desktop frontend and canonical Rust host. No app source, build, server, desktop process, provider, or release operation was changed.

## Product conclusion

The current product is an honest first version of **Constellation using a Council workflow**: the user chooses two to six ready provider connections and one lead; members answer independently; the selected lead combines the answers. The host freezes that team with the admitted request and preserves observable events, member answers, and the lead resolution.

The current runtime does not discover exact provider models or reasoning settings. It accepts only provider-managed defaults and records the resolved model and effort as unknown. It also does not run Swarm or automatically select a strategy or lead. Those are later capabilities, not defects in the current manual Council experience.

## What is supported now

| Journey | Current support | Source-backed boundary |
|---|---|---|
| Form a team | Two to six distinct ready provider connections | The frontend saves provider IDs with `modelID` and `effortID` set to `null`; the host accepts two to six unique provider/model/effort routes. |
| Choose a lead | The user explicitly chooses one selected member | `TeamSelection.leadIndex` is validated and the lead selection must match the admitted primary model selection. No automatic appointment reason exists. |
| Run Constellation | Council is the only wired strategy | The canonical host constructs every Constellation session with `manual_strategy: Some(TeamStrategy::Council)`. Swarm support inside the generic state machine is not wired into the product host. |
| Follow progress | Member, phase, state, role, summary, and error events | The public run projection exposes observable run activity without private reasoning or invented percentages. |
| Inspect results | Independent member answers, lead synthesis, review state, and final answer | The projection is explicitly Council-shaped and binds the resolution to the selected lead. |
| Stop or recover | Active cancellation and persisted failed-run cancellation | `cancel_run` cancels active work or a persisted Constellation recovery checkpoint. |
| Retry a partial failure | The native host can retry the exact failed invocation while preserving completed work | The command and failed invocation identifiers are exported by the native host, but the current TypeScript adapter/parser/UI do not expose them yet. This is a frontend wiring gap, not new orchestration work. |

## Smallest next slices

| Order | Slice | Supported now | Required change | Acceptance evidence |
|---:|---|---|---|---|
| 1 | Make partial recovery usable | The host publishes `failedInvocationID` and `failedAttemptID`, exposes `retry_constellation_invocation`, and preserves successful member results. | Extend the TypeScript run contract and bridge adapter; show one retry action on a failed Constellation run. No Rust orchestration change is required. | A failed member is named; completed answers remain visible; **Retry failed answer** calls the exact saved invocation once; cancel remains available for an uncertain recovery. |
| 2 | Present one clear Council result story | The final answer, selected lead, member results, resolution, and activity already exist. | Refine the current desktop presentation so the final answer is primary and one disclosure contains the team and observable progress. No host change is required. | The user can identify the deliverable, selected lead, saved partial work, and next valid action from one run card. |
| 3 | Make the current strategy explicit in durable history | The installed host always runs Council for Constellation today. | Add a versioned executed-strategy field to the admitted/public run contract before the host gains another strategy. Do not infer historical strategy once multiple strategies exist. | A saved run reports `Council` from host data after restart; the UI never displays Swarm or Automatic for a Council run. |
| 4 | Support exact model and reasoning members | The DTO already has member-level `providerID`, `modelID`, and `effortID`, and it can distinguish two routes from one provider when those selections differ. | The Rust resolver currently rejects every non-null model or effort with `MODEL_CAPABILITIES_UNKNOWN`. Add qualified catalog discovery and resolution before enabling frontend selectors or same-provider members. | The catalog reports verified choices and effective resolution; the admitted run freezes each exact member; unknown defaults remain labeled unknown. |
| 5 | Add an appointed-lead policy | Manual lead selection is complete and deterministic. | Add a host-owned appointment result containing the selected member, concise reason, policy version, and explicit fallback behavior. | The proposed lead is based only on known capabilities or a disclosed deterministic fallback; user override is frozen; unavailable leads never change silently. |

The first two slices are the smallest useful next release because they expose functionality the native host already has. Model selection and automatic lead appointment should not block them.

## Requires a host contract or orchestration change

- **Durable strategy identity:** the checkpoint contains Council internally, while the public `HostRun` exposes only `mode: "constellation"`. A public strategy field is needed before strategy can vary.
- **Exact model and reasoning selection:** the structural DTO exists, but the catalog contains no models and the resolver rejects explicit values. A UI-only model picker would fabricate support.
- **Automatic lead appointment:** only a user-selected `leadIndex` is persisted. A reason, policy version, and fallback require new host-owned data.
- **Same-provider multi-member teams:** the Rust structure permits unique provider/model/effort combinations, but provider-default-only resolution makes two members from one provider duplicates today.

These are planned capability increments. They should not be labeled critical defects in the current manually configured Council release.

## Unavailable until runtime discovery or qualification

| Capability | Why it remains unavailable |
|---|---|
| Named models and reasoning levels | The current catalog reports an empty model list, unknown catalog state, and provider-managed defaults with unknown effective model and effort. |
| Automatic strategy routing | No runtime classifier, recorded decision contract, or qualified fallback policy is wired into the host. |
| Swarm execution | The product host hardwires Council. Generic state-machine support and tests do not prove a wired, permissioned, artifact-producing Swarm runtime. |
| Council-then-Swarm workflows | No admitted phase plan or product-host execution path records or runs such a sequence. |
| Capability-based lead recommendation | Provider availability does not establish comparative model capability or answer quality. A recommendation would need discovered capabilities and a disclosed policy. |

## Concise user-facing labels for the current release

Use labels that describe the behavior the host actually provides:

- Closed composer control, direct mode: **Single AI**
- Closed composer control, configured: **Constellation · 2 AIs**
- Expanded title: **Constellation**
- Strategy line: **Council · independent answers combined by your lead**
- Lead row: **Lead · Codex CLI**
- Member model detail: **Provider default · exact model not reported**
- Lead helper: **You choose which AI combines the answers.**
- Unavailable message: **Constellation needs two ready AI connections.**
- Unavailable action: **Review connections**
- Partial result: **Constellation paused — 1 of 2 answers saved.**
- Partial action: **Retry failed answer**
- Unsupported strategy detail: **Swarm is not available in this version.**

Do not display **Automatic**, a model name, a reasoning level, or **Swarm** as active unless the admitted host record supplies and verifies it.

## Source evidence

- `prototypes/ai-native-workspace/src/host/Constellation.tsx:6-35` — provider-level configuration, manual lead, provider-managed defaults, and explicit Swarm-unavailable copy.
- `prototypes/ai-native-workspace/src/host/Constellation.tsx:38-60` — current run disclosure, member results, resolution, and unknown-model label.
- `prototypes/ai-native-workspace/src/host/teamConfiguration.ts:13-22` — distinct providers and null model/effort selections.
- `prototypes/ai-native-workspace/src/host/contracts.ts:3-27` — member-shaped team DTO and observable run events/results; retry identifiers are not parsed.
- `prototypes/ai-native-workspace/src/host/tauriAdapter.ts:30-40,87-126` — current workspace bridge omits Constellation retry.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:91-110` — model and team selection DTOs.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:2881-2911` — team size, unique-route, and lead validation.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:2914-3002` — empty model catalog and provider-default-only resolution.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:3005-3054` — product host hardwires Council.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:1720-1915` — persisted cancel and exact failed-invocation retry admission.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:3706-3777` — public member projection, resolution, and failed invocation IDs.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:5414-5485` — native cancel and retry commands.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/desktop-host.mjs:73-78` — native browser bridge exports the retry method.

## Review boundary

This is a source audit. It does not claim a rendered desktop acceptance run, successful live provider responses, real Swarm execution, automatic routing, comparative answer quality, or release readiness. The browser-only Constellation experience remains a labeled synthetic demonstration and is not evidence of native runtime behavior.

Reviewed source hashes:

- `HostWorkspace.tsx` — `d81e12bb9d6fbc9c91c73b7b8b5291c292b1b8b9c117a0def43e2408d72fb86d`
- `Constellation.tsx` — `6744ee9b6b68a628321ba35aecdc889748dfe5cf2a661b43b644b9857f9bd5c6`
- `teamConfiguration.ts` — `1144b8537ebee1755f608b9bf06e5edf3c8505f9a05c8dc6cb4039304bd4e131`
- `contracts.ts` — `a682ae474610ca5d7d9019ef702ccfe8a62b6949f1ba09d887817e6f31fbee7f`
- `host.rs` — `3d12ecf2e423f77caabfde3bc7f07297511c56a9054d97cac96603a88d3228b5`
- `team_strategy.rs` — `f972a09dc3a905bcd55eccc18415be7948f19282ecd2080c40e8d4b522942a64`
