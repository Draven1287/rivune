# Codex CLI execution receipts — isolated v2 candidate

## Verdict requested

This v2 replaces the rejected v1 integration candidate. It remains isolated and must not be applied to shared native source until independent review accepts it.

## P1/P2 corrections

- Raw JSONL thread and item IDs are never serialized; only SHA-256 identities remain.
- Unknown event names and item types are reduced to fixed `unknown`/`unexpected` values and a bounded count.
- Unknown item statuses are reduced to fixed `unknown`.
- Requested model text is never serialized; only its SHA-256 identity remains.
- Requested effort is retained only when it exactly matches the six supported Codex effort values.
- CLI version is retained only in canonical `codex-cli major.minor.patch` form.
- Token counters use nontrapping decimal-to-`UInt64` parsing and a documented 1,000,000,000,000 maximum. Booleans, negatives, fractions, `Int.max`, `Int.max + 1`, and over-bound values become unknown.
- One strict validation outcome now governs both the receipt and the opt-in public run result. Malformed UTF-8/JSON/envelopes, unexpected tool activity, provider failure, missing completion/answer, and nonzero exits cannot yield an answer through the observing path.
- A fixed local process-output fixture exercises the real public Codex route without launching a CLI or consuming an account.

## Scope

The observer is optional and defaults to `nil`. Only the exact Codex CLI route uses the receipt/fixture path. The normal runtime registry and Claude behavior are unchanged. There is no app-server migration, raw diagnostic store, provider call, authentication change, install, launch, publish, or shared-source edit.

## Files

- `cli-execution-receipts-v2.patch`
- `candidate-v2/Rivune/TerminalAIService.swift`
- `candidate-v2/RivuneTests/RivuneDeterministicTests.swift`
- `TEST_RECEIPT_V2.json`
- Rejected v1 and its independent evidence remain unchanged alongside this v2.

## Verification

- Targeted receipt and public-route fixtures: 10 passed, 0 failed.
- Full isolated Mac suite: 319 passed, 0 failed, 0 skipped.
- Generic iOS Simulator build: succeeded with code signing disabled.
- Patch dry-run against frozen base: succeeded for both changed files.

## Remaining boundaries

- `resolvedModel`, provider request ID, service tier, finish reason, and billing remain unknown and are never inferred.
- Requested model is intentionally represented only by a hash; the literal model label is not shareable in v2.
- Timeout, cancellation, launch failure, and output-limit failure before a `TerminalProcessOutput` exists still cannot emit a completed exit-status receipt.
- QE01 live quality/isolation remains unproven because no account-backed provider run was authorized.
- The fixture initializer is internal testability infrastructure; production callers should supply only the observer.

## Integrity

- Patch SHA-256: `3035e2e76304101218d2237ed81ce48fb3aff7f8446b5d5e975ba4e8614a5f72`
- Candidate production SHA-256: `884d1af71174edf0a8bc3955fa8d4f82f75f177d9e561a1e3ac183516f0f7cd9`
- Candidate tests SHA-256: `4cfe0f353c1b937d7c02843de2fab169533cfb2fd68a78089dfe25222e3b9fb7`
- Candidate production Git blob: `4d83b84c54332011a715d65368a6ad8b9e23b010`
- Candidate tests Git blob: `c33491f0807fb57bd6e6e9e5a9908dfc8eda296f`

