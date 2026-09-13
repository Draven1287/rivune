# P1 correction recheck — residual finding

P1 remains open. Known selected/background conflicts now preflight before beginShutdown, but host-begin state is local to each callback and forgotten on repeated Quit.

First Quit: begin succeeds, a rich flush rejects with conflict, renderer stays frozen. Second Quit: local hostShutdownBegun resets false; conflict preflight throws; catch unfreezes renderer although the first invocation already froze the host. An uncertain begin acknowledgement similarly must remain conservatively remembered across invocations.

Executed exact extracted callback with a stub rejected rich flush using `check-repeat-quit.cjs`. REPEAT_QUIT_RECEIPT.json records one host begin, host still frozen, renderer/shell unfrozen after second Quit. No browser or Rust execution. Current source hash `5d3e5b93a5b1ab703edba7cdf9f8ee882d4f33253be1f2f15cecd2dc882a4c74`; it changed from PASS2_HASHES.json during concurrent work. This finding binds the actual extracted source, not an assumed freeze.

Required correction: persist conservative host-begin state across attempts until authoritative lifecycle resolution. Resolve pending CAS risk before begin or provide safe post-begin conflict recovery; no renderer-only unfreeze. Add first-begin→flush-conflict→repeat-Quit and uncertain-begin→repeat-preflight-error fixtures. Owner's 25 reported browser checks cover initial conflict preflight, not these sequences. Broad regression/native acceptance remains separate.
