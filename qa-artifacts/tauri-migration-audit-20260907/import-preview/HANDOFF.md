# Legacy import preview: host integration handoff

Status: compiled with workspace-local rustc/cargo 1.98.1. All 17 regression tests passed, including a locked offline replay with source and fixture hashes verified unchanged during execution. This crate is not wired into the Tauri app and does not establish migration or installer readiness.

## Contract

The host obtains an explicit source selection and supplies owned byte buffers to `preview_import`. The crate reads only those bytes. It has no filesystem, credential, process, provider, network, or destination-store operations. Send `PreviewSummary` to the renderer by default; keep the non-serializable full preview and original bytes in protected host storage.

`reviewable()` means no blocking structural issue; it does not authorize committing data or running a request. `may_dispatch_imported_work()` is always false. Imported retry/collaboration records are retained but never become admitted requests. Preferences require a separate allowlist and renewed consent review. Project paths and bookmarks are metadata only; the host must obtain new file access before reading referenced content.

For conversations, projects and drafts, persist `PreservedRecord::raw_json()` as the authoritative record. Its exact numeric lexemes, unknown fields and record whitespace are retained. Preferences use `RawValue` directly. Whole original source buffers also retain unknown envelope fields. Derived decoded Values are private inspection data, not persistence output.

The strict structural parser rejects duplicate JSON keys and unsupported/nonfinite numeric ranges. An unknown literal such as `1e400` can therefore require recovery review rather than being accepted; original bytes remain available unchanged. This is not an arbitrary-precision JSON importer. Host-selected sources have 32 MiB per-source and 64 MiB aggregate limits; enforce those limits before reading to avoid allocating oversized files in the host.

Sibling project-file and attachment IDs must be unique (case-insensitive UUID comparison). The same attachment may appear in different turns or drafts. Conversation, project, per-conversation turn, and draft IDs are also checked within their respective scopes. Destination collisions still require host policy; this preview does not overwrite or merge a destination.

A backup accompanying History is retained without automatic substitution. Corrupt History blocks the preview even with a healthy backup. A corrupt unselected backup does not invalidate healthy History. Backup-only selections require an explicit history-source choice: after review, the host may submit the selected backup bytes as History. Never silently replace corrupt history with an empty list.

## Executable evidence and remaining app acceptance

From this directory: `python3 run_tests.py --locked --offline` uses the verified workspace-local toolchain. Cargo.lock, FIRST_TEST_EXECUTION.json and TEST_EXECUTION.json preserve dependency/compiler versions and output; the final receipt binds all crate inputs and the 12 synthetic fixture files. The regression source covers synthetic legacy schemas, malformed/truncated input, corrupt primary and backup combinations, explicit backup selection, dates, stale consent, unknown retry contexts, source binding, duplicate keys and IDs, exact numeric text, and attachment reuse across snapshots. All 17 tests passed; no native app or AI provider was invoked.

Before app acceptance the runtime owner must implement and test explicit preview/confirmation, destination collision handling, atomic commit, interrupted-commit rollback, repeated-import deduplication, original-byte recovery, restart persistence, and no automatic dispatch. Rich history, projects, draft attachments, settings and unknown records must survive; the minimal candidate4 snapshot alone is insufficient. Missing exact retry context must remain non-retryable or become a new explicitly reviewed request.

## Source review

Independent reviewer confirmed the two corrected risks: sibling ID collisions and derived JSON numeric rounding. The reviewer found no obvious Rust type/ownership issue by inspection. Subsequent compilation and regression execution passed as recorded above. No real user data, credentials or application lifecycle operations were used.
