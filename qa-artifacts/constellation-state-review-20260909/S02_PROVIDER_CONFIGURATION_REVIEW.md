# S02 configuration contract review — 2026-09-10

Frozen `e49efc20e0c50609730787534ecfaa4556198b5a` against `d7e20910a39aab51acbe79460caac5e2d7e3f77f`. Reviewed all five changed files, receipt, native discovery/validation/commit helpers and isolated frontend fixtures. **One P2 contract defect remains; acceptance pending its correction.** No actual provider configuration occurred.

## P2: keep acknowledgement expectations private from the bridge

`prototypes/ai-native-workspace/src/host/providerConfiguration.ts:24` passes request.provider and request.guard directly to the optional bridge. Lines 29–30 then compare the acknowledgement against those same mutable objects and return a copy of the potentially modified request. An instrumented bridge changed provider.executablePath to `/different/codex`, returned it in a durable receipt, and the adapter accepted durable even though the selected route remained `/synthetic/codex`. Guard mutation can similarly change the expected selected ID for select=false. This defeats the stated exact-choice acknowledgement check. The supplied Tauri bridge does not currently perform this mutation; the defect is in the optional adapter's validation boundary, reproduced with a synthetic bridge, not a claim of native exploitation.

Keep an independent immutable expected provider/selected-ID snapshot and pass detached request/guard copies to the bridge; validate and return against the private expectations. Add regression spies that mutate both provider and nested guard values before replying and require uncertain, with no replay and original drafts intact.

## Verified boundaries

Native configure_provider validates provider path/type first, then acquires lifecycle/mutation followed by workspace lock. Under those locks it searches current local executable routes, checks kind, exact path and canonical-path discovery ID, compares expected saved provider and global selection, and rejects stale values before cloning/mutating workspace. Discovery ID computation matches the existing discover_providers path-hash scheme. No process, auth, account or model probe is invoked. Path identity does not bind file contents or prevent filesystem replacement after validation.

The commit helper changes only providers and optionally global selectedProviderID in a cloned workspace. Conversations, pinned selections/teams, runs and drafts remain copied unchanged; switching the global route does not rebind an existing pinned conversation. Receipt creation follows successful commit_candidate only. Unguarded callers receive None, serialized as legacy null, and the old bridge still omits the optional guard. The optional frontend adapter does not fall back to that legacy method; null on its guarded path is uncertain.

Filesystem metadata/canonicalization searches now occur while lifecycle and workspace locks are held, followed by existing persistence I/O. Directory/result counts are bounded but individual filesystem calls are not deadline-bounded, especially for PATH entries on unavailable mounts. Snapshot reads, mutations and shutdown can wait behind this synchronous work. No new lock-order inversion was found in the inspected path, but real filesystem responsiveness is unverified and the future UI must not promise a bounded cancellation time.

## Uncertain-save requirements for the planned UI

commit_candidate can update the visible in-memory workspace and still return an error when error.committed is true: crash durability is explicitly uncertain. A fresh snapshot can establish current visible configuration, **not crash durability**. The UI must retain uncertainty rather than promote snapshot equality to a durable acknowledgement; a separately designed persistence confirmation or explicit newly guarded save is needed for that claim. The current adapter has no mutation identity, reconciliation API or timeout, and releases its pending flag after uncertainty. It prevents overlapping calls and does not replay internally, but the future UI must fence another attempt until explicit snapshot reconciliation/review. A permanently pending promise currently keeps the per-adapter fence indefinitely. These are documented contract limitations, not an implemented UI recovery flow.

## Evidence

Exact frozen providerConfiguration.ts, contracts.ts and owner tests copied into `s02-configuration-frozen-tests`. Node v22.23.1 ran **5 tests**: three owner tests passed, one reviewer actual-bridge spy verified single invocation/concurrency rejection/null uncertainty, and one characterization reproduced the mutable-baseline defect. A passing characterization confirms the defect, not acceptance. Reproduce with `node --experimental-strip-types --test qa-artifacts/constellation-state-review-20260909/s02-configuration-frozen-tests/tests/*.test.mjs` from workspace root.

Retained native-final.log is a failed intermediate run (1 passed, 1 failed on invalid saved executable); native-fixed.log is the corrected run reporting two tests passed. Native executions were not rerun. Their guard fixture injects route_current as a boolean, so it does not exercise the real filesystem search/command wrapper. Persistence fixture exercises a precommit AfterSync fault and unchanged conversation bytes/reopen; it does not cover the committed-but-uncertain branch or populated pinned-team fixtures. Pinned preservation is independently supported by the clone/update source. No unchanged guidance tests, native builds/apps, real routes/providers, authentication, publication, services or product source edits were performed.


## Acknowledgement successor dd9706b — 2026-09-10

The mutable-baseline P2 is **closed** in dd9706b37e2b5fe162bf0390b2b1bf073e3fd4a0. Private expected provider and selected ID are captured before the call; detached provider and nested expected-provider copies cross the bridge. Acknowledgement validation and returned durable values use private expectations. Four exact frozen configuration tests passed independently, including bridge mutation with select=true/false and unchanged input snapshot. Route-picker integration findings are separately recorded in S02_ROUTE_PICKER_REVIEW.md; closure of this contract defect is not blanket acceptance of that UI.
