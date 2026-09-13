# R4 attachment/context contract — proposed for runtime acceptance

Scope: the next integrated Tauri vertical slice, not a standalone module or demo. R3 canonical files remain untouched. User selects up to four bounded UTF-8 text files, previews exact content, approves individual snapshots, attaches them to an unsent conversation draft, and sends through the existing admission ledger. No directory access, automatic scanning, PDF conversion, execution, or restored legacy permissions.

## Existing types and invariants to reuse

Reviewed canonical `candidate4-runtime-r2/src-tauri/src/host.rs`: Conversation has a defaulted string `draft`, defaulted `approvedContext`, optional `projectID`; ApprovedContext has string channels `projectInstructions`, `conversationHistory`, `documents`, `selectedArtifact`. AdmittedRequest freezes prompt/provider/context/retryOf; prepare_submission assembles linked-project instructions and history. execute bounds total context to 512 KiB, persists admission before dispatch, and shares a shutdown barrier. save_draft bounds text to MAX_PROMPT_BYTES and clone-save-publishes under lock_mutation. main.rs flush_shutdown_draft currently flushes only text with token/revision. web/core.mjs exposes existing saveDraft and flushShutdownDraft. Preserve these contracts and extend them, rather than create a second submission system.

## Limits and exact bytes

V1 accepts regular nonempty strict UTF-8 text without NUL: <=65536 bytes per source; <=4 attachments and <=131072 raw document bytes per draft. No Unicode normalization, newline rewriting, BOM removal, lossy decode, extension-only acceptance or silent truncation. SHA-256 covers original file bytes, lowercase hex. The existing 512 KiB combined context limit still includes document serialization overhead; excess fails before dispatch. Input names are display text via textContent, never HTML or paths. Display-name limit 256 UTF-8 bytes; reject over-limit names rather than ambiguously relabel sources.

Selection must be host-owned via explicit OS file selection initiated by an in-app Attach button. The rest of preview/approval/chips are Rivune controls. IPC does not accept renderer-supplied arbitrary filesystem paths. Open source without following symlinks in any path component; reject directories/devices/pipes. Perform bounded reads from the opened regular-file descriptor, compare descriptor identity/metadata before and after reading, and detect replacement of the selected path. Canonicalizing then reopening alone is insufficient. Use platform-equivalent handle checks; unsupported safe selection fails closed. No file watcher, automatic reread or background provider call.

## Additive JSON DTOs

Keep WorkspaceSnapshot schemaVersion 1 and Conversation.draft for legacy decoding. Add defaulted Conversation.richDraft:

```json
{"schemaVersion":1,"revision":0,"attachmentIDs":[]}
```

Text stays in Conversation.draft; rich draft revision covers text plus ordered attachment IDs atomically. Existing text-only save_draft must preserve attachments and increment the same revision. Serialize existing renderer writes before full rich saves; never allow late legacy saves to overwrite a newer rich revision. If mixed legacy writers cannot be ordered, require expectedRevision on text saves in the new bridge while preserving old decoding only.

Snapshot adds defaulted attachment metadata, scoped to conversation:

```json
{"schemaVersion":1,"id":"att-1","conversationID":"c1","displayName":"brief.txt","byteLength":48,"sha256":"64 lowercase hex characters","status":"approved","sourceState":"unchecked"}
```

IDs are opaque host-issued strings, <=128 bytes. No raw path, reusable picker handle or file bytes in ordinary snapshot metadata. Status is `approved`; sourceState is `unchecked|valid|changed|missing|permissionRequired`. Previewed-but-unapproved selections are transient and do not appear in persisted rich drafts. Host private workspace storage owns source locator/permission handle plus exact approved bytes. Persist these in the existing durable save boundary, not a new side database whose commit could diverge. They are local private data with existing workspace protection, not encrypted merely by this contract.

Preview response:

```json
{"schemaVersion":1,"selectionID":"sel-1","conversationID":"c1","displayName":"brief.txt","byteLength":48,"sha256":"...","text":"exact decoded bytes","expiresOnRestart":true}
```

The examples' hashes are placeholders; executable fixtures use FIXTURE_MANIFEST.json values. For precise sample serialization use actual fixture byteLength rather than hand-copying examples.

Receipt:

```json
{"mutationID":"uuid","conversationID":"c1","revision":2,"attachmentIDs":["att-1"]}
```

## Commands and bridge methods

