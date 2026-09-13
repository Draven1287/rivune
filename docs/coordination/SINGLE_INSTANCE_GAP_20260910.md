# Same-instance gap — source review

2026-09-10. Read-only analysis of accepted `tools/symphony/source-import-candidate` Tauri runtime and ReadingQA build driver. No launch, process mutation, profile edit, build or native reproduction. Previous transition remains plan-only. No repeated bundle hash audit.

## Finding: P2 — profile lock is not single-instance activation

In candidate `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:957`, HostState::open acquires an exclusive `.profile.lock` before reading snapshots, retains the File in HostState, and rejects lock failure. This protects against a second authoritative store for the same profile. It does not terminate or activate another application process.

`main.rs:48` converts **every** HostState::open error, including lock contention, into startup recovery with no HostState. Setup at line 408 continues and installs a tray even in recovery, sets NeedsAttention and disables Settings. The configured main window still belongs to that new application. Therefore, conditional on a second executable invocation reaching setup while the first holds the same profile lock, the code admits a second recovery app/tray instead of forwarding activation and exiting. No native experiment was performed. Lock failure also loses its distinct diagnostic by being folded into generic recovery.

Cargo.toml has no single-instance plugin dependency; the inspected Builder has no single-instance registration or IPC handoff. Existing RunEvent::Reopen restores the existing main window **within the process receiving that event**. It does not coordinate separately started processes. Ordinary OS activation that reaches Reopen is handled, but this inspection does not establish how every LaunchServices launch route behaves. Do not claim that a normal Dock click necessarily produces a duplicate.

## Distinct QA builds are a separate cause

ReadingQA build.py stages a deliberately separate bundle identity/profile and does not launch it. Distinct QA bundles using distinct profiles can each obtain their own lock and create their own tray. A same-bundle/profile fix will not retire these earlier QA applications. The single-QA transition requires normal authorized retirement, never kill-by-name. No current process count is asserted here; historical receipts are not a live inventory.

## Minimal owner patch design

RIVUNE APP BUILDER owns implementation. First introduce a typed startup outcome separating profile-in-use from unreadable/corrupt storage; do not match human error strings or remove the durable profile lock. A contention-only no-UI exit would prevent the extra recovery tray but is only a partial fix: it does not focus the owner.

For full behavior, add a pre-UI instance admission/activation mechanism keyed by normalized bundle identity plus resolved profile identity, before window/tray creation. Primary retains ownership for the entire process lifetime, including recovery when HostState is absent. Secondary sends only an activation request to that owner and exits without loading workspace, creating tray/window or submitting a model request. Primary calls existing guarded reopen_existing_window/open_main on the UI thread. Preserve completed-shutdown guard and recovery access. Do not pass draft text, arbitrary commands or navigation arguments through activation.

Choose an already-supported platform mechanism or separately reviewed dependency; do not assume a plugin's keying/ordering meets these requirements. Private same-user endpoint, bounded acknowledgement, concurrent-start election and owner-exit races need explicit handling. If activation delivery fails while owner still exists, fail closed without opening another editable/recovery instance; do not steal/delete its lock. Different QA identity/profile must not accidentally focus the installed app. Same-profile contention across different bundle identities still fails safely without a second store; do not pretend cross-bundle activation exists unless designed explicitly.

## Exact test route / next dependency

Builder first supplies source-only admission tests: first/second/concurrent admission; same key activation only; distinct QA keys independent; same-profile storage exclusion retained; recovery owner remains discoverable; completed shutdown ignores reopen; missing owner/timeout fails safely; stale owner can be reacquired only after real ownership release. Assert zero secondary window/tray/store creation and zero dispatch, plus unchanged owner draft/gate state. Existing profile lock tests alone are insufficient.

Then lead authorizes a bounded isolated native slot with synthetic saved data and explicit permission for a second invocation. Exercise normal OS reopen separately from direct second execution, count process/tray/window identities, and confirm owner focus/draft preservation. Do not attempt these now or use installed/S02 profiles. A test that checks only store contention must not be labeled single-instance UI acceptance.

Next dependency: lead assigns the builder this focused startup outcome/admission patch and chooses whether the immediate milestone is contention-only suppression or full activation handoff. No competing implementation written here. Existing distinct-QA retirement plan is still required regardless of that choice.
