# Codex CLI isolation and evaluation receipt research — 2026-09-07

## Scope and result

This is a zero-call research receipt for QE01 and QE02 in `qa-artifacts/team-evaluation-20260907/REVIEW.md`. It used official OpenAI documentation, `codex-cli 0.144.3 --help`, the CLI's one-shot app-server schema generator, and read-only inspection of `Rivune/TerminalAIService.swift`. It did not invoke a provider, inspect or copy credentials, change `HOME` or `CODEX_HOME`, alter configuration, or start a service.

**Gate:** the authenticated Codex CLI comparison remains blocked. There is a documented configuration candidate for suppressing project-instruction bytes and memory injection, but the available documentation and help do not provide an explicit clean-context mode or a model-free inspection command that proves the final request excludes global `AGENTS.md`, project instructions, skills/customizations, and memory. This receipt does not convert that candidate into verified isolation.

## QE01 — instruction and customization isolation

### Documented behavior

- `codex exec --ignore-user-config` excludes `$CODEX_HOME/config.toml` while authentication still uses `CODEX_HOME`. It does not claim to exclude `AGENTS.md`, skills, or other state in Codex home.
- `codex exec --ignore-rules` excludes user and project execpolicy `.rules` files. Exec policy is distinct from prompt instructions.
- Codex discovers a global `AGENTS.override.md` or `AGENTS.md` in Codex home, then project instruction files from the project root to the working directory, and merges that instruction chain before work.
- The official configuration schema accepts `project_doc_max_bytes = 0` and describes the field as the maximum total bytes of project instruction content. The AGENTS documentation says discovery stops adding files when the combined instruction size reaches that limit. These statements make zero a plausible supported suppression setting, but neither page explicitly guarantees that zero excludes the global file or exposes the constructed request for verification.
- `memories.use_memories = false` is documented to skip injecting existing memory instructions. `memories.generate_memories = false` prevents a new thread from becoming memory-generation input. The `memories` feature can also be disabled. These are configuration overrides and do not require moving authentication state.
- `model_instructions_file` replaces the selected model's built-in base instructions. It is not documented as an `AGENTS.md`-discovery disable switch, and the current schema strongly discourages overriding the built-in instructions. It is unsuitable as proof of clean evaluation context.
- The installed `codex exec` help has no `--safe-mode`, `--no-agents`, `--no-project-instructions`, `--no-skills`, or equivalent clean-context flag.

### Candidate invocation settings, not accepted proof

The narrowest documented candidate to test through a future local recording seam is the existing `--ignore-user-config`, `--ignore-rules`, and `--ephemeral` invocation plus:

```text
-c project_doc_max_bytes=0
-c memories.use_memories=false
-c memories.generate_memories=false
--disable memories
```

Keep the existing explicit tool/feature disables and empty temporary working directory. Do not set `model_instructions_file`, change `HOME`/`CODEX_HOME`, copy `auth.json`, rename personal instruction files, or infer cleanliness from an answer's wording.

This combination is supportable as a configuration candidate because every key and value is documented. The stronger claim—“the authenticated request contained only the evaluation prompt and Codex's product-required base instructions”—is unverified. A future model-free recording/diagnostic boundary must show the constructed request or equivalent instruction-source manifest. If no such supported boundary is available, the production-layer trial must remain blocked rather than send a canary to a provider.

## QE02 — fields the current `codex exec --json` seam can retain

Official non-interactive documentation defines stdout as a JSONL event stream when `--json` is enabled. It documents these event families: `thread.started`, `turn.started`, `turn.completed`, `turn.failed`, `item.*`, and `error`. Its sample establishes the following concrete fields:

