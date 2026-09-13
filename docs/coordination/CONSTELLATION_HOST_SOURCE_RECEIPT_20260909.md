# Constellation host workspace — source receipt

Implemented capability-gated team configuration and durable run projection in the current React host workspace. This slice made no native source changes, native builds/launches, provider calls, installed-profile changes, or blocked cross-task transmissions. Earlier frozen QA artifacts/receipts remain separate and are not evidence for these new frontend changes.

## Host contract inspected

`candidate4-runtime-r2/src-tauri/src/host.rs`: TeamSelection schema1 has2–6 unique routes and leadIndex; draft selection must equal the lead. Rich save/admission binds prompt, revision, selections and team. Catalog currently permits provider-managed defaults only; explicit model/effort resolves to MODEL_CAPABILITIES_UNKNOWN. Public runtimeCapabilities reports Constellation availability and minimum2. Public runs expose admitted team, bounded saved activity, independent memberResults and resolution.

`team_strategy.rs` supports Council/Swarm internally, but `prepare_constellation_state` pins Council, text/decide capabilities, bounded calls and no scope grants. UI therefore offers Constellation with lead/member roles, not a Swarm selector, write workers, invented models, or invented results.

## Changes

- `teamConfiguration.ts` admits only current configured/catalog-supported installed default routes; denies known authentication failure, failed response test, absent/unavailable capability, duplicate provider IDs, missing lead and stale/explicit model choices. Unknown auth remains explicitly unknown, not verified.
- `workspaceController.ts` configures teams through the existing exact CAS rich-save path, preserving text and attachments. Configuration never reserves/submits. An uncertain save requires the same mutation retry before changing team. Direct mode is explicitly restored by clearing team. Send rechecks team/catalog after durable save, then reserves and dispatches the saved mode/revision. Saved team and attachment equality are checked after acknowledgement and refresh.
- `tauriAdapter.ts` permits only direct/constellation through the existing reserved-submit command. No Council/Swarm or model payload was invented.
- `contracts.ts` projects admitted team, bounded member answers, saved activity and resolution. Validates request/conversation/member/provider bindings, sequence window, duplicate member IDs, result roles, lead reviewer and byte limits. Missing optional details remain unavailable. Event notifications still only trigger host refresh; they never supply the final answer.
- `Constellation.tsx` and HostWorkspace integration provide a collapsed configuration section and saved run details with lead/member roles. Final answer remains the canonical run.answer; member answers, truncation and reviewed=false remain distinct. Quiet reading surfaces and edge-galaxy treatment preserved; demo remains separate.

## Validation

- `npm run typecheck`: passed.
- `node --experimental-strip-types --test tests/*.test.mjs`:96 passed,0 failed/skipped. Includes team save/reopen/mode/revision, missing capability, duplicate/unknown routes, stale catalog, capability revocation after save, identical uncertain-save retry, explicit return to direct, reserved adapter payload, and malformed/cross-bound projection rejection.
- Existing browser fixture page `/tests/hostRenderer.html?constellation=3`:19 mounted scenarios passed, including all prior direct/cancel/recovery/settings/shutdown mocks plus team configuration, separate member/final results, honest unreviewed/truncated labels, and absent-capability direct fallback. Private fixture storage only.
- Initial mounted team test incorrectly replaced a method after adapter capture and therefore still exposed one provider. Corrected the fixture to mutate its catalog behind the captured bridge. Checkbox updates also use functional state updates for batched selection. Final mounted run passed.
- Scoped diff whitespace check passed. Full unit log and source hashes saved under `qa-artifacts/constellation-host-source-20260909`.

## Limits

Source/mock proof only. No packaged execution of this new slice; current staged native binary still contains the earlier renderer. No real provider authentication/response or multi-provider completion claimed. Swarm/scoped work and explicit model/effort configuration are unavailable in the inspected host contract. Per-invocation retry UI is not added. A host without detailed saved projection shows that absence; no progress or contribution is synthesized. Existing N5 and record-forwarding approvals remain pending and were not retried.
