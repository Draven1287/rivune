# Independent review V2 — corrected Rivune build 2026090623 source candidate

Verdict: **accepted as the bounded frozen source candidate.** The original API-provenance rejection in `INDEPENDENT_REVIEW.md` remains part of the audit trail; the exact corrected staging source closes that finding. This review verifies source and does not itself verify a later installation. It does not revoke the user's existing authorization for verified local app updates. Public signing, packaging, deployment, publication, and spending remain separate.

## Corrected provenance

The corrected source no longer treats a readiness-probe model as the requested or resolved model for a later generation.

- API answer provenance now says `response model unavailable`.
- A non-nil cached probe model is separately introduced as `connection check: <model>`.
- Startup route descriptions use only the `connection check` label.
- When no probe model is available, answer provenance does not invent one.
- CLI provenance continues to label model and reasoning values as requested values.

The same distinction is implemented for OpenAI and Anthropic. The exact regression assertion expects `OpenAI API · response model unavailable · connection check: my-api-model` and explicitly rejects the word `resolved`. The corrected owner `SOURCE_REVIEW.md` accurately states that the probe value is separate from response-model evidence.

This closes the prior P1 provenance finding without claiming that the checked model was frozen for dispatch or reported by the generation response.

## Consolidated route and execution verdict

The original review's accepted findings remain valid in the corrected frozen source:

- The phone receives the Mac-admitted Codable routes and must echo the applicable route when sending.
- The Mac requires current readiness and exact route equality. Missing, stale, changed, or fabricated routes are rejected before provider dispatch.
- The request fingerprint binds the encoded route fields as well as request content, context, attachments, model choices, and effort choices. Matching duplicates reuse the active or cached result; conflicting reuse does not dispatch again.
- The accepted route is captured for the direct run. Together receives a request-scoped route mapper, preventing a connection refresh from changing transport midway through the collaboration.
- API routes receive account-default runtime options, so CLI-only aliases and reasoning controls do not cross into API execution. CLI routes retain the admitted requested options.
- Semantic input admission, typed role history, project-instruction authority, selected-document separation, complete-file artifact continuation, and zero-call invalid-input rejection remain intact.
- The accepted Codex CLI receipt V2 source remains unchanged at SHA-256 `884d1af71174edf0a8bc3955fa8d4f82f75f177d9e561a1e3ac183516f0f7cd9`.

No P1 or P2 finding remains in the exact corrected staging candidate.

## Exact frozen identity

Reviewed source root: `/private/tmp/rivune-phone-descriptor-0623.bXGPu5`.

The corrected manifest at `/private/tmp/rivune-artifacts-0623-corrected/source-manifest.json` lists eight files, and all eight staging hashes matched. The three provenance-delta hashes are:

- `Rivune/RivuneStore.swift`: `5931ae7e2ab0ef28ce1cff71c675837c0fbdfaf8e4c33f39db2b3d4e423d111f`
- `Rivune/StartupReadiness.swift`: `a470feb3005982325403a27d46f99d6b77ca3a1838263a0f5201612ff7831195`
- `RivuneTests/StartupReadinessTests.swift`: `2c5ed93b2dcb28280f969097bb2818302b4db863b6fe85e2f37ea266ff2ff072`

The corrected patch SHA-256 is `23a6640e14b942692aba60758e4f6032246e31e717456ee706d5a18e40eaf17c`. The corrected source receipt is `/private/tmp/rivune-artifacts-0623-corrected/SOURCE_REVIEW.md`, SHA-256 `ae921c87e111a446baa19d889c3c96002fed0ff9bdd9f94e05caf94617579263`.

## Verification evidence

Existing Xcode results were inspected rather than rerunning passing suites:

- Focused corrected result: `/private/tmp/rivune-dd-0623-provenance-local/Logs/Test/Test-Rivune Mac-2026.09.07_06-52-34--0600.xcresult` — 40 passed, zero failed, zero skipped.
- Full corrected result: `/private/tmp/rivune-dd-0623-full-corrected/Logs/Test/Test-Rivune Mac-2026.09.07_06-53-41--0600.xcresult` — 323 passed, zero failed, zero skipped.

The corrected `verification.json` records successful macOS and generic iOS Simulator Release builds and 47 browser contracts. Those build exits remain owner-recorded in this focused delta review. The browser contracts had also been independently rerun against the preceding 0623 merge as 27/27 workspace plus 20/20 account; the provenance-only delta does not touch browser source.

## Remaining gates

Before building or installing, the native owner must verify that every final build input matches the accepted frozen hashes. This is a technical identity check within the existing authorized local-update workflow, not a request for fresh user consent. The shared-file read limitation encountered during this re-review is recorded separately in `LOCAL_FILE_READ_ISSUE.md` and prevents a claim that every shared file was re-read after the correction.

Physical-iPhone pairing, disconnect/reconnect continuity, account-backed CLI/API execution, comparable conversation quality, actual requested/resolved API model evidence, provider request IDs, service tier, finish reason, billing metadata, Developer ID signing, notarization, packaging, deployment, and publication remain unproven. The installed app remains build `2026090622` until a separately reviewed installation step.

No provider request, account action, source/UI edit, app launch, installation, deployment, or release action was performed during this re-review. These two review receipts are the only files added.
