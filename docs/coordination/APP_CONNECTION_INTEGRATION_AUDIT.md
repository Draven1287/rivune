# Rivune app connection integration audit

Date: 2026-09-09  
Scope: read-only audit of the new React workspace against the existing Tauri host  
Decision: **do not replace the host contract; connect the new UI to it in two bounded slices.**

## Outcome

The new React workspace is visually useful but is not yet an AI-connected Rivune app. `App.tsx` always constructs `useWorkspaceDemo()` and sends every message to `sendDemoMessage`; that hook creates a local UUID, advances local timers, appends canned chunks, and marks demo agents complete. The only desktop integration in the new frontend is a strict, read-only setup projection for provider discovery/catalog/snapshot.

The Tauri candidate already exposes the durable conversation and run lifecycle needed for a real first connection. The safest path is therefore:

1. connect one direct provider using provider-managed defaults;
2. prove identity-safe submit, uncertain-outcome reconciliation, event handling, cancellation, restart recovery, and final durable rendering;
3. only then add Constellation team selection, member milestones, cross-review, resolution, and failed-member retry.

Do not advertise explicit GPT-6/model/effort selection yet. The current host catalog does not supply discovered model IDs or verified authentication/response-test state, and the host rejects explicit choices whose capabilities are unknown.

## What exists now

### New React frontend

| Area | Current behavior | Evidence | Assessment |
|---|---|---|---|
| App composition | Always uses the demo hook | `prototypes/ai-native-workspace/src/App.tsx:12-14` | Blocking for live chat |
| Send/stop | Routes to `sendDemoMessage` / `stopDemoStream` | `prototypes/ai-native-workspace/src/App.tsx:34-38` | Synthetic only |
| Demo execution | Uses browser timers and canned chunks | `prototypes/ai-native-workspace/src/hooks/useWorkspaceDemo.ts:221-277` | Must be an explicit preview fallback, never presented as live |
| Setup | Strictly parses discovery, catalog, and a small snapshot projection | `prototypes/ai-native-workspace/src/hooks/workspaceAdapter.ts:54-120` | Good fail-closed foundation |
| Setup bridge | Requires only `discoverProviders`, `getModelCatalog`, and `getSnapshot` | `prototypes/ai-native-workspace/src/hooks/workspaceAdapter.ts:157-185` | Read-only; cannot configure or run |
| Constellation setup | Always returns `unavailable` | `prototypes/ai-native-workspace/src/hooks/workspaceAdapter.ts:169-182` | Incorrect once connected to a capable host |
| User-facing honesty | Header says `Design preview · no AI connected` | `prototypes/ai-native-workspace/src/App.tsx:28-32` | Correct for browser preview; must become state-driven in desktop |

### Existing Tauri host

The bridge already maps the relevant commands and events in `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/desktop-host.mjs:1-47`:

- snapshot and catalog: `getSnapshot`, `getModelCatalog`, `refreshModelCatalog`;
- provider setup: `discoverProviders`, `configureProvider`;
- conversation/draft: `createConversation`, `openConversation`, `saveRichDraft`;
- execution: `submitRun`, `reconcileRun`, `cancelRun`, `retryRun`, `retryConstellationInvocation`;
- events: `onRunEvent` for `rivune://run-event`;
- shutdown: begin, flush, complete, abort, and `rivune://prepare-shutdown`.

The commands are registered in `candidate4-runtime-r2/src-tauri/src/main.rs:337-369`. Core DTOs and lifecycle entry points are in `candidate4-runtime-r2/src-tauri/src/host.rs`:

- team and provider configuration: lines 106 and 184;
- model catalog and runtime capabilities: lines 250 and 258;
- durable run and run-event records: lines 299 and 312;
- submit request and acknowledgement: lines 581 and 767;
- public snapshot: line 3444;
- provider discovery/catalog: lines 3639, 3676, and 3685;
- admission validation: line 4535;
- submit/reconcile/cancel/retry: lines 5172-5256.

The old renderer also contains the correct submission safety pattern and should be adapted rather than re-invented: feature detection in `web/core.mjs:72-103`, strict acknowledgement parsing in `web/core.mjs:106-116`, and single-submit/uncertain-reconcile behavior in `web/core.mjs:126-177`.

## Severity-ranked integration gaps

