# Swarm filesystem staging/apply audit — candidate v3

Status: isolated review candidate. Filesystem v1/v2 remain frozen with their independent rejection evidence. Execution-kernel v2 remains accepted and unchanged. Swarm remains unavailable.

## One-product boundary

Rivune has one conversation, team, and composer. Its appointed lead chooses an internal Council, Swarm, or sequenced strategy; runtime validates capability, permission, and budget. This adapter is only a composable filesystem phase of an admitted Swarm-containing run. It neither chooses strategies nor invokes providers.

## Prior P1 history

- Filesystem v1 skipped package descendants and could overwrite an unobserved file; rollback could destroy a later file edit or replacement directory.
- Filesystem v2 closed those cases, but rollback did not inspect the admitted project root itself. A deterministic reviewer probe moved the real root, replaced its old path with a symlink to an external directory containing matching proposal bytes, and showed rollback following that symlink, changing external data, leaving the real project unrolled back, and falsely reporting `rolledBack`.

Exact rejected sources, tests, independent probes, logs, and reviews remain under `../filesystem-v1/` and `../filesystem-v2/`.

## v3 correction: frozen project boundary identity

At session admission, v3 records the canonical path, device number, inode number, and directory kind for the project root and every ancestor through the filesystem root. It then revalidates that boundary:

- before every relevant namespace snapshot;
- before creating project parents;
- immediately before each forward target write;
- before target inspection;
- before compensation begins and before each compensated file/directory step.

Replacement, symlink redirection, aliasing, missing components, type changes, device/inode changes, or an uninspectable boundary fail closed. Compensation performs no descendant read/write after a failed boundary check, preserves the moved project and replacement destination, records a root-level `unsafe-root` recovery conflict, and returns `recoveryRequired`.

## Retained v2 protections

- no skipped package descendants; enumeration failure is not absence;
- exact base hashes and original-byte backups, including package-owned files;
- traversal, symlink, case alias, Unicode alias, and normalized ancestor/descendant rejection;
- second relevant namespace and byte recheck at apply;
- compensation only when current regular-file bytes equal this attempt's proposal;
- later file edits, directories, symlinks, and unexpected occupants are preserved with per-path recovery evidence;
- adapter-created parents are removed only while still directories and empty;
- unrelated project edits do not false-conflict.

## Atomicity and threat-model limits

- Each file write and journal write uses single-file atomic replacement. Multiple destination files are serial and not atomic as a set.
- Rollback is compensating recovery, not a transaction. A crash between a destination write and journal persistence still requires durable restart design.
- Boundary validation closes stable pre-inspection root/ancestor replacement. It does not eliminate a privileged or concurrent replacement in the syscall interval after successful validation. Descriptor-relative no-follow APIs remain a production hardening gate unless Rivune explicitly accepts a cooperative-filesystem threat model.
- Device/inode checks establish continuity of the admitted directory objects for this process; they are not cryptographic identity or authorization.
- No native code, UI, user project, provider, network, shell, install, or live state was changed.

## Remaining gates

1. Independent review and replay of this exact frozen v3, including all prior P1s.
2. Exact binding from a complete integrity-verified execution receipt to owned paths and bytes.
3. Durable restart, crash-window recovery, and inspected `recoveryRequired` UI.
4. Explicit project permission at stage and apply.
5. Descriptor-relative hardening or an explicit cooperative-filesystem security decision.
6. Frozen native tests and macOS/iOS builds.
7. One authorized disposable two-provider task with exact functional and rendered evidence.

Until the applicable gates pass, Swarm stays unavailable and no fallback may be labeled Swarm.