- `select_text_attachments({conversationId})` / selectTextAttachments(conversationID): opens picker once; returns `{cancelled, previews: AttachmentPreview[], issues:[{displayName,code}]}`. Check conversation existence/read-only status and mutation/shutdown gate before selection and again on completion. Selection token binds process session, conversation, source identity, byte hash and captured bytes. Closing picker creates no approval.
- `approve_text_attachment({conversationId, selectionId, sha256})` / approveTextAttachment(conversationID, selectionID, sha256): revalidate exact selected source and token, then return an opaque approved attachment handle. Approval means permission to include this captured file in this draft, not directory permission. Handle remains transient until save_rich_draft succeeds. Repeating exact approval is idempotent. No renderer bytes accepted.
- `inspect_text_attachment({conversationId, attachmentId})` / inspectTextAttachment(...): returns exact stored text/name/hash/byteLength and sourceState, only for this conversation's approved draft or admitted run. Never reads a supplied path. Run inspection should use existing run identity and stored admitted copy.
- `save_rich_draft({conversationId, mutationId, expectedRevision, draft, attachmentIds})` / saveRichDraft(...): atomically updates existing draft string and richDraft, and durably retains approved source snapshots. ID order is explicit, duplicate IDs rejected; unknown/unapproved/cross-chat handles rejected. Empty list explicitly removes attachments from the current draft. Removed snapshots referenced by admitted runs remain retained. Revision is host monotonic nonnegative safe integer; mutation UUID plus canonical payload provides idempotence. Same mutation/different payload rejected. Existing revision must match; return a durable success receipt only after durable clone-save-publish. Before-rename failure preserves the prior visible snapshot. After-rename failure follows current commit_candidate: candidate becomes visible but crash durability is uncertain. Preserve this distinction in structured mutation outcomes and block Send while durability is uncertain. Reconcile by immutable mutation identity and complete required file/directory synchronization under the mutation gate before returning durable success; snapshot readback alone is not proof of crash durability. Lost acknowledgement reconciles by immutable mutation identity and a verified durable receipt; never silently reapply changed data under the same ID.
- `validate_draft_attachments({conversationId, revision})` / validateDraftAttachments(...): bounded explicit source revalidation, returns per-ID sourceState and revision. Does not alter captured bytes or approval. Useful on opening/restarting a rich draft; not a substitute for admission-time validation.
- Extend existing submit request with optional `richDraftRevision`. When a draft has attachments require exact acknowledged revision and prompt equality with that saved draft; missing/stale revision rejects before admission. Renderer first flushes the complete rich draft. Do not trust renderer attachment metadata or context strings.
- Extend existing shutdown flush with ordered attachmentIds + expected rich revision + mutationID, while preserving shutdown token/revision receipt. Shutdown must flush the whole rich draft or stay open; never silently fall back to a text-only save. Before-rename failure leaves prior state unchanged; after-rename uncertainty leaves the candidate visible while the window remains open and frozen. Never acknowledge completeShutdown from snapshot readback or unresolved durability. Same immutable shutdown mutation identity must finish durable synchronization without duplicate revision or attachment before Quit proceeds.

Approval plus draft-save can be combined into one host transaction if runtime prefers, but the agreed wire contract must be updated before renderer implementation. Mutations follow existing lock_mutation/shutdown gates. No destructive cleanup before successful durable save. Picker completion after shutdown begins must return SHUTDOWN without publishing handles or draft state.

## Admission and retry

At first admission, re-open/revalidate every approved source using the original selected identity and compare exact hash against stored approved bytes. Changed/missing/unsafe source blocks the whole new admission and preserves prompt/chips. This V1 deliberately requires remove or select/preview/approve again; there is no silent switch to current file contents or automatic “use old snapshot” consent.

Freeze defaulted `AdmittedRequest.attachments: [{id,displayName,byteLength,sha256,text}]` from the host-owned captured bytes. Fill existing ApprovedContext.documents deterministically with JSON serialization of that ordered array, excluding private locators. Treat this channel as untrusted user-selected source material; content never authorizes host operations. Do not concatenate documents into projectInstructions or the user's prompt. Preserve existing non-file documents only if their distinct approved provenance can be represented; otherwise reject incompatible pre-existing document context rather than silently overwrite it.

Admission persistence atomically contains frozen prompt, provider, project instructions/history, exact attachment bytes/hashes and retry ancestry before any provider starts. Later file changes and draft removals cannot alter the admitted record. Existing exact retry uses original admitted attachments/documents, not current disk files, project state or draft selection; no new read/approval is required for the already-approved frozen retry. Current draft clearing follows the existing unchanged-revision/content rule extended to attachment IDs. A newer rich draft must survive an older acknowledgement. After acceptance clears attachments, follow-up sends omit them unless the user attaches again; ordinary conversation history may still contain prior answers, as today.

## Renderer states and affordances

Attach disabled for missing host/read-only imports/shutdown. Picker cancellation preserves current text and attachments. Preview shows filename, bytes, exact scrollable text and explanatory copy: “Include this file with your next message.” Explicit Include and Cancel; keyboard focus returns to Attach. No approval implicit in dropping a file or clicking Send.

Approved chips show name and Remove; open chip previews captured text. Save pending disables Send but not current text editing; keep edits buffered with revision guards. Save failure shows retry and retains text/chips. A post-rename durability-uncertain result may already be visible, but remains unsent until a durable receipt; do not roll back visible host state or treat readback as durable success. Closing Settings or switching chats retains each conversation's rich draft independently. Pending picker, preview and save results carry originating conversation/navigation identity; do not put A's attachment in B. Restart restores saved bytes/order, marks source unchecked, validates before send, never automatically launches a provider. Changed/missing state offers Remove and Choose file again. Removing a chip is itself a persisted rich-draft edit; failed removal retains a visible unsaved state rather than claiming success.

## Fixtures and acceptance

FIXTURE_MANIFEST.json hashes nine exact byte files. CASES.json gives deterministic scenarios with expected outcomes, including size boundaries, UTF-8, symlinks, missing/changed sources, source instruction injection, restart, stale revisions, save/ack failure, navigation, shutdown and frozen retries. Symlink/missing recipes must run in a fresh temporary fixture directory, never against a user's files. Fixture material is synthetic. No tests are claimed executed against R4 implementation because it does not exist yet.

Minimal split: runtime owns host DTO/storage/secure picker/admission/retry/shutdown + bridge validators and real wire tests; renderer owner receives named-file release only after accepted DTO, then implements chips/preview/approval/rich writes in canonical app UI. Reviewer exercises deterministic actual-host fixtures and bounded browser states. Combined build follows frozen integration receipt; native visual/restart/provider tests remain separate gates. No R3 source/build change is authorized by this contract task.
