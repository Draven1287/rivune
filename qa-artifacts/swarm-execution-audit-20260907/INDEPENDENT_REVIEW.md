# Independent Swarm foundation review — candidate 1

Verdict: **REJECT** for three reproducible P2 defects within the candidate's claimed guarantees. Review date: 2026-09-07. Frozen production source and original tests were not edited.

## Verified input and execution

Independently matched the owner hashes in `/private/tmp/rivune-swarm-final.bcuOQp`:

- Package.swift: `f09a84b73724de03848c0ec39bbf86c22327effd12bf9a8b60db120793bdd233`
- Source: `2efef25e4fd2531be28ebf1f064db44dd4f0d497d661f5cbab4cddb7334c4b71`
- Tests: `202b93d24048343180e93925f65e3954538c2ebfe1b6e6214fca39d40983ddae`

Read AUDIT.md and INTEGRATION_CONTRACT.md. Copied the exact source/package and original tests into a separate temporary package, then added four independent probes. Ran `swift test --package-path /var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-swarm-independent-vu_67mkp`: **14 tests passed, zero failures**, including all 10 original tests and all four defect reproductions. The probes assert the observed bad behavior; their passing does not mean acceptance. The initial sandbox attempt could not write Swift caches; the approved cache-access run completed without compiler warnings. No providers, UI, installations, user projects, or shared app source were touched.

## P2 — Changed worker identity can pass the original receipt hash

Source `canonicalReceiptPayload`, lines 509-519, joins arbitrary identity strings with `:` and serializes absent optional values as literal `default`. Identity validation permits colons and literal `default`. The encoding is not injective.

Reproduced on a real completed receipt: change worker provider/adapter from `openai:codex` / `cli` to `openai` / `codex:cli`, retaining every other field and the original receipt hash. `verifyIntegrity()` returns true. A separate receipt with absent worker effort also accepts a JSON mutation to the literal string `default` under its unchanged hash. Full identity binding and alteration detection therefore do not hold. This does not require recomputing the digest or finding a SHA-256 collision.

Required correction: hash a versioned, structurally encoded payload with unambiguous field boundaries and distinct null/string representation, such as a dedicated Encodable payload with canonical sorted-key JSON. Add unchanged-digest mutation tests for both cases and preserve legitimate receipt round-trip verification. A digest remains an integrity checksum, not proof of authenticity against someone who can recompute it.

## P2 — Existing ancestor or descendant files bypass target conflict checks

Source `integrateIfPossible`, lines 441-447, only looks up an exact normalized target key. Planned ownership already rejects prefix conflicts between tasks, but target ownership does not apply the same rule.

Reproduced with the original valid plan writing `styles/site.css` as a new file and the target snapshot containing an existing file `STYLES`. The run invokes the verifier and returns `complete`, although the target file blocks creation of the proposed directory. This is an in-memory conflict-detection defect, not a request to implement future native apply functionality.

Required correction: check normalized target-file ancestors and descendants as well as exact base hashes before invoking the verifier. Reject impossible prefix relationships as conflict without verification. Add both ancestor and descendant cases, including case/Unicode normalization, and retain same-path unchanged-base success.

## P2 — Cancelling the run task stops workers but does not stop an active verifier

Source `schedule`, lines 403-409, exits its cancellation handler before awaiting `integrateIfPossible`; the verifier is launched as an unstructured Task at lines 457-462. Cancelling the caller after verification starts therefore does not cancel the owned verifier. The post-await guard prevents publishing complete, but the check operation can continue indefinitely and keep the run pending.

Reproduced with a cancellable verifier sleeping for five seconds: after verifier entry, `run.cancel()` left verifier cancellation count at zero after 100 ms. Explicit `session.cancel()` then promptly cancelled it, returned a cancelled receipt, and produced cancellation count one. Existing explicit-Stop tests pass; the defect is propagation from cancellation of the public run task during the verifier phase.

Required correction: keep the cancellation handler active across scheduling and verification (or add a verification-phase handler) so caller cancellation cancels the owned verifier. Test cancellation through both APIs and retain late-result suppression.

## Bounded positives and excluded future scope

The original suite independently passes two concurrent workers, frozen member dispatch, disjoint planned ownership, exact returned output paths, dependency manifests, per-task repair without rerunning a successful peer, exact-base and case-variant conflict checks, explicit worker/verifier Stop, failed/malformed check rejection, and exclusion of approved context/output/evidence bytes from the receipt. Exact check observations are required before complete. These are useful foundations.

The declared absence of lead planning, partner cross-review, real CLI/tool adapters, isolated worktrees, durable restart, native apply/rollback, UI and live acceptance is not counted as a regression. This review does not authorize enabling Swarm or claim consumer ChatGPT/Claude parity. Preserve those explicit integration gates.

Evidence is in `independent-review/`: unchanged frozen source/tests, augmented IndependentTests.swift, test.log and results.json.
