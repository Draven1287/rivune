# R4 attachment contract review

September 8, 2026. One actionable contract/fixture finding; no R4 implementation exists or was tested.

## P2 — Distinguish precommit save failure from postcommit uncertainty

`CASES.json` case `save-failure` injects an unspecified persistence fault and requires the old snapshot to remain unchanged. That is valid before commit, but contradicts the existing host contract after rename. `host.rs::persist_with_fault` at 1130 renames the candidate into the committed generation; `AfterRename` and directory-sync failure return `PersistError { committed: true }`. `commit_candidate` at 1755 publishes that candidate and reports crash-durability uncertainty. Existing test `post_rename_failure_is_visible_and_explicitly_uncertain` at 3284 expects the updated draft both in memory and after reopening.

Evidence: canonical host SHA-256 `c2f42a713698d38651c565d17c3d6317f9ef31cac8a0f39cf1506e8d9f5b1643`; reviewed `CONTRACT.md`, `CASES.json` and fixture hashes are bound by `FIXTURE_REVIEW_RECEIPT.json`. The standalone checker confirms the supplied case's unqualified expected outcome; it does not reproduce Rust persistence or claim R4 execution.

Requested correction: explicitly separate pre-rename failure (old published state; preserve unsaved text/chips), post-rename uncertainty (candidate may already be visible; preserve edits and immutable mutation identity; report uncertainty), and durable commit with lost response (idempotent recovery). Specify what revision/receipt the renderer can trust, how durability is reconciled before Send or Quit, and that simple current-state readback must not be described as proof of crash durability. Apply the same distinction to rich shutdown flush.

Acceptance fixtures should cover AfterWrite/AfterSync, AfterRename/directory-sync failure, and lost acknowledgement independently. A same-ID retry must not increment the revision twice, lose the pending attachment bytes, roll back a committed generation, or silently dispatch from uncertain state. These are future actual-host tests, not results of this review.

## Reviewed without additional finding

- Explicit native selection, preview approval and process/conversation-bound tokens; no renderer file paths or byte authority.
- Exact UTF-8 bytes/hash preservation, deterministic admitted document array and frozen retry independent of current files/project state.
- Expected-revision rich saves, text/attachment ordering, immutable mutation payload, delayed acknowledgement and navigation binding.
- Per-conversation handles and imported read-only rejection; existing project linkage remains the instruction authority.
- No-follow path-component checks, descriptor/path replacement checks, source revalidation and changed/missing rejection.
- Four-file, 64-KiB individual, 128-KiB aggregate and existing 512-KiB serialized-context budgets.

## Executed evidence and limits

Ran `python3 check_fixtures.py` in this review directory. All nine byte lengths and SHA-256 values match the manifest; all 26 scenario IDs are unique and their fixture references resolve. The receipt also records strict UTF-8/NUL classifications and boundary sizes. These are **fixture checks only**. Scenarios remain descriptive recipes, not implemented host tests. Traversal/TOCTOU/platform picker behavior, persistence faults, restart, CAS, native rendering and provider admission were not exercised. No canonical code, UI, build, Cargo, account or provider actions occurred.

Disposition: correct the persistence contract/fixture distinction before treating the R4 contract as accepted. No other actionable defect established in this bounded review.
