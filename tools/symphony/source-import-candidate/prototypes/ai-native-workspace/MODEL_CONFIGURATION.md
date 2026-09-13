# Constellation configuration capability boundary

The current Codex/Claude adapters expose provider-managed defaults only. Their versioned model catalog reports no discovered models or effort options. A lower-level CLI `--model` argument is not proof of a verified model catalog or account entitlement and does not enable these controls.

Each current catalog provider includes:

```json
{
  "selectionCapabilities": {
    "schemaVersion": 1,
    "modelOverride": "unsupported",
    "effortOverride": "unsupported",
    "reasonCode": "ADAPTER_DISCOVERY_UNAVAILABLE"
  }
}
```

This is an additive field in catalog v1, included in its revision hash. Legacy v1 catalogs without the field remain readable; the frontend normalizes their capability to unsupported with reason CAPABILITY_NOT_REPORTED. Unknown capability versions, fields or support claims are rejected. No provider/model/reasoning selector is enabled by omission or an unknown value.

Existing TeamSelection v1 persists two to six members and leadIndex. Member ModelSelection v1 persists providerID, catalogRevision, modelID:null and effortID:null. The current lead choice is retained; no ranking or automatic reassignment is introduced. The host resolves admitted defaults to providerManagedDefault with unknown effective model/effort IDs kept null, rather than fabricating names.

A changed saved selection/team must now pass the same current-catalog resolution boundary as admission. Explicit unsupported overrides, stale catalog revisions and removed/unavailable routes return deterministic rejection before the mutation is persisted. Unchanged legacy/stale configuration may accompany draft preservation: this avoids losing unsent text or rewriting historical choices. It still cannot dispatch until explicit review succeeds. Mutation identity/replay and durable recovery handling are unchanged.

When the new capability field changes the catalog revision, existing saved teams stay intact and require explicit review/apply of current defaults before sending. This preserves member order and lead; it does not silently migrate a requested override to a different model. Existing frozen run and retry identities are not rewritten.

Validation covers typed and legacy catalog parsing, future/malformed capability rejection, explicit overrides, stale selection review without mutation, removed providers, native default-only serialization/admission, rejected configuration save, and reopening/reapplying a legacy team while retaining its draft and lead. These are local contract/persistence tests, not proof of authentication, entitlements, live provider discovery or a provider response.
