# R5 + Constellation integration checkpoint

Status: proposed shared wire contract for the first coherent Tauri milestone. This is not proof of live provider behavior or authorization to build/install/release.

## Already real in canonical source

- Host-owned provider discovery and explicit configuration for Codex and Claude CLI.
- Durable direct-run admission, cancellation, retry ancestry, recovery reconciliation, bounded context, process ownership and final stored answer.
- Atomic rich drafts with exact text, ordered attachment IDs, CAS revision and mutation identity.
- A tested `team_strategy` state machine for Normal, Council and Swarm, including independent member invocations, lead decision/synthesis, bounded concurrency, checkpoint/restart, failure and cancellation semantics.

The `team_strategy` engine is not yet connected to `HostState`, configured providers, Tauri commands, persisted `RunRecord`s or renderer activity. Direct CLI output is captured only at process completion, not streamed. The current composer sends only `mode: direct`. Model and effort are still a free-text field on one globally selected provider. Authentication remains unverified discovery metadata.

## Exact commands

Existing commands remain authoritative:

- `get_snapshot({})`
- `discover_providers({})`
- `configure_provider({provider, select})`
- `save_rich_draft({conversationId, mutationId, expectedRevision, draft, attachmentIds, selection})`
- `flush_shutdown_draft({token, conversationId, draft, clientRevision, expectedRichRevision, mutationId, attachmentIds, selection})`
- `submit_run({request})`, where `request.mode` is exactly `direct` or `constellation`
- `cancel_run({requestId})`
- `retry_run({sourceRunId, newRequestId})`
- `reconcile_run({requestId})`

R5 adds only:

- `get_model_catalog({}) -> Catalog`
- `refresh_model_catalog({providerId}) -> Catalog`; `providerId` is string or null

No renderer command may carry an executable path chosen outside the host picker, provider arguments, environment, credential reference, attachment path/bytes, effective model override or team result.

## Exact R5 persisted selection

`Conversation.richDraft.selection` is null or:

```json
{
  "schemaVersion": 1,
  "providerID": "opaque-provider-id",
  "modelID": null,
  "effortID": null,
  "catalogRevision": "opaque-revision"
}
```

Selection is part of the immutable rich mutation and echoed by durable/rejected/uncertain receipts. Submission references only the acknowledged rich-draft revision; the host resolves the saved selection. `RunRecord.admitted.modelSelection` freezes requested selection, effective IDs only when adapter-verified, resolution, and adapter revision. Retry reuses that admitted mapping without consulting the current draft/catalog.

## Exact public activity/event DTO

Host persists the bounded activity ledger on the run before emitting the same entry through `rivune://run-event`:

```json
{
  "schemaVersion": 1,
  "eventID": "request-id:sequence",
  "requestID": "request-id",
  "conversationID": "conversation-id",
  "sequence": 1,
  "kind": "admitted",
  "phase": "admission",
  "state": "running",
  "memberID": null,
  "providerID": null,
  "role": null,
  "summary": "Request admitted",
  "textDelta": null,
  "error": null
}
```

Allowed `kind` values:

- `admitted`
- `providerStarted`
- `answerDelta`
- `memberStarted`
- `memberCompleted`
- `leadReviewStarted`
- `finalCompleted`
- `failed`
- `cancelled`
- `recoveryRequired`

Allowed `phase` values are `admission`, `direct`, `decide`, `contribute`, `integrate`, `review`, `final`, `recovery`. Allowed `state` values are `queued`, `running`, `completed`, `failed`, `cancelled`, `uncertain`. `memberID`, `providerID`, and `role` are present only when host-bound; the renderer never invents them. `textDelta` is present only for bytes actually received from an adapter and must be sequence ordered. `summary` is bounded host copy, not raw model reasoning. Provider stderr, secrets, paths, hidden chain-of-thought, tool arguments and unapproved file contents never enter this DTO.

The renderer deduplicates by `eventID`, rejects gaps/out-of-order payloads into explicit recovery, uses the persisted snapshot after restart, and shows the final `RunRecord.answer` as primary content. Activity is expandable and secondary.

`RunRecord.activity` is exactly `{schemaVersion:1, baseSequence:number, entries:RunEvent[]}`. `baseSequence` is the sequence of the first retained entry; an empty ledger uses the next sequence that would be assigned. The host retains at most 256 entries and advances `baseSequence` when it drops an old entry. The renderer treats a snapshot whose `baseSequence` is later than its local next sequence as authoritative truncation, not a gap; it replaces its local ledger from that snapshot. Only a gap inside the current retained range requires recovery.

