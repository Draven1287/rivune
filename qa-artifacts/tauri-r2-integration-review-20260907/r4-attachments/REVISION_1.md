# R4 contract revision 1 — persistence phases

Review finding: r4-attachments-review/REVIEW.md. The original review and fixture receipt remain unchanged in that sibling directory. Original 26 cases became 28; the nine byte fixtures and their manifest are unchanged.

Superseded generic case:
- id: save-failure
- steps: Inject persistence fault during rich draft save
- expected: Old snapshot unchanged; dirty renderer text/chips preserved; no success ack; no dispatch

That expectation was too broad: host.rs commit_candidate publishes the candidate when save returns committed:true, even though crash durability is uncertain. Contract prose now distinguishes pre-rename failure, post-rename visible uncertainty and a durable commit with a lost response. The former case is now save-failure-before-rename. New save-failure-after-rename and shutdown-after-rename-uncertainty cases preserve visible state, block Send/Quit and require same-identity durable synchronization without a duplicate revision or attachment. The lost-save-ack expectation no longer treats snapshot readback as durability proof.

This is a small before/after revision record, not a claimed complete byte-for-byte archive of the original contract. The current contract/cases await reviewer recheck and runtime acceptance. No canonical source changed.
