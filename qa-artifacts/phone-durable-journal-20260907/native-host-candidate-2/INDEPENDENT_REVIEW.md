# Independent native phone host candidate 2 review

**REJECT.** Candidate 2 fixes several candidate 1 issues, but peer-bound transport sends and terminal replay remain incomplete. Root additionally reproduced missing original-Mac binding for pending phone operations; see ROOT_REVIEW.md. Candidate 1 and candidate 2 evidence remain preserved. No shared source or installed app was changed.

## Exact reconstruction and verification

Reconstructed all seven changed source files by applying candidate 2's frozen patch to accepted 0623. Every reconstructed hash exactly matches MANIFEST.txt; see `independent-evidence/frozen-hashes.json`. The owner's mutable staging directory was not used as review authority. Root independently verified patch/manifest/handoff and all source/log hashes. Owner-reported 337 native tests and builds were not independently rerun after the concrete rejection findings below.

Independently executed three Swift probe files containing exact source-extracted methods with bounded synthetic dependencies; the Stop probe also includes the unmodified production journal. They exercise specific source seams, not physical iPhone/native Network traffic or full Store/UI integration. No live provider, network, personal project or installation action occurred.

## P1 — Authorization check and transport selection are not atomic

`PeerBridge.swift:756-757` checks asynchronously published main-thread authenticatedPrincipal/connectionGeneration. `RivuneStore.swift:1325-1329,1339-1342` checks that cached state and then calls an unbound `bridge.send`. `PeerBridge.swift:272` separately selects whichever queue-owned connection exists at that moment; send accepts no expected peer context.

When the bridge queue switches from phone A to phone B while publication of B's identity is waiting on the main thread, the old cached A context still passes isCurrent, but send selects B. The same window exists between a check and connection selection. Thus a result or Stop acknowledgement intended for A can be sent over B's authenticated transport. Capturing the context at decode is useful, but checking a stale UI-published copy does not establish ownership at execution/send.

**Reproduction:** `independent-evidence/CheckSendProbe.swift` executes the exact isCurrent/send method bodies with a synthetic queue/connection. It sets the published state to A and queue-owned transport to B, representing the documented asynchronous publication window. isCurrent(A) returns true and B receives the send; both assertions pass and the process exits 0.

Required: use queue-owned identity for authoritative validation. A context-bound send must validate expected principal/generation and select the matching connection in one queue operation, then send only on that captured connection. A mismatch must not send, cancel or otherwise affect a successor connection. Validate queued inbound context against the same authoritative state before dispatch. Add deterministic switch/revoke tests at the check/send boundary, not only tests that directly replace the published test peer.

## P2 — Completed Stop replay bypasses the result digest; unavailable outcomes remain unresolved

`RivuneStore.swift:1219-1223` handles alreadyTerminal Stop by sending `remoteSnapshot` directly. Unlike completed duplicate admission, it does not resolve the journal's RemoteResultReference. A mutated saved result therefore fails the normal duplicate replay path yet is disclosed through Stop. If the saved run is unavailable, only a rejected Stop notice is sent; iPhone's rejected stopUpdate path does not settle its pending operation, so this terminal case can remain generating/waiting indefinitely.

**Reproduction:** `independent-evidence/StopProbe.swift` uses the exact candidate Stop method and real journal. It first confirms foreign-owner Stop is now rejected. It then completes a journal record with a verified reference, supplies a different synthetic coordinator snapshot, and issues authorized Stop. The divergent raw snapshot is sent without any reference resolution; assertions pass and exit 0.

Required: branch on durable journal terminal state, resolve completed references through the same verified path used for normal replay, and send an explicit terminal unavailable/interrupted result for retained-but-unresolvable outcomes without redispatch. Cover changed saved payload, completion frame lost then Stop, missing/deleted run, interrupted restart and repeated Stop with client pending-state assertions.

## Additional root P1 — Bind pending phone requests to their original Mac

Root's separate exact-branch probe confirms that pending request/Stop state lacks the original authenticated host identity and is resent whenever any Mac connection becomes ready. See `ROOT_REVIEW.md` and `root-evidence/ReconnectProbe.swift`. Pairing another Mac must not transfer or execute the unfinished request there. Persist and check the original host identity, and bind the eventual send atomically to its connection generation. Legacy unbound pending records must not automatically replay.

## Candidate 1 corrections verified

- Captured peer contexts and owner fields now exist; foreign-principal Stop is rejected by the exact-method probe. The remaining issue is authoritative/atomic transport ownership, not absence of those fields.
- New Chat/conversation selection no longer calls cancelGeneration on iPhone. Pending work is retained; selecting its conversation restores observation, and send prevents overwriting it with a second pending request.
- Initial request and Stop now require successful bounded pending-file persistence before sending. Original-host binding and end-to-end iOS recovery still need correction/testing.
- Phone Stop requests cancellation without immediately discarding the coordinator task; completion/cancellation is published from the task outcome path, and wording identifies the local Rivune task. This does not independently prove termination of a live provider process.
- `terminalReferenceData` now covers the full ChatTurn. `ResultDigestProbe.swift` replays the original extracted-method test and confirms altered answer bytes produce a different digest. The defect above is a bypass of that corrected resolver.

Candidate 3 should preserve these fixes and close the three actionable findings. Existing v4 journal acceptance is unchanged. This rejection is limited to candidate 2; it introduces no new user approval gate for otherwise authorized local work.