### P0 — Chat does not call the desktop host

Every apparent response, agent status, and artifact association comes from the demo hook. No provider process or Tauri command participates.

**Required correction:** introduce a host-backed workspace controller and select it only after strict bridge feature detection. Retain demo mode only behind an explicit preview fixture state.

### P0 — No idempotent submission or uncertain-outcome recovery

A renderer crash or invoke error can leave the UI unable to know whether a run was admitted. Blind resend risks duplicate provider usage and duplicate conversation output.

**Required correction:** generate one stable request UUID, call `submitRun` once, validate the acknowledgement identity/state, and preserve an unresolved request until `reconcileRun(requestID)` returns accepted or rejected. Never automatically resubmit an uncertain request.

### P0 — No durable run/event projection

The React types and hook do not parse the full snapshot, run records, or `rivune://run-event`. Local timers currently stand in for all execution state.

**Required correction:** validate event schema, request/conversation identity, and monotonic sequence; use events for timely stage updates and refresh `getSnapshot` for authoritative status, final text, member results, and restart recovery. An event is a notification, not the only record.

### P1 — Provider presence is being confused with readiness

The host currently reports authentication as `unknown`, response test as `notTested`, catalog state as `unknown`, and an empty model list. Executable discovery proves a route exists; it does not prove sign-in or a successful response.

**Required correction:** show separate Installed, Sign-in, Test, and Capability states. Allow provider-managed default only where the host admits it. Disable explicit model/effort controls until runtime discovery supplies matching evidence.

### P1 — Constellation is not represented

The setup adapter discards runtime capability information and always reports Constellation unavailable. The chat has no team selection, lead, member/phase mapping, cross-review milestones, resolution, or exact member retry.

**Required correction:** add Constellation only after the direct path passes. Persist a valid `TeamSelection`, project host events into restrained phase/member UI, and render durable member results plus the final resolved answer from the snapshot.

### P1 — Provider setup cannot write

The new connection UI can inspect routes but cannot call `configureProvider`; therefore a newly discovered CLI cannot be made a selected runnable provider from the new UI.

**Required correction:** add a separately validated configuration action. Preserve exact executable identity and never infer readiness from basename or logo.

### P2 — The visual language promises capabilities the host does not provide

The current Tauri host returns complete process results and milestone events; it does not provide reliable token deltas or create editable website/code artifacts. `RunEvent.textDelta` is not a promise of token streaming.

**Required correction:** label execution as stage progress. Render text results as conversation output. Keep editor/artifact creation disabled or clearly demonstrative until a separate artifact contract exists.

## Proposed React boundary

Keep host DTOs separate from the existing demo view models.

```text
globalThis.__RIVUNE_DESKTOP_HOST__
          |
          v
TauriWorkspaceAdapter  -- strict parsing / identity checks
          |
          v
HostWorkspaceController -- hydrate, draft CAS, submit gate, events, recovery
          |
          v
WorkspaceViewState       -- conversations, messages, members, phases, controls
          |
          v
Existing ChatPanel / Sidebar / TelemetryShelf
```

Do not widen existing demo types with optional host fields or cast unknown payloads directly. A corrupt or newer payload must fail closed with a recoverable message.

### Minimum adapter surface for slice 1

```ts
interface TauriWorkspaceAdapter {
  getSnapshot(): Promise<unknown>;
  getModelCatalog(): Promise<unknown>;
  createConversation(value: { id: string; title: string }): Promise<unknown>;
  openConversation(conversationID: string): Promise<unknown>;
  saveRichDraft(value: SaveRichDraftRequest): Promise<unknown>;
  submitRun(request: SubmitRunRequest): Promise<unknown>;
  reconcileRun(requestID: string): Promise<unknown>;
  cancelRun(requestID: string): Promise<unknown>;
  onRunEvent(handler: (value: unknown) => void): Promise<() => void>;
}
```

Optional methods should remain feature-detected: configure/discover, refresh catalog, direct retry, Constellation retry, attachment selection/approval, projects/search, import/export, and shutdown.

## Direct-run state machine

```text
unconnected -> hydrating -> ready -> saving draft -> submitting
                                      |               |
                                      v               +-> rejected -> ready + error
                                  save failed          +-> uncertain -> reconciling
                                                              |          |
                                                              |          +-> rejected
                                                              |          +-> accepted
                                                              v
accepted -> queued/running <- validated events -> succeeded | failed | cancelled
                       \---------------- snapshot refresh ----------------/
```