Each `summary` is at most 512 UTF-8 bytes, `error` at most 1,024 bytes and `textDelta` at most 16 KiB. Retained `textDelta` bytes across a ledger are capped at 256 KiB; the host advances `baseSequence` when pruning. Event loss never invalidates a durable final `RunRecord.answer`, which remains authoritative.

`WorkspaceSnapshot.runtimeCapabilities` is exactly `{schemaVersion:1, constellation:'available'|'unavailable', minimumMembers:2, reasonCode:string|null}`. The host reports `available` only after the Constellation execution path is connected and at least two independently admitted executable member routes can be frozen. Provider count, discovery, installation, model name or UI state alone never enables it. Until that source lands, it is `unavailable` with `reasonCode:'ENGINE_NOT_CONNECTED'`.

Every rich-draft and shutdown receipt always includes a `selection` field with the exact immutable saved value, including explicit `null`. Missing `selection` is accepted only while decoding legacy persisted data; newly released bridge calls and receipts may not omit it.

The same atomic rich draft also carries `team`, either null or `{schemaVersion:1,leadIndex:number,members:Selection[]}`. Members are ordered, contain 2-6 structurally valid selections, and must be distinct exact provider/model/effort combinations. `leadIndex` points into that frozen order and preserves the user's chosen lead. Direct mode uses `selection` and requires `team:null`; Constellation mode uses `team` and treats `selection` as the exact lead selection, so it must equal `team.members[leadIndex]`. Text, ordered attachment IDs, selection and team form one mutation identity and one revision. Receipts echo both fields, including nulls. Old acknowledgements may clear pending state only when the entire immutable payload matches; same-text selection/team changes remain dirty and survive restart.

`Catalog` and every nested entry use the exact shape and bounds in `qa-artifacts/tauri-r2-integration-review-20260907/r5-model-catalog/CONTRACT.md`; this checkpoint does not create a competing catalog schema.

## Constellation host mapping

- Build `FrozenRun` from two or more configured, admitted provider routes; one host-appointed lead. One route may appear more than once only with independently frozen model/effort choices supported by the adapter.
- Persist the initial `team_strategy::Session.checkpoint()` before the first dispatch.
- For every reserved invocation, persist `mark_dispatched` before starting that exact provider process; record actual outcome and next checkpoint before emitting completion.
- Map roles to phases: Decide -> `decide`; Answer -> `contribute`; Integrate -> `integrate`; Review -> `review`; Worker -> `contribute`.
- Council requires two or more independent member answers and one lead synthesis. Swarm remains unavailable in the UI until the host supplies verified isolated artifact scopes; no text-only run may pretend it performed artifact work.
- Final answer comes only from `Session.delivery()`. Partial member failure remains visible and blocks automatic synthesis until explicit retry/cancel.
- Cancel signals every owned provider process and checkpoints terminal cancellation. Restart never auto-replays a dispatched invocation.

The admitted Constellation request freezes the exact ordered team, lead index, validated private provider routes, catalog revisions and effective adapter mappings. Later global configuration changes cannot affect it.

## Stop/retry and UI ownership

- Send becomes Stop only while the selected run is actually running.
- Stop calls existing `cancel_run` once with the request ID; uncertain cancellation stays visible and disables a fresh duplicate send.
- Retry uses existing `retry_run` for a failed direct run.
- The exact Constellation recovery command is `retry_constellation_invocation({requestId, invocationId})`. The host accepts it only for the currently failed engine invocation, resolves its full binding privately, applies `Session.retry_failed`, persists the new checkpoint before dispatch and retains all earlier successful contributions. The renderer never supplies an attempt ID or model output. Dispatched or uncertain invocations cannot retry; they remain `recoveryRequired` until host evidence can reconcile them or the user cancels the run. Constellation mode remains unavailable until this command, checkpoint persistence and cancellation are wired.
- Composer owns next-draft selection. Active-run header reads admitted selection and does not change when the composer changes.
- Frontend may implement selectors and activity rendering only after strict parsing of the DTOs above; it must retain current R4 pending-mutation behavior.

## Bounded first implementation

1. Integrate R5 selection/catalog persistence and admission using fixture-backed actual-host tests.
2. Connect Council (not Swarm) to two configured fixture/provider routes using the existing engine, persisted checkpoint and public activity ledger.
3. Add host event emission and renderer snapshot/event reconciliation.
4. Add adapter-native streaming only where the adapter provides parseable documented events; otherwise show truthful provider/member milestones and the final response, never simulated deltas.
5. Review source and rendered behavior, then produce one source-bound candidate build under the existing build gate.

Live provider/account calls, spend, authentication changes, installation, API credential entry, public release and installed-app replacement remain outside this checkpoint.
