# Startup contention suppression — live source ready for review

Two-file live delta: native host.rs and main.rs. Exact proposal baselines matched before application; the proposal was applied then corrected for fatal-exit policy and testable startup ordering. Scoped patch, before-images and source-hashes.json are in qa-artifacts/startup-contention-implementation-20260910/. Frozen candidate c84cc2d remains148-file hash-identical; all3 Sent Draft QA bundle files remain unchanged and its reserved profile remains absent.

## Behavior
Only fs2's platform lock-contention error becomes typed ProfileInUse. Permission and other genuine profile-load failures continue into recovery with no HostState. Configured windows are disabled on the effective generated Tauri context before Builder::build, including override window configurations. Admitted healthy/recovery startup manages status, settings navigation and shutdown gate before explicitly constructing the main window and tray. Recovery still disables Settings and retains the recovery shutdown gate.

Typed contention returns before state management and both explicit UI constructors, and the process returns success without entering the app event loop. Other fatal profile-path/builder/window/tray errors log and return failure rather than panic or success. Genuine corrupt/unreadable profile data remains a recovery case, not a fatal contention exit.

## Necessary proposal corrections
The pinned Tauri SetupError does not expose the boxed inner error through Error::source. Consequently a shared atomic flag records typed contention directly in setup; build failure uses that flag for exit status, never string matching. Generated context creation is factored once because expanding generate_context twice in the same binary caused duplicate embedded Info.plist symbols. One test needed explicit use of the existing Arc-returning host helper. Both test-only compile issues were corrected; final native library and binary test targets compile.

Startup uses shared admission and window/tray constructor functions that accept injected callbacks. Tests invoke the actual branching helpers with counter callbacks, not native UI constructors. These prove callback admission/order within the implementation; they do not prove OS window/tray behavior or double-invocation runtime suppression.

## Focused validation
- Host contention2/2 PASS: classification distinguishes contention from permission error; two OS-backed opens of one fresh temporary test profile produce typed contention while first-host state and snapshot bytes remain unchanged; dropping the first lock permits reopen without snapshot changes.
- Startup6/6 PASS: contention causes zero constructor callbacks and success exit policy; healthy/recovery admission invokes both callbacks once after initialization; effective context windows including synthetic QA override have create=false; existing corrupt/unreadable preservation and valid startup/shutdown tests pass.
- Dock2/2 PASS: existing reopen helper behavior and completed-shutdown/recovery distinction retained.

Locked/offline cargo test --lib contention and --bin rivune startup/dock_reopen used the existing shared cache. Only scoped test executables were compiled/run, not the application main/event loop. Compile context references existing frozen Sent Draft frontend assets; they were not rebuilt. Existing unused-variable warning in constellation_projection.rs remains. Logs and reproducible run-tests.py retained. No unrelated test suite repeated.

No native app launch, process control, installed/real-profile changes, new QA bundle/export, dependencies, IPC, provider or publication. This is contention-only suppression; no existing-owner focus/IPC behavior is claimed. A separately authorized double-invocation native smoke remains necessary for OS-level acceptance. Stopped for independent review.
