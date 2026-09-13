# Codex CLI execution receipts — isolated candidate

## Outcome

This candidate adds an explicit, opt-in receipt for Rivune's existing `codex exec --json` seam. It does not change the normal runtime-registry path unless a caller supplies an execution-receipt observer, and it does not add app-server behavior.

The shareable receipt retains only allowlisted execution metadata: a local execution UUID, provider/transport IDs, prompt and answer hashes plus byte counts, requested model/effort, parser and local CLI versions, bounded event names, bounded item metadata, supported token counters, local timing/exit status, and a fail-closed terminal state.

The receipt never stores the prompt, answer, stdout, stderr, unknown-event payloads, tool commands/output, environment/configuration values, or credential paths. Requested model and effort are safe-name validated. Resolved model, provider request ID, service tier, finish reason, and billing remain `nil` because the documented JSONL seam does not prove them.

## Files

- `cli-execution-receipts.patch` — two-file production/test patch.
- `candidate/Rivune/TerminalAIService.swift` — isolated production candidate.
- `candidate/RivuneTests/RivuneDeterministicTests.swift` — six deterministic receipt tests.
- `TEST_RECEIPT.json` — machine-readable verification record.
- `base-hashes.txt` — original frozen SHA-256 values.

## Integration

From this directory, the patch applies to the frozen base with:

```sh
patch -p1 -d base < cli-execution-receipts.patch
```

The current shared source still matches the frozen base at handoff time, but this work intentionally did not edit shared native source. The native owner should review and apply the patch, then rerun the Mac test suite and both platform builds in the live tree.

Callers opt in by constructing `TerminalAIService(executionReceiptObserver:)`. Only the Codex CLI route uses that observer; Claude and the default nil-observer path retain their existing behavior.

## Verified

- Targeted receipt tests: 6 passed, 0 failed.
- Full isolated Mac suite: 315 passed, 0 failed, 0 skipped.
- Generic iOS Simulator build: succeeded with code signing disabled.
- Patch dry-run against frozen base: succeeded for both changed files.
- No live provider request, account use, authentication change, launch, install, publish, or shared-source edit occurred.

## Deliberate limits

- Codex CLI JSONL only; no Claude receipt and no app-server migration.
- `resolvedModel` stays unknown. A requested model is not evidence of the model actually used.
- There is no raw-diagnostic capture, even privately, in this first version.
- The local execution UUID is created by this execution seam; the current interface has no upstream conversation-turn/request ID to bind.
- Process launch failure, timeout, or cancellation before a `TerminalProcessOutput` exists cannot produce a completed exit-status receipt through this observer.
- QE01 quality/isolation is not proven: no live account-backed quality trial was run.
- This is an isolated candidate, not an installed or released product feature.

## Integrity

- Patch SHA-256: `b73a7b6198a769515d942e224e4779a6a8f3ff4f322b720eb98f54fed1e179fb`
- Candidate production SHA-256: `6be584c0ab985620ee212fc1c5673608dc09b9f147a3a90927c8161e05d69023`
- Candidate tests SHA-256: `d59682ca13ccef8acce596ed9c572a23f3ed2e7f7bf33a4530136a2657fa9112`
- Candidate production Git blob: `2ce590fdff23a31df8d530f424a89c8d7893dbdd`
- Candidate tests Git blob: `50e0c1e31eed67ba54adc0b6462e533235752dc1`

