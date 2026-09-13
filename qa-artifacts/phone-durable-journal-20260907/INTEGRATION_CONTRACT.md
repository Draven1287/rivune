# Durable phone request journal — integration contract

This candidate closes one bounded gap: a Mac restart or the old 32-entry cache eviction must not cause a repeated phone request to run a provider again.

## Host sequence

1. Finish existing semantic admission and calculate the current canonical SHA-256 request fingerprint.
2. Freeze `RemoteAcceptedIdentity` from the admitted request and exact advertised routes. Do not include prompt/history/document contents, credentials, outputs, or diagnostics.
3. Call `admit`. Dispatch only for `.dispatch`, which is returned only after the running reservation is atomically saved.
4. For `.reattach`, expose the saved state/revision without starting a provider. `interruptedUnknown` means the previous process may have dispatched; offer a new request ID if the user deliberately retries.
5. For `.replay`, load the referenced run from `RivuneRunCoordinator`, verify its revision/digest, then serialize the existing result. The phone journal does not store a second answer copy.
6. For `.expiredResult`, explain that the result detail was pruned but the request ID remains consumed. Never redispatch it.
7. For `.conflict`, return the existing explicit request-ID conflict with zero provider calls.

## Stop and observation

- Disconnect, navigation, conversation selection, and app view disappearance call `detachObservation`. That method is read-only and never cancels work.
- Only a user-originated Stop command calls `requestStop`. Send cancellation to the coordinator/provider only after `.cancelProvider` is durably committed. A cancellation acknowledgement then calls `confirmCancelled`.
- Closing the Mac app converts `running` and `stopRequested` to `interruptedUnknown` at the next load. It never silently resumes or redispatches.

## Storage and privacy

- Suggested location: the same Application Support directory and local protection boundary as `workspace-runs.json`, in a distinct `phone-request-journal.json` file.
- `RemoteResultReference` points to the workspace run; answer text and artifacts remain in the existing workspace journal.
- The schema cannot represent API keys, CLI sessions, prompt text, answer text, or raw diagnostics.
- Terminal records may be compacted to consumed-ID tombstones. Tombstones are never silently discarded; when both bounds are full, new admission fails with `journalFull`.
- A corrupt or oversized journal fails closed and is not overwritten. Recovery/export UI is future work.

## Native integration points

- `RivuneStore.handleRemoteRequest`: replace `remoteResultCache` and `remoteInFlightFingerprints` admission with this journal before `Task` creation.
- `RivuneStore.cacheAndSendRemoteUpdate`: persist a `RemoteResultReference` only after the `RivuneRunCoordinator` result is durable.
- `RivuneStore` bridge disconnect handler: detach the observer; do not cancel coordinator work.
- `BridgeEnvelope.cancel`: treat only this explicit command as Stop, persist it, then request coordinator cancellation and return an acknowledgement/revision.
- `RivuneRunCoordinator`: supply durable run ID, revision, and result digest for replay verification.

## Deliberately unsupported here

This is not physical-device proof, reconnect transport, background execution, remote result streaming, Council serialization, chunked artifact retrieval, relay/cellular operation, wake behavior, or signed distribution. The native owner must reconcile those separately.
