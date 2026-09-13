# Rivune durable phone journal — native host integration plan

Status: isolated planning artifact only. It does not modify shared native source, installed build 2026090623, provider sessions, saved content, or the live bridge. The journal component must receive independent acceptance before this plan is implemented.

## Current execution path and gap

A Mac phone request enters `RivuneStore.handleBridgeEnvelope(.promptRequest)` and then `handleRemoteRequest`. Current 0623 performs semantic and exact-route checks, records only in-memory fingerprints/results, creates `remoteGenerationTasks`, and calls `executeRemoteRequest` directly. That bypasses the durable `RivuneRunCoordinator` journal. A Mac restart or eviction of the 32-entry result cache can therefore lose duplicate/replay knowledge. The current Mac bridge-disconnect branch cancels every remote task and clears its in-memory maps. The iPhone watchdog also sends `.cancel` after a progress timeout. Both behaviors conflate loss of observation with an explicit user Stop.

## Ownership and initialization

`RivuneStore` on macOS owns exactly one `FileRemoteJournalStorage` and one `RemoteRequestJournal` for its whole lifetime. Use `Application Support/Rivune/phone-request-journal.json`, beside `workspace-runs.json`, with its own recovery/export boundary. Construct the storage and journal once in the designated initializer before accepting bridge requests. Do not construct a journal per request, reconnect, view, or helper.

If storage ownership, decoding, validation, or recovery fails, set a Mac-side remote-journal fault and fail closed for phone execution. Keep local Mac conversations usable. Readiness sent to iPhone must say phone execution needs local journal recovery; it must not advertise a dispatchable phone route. Never overwrite a corrupt or oversized journal automatically.

The accepted journal source should become a new production file, `Rivune/RemoteRequestJournal.swift`, and be included in both app/test targets as appropriate. Integration is manual; do not copy an old candidate over current source wholesale.

## Admission before dispatch

Refactor `handleRemoteRequest` into four ordered phases:

1. Decode and finish existing structural admission: mode/workflow/context versions, role-aware authority, prompt and attachment limits, artifact restrictions, and supported mode. Build the canonical request SHA-256 from the exact encoded `BridgePromptRequest`. No journal record or provider call occurs for malformed input.
2. Build `RemoteAcceptedIdentity` from request ID, turn ID, typed mode, context version, attachment-set digest, requested model/effort digests, and the exact Mac-admitted route identities. Route/model/effort raw strings remain outside the durable phone journal.
3. If the journal already knows the request ID, call `admit` with the submitted fingerprint/identity before applying current readiness to that duplicate. A matching completed request may replay and a matching active/interrupted request may reattach even if the Mac's current default route later changed; neither path dispatches. A mismatch returns the existing explicit request-ID conflict. If the ID is new, require current ready routes and exact equality with the routes advertised to that phone, then call `admit`.
4. Create provider work only for `.dispatch`, after its running reservation has been atomically persisted. Pass the frozen exact routes and API-sanitized options into the coordinator. If coordinator admission/persistence fails, durably `fail` the phone journal record and return a terminal safe error.

`.expiredResult` returns a terminal explanation that detail was pruned while the request ID remains consumed. `.conflict` makes zero coordinator/provider calls. `.reattach` and `.replay` never create a task. `hostBusy` is evaluated before a new durable dispatch reservation or represented as a durable failed terminal record; choose one policy and test that no stranded `running` reservation is produced.

## Make the Mac coordinator the only execution owner

Remove direct remote provider execution from `RivuneStore.executeRemoteRequest`. Add a remote submission adapter around `RivuneRunCoordinator.submit` so phone and browser/native requests share its capacity, persist-before-provider rule, cancellation owner, and terminal updates. Use the phone request ID as `WorkspaceRun.id` and add the phone conversation ID to `BridgePromptRequest` so the workspace reference is stable. Protocol/schema versions must be bumped together on Mac and iPhone; older payloads fail closed.

Extend `WorkspaceRun` with a backward-compatible persisted nonnegative `durableRevision` (optional-on-decode legacy default, incremented on every successfully persisted mutation). Expose read-only coordinator methods:

- `run(id:requestKey:)` for exact duplicate lookup;
- `remoteSnapshot(id:)` for current stage/turn without task creation;
- `terminalReference(id:requestKey:)` returning run ID, durable revision, and canonical SHA-256 only after terminal persistence;
- `resolve(reference:requestKey:)` that reloads the run, verifies revision and digest, and returns the stored terminal run;
- existing `cancel(id:)`, called only after a durable Stop decision.

Hash a sorted-key encoding of the durable terminal payload `(run id, conversation id, request key, turn, status, stage, durable revision)`. Replay regenerates and bounds the `BridgePromptUpdate` from the verified workspace run. The phone journal stores only `RemoteResultReference`, never answer or artifact text.

Coordinator `onUpdate` remains Mac conversation persistence and also feeds a request-scoped remote observer registry in `RivuneStore`. On terminal update, first ensure the workspace run is durably saved, then create/verify its result reference, call journal `complete`/`fail`/`confirmCancelled`, and only then send the phone terminal update. A journal transition failure stops further remote publication and exposes local recovery; it never launches another provider.

A crash after phone reservation but before coordinator persistence recovers as `interruptedUnknown`. A crash after provider dispatch but before journal completion also recovers as `interruptedUnknown`; v1 must not infer completion or redispatch automatically even if a workspace run happens to exist. Manual reconciliation can be designed separately.

## Detach, reconnect, and explicit Stop

