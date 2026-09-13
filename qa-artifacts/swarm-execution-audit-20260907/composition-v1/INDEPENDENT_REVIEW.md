# Root independent composition-v1 review

REJECT for integration. Exact candidate package/source/tests and accepted filesystem3 source hashes verified; clean relative dependency layout at /private/tmp/rivune-composition-root-review-zgi1esaq. Ran all5supplied tests and2added behavior probes:7executions pass, zero compiler warnings observed. The added probes deliberately assert defective behavior; their pass is not product acceptance. See root-evidence/RootReproductionTests.swift, hash-check.json, results.json and output excerpt. Frozen source/tests were not modified.

## P1: actor reentrancy dispatches two teams for one run

execute checks latest only before awaiting executionSession.run; it does not reserve the session or store an in-progress operation before that await. A second execute enters while the first team is running, creates another independent kernel session with the same plan/runID, and dispatches the whole team again. The approvedContext may differ. An observable worker barrier reproduced4worker calls for a2worker plan on one composition object; after releasing workers the calls returned staged and failed because both attempted the same staging directory.

Reserve immutable run/context identity and the in-flight operation before the first await. Matching repeats must observe/reuse one execution (or return explicit running/busy), and conflicting context must reject without dispatch or overwriting the first run's state. Preserve caller/owned-work cancellation semantics. Do not rely on UI disabling a button for correctness.

## P2: already-cancelled apply still writes project files

apply makes no cancellation check before invoking the filesystem adapter. A Task was explicitly cancelled before entering apply on an already staged session; it still applied new project bytes and returned complete. The exact fixture checks the cancelled flag, resulting state and actual a.txt contents.

Reject a cancelled caller before starting apply and before any project mutation. Once a bounded filesystem transaction has started, define honest stop/cleanup semantics rather than pretending an arbitrary interrupt is atomic. Reserve applying state before an await so overlapping calls cannot mutate/replace completion state. Add an overlapping-apply regression as an adjacent required check; this review did not separately execute that race and does not claim it reproduced.

## Retained scope

Supplied successful stage/apply, worker failure, in-execution cancellation, post-review project mutation and recoveryRequired preservation/retry rejection tests all pass. They do not cover the entrypoint races above. Other binding/state surfaces should be re-reviewed on the corrected composition. Preserve accepted kernel2/filesystem3 and rejected composition1, prepare separatev2. No native/provider/auth/user-data/install/publication action occurred. Cooperative filesystem and crash-window limits remain; keep Swarm unavailable.
