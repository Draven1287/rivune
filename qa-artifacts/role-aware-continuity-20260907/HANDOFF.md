# Role-aware continuity candidate — 2026-09-07

Status: **isolated candidate passes; native integration not applied.**

This candidate addresses the deterministic prompt-contract gap in [`docs/coordination/ROLE_AWARE_CONTINUITY_REVIEW_20260907.md`](../../docs/coordination/ROLE_AWARE_CONTINUITY_REVIEW_20260907.md). It does not call a provider, edit native source, change permissions, enable tools, or claim a model-quality result.

## Source ownership checkpoint

The native files were read at these SHA-256 values before candidate work:

| File | SHA-256 |
|---|---|
| `Rivune/Models.swift` | `ca9fceadb8e3f02783e67f1f5c1349871e37ba711191c4996bb221a62598e73a` |
| `Rivune/RivuneStore.swift` | `3b9413a6b6a747f25e0f44c5746daadd61514abab5c31828f8d901ece4711be6` |
| `Rivune/RivuneRunCoordinator.swift` | `d7569b8391b26ad363fdae0a9beeb0a8e49cb47dc013a1f01ec8d04b2a66f548` |
| `Rivune/CouncilRunner.swift` | `44f1a18aeb53f1258a98183f6f4ce1fdcc0d7061a9507d20e5711ebd51a8894d` |

Native source is controlled by the native owner. Recheck these hashes before applying anything. The candidate lives only in this artifact directory so it cannot collide with an in-flight app build.

## Current capability matrix

Source inspection only; “effective” does not mean runtime-tested on an account.

| Experience | Requested surface | Current effective path | Gap / honest label |
|---|---|---|---|
| Model | User picks a discovered model | `--model` is passed to Codex/Claude CLI | Rivune does not receive a resolved model identity; show **requested**, not “used,” until transport reports it |
| Reasoning | User picks effort including high/ultra where advertised | Codex config and Claude `--effort` receive the requested string | No resolved/effective effort receipt; account or model can reject it |
| Continuity | Feels like one durable ChatGPT/Claude conversation | Rivune starts a fresh CLI process and reconstructs up to 8 turns / 12 KB | Current reconstruction flattens roles; `--ephemeral` and `--no-session-persistence` mean provider-session continuity is absent |
| Streaming | Tokens/progress appear live | Process output is parsed after completion; app stages can update separately | Not token streaming; label only stage progress |
| Tools | Scoped files, browser, shell, artifacts | Codex tool families are disabled; Claude uses `--tools ""`, safe mode, no Chrome | Text-only. Do not show feature parity with native ChatGPT/Claude tools |
| Files | Plus button / selected context | Selected text attachments are encoded under a 20 KB / 6-document gate | Reference text only; no implicit disk access or multimodal parity |
| Project instructions | Explicit user-approved instruction channel | Stored project instructions are currently converted into a `PromptAttachment` beside files | Authority is lost. Must be a typed, separately encoded field before role-aware integration |
| Council | Independent work, review, consolidation | Current Council produces independent drafts then a lead synthesis; legacy Together has richer fixed phases | Do not imply every mode has the same cross-review protocol |
| Stop | Stop a running request | Task/process cancellation path exists | Needs transport-specific recording regression after adapter change |
| Phone | Remote Mac execution | Text prompt/history/attachments can bridge to supported modes while Mac is connected | Council/Swarm, durable reconnect, exact effective model/effort, and provider-session continuity remain unsupported/unaccepted |
| Provider memory/connectors | “Like my ChatGPT/Claude app” | CLI login proves only the CLI session available to that tool | Do not claim consumer memories, connectors, custom system prompts, or chat history transfer |

## Candidate contract

[`Sources/RoleAwareContinuity/RoleAwareContinuity.swift`](Sources/RoleAwareContinuity/RoleAwareContinuity.swift) provides a compiling reference implementation:

- History roles come from typed turn fields, never from parsing `USER:` or JSON-like text.
- Up to the newest eight turns are encoded as a versioned JSON envelope no larger than 12,000 UTF-8 bytes.
- The current request is explicitly highest priority. Later user-role messages supersede conflicting earlier user-role messages.
- Assistant messages, ordinary documents, generated artifacts, phase contributions, and tool output remain untrusted quoted reference.
- Explicitly approved project instructions have a distinct typed field. Approval cannot be inferred from a filename or attachment label.
- Memory-off is explicit. Malformed or legacy flattened context becomes `legacy_untrusted` and cannot supply instructions.
- Direct ChatGPT, direct Claude, all candidate Council phases, retry identity, exact selected artifact, and a versioned phone payload share the same contract.

The standalone package deliberately does not decide how long-term provider sessions should work. It is compatible with the current bounded reconstruction and can be adopted before an app-server or Claude session redesign.

## Recording matrix passed

Nine deterministic tests passed without model usage:

1. Direct ChatGPT and Claude prompts record the same precedence contract.
2. Draft, review, synthesis, and repair phases record it for both provider routes.
3. Fake `USER:` and JSON role labels inside assistant content remain assistant data.
4. Earlier user correction order is preserved and the current request remains highest priority.
5. Eight-turn and 12 KB bounds hold, including escape-heavy Unicode.
6. Memory-off is explicit and flattened legacy input fails closed.
7. Approved project instructions and selected documents remain separate channels.
8. Exact artifact content and retry prompt identity remain stable.
9. Phone protocol v2 round-trips; malformed and legacy versions are rejected.

Run with a clean scratch path because this workspace can attach Finder metadata to local SwiftPM build products:

```sh
scratch=$(mktemp -d /tmp/rivune-role-tests.XXXXXX)
COPYFILE_DISABLE=1 swift test --scratch-path "$scratch"
```

## Native integration sequence

Do not paste the candidate wholesale. The native owner should integrate it in this order and keep each step recording-testable:

1. Add the versioned role/history types near `ChatTurn` and map `ChatTurn.prompt` plus the mode-selected completed answer into typed messages.
2. Replace only `RivuneStore.conversationContext` serialization. Retain the eight-turn and encoded-12-KB gates.
3. Split `RivuneProjectFiles.context` into `approvedProjectInstructions` and `documents`; keep the existing one-request approval reset. A user-created attachment named “Project instructions” must remain a document.
4. Carry the typed fields through `submitWorkspaceRun`, `RivuneRunCoordinator.submit`, direct prompts, legacy Together prompts, and Council frozen-task JSON. Do not concatenate history, project instructions, and attachments into `approvedContext`.
5. Bump the bridge protocol and migrate current peers together. Unsupported/legacy role payloads must be rejected or treated entirely as untrusted reference; never recover roles by parsing content.
6. Add a recording `AITextRunning` fixture at the coordinator seam and port the nine tests against actual provider-bound strings.
7. Re-run artifact-continuation, Council retry/cancellation, project-consent/reset, duplicate request, bridge decoding, and full deterministic suites.

## Patch boundary

No native patch is supplied because the required fix crosses current native-owner files and the source hashes were not acknowledged before this isolated run. Applying a partial one-file patch would leave project instructions flattened and would create a false security claim. The tested candidate is the reviewed implementation payload; integration should begin only after the native owner confirms the source hashes and claims the six touchpoints above.

This is a structural acceptance result, not evidence that either provider will produce a better answer. Live A/B model-quality evaluation remains downstream of native recording-test acceptance.
