# Durable artifact/result contract — September 10, 2026

**Status:** Proposed bounded V1 contract for the accepted Tauri host  
**Source baseline inspected:** local candidate commit `5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b` in `tools/symphony/source-import-candidate`  
**Scope:** host-owned result identity, inert inspection, and the minimum durable foundation for a files/artifacts side pane. This report does not edit product source, execute a provider, build or launch the app, add an IDE/terminal, publish, or dispatch work.

## Decision

Add one host-owned, immutable **artifact record** per saved result or admitted output file. The renderer receives bounded metadata in the workspace snapshot and must request content by exact identity when the user opens an item. The renderer never decides artifact provenance, accepts a provider-supplied filesystem path, reads a path directly, or infers files from Markdown fences.

V1 supports two content locations behind the same contract:

1. **Saved run text** — a durable reference to an existing final answer or retained Constellation member result. The existing run/session remains the canonical text; the artifact record binds that exact slot and digest rather than duplicating mutable content.
2. **Host-managed UTF-8 file** — bytes staged and committed under Rivune's private profile by the host. Only a validated relative storage key is persisted. Absolute paths, `..`, symlinks, provider paths and source-attachment paths are never part of the public DTO.

The first implementation slice should expose saved run text only. It proves identity, snapshot projection, selection, open/close, missing-state UI, restart, and retry preservation before any provider adapter is allowed to produce a managed file. The managed-file variant belongs in schema V1 now so the side pane does not need a second identity model later, but it stays admission-disabled until its storage tests pass.

This is a **result browser beside chat**, not an editor. No write-back, diff, web canvas, command execution, automatic file opening, or OS reveal action is in V1.

## What exists now, and what does not

### Existing durable behavior to reuse

- `src-tauri/src/host.rs:321-350` persists every run's `requestID`, `conversationID`, frozen admitted provider/team/context, status, final `answer`, and error in `RunRecord`.
- `src-tauri/src/host.rs:1259-1317` saves a Constellation checkpoint and the terminal run answer in one candidate workspace generation. `src-tauri/src/host.rs:2340-2380` does the corresponding terminal save for a direct run and reports uncertainty instead of claiming durability after a failed save.
- `src-tauri/src/constellation_projection.rs:14-45,77-115` projects bounded retained member answers with frozen `memberID` and host-mapped `providerID`. It deliberately does not expose private orchestration bindings or receipts.
- `prototypes/ai-native-workspace/src/host/contracts.ts:8-16,89-135` validates the run/request/conversation binding, Constellation member identity, bounded member text, lead resolution, and failed-retry identity before React sees it.
- `prototypes/ai-native-workspace/src/host/SavedResult.tsx:5-33` already opens an exact captured answer as inert text, copies only on an explicit click, traps focus, and restores focus on close. This is the interaction baseline for artifact inspection.
- Input attachments are already frozen safely for a run: `src-tauri/src/host.rs:114-137,4952-5091` persists approved bytes and copies their name/hash/text into `AdmittedRequest`; `src-tauri/src/host.rs:3675-3755` removes source paths, bytes, admitted attachment text, and document context from the public snapshot. `inspect_text_attachment` then resolves exact `conversationID + attachmentID + optional runID` (`src-tauri/src/host.rs:4773-4834`). Reuse that metadata/content split, not the attachment record itself.

### Existing shapes that are not native artifacts

- `prototypes/ai-native-workspace/src/types.ts:13-20,31-46,89-99` defines browser-demo files and artifacts containing inline content. `App.tsx:19-47` mounts those only in `DemoWorkspace`; a desktop host mounts `HostWorkspace` instead (`App.tsx:13-16`).
- The demo editor says its edits are never written to disk (`components/editor/EditorPanel.tsx:17-38`) and its web preview is constrained demo JSON (`components/editor/ArtifactPreview.tsx:23-52`). Copying these objects into the native host would fabricate persistence and execution capability.
- The host transcript currently renders only `run.answer`, retained member text and `SavedResult` actions (`HostWorkspace.tsx:143-159`). `HostSnapshot` has no artifact collection or selected artifact (`contracts.ts:18-21,144-178`).
- The orchestration engine has an internal `ArtifactReceipt` with only artifact ID, content hash, scope ID and verification receipt (`src-tauri/src/team_strategy.rs:1086-1147`). Current native adapters always submit `artifacts: Vec::new()` and no inspected digest (`src-tauri/src/host.rs:1529-1535,1709-1715`). The public Council projection intentionally excludes artifact receipts (`constellation_projection.rs:1-3,59-63`). Therefore artifact-capable provider execution is **not implemented**.
- `ApprovedContext.selected_artifact` (`src-tauri/src/host.rs:164-171`) is prompt context text. It is not a stored artifact identity and must not be repurposed as one.