Rules:

1. Create/open a real conversation before saving or running.
2. Save selection, optional team, attachments, and prompt with the host rich-draft compare-and-swap revision.
3. Bind the run to that exact rich-draft revision.
4. One click creates one request ID and at most one `submitRun` call.
5. `uncertain` disables another send for that request until reconciliation.
6. Stop calls `cancelRun` with the exact active request ID; it is not a local animation stop.
7. After any terminal event, rehydrate the snapshot and render its durable run result.
8. On reload, rehydrate first; do not reconstruct truth from session storage or old browser timers.

## Constellation slice

Enable only after the direct-run gate is proven.

- Build a team of 2–6 unique route/model/effort tuples.
- Require a valid lead index and ensure the lead member equals the selected integrator.
- Freeze prompt, context, team, and request identity at admission.
- Show one compact progress rail: Plan, Assign, Work, Challenge, Resolve.
- Keep member activity secondary and inspectable; the resolved answer is primary.
- Map `memberID`, `providerID`, `role`, phase, state, and sequence from validated run events.
- Show cross-review as evidence-backed milestones, not decorative “agents arguing” animation.
- On partial failure, offer only the host-provided exact failed-invocation retry. Do not rerun successful members.
- Recover the persisted Constellation checkpoint and final/member results from the snapshot after restart.

## Implementation order

### Slice 1 — Honest direct chat

1. Add strict full snapshot, acknowledgement, and run-event parsers with fixture tests.
2. Add `TauriWorkspaceAdapter` feature detection without changing `createSetupAdapter` semantics.
3. Add host controller hydration and real conversation selection/creation.
4. Add rich-draft save and direct provider-managed-default selection.
5. Add the one-submit gate, uncertainty reconciliation, event subscription, durable refresh, cancel, and restart recovery.
6. Drive `ChatPanel` from the host controller; retain demo hook only for an explicit browser preview.
7. Replace the fixed header label with one of: Preview, Connecting, Ready, Needs sign-in, Running, Recovering, or Unavailable.

### Slice 2 — Constellation

1. Parse runtime capabilities and durable Constellation state from the snapshot.
2. Add a team editor using only catalog-supported route/default combinations.
3. Persist `TeamSelection` through `saveRichDraft`.
4. Render phase/member activity from events and final/member results from the durable snapshot.
5. Add exact failed-invocation retry and cancellation/restart tests.

### Later, separate capabilities

- real model/effort discovery and entitlement-aware choices;
- provider response tests and authenticated-state evidence;
- API/custom provider execution;
- typed artifact/file-output contract and workspace editing;
- true token streaming, only if host/provider contracts deliver ordered deltas.

## Acceptance gates

### Slice 1 is acceptable only when

- [ ] Browser preview is visibly labeled and makes zero host/provider claims.
- [ ] Desktop mode fails closed if required bridge methods or payload fields are missing.
- [ ] One send produces exactly one `submit_run` call with a stable request ID.
- [ ] Accepted, rejected, thrown/uncertain, and reconciled outcomes have deterministic tests.
- [ ] A second click cannot duplicate an unresolved request.
- [ ] Out-of-order, duplicate, wrong-request, and wrong-conversation events are ignored or force a safe snapshot refresh.
- [ ] Stop uses the exact request ID and the durable terminal status is rendered after refresh.
- [ ] Reload during queued/running/uncertain states recovers from the host snapshot without replaying the prompt.
- [ ] Installed, authenticated, response-tested, and model-capability states are shown independently.
- [ ] Explicit model/effort selection is unavailable while catalog evidence is unknown.
- [ ] Final assistant text comes from the durable host run, not canned chunks.
- [ ] A packaged Tauri build—not the browser Vite preview—passes the end-to-end test with a fixture provider before any live provider test.

### Slice 2 is acceptable only when

- [ ] Constellation requires two independently executable routes and never claims verified sign-in without evidence.
- [ ] Team/lead validation matches host admission rules.
- [ ] Plan, member work, cross-review, resolve, and final output remain understandable at narrow and wide layouts.
- [ ] The final answer is primary; member contributions and challenges are inspectable but not cluttering the transcript.
- [ ] Cancellation, partial failure, exact member retry, app restart, and completed-run recovery are deterministic tests.
- [ ] Successful members are not recharged/re-run during failed-invocation retry.

