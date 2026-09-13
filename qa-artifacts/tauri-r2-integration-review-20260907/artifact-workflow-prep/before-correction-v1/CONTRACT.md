# Generated-artifact workflow contract — proposed V1

Status: implementable contract and synthetic cases only. No runtime integration, UI, build, provider execution, preview rendering or project-file writes performed. This extends the workspace-parity gap; it does not replace product acceptance. Reuse existing transcript, artifact/code pane, composer and approved Rivune styling. No model-catalog or r5 frontend work is included.

## Smallest real path

1. After a completed answer is durably stored, the host validates exactly one JSON `{summary, files:[{path,content}]}` manifest (raw object or exactly one fenced JSON object). Streaming/incomplete answers and ordinary code blocks stay transcript text. Preserve raw answer bytes and parse errors; do not invent files from arbitrary fences.
2. Host stores an immutable ArtifactRevision and projects an artifact card/list into its owning transcript. Selecting a file opens its complete stored bytes read-only; selecting index.html can open a constrained static preview. Neither selection nor preview writes project files.
3. User selects Apply to project. Host resolves a current explicitly granted project root, checks owner/archive/revision state and reads original bytes. Show a PreparedApply diff: creates/replacements, exact reviewed bytes, baseline hashes and target project. This preparation writes only private operation metadata, not project files. User's separate Apply confirmation submits the prepared operation ID; host repeats checks before writes. Never parse target paths or commands out of the model's prose.
4. Durable receipts identify applied bytes; only those receipts enable Revert. Revert is explicit and verifies each current file still equals the applied hash before restoring original bytes or removing a file created by this operation. Files altered afterward produce a conflict; no force overwrite.
5. Continue conversation selects the immutable artifact revision into the editable owning conversation's draft with an expected draft generation. Save that selection before showing success; preserve existing typed prompt. This is not Send. On the user's later Send, revalidate source ownership and exact revision and attach complete selected bytes as untrusted reference. A later answer creates another revision; it never updates the original artifact silently.

## Ownership and validation

Artifact identity includes conversation/turn/answer/project-at-origin and raw-response SHA-256; the host resolves these from persisted records, not caller-provided text. `projectId` may be null for unprojected conversations: list/preview/continue work; Apply is unavailable until an active project association and current root grant exist. Active project persistence/grants are a dependency of the separate Project workspace slice. Do not fabricate a project collection or grant from imported metadata. Moving a conversation does not rewrite origin provenance; invalidate prepared operations and explicitly rebind/review the target project.

Every mutating command checks current workspace revision, active editable conversation, current project association and revocation/archive state under the host mutation gate. Archived/imported material is read-only: view/export-as-data if existing policy permits, no Apply/Revert/Continue mutation in that archive. A separately user-created active conversation can reference an explicit copied immutable snapshot with retained original provenance; no inherited root permission. Archiving an operation's owner blocks fresh writes. If interrupted writes exist, show recovery-required and require explicit active recovery authorization rather than pretending archive or deletion undid them.

Preserve baseline bounds: 1–40 files; nonempty content; 128 KiB/file; 256 KiB combined UTF-8; summary nonblank and at most 4096 UTF-8 bytes; raw response at most 3x combined limit; relative path at most 240 UTF-8 bytes; html/css/js/json/md/txt only. Reject empty/dot/hidden components, traversal, absolute paths, backslashes, control characters and `:%?#`; reject NFC/case-insensitive duplicate paths. Additional cross-platform proposal: reject Windows reserved device names and trailing dots/spaces so a manifest cannot alias a different file after platform normalization. Do not silently normalize written bytes or truncate continuation context. No deletion proposals, executable launch, package installation or tests implied by file generation.

Hash exact raw UTF-8 response and file content bytes. For revision identity use SHA-256 over the ASCII domain `rivune-artifact-v1` followed by length-prefixed UTF-8 fields: `decimalByteLength:bytes` for conversation ID, turn ID, answer ID, projectId or empty, response hash, summary, then each path and content hash sorted by UTF-8 path bytes. File bounds and duplicate checks precede hashing. Runtime and renderer share this encoding test vector; the host is authoritative.

