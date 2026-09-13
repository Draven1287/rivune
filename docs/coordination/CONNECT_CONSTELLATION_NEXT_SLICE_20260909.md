# Next slice: real connection boundary, then one complete conversation

Status: source-backed plan; no host launch, provider call or desktop build performed. Existing preview remains synthetic and sharp-glass/chat-first. APP_CONNECTION_INTEGRATION_AUDIT.md was not present at inspection; reconcile this plan with it when delivered.

## Smallest coherent implementation

Build a typed, asynchronous host adapter plus a connection-state view in the existing frontend. Default browser capability is unavailable: show “Desktop connection unavailable in browser preview,” retain explicitly separate demo behavior, and never manufacture provider rows or a connected state. Inject a mocked transport for contract tests; production transport uses the existing Tauri bridge. Do not change frontendDist yet.

First supported execution path: the existing Codex CLI adapter, with Claude as the other host-supported route. No new provider/API-key infrastructure. Existing discovery returns installed=true, authentication=unknown, tested=false (host.rs:3639); configuration acceptance is not authentication or an inference test. The current host has no established auth-verification command in this inspection. Show installed/configured/sign-in-unverified states separately. Reuse documented manual CLI sign-in guidance in desktop setup; never collect credentials in React or run paid verification calls. Under the current zero-cost constraint, live execution validation stays pending until a permitted provider path is established.

## Ordered behavior

1. **Read-only setup and host boundary.** Validate getSnapshot, discoverProviders and getModelCatalog responses. Provider selection comes from discovered/validated routes and catalog revision; persist selection through configureProvider/saveRichDraft, not browser fixture state. Reject stale catalogs or missing capability. Add no success-looking Connect button that only changes local state.
2. **Single AI conversation.** Separate preview session history from authoritative host history. Save revisioned rich draft with mutationID and expected revision, wait for receipt, submit unique request id/conversationID/prompt/mode/richDraftRevision. On uncertain acknowledgement call reconcileRun with the same request ID; never auto-submit a duplicate. Subscribe before submission, validate event request/conversation/sequence/eventID, deduplicate and refresh authoritative snapshots on gaps. Preserve partial output. Cancel remains cancelling until host terminal confirmation; event receipt alone cannot revive a cancelled run. Recover on reopen by snapshot/reconciliation, not replay.
3. **Constellation.** Enable only when runtimeCapabilities.constellation is available and catalog/capability receipts validate. Present Single AI / Constellation, choose lead from actual members, and save TeamSelection with leadIndex/members and each provider/model/effort/catalog revision. Council/Swarm stay internal strategies. Render real memberID/providerID/role phase events, independent contributions and the lead’s integrated result. Partial failure/retry targets the exact invocation; artifact links require verified host provenance. No timer-generated activity enters connected mode.

## Changes possible now versus later proof

Now: adapter contracts, runtime validators, reducer/projection and injected-transport tests; truthful unavailable browser setup; retain current layout and recovery. Meaningful tests: malformed discovery, stale revision, duplicate admission, out-of-order/cross-conversation events, cancel races, partial member failure, uncertain restart, artifact association and bridge absence.

Later desktop validation: retain existing shutdown prepare/begin/flush/complete/abort and Settings event handshake before repointing ../web to React; test isolated host profile, authentic provider readiness, first response/follow-up/cancel/reopen, actual lead/member failure and recovery, then lifecycle/tray. Desktop launch/build/install remains paused. Source tests are not runtime acceptance.

## Inspected contracts

All host paths below are under qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2:
- web/desktop-host.mjs: command/event and shutdown bridge.
- src-tauri/src/host.rs: ModelSelection:93, TeamSelection:106, ProviderDiscovery:194, RunEvent:312, WorkspaceSnapshot:381, SubmitRunRequest:581, acknowledgement:767, discovery:3639.
- web/core.mjs: activity validation:278; runtime capabilities:331; member results:339.
- src-tauri/src/team_strategy.rs: persisted dispatch, uncertain-recovery and verified-artifact requirements.
- src-tauri/tauri.conf.json: frontendDist remains ../web.
- Preview src/hooks/workspaceAdapter.ts currently only returns its argument; its synchronous WorkspaceAdapter type cannot represent IPC admissions/errors/reconciliation and must be superseded deliberately.
