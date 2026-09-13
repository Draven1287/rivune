# Independent filesystem-v1 review

Verdict: **REJECT — two P1 data-loss defects reproduced.** Review date: 2026-09-07. Keep this candidate isolated and Swarm unavailable. Accepted execution-kernel v2 was not modified.

## Verified evidence

Read AUDIT.md, INTEGRATION_CONTRACT.md, VERIFICATION.md, the source and all owner tests. Independently matched the frozen source SHA-256 `fd8be1285fbf089ce0540537e151432163de6a9f7aef49cc3bc34a162a04572f` and tests SHA-256 `f4980fc3d84a9b3abdad46a0babf1a114f0115933f20d8b41e6e61070658cf66` in `/private/tmp/rivune-swarm-fs.ntQyYK`.

Copied the exact package/source and tests into `/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-swarm-fs-independent-596onrh3`, appended three reviewer probes, then ran `swift test --package-path /var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-swarm-fs-independent-596onrh3` with approved compiler-cache access. **14 tests passed, zero failures**, including all 11 owner tests plus three actual defect reproductions. The probes assert observed bad behavior; their passing does not mean acceptance. No compiler warnings were observed.

All filesystem operations used disposable synthetic fixtures below the temporary directory and were cleaned up. No provider/network calls, native UI/install operations, shared source edits, accepted-kernel edits, or user project writes occurred.

## P1 — Package descendants bypass base checks and backups

`captureRelevantSnapshot`, source lines 226–245, enumerates with `.skipsPackageDescendants`. The path validator permits package components such as `Existing.app`, while the snapshot silently skips their descendants. The file can consequently be classified as new despite already existing.

Reproduced without a concurrent writer: create `Existing.app/Contents/valuable.txt` containing `existing-user-data`. Admit that exact owned path with expectedBaseSHA256 nil and proposed `proposal`. `stage()` succeeds and creates no original-byte backup for the existing file. `apply()` returns `.complete` and replaces the original bytes with `proposal`. Both stage-time and apply-time snapshots miss the file, so the conflict check does not catch it.

Required correction: enumerate the entire relevant namespace, including package descendants, or reject package-owned subtrees explicitly before staging. Do not interpret skipped/inaccessible enumeration as proof of absence. Add regressions for existing package-owned files with nil and correct base hashes, backups and rollback, and a relevant symlink below a package. A skipped package is a deterministic snapshot defect; the documented narrow TOCTOU limitation does not cover it.

## P1 — Compensating rollback destroys later user changes

`rollback`, source lines 330–351, overwrites existing targets with original bytes and calls `removeItem` for originally absent paths without revalidating kind, namespace or whether the bytes are still this apply's output.

Two independent reproductions use the adapter's own after-file fault seam to simulate a second writer finishing before rollback starts:

1. Existing `a.txt` starts as `original`. After the proposal write, the seam writes `new-user-edit` and throws. Rollback overwrites the user edit with `original`, then reports `.rolledBack`.
2. New `a.txt` is created by the apply. The seam replaces it with a directory containing `keep.txt` and throws. Rollback recursively deletes the replacement directory and its user content, then reports `.rolledBack`.

These probes require no unresolved tiny syscall race: the replacement is fully present before rollback begins. A cooperative editor can change a file during a serial multi-file apply. Compensation must verify ownership of the current bytes/kind rather than assume every later occupant still belongs to this attempt.

Required correction: before restoring/removing each path, validate its ancestors and current file kind and verify it still matches the exact proposed bytes applied by this attempt. Preserve mismatched or replaced content and report recoveryRequired with sufficient per-path journal evidence. Never recursively delete an unexpected directory at a file target. Do not remove created parent directories unless they remain the owned empty directories. Add both reproductions as preservation/recovery regressions; retain ordinary successful rollback coverage.

## Positive checks and explicit scope

The original suite independently passed normal staging/apply, traversal and planned namespace rejection, relevant symlink rejection before staging/apply, case/Unicode ancestor conflicts, wrong-base rejection, byte changes between staging and apply, unrelated-edit tolerance, ordinary partial rollback and removal of created empty directory trees.

Per-file atomicity and the lack of multi-file atomicity are accurately described. No descriptor-relative race-resistance claim is made. Native coordinator mapping, durable reconstruction/recovery UI, live providers, launch and installed availability remain declared future scope and are not additional findings. This review rejects current advertised base-snapshot and safe-compensation behavior, not those future features.

Evidence: `independent-review/FrozenSource.swift`, `FrozenTests.swift`, `IndependentTests.swift`, `test.log`, `results.json`. The supplied candidate files remain unchanged.
