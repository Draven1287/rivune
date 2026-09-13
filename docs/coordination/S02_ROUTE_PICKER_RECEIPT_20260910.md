# S02 Settings route picker and private acknowledgement correction

Frozen successor `dd9706b37e2b5fe162bf0390b2b1bf073e3fd4a0`, parent `e49efc20e0c50609730787534ecfaa4556198b5a`, Git tree `b4b2adde22e4dcb35dce97a23cc69ad41af00328`. Manifest 119 files, SHA-256 `c374400f806757ac4bfd8706553382c82cbb2bc3a91e0d4c230411a1ad300612`. Eight-file delta recorded in tools/symphony/source-stage/GIT_IMPORT_CANDIDATE.json. Clean candidate; committed blobs match; no remotes/root-index use. Separate visual edits are intact and excluded.

## Implemented

Settings has explicit Find installed providers, native select of the returned route, and Save as workspace default actions. Nothing inspects/configures on mount. Unsupported optional bridge has an explanation and no legacy fallback. Existing runs/pending workspace mutations disable setup. Binding explanation says global default does not rebind saved conversation selections or teams. Conversation/draft are not passed to any configuration command.

Uncertain/rejected save fences inspection and another save. Check saved configuration reads a fresh snapshot but never promotes equality to durable success. The earlier save remains explicitly crash-durability-unconfirmed. A separate Review routes for a new save action is required after snapshot review; it reinspects and captures fresh guard expectations. No automatic replay. Only exact durable acknowledgement clears uncertainty. UI state survives dialog closing but not renderer restart; no durable mutation journal or bounded cancellation of a permanently pending configuration promise is implemented.

Addressed the independent mutable-baseline P2 before integration: adapter keeps private expected provider/selected ID, passes detached provider and nested guard copies, validates and returns private expected values. Mutating provider path and nested guard from a synthetic bridge returns uncertain, with one call and original snapshots/drafts unchanged.

## Focused evidence

Seven exact staged unit checks passed (four configuration including mutable bridge regression, three scenario selectors). Four selected mounted scenarios passed at390px: missing bridge, exact durable success, lost acknowledgement with matching visible snapshot, stale-route rejection with differing snapshot; draft/focus preservation and no save replay checked. Initial mobile fixture assertions failed because they invoked hidden sidebar Settings and checked deferred focus too soon; corrected fixtures navigate Conversations and await restoration.

Retained synthetic Settings preview checked at1200px and390px for focus, Escape and dialog horizontal overflow; TypeScript and nine stage-validator checks passed. No discovery/synthesis/native suite rerun. All bridges are synthetic; no actual provider route was configured or executed.

Review URL: http://127.0.0.1:4317/tests/hostRenderer.html?scenario=provider-setup&preview=1&settings=1. It runs only the safe selected setup check and leaves fake Settings mounted; no unfiltered shutdown harness. Click Find installed providers to inspect the synthetic route. Local screenshots/logs: qa-artifacts/s02-route-picker-20260910. No private QA forwarded.

## Next-ready and limits

Independent recheck of mutable-baseline fix, uncertainty wording and retained picker UI. Then explicit conversation-binding selection, because changing global default alone does not change pinned conversation routes. First real connection verification remains separately authorized. No implicit credentials/model discovery/test prompt/send, no native launch/install, paid inference or publication. Prior automatic-review block on cross-task forwarding remains unresolved; receipt is local, handoff not retried.