## States, conflicts and restart

ArtifactRevision is immutable; preview state is ephemeral. Operation transitions:

| State | Allowed next state / condition |
| --- | --- |
| prepared | applying after explicit confirmation and fresh preflight; conflict/stale if anything changed |
| applying | applied only after verified bytes and durable receipt; rolled_back if failed writes fully restored; recovery_required if uncertain/partial |
| applied | reverting after explicit request and all applied hashes match |
| reverting | reverted after verified restoration; recovery_required on partial failure |
| conflict / stale | new prepare, never auto-retry with updated baseline |
| recovery_required | inspect durable journal/backups and filesystem; explicitly authorized recovery only |

Draft generation, conversation/project revision, root identity, artifact hash and every original file hash (null means absent) bind preparation. Dirty editor buffers for any affected file block Apply; save/discard/rebase is the user's choice. V1 viewer is read-only, so external edits and other host editor lanes are still checked. Root moves/replacements, missing access, symlinks, Windows reparse points, unexpected file types/hardlink aliases or path changes block writes. Use platform-native scoped handles and no-follow traversal; recheck remaining targets before each write, not only string-prefix validation. Unsupported safe replacement on a platform means unavailable, not fallback unrestricted I/O.

Persist a private durable operation journal and backups BEFORE any project write. Include operation ID, owner, grant identity, per-file original bytes/hash, proposed hash and per-file phase. Persist/fsync journal progress around atomic per-file replacement and verify written bytes. Multi-file transactions are not filesystem-atomic: report that fact. If failure occurs, roll back only files still matching this operation's written bytes; never overwrite an intervening edit. Persist partial/uncertain outcomes and backup references; block another Apply on affected paths until resolved. Revert has the same journal discipline and must not claim success after only partial restoration.

On restart, verify artifact content/provenance hashes, restore exact saved draft selection, and reconcile nonterminal journals against disk. Do not auto-resubmit providers, auto-apply prepared operations, silently resolve to a newer answer, or assume OS grants survived. Recheck grant validity before disk inspection; unavailable access yields recovery_required. If bytes match a completed operation but its final receipt was not saved, recover the receipt from durable intent only after verification; if ambiguous, retain evidence and require recovery. A failed draft/receipt save preserves prior state and visible edits and returns an explicit error. Idempotent operation IDs return the same stored outcome; a reused ID with different payload is rejected.

## Preview and truthfulness

Render text/code from immutable artifact blobs. Optional index.html preview uses an isolated untrusted origin/webview with no host IPC, scripts, remote resources, forms, popups, navigation or file-system access. Resolve only allowlisted relative resources within that revision, with no path traversal or project-root reads. Private preview staging may write app-owned temporary bytes, never selected project files; label it Local static preview. Imported artifacts do not reactivate legacy bookmarks. Closing/restart may recreate preview from saved bytes; it does not change applied state.

Transcript says Generated proposal; preview says Local preview; only a verified durable ApplyReceipt says Applied to project. Reverted means originals verified. Provider text cannot supply tool/test receipts. Continuation says selected revision and file count; applying or reverting does not silently change selected continuation bytes to the on-disk tree. If user wants current disk edits, capture a new explicit snapshot through the Project workspace flow.

## Integration seams and stop conditions

Proposed commands/DTOs are in DTO.ts. Host owns parser/storage/grants/journal/hash checks. desktop-host/core bridge transports bounded snapshots and mutation receipts. Transcript callbacks select a revision; artifact pane shows list/preview/diff/status; composer stores only a host-issued selection reference with persisted full snapshot. Keep current model/provider selection logic unchanged. Actual Send uses existing admission/dispatch path; the continuation command itself never dispatches.

Acceptance cases in ACCEPTANCE.json are specifications, not executed runtime tests. Begin with one active project, one conversation, one generated text file, read-only preview, explicit apply/revert and draft selection across restart; then add multi-file failure/recovery cases before claiming the full V1. Runtime review must resolve its current workspace/draft revision and root-grant type names before coding. Stop here at contract/fixtures; no edit lease or release readiness is conferred.
