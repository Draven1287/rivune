# REVIEW-QUICK-DRAFT handoff

## Outcome

Prepared an isolated, applyable candidate against `candidate4-runtime-r2`. It adds a native tray entry, a Rivune-owned modal for explicitly typed/pasted Review text, an opaque persistent profile-scope contract, and a CAS/idempotent draft-only append controller. It does not create a second conversation store, overwrite an existing draft, alter attachment order, submit a model run, inspect clipboard/screens, or remain over unrelated apps.

The runtime owner confirmed no stable recovery-scope API exists in R2. This candidate therefore remains integration-blocked until central/runtime explicitly accept the additive host contract: a private `recovery-scope-v1` UUID file and `get_recovery_scope_id` command.

## Integration points

- `src-tauri/src/tray.rs`: `rivune-review` → “Add text to Review…”.
- `src-tauri/src/main.rs`: focus/show the authoritative main window, then emit one UUID-scoped `rivune://open-review` event.
- `src-tauri/src/host.rs`: create/read one private persistent opaque recovery scope; expose only that identifier.
- `web/desktop-host.mjs` and `web/core.mjs`: bridge the scope command and event without Review input.
- `web/review-quick-draft.mjs`: isolated state machine and recovery policy.
- `web/app.mjs`: reuse the existing selected conversation, `saveCurrentDraft`, `richState`, ordered attachment IDs, and `saveRichDraft` receipt parser.
- `web/index.html` and `web/styles.css`: branded modal with keyboard focus, live status, explicit Add, and same-payload Retry.

## Review/lifecycle behavior

- Target binding occurs after current draft settlement, so an unsaved active draft is preserved before append.
- Imported/read-only and stale/conflicting targets fail closed.
- Escape, close, and backdrop click dismiss the in-app modal. An uncertain write retains its recovery record even when hidden.
- The Tauri main window retains its existing hide-on-close behavior; this patch adds no panel window or always-on-top flag.
- Shutdown/recovery state blocks new Review admission and retry.
- A durable receipt updates the existing draft/rich-draft state in place and focuses the existing composer. There is no automatic dispatch.

## Evidence boundary

Source-level and JavaScript-test evidence is recorded in `TEST_EVIDENCE.md`. No Rust/native build or rendered UI verification was performed, no installed app was changed, and no build newer than `2026090623` is claimed installed.

## Parent decision needed

Keep the outstanding product question in the parent task: should the broader **Review** affordance cover quick chat/task status, explicit user-shared text/screenshots, or both? This candidate deliberately implements only explicit typed/pasted text-to-draft and makes no screenshot or status-product claim.
