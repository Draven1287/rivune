# Root review of native phone candidate 2

Disposition: REJECT for integration pending original-host binding correction; independent reviewer covers remaining host findings separately. No source was applied or app installed.

Patch, MANIFEST.txt and HANDOFF.md hashes match the submitted values. All seven frozen source hashes match the manifest. Root did not independently rerun the reported 337-test suite.

## P1: pending iPhone operations can be replayed to a different paired Mac

Frozen RivuneStore.swift lines 932–935 persist only request and stopRequested. No original host/pairing identity is stored. The connection callback at lines 792–797 resends this pending request or Stop whenever the current bridge reports connected. PeerBridge.pair(using:) replaces the credential and reconnects; the subsequent ready path publishes a new principal and calls the same connected callback. The phone never compares that principal with the task's original host.

Scenario: a task begins on Mac A, the phone disconnects and pairs with Mac B while retaining the pending operation. The reconnect callback sends A's original request/context to B. If B supports the same requested route, its separate journal can admit this previously unseen request and execute it again. Pairing with B is not a request to transfer or restart the unfinished task on B. Stop can likewise be sent to the wrong host.

Executed root-evidence/ReconnectProbe.swift extracts the exact iOS pending-operation reconnect branch into a synthetic bridge fixture. Changing the fixture destination to mac-B causes original-run to be sent there. Both assertions pass and exit 0; see reconnect-probe.log. This proves the branch's missing identity check, not a physical iOS/network reproduction.

Required correction: persist a stable authenticated host/pairing identity with the pending request and Stop before any send. Reconnect can resend only to that same identity, binding the eventual send atomically to the current connection generation. Different/revoked pairing must retain the unresolved operation with a clear original-Mac status and never silently transfer it. Legacy pending records without trustworthy host identity must not be auto-replayed. Test restart+same host, different host, credential revocation/rotation and queued pairing changes using synthetic fixtures.

The rejected candidate remains frozen. This finding is separate from the independent reviewer's atomic check/send race and terminal replay integrity review.
