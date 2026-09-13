# ADR-001: Reviewed runtime adapters

- Status: Accepted
- Date: 2026-09-03
- Deciders: Rivune maintainers

## Context

Rivune's provider catalog can describe many CLI and API transports, but a data record must never gain permission to launch an arbitrary executable. The original chat and collaboration paths also selected a fixed `TerminalProvider` enum directly, which made adding a reviewed third provider require edits throughout the product.

## Decision

All text execution enters `AITextRunning` with an identifier-only `AIExecutionRoute`. `AITextRuntimeRegistry` is the sole authority that turns a route into behavior. It accepts only compiled `AITextRuntimeAdapter` implementations and validates the complete catalog transport before advertising execution support.

The first registry contains Codex CLI and Claude Code CLI adapters. Their established argument construction, structured parsing, output limits, timeouts, cancellation, and provider-managed authentication remain inside `TerminalAIService`. Settings may discover and display additional registered CLIs, but labels them as requiring a reviewed adapter until exact runtime resolution succeeds.

## Options considered

1. Keep direct `TerminalProvider` switches. This is simple but spreads provider-specific branching through chat, collaboration, and evaluation code.
2. Let catalog records supply executable paths and arguments. This is flexible but turns editable data into executable authority and expands the command-injection boundary.
3. Use compiled reviewed adapters behind exact routes. This separates presentation data from executable code and provides one extension seam without allowing arbitrary commands.

Option 3 is selected.

## Consequences

- Direct chat, Rivune collaboration, and Evaluation Lab share one route-based contract.
- Model and effort values reach each adapter unchanged.
- Duplicate adapters and catalog spoofing fail closed.
- Supporting another provider still requires reviewed Swift code, tests, and registration; discovery alone is intentionally insufficient.
- The current multi-provider council remains Codex plus Claude until participant scheduling is generalized separately.

## Follow-up

- Add a Keychain-backed API adapter boundary before enabling API transports.
- Generalize collaboration requests from two named participants to a validated council plan.
- Add release QA for every new adapter's parser, cancellation, authentication, and executable trust rules.
