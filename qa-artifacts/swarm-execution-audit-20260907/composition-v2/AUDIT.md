# Swarm composition candidate v2

Status: isolated review candidate. Accepted execution-kernel-v2 and filesystem-v3 remain unchanged. Rejected composition-v1 and its reproduction evidence remain frozen. Swarm remains unavailable.

## v1 rejection

Independent review reproduced two entrypoint defects: actor reentrancy let two concurrent `execute` calls dispatch four workers for one two-worker run, potentially with different approved context; and an already-cancelled caller could enter `apply`, mutate project files, and report complete.

## v2 state discipline

- `execute` reserves `executing` plus an immutable SHA-256 identity of approved context before its first suspension.
- A same-context duplicate observes the one running receipt and dispatches nothing.
- A different-context duplicate returns `busy` without changing the admitted run or its receipt.
- Staged, applying, and terminal runs are monotonic; later execute calls observe the existing receipt.
- `apply` checks caller cancellation before reserving or invoking the filesystem layer. A cancelled attempt changes neither project nor durable session state, so a later deliberate apply remains possible.
- `apply` reserves `applying` before suspension. An overlapping call observes the one applying receipt and cannot dispatch another filesystem operation.
- Once filesystem apply has started, its bounded completion/compensation determines the honest terminal state; cancellation is not presented as transaction-level atomic interruption.

## Retained binding and recovery

Only a complete integrity-valid execution receipt with exact run, ownership, path, byte, proposed-hash, base-hash, and admitted-snapshot binding can stage. Failure, cancellation, conflict, and recoveryRequired never receive success labels. RecoveryRequired retains artifacts/evidence and blocks automatic retry.

## Limits

Synthetic injected workers/verifier only. Cooperative-filesystem syscall interval and destination-write/journal crash window remain. Multi-file apply is not atomic. Native coordinator/UI, permissions, providers, installed app, rendered state, and live Swarm remain unproven and unchanged.
