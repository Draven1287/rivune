# Provider session contract review — implementation amendments required

Reviewed frozen proposal: docs/coordination/SESSION_ADAPTER_NEXT_INCREMENT_20260907.md, SHA-256 7c6deb002a1a2f6689fa433dcacd4864f5ac39fc1bd99dd297ce977f56603ec6. Preserve that source artifact. The architecture of opt-in versioned Codex app-server and Claude CLI sessions is useful; the current proposed contract needs the amendments below before implementation acceptance. No provider calls, auth changes or native source edits in this review.

## P1 — preserve per-turn approved context on resume

SessionTurnRequest carries only currentUserMessage plus continuation. ApprovedPromptContext is available only in new(seed:), even though the prose promises newly selected files, exact artifact bytes and project instructions on every turn. A resume request cannot represent these inputs. Add an immutable per-turn approved input value containing the current message, admitted documents/artifact reference and current approved project-instruction version; keep historical seeding separate. Validate/hash those fields before dispatch. Never resend rolling history on resume. Cover turn2 with a different selected file, later explicit user correction, changed project instructions and rejected untrusted document instructions. A provider's persistent history cannot forget previously sent content merely because a file is later deselected: explain this and use explicit session reset when revocation requires removing prior context.

## P1 — cancellation must exist before provider acknowledgement

startTurn returns its only stoppable handle after acknowledgement. Define a local pending operation registered before launch so Stop during handshake/session creation/turn-start can cancel that exact operation. Serialize one active turn per session binding and durably reserve local IDs before submission. Distinguish not-dispatched, acknowledged, completion-persisted and outcome-unknown on EOF/crash. Never automatically resubmit unknown work. Completion racing Stop needs authoritative reconciliation: preserve real provider outcome separately from local presentation and never resume with a silently diverged local transcript. Tests must cover cancellation before acknowledgement, lost acknowledgement, duplicate submission and stop/complete races.

## P1 — enforce tool scope before execution

The proposal cannot establish prevention by noticing an unexpected tool event after the tool ran. Capability restrictions must apply at the provider/runtime permission boundary before invocation; otherwise the profile is unavailable. For v1, ship the tools-off contract first. Read-only project access stays disabled until exact installed-version roots/network/tool enforcement is independently qualified. Do not equate selecting Read/Glob/Grep and cwd/add-dir with a complete root sandbox.

Official sources checked September7: Claude documents permissions.blockReadsOutsideWorkingDirectories as the setting that fences outside reads, and distinguishes tool permission rules from sandbox enforcement. Adding directories grants access. Codex readOnly defaults to full read access unless restricted access is specified. These are reasons to require explicit configuration and boundary tests; this review does not claim a leak was observed.

Sources: [Claude permissions](https://code.claude.com/docs/en/permissions) and [Codex app-server](https://learn.chatgpt.com/docs/app-server).

## P2 — concrete event and persistence authority

Replace raw progress kind/label, reroute reason and failure strings with bounded closed event codes plus separately sanitized display text. Encode session/turn/local-run identity and monotonic sequence in an envelope rather than leaving them implicit prose. Validate numeric usage, sizes and identifiers with the same rigor as accepted CLI receipt v2. Keep opaque session IDs only in protected local bindings, never shareable diagnostics. A provider completion is not a durable local completion until the bound run/binding update is persisted. If separate files are used, document recovery/reconciliation for failure between them; do not claim a cross-file atomic transaction.

## Acceptance and authority

The user has already authorized local development and bounded evaluation subject to the documented prerequisites. The original proposal's phrase requiring separate user authorization does not create a new approval gate or revoke existing scope. QE01 controlled-input evidence and live-trial prerequisites remain unresolved, so no live calls occur in this increment. Fixtures prove state handling only, not consumer app parity or a live provider route.

Root owns these review amendments while Council and Swarm owners work in separate isolated candidates. Next session implementation slice should be the typed per-turn/context and pending-operation state machine with synthetic recording adapters, initially tools off. Provider process integration follows the exact-version protocol review. Preserve premium native presentation; do not expose internal manifests or configuration plumbing in the normal chat flow.
