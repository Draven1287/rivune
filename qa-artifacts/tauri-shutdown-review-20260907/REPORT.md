# Tauri shutdown source re-review

Evidence date: 2026-09-07. Read-only audit of `candidate4-runtime-r2`; no runtime source, native build, launch, provider call, or test was run by this review.

Reviewed exact SHA-256 hashes:

- `src-tauri/src/host.rs`: `8bea138b0fa67fb540a5cc8fb2bb80cec3a98da84ecbc41223b4aa80604eb894`
- `src-tauri/src/main.rs`: `4ced0d1a797030dcefb7eac57948b0e4d75ad44f700d1b997e7aa24a87630703`
- `src-tauri/src/lib.rs`: `f00f786f514c69cb5f41d62f964f7fa5a6b1a42966bc94fb75ff4181168efe3d`
- `src-tauri/src/tray.rs`: `a56427d09e325382fef13038d61303610629f45c6906dd304a02750414dab2af`
- `src-tauri/Cargo.toml`: `1b115b2c268ec27c0a53252c59eb71e110809723874e1b88e9a5e1bc7d7291c0`
- `web/app.mjs`: `e3bb0c21902cf9d185b0eff2c3e6eddecfd9a3fdc0018f13d1bce32ab46ea94c`
- `web/core.mjs`: `d3166478db0ce28c79540e638352e962962143930c46b3e5ebc6fcd35b3c32d8`
- `web/desktop-host.mjs`: `ea14306d8772fcfab273ca8d79d08dccd3baa1b52086d335ab3b32c0717a2e24`
- `web/chrome.mjs`: `0b606ccf67e4390427397e8c72843479f7bdc8d1d91a6decedb59bf029be427e`
- `tests/integrated-browser.cjs`: `d89955d339fdbd5b33e7ba97b13f3afa938fb8637a631f432d2e91abce46944e`

## Remaining blockers

### P1: pending-token replay can deadlock after renderer reload

After a failed final save, the host intentionally retains both the shutdown token and `HostLifecycle.shutdown_drafts`. A renderer reload recreates `localDraftVersions` from an empty map (`app.mjs:46-49`) because workspace snapshots contain draft text but no accepted shutdown revision. Pending-token replay then runs the shutdown handler (`desktop-host.mjs:24-27`), marks the current draft dirty with revision `0` (`app.mjs:116-125`), and resends it. If the first attempt saved that conversation with any revision above zero, `save_shutdown_draft` rejects the replay as stale (`host.rs:804-807`). The handler never reaches `complete_shutdown`, so choosing Quit again cannot retry the failed final persistence gate.

Persist or query the host's accepted per-conversation shutdown revision for the pending token, or treat identical text as an idempotent replay even when the renderer's reconstructed revision is lower. Add an integrated reload test: save revision greater than zero, fail `complete_shutdown`, reload the renderer while retaining the host/gate, replay the pending token, and verify that the final save retry reaches authorized exit.

### P1: legacy import archive writes bypass the shutdown mutation barrier

`commit_legacy_import` removes its pending preview and writes/verifies the private archive before entering `activate_import` (`host.rs:2198-2231`). The only `lock_mutation` for this path is inside `activate_import` (`host.rs:1998`), after the archive side effect. A commit that starts after `begin_shutdown`, or overlaps it before activation, can therefore mutate the archive while shutdown is preparing its final receipt and may be interrupted by process exit. This contradicts `begin_shutdown`'s stated guarantee that every mutating entry point is frozen.

Acquire the lifecycle mutation guard at the start of `commit_legacy_import` and hold it across preview removal, archive commit/reconciliation, and workspace activation. Refactor `activate_import` to accept the already-held guard or use an internal helper so the nested lock does not deadlock. Add a held-import test proving shutdown waits for an admitted commit and rejects a commit started after freeze.

## Disposition

The earlier admission/registration, automatic recovery, normal workspace mutation, same-token replay, renderer late-work, offscreen draft, and authorized-exit findings are resolved in this snapshot. Red window close remains the approved hide-only tray behavior. Graceful shutdown is **not accepted** until the two blockers above are fixed. The reported 57 Rust, 14 Node/wire, 59 integrated browser, keyboard, and formatting passes were not independently rerun here; the current tests do not cover renderer reload after failed shutdown or archive commit across the freeze barrier.
