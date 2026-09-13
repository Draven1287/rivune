# Bounded review corrections, revision 2

Addresses both P2 findings in sibling artifact-workflow-review/REVIEW.md. Original six-file snapshot retained in before-correction-v1/. CORRECTION.diff records revised contract/DTO/cases/references; original generated artifact FIXTURE.json is unchanged.

P2 diff retrieval: readPreparedDiff is operation/capture-token/file-index scoped, bounded to 64KiB per side and captured private blobs, never renderer paths or current disk. New fixture exposes exact removed/added bytes plus changed-current-disk and stale rejection cases. Captured originals also receive aggregate size bounds.

P2 persistence phases: precommit rejected/prior-visible, postrename candidate-visible uncertain, and durable/lost-ACK cases replace the broad save-failure claim. Continuation IDs and payload/CAS identity, authoritative mutation/visible revisions, unresolved durability, same-ID durable synchronization, late ack/newer edit protection and no readback-only success are explicit. Receipt persistence never implies project rollback; recovery journals and durable synchronization gate success. R4 commit_candidate/save_rich_draft_in and restart-ack review are bound by exact current source hashes/lines.

40 synthetic acceptance cases now (26 minus generic save case plus15 phase/diff cases). Fixture byte/hash checks only; no runtime tests, writes, native UI/build, provider or canonical changes. Return for bounded two-finding recheck; proposed runtime mapping remains pending.
