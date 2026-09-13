# Host renderer integration — 2026-09-09

App now selects an explicit mode. A normal browser mounts the labelled demo. A desktop bridge or Tauri marker selects HostWorkspace; an incomplete bridge reports unavailable and never falls back to simulated history or responses. HostWorkspace uses the host controller, catalog and saved transcript only. The two modes do not share draft keys or answer generation.

The direct interface supports create/open, draft editing and saving, one send, exact-run cancellation, unresolved-request reconciliation, and conflict review. Local edits survive a rejected or uncertain save. Keeping the local draft checks the reviewed host revision, then prepares an explicit save; it neither saves nor submits automatically. An unresolved save must be retried with its existing mutation identity before rebasing. Provider choices remain managed defaults with unverified readiness shown honestly.

Settings events open the mounted dialog. Shutdown subscribes before hydration, freezes controller edits and new admission, captures dirty drafts, begins the exact shutdown token, verifies every flush receipt, then completes. A failed flush keeps text and blocks completion; explicit Stay in workspace aborts that token before resuming. New text remains protected even across receipt acknowledgement. An in-flight draft save cannot later submit after shutdown freezes admission.

Validation:

- 68 Node tests pass: contracts, adapters, controller, lifecycle, setup and demo draft store.
- 10 mounted browser scenarios pass at `/tests/hostRenderer.html`: create/reopen; save/single send/cancel; uncertain admission; remount reconciliation; native settings event; dirty shutdown; failed shutdown/abort; conflict retention; actual App demo send with absent bridge; partial-bridge unavailable without demo fallback.
- TypeScript and Vite build pass. Final bundle: `index-CY7DuPBS.js` and `index-ByjCX_Dh.css`.
- Rendered the long-answer fixture at the normal viewport and confirmed the existing browser demo still shows its local simulation labels. Compact host layout is implemented but a viewport override did not take effect during this pass, so no new mobile-render verification is claimed.

Tests use a fake bridge and private in-memory storage in a dedicated test document. No actual desktop, provider, real session-storage, installer or paid execution was exercised. Browser remount recovery is verified; full process-restart durability is not. The recovery journal currently uses session storage, so process-restart uncertainty must be resolved before claiming crash-safe admission across application launches.

Smallest remaining desktop gate: in an isolated fixture-only shell/profile, load the existing desktop bridge before this renderer and run one packaged journey: hydrate saved history, create/open and persist a draft, submit exactly once, receive a durable answer, cancel an active fixture run, reload/reconcile an uncertain request, open Settings through the native event, then quit/reopen with a saved draft. Inject one failed flush and confirm no completion until explicit abort/recovery. Audit process-restart pending-identity persistence as part of this gate. Use no real provider executable or existing user profile.

The existing Tauri `frontendDist` remains `../web`; no repoint, native build, launch, install or real provider call occurred. The next gate requires separately authorized fixture desktop execution. Startup delivery of a pending quit token before hydration safely blocks closing; the current recovery is Stay in workspace, then retry quitting. Independent adapter audit remains a separate review.