## Builder handoff

Implement **Slice 1 only** first. Reuse the bridge names in `web/desktop-host.mjs` and port the acknowledgement/submission gate semantics from `web/core.mjs`. Do not add GPT-6 or any model name as a static option. Do not connect Constellation UI until the direct path proves single-submit identity, uncertain reconciliation, durable events/snapshot recovery, cancellation, and fixture-backed packaged Tauri execution.

## Post-slice source audit — 2026-09-09

The direct host slice is now mounted conditionally in source, not merely proposed. This re-audit inspected the following snapshot:

- `src/host/contracts.ts` SHA-256 `8987d67a78ef7ea273050245f22514519d559d731b870b0a98a4a60d1d48fdd8`
- `src/host/tauriAdapter.ts` SHA-256 `a3fa63ded2948e99496f4c76b4d0978fb845824a25b42fad03b25288bda598fb`
- `src/host/workspaceController.ts` SHA-256 `ded7842d13bfe5a066c83b7654952fc47e9fed084b76c3b8592c946877bfe7dd`
- `tests/hostController.test.mjs` SHA-256 `7d2489b7974b8dd757fcdafb714709b41707a41232b39d2eecf835895b2ca792`

Source was changing under an authorized recovery addition while this audit ran; these hashes bound the reviewed evidence. No source was merged or modified by the auditor.

### Confirmed improvements

- `App.tsx:13-16` now selects `HostWorkspace` when a desktop surface is detected and otherwise keeps the browser demo separate.
- `contracts.ts:59-168` strictly validates the snapshot, acknowledgement, and event shapes. Invalid acknowledgement identity becomes uncertain rather than accepted.
- `workspaceController.ts:130-153` binds saves to a rich-draft revision and mutation identity, preserves uncertain saves for exact retry, and verifies the durable snapshot before admission.
- `workspaceController.ts:238-259` reserves request identity before calling the host and prevents a second send while unresolved.
- `durableRecovery.ts:24-47` now uses host-owned recovery operations instead of browser storage for desktop mode.
- Native `recovery_admission_guard` at `candidate4-runtime-r2/src-tauri/src/host.rs:4719-4726` closes delayed-dispatch-after-clear races by requiring the exact persisted reservation.
- Mocked contract/controller/adapter tests passed: 38/38 in the audited invocation. This includes wrong acknowledgement identity, uncertain reconciliation, draft conflict, shutdown, event ordering, and duplicate-click coverage.

### P0 — Stop is blocked for the full duration of a real provider call

This is the remaining concrete lifecycle mismatch.

The native `submit_reserved_run` awaits `dispatch_submission`, which awaits `spawn_blocking`, which does not return until `execute_with_recovery_guard` finishes the provider process (`host.rs:5380-5407`). The controller wraps that entire promise in its single global `action` lock (`workspaceController.ts:103-115`, `238-260`). Its `cancel` method uses the same action lock (`262-271`), so cancellation is rejected while submission is still awaiting the terminal acknowledgement.

The mounted UI adds a second block: `HostWorkspace.tsx:20`, `59-65` keeps `working` true while `send` awaits, `HostWorkspace.tsx:55-57` treats submission as locked, and the Cancel button at `HostWorkspace.tsx:83` is disabled when locked. Direct execution also has no durable admitted/terminal `rivune://run-event` emission comparable to the Constellation path, so the controller has no event-driven opportunity to expose the active run while the submit promise is pending.

Observed consequences:

1. a long direct CLI request remains visibly `submitting`, not `running`;
2. the persisted run may already be active and cancellable in Rust, but the React controller and button cannot invoke cancellation;
3. the existing cancellation test uses an immediately resolved mocked `submitRun`, so it does not cover the real host command lifetime.

Isolated reproduction: `qa-artifacts/direct-host-source-audit-20260909/cancel-during-submit-reproduction.test.mjs`. It holds `submitRun` open after inserting a durable running record and confirms that `controller.cancel(requestID)` fails with `Workspace action unavailable` while phase remains `submitting`. Result: 1/1 reproduction test passed.

