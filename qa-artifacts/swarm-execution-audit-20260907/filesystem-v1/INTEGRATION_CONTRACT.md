# Narrow integration contract — filesystem candidate v1

This contract composes with the frozen Swarm execution-kernel v2. It does not modify that kernel.

## Lead-directed phase boundary

The Rivune lead may select Council, Swarm, or Council followed by Swarm. Strategy selection and its structured reason remain in the coordinator. Runtime policy validates provider capability, permission, and budget before dispatch. This adapter may run only as the filesystem phase of an admitted Swarm-containing strategy. If prerequisites are unavailable, the coordinator reports unavailable; it does not invoke this adapter under a Swarm label.

## Admission mapping

Before constructing `SwarmFilesystemOwnedFile` values, the native owner must require:

- one user-approved project root and write scope;
- `SwarmIntegrationReceipt.schemaVersion == 2`;
- `state == .complete` and `verifyIntegrity() == true`;
- the admitted run ID and exact plan hash;
- an exact one-to-one mapping between receipt manifests, planned ownership, expected base hashes, and proposed staged bytes;
- all required check receipts passing;
- an explicit apply action after the staged review unless a separately approved automation policy exists.

Neither lead nor worker prose may provide a raw absolute path, expand scope, waive a mismatch, introduce a shell command, or select the staging parent.

## Lifecycle

1. Create a session with a canonical project directory, a separate application-owned staging directory, and the admitted files.
2. Call `stage()` once. Persist the kernel receipt and returned staging reference together before presenting review.
3. At apply, reacquire the same project permission and call `apply()` on the same session or a future durable reconstruction with equivalent checks.
4. On `targetChanged`, `symlinkRejected`, `ownershipConflict`, or `baseConflict`, show a conflict and require a fresh run or explicit re-plan. Never overwrite.
5. On `rolledBack`, show that no proposed result remains applied and retain the recovery bundle until user dismissal or a retention policy removes it.
6. On `recoveryRequired`, block further automated writes and offer an inspected recovery flow using the journal and backups.

## Atomicity contract

- Staging artifacts and each journal update use atomic single-file replacement.
- Each destination file is replaced atomically as a file.
- A multi-file apply is serial and is **not** one atomic transaction. Readers may observe an intermediate state.
- Failures trigger compensating rollback, which can itself fail. `recoveryRequired` is therefore a real terminal state, not an impossible assertion.

## UI language

Allowed: “Staged for review”, “Files changed before apply”, “Apply rolled back”, “Recovery required”.

Disallowed: “Swarm is live”, “transaction committed atomically”, “no files changed” without inspecting the journal state, or any success claim based only on staging.