## Persisted contract

Add a bounded `artifacts: Vec<PersistedArtifactV1>` to `WorkspaceSnapshot`. Records are append-only and immutable except for their host-maintained availability state. A newer record may point back to the older record it supersedes; the older record is never edited.

```text
PersistedArtifactV1
  schemaVersion: 1
  artifactID: ASCII identity, unique workspace-wide
  conversationID: existing conversation identity
  requestID: existing run identity; equals RunRecord.id
  origin:
    kind: finalAnswer | memberAnswer | managedOutput
    memberID: null for finalAnswer; frozen admitted member for memberAnswer/managedOutput
    providerID: null or the provider mapped from the frozen admitted run/team
    invocationID: private host binding when one exists; never trusted from renderer/provider metadata
    attemptID: private host binding when one exists; distinguishes retry output
  displayName: host-normalized label, not a path
  previewKind: plainText | markdownText | sourceText | jsonText
  languageHint: optional presentation hint; never selects an executor
  byteLength: exact UTF-8 bytes
  contentSHA256: 64 lowercase hex characters
  storage:
    kind: runText | managedFile
    resultSlot: final | member:<memberID>        # runText only
    relativeKey: artifacts-v1/<artifactID>/content  # managedFile only
  availability:
    state: available | missing | corrupt | unreadable
    checkedAtGeneration: workspace generation
  createdAt: host timestamp
  supersedesArtifactID: optional older artifact from the same admitted output slot
```

Required invariants:

1. `conversationID` exists; `requestID` exists and its run has the same conversation.
2. `finalAnswer` points to the exact persisted `run.answer`. `memberAnswer` points to one bounded public member result from that run's persisted Constellation checkpoint. The host recomputes the digest and byte length; React does not supply them.
3. `memberID` and `providerID` come from the frozen admitted team/member projection. A missing historical provider stays null; never bind by current provider label or executable path.
4. An artifact ID is host-issued. For idempotent migration and recovery, derive it from a canonical, versioned tuple containing `requestID`, origin kind, member/attempt identity when present, and `contentSHA256` (or persist an equally collision-resistant opaque ID in the same atomic candidate). Reusing it with different provenance, content, storage, media or digest is invalid. A retry produces a new immutable artifact if its exact content/attempt changes; it may point to an older partial artifact through `supersedesArtifactID` but never overwrites or deletes it.
5. `managedFile.relativeKey` is host-generated beneath the private profile. It must be normalized, relative, free of control characters, `.`/`..` segments and symlinks. The public projection and inspection DTO never expose the profile root or relative key.
6. Managed bytes are written to an owned staging file, size/hash checked, file and directory synced, then atomically renamed before the workspace record is committed. A pre-commit orphan may be garbage-collected only when no committed artifact references its digest/key. Post-rename uncertainty reconciles the same artifact identity; it never creates a second logical result.
7. On host open and before each inspection, `managedFile` is opened no-follow as a regular file and checked against exact byte length and SHA-256. The host durably records `missing`, `corrupt`, or `unreadable`; it never silently removes the row or falls back to another path. `runText` is `available` only while the referenced persisted result slot and digest match; a mismatch is `corrupt` and blocks content.
8. Input `PersistedAttachment` remains a separate type. Its external `sourcePath` and `changed/permissionRequired` semantics are for approved prompt context, not an output artifact. An attachment cannot be relabeled as an artifact by ID alone.

Proposed managed-file limits for the disabled V1 variant should remain deliberately small: UTF-8 regular files only, at most 256 KiB per artifact, eight artifacts and 1 MiB total per run. These are new limits, not current capabilities; change them only with measured host/storage/UI evidence.

## Public bridge DTOs

`getSnapshot()` should include metadata only:

```text
HostArtifactSummaryV1
  schemaVersion, artifactID, conversationID, requestID
  origin: { kind, memberID, providerID }
  displayName, previewKind, languageHint
  byteLength, contentSHA256
  availability: available | missing | corrupt | unreadable
  createdAt, supersedesArtifactID
```