### Identity and duplicate-dispatch conclusion

No duplicate-dispatch path was found in the reviewed reserved-admission implementation. The host-owned reservation, exact request/conversation guard, persisted run ID binding, uncertain reconciliation, and clear fence form a coherent single-dispatch boundary. The recovery record intentionally contains only request and conversation identity; prompt and draft-revision binding are revalidated by `prepare_submission` before execution. The remaining blocker is cancellation/progress concurrency, not a demonstrated duplicate send.

### One actionable correction

Make durable admission and long-running execution separate observable phases. The preferred host contract is:

1. `submit_reserved_run` validates the exact reservation and rich-draft revision;
2. it durably creates the run and cancellation registration;
3. it emits a durable `admitted` event and returns `accepted` immediately;
4. provider execution continues in a managed background task;
5. terminal persistence emits `finalCompleted`, `failed`, or `cancelled`;
6. the React controller clears the reservation after the accepted run is visible, releases its submission lock, polls/subscribes for durable status, and permits `cancelRun(exactRequestID)` while the run is active.

If the host cannot yet return at admission, the temporary UI/controller fallback must use a cancellation lane independent of the general action lock, repeatedly hydrate until the exact pending run becomes durable, and only then enable exact-ID cancel. It must not treat a pre-admission cancellation rejection as proof that no dispatch can later occur.

Add one integration test whose submit promise remains pending: wait until the host snapshot contains the exact running request, invoke Cancel before submit resolves, verify exactly one submit and one cancel, observe durable `cancelled`, and confirm restart reconciliation does not replay the prompt. This gate must pass against the actual command lifetime, not only an immediate-ack mock.

## Verification boundary

This audit did not edit application source, build or launch either frontend, execute a provider, start a server, or claim live integration. It updated this audit and added one isolated mocked reproduction only.

## Recovery and cancellation correction recheck — 2026-09-09

The P0 above was valid for the earlier frozen controller hash, but it is no longer present in the current source snapshot. The historical reproduction is intentionally preserved; against the corrected controller it now fails at its old expectation because cancellation is no longer rejected by the global action lock.

Current reviewed hashes:

- `src/host/workspaceController.ts` SHA-256 `35a219d757cac760585ed29164228db5ed2353e8d2a30f46d3652d20b00c5dc1`
- `src/host/HostWorkspace.tsx` SHA-256 `95bc739413fd399220fb4b91e34bf8ab6c38f21582da327ee2eedd3045072f55`
- `src/host/durableRecovery.ts` SHA-256 `178891c661a937c667604bcdf45ece6f6a901139dde62d07ab12fef29353eb29`
- `tests/cancelDuringSubmit.test.mjs` SHA-256 `f4934cdee15adbb7a37d718e65593e85c6d61838db1311edfaa43ca1c075ab10`
- native `src-tauri/src/host.rs` candidate SHA-256 `979c2f83d924b1ce5e912bac5b7be88f28d81e97625b015fe808bf79dc200c43`
- durable recovery receipt SHA-256 `0f24e23bff18cd4721ec5849f70832bceffc4b474ea95068b5892de3c0cf1b84`

### Cancellation correction confirmed at the controller/UI source level

- `workspaceController.ts:60-61,274-293` gives cancellation a separate exact-request lane with its own duplicate-click latch. The original submission promise and general admission lock remain intact; cancellation does not abandon or replay submission.
- `workspaceController.ts:64-90` polls while a recovery identity or active durable run exists. An eventless admission can therefore become visible while the original submit promise remains pending, and polling resumes after transient snapshot or catalog failures.
- Cancellation is rejected before the exact request is present as an active durable run, for a mismatched unresolved identity, for non-accepted/wrong-identity acknowledgements, and while another cancellation is in flight.
- `HostWorkspace.tsx:68-73,93,97` uses an independent cancellation handler and keeps the Cancel button available for a visible queued/running run even while the Send handler remains `working`. Reconcile remains unavailable during the unresolved submit wait, so it cannot race the original submission.
- Late accepted, rejected, or thrown submit completion refreshes durable state and does not overwrite a saved `cancelled` result. Restart tests confirm the prompt is not replayed.

The full frontend host test invocation passed **87/87**. The focused cancellation suite covers six long-submit/cancel cases plus two transient polling-recovery cases. This is stronger than the original immediate-ack mock because the submit promise stays pending through durable admission and cancellation.