| Receipt field | Supported source | Sanitized retention rule |
|---|---|---|
| `threadID` | `thread.started.thread_id` | Retain as an opaque identifier. |
| `eventType` | top-level `type` | Retain only known event names; record unknown names without their payload. |
| `itemID`, `itemType`, `itemStatus` | documented `item.*.item` envelope/sample | Retain identifiers and status. Reject any non-message/reasoning item as unexpected tool use, as production does now. |
| `answerText` | completed `agent_message` item's `text` | Retain exact private bytes plus a separately redacted shareable value and hashes for each representation. |
| `inputTokens` | `turn.completed.usage.input_tokens` | Retain integer or `null`. |
| `cachedInputTokens` | `turn.completed.usage.cached_input_tokens` | Retain integer or `null`. |
| `outputTokens` | `turn.completed.usage.output_tokens` | Retain integer or `null`. |
| `reasoningOutputTokens` | `turn.completed.usage.reasoning_output_tokens` | Retain integer or `null`. |
| `exitStatus` | local `Process.terminationStatus` | Retain the numeric local process exit separately from provider events. |
| `startedAt`, `finishedAt`, `elapsed` | local monotonic/wall-clock observation | Retain locally generated timestamps and elapsed duration. |
| `requestedModel`, `requestedEffort`, role/identity | Rivune's admitted request | Retain as request facts, clearly labeled “requested,” never “resolved.” |

### Fields that must remain unknown at the current seam

- **Resolved model:** official `codex exec --json` documentation and installed help do not document a normal completion field that identifies the resolved model. The requested `--model` value is not resolved-model evidence. Set `resolvedModel` to `null` unless a future versioned exec schema or observed provider event explicitly supplies it.
- **Failure details:** the exec documentation confirms `turn.failed` and `error` event types but does not document their field shapes. The app-server protocol separately documents `turn/completed.turn.error.message`, optional `codexErrorInfo`, and optional `additionalDetails`; those camel-case app-server fields must not be assumed for the exec JSONL adapter. At this seam retain the event type, local exit status, and a private bounded raw record. Promote an error code/message into the shareable receipt only after a versioned exec schema or fixture establishes its shape and after secret redaction.
- **Total tokens:** the documented exec sample exposes four component counters but no `total_tokens`. A consumer may compute a separately labeled derived total if its definition is fixed; it must not present that value as provider-supplied.
- **Provider request ID, service tier, finish reason, latency, and billing:** no supported fields for these are documented in the current exec stream. Leave them `null`.

The generated 0.144.3 app-server schema does define richer app-server notifications: `thread/tokenUsage/updated` with `last` and `total` token breakdowns, `turn/completed` with structured turn errors, and conditional `model/rerouted` fields (`fromModel`, `toModel`, `reason`). This is useful evidence for a future deliberate app-server adapter, but it does not expand what `TerminalAIService` may claim while it continues to consume `codex exec --json`.

## Minimal receipt boundary for `TerminalAIService`

The current parser keeps only the last completed agent message and completion/failure/tool-use booleans. The process layer writes stdout/stderr to temporary files and deletes the directory after reading. A future opt-in evaluation observer should sit between process completion and deletion and produce two different artifacts:

1. A private, restrictive, size-bounded capture of exact prompt bytes, stdout JSONL bytes, stderr bytes, answer bytes, timestamps, exit status, and hashes. Raw stderr and unknown JSON fields are private because they can contain paths, diagnostics, or secrets.
2. A shareable allowlisted receipt containing only the tabled fields above, declared request settings, independent hashes of raw and sanitized representations, redaction status, parser/CLI version, and explicit `null` for absent evidence.

Parsing should fail closed on malformed JSON, missing `turn.completed`, `turn.failed`, top-level `error`, unexpected item types, output-limit breach, or nonzero exit. Do not convert diagnostic wording into authentication status, and do not log environment variables, configuration contents, headers, tokens, or credential paths.

## Sources

- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Codex configuration JSON schema](https://developers.openai.com/codex/config-schema.json)
- [Codex App Server protocol](https://learn.chatgpt.com/docs/app-server)

## Verification inventory

- Installed CLI: `codex-cli 0.144.3`.
- Help-only commands: `codex --version`, `codex exec --help`, `codex app-server --help`, and `codex app-server generate-json-schema --help`.
- One-shot local schema generation: `codex app-server generate-json-schema --out <temporary-directory>`; no server was started.
- Provider/model requests: **0**.
- Persistent source/config/auth changes: **0**.