Mac bridge disconnect must remove only the connection's observers and call `detachObservation` for their known request IDs/fingerprints. It must not cancel coordinator tasks or clear durable identity. Navigation, conversation selection, and view disappearance follow the same read-only detach path. Provider work remains Mac-owned for the app lifetime.

On iPhone, retain and locally persist the exact submitted `BridgePromptRequest` until a terminal update. A disconnect or progress timeout changes UI state to `Waiting to reconnect; the Mac may still be working`, keeps the request ID/fingerprint, and does not send `.cancel` or call `finish`. After reconnect/readiness, resend the exact request or use a versioned observe envelope; the Mac journal returns `.reattach`, `.replay`, or `interruptedUnknown` without dispatch.

Only the user's Stop action sends cancellation. Replace the bare `cancellationID` with a versioned `BridgeStopRequest` carrying request ID and canonical request fingerprint (or an equally strong connection-bound proof), and add a `BridgeStopUpdate` acknowledgement/revision. The Mac calls journal `requestStop`; only `.cancelProvider` permits `RivuneRunCoordinator.cancel`. After the coordinator durably reaches cancelled, call `confirmCancelled`, then send the acknowledgement/terminal update. `.alreadyTerminal` replays current terminal state; `.conflict` cancels nothing. Repeated Stop is idempotent.

The current iPhone watchdog's automatic `.cancel(requestID)` must be removed. A transport timeout is observation loss, never proof of user intent to stop billing/provider work.

## Replay and interrupted UI

For `.reattach(.running/.stopRequested)`, register the reconnected phone as an observer and immediately send the coordinator's latest persisted snapshot. For `.reattach(.interruptedUnknown)`, send a terminal uncertainty state: `Rivune closed while this request may have been running. It was not sent again. Start a new request to retry.` The retry button creates a new request ID. For `.replay(reference)`, verify the coordinator reference before returning the existing bounded result. Missing/mismatched references fail closed as local recovery required; never redispatch.

Phone conversation merging continues to require matching request ID and turn ID. A replay must replace/merge the existing phone turn and cannot create a duplicate conversation turn.

## Exact-route rules

Fresh dispatch requires current readiness plus exact equality between request routes and the last routes advertised by this Mac. Freeze those accepted routes in coordinator participants/options for the whole run. API routes receive `.accountDefault`; CLI routes receive the admitted requested model/effort. Connection refresh cannot switch a running task.

Matching duplicate observation/replay uses the journal's already accepted route digests and never requires the current default route to remain the same because it cannot dispatch. Any new ID with stale/missing/fabricated routes is rejected before journal reservation and before coordinator/provider work.

## File ownership

- `Rivune/RemoteRequestJournal.swift`: accepted journal/storage component only after independent review.
- `Rivune/RivuneStore.swift`: journal lifetime, four-phase remote admission, observer registry, detach/reconnect, terminal journal transitions, removal of direct remote task/cache ownership.
- `Rivune/RivuneRunCoordinator.swift`: phone submission adapter, persisted durable revision, terminal reference/digest resolver, latest snapshot, cancellation acknowledgement seam.
- `Rivune/Models.swift`: required phone conversation identity, protocol/schema bump, typed stop request/update, detached/interrupted presentation fields if needed.
- `Rivune/PeerBridge.swift`: transport notifications only; no provider cancellation. Add connection-generation identity only if needed to detach the correct observer set.
- iPhone views/components: waiting-to-reconnect, reattach, interrupted-unknown, Stop-requested, and expired-result copy; no automatic cancel on timeout.
- Xcode project: add the accepted production journal and focused test files to Mac/iOS/test targets.

## Synthetic test seams

Use injected `RemoteJournalStorage`, `AITextRunning`, coordinator journal URL, clock, and bridge-envelope sink. No live CLI/API call is necessary. Required deterministic tests:

1. storage failure before `.dispatch` produces zero provider calls;
2. duplicate same ID/fingerprint during one process and after restart never dispatches twice;
3. conflicting fingerprint/identity/route makes zero calls;
4. two stores/journals for one path and two journals over one storage cannot both authorize; failed initializer cannot release a successor lease;
5. fresh exact-route mismatch is rejected before reservation; matching completed replay still works after current route changes;
6. disconnect, navigation, view disappearance, and watchdog timeout detach only while Mac work continues;
7. explicit Stop persists `stopRequested` before coordinator cancellation, repeated Stop is idempotent, and confirmation persists before acknowledgement;
8. restart converts running/stopRequested to `interruptedUnknown` and reattach never redispatches; retry uses a new ID;
9. terminal coordinator persistence precedes journal completion, reference resolution verifies run ID/revision/digest, and missing/tampered/pruned results never redispatch;
10. replay merges one existing phone turn, including bounded update handling and complete-file artifact references;
11. journal bytes contain no prompt, answer, attachment contents, API key, CLI session, raw route/model/effort text, diagnostics, or provider IDs;
12. corrupt/oversized journal disables phone execution without damaging workspace history;
13. local/browser and phone tasks share the coordinator's two-task and per-conversation limits;
14. protocol-version mismatch and legacy bare-cancel envelopes fail closed.

## Integration gates

Do not modify shared native source until the journal foundation is independently accepted. Then implement in a fresh isolated staging copy based on the exact accepted 0623 source hashes. Run focused journal/remote-admission/coordinator tests first, then the full native suite and Mac/iOS Release builds. Review the exact source delta before any local install. Preserve installed 0623, its rollback copy, and semantic user-data snapshots until the next candidate passes rendered smoke checks. No physical-phone, live-provider, signing/notarization, DMG, hosting, or App Store claim follows from these synthetic gates.
