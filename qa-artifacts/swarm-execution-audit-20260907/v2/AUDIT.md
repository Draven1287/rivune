# Rivune Swarm execution audit — candidate v2

Date: September 7, 2026

Status: isolated foundation candidate only. Swarm remains unavailable in the native app. No shared Rivune source, UI, installed app, provider session, shell/network action, or user project was changed.

Candidate v1 is preserved at the parent directory and rejected by `../INDEPENDENT_REVIEW.md`. V2 closes all three reproduced P2 findings without altering the declared future-scope boundary:

- receipt integrity now hashes canonical sorted-key JSON for a typed versioned payload, so field boundaries and nil values cannot collide with user strings;
- target conflict checks apply the same normalized ancestor/descendant relationship used for planned ownership, before verification;
- the public `run` and repair calls retain cancellation ownership across worker scheduling and final verification, cancelling the owned verifier when the caller task is cancelled.

## Inspected baseline

The audit read `docs/AI_TEAM_DIRECTION.md`, `docs/COUNCIL_AND_SWARM.md`, `docs/AI_TEAM_IMPLEMENTATION_SLICE.md`, `docs/AI_TEAM_ADAPTER_HANDOFF.md`, `Rivune/TeamConfiguration.swift`, `Rivune/SwarmWorkerFoundation.swift`, `Rivune/SwarmTextWorkerAdapter.swift`, and `scripts/SwarmFoundationChecks.swift`.

The current source already has valuable groundwork: a six-task/depth-one graph bound, two-call batch scheduling, dependency handoffs, exact owned-output validation, one repair, cancellation, temporary staging, exact model/effort admission for the two text adapters, and 33 standalone fixture checks. Those are real implementation seams, but they do not establish live Swarm.

## Concrete gaps before this candidate

1. Worker tasks recorded a parent string, provider, and adapter, but did not freeze the distinct reusable team-member identity agreed with the configurable Council schema.
2. Graph ownership caught overlapping planned paths, but staging did not compare each planned base hash with the target snapshot. A project file changed after planning could therefore be presented as safely integrated.
3. A successful set of worker outputs made `completed` true without requiring actual acceptance-check observations.
4. The receipt embedded staged output and was not a compact integrity-verifiable integration receipt binding the frozen plan, lead, full worker route/model/effort identities, attempts, manifests, and check evidence.
5. Cancellation covered worker tasks, but there was no explicit verifier handle; cancellation racing final checks needed a terminal guard.
6. Case/Unicode-equivalent target paths needed the same ownership identity as planned paths.

## What the isolated candidate adds

```text
Frozen lead + exactly two workers
                |
        validated task DAG
   (2-6 tasks, depth 1, owned paths)
                |
     at most two worker calls
       /                  \
 staged bytes A        staged bytes B
       \                  /
  base-hash + normalized-path conflict gate
                |
       injected acceptance verifier
                |
 digest-bound integration/result receipt
```

- Exactly one lead ID assigns work to exactly two distinct frozen worker identities. Each worker owns at least one of two-to-six bounded depth-one tasks.
- Planned path scopes are disjoint under normalized, case-insensitive ownership identity. Worker outputs must return every and only the exact owned paths.
- Workers receive dependency manifests, not peer file bytes, and receive no authority to write the user's project.
- Integration is in memory. Every existing owned path must still match its planned SHA-256; every planned new path must still be absent. Conflicts skip verification and produce a conflict receipt.
- An injected verifier must return exactly one bounded observation for every frozen check. Only all passing checks can produce `complete`.
- The durable-shaped receipt stores hashes and counts rather than approved context, proposed bytes, or check logs. Canonical typed JSON binds the plan hash, lead, full worker identities including optional values, attempts, file manifests, checks, and terminal state; `verifyIntegrity()` detects alteration.
- One failed task may be repaired once without repeating a successful peer. Dependencies that never ran may proceed after repair.
- Cancellation stops owned worker and verifier tasks, prevents dependent launch, and wins over a late verifier result.

## Trade-offs and remaining gaps

This candidate deliberately accepts a frozen plan; it does not let a model invent permissions or executable routes. It also does not yet implement the lead's planning call, partner cross-review, a real CLI child-agent/tool adapter, isolated worktrees, persistence/restart, application to a user project, native UI, or physical-device behavior. Those are required before Swarm can be enabled.

Exactly two workers is the smallest bounded integration seam requested here, not a permanent product limit. The existing product ceiling of six tasks and one delegation level remains. A future integration may generalize worker count only after capability, scheduling, cost, and UI evidence.

The candidate's `SwarmCandidateVerifying` protocol proves that checks were actually invoked by an adapter in tests; it cannot prove a future adapter's claimed test command is truthful. Production adapters need reviewed process isolation, scoped filesystem enforcement, cancellation propagation, bounded output capture, and execution receipts.
