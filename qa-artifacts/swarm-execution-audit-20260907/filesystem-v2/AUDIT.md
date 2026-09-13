# Swarm filesystem staging/apply audit — candidate v2

Status: isolated review candidate. Rejected filesystem-v1 and accepted execution-kernel v2 remain frozen. Swarm remains unavailable.

## Product and orchestration boundary

Rivune remains one product with one conversation, team, and composer. The appointed lead chooses an internal strategy—Council, Swarm, or a sequence—then the runtime validates capabilities, permissions, and budget. This package is only a composable filesystem phase for an admitted Swarm-containing strategy. It neither chooses nor labels strategies and performs no provider work.

## Rejected v1 findings

Independent review reproduced two P1 data-loss defects in disposable fixtures:

1. `.skipsPackageDescendants` hid an existing owned file below `Existing.app`, allowing expected-nil admission, no backup, and overwrite.
2. rollback restored or recursively removed a path without proving its current occupant was still the exact proposal Rivune wrote, destroying a later user edit or replacement directory.

The exact rejected source, tests, three reproductions, log, and review remain under `../filesystem-v1/`.

## v2 corrections

### Complete relevant namespace traversal

- Enumeration no longer skips package descendants.
- The enumerator has an error handler; an inaccessible or failed traversal is `unsafeRoot`, never proof of absence.
- Existing package-owned files now participate in exact-base comparison, backup, apply-time recheck, and rollback.
- Relevant symlinks below a package are rejected.

### Ownership-aware compensation

- Before compensating each applied path, rollback rechecks every existing ancestor and the exact target kind.
- A file is restored or removed only when its current SHA-256 still equals the exact proposed bytes written by this attempt.
- If an originally new proposal is already absent, compensation is complete for that path.
- A later user edit, missing formerly existing target, symlink, directory, special file, or inspection failure is preserved and recorded as a per-path `SwarmFilesystemRecoveryConflict`.
- A replacement directory is never recursively removed. Created parent directories are removed only when they are still directories and empty; otherwise they are preserved and recorded.
- Any preservation conflict yields `recoveryRequired`, and the proposed files, original backups, journal, observed kind, and observed file hash remain for inspected recovery.

## Retained guarantees

- one explicit canonical project root and separate staging parent;
- bounded file count and bytes;
- validated relative ownership with traversal rejection;
- normalized case/Unicode exact and ancestor/descendant conflict rejection;
- exact base hashes and a second relevant namespace/byte snapshot at apply;
- per-file atomic writes, serial multi-file apply, compensating rollback;
- unrelated project edits do not create false conflicts.

## Honest limits

- Multi-file apply is not atomic. Readers can observe an intermediate state.
- Rollback is compensation, not a transaction. `recoveryRequired` is expected when ownership proof is lost.
- A crash between a destination write and the next journal write still needs durable restart design.
- Foundation path checks do not eliminate the narrow syscall-level time-of-check/time-of-use race. Descriptor-relative no-follow hardening remains a production gate unless the cooperative-filesystem threat model is explicitly accepted.
- Hashes provide integrity, not authenticity against a party able to rewrite artifacts and recompute hashes.
- This package does not authenticate a complete execution-kernel receipt; native mapping must do so before construction.
- No native source, UI, user project, provider, network, shell, install, or live behavior was touched.

## Remaining gates

1. Independent review and adversarial replay of this exact frozen v2.
2. Exact binding from an integrity-verified complete execution-kernel receipt into owned files and bytes.
3. Durable restart/recovery state and a user-visible staged review/apply flow.
4. Explicit project permission at stage and apply.
5. Platform-specific race hardening or a documented accepted threat model.
6. Frozen native tests and macOS/iOS builds.
7. One authorized disposable two-provider task with exact file, functional, and rendered evidence.

Until every relevant gate passes, Swarm stays unavailable and no silent substitute may be labeled Swarm.
