# Independent native host candidate 3 review

**Overall REJECT remains in force because ROOT_REVIEW.md reproduces the offline Stop persistence defect.** The two changes independently examined here receive **bounded acceptance**: connection-bound outbound application messages and verified terminal-result handling for repeated Stop. No additional P1/P2 was reproduced in this review. This is not permission to integrate candidate 3.

## Exact provenance

Verified every source, base, patch, handoff and evidence-log hash listed in MANIFEST.txt. Strictly reconstructed all seven patch files against hash-verified accepted 0623 at `/private/tmp/rivune-phone-descriptor-0623.bXGPu5`. Each reconstructed byte sequence equals the frozen `source/` file. The independent reconstruction is `/private/tmp/rivune-phone3-independent-15ftu1q4`.

Relevant frozen source hashes:

- PeerBridge.swift: `c8f64ce82ddc5c532a5fb47bfc2671f99d60761c6ad38658bcf4dfffb2e70f50`.
- RivuneStore.swift: `1e24aff2f86cbcde5a860606511e2a556db1b7949d2f6e6d209d1dbee26b39ff`.
- RivuneRunCoordinator.swift: `55dae71af7d6798578a8a3c46a21e1a7e8305f2f41a193e594f3b1f8284624d3`.
- RemoteRequestJournal.swift: `57a2d4189b714e31cfe57a8317c92e4028213c888bd4cc09e5999fe4ee70787d`.
- Integration patch: `d3f105efcda387a922d02b42d14e5911af837b26baad74e97582dd007f6d73f2`.

`independent-evidence/reconstruction.json` records full comparisons. Frozen source was not changed. Owner's 339 native tests, 15 focused tests and builds are not independently rerun or represented as review acceptance here.

## Connection binding: corrected

At PeerBridge.swift lines 297–314, context-bound send validates principal and connection generation against queue-owned state while selecting the actual NWConnection object in the same queue transaction. The subsequent send is made on that captured object. It does not reselect a connection from mutable UI state. This guarantees selected-object binding in the examined function; it does not claim the entire network operation completes atomically with the validation.

The extracted exact send/isCurrent methods were executed with synthetic connection objects. Four scenarios passed:

1. Published UI still says A while authoritative queue state is B: stale A context is rejected; B receives no data and is not cancelled.
2. A send failure arrives after B replaced the connection: B is not cancelled and no stale error is published.
3. Same principal but obsolete generation is rejected before sending.
4. B replaces A after authorized selection but before the synthetic connection records the send: the captured A object receives the frame; B receives none.

Store's remote observations retain the request peer context; response and Stop wrappers use the bound send overload and treat peerChanged without disconnecting a successor. The incoming envelope handler revalidates context using queue-owned isCurrent. These checks close the prior published-state/check-then-unbound-send defect for the examined request/result paths.

## Repeated Stop and saved results: corrected

At RivuneStore.swift lines 1239–1260, completed journal state calls runCoordinator.resolve(reference:requestKey:) before preparing a result response. That resolver checks saved run identity/key, terminal status, exact durable revision and the full terminal digest. Failure returns an accepted Stop update with interrupted terminal state and does not disclose the unverified result. Already cancelled, failed and interrupted journal records also return explicit terminal status.

Executed the exact context-taking Stop method, exact resolver/digest methods and complete unmodified RemoteRequestJournal using synthetic bridge/coordinator storage dependencies. The probe verifies foreign-owner Stop cannot cancel the run; a valid completed result is returned; changed answer bytes with identical IDs/revision are rejected without disclosure; missing saved results and repeated missing-result Stop requests settle as interrupted without cancellation or dispatch. The full digest changes with answer content.

Commands used `swift -module-cache-path /private/tmp/rivune-phone3-module-cache` against `independent-evidence/CheckSendProbe.swift` and `StopProbe.swift`. Both exited successfully. Exact method/journal inclusion checks and execution logs are preserved in that directory.

## Remaining disposition and limits

Root's offline Stop defect is intentionally not reproduced again here. Its fix must persist Stop using the stored original host before requiring a live transport. Candidate 4 must retain these verified changes and receive its own exact-source checks.

The fixtures do not use Network.framework transport, live pairing, provider processes, credentials, personal projects or native UI. They establish bounded method/journal behavior, not physical iPhone recovery or full application execution. Runtime delivery, device reconnection and installed native UX remain separate acceptance work. No frozen/shared source, installation or integration was performed.
