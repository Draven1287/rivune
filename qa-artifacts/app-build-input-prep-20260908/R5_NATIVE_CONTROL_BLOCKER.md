# R5 native control blocker

The bounded native-control check authorized by CENTRAL_NATIVE_QA_RELEASE_R5_TMP003.md was attempted in this task before context compaction.

- `cua.getState()` succeeded in 7.9794 seconds and listed the old isolated Rivune M4 QA app, the installed user app, and the development app.
- `cua.getApp("com.rivune.desktop.qa.m420260908")` failed with error -10005 `timeoutReached` after 5.2165 seconds (requested tool timeout 10000 ms).
- No usable native app handle was obtained. This is a controller inspection failure, not evidence that Rivune crashed.
- No R5 launch, new R5 profile, app termination, installation, source modification, or live provider call was performed.
- Per the release, no repeated controller retry or additional QA launch is authorized by this failed check. Native rendering, interactions, persistence, restart, and cancellation-retention acceptance remain unverified.

The 67 passing renderer checks in FINAL_RENDERER_CHECKPOINT.md remain browser/fixture evidence only. The separately qualified sealed R5 artifact is not a distribution release or native UX acceptance.

Next dependency: coordinator disposition for native-control recovery before resuming the exact isolated R5 acceptance run. Preserve the renderer freeze and installed user app.

## Subsequent authorized read-only process check

The sandboxed `ps -axo pid=,comm=,args=` check returned `operation not permitted: ps`. The same read-only check succeeded with tool escalation.

- PID 43949 currently runs `qa-artifacts/tauri-r2-integration-review-20260907/native-m4/Rivune M4 QA.app/Contents/MacOS/rivune` under the workspace. Old M4 is a current process, not merely a stale discovery entry.
- PID 55233 currently runs `/Applications/Rivune.app/Contents/MacOS/Rivune`. This is the separate installed user app.
- PID 3678 runs `.toolchains/target-candidate4-r2/debug/deps/rivune_desktop-b9d88cd020ba96f6 actual_constellation_fixture_persists_each_phase_and_delivers_one_answer --test-threads=1 --quiet` under the workspace. This is a test executable, not the R5 QA bundle.
- No process for `/private/tmp/rivune-r5-seal-003/Rivune.app` appeared in the filtered process listing.
- Neither app exposed profile arguments in this listing. Profile identity and whether M4 has an active request remain unverified. No process environment or secrets were read.

No processes were signalled, terminated, or launched. No repeated native-control attempt was made. These PIDs describe this check only and must be reverified before any later action.

## Direct-launch preflight after coordinator disposition

Coordinator subsequently authorized one exact-path launch with verified fresh-profile isolation, leaving old M4 and installed app untouched. Before launch, the existing packaging-core `hashTree` implementation independently returned the accepted tree `3ffb7d8c33543afd1e3049178f8295ed7a5c4c448a9b836843f488c408b82498`; executable SHA-256 matched `5fef2b548dd9c4044933aec4be7bb5d53192bcd6eab810059113d7fd08bf7bb8`.

Source inspection found `src-tauri/src/main.rs:255-263` accepts `RIVUNE_ISOLATED_PROFILE_DIR` only under `cfg!(debug_assertions)` and otherwise returns a development-only error. Without that variable it opens the default app data profile. This accepted artifact came from release output; no debug-assertions override was found in the inspected Cargo.toml or prep evidence. Exact build configuration confirmation was requested from runtime and central before launching. No fallback to the default profile, artifact mutation, or launch occurred.
