# Constellation frontend integration receipt — 2026-09-09

Scope: current React source, existing Rust contract inspection, and synthetic mounted bridge checks. No native build, real provider call, installed profile change, or cross-task evidence forwarding in this pass. This receipt supersedes neither earlier native evidence nor its pending approval boundaries.

## Completed

- Attached saved team contributions and resolution to their run's final answer. Every member answer identifies its admitted role and provider; historical model/effort attribution comes from the saved run. Provider-managed defaults remain explicitly unresolved.
- Distinguished terminal historical progress from live activity. Failed/cancelled runs preserve partial member answers and show when no final answer was saved; saved member errors remain visible.
- Synchronized pristine team forms with refreshed saved state. Dirty forms require explicit conflict resolution. Missing selected providers remain removable. Participant count, lead, and unavailable-capability guidance explain disabled controls; Review connections opens Settings.
- Preserved exact saved team/catalog/revision admission, uncertain-mutation retry identity, direct-mode switching, and restart projection. Added partial-failure/cancellation and refreshed-form fixtures.
- Fixed 320px team-control overflow. Settings receives modal focus and restores the opener after Escape or dismissal. Galaxy remains peripheral to the dark reading surface.

## Verification

- Production frontend build succeeded (Vite 8.0.13, 38 modules).
- 97 unit checks passed; 21 mounted mock checks passed; scoped diff whitespace check passed.
- CUA inspected 320×568, 390×844, and 1440×900. After the narrow-layout fix, 320px composer client/scroll widths were 273/273 and team disclosure 251/251. At 390px the document measured 390/390. Keyboard selection guidance and desktop result attribution were inspected. Settings Escape restored its opener. Browser viewport override was reset.
- Existing preview restored on port 4317. Populated synthetic review: `http://127.0.0.1:4317/tests/hostRenderer.html?preview=1&team=1`. Its visible mock badge distinguishes it from provider output. Direct preview remains available.
- Current logs, source/build hashes, and observation record: `qa-artifacts/constellation-host-integration-20260909/`. Prior 96/19 source evidence remains separately dated/scoped.

## Runtime contract findings and remaining gates

Current Rust admits 2–6 distinct saved routes with the lead matching draft selection. It presently supports provider-managed defaults, pins Council in team preparation, and exposes bounded saved activity/member answers/resolution. The frontend follows these fields and does not fabricate reviewed delivery or resolved models.

The product review's per-member explicit model choices, recorded lead appointment policy/reason, and requested/executed strategy are not implemented public runtime capabilities. They require a versioned native contract before the UI can offer them. Swarm remains unavailable in this version.

Native early Settings-event delivery, recovery-mode menu handling, and Dock reopen behavior remain separate native validation/implementation gates. Frontend focus handling is now source/mock verified. No dirty-draft shutdown test or previously blocked evidence forwarding was retried.

Smallest next packaged validation gate, after separate authorization: stage this exact React build with the preserved bridge and current Rust into a fresh synthetic two-route fixture host; save a two-member team and lead; admit one Council run; hold one member while another persists an answer; cancel the remaining work; restart and verify the same identity, retained partial contribution, absent final answer, and no replay. Record DTO and artifact hashes. This gate has not run and needs no real providers or dirty-draft shutdown test.

## Source-only Settings follow-up

The early Settings delivery finding reproduced in the original contract: `open_settings` emitted without retaining a request, while the bridge registered only when React mounted. Source now retains one coalescing atomic navigation hint outside HostState and registers `take_pending_settings_request`. The matching bridge subscribes before consuming the hint, validates the boolean response, retains an in-flight hint across renderer unmount, rejects duplicate receivers, and cleans up failed registrations. This is a navigation hint, not durable workspace data; a lost transport response is not a durable-delivery guarantee.

Five fake-Tauri bridge cases passed: activation before delayed registration; duplicate event hints; consumption during replacement mount; retention between mounts without replay; rejected and duplicate subscriptions (the latter two covered in separate cases). The full unit suite now passes **102/102**, with zero skipped. Two additional clean mounted Settings cases cover sidebar cancellation/focus and subscription cleanup/remount/idempotence; the mounted suite passes **23/23**. Production frontend build and bridge JavaScript syntax checks passed. Current follow-up logs and hashes use the `settings-` prefix in the same artifact directory so the earlier 97/21 record stays intact.

CUA verified the existing populated fixture after all 23 checks: modal Close initially receives focus; Tab can traverse browser chrome and returns to Close without focusing underlying app controls; Escape restores sidebar Settings. This is browser dialog evidence, not native window/tray evidence.

The Rust pending-navigation addition has **not been compiled or executed** in this source-only batch. Native packaging must include the matching new bridge and command together; an older host without this command will reject lifecycle registration rather than silently claim support. The smallest Settings-specific native gate is to compile/stage the matching sources in a clean fixture, delay renderer readiness, activate Settings twice, then confirm one dialog after registration and dismissal focus. Recovery-mode action availability and Dock reopen remain unclosed. No native processes, provider operations, N5 attempts, or blocked forwarding occurred.
