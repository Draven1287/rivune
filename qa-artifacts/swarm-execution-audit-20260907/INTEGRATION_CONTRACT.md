# Narrow native integration contract

Status: review candidate, not authorization to enable Swarm.

## Admission

1. Admit only a user-approved project and permissions. Snapshot the exact target bytes for all planned owned paths before dispatch.
2. Freeze one lead and exactly two eligible team-member identities from `TeamRunConfiguration`, including member ID, registered route, requested model, and requested effort. Never derive member identity from provider or route.
3. The lead may propose the task graph, but Rivune—not model text—constructs `SwarmExecutionPlan` and validates every task, dependency, path, check, and local limit.
4. Reject unsupported adapter capability, unknown explicit model/effort, unavailable project scope, malformed plans, and ownership overlap before creating a session or invoking a provider.

## Execution

- Bridge production worker adapters through `SwarmWorkerExecuting`. Each adapter must receive the frozen member and task, run in a task-owned isolated workspace or equally strong staging boundary, propagate cancellation to its owned process, and return staged bytes only.
- Do not pass shell commands, executable paths, credentials, or new permissions from lead/worker text into the adapter.
- Preserve the existing maximum of two concurrent workers, six tasks, depth one, and one repair. Scheduling limits are local policy, not provider capacity claims.
- Keep single-provider, legacy Together, and Council entry points unchanged. A missing Swarm adapter returns unavailable; it never falls back under a Swarm label.

## Integration and checks

- Treat `SwarmIntegratedCandidate` as a proposed in-memory change set. Run reviewed check adapters using the frozen `SwarmCheckSpec` values.
- Before any eventual save, require `receipt.state == .complete`, `receipt.verifyIntegrity() == true`, the exact plan hash, and a second atomic comparison of every target base hash. A changed/missing/case-equivalent target is a conflict, not a last-writer-wins merge.
- Applying files is a separate, user-visible native review/save operation. Preserve original bytes and provide rollback. This candidate performs no apply.
- Persist the plan, task attempts, integration receipt, and staged-artifact references atomically before claiming completion. Raw prompts, credentials, full check logs, and output bytes do not belong in the compact receipt.

## Cancellation and recovery

- User Stop cancels the session's owned workers and verifier, prevents new/dependent work, and makes late callbacks unable to publish completion.
- A failed task may use its one repair without discarding unrelated success. A second repair or repair after dependent consumption is rejected.
- Native integration must add durable restart recovery and stable run/task/attempt identity before live availability. This isolated actor is process-local.

## Gates still required

1. Independent source review of this candidate and its exact hashes.
2. Recording adapters at the actual native coordinator boundary for two distinct team members and both supported routes.
3. Real scoped worker/process implementation with cancellation and workspace isolation tests.
4. Partner cross-review and lead integration receipts.
5. Durable persistence/restart and staged-save rollback tests.
6. Full native tests and macOS/iOS builds from a frozen integration delta.
7. One authorized disposable two-provider website task with exact file, functional, and rendered desktop/mobile evidence.

Until all gates pass, keep the existing native “Swarm unavailable” state and make no quality or live-execution claim.
