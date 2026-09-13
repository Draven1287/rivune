# Independent review — role-aware production candidate

Status: **changes requested.** The seven-file patch is reproducible and the five new production-path tests pass, but direct generated-file continuation loses its required response contract. Do not merge the candidate until that regression is corrected and recorded through both direct provider routes.

## Finding

### P1 — Direct selected-artifact requests no longer require a complete file manifest

`candidate/Rivune/RivuneRunCoordinator.swift` now creates every direct prompt with `RivuneStore.independentPrompt(userPrompt:context:)` (lines 207–211) and sends that prompt for direct ChatGPT or Claude (lines 259–266). The prior implementation used `ArtifactContinuation.independentPrompt` when a direct turn had a selected artifact. That method adds `ArtifactContinuation.instructions`, including the requirements to apply the requested edit and return exactly one JSON manifest containing every complete resulting file.

The new generic wrapper serializes `selectedArtifactReference` and calls artifacts untrusted reference, but it never includes those editing/output instructions. A provider can therefore answer in prose or return a patch, and the downstream generated-file parser will no longer receive the contract that the accepted continuation workflow depends on. The five new recording tests do not include a selected artifact, and the existing artifact tests assert snapshot transport rather than the presence of the provider-bound manifest instructions, so the reported 302-test suite can pass while this behavior regresses.

Required correction: when `selectedArtifactReference` is present on a direct ChatGPT or Claude request, preserve the role-aware authority envelope and include the exact `ArtifactContinuation.instructions` contract. Add a recording assertion for both direct routes that proves the selected revision is exact, the artifact remains untrusted reference, the current request remains highest priority, and the complete-file JSON manifest instruction reaches the provider.

## Verified candidate properties

- `role-aware-production.patch` dry-runs cleanly against `base/` and reconstructs all seven changed files byte-for-byte.
- Candidate Git blob identities match every blob listed in `HANDOFF.md`.
- After hydrating three macOS dataless asset clones, `base/` and `candidate/` differ only in the seven declared source/test files.
- An independent targeted Xcode run passed all five `RoleAwareProductionEntryPathTests`. It compiled the actual Mac target and recorded two direct calls plus the current Council two-draft-and-one-lead path.
- Typed history comes from `ChatTurn` fields; fake `USER:` content inside an assistant message remains assistant-role data. The encoder retains at most eight turns, 16 messages, and 12,000 encoded bytes.
- Native project submission separates approved project instructions from selected documents and resets `includeProjectContext` after a successful request.
- New Council records persist `ApprovedPromptContext`; retry validation requires the exact frozen context before provider work.
- Source inspection places the phone v2 context/legacy guard before remote task creation. The new phone test itself only round-trips a legacy request and does not record host rejection or zero provider calls, so phone execution acceptance remains source-level.

## Integration boundary

This is an isolated source candidate. It is not applied to the shared tree, installed app, or a physical phone. The shared `RivuneStore.swift` has newer phone admission and request-ID work than the frozen base; those changes must be merged intentionally before rerunning the complete Mac suite and Mac/iOS builds. Actual provider behavior and model quality remain untested.
