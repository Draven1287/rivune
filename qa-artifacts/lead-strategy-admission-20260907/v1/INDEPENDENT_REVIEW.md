# Independent lead-strategy admission v1 review

**ACCEPT within the documented admission-only, process-local scope. No remaining P1/P2 findings identified in that scope.** This does not enable Auto, prove phase execution, authenticate host grants, or provide durable deduplication across runtime recreation.

## Exact evidence

Verified every MANIFEST.json hash against `/private/tmp/rivune-lead-admission-v1-j6qud6hj` before copying the package for independent testing. Source SHA-256: `eaff33cdaa9602b9266d3d26818b68476b810f3781e6743156505c0110a69254`. Supplied tests: `9b9c86f68c8196bd49d7a00d8f0d1c5217aaa9a9f2703390dfdc6c13da5a1540`.

Ran the unchanged frozen production source and supplied tests, plus eight independent XCTest regressions in a separate copy: **20 passed, 0 failed, no compiler warnings**. Logs, added test source, hash checks and structured results are under `independent-evidence/`. No live provider, shared native source, UI or install action occurred.

## Reviewed behavior

The parser accepts bounded structured proposals with exact known keys, closed strategy/capability/permission enums and exact run/lead/snapshot identity. The fingerprint binds canonical structured team identity, approved input digest, readiness, capability/permission facts, budgets and manual override. A differing manual choice rejects the model's strategy; it never silently replaces the user's choice.

Host-derived requirements remain mandatory even if omitted by the model. Council requires independent answers and at least two members; every strategy requires lead review. Swarm requires scoped workers, workspace-write permission and an admitted worker count. Mixed strategies preserve order and become wholly unavailable when any prerequisite or minimum budget fails. An unavailable receipt has no effective phases, so a partial available phase cannot masquerade as full admission.

The gate consumes an ID before invoking its synchronous persistence closure, returns only after successful commit, and refuses duplicate/ambiguous retries. Invalid proposals do not reserve IDs before validation. The256-ID capacity refuses new work without evicting previously consumed identities.

Independent regressions specifically covered:

- omitted lead-review requirements for all four strategies;
- exact mixed-strategy call/phase limits and invalid worker counts;
- changed approved input, requested model/effort or permission facts with an old proposal;
-20 concurrent submissions of one ID, yielding one receipt write/admission;
- malformed proposal followed by a corrected proposal for the same ID;
- unavailable mixed plan and prevention of same-ID fallback resubmission;
- persistence that records bytes and then throws, producing no returned receipt and no repeated write;
- full256-ID gate retaining duplicate rejection while refusing ID257.

## Integration limits retained

Snapshot capability, grant, evidence freshness, provider/model and readiness values are trusted injected host facts; this package cannot establish their authenticity. The constructor and parser constrain representation, not real provider permissions. The caller must supply native-validated facts and recheck them before each actual effect.

Minimum call estimates reserve the success path only. Actual workers, repairs/retries, phase ordering/results, cancellation and accumulated budgets still require an executor. The persistence closure must commit atomically rather than queue work. AdmissionGate has no restore API; recreating it resets process-local consumed state, so the native durable coordinator remains responsible for restart reconciliation and duplicate prevention. No launch, provider termination, shared-file atomicity or live quality guarantee is inferred from these tests.

The isolated candidate may proceed to bounded integration planning under the existing user authorization. Native integration and execution acceptance remain separate; this review introduces no additional approval gate.
