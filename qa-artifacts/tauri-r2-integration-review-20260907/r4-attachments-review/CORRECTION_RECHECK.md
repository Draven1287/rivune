# R4 bounded correction recheck

September 8, 2026. **The reported P2 contract/fixture finding is closed.** This supersedes REVIEW.md's correction-required disposition only; it does not accept an implementation.

Corrected save_rich_draft and renderer language now distinguish pre-rename unchanged state, post-rename visible but crash-durability-uncertain state, and durable commit with lost response. Uncertain state blocks Send; immutable mutation identity must complete required synchronization before a durable receipt, without duplicate revisions or attachments. Snapshot visibility alone is explicitly insufficient.

Shutdown preserves the visible candidate and keeps the window open/frozen until durability is resolved. It cannot complete from readback alone or silently fall back to text-only persistence. These expectations align with existing persist_with_fault/commit_candidate committed:true semantics; R4's reconciliation mechanism remains to be implemented and tested.

CASES.json now has 28 unique cases, including separate before-rename failure, after-rename directory-sync failure, shutdown uncertainty and durable-receipt lost-ack recovery. JSON and identifiers checked. Fixture manifest hash is unchanged; the nine byte files were not re-audited. CORRECTION_RECEIPT.json binds corrected inputs and current host hash.

No new broad review, canonical changes, Rust/host execution, provider calls, UI, Cargo or build work occurred. Actual fault-phase, restart and reconciliation behavior remains unverified until R4 implementation acceptance.
