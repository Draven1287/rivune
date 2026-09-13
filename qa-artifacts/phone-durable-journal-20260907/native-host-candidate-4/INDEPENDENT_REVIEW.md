# Independent native phone host candidate 4 review

**REJECT — one reproduced P2 remains in the Stop-before-admission flow.** The narrow candidate 3 offline-persistence defect is corrected, but a Stop for a request that never reached the Mac does not settle on iPhone. Candidate 3's separately accepted connection binding and terminal-result verification remain unchanged.

## Exact provenance and owner evidence

Verified all candidate, accepted0623 baseline, patch, handoff and evidence-log hashes in MANIFEST.txt. Strictly reconstructed all seven candidate files against the verified `/private/tmp/rivune-phone-descriptor-0623.bXGPu5` baseline at `/private/tmp/rivune-phone4-independent-drpbicqv`; reconstructed bytes equal the frozen `source/` files.

Patch SHA-256: `6c8858bfdc1c821998cbb42035237e7252baa7ac047b5d1311b4f0f8deb8769d`. Store SHA-256: `66aba2021e3993a510e5473b6c1e9de1b4be6cc3ade2a2106dae8c97273665cc`.

Rechecked every hash recorded by candidate 3's independent review: its seven source files, patch, handoff and five logs remain unchanged. Candidate 4 differs only in the Store's Stop-persistence/transport policy and two corresponding policy tests. The saved owner full-test summary reports 341 passed, zero failures and zero skips. Both hash-verified Release logs contain BUILD SUCCEEDED. These are verified owner records, not an independently repeated full native suite.

## Narrow correction confirmed

Executed exact extracted iOS cancelGeneration branch, reconnect branch and policy methods with synthetic transport/persistence dependencies. Seven scenarios pass:

1. Offline Stop before original dispatch persists against the original Mac; foreign reconnect sends nothing and original reconnect sends Stop only.
2. The same remains true after an original request was dispatched.
3. Stop while connected to another Mac remains queued for its original host.
4. A new connection generation of the same original Mac receives Stop after persistence.
5. Persistence failure neither transmits nor claims a saved Stop.
6. Legacy nil-host records fail closed without inventing ownership.
7. A send error retains the saved Stop and reconnect never falls back to the original request.

The new ordering moves watchdog cancellation after successful Stop persistence, avoiding losing the prior watchdog on save failure. The context-bound transport from candidate 3 is retained.

## P2 — Stop before Mac admission leaves iPhone permanently pending

Frozen Store lines 1227–1234 require an existing journal record whose owner route matches the peer before accepting Stop. If the original prompt never arrived, the record is absent; the Mac replies accepted:false without terminalState. The iOS handler at lines 910–929 clears activeBridgeRequest, pendingPhoneStopRequested and isGenerating only for an accepted update with a terminal state.

Deterministic combined reproduction:

1. Phone has durably saved a prompt for Mac A, but it was never delivered/admitted.
2. User presses Stop while offline. Candidate 4 correctly saves stopRequested=true.
3. Reconnect to A sends only Stop.
4. Execute the exact host Stop method against the complete real RemoteRequestJournal with no record for that request ID. It returns accepted:false, terminalState:nil and records no cancellation tombstone.
5. The source-extracted iOS accepted/terminal settlement gate cannot run, even with valid matching request and conversation context. The phone remains pending and generating. Repeated identical Stops receive the same rejection.
6. The existing send guard rejects new work while activeBridgeRequest is nonnil. Navigation only detaches; it does not clear the durable pending operation. Thus reconnect does not resolve this state.

The fixture deliberately asserts the observed failure, so its successful process exit is reproduction evidence, not acceptance. It uses the exact host method and unmodified real journal; the phone portion isolates the exact initial accepted/terminal gate, with remaining request/conversation matches assumed valid. No real transport or provider was used.

Required correction: define an authenticated original-owner/fingerprint-bound outcome for an unadmitted Stop that lets iPhone settle truthfully as not started/stopped, and ensure a delayed original request cannot subsequently launch. A durable scoped cancellation marker or equivalent admission rule should reject that later dispatch. Do not conflate an unknown request with another owner's existing record, waive fingerprint conflicts, invent a provider cancellation acknowledgment or automatically retry the original prompt. Add a full host/phone regression for Stop before first delivery, including late original request arrival and restart behavior appropriate to the chosen durable marker.

## Evidence and limits

`independent-evidence/` contains strict reconstruction/hash checks, candidate 3 preservation checks, the executable OfflineStopProbe.swift and UnadmittedStopProbe.swift, output logs and structured results. Both probes exited successfully under a temporary Swift module cache; no shared or frozen source was changed.

No native app build, UI interaction, live connection, provider call, credential, real project, installation or shared integration occurred. Candidate 4 remains isolated until this new completion defect is corrected and independently reviewed. Physical iPhone recovery and real provider execution remain separate acceptance gates.
