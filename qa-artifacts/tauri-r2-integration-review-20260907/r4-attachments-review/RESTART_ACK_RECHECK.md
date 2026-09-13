# Restart acknowledgement correction recheck

P2 closed at renderer scope. Frozen app.mjs hash `d138aa3416d0c0f7531ae16069991c8e5a9de0f00b9318e986c0860af171e2d7` and targeted browser fixture hash `2fcf723f1856eb2ae863b6d46e33595690dbd3a3b5ad8672b510502322f0811d` match the owner receipt after inspection.

Both immediate and persisted acknowledgement paths now pass saved rich revision and ordered attachment IDs. Clearing checks text, revision, IDs and local pending/conflict state; queues an empty save with the original expected rich revision; requires a matching durable receipt; and rechecks local state before clearing it. Missing old recovery identity conservatively skips clearing. No saved rich revision is inferred from a reset local counter.

Executed `node check-restart-ack-fixed.cjs`: exact production clear function and actual receipt parser, with stub host. Four targeted cases pass: changed file preserved without a save; removed file preserved without a save; exact unchanged draft clears using original CAS10; rejected host CAS preserves local text. RECEIPT is RESTART_ACK_FIXED_RECEIPT.json. Original failing fixture remains preserved separately.

Inspected owner RESTART_ACK_CHECKS.json and browser fixture: 46 reported passing checks, including persisted changed/removed IDs and changed text, immediate changed/removed IDs, exact clear, and host CAS rejection. Reviewer did not rerun the browser suite, Node suite or Rust host. Broader regression status is owner work, not evidence supplied by this review.

No canonical edits, native UI, builds, providers or account actions. This closes the renderer data-clearing finding only. Actual Rust CAS/persistence/restart and the separate lost-abort-acknowledgement host P2 remain separate acceptance dependencies.
