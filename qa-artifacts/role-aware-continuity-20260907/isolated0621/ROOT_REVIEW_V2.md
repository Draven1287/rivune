# Root independent review — corrected role-aware candidate v2

Verdict: **original P1 artifact contract corrected; changes requested before whole-candidate acceptance.** No shared source or installed app changed.

## Exact source and artifact regression

The v2 patch SHA256 is `6b3c81ab89e3919630643541edde4921d074dedc5019cb5f5d1d20d029471ee7`. It reconstructs all seven candidate files byte-for-byte from base. Independently computed Git blob identities match the updated handoff. The files remained identical through testing; SHA256 receipts are in ROOT_V2_REVIEW_RECEIPT.json.

The direct wrapper conditionally appends the exact existing ArtifactContinuation.instructions when the selected artifact is present, retaining typed user/context authority and immutable artifact reference. Independent actual-production coordinator recording test **passed** for both ChatGPT and Claude direct routes: one call on each route; complete artifact equality including IDs/digests/paths/content; current request precedence; artifact quoted-reference boundary; exact complete-file JSON manifest and no-patch contract. This closes the specific v1 P1 source/recording regression, not a live generation claim.

## New test acceptance issue

Independent targeted Xcode run exited65: **five passed, one failed**. Failure is testActualCouncilCoordinatorRunsIndependentDraftsThenLeadWithSameTypedContract. The recorded assertions observed two calls instead of three, zero lead calls instead of one, and run status running instead of complete. Other five tests passed. Result bundle: `/private/tmp/rivune-root-role-v2-results.xcresult`; build/test log copied to ROOT_V2_TESTS.log.

The class uses a fixed200-iteration Task.yield settle loop. The failure is consistent with assertions sampling before asynchronous Council completion. This is not proof the production Council cannot complete. Replace scheduler-count settling with an observable terminal-state or expectation-based wait and a bounded timeout; the timeout should fail clearly. Await completion before snapshotting calls, preserve the exact N+lead and final-state assertions, and ensure tasks are cleaned up. Do not merely increase the yield count, relax assertions, or repeatedly rerun until green. Then freeze updated test identity and rerun the targeted production class; broader verification should follow the changed test/integration scope.

## Remaining boundaries

The owner's303-test/iOS reports were not independently rerun here. Phone legacy test remains serialization only; host rejection with zero calls is deferred to the newer native phone integration. Keep newer phone admission/ID-binding changes when merging the Store. This isolated candidate is not installed, and no real provider, pairing, network, billing or publication action occurred.
