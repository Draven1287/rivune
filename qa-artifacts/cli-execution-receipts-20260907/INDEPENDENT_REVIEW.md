# Independent review — isolated Codex CLI execution receipts

Verdict: **reject pending one P1 confidentiality fix.** The candidate compiles and its recorded tests pass, but the current receipt is not safe to describe or export as shareable because several untrusted JSONL strings can be copied into it verbatim.

## P1 — untrusted strings can bypass the claimed redaction boundary

`CodexExecutionReceiptBuilder` applies length limits and a permissive character-class check, but those checks do not establish that a string is metadata rather than sensitive content.

- `thread_id` is copied by `boundedOpaque` into `threadID` with any content up to 512 UTF-8 bytes (`TerminalAIService.swift` lines 174–175 and 279–282).
- Every item `id` is copied by `boundedOpaque` into the receipt with any content up to 256 bytes (lines 189–198).
- Unknown event names are retained whenever they contain letters, numbers, `.`, `_`, or `-` (lines 168–172). A value such as `sk_live_secret_value` passes this check and is serialized in both `eventTypes` and `unknownEventTypes`.
- Item `type` and `status` use the same permissive safe-name check (lines 189–198), so secret-shaped alphanumeric text is retained even when the item causes `unexpectedToolUse`.
- Requested model, requested effort, and local CLI version also retain arbitrary strings from their respective inputs when those strings use the permitted characters (lines 235–239). The existing negative test uses `/` and a newline, so it does not exercise this bypass.

A malformed, compromised, or future CLI stream can therefore place a prompt fragment, credential, local path fragment, or other private value into a nominal ID/name/status field. The receipt will serialize that value even though its documentation says it contains no prompt, answer, unknown-event payload, environment/configuration value, or credential path. Marking the receipt `malformedOutput`, `unexpectedToolUse`, or another failure state does not remove the retained string fields.

This is a release-blocking issue for a shareable receipt. It does not affect the default nil-observer runtime path because the candidate remains opt-in.

## Required closure

- Represent known event types, item types, and statuses with explicit allowlisted enum values; retain only a fixed sentinel/count for unknown values.
- Hash untrusted opaque thread/item IDs, or validate them against a strict documented protocol grammar that cannot accept arbitrary content. Hashing is the safer default for a shareable receipt.
- Derive requested model and effort from the already admitted provider capability selection or enforce explicit value allowlists at the receipt boundary.
- Parse the CLI version with a strict expected grammar and retain only the parsed product/version components; otherwise store `nil`.
- Add adversarial serialization tests that inject a unique secret composed only of the currently permitted characters into every dynamic retained string field. The encoded receipt must not contain that secret in completed, malformed, provider-failed, process-failed, or unexpected-tool states.

## Independently verified evidence

- Patch SHA-256 matches the handoff: `b73a7b6198a769515d942e224e4779a6a8f3ff4f322b720eb98f54fed1e179fb`.
- Candidate production SHA-256 matches: `6be584c0ab985620ee212fc1c5673608dc09b9f147a3a90927c8161e05d69023`.
- Candidate test SHA-256 matches: `d59682ca13ccef8acce596ed9c572a23f3ed2e7f7bf33a4530136a2657fa9112`.
- The frozen base copies of `TerminalAIService.swift` and `RivuneDeterministicTests.swift` match both `base-hashes.txt` and the current shared source. No shared source integration occurred.
- Recursive comparison shows only the two declared candidate files differ from the frozen base.
- `patch --dry-run -p1 -d base < cli-execution-receipts.patch` succeeds for both files.
- The retained full Xcode result independently reports 315 passed, zero failed, zero skipped, result `Passed`, on arm64 macOS 27.0.
- `TEST_RECEIPT.json` records the targeted six-test pass and generic iOS Simulator build. The targeted result bundle could not be independently summarized in this sandbox because `xcresulttool` was denied a write inside its `TestReport` directory; the same six tests are included in the independently readable 315-test full result.

## Other reviewed boundaries

The default registry and Claude paths remain unchanged when no observer is supplied. With an observer, only the exact Codex CLI route calls the known Codex runner and emits a receipt after `TerminalProcessOutput` exists. Nonzero exit, malformed JSONL, failure events, missing completion/answer, and tool item types produce non-completed terminal states. Prompt, answer, stdout, stderr, tool commands/output, and unknown-event objects are not retained directly; only their declared hashes/counts or selected metadata are stored. Resolved model, provider request ID, service tier, finish reason, and billing correctly remain `nil`.

The handoff accurately states the remaining limitations: no receipt is emitted for launch failure, timeout, or cancellation before process output exists; the local execution UUID is not bound to an upstream turn/request ID; no live provider or QE01 comparison was performed; and the feature is neither integrated nor installed.

No production source, test source, UI, provider, account, installation, deployment, or release state was changed by this review. This review receipt is the only file added.