### Durable recovery source review

No additional source-level duplicate-dispatch, deadlock, or clear-loss blocker was found in the frozen native candidate:

- the recovery record is schema-bound to exact request and conversation identities and is validated both when the store opens and when the record is read;
- reservation, reconcile, and clear mutations follow the lifecycle-then-workspace lock order; the preliminary workspace-only check in clear is released before reconcile or mutation reacquires locks;
- persistence writes and syncs a pending file, renames it, then syncs the containing directory; post-rename errors are marked committed and retain the candidate in memory;
- reconcile without a matching run durably rejects the reservation, which fences delayed execution admission;
- clear revalidates the exact identity and authoritative terminal/rejected state under mutation locks before atomically persisting removal;
- malformed or cross-bound recovery state fails closed instead of silently becoming an empty store.

The native recovery tests in `src-tauri/src/host.rs` remain **source-only and uncompiled/unrun in this audit**. They describe restart survival, delayed-dispatch fencing, exact clear, post-write/sync/rename faults, clear atomicity, and corrupt-state rejection, but they are not native proof.

### Updated gate and one next handoff

The direct slice is now acceptable at the TypeScript/controller source-test level. The remaining gate is not another architecture rewrite: compile and run the native Rust recovery tests, then perform a fixture-only packaged process-kill/reopen test across reserve, admission, terminal persistence, and clear, including a genuinely long-running exact-ID cancellation. Use a fresh temporary profile and no real provider account. Until that passes, do not describe restart durability, packaged cancellation, or installer readiness as verified.

This recheck did not edit application source, compile or launch native code, execute a provider, start a server, or operate the desktop UI.

## Independent packaged-receipt review — 2026-09-09

The builder subsequently executed the authorized isolated fixture run and froze `docs/coordination/DIRECT_HOST_NATIVE_RECEIPT_20260909.md`. Independent review inspected its bound source, build manifests, machine-readable lifecycle evidence, and corrected corrupt-startup path; the reviewer did not build, launch, or modify application source.

### Accepted evidence

- Native library/lifecycle regression passed 117/117 after correcting a test-only fixture identity; focused recovery passed 8/8.
- Eight subprocess reserve/clear fault cases passed across write, file-sync, rename, and directory-sync boundaries. This is process-exit/reopen evidence, not power-loss proof.
- Packaged fixture evidence covers orphan reservation kill/reopen/reject/clear with zero starts; admitted-run kill/reopen without replay; mounted long-submit cancellation with one submit and one cancel; terminal answer recovery; a duplicate-cancel race; draft conflict review/rebase; and clean exit.
- The first corrupt-profile launch preserved bytes but aborted. The superseding binary SHA-256 `0fc03958dab48b918623b9a0e89a305f8b5084ff7945d44049ad7030d77c163b` opened a bounded recovery screen for the tested unsupported recovery record, mounted no composer/controller, left every copied profile hash and the fixture log unchanged, and exited through the explicit recovery action.
- The corrected startup path exposes only an immutable `recoveryRequired` boolean. On load failure it manages no `HostState`; loader errors, paths, and saved bytes never enter the renderer. React waits for startup status before mounting the controller/lifecycle and ignores a stale async completion after unmount.
- `exit_recovery_workspace` checks the native startup status and refuses normal mode. Normal workspaces therefore retain the durable draft shutdown handshake; the recovery-only close path is not a general shutdown bypass.

### Still incomplete

- N5 dirty-draft flush failure, explicit abort/stay-open behavior, and reopen preservation were not executed because approval was withheld. Clean exit is not a substitute.
- The packaged N4 mismatched-unresolved identity variant and a post-N4 restart were not run.
- Tray-origin Settings was not independently exercised.
- N7 did not add production packaged fault hooks and makes no power-loss claim.
- N6 exercised one unsupported recovery-record variant, not every corrupt, unreadable, or unavailable-storage class.
- Real provider installation/authentication/response, Constellation execution, installer/signing/notarization/update behavior, and installed-app replacement remain unverified.

Verdict: the direct host is **native fixture-proven for the listed scenarios but not fully fixture-ready under the acceptance matrix**. Do not advance provider, installer, or installed-app readiness claims from this receipt.
