# REVIEW-QUICK-DRAFT DTO candidate

Status: isolated proposal for central/runtime review. It is not canonical, built, installed, or rendered.

## Tray event

Event: `rivune://open-review`

```json
{
  "schemaVersion": 1,
  "actionID": "550e8400-e29b-41d4-a716-446655440000",
  "recoveryScopeID": "profile-550e8400-e29b-41d4-a716-446655440000"
}
```

- Rust creates a new UUID v4 `actionID` for each deliberate tray activation.
- `recoveryScopeID` is a host-owned UUID v4 stored once in the private profile file `recovery-scope-v1`; no profile path, hash of a path, clipboard value, screen data, conversation identity, or text crosses in the event.
- The renderer rejects unsupported schemas, non-printable/non-ASCII identifiers, action IDs over 64 bytes, scope IDs over 128 bytes, or any action whose scope differs from the active host.
- Duplicate delivery of one action ID is idempotent and cannot clear typed text, replace an uncertain request, or cause another save.

## Frozen draft write

The target and request are frozen only after the user deliberately presses **Add to draft** and the ordinary selected draft write has durably settled.

```json
{
  "conversationID": "existing-selected-editable-conversation",
  "mutationID": "review:550e8400-e29b-41d4-a716-446655440000",
  "expectedRevision": 17,
  "draft": "existing draft\n\nexplicitly typed or pasted Review text",
  "attachmentIDs": ["ordered-existing-attachment-2", "ordered-existing-attachment-1"]
}
```

- The casing exactly matches the current renderer receipt parser: `conversationID`, `mutationID`, `expectedRevision`, `attachmentIDs`.
- `review:` plus a UUID v4 is 43 ASCII bytes, below the host's 128-byte mutation-ID limit.
- Merge rule: an empty base becomes the trimmed explicit text; otherwise append one blank-line boundary, avoiding a third newline when the base already ends in a newline.
- The complete UTF-8 merged draft, including delimiter, must be at most 128 KiB. Nothing is truncated.
- Existing attachment IDs are copied in their current order. Review never creates, removes, reorders, reads, or approves an attachment.
- Imported/archive/read-only, absent, pending, conflicting, cross-profile, or shutdown-frozen targets are rejected before a Review save.
- This path calls only `saveRichDraft`; it never calls `submitRun` or a provider.

## Uncertain outcome and restart

Before the host call, the renderer persists this profile-scoped record:

```json
{
  "schemaVersion": 1,
  "recoveryScopeID": "profile-...",
  "actionID": "...",
  "explicitText": "the user's retained Review text",
  "request": { "the": "exact frozen request above" }
}
```

- Storage key: `rivune.pending-review.v1:<recoveryScopeID>`.
- Restore validates schema, scope, identifiers, attachment uniqueness, mutation/action relationship, draft byte size, explicit text byte size, and a bounded serialized record.
- Restart does not save automatically. It presents **Retry same save**, which replays the exact mutation ID and exact payload so the host can reconcile idempotently.
- There is intentionally no “Discard” that suggests an uncertain host write can be rolled back. Closing hides the surface but retains the recovery identity.
- Text becomes read-only after uncertainty so the same mutation ID can never be reused with changed bytes. A later deliberate append requires a new tray activation/action ID.

## Decision still owned by parent

This candidate implements only explicitly typed/pasted text appended to the existing selected draft. The parent still needs to decide whether the broader Review product means quick chat/task status, explicit text/screenshot review, or both. Screenshot review is not implemented here and must remain explicit-input only.
