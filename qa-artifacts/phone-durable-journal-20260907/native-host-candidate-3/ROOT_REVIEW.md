# Root review — native host candidate 3

REJECT for integration pending the following reproduced P2. This is a focused review; other candidate3 changes have not received a complete independent acceptance here.

## P2: Stop pressed offline is discarded before durable persistence

In frozen RivuneStore.swift cancelGeneration, lines 2117–2123, a missing live peer context causes an early return before saving stopRequested. The durable request already records its original host. After Stop is pressed offline, reconnect to that host therefore sees stopRequested false and resends the original request. If the original request never arrived, this can start work after the user asked to stop it.

Executed root-evidence/OfflineStopProbe.swift, extracting the exact candidate cancellation and reconnect branches with synthetic dependencies. Assertions reproduced zero Stop persistence calls followed by an original request send on reconnect. Exit 0; output retained in root-evidence/offline-stop-probe.log. No network, provider, credentials, real project or UI operation occurred.

Persist Stop against the already-stored original host before requiring a live connection. Matching current peer context should gate transport only. Offline or different-host states must retain the queued Stop until the original host reconnects. Handle legacy records without a host explicitly without inventing an identity. Add coverage for offline Stop before original dispatch, after dispatch, and reconnect to a different host, preserving cancellation ownership and context-bound transport.

Preserve candidate3 and prepare a separate candidate4. No shared-source apply or install acceptance is granted by this review. The existing UI inspection limitation is separate from this reproduced source behavior.
