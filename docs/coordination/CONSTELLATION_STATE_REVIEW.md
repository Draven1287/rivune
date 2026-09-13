# Constellation state review

2026-09-09 · Independent source/test audit. Only this report was written. Current authority: `docs/RIVUNE_DESIGN_DIRECTION.md`; builder remains sole app writer. No private QA supplement accessed, no app build, native/browser launch, server change, provider call or cross-task handoff.

## Findings

### CLOSED — P2 terminal progress presentation (historical finding)

`src/host/Constellation.tsx:25-30` prints each member's latest event phase/state without considering the run's terminal status or identifying it as historical. Truncated or older progress is explicitly permitted by the DTO. A cancelled/failed/preserved run with a last memberStarted/running event consequently displays that member as running indefinitely.

Reproduced in memory using the existing `constellationContracts.test.mjs` fixture: set run status to cancelled, resolution to null, and the retained activity entry to memberStarted/running. `parseHostSnapshot` accepts it; the values used by the renderer are runStatus=cancelled, latest member state=running. No browser rendering is claimed for this reproduction.

Acceptance: show terminal run outcome plus “last recorded progress” for stale member events; do not invent individual success or cancellation. Add renderer cases for cancelled, failed and preserved runs with truncated/nonterminal member events, including one successful contribution and one failed/unknown member. Retain useful partial answers without implying a reviewed complete delivery.

### CLOSED for supplied identities — P2 saved attribution (historical finding)

`Constellation.tsx:28` shows role and provider ID but never modelID/effortID; line 31's member-answer disclosure shows only member-N. The parser preserves explicit model identities in admitted.team, but those identities are not exposed with the saved output. In-memory fixture with model-A/model-B parsed both values successfully; the component never reads modelID. With provider defaults, the DTO also lacks a resolved per-member model identity, so the frontend cannot establish which model actually answered.

Acceptance: associate each answer with its saved member role, exact provider ID and admitted model/effort where supplied. For null/default selection, say provider-managed default and resolved model unknown unless the public host supplies it. Do not substitute today's catalog labels/defaults for historical execution identity. Test same-label/different-ID providers and explicit distinct saved models. This is an attribution gap, not evidence of incorrect provider dispatch.

### CLOSED — P2 refreshed form (historical finding)

`Constellation.tsx:7-8` initializes ids/lead from props only once. `HostWorkspace.tsx:132` keys the component only by conversation ID. If the same conversation's saved team changes after refresh/conflict resolution, the summary uses the new team prop but checkboxes and lead remain the earlier local values. Saving then submits those stale choices. Controller CAS protects storage consistency, but it cannot infer that the stale form is unintended.

Reproduction for a focused renderer test: mount conversation C with team [A,B], lead A; refresh C to saved [B,C], lead C; expand options and compare summary/controls, then save. Current React state initialization predicts controls [A,B]/A. This was source-reviewed, not independently browser-reproduced. Also cover catalog removal while an unsaved selection exists; invalid hidden IDs should be explained before Save, not only rejected afterward.

Acceptance: synchronize a pristine form with saved team revision; if local edits exist, show an explicit conflict/reload choice rather than silently overwriting either version. Test catalog removal, changed lead, failed save/retry and same-conversation refresh.

## Verified strengths and test evidence

- Ran existing `node --experimental-strip-types --test tests/constellationContracts.test.mjs tests/hostController.test.mjs`: **32/32 passed**, zero failures. These are fixture/controller tests, not live provider or host runtime proof.
- Saved team tests cover exact lead selection and draft retention without submission, reopening the controller, stale catalog revision rejection, capability loss before admission, unavailable/auth-needed providers, duplicate providers, invalid lead and identical mutation retry after an uncertain save.
- DTO tests reject mismatched member/provider associations, duplicate results, cross-conversation and invalid sequence entries, unknown supplemental result fields, oversized text and nonlead synthesis reviewer. Canonical final answer stays separate from contributions. Older hosts may omit the detailed projection.
- Configuration deliberately supports distinct providers with managed model defaults only. `teamConfiguration.ts:18-20` rejects explicit model/effort or stale revisions during saved-team validation. This is bounded support, not arbitrary saved model-selection parity.
- Existing renderer test source covers configuration and successful saved contributions separately from final output. It does not close the partial-failure/terminal-history or refreshed-form cases above. Renderer tests were inspected, not run in this audit.

## Acceptance checklist

- [x] Terminal history presentation independently passes current isolated production-render tests.
- [x] Saved role/provider/model/effort attribution and unknown-default wording independently pass current isolated production-render tests.
- [x] Independent selected mounted recheck passes refreshed-form cases, including the three strengthened assertions; see latest checkpoint below.
- [x] Existing bounded DTO/controller suite passes independently; no broader execution claim.

Source paths above are relative to `prototypes/ai-native-workspace`. Checkpoint SHA-256 (source not frozen; later edits supersede findings):

| File under src/host | SHA-256 |
| --- | --- |
| Constellation.tsx | c03d5d195ad75ca9d7df1d9b5d8ec75b203a4fee8d1988e5384cf65157e09b0c |
| contracts.ts | a682ae474610ca5d7d9019ef702ccfe8a62b6949f1ba09d887817e6f31fbee7f |
| teamConfiguration.ts | 1144b8537ebee1755f608b9bf06e5edf3c8505f9a05c8dc6cb4039304bd4e131 |
| workspaceController.ts | d655d5d93b291514e2efe8fd4903340537af7602d1de3a6ccf61b7195a7b9bb8 |