Do not expose `storage`, profile paths, source paths, bytes, private invocation/attempt IDs, scope grants, verification receipts, approved context, or provider executable paths through the artifact DTO.

Add exactly one read command for the first slice:

```text
inspect_artifact({ artifactID, conversationID, requestID, expectedSHA256 })
  -> HostArtifactInspectionV1 {
       schemaVersion, artifactID, conversationID, requestID,
       previewKind, languageHint, byteLength, contentSHA256,
       availability, text
     }
```

Admission and parsing requirements:

- The bridge accepts a plain-data object with exactly the four request keys and bounded ASCII IDs/hash. No path or preview kind comes from the renderer.
- The host resolves one record matching all three identities and digest, confirms the run/conversation binding, revalidates availability, then returns bounded UTF-8 text. Any mismatch fails closed and returns no content.
- The React parser uses an exact key allowlist, schema version, byte-count/hash shape, preview enum and returned identity equality. An incompatible response closes/keeps closed the preview and shows a recoverable error; it cannot reuse the previously selected item's content.
- Snapshot artifact summaries are unique by `artifactID`, reference known conversations/runs, and have no forward or cyclic supersession link. Unknown schema or impossible provenance makes the snapshot incompatible rather than silently attaching a result to the wrong conversation.
- Artifact creation is internal to terminal run persistence, not a public renderer command. For direct runs it must join the same durable candidate as the terminal `RunRecord` update. For Constellation it must join the same checkpoint candidate that contains the retained member/final text. An artifact must never become visible when the corresponding terminal/checkpoint save is rejected or unresolved.
- Future provider-file admission may consume the engine's `ArtifactReceipt` only after a host adapter has staged bytes and independently matched the ID, hash, scope and inspection receipt. A receipt alone, provider stdout path, or claimed filename is not content admission.

## Preview and open semantics

Permitted V1 previews are inert UTF-8 text:

- `plainText`: exact whitespace-preserving text;
- `markdownText`: source text initially; a future sanitized renderer is a separate review;
- `sourceText`: exact text with an allowlisted language hint used only for highlighting; and
- `jsonText`: exact text, optionally formatted only after strict parse without changing the saved bytes.

Do not render or execute HTML, SVG, JavaScript, CSS, Markdown links, remote media, PDFs, images, notebooks, archives, binaries or executable files in V1. Do not infer `web` from a filename. “Open” means inspect inside Rivune; it does not launch an application, navigate a URL, reveal a path or grant a new permission.

The side pane's open/selected state is renderer-local:

- Selecting a row sets the exact tuple `conversationID + requestID + artifactID + contentSHA256`, opens the pane and calls `inspect_artifact`.
- The pane shows loading or the selected row immediately, but never stale content from the prior selection. A late response whose tuple no longer matches is discarded.
- Switching conversation closes the pane and clears selection. Returning to a conversation does not silently open a result. The user selects one explicitly.
- Close/Escape returns focus to the exact opener; narrow layouts return to Chat. Opening/closing/selecting does not save a draft, submit a run, mutate history, mark a result reviewed, or change active provider/team.
- Missing/corrupt/unreadable rows remain selectable so the pane can explain what happened, but the command returns no preview content. Offer retry inspection; no automatic path search or regeneration.
- The transcript's existing **Inspect saved answer** actions remain valid during the first slice. They may open the same side pane only after their exact saved result has a host artifact identity; do not regress the accepted dialog before that replacement is proven.

## Council, retry and cancellation invariants

- The artifact record describes output from the actual frozen `RunRecord.admitted` Council. It does not imply agreement, factual verification, Swarm execution, or a new review pass.
- Retained member results remain independently attributable. The final answer is lead synthesis and must not be duplicated as a member contribution.
- Retry/cancel stay attached to the original run identity. A retry of one failed invocation may append output with the exact saved invocation/attempt binding, but it cannot replace another member's artifact or rebind to current composer/provider state.
- Cancelling preserves every artifact already durably committed. A partial run may have retained member artifacts and no final artifact. A failed or cancelled run must never synthesize a final artifact from the latest visible text.
- Later composer, team, model or provider changes affect only later requests and never rename or relabel historical artifact provenance.

## Smallest implementation slice

