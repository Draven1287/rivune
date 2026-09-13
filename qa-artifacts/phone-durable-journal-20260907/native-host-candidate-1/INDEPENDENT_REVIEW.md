# Independent review — native host candidate 1

**REJECT.** The candidate does not yet implement the accepted phone execution contract. The isolated journal v4 foundation remains accepted; these findings concern its native host/iPhone integration.

## Frozen evidence

Patch SHA-256 `eb709e30529214fb1e33a8d8f34d1f262eb9dde410ab0e80b2b8312e8924dc87` and manifest SHA-256 `7e724b87f2e33cc97e87ad8fd333141761f62bd1ed0e905d6091785af53b31b0` were independently verified. The submitted stage drifted in RivuneStore.swift and RivuneDeterministicTests.swift during review. To avoid reviewing moving source, I reconstructed every changed file by applying the frozen patch to accepted 0623. **All seven reconstructed source hashes match the manifest.** Findings and line numbers below refer to that reconstructed candidate, with source copies under `independent-evidence/`.

Owner reports 332 native tests, nine focused tests and Mac/iOS Simulator Release builds passing. I inspected supplied test logs but did not independently rerun these suites. I independently ran the two synthetic Swift probes described below. They extract exact production method bodies and use explicit synthetic carriers/dependencies; they are not full Store, network or device tests. No live provider, UI, install or shared source action occurred.

## Required corrections

### P1 — Carry and validate authenticated ownership through dispatch, observation and Stop

`PeerBridge.swift:649-650` queues a bare envelope; `RivuneStore.swift:774-777` adds another async hop. Neither carries the authenticated principal/connection generation that received the frame. At `RivuneStore.swift:932,985`, the request uses whichever principal is current later and merely tests that a generation exists. An old queued request can therefore be admitted under a successor connection after re-pairing. Pending outbound observations also contain only request fingerprint, not an owner/generation.

Separately, `RivuneStore.swift:1122-1130` allows Stop whenever *any* principal exists. The journal's Stop lookup compares request ID/fingerprint but does not compare the authenticated principal with the owner route in the admitted identity. Knowing the old request is sufficient for a successor authenticated phone to cancel it. Request fingerprint is not an authorization token.

**Independent reproduction:** `ForeignStopProbe.swift` includes the unmodified candidate journal and exact `handleRemoteStop` body. It admits an identity owned by phone-A, then calls Stop through a host authenticated as phone-B using the original fingerprint. The journal becomes `stopRequested` and the fake coordinator receives one cancellation. The probe exits 0 with this confirmation.

Carry a host-produced peer context with each decoded envelope, revalidate it at the main-actor consumer, and bind every observation/Stop/result send to its owner. Add actual bridge/Store tests for queued old envelopes, revoke/re-pair, foreign Stop and late result publication. The existing different-principal *admission* test does not cover these cases.

### P1 — Phone navigation still cancels Mac work

`RivuneStore.swift:1477,1500` calls `cancelGeneration()` from iOS New Chat and conversation selection. That method now sends a remote Stop at `1905-1916`. Thus merely opening another conversation cancels a task, contrary to the required detach behavior. Navigation then clears activeRequestID, but leaves the persisted pending request/activeBridgeRequest inconsistent with the selected conversation.

Separate navigation observation state from task ownership. New Chat and selection must detach, preserve resumable pending task identity, and send no Stop. Only the explicit Stop action should request cancellation. Test navigate away/back while work continues, a second conversation, relaunch and reconnect.

### P2 — Stop racing completion can strand the iPhone, and local cancellation is mislabeled as confirmed provider termination

`RivuneStore.swift:1131-1132` answers an already-terminal Stop with only a `stopUpdate` notice. iOS handles that notice at `861-865` without finishing or resolving the active request, while `cancelGeneration` has cancelled its watchdog. If completion won but its promptUpdate was lost, the phone remains generating without receiving the completed replay. Interrupted/restarted requests have the same unresolved Stop path.

The successful cancellation path also announces “Request stopped” immediately after `RivuneRunCoordinator.cancel` persists a local cancellation decision. That method cancels the Swift task and discards its handle before waiting for provider/process termination (`RivuneRunCoordinator.swift:391-406`). `stopGenerating` additionally displays “Request stopped” even when the transport send fails.

Replay the verified terminal snapshot when completion wins; map interrupted/failed/cancelled states explicitly; retain a retryable pending Stop if offline. Distinguish requested/local cancellation from confirmed provider termination and keep cleanup ownership until termination resolves. Cover completion-lost/Stop, offline Stop, repeated Stop and late provider completion with actual client state assertions.

### P2 — Saved result digest does not bind the result

`RivuneRunCoordinator.swift:177-190` hashes only run/conversation/request/turn IDs, status, stage and revision. It omits ChatTurn answers, errors, attachments and result artifacts. `resolve` therefore accepts a changed answer with the old “result” digest if those metadata fields remain unchanged.

**Independent reproduction:** `ResultDigestProbe.swift` executes the exact extracted production `terminalReferenceData` method with two synthetic runs differing only in answer text. Their SHA-256 digests are identical. The probe exits 0 confirming this behavior.

Compute a canonical digest of the persisted result payload (including identity and revision), then verify that full payload on replay. Add a real coordinator reload test that changes saved answer/artifact bytes while retaining metadata and requires replay rejection.

### P2 — Pending phone persistence is best-effort although dispatch promises recovery

`RivuneStore.swift:1345-1351` silently ignores encode/directory/write errors, then the send path at `1804-1807` dispatches anyway. A phone storage fault can therefore leave real Mac work with no recoverable request ID after iPhone termination. Restore also silently ignores corrupt/oversized pending files. Current nine focused tests contain no iOS persistence or navigation coverage.

Make pending request persistence report success/failure and durably bind the request to its paired Mac before the first send. Preserve a recovery state when clearing the file fails, and apply consistent payload limits to admission/persistence/restore. Inject phone storage failure and relaunch in tests; require zero first dispatch when the request cannot be saved.

## Positive findings and scope

Fresh admission journals before coordinator dispatch, request identities include a derived principal/conversation route, coordinator updates now have a distinct durable callback, revision increments check overflow, consumed-ID lookup covers tombstones, and disconnect detaches observations without intentionally cancelling work. These are useful improvements. They do not resolve the findings above. The known tombstone cases and isolated v4 need not be rewritten unnecessarily.

This is a review verdict for candidate 1 only. It creates no new approval requirement for otherwise authorized local integration/review installs. Supply a new immutable candidate after corrections; keep original candidate evidence. Physical iPhone behavior, live provider termination and rendered QA remain unverified.
