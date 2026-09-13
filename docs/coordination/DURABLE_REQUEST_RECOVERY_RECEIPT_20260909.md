# Durable request recovery source — 2026-09-09

Desktop recovery no longer uses sessionStorage. HostWorkspace requires the durable host journal and guarded submission bridge; an older/incomplete bridge fails closed. The session journal helper remains only for legacy browser-session unit tests.

Existing host persistence saved admitted runs but did not preserve renderer identity before admission. The narrow extension adds optional `submissionRecovery` to the existing atomic WorkspaceSnapshot generations. Its entire data is schema version, request ID, conversation ID, and reserved/rejected state. No prompt, model credentials, auth data or provider output is added to the journal.

Retention: one unresolved reservation per host profile, with no expiry or eviction. A different identity cannot replace it. Read validates record/binding and syncs the snapshot directory before returning either identity or absence. Reservation returns only after persistence; post-rename uncertainty retains the visible candidate. Cleanup reconciles the exact identity and atomically saves the snapshot without the journal. Uncertain cleanup keeps the renderer blocked until explicit recovery. A verified authoritative absence can release local uncertainty after cleanup without replaying or repeating a submission.

`submitReservedRun` checks the exact reservation under the same lifecycle/workspace lock used by reconciliation, at actual admission. Reconciliation can durably reject a reservation with no run; that rejected/cleared reservation fences delayed dispatch. There is no automatic retry or replay. The legacy submit command remains available for the existing legacy renderer, but the new renderer requires the guarded method.

Source boundary:

- Frontend: async RecoveryJournal, strict `durableRecovery.ts`, guarded adapter mode, HostWorkspace wiring.
- Existing candidate host only: `candidate4-runtime-r2/src-tauri/src/host.rs`, command registration in `main.rs`, and `web/desktop-host.mjs`.
- No frontendDist change, native build, app launch/install, provider execution, credential persistence, or production profile access.

Executed proof: 79 Node tests pass; 11 mounted browser scenarios pass; TypeScript/Vite build and JavaScript bridge syntax checks pass; diff whitespace checks pass. Fresh controller/journal tests deliberately lose all browser storage while keeping simulated host durable state, recover the same request, and never replay it. Tests also cover malformed/unavailable recovery, failure before reservation persistence, committed cleanup with lost response, terminal cleanup and blocked shutdown preservation.

Eight Rust tests were added for disk reopen, atomic persistence fault points, binding validation and delayed admission fencing. They are **uncompiled and unexecuted**: no native build was authorized, and rustfmt was unavailable. Thus simulated process-equivalent browser tests are not proof of actual native process-restart durability.

Remaining gate: independent source integration review, then native compilation and those Rust persistence tests, followed by an isolated fixture-only process kill/reopen test around reservation, admission, terminal commit and cleanup, including failed shutdown flush. Do not run a real provider or existing profile for that gate.

Separate source-inspected integration limitation sent to the independent auditor: the host submission command still awaits execution to finish, while the controller holds its action gate until that promise resolves. Immediate-ack mocks therefore do not establish that Cancel is usable during a real long-running invocation. Resolve the admission/completion interface before claiming full packaged interaction readiness.
