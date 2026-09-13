# REVIEW-QUICK-DRAFT correction v2

Status: isolated corrective fixture only. Do not apply to canonical source. The original candidate, patch, tests, manifests, and hashes remain unchanged one directory above.

Independent review source: `qa-artifacts/tauri-r2-integration-review-20260907/review-quick-draft-review/REVIEW.md`.

## Finding disposition

### P1 late durable acknowledgement

Corrected in the fixture.

- The controller freezes an immutable reconciliation guard with conversation ID, local draft version, rich-draft revision, complete base text, and ordered attachment IDs.
- `applyDurableIfCurrent` re-reads renderer state after the host acknowledgement.
- It applies only when every guard field still matches and no newer pending mutation exists.
- If renderer state advanced, it does not alter the composer, local drafts, dirty state, rich revision, pending mutation, conflict state, or attachments. It requests a safe authoritative refresh and records the Review mutation as durably resolved.

### P2 settling action replacement

Corrected in the fixture.

- `settling` is an active, non-replaceable state. A duplicate action is idempotent; a different tray activation cannot replace it.
- Every `add()` owns an operation epoch and checks it after both asynchronous boundaries: ordinary-draft settlement and target acquisition.
- Dismissing during settlement invalidates the epoch before any Review host write. A later action may then open without being overwritten by the old continuation.
- Once the host write begins, dismissal only hides the UI; it cannot pretend to cancel an unknown write.

### P2 copied/reset profile lineage

Made conservative; runtime dependency remains unresolved.

- V2 requires a separate `workspaceIncarnationID` in addition to the existing scope value.
- A persisted uncertain record includes a process-session ID and incarnation ID.
- Any restored record is `blockedRecovery`; it exposes no saved text and cannot call `saveRichDraft`.
- Same-process retry remains enabled and replays the exact immutable mutation/payload.
- Cross-process replay stays disabled even when the incarnation matches. This avoids blind append into a copied, reset, restored, or otherwise ambiguous workspace.

The earlier private `recovery-scope-v1` UUID proposal is withdrawn as lineage proof: copying that file copies its identity. See `RUNTIME_DEPENDENCY.md` for the contract required before safe cross-process reconciliation can be enabled.

## Scope retained

Typed/pasted Review text only. No clipboard read, screenshot capture, other-app monitoring, model submission, provider call, automatic append, or discard/rollback claim.

## Evidence

- New correction suite: 9 passed, 0 failed.
- Original owner suite: 11 passed, 0 failed and unchanged.
- Both corrected JavaScript files pass `node --check`.
- `REVIEW_QUICK_DRAFT_V2_INCREMENTAL.patch` passes `git apply --check` against the preserved original candidate tree.
- A malformed persisted record fails closed and cannot admit a new append.
- No Rust/native build, canonical edit, profile edit, app launch, or rendered verification.
