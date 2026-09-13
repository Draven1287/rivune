# Narrow integration contract — filesystem candidate v2

## Composable lead-directed phase

The coordinator owns strategy selection and its structured reason. Runtime policy owns capability, permission, and budget admission. This adapter may run only after a Swarm-containing strategy has been admitted. Council and single-provider paths remain unchanged. Unavailable Swarm remains unavailable.

Before creating a session, native integration must verify and bind:

- the user-approved project root and write scope;
- execution receipt schema v2, complete state, receipt integrity, run ID, and exact plan hash;
- all required checks passing;
- exact one-to-one equality among planned owned paths, receipt manifests, expected base hashes, and proposed bytes;
- an application-owned staging parent outside the project;
- an explicit apply action after review unless a separate user-approved automation policy exists.

Model text may not provide absolute roots, staging locations, permissions, path expansion, conflict waivers, shell commands, or success state.

## State handling

- `prepared`: persist the execution receipt and staging reference together; show a review, not completion.
- `conflict`: preserve target bytes; require a fresh snapshot/re-plan.
- `rolledBack`: the adapter proved every compensated occupant was still its exact proposal and restored/removed it.
- `recoveryRequired`: at least one current occupant was missing, changed, replaced, unsafe, or uninspectable. Preserve it. Block further automated writes and show the journal, backups, observed kind/hash, and manual recovery choices.
- `complete`: all serial writes finished. This still does not mean the multi-file change appeared atomically.

## Apply and rollback rules

1. Recapture the relevant namespace immediately before the first destination write.
2. Never infer absence from a skipped package or enumeration failure.
3. Write each file atomically as an individual file and journal serial progress.
4. On failure, compensate only paths whose current regular-file hash still equals the proposal hash from this attempt.
5. Never follow or recursively delete a symlink/directory found at a file target.
6. Remove an adapter-created parent only if it is still a directory and empty.
7. Retain staging evidence until user dismissal or an explicit retention policy.

## Required native follow-up

Durable restart must handle the crash window between a destination write and journal persistence. The UI must not offer automatic retry from `recoveryRequired`; it needs inspected reconciliation. Native availability must remain off until the broader Swarm gates pass.
