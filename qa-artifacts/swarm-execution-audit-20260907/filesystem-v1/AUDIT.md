# Swarm filesystem staging/apply audit — isolated candidate v1

Status: isolated review candidate. This does not enable Swarm, alter Rivune source, or write to a user project.

## Product fit

Rivune is one product with one conversation, team, and composer. The appointed lead chooses an internal strategy: independent Council answers, divided Swarm work, or an ordered sequence of both. This adapter is a composable backend phase only. It does not expose a second product, choose a strategy, invoke a model, or silently relabel another path as Swarm.

## Before

The independently accepted execution kernel v2 proves bounded task scheduling, two frozen worker identities, owned output scopes, one repair, cancellation, verification, and an integrity-checkable in-memory receipt. It intentionally stops before filesystem staging or apply.

The remaining filesystem gap was concrete:

- no isolated proposed-file bundle;
- no byte-preserving base snapshot;
- no second apply-time conflict check;
- no rejection of traversal, symlinks, or normalized namespace aliases at the filesystem boundary;
- no rollback evidence for a failure after one of several files had been written;
- no honest statement of per-file versus multi-file atomicity.

## Candidate

`SwarmFilesystemApplySession` accepts one explicit project root, one separate staging parent, and 1–32 already-approved owned files capped at 4 MiB. It:

1. validates relative paths and rejects traversal, hidden components, control characters, backslashes, colon paths, and normalized exact/ancestor/descendant overlap;
2. canonicalizes roots using the filesystem canonical path so macOS `/var` and `/private/var` aliases cannot bypass snapshot comparisons;
3. snapshots only the exact owned paths plus normalized ancestors and descendants, recording entry kind, file hash, size, and original bytes for exact owned files;
4. rejects relevant symlinks, case aliases, Unicode-canonical aliases, file ancestors, directory targets, descendants, and stale/missing base hashes before staging;
5. writes proposed bytes, original-byte backups, and an atomic JSON journal into a new run-scoped staging directory outside the project;
6. recaptures the relevant namespace immediately before apply and fails closed if it differs;
7. applies files serially with Foundation's per-file atomic write, journaling progress;
8. on failure, restores prior bytes, deletes newly created files, removes newly created empty directories, and preserves the staging bundle and journal.

Unrelated project files are deliberately excluded from the relevant snapshot, so an unrelated edit does not create a false conflict.

## Security and correctness boundaries

- Receipt hashes are integrity checks, not signatures against an attacker who can rewrite the bundle and recompute hashes.
- A cooperative local filesystem is assumed. There is still a narrow time-of-check/time-of-use interval between the final namespace check and each write. A production hardening pass may require descriptor-relative APIs and platform-specific no-follow semantics.
- Each individual `Data.write(..., .atomic)` is a single-file replacement. A set of two or more files is **not** atomically visible as one transaction.
- Rollback is compensating recovery. If rollback itself fails, the journal becomes `recoveryRequired`; the staging proposal and backups remain available for explicit recovery.
- The adapter does not persist the accepted execution-kernel receipt or prove that a caller supplied it. Native integration must bind the exact complete v2 receipt, plan hash, run ID, and manifests before constructing this request.
- No shell, Git, provider, network, installer, or live project behavior exists in this package.

## Remaining gates

1. Independent review of this exact candidate and frozen hashes.
2. Native mapping from one integrity-verified, complete kernel receipt into this adapter without a model-authored path crossing the boundary unvalidated.
3. Durable run/receipt/staging reference persistence and launch-time recovery UI.
4. User-visible review/apply flow with explicit project permission and conflict handling.
5. Platform-specific race hardening or an explicitly accepted cooperative-filesystem threat model.
6. Frozen native tests and macOS/iOS builds.
7. One authorized disposable two-provider task with exact functional and rendered evidence.

Until those gates pass, Swarm remains unavailable.
