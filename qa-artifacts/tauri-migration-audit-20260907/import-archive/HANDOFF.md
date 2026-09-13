# Transactional legacy archive handoff

Scope: isolated host library, authorized by the runtime owner. No candidate4 files changed. This is an append-only import archive, not a completed migration into the app's visible workspace. It has no provider, credential, admitted-run, or application-lifecycle API.

## Integration

1. The host keeps the user-selected original byte buffers private and presents the preview for review. Enforce the preview byte limits before reading source files.
2. After explicit confirmation, construct `PreparedImport::from_reviewed(originals, reviewed_fingerprint)`. This reparses the actual originals; edited public preview fields cannot omit records or grant execution. A fingerprint binds data, not user authorization: the host must retain its own confirmation state.
3. Open `ArchiveStore` at a dedicated private directory under the app's trusted local profile parent. It holds an exclusive OS file lock until dropped. Keep one store owner; `Busy` is a contention result to retry or explain, not a reason to delete the lock file.
4. `commit` stages full original bytes, exact raw records and a manifest, validates them, flushes files/directories where supported, then renames the whole directory into a fingerprint namespace. Existing destinations are validated and deduplicated; malformed destinations are never replaced.
5. `load` verifies every listed file, expected filename, length and hash, reparses originals, and regenerates the records manifest before returning inert history/projects/drafts/preferences. Namespace imported IDs by archive fingerprint when integrating with existing workspace data; equal legacy IDs in different imports remain distinct here.

Complete staging directories are not automatically promoted. Interrupted stages are retained and counted by `inventory`; a newly confirmed retry creates a fresh stage. There is no automatic deletion or cleanup API. The host must provide recovery/retention controls and storage limits before broad use. Errors after publication return `CommitUncertain`; reopen and reconcile that fingerprint instead of assuming nothing was saved.

## Guarantees and limits

The API is append-only; local files are not made tamper-proof. Full integrity is rechecked on reads and duplicate commits. Actual payload names are fixed by code, not imported paths. Saved project paths/bookmarks are never dereferenced. Invalid backup bytes remain exact. Imported work never creates runnable requests.

Root must be under a trusted private parent on a local filesystem. Checks reject root/payload symlinks, unexpected file types and broad Unix permissions; Unix regular files must have one link. These checks do not defend against malicious ancestor replacement or a noncooperating same-user process changing paths. The stable advisory lock coordinates cooperating writers only and is never unlinked.

`CommitReceipt` explicitly returns `sync_scope` and `access_scope`. On Unix, directory and file sync requests succeed and owner-only modes are checked. This is not a hardware/power-loss guarantee. Non-Unix receipts say `FilesOnly` and `InheritedAclNotVerified`; Windows ACL provisioning and directory durability need platform implementation/acceptance before release. macOS execution is verified here. Windows/Linux execution is not verified by these tests.

## Evidence

Workspace-local rustc/cargo 1.98.1. `python3 run_tests.py --offline --locked --features fault-injection` runs 12 regression tests; one ignored helper is invoked explicitly by three owned child-process exit scenarios. The default-feature run exercises 10 tests and compiles the production API without fault injection. Final receipts bind crate/dependency/fixture hashes and confirm those inputs stayed unchanged during execution.

Tests cover exact original/raw numeric preservation, damaged archives, record tampering with forged matching manifest hashes, unexpected/missing/path-traversing manifest entries, privacy modes/links, exclusive locks, duplicate imports, identical legacy IDs across separate archives, six injected interruption boundaries, incomplete-stage retention, and three actual process exits. Synthetic data only. Process-exit cases are serialized to avoid cross-test descriptor overlap; an earlier parallel run returned transient Busy, whose exact cause was not established.

Independent source review found no remaining blocker after root-parent sync and explicit platform receipts were added. The reviewer did not independently execute the tests. Actual app preview/confirmation, destination integration, rendered migration, rollback of workspace activation, restart behavior, and platform installer tests remain required.
