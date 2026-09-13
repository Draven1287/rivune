# Independent filesystem-v2 re-review

Verdict: **REJECT — one remaining P1 recovery-boundary defect.** The original two v1 findings are fixed, but rollback can still write outside the admitted project and report a false successful rollback after the project root is replaced.

## Exact candidate and test evidence

Independently matched frozen source SHA-256 `b64d3503c362049c5da44ae4bbc89281e3fecf8c347f086fe15d5b135ad408db` and tests SHA-256 `9ed37ee092aa168391a735ef5e53d0c76f11528a8a37eb25c6714020fedcae4b` at `/private/tmp/rivune-swarm-fs-v2.JrmGCi`. Reviewed the v1-to-v2 source delta, owner tests and v2 integration contract.

Copied the exact source/package and tests into `/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-swarm-fs-v2-independent-6dtk6k9z`, replayed the three original reviewer probes with corrected expectations, and added one adjacent recovery probe. Ran `swift test --package-path /var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-swarm-fs-v2-independent-6dtk6k9z` with approved compiler-cache access: **20 tests passed, zero failures**, comprising all 16 owner tests and four reviewer probes. No compiler warnings observed. The new probe asserts the observed defect, so the passing suite is reproduction evidence rather than acceptance.

All writes were to disposable temporary fixtures; no real user project, shared app source, accepted execution kernel, provider, network, UI or install was changed.

## Original findings closed

- The existing package descendant with nil base is now rejected before staging and preserved.
- Correct-base package originals receive backups and normal rollback succeeds; package symlinks are rejected in the independently run owner suite.
- Later user edits are preserved and return recoveryRequired with observed hash evidence.
- Replacement directories and their contents are preserved and return recoveryRequired.
- Source inspection confirms full enumeration and an explicit enumeration-error failure path. A filesystem enumeration-permission fault was not independently injected.

## P1 — Rollback does not validate the project root before following it

`inspectTarget` at source lines 401–424 sets its cursor to projectRoot but inspects only descendants. Neither the root itself nor its identity is validated there. `rollback` then restores/removes through that root path when a descendant's kind/hash matches the proposal.

Deterministic reproduction using the supplied after-file fault seam:

1. Create admitted project/a.txt with `original`, and a separate temporary external/a.txt with `proposal`.
2. Stage/apply the proposal to project/a.txt.
3. After the write, move the real project directory to moved-project, replace the old project path with a symlink to external, then throw the injected failure.
4. Before rollback begins, the replacement is already complete and stable.
5. Rollback follows the root symlink, reads matching proposal bytes in external/a.txt and overwrites that external file with `original`.
6. The real moved-project/a.txt remains `proposal`, yet currentReceipt reports `.rolledBack` and apply throws only `.applyFailed`.

This simultaneously violates project confinement, preservation of replacements, and the claim that a successful rollback restored the actual project. It is not a race inserted between inspectTarget's successful validation and a write: the root is already a symlink before inspection starts, and inspection omits it entirely.

Required correction: validate the admitted project root itself and its stable directory identity during recovery before any descendant read/write; treat replacement, aliasing, symlink or uninspectable root as recoveryRequired and preserve both locations. Apply the same boundary validation consistently to forward writes and created-directory cleanup. Validate the relevant canonical ancestor chain or hold an appropriate directory handle so changing a parent cannot silently redirect the root. This is separate from any explicitly deferred platform-level protection against a change after validation.

Add a regression requiring external bytes unchanged, actual moved-project proposal untouched pending explicit recovery, recoveryRequired status, and journal evidence identifying the unsafe root. Retain the original user-edit/directory/package fixes.

## Scope

No additional finding is raised for declared future native mapping, durable reconstruction/UI, descriptor-relative syscall race hardening, lead/provider orchestration or live availability. Keep Swarm unavailable and the accepted execution kernel unchanged. This review is limited to the advertised filesystem confinement and compensation behavior.

Evidence is in `independent-review/`: exact frozen source/tests, augmented IndependentTests.swift, test.log and results.json. Rejected v1 evidence remains intact.
