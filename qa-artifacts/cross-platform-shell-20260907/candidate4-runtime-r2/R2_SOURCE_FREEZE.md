# Rivune Tauri runtime — revision 2 source freeze

Date: 2026-09-07

Revision 2 replaces the rejected first source freeze as the current isolated Tauri candidate. It does not modify or launch the installed app. It is not an installer, a completed legacy import, Council/Swarm, cloud sign-in, or Windows/Linux acceptance.

## Implemented boundaries

- Exact Rust/JavaScript acronym contract for `requestID`, `conversationID`, `selectedProviderID`, `sourceRunID`, and `newRequestID`, with a real Rust-generated round-trip fixture.
- Approved project instructions, role-aware conversation text, documents, and selected artifact are serialized into the actual direct-provider stdin envelope. Retry reuses the original admitted request and context.
- A profile-wide OS file lock rejects concurrent writers. Snapshot filenames use monotonic logical generations rather than wall-clock time.
- Snapshot files are immutable, synced before rename, and the snapshots directory is synced after rename on Unix. A post-rename sync failure is explicitly classified as a visible but durability-uncertain commit.
- Profile/snapshot permissions are `0700`/`0600` on Unix. Committed snapshots retain the newest 32 generations; abandoned pending generations are removed only after a later durable commit supersedes them.
- First-freeze timestamp/PID snapshots are loaded during upgrade instead of silently resetting the profile.
- Provider, conversation, draft, admission, and completion mutations use clone-save-publish semantics. A pre-commit failure leaves live state unchanged; a post-rename uncertainty remains visible and tells the caller to refresh.
- Codex/Claude execution remains a direct absolute-path allowlist with host-owned arguments, sanitized environment, bounded input/output, and no shell. Test-only fixtures cannot be configured in production.
- On Unix, each provider starts in its own process group; cancellation, timeout, and direct-child completion clean the owned group and reap/join stdin/stdout/stderr workers. Read and write failures are reported rather than treated as EOF.
- CSP explicitly allowlists Tauri IPC transports while keeping all unrelated network connections blocked.
- The renderer disables Send while loading or without a selected provider, labels configuration separately from authentication/readiness, preserves draft-save errors across polling, and avoids raw invalid-path copy.
- Ordinary direct submissions freeze up to eight successful same-conversation exchanges (12 KiB) as role-separated history, deduplicate retry lineage in its original logical order, exclude other conversations, and disclose when earlier history is omitted.
- Retry is limited to an eligible failed/cancelled source, reuses its exact admitted context, allows one child attempt per source, persists one renderer-owned recovery identity across uncertain acknowledgements/reload, and reconciles without automatic redispatch. Terminal save recovery persists an already captured answer without calling the provider again.
- The last active conversation is host-owned, durably restored after reopen, and repaired to the first valid conversation if an older snapshot has no valid selection.
- Legacy data enters only through explicit file selection, a bounded host-owned preview, and confirmation of the exact content fingerprint. Raw source bytes and unknown fields are kept in a private append-only archive; projects, preferences, and file references are preserved without reactivating permissions or consent.
- Every preserved legacy answer becomes a distinct inert record with its source label; interrupted, cancelled, failed, and unknown legacy states are not relabeled as completed. Imported conversations and matched drafts become visible, retain a durable Settings receipt, use collision-safe namespaced IDs, and are read-only. Imported records cannot become providers, execute, retry, or silently dispatch work. Reimporting the exact fingerprint is idempotent.
- The receipt distinguishes activated conversations/answers/matched drafts from archive-only projects, unmatched drafts, attachments, preferences, and original files. The original JSON remains privately retained for recovery; raw export is explicitly not available yet.
- Archive publication uncertainty is reconciled with a second idempotent commit, directory sync, and exact-fingerprint reload before activation. Workspace activation remains clone-save-publish; a failed activation leaves the verified source archive safe and does not redispatch provider work.

## Executed verification

- Rust unit suite: 28 tests, including profile locking, generation gaps, bounded retention, Unix privacy, first-freeze upgrade, active-conversation recovery, executed ordinary two-turn context capture, bounded-history disclosure, retry logical ordering and single-child admission, uncertain admission without dispatch, terminal-result recovery, collision-safe multi-answer/state-truthful read-only legacy activation/deduplication/reopen, non-reading child timeout, output-before-input, descendant-held pipes, cancellation, and read failure.
- Rust offline build: passed for `aarch64-apple-darwin`.
- Exact renderer/core/wire suite: 14 tests passed.
- Integrated Chromium acceptance: 47 checks passed, including full transcript rendering, first-launch gates, per-conversation drafts, serialized writes, atomic navigation, stale-poll guards, disconnect/reconnect preservation, retry double-click blocking, same-ID recovery after a malformed acknowledgement and reload, explicit legacy preview/confirmation, pre-read file-size rejection, changed-selection/late-preview rejection, exact-fingerprint activation, read-only imported transcript rendering, and activated-versus-archive-only preservation receipts.
- Keyboard/focus acceptance passed with no reported errors.
- Independent five-case draft/submission regression harness against this exact `web/`: 5 passed before the integrated web freeze; its behaviors are also covered by the integrated acceptance suite.
- Formatting and JavaScript syntax checks: passed.
- Current custom-protocol debug binary built offline from this source; SHA-256 `c9612eb6c1a0de1c00b5c8103cba966e1823a788ecc3295254cfdd9340dd94fa`.
- No real Codex/Claude request, credentials, user-data migration, installed-app action, or website deployment occurred.

## Remaining gates

- Bundle the exact current debug binary for isolated accessibility automation, then prove real WebView `invoke` for last-active reopen and synthetic legacy preview/confirmation. The earlier native smoke passed against an older binary and is not evidence for this source freeze.
- Verify rendered history, reconnect draft preservation, keyboard/focus, CSP, window identity, and error states in the actual webview.
- A non-paid real CLI readiness test still requires a deliberately approved account/session boundary. Configured is not authenticated or provider-tested.
- Windows and Linux compilation, process-tree ownership, filesystem ACL/durability, packaging, and installers remain unverified.
- Normal/Council/Swarm strategy execution is not implemented in this Tauri candidate yet; direct mode is the only admitted provider path.
- Replacement of `/Applications/Rivune.app` remains held for central acceptance and one announced restart.

## Workspace-scoped Rust environment

```text
CARGO_HOME=<workspace>/.toolchains/cargo
RUSTUP_HOME=<workspace>/.toolchains/rustup
CARGO_TARGET_DIR=<workspace>/.toolchains/target-candidate4-r2
PATH=<workspace>/.toolchains/cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin
```
