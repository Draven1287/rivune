# Independent review — isolated Codex CLI execution receipts V2

Verdict: **accepted for integration into shared native source.** V2 closes the V1 confidentiality, extreme-token, and receipt/result-consistency blockers. No P1 or P2 finding remains in the reviewed isolated patch.

## V1 blocker closure

### Shareable-field confidentiality

- JSONL thread and item identifiers are represented only by SHA-256 values after bounded input checks. Their raw values are never serialized.
- Event types are retained only when they exactly match the fixed known-event set; all other names become the literal `unknown`, with a bounded unknown-event count.
- Item types retain only `agent_message` and `reasoning`; every other value becomes `unexpected` and causes the terminal state `unexpectedToolUse`.
- Item status retains only the fixed supported values and otherwise becomes `unknown`.
- Requested model text is represented only by a bounded SHA-256 identity. Requested effort is retained only when it exactly matches one of the six supported Codex effort values.
- CLI version is retained only after exact `codex-cli major.minor.patch` parsing with bounded numeric segments.
- The adversarial canary test places the same safe-character secret in thread ID, event type and payload, item ID/type/status/text, stderr, prompt, requested model/effort, and CLI version. The encoded receipt contains none of the literal secret.

These changes close the V1 raw-ID/name leakage. Hashes remain correlation identifiers and are not evidence that the underlying values are public; that is consistent with this candidate's explicitly allowlisted hash design.

### Nontrapping token parsing

Token parsing now obtains a decimal string from `NSNumber`, rejects booleans, parses through failable `UInt64`, enforces a documented maximum of 1,000,000,000,000, checks the platform `Int` bound, and only then converts to `Int`. Negative, fractional, Boolean, `Int.max`, `Int.max + 1`, and over-policy values remain unknown rather than trapping or being rounded. The exact policy boundary is accepted.

### Receipt and returned result agreement

`CodexExecutionReceiptBuilder.validate` now produces one `Validation` containing both the receipt and the only answer eligible for return. The opt-in Codex route emits that receipt and switches on its terminal state:

- `completed` returns the same trimmed answer whose hash and byte count are recorded.
- Nonzero process exit throws `processFailed`.
- Provider failure events throw `providerError`.
- Invalid UTF-8, malformed JSON/envelopes, or missing completion/answer throw `malformedOutput`.
- Unexpected item/tool types throw `unexpectedToolUse`.

Injected fixed process-output fixtures exercise this public `run(.codexCLI, ...)` route without launching a CLI or using a provider account. The tests confirm both successful answer/receipt agreement and rejection of malformed and tool-bearing streams.

## Scope and regression review

The observer remains optional and defaults to `nil`. Without it, `run` continues through `AITextRuntimeRegistry.current`; the default registry, Claude route, provider adapters, and normal production call sites are unchanged. With it, only the exact Codex CLI route enters the receipt-aware known-provider path. The fixture fields are internal testability seams and do not alter behavior unless explicitly supplied.

The V2 candidate differs from the frozen base only in `Rivune/TerminalAIService.swift` and `RivuneTests/RivuneDeterministicTests.swift`. The current shared copies of those files still match the frozen base hashes, so this acceptance does not imply that integration has occurred.

## Independently verified evidence

- V2 patch SHA-256 matches: `3035e2e76304101218d2237ed81ce48fb3aff7f8446b5d5e975ba4e8614a5f72`.
- Candidate production SHA-256 matches: `884d1af71174edf0a8bc3955fa8d4f82f75f177d9e561a1e3ac183516f0f7cd9`.
- Candidate test SHA-256 matches: `4cfe0f353c1b937d7c02843de2fab169533cfb2fd68a78089dfe25222e3b9fb7`.
- Recursive base/candidate comparison reports only the two declared changed files.
- `patch --dry-run -p1 -d base < cli-execution-receipts-v2.patch` succeeds for both files.
- The full retained Xcode result independently reports result `Passed`: 319 passed, zero failed, zero skipped, on arm64 macOS 27.0. This includes the ten V2 receipt and public-route tests.
- `TEST_RECEIPT_V2.json` records the targeted 10/10 pass and successful generic iOS Simulator build. The targeted result bundle could not be independently summarized in this sandbox because `xcresulttool` was denied a write inside its `TestReport` directory; the full 319-test result was readable and confirms the complete test set.

## Remaining boundaries

This acceptance covers the isolated Codex CLI receipt seam and its deterministic fixtures. It does not prove a resolved model, provider request ID, service tier, finish reason, billing record, or QE01 conversation quality. Launch failure, timeout, cancellation, and output-limit failure before a `TerminalProcessOutput` exists still cannot emit a completed exit-status receipt. The local execution UUID is not yet bound to an upstream Rivune conversation turn or phone request ID.

No live provider request, account use, authentication change, shared-source edit, app launch, installation, deployment, publication, or release action was performed during this review. This V2 review receipt is the only file added.
