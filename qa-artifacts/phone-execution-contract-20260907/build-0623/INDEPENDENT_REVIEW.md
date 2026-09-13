# Independent review — Rivune build 2026090623 source merge

Verdict: **reject pending one provenance correction.** The seven-file source merge has valid identity and the phone route-admission design is acceptable, but the candidate currently presents an earlier API readiness/configuration model as though it were evidence about the model resolved for the generated answer.

This verdict is limited to source/merge acceptance. The installed app remains the accepted local build `2026090622` and is unaffected.

## P1 — API answer provenance implies a resolved generation model that was not observed

`RivuneStore.executionDescription` reads `apiProbes[provider]?.modelID` and places it directly in the provenance attached to a completed API answer. If that cached probe field is absent, it emits the literal `Resolved model unavailable` (`RivuneStore.swift` lines 1171–1185). `StartupReadiness.routeDescription` uses the same model source and fallback (`StartupReadiness.swift` lines 94–100). `SOURCE_REVIEW.md` then says that API answers show the model verified by the Mac probe.

The probe establishes that a configured model identifier was accessible during an earlier non-generation check. It does not observe the model that handled this generation. The OpenAI and Anthropic response parsers do not capture or validate a resolved model field. The existing candidate tests reinforce the ambiguous label `my-api-model · API` but do not prove resolved-model identity.

This matters for the user's model-quality comparisons: a provenance label beside an answer must distinguish the configured/requested model from a model actually reported for that response. The current fallback wording strongly implies that a non-nil probe value is the resolved model, which the available evidence does not support.

### Required correction

- If provenance continues to use only the cached probe, label it explicitly as `previously checked configuration model <id>; model requested and resolved for this run unknown` or equivalent. Do not imply that the stale probe describes the current dispatch.
- Do not call the probe value a resolved model in source, tests, or `SOURCE_REVIEW.md`.
- If the label is meant to identify the model requested for this exact run, capture that API configuration at admission and ensure the same frozen model value is used both to build the provider request and to create provenance. A cached readiness probe alone is insufficient.
- Add direct tests of API answer provenance for both a present probe/configuration model and a missing value. Each must state that the resolved model is unknown.

No route or provider call is required to close this wording/evidence issue.

## Accepted route-execution behavior

The actual host execution path otherwise satisfies the bounded phone contract:

- Readiness advertises a route only for a currently ready provider.
- The phone stores and echoes the advertised route. ChatGPT, Claude, and Together cannot send when their required advertised route is absent.
- The Mac rechecks readiness, requires the request route to equal its current admitted route, and rejects missing, stale, changed, or fabricated routes as `incompatibleExecutionRoute` before provider dispatch.
- The complete request, including both optional routes, is covered by the existing sorted-JSON SHA-256 request fingerprint. Matching in-flight/cached reuse and conflicting-ID rejection remain intact.
- After admission, the exact request route is copied into local constants and used for the direct run. Together uses a request-scoped `RouteMappedTextRunner`, so later connection refresh cannot change transport within that run.
- An API route is sent to the exact API adapter with `.accountDefault` options, preventing CLI model aliases or reasoning settings from crossing into API execution. CLI routes retain the phone's admitted model and effort choices and label them as requested values.
- The role-aware history, project-instruction authority, document/artifact separation, semantic size limits, zero-call invalid-input rejection, and V3 complete-file artifact contract remain present.

The Codex CLI receipt V2 production file is byte-identical to the independently accepted V2 candidate, SHA-256 `884d1af71174edf0a8bc3955fa8d4f82f75f177d9e561a1e3ac183516f0f7cd9`. Its opt-in, fail-closed, privacy, token-bound, and unresolved-metadata boundaries are unchanged.

## Independently verified identity and tests

- `source.patch` SHA-256 is `9d850af27030be55c97ce3a67dd01165452b5d3f36c1b627d60b46f8f1ebd7a8`, matching `source-manifest.json`.
- All seven current shared files match their manifest SHA-256 values exactly.
- The patch contains exactly the seven declared file headers: the project file, `TerminalAIService.swift`, `ProviderRegistry.swift`, `Models.swift`, `RivuneStore.swift`, `StartupReadiness.swift`, and `RivuneDeterministicTests.swift`.
- The retained Xcode result at the path in `verification.json` independently reports `Passed`: 323 passed, zero failed, zero skipped, on arm64 macOS 27.0.
- Browser contracts were independently rerun: 27/27 workspace and 20/20 account, for 47/47 total.
- `verification.json` records 24 focused native fixture tests, a successful Mac Release build, and a successful generic iOS Simulator build. No raw focused-test or build logs/exit receipts are present in this artifact directory, so those three exit claims remain owner-recorded rather than independently reconstructed here. The full readable 323-test result includes the focused tests.
- `/Applications/Rivune.app` still reports version `0.2`, build `2026090622`, executable SHA-256 `8c541ff94c8662117d4c4e4763d3c9a0f648411ae8fa220dbdda3a68becfc8eb`.

## Remaining product evidence

After the provenance correction, acceptance would cover the frozen source merge only. Physical-iPhone pairing, disconnect/reconnect behavior, a real account-backed CLI/API run, comparable conversation quality, resolved model identity, provider request IDs, service tier, finish reason, billing metadata, installation of 0623, Developer ID signing, notarization, packaging, deployment, and publication remain unproven.

No provider request, account action, source/UI edit, installation, deployment, or release action was performed during this review. This review receipt is the only file added.
