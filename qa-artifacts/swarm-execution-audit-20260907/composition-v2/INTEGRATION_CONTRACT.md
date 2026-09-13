# Narrow native handoff — composition v2

One coordinator instance owns one admitted run ID and one approved-context identity. Native code must retain and observe that instance rather than constructing parallel sessions for repeated UI events.

- Matching duplicate execute: show the existing running state.
- Conflicting context during execute: show busy/rejected request; do not mutate the admitted run.
- Cancelled caller before apply: perform no write and keep the staged review available.
- Overlapping apply: observe the existing applying state; never start another apply.
- RecoveryRequired: preserve receipts/artifacts, block automatic retry, require inspected recovery.
- Terminal state: immutable for that session.

The lead-selected strategy and runtime capability/permission/budget admission remain upstream. Model text cannot set context identity, paths, permissions, state, or recovery policy. Swarm remains unavailable until native and live gates pass.
