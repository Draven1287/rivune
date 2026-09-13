# Runtime dependency: authoritative Review recovery binding

V2 intentionally blocks all cross-process replay. Enabling it safely requires a host contract, not another renderer-only UUID.

## Required properties

1. The host supplies an opaque `workspaceIncarnationID` that is stable across an ordinary restart of the same workspace incarnation.
2. The identifier rotates for a cloned profile, workspace reset, restored older snapshot, or other operation that can recreate a prior conversation ID and rich-draft revision.
3. The binding must not rely only on a value stored inside the copyable/restorable profile payload. Copying a UUID file must not copy mutation authority.
4. The identifier conveys no authentication, secret, session, or authorization meaning.
5. `save_rich_draft` validates the supplied incarnation inside the same host-side mutation/CAS boundary. Renderer key names alone are insufficient.
6. A read-only host reconciliation operation must resolve `{workspaceIncarnationID, mutationID}` as durably applied with its original receipt, definitely not applied, or unknown. It must not write or dispatch a provider.
7. Unknown remains blocked. It must never be converted into Discard, automatic append, or a new mutation carrying the same text.
8. Existing R4 same-mutation resynchronization behavior must be corrected before this path interprets a rejection as proof that no write occurred.

## Candidate transport

Tray event, after runtime acceptance:

```json
{
  "schemaVersion": 1,
  "actionID": "host-issued-opaque-action",
  "recoveryScopeID": "host-routing-scope",
  "workspaceIncarnationID": "host-authoritative-incarnation"
}
```

Draft save, after runtime acceptance:

```json
{
  "workspaceIncarnationID": "host-authoritative-incarnation",
  "conversationID": "selected-editable-conversation",
  "mutationID": "review:<actionID>",
  "expectedRevision": 17,
  "draft": "complete merged draft",
  "attachmentIDs": ["ordered-existing-ids"]
}
```

The current V2 fixture does not add these Rust/profile changes. Runtime coordination should occur only when the R4 priority permits and central names an integration release.
