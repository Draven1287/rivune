# R4 renderer pass 1

One blocking P1 finding in unfrozen source. app.mjs SHA-256 `6996fe339c81ba4e5094ad96a39c87d6ed0b407a90e8a4c573adf88cd65913cd`.

## P1: A draft revision conflict makes graceful shutdown unrecoverable

`writeRich` rejects immediately whenever `rich.conflictRevision !== null`, including shutdown-token writes. The shutdown callback sets `shutdownFrozen=true` and `.shell.inert=true` before flushing drafts. If one draft has a revision conflict, the flush rejects; the catch resets only `shutdownPreparing` and advises Quit again. Each subsequent Quit invokes the same conflict check, while Retry draft save is disabled and its handler returns immediately under shutdownFrozen. The user cannot reconcile through the advertised controls or complete graceful shutdown.

Reproduction: create a rich draft in A; let a save receive a revision-conflict rejection; choose Quit without first resolving it; try Quit again. Neither attempt reaches commitRich, and the conflict remains. This also affects a dirty unselected conversation during all-draft flush.

Evidence: `node check-conflict.cjs` executes the exact extracted writeRich function with a conflict-state fixture and stubbed dependencies. Two token-bearing retries produce the same rejection, zero commits and unchanged conflictRevision. RECEIPT.json binds the source. Interface freezing/disabled recovery is established by source inspection only; no browser or native host was run.

Correction: detect unresolved rich conflicts across all drafts before entering shutdown and retain an accessible path to the affected draft, or provide an explicit safe reconciliation/cancel-shutdown path supported by the host lifecycle. Do not merely unfreeze renderer controls after host shutdown has begun. Test conflict in selected and background conversations, then resolve it and verify a durable whole-draft shutdown; repeat Quit must not loop permanently.

Other inspected paths: per-conversation attachment state, exact mutation retry on uncertain results, durable-only receipts, preview/approval conversation binding, submitted revision forwarding, and shutdown flush identity. No additional blocking defect established in this pass. Runtime DTO implementation was not available in the host source inspected; no full wire/native acceptance is claimed. No canonical edits, UI, builds or provider calls occurred. Source is moving; findings apply to the recorded hash.
