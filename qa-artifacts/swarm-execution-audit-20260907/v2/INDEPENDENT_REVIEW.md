# Independent Swarm v2 re-review

Verdict: **BOUNDED ACCEPT** of this exact isolated execution foundation. No remaining P1/P2 finding in the reviewed delta or the three v1 defect cases. This is not acceptance of a live Swarm product or an installed native integration.

## Frozen identity

Independently verified:

- Package.swift SHA-256 `f09a84b73724de03848c0ec39bbf86c22327effd12bf9a8b60db120793bdd233`
- Source SHA-256 `dc3b6595754f9f5a39d2f37891de520da7b71989dfad2cfbc5b4c57094b2a78c`
- Tests SHA-256 `f9ef10247c8443caffb202afac44836959d18bcf470107cd4f78d247f21d40ec`

Reviewed the exact source diff from rejected v1, the new owner regression tests, and the updated audit/integration requirements. Production source changes are bounded to schema-v2 typed receipt encoding, normalized target prefix conflicts, and cancellation-handler lifetime across scheduling/integration for both run and retryFailed.

## Independent execution

Copied the frozen package/source and owner tests into `/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-swarm-v2-independent-x7i1ovsy`, then appended the same four reviewer probes used to reject v1, changing their expected outcomes to the corrected behavior. Frozen source and tests were not edited.

Ran `swift test --package-path /var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-swarm-v2-independent-x7i1ovsy` with approved compiler-cache access: **18 tests passed, 0 failures**, comprising all 14 owner tests independently run plus four reviewer replays. No compiler warnings were observed in the completed log.

## Findings closed

1. **Receipt identity collision fixed.** The typed schema-v2 digest payload uses sorted-key JSON rather than delimiter concatenation. Changing `openai:codex` / `cli` to `openai` / `codex:cli` now fails integrity verification under the unchanged original hash. Changing absent effort to literal `default` also fails. Legitimate receipts verify. This is integrity checking, not a signature proving authenticity against someone able to recompute the digest.
2. **Target prefix conflict fixed.** Existing `STYLES` blocks proposed `styles/site.css` with a conflict receipt and zero verifier calls. The independently run owner suite additionally verifies descendant-file conflicts and canonically equivalent Unicode ancestors. Planned disjoint ownership and exact-base checks remain unchanged.
3. **Caller cancellation fixed during verification.** The replay now observes verifier cancellation after `run.cancel()` while verification is suspended. The run returns cancelled. Existing explicit session Stop tests also pass. Source inspection confirms retryFailed now uses the same enclosing cancellation-handler structure; no separate live or process-level cancellation claim is made.

## Acceptance boundaries

This acceptance covers injected workers/verifier, process-local scheduling and repair, frozen team identity, in-memory integration, conflict/check gates, receipt integrity and synthetic cancellation behavior. The declared future lead planner, partner cross-review, real CLI/tool adapter, isolated worktrees, durable restart, native apply/rollback and UI remain separate work. No providers, installations, UI interactions, shared app files or user project data were changed. Keep Swarm unavailable until its documented integration and live acceptance gates pass.

Evidence: `independent-review/FrozenSource.swift`, `FrozenTests.swift`, `IndependentTests.swift`, `test.log`, and `results.json`. The rejected v1 review and reproductions are preserved in the parent artifact directory.
