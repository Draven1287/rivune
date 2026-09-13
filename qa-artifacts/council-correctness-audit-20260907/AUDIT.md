# Council correctness audit — 2026-09-07

## Verdict

A P1 saved-history integrity defect was reproduced and corrected in an isolated candidate based on the accepted frozen build 0623 staging tree. Before the correction, a journal containing a forged Council lead appointment passed restoration. The application then trusted that appointment in the Council disclosure and final-answer provenance. The candidate now rejects appointments that do not match the frozen participants, successful answers, configured lead/fallback policy, policy version, evidence requirements, and replacement chain.

The candidate is ready for independent integration review. It has not been copied into shared source, installed, or exercised against live providers.

## Finding

### P1 — Restored Council lead appointments were not validated

`CouncilRunRecord.validateSavedResults()` validated participant and result identity, but returned without validating `appointments` (`Rivune/CouncilRunner.swift`, baseline lines 174–197). History restoration invokes that validator before exposing saved runs (`Rivune/RivuneRunCoordinator.swift`, lines 104–109). Later, the UI trusts the last appointment for the displayed lead, rationale, evidence, and requested model (`Rivune/WorkspaceView.swift`, lines 899–903), and final-answer provenance trusts the same appointment (`Rivune/RivuneRunCoordinator.swift`, lines 383–386).

Fault injection added a foreign appointment with forged provider, adapter, model, and display name. Against the unmodified baseline, `CouncilSavedIntegrityTests/testCorruptNestedJournalRejectedBeforeAnyMutation()` failed with `XCTAssertThrowsError failed: did not throw an error - appointment`.

The isolated correction validates every saved appointment against:

- exact identity in the frozen participant list;
- a successful independent answer from that participant;
- the configured orchestrator plus explicit fallback members, or the historical participant set for legacy records;
- the correct policy version for configured or legacy records;
- nonempty, bounded reason and evidence fields;
- an ordered replacement chain in which the first appointment replaces nobody and each later appointment replaces the immediately preceding lead.

The regression fixture accepts a valid configured manager-to-fallback chain and rejects a foreign lead, wrong policy version, broken replacement chain, failed lead, and fallback outside a `.stop` policy.

No additional P1 or P2 defect was reproduced in this targeted source and synthetic-fixture audit.

## Audited behavior

Source inspection and existing recording/fault-injection tests cover these Council contracts:

- Each member receives the same first-round prompt without peer drafts; synthesis is a separate lead step.
- Frozen approved user, project, and selected-document context is reused for execution and retry.
- Runtime admission requires exact route, provider, adapter, requested model, and effort identity.
- The configured orchestrator is selected first and fallback follows the frozen policy.
- Partial member failure remains visible and synthesis requires at least two successful independent answers.
- Lead failure uses the explicit fallback policy and records appointments.
- Cancellation suppresses late successes and leaves the run cancelled.
- Retry verifies the exact frozen request, preserves successful drafts, and reruns missing members.
- Final output, member results, failures, lead provenance, requested model, receipts, and activity remain readable in the Council disclosure and restored history.

This evidence establishes deterministic local behavior for the tested contracts. It does not establish provider availability, effective resolved model identity, semantic answer quality, or parity/superiority with another product.

## Verification

- Baseline fault injection: 0 passed, 1 failed, reproducing the missing appointment rejection.
- Corrected focused suite: 4 passed, 0 failed, 0 skipped.
- Corrected complete `Rivune Mac` suite: 324 passed, 0 failed, 0 skipped.
- An earlier complete suite after the source correction and before the expanded appointment test contained 323 passing tests; the final 324-test result supersedes it.
- Provider calls: 0.
- Shared source edits: 0. The shared `Rivune/CouncilRunner.swift` hash still matched the frozen baseline when packaged.
- UI changes: 0. This is validation-only, so no rendered visual approval was needed for the candidate.

Exact result bundle paths, hashes, and commands are recorded in `verification.json` and `source-manifest.json`. `source.patch` is the reviewable delta; `candidate/` contains the complete two changed files.

