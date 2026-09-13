# Independent filesystem-v3 review

**BOUNDED ACCEPT of the isolated filesystem candidate.** The previous package, destructive compensation and stable project-boundary replacement defects are closed by this candidate. No remaining P1/P2 was reproduced in the reviewed delta. This is not native integration or Swarm availability acceptance.

## Exact source and independent execution

Verified the artifact package, source and owner test files match the clean owner package at `/private/tmp/rivune-swarm-fs-v3.IlYP02` byte for byte:

- Source: `6411e545fe5de465f3c967e62fbeafcfc5fe493dbd50a56b3d89a833db97ae44`.
- Tests: `df34d68acb01ed538a61ef3bc4ffb9df8b261c4e178fe66554fdc86397cb34f2`.
- Package: `b757c7fbce2c11b01f76d5cd008240d3fda3bdfaa07a810ed3327692bacf567d`.

Reviewed the v1/v2 rejection reports, v3 source, v2-to-v3 delta, all supplied tests, audit and integration contract. Copied the exact frozen package into `/private/tmp/rivune-filesystem-v3-review-p1xa45y0`, added five independent fixture tests, and ran `swift test --package-path /private/tmp/rivune-filesystem-v3-review-p1xa45y0`: **22 tests passed, zero failures, zero compiler warnings** (17 supplied plus five independent). An initial sandbox-only attempt could not write the compiler cache; the approved cache-access retry produced the final successful log. Frozen source/tests were not modified.

Evidence under `independent-evidence/` includes hashes, executable added tests, the full successful test log and structured results. All test writes were confined to disposable temporary synthetic fixture directories.

## Prior defects replayed

The independently executed supplied suite confirms that existing package descendants with a nil base are rejected; correct-base package bytes are backed up and restored; package symlinks are rejected; later user edits are preserved with hash-bearing recovery evidence; and replacement directories and their contents survive compensation. Ordinary rollback and removal of adapter-created empty trees also pass.

The original v2 root-symlink reproduction now returns recoveryRequired with root-level unsafe-root evidence. External proposal bytes remain unchanged, the moved actual project's proposal remains intact pending inspected recovery, and the original backup remains in staging. It no longer follows the replaced root or falsely reports rolledBack.

## Independent adjacent boundary probes

The five new probes verify:

1. After-write replacement of the root by a different ordinary directory preserves both locations.
2. After-write replacement of an ancestor by a different ordinary directory preserves both locations.
3. After-write replacement of an ancestor by a symlink preserves both locations.
4. Root symlink replacement before the first destination write blocks that write.
5. Ancestor directory replacement before the first destination write blocks that write.

Every probe checks moved-project bytes, replacement bytes, unrelated replacement content, original staged backup bytes, the recoveryRequired receipt and root-level unsafe-root conflict, and the persisted journal state. Before-write cases preserve the original bytes in the moved project; after-write cases preserve the proposal there for explicit reconciliation.

Source inspection confirms the root-to-project chain freezes directory kind, device and inode, then revalidates before relevant snapshots, project-parent creation, forward target checks, compensation and target inspection. A failed initial compensation-boundary check returns before descendant inspection or mutation. The canonical project-path check is retained. This establishes the advertised stable pre-inspection boundary behavior for this process.

## Explicit limits

These tests do not prove protection against replacement between a successful boundary check and the next filesystem syscall. Descriptor-relative no-follow hardening remains a production gate unless an explicit cooperative-filesystem model is selected. Individual atomic writes are not a transaction across multiple files. The destination-write/journal-write crash interval, durable reconstruction, power-loss behavior and real failing-volume recovery remain unproven.

The native caller still must provide an application-owned staging location, verified execution-receipt/path/byte binding, project permission and durable recovery handling; after recoveryRequired it must block automatic retries and must not construct a replacement session to bypass the admitted identity. No provider, credential, real user project, native UI, installation, shared app source or accepted execution kernel was touched. Keep Swarm unavailable until its separate integration and live acceptance gates pass.