1. Add the persisted/public artifact types and strict open-time validation, but enable only `runText` origins (`finalAnswer`, `memberAnswer`).
2. During the existing durable terminal/checkpoint save, append deterministic host-issued records for newly durable final/member text. Reopening/migrating a pre-contract profile may derive missing result records once from saved runs/checkpoints with a recorded schema migration; it must not fabricate a final result when none exists.
3. Add bounded artifact summaries to `public_snapshot`, strict TypeScript parsing, and `inspect_artifact` with the exact identity tuple and no paths.
4. Add a simple results list beside Chat and an inert text inspector. No editor, filename tree, web preview, save-as, provider-file admission, drag/drop or terminal.
5. Keep `managedFile` admission disabled. Implement its private storage and fault/restart tests as the next isolated host slice before exposing any provider output file.

This is the smallest slice that makes the side pane real: it reads only durable native results, preserves Council provenance, and establishes the bridge that actual files can later use.

## Acceptance cases

### Identity and projection

1. A completed direct run yields exactly one final-answer summary bound to its request and conversation. A completed Council run yields one final summary plus one summary per retained independent member result—no private decision/integration/review text and no duplicate final.
2. Two conversations with identical answer text get distinct artifact IDs and cannot open each other's content. Two same-provider Council members remain distinct by admitted member identity.
3. A provider removed after the run leaves historical `providerID`/null provenance unchanged; current provider labels or routes cannot rebind it.
4. The snapshot contains metadata only. Assert no content, storage key, absolute/relative path, attachment source path, approved context, invocation/attempt ID, scope or verification receipt leaks.

### Durability, failure and recovery

5. Restart restores the same artifact IDs, hashes, ordering, supersession and run/conversation provenance. Interrupted migration or pre-rename save leaves no visible artifact; post-rename uncertainty reconciles one identity.
6. Direct terminal persistence failure and Constellation checkpoint failure never expose an artifact ahead of its durable run result. Retained in-memory text remains governed by the existing reconciliation flow.
7. A failed Council run with one retained member answer exposes only that member artifact. Retrying the exact failed invocation preserves it and appends only the newly durable output/final artifact; foreign/stale retry identities change nothing.
8. Cancellation preserves committed member artifacts and creates no final artifact. Later composer/team edits do not alter old records.

### Inspection and UI

9. Exact identity inspection returns exact whitespace/Unicode bytes and matching length/hash. Wrong conversation, run, artifact, digest, unknown schema, oversized response or late response after selection change yields no displayed stale content.
10. Plain, Markdown, JSON and source previews remain inert text. Test script tags, HTML/SVG, Markdown links, file URLs and misleading `.html` names; none execute, navigate, fetch, or invoke the host.
11. Missing/corrupt/unreadable managed-file fixtures survive restart as visible unavailable rows, return no content, and never fall back to a similarly named file. Restoring the exact host-owned bytes and rechecking can return the same artifact to `available` without changing identity.
12. Keyboard selection opens the pane, Escape/X returns focus to the opener, and conversation switching closes it. At 320px/390px Chat remains reachable and the composer is not permanently covered.

### Managed-file gate

13. Before enabling managed output, prove no-follow regular-file open, relative-key validation, atomic stage/fsync/rename, item/run byte limits, digest mismatch, symlink/swap attacks, orphan cleanup, and all persistence fault points.
14. A forged provider path/receipt, duplicate artifact ID, changed content under the same ID, unknown member, cross-run scope, or receipt without host-staged bytes is rejected atomically and never appears in the snapshot.

## Consequences and deferred work

This contract gives Rivune a real, chat-first results pane without claiming a code editor or file-writing agent. It reuses durable run truth and existing saved-result behavior while adding one narrow identity/read boundary.

Deferred: provider-produced files, Save As/export, user-chosen destinations, image/PDF/web previews, diff/edit/write-back, project workspace changes, Swarm artifacts, remote/cloud storage, search/indexing and cleanup policy. Each needs separate capability, permission, storage and recovery evidence. The browser demo remains illustrative until those host contracts exist.

## Evidence boundary

This is a source-based contract review of the accepted local candidate. It does not prove the proposed record, command, pane, migration, managed storage, native runtime, provider output, restart, packaging or release. The candidate has two pre-existing untracked generated paths; no tracked candidate bytes were changed by this review.
