# Concurrent team engine handoff

Source hash: `e25c8ad706bca2da1d766767f2c84f06c72d9d64f53902f1157bb93e41c8513a` (`src-tauri/src/team_strategy.rs`). The module suite passed 30/30 tests, including the serial checkpoint capacity regression that failed the earlier combined build. Runtime owns combined integration after this handoff.

## Execution contract

- `Session::new` preserves serial v1 semantics. `new_with_concurrency` accepts a host-appointed limit of 1–6; parallel sessions use v2 checkpoints bound to that limit.
- Read ready calls using `next_invocations`, call `mark_batch_dispatched` transactionally, persist the full checkpoint successfully, then launch separate provider sessions. A failed checkpoint write must launch no new processes.
- Record outcomes by the full frozen binding, under serialized run transitions. Never give independent Council members another member's draft. Integration receives successful drafts in declared member order.
- Swarm schedules dependency-ready workers. Workers sharing a granted staging scope cannot overlap. The host must verify distinct scopes are actually disjoint; different labels alone do not establish filesystem isolation.
- Failure pauses new dispatch; already running sibling results remain retainable. Retry is explicit and budgeted. Restart turns dispatched calls uncertain and must reconcile them without automatic replay.
- Cancel all unresolved processes. Late results after terminal cancellation must be retained in the host recovery journal without reviving the run. No reviewed artifact is automatically authorized for application to user files.

## Required integrated acceptance

1. Fail a checkpoint write before a batch launches: zero provider processes start; recovery preserves the pending calls.
2. Run two fixture transports concurrently with reversed completion order: both results persist and the Council lead receives deterministic complete context.
3. Fail one worker while another completes, retry explicitly, restart mid-flight, and confirm no duplicate dispatch or lost successful result.
4. Validate real staging-path isolation and shared-scope serialization. Exercise dependent Swarm work, integration, and host-attested artifact review.
5. Cancel with multiple processes, drain all of them, preserve attributable late output, and verify Quit/reopen recovery.
6. Verify the native interface displays actual active members, chosen strategy, failures, recovery and final deliverables. Then perform explicitly authorized supported-provider end-to-end checks; fixture success does not establish provider parity.

These are integration acceptance requirements, not claims that the current desktop build satisfies them. The broader native setup, migration, export, tray and quit sequence remains in NATIVE_ACCEPTANCE_NEXT.md.
