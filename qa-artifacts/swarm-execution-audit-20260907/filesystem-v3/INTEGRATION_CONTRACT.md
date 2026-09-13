# Narrow integration contract — filesystem candidate v3

## Composable phase

The lead coordinator selects and explains Council, Swarm, or a sequence. Runtime policy admits capabilities, permissions, and budget. This filesystem adapter runs only after a Swarm-containing strategy and exact project scope are admitted. It never selects a strategy or calls a provider.

Native construction must require:

- a user-approved canonical project directory and separate application-owned staging directory;
- a complete schema-v2 execution receipt with valid integrity, exact run ID and plan hash, and every required check passing;
- one-to-one equality among planned ownership, receipt manifests, expected base hashes, and staged bytes;
- no model-authored absolute roots, staging paths, permission expansion, shell commands, conflict waivers, or success labels;
- an explicit apply action after review unless the user separately approved an automation policy.

## Boundary continuity

The same `SwarmFilesystemApplySession` owns stage and apply. Its frozen root/ancestor identity is part of admission. Any boundary mismatch yields conflict or `recoveryRequired`; callers must not reconstruct a new session against the replacement path and call that a retry.

On `recoveryRequired` with `path == "."` and `observedKind == "unsafe-root"`:

1. perform no automatic descendant reads, writes, or rollback through that path;
2. retain staging proposal, backups, and journal;
3. block further automated apply for the run;
4. show that project location identity changed and require inspected relocation/reconciliation.

## Compensation rules

- Restore/remove only a regular file whose current hash exactly matches this attempt's proposal.
- Never follow or recursively remove a symlink or directory at a file target.
- Remove adapter-created parents only if the root boundary is intact and each parent remains a directory and empty.
- Preserve every occupant whose ownership cannot be proven and record path, reason, kind, and hash when available.
- `rolledBack` means every applied path was safely compensated or an originally absent proposal was already absent. It does not mean a multi-file atomic transaction existed.

## Remaining native obligation

Persist execution receipt, staging reference, and recovery state durably. Design launch-time reconciliation for the crash interval between a destination write and journal update. Keep Swarm unavailable until the broader acceptance gates pass.