## Current correction recheck — 2026-09-09

Read `CONSTELLATION_HOST_INTEGRATION_RECEIPT_20260909.md` and current production/test source. Independently reran own `qa-artifacts/constellation-state-review-20260909/projection.test.mjs`: **6/6 pass**, zero failures, `recheck-results.tap`. No app build, server/native/provider operations, or private supplemental evidence used.

**Findings 1 and 2 closed at public frontend projection scope.** Production `ConstellationRun` now marks terminal member events as historical, preserves partial answers, reports saved member errors/absent final answers, and places saved role/provider/model/effort beside output. Null models explicitly remain unresolved provider defaults. This does not establish real runtime model identity for defaults; the receipt explicitly lists per-member model choices as an unimplemented runtime capability.

**Finding 3 is no longer an outstanding source defect.** Production configuration now tracks savedKey/baseKey/dirty state, loads pristine changes via an effect, blocks conflicting saves, offers Load saved team/Keep my team choices, and exposes unavailable selected providers for removal. Current mounted test at `tests/hostRenderer.test.tsx:363` covers pristine lead refresh, dirty refresh blocking, explicit load, exact restored checkbox values, zero host mutations and catalog removal. Builder receipt reports mounted checks passing; this auditor inspected those assertions but did not rerun the entire browser document. Its unconditional test loop includes dirty-draft shutdown cases outside this scoped recheck, so opening it just to run these cases would unnecessarily execute unrelated checks.

Remaining concrete **test gaps**, not confirmed product failures:

1. Independently execute pristine/dirty/load-saved and catalog-removal DOM cases in an isolated selected-test harness.
2. Keep my team choices: verify exact original local IDs/lead persist, conflict clears only explicitly and save sends those exact choices once.
3. Matching save acknowledgement: verify dirty state clears and a later pristine update synchronizes normally.
4. Failed save followed by external saved-team change: preserve local selections, block save and require explicit resolution.

Exact fixture/assertions remain in own `qa-artifacts/constellation-state-review-20260909/README.md`. No DOM shim or copied application state implementation was used to claim a pass. Current runtime packaging/native recovery remain outside this audit.

Current hashes superseding original finding checkpoint:
- `src/host/Constellation.tsx`: `6744ee9b6b68a628321ba35aecdc889748dfe5cf2a661b43b644b9857f9bd5c6`
- `tests/hostRenderer.test.tsx`: `c627aaed8d6353742894c1495b695227919da748b4ec5ba4ed0f6cb15275c976`


## Independent selected DOM run — 2026-09-09

Existing 4317 service available on first selected-URL attempt. CUA observed **PASSED: 5 mounted checks · selected team forms only** at `http://127.0.0.1:4317/tests/hostRenderer.html?scenario=team-form&preview=1&team=1`. Inspected `rendererScenarios.ts` and selection guards first: selected mode skips unconditional tests and separate lifecycle/startup loops; unknown/repeated filters select no checks. No full-suite URL opened. Guard checks no submit or shutdown calls in selected cases. Only synthetic mounted bridge operations occurred. Evidence/current hashes: `qa-artifacts/constellation-state-review-20260909/selected-dom-result.json`.

Pristine refresh, dirty conflict blocking, Keep choices plus one save at refreshed revision, matching acknowledgement followed by pristine refresh, and rejected-save preservation now independently pass their actual mounted assertions. Original stale-form defect is closed for those paths.

Remaining coverage is narrower than the original five-case specification: selected dirty case does not click Load saved team; selected rejected-save case refreshes the unchanged saved team, not a subsequent external change; Keep verifies controls/count/revision but does not directly assert exact team IDs/lead in the save payload. These are explicit test gaps, not observed failures. Do not claim those assertions ran. Load saved has previously inspected builder full-suite coverage, still not independently executed here. No app source, native, server, provider or private evidence operations.


## Strengthened selected DOM closure — 2026-09-09

Independently inspected current selected tests and guards, then opened only `http://127.0.0.1:4317/tests/hostRenderer.html?scenario=team-form`. CUA rendered **5/5 individual PASS results**, scope selected team form scenarios, fake host only. No preview/full-suite URL or unrelated shutdown paths ran. Selected cases assert zero submit/beginShutdown/flushShutdownDraft/completeShutdown/abortShutdown calls; separate mode/startup loops are skipped by selection.

All three previous selected coverage gaps are now closed: Load saved restores remote participant IDs/lead and clears conflict without save; Keep saves exact ordered local provider IDs, leadIndex 1 and second-provider selection once at refreshed revision 2; failed save followed by a real external team update retains local team selections, requires conflict resolution, disables Save and does not replay the failed save. Pristine refresh and matching save acknowledgement also pass. **The original three review findings are closed at the tested frontend/fixture scope.**

“Local draft” here means team-form participant/lead choices. The strengthened failed-save case does not separately assert composer message text; no broader message-draft/native persistence claim is made. Source hashes and exact scope: `qa-artifacts/constellation-state-review-20260909/strengthened-dom-result.json`. Earlier pending-gap sections above are historical and superseded by this checkpoint. Only own evidence/report files changed.
