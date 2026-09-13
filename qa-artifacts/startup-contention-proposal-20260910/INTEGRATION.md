# Contention-only proposal — not integrated

Owner: RIVUNE APP BUILDER; lead coordinates acceptance. contention.patch applies cleanly with `git apply --check` against the inspected accepted candidate. No native compile or runtime test executed. proposal.py regenerates the exact patch to stdout, asserts base hashes, and never writes source. Only this evidence directory was written.

Bases (src-tauri/src): main.rs b5dc504c4f85b1a07876f9e0228cc146a25889f3918184d9dcc7f2bb5b6de061; host.rs f336d930ade7a0f1a6fc7b5cc370f9b49c67d94f03c9de2593c93c6bfd4f0a7e. Paths are rooted in tools/symphony/source-import-candidate. Rebase explicitly if builder changes either file.

## Mechanism

Only fs2 lock contention becomes a typed ProfileInUse error; other I/O and corruption errors retain normal recovery. Startup returns this typed error before managing state or creating UI. Configured windows are deferred programmatically on the generated context, including QA overrides, then explicitly built after admission. This matters because pinned Tauri 2.11.5 app.rs creates configured windows before calling user setup; returning from setup alone would be too late. Locally inspected Context::config_mut, WindowConfig::create and WebviewWindowBuilder::from_config APIs support the proposed mechanism; compilation still required.

On setup failure the builder returns without entering the event loop, replacing the existing panic. This also changes other fatal builder errors to logged normal return; owner should decide whether non-contention fatal errors need a nonzero exit status before integration. Error text is stderr-only, not rendered. The proposal retains the existing single configured main-window assumption. It does not focus an existing owner, implement IPC, delete locks, add dependencies, or prevent distinct-profile QA instances.

## Focused owner test cases

1. Included host unit test classifies fs2 contention as ProfileInUse and permission failure as genuine error. Extend with an OS-backed two-open test in a fresh test directory: first HostState holds lock, second is typed contention; first state remains unchanged; drop first, reopen succeeds. Never use an installed/QA profile.
2. Main classifier: typed contention yields Err; a synthetic non-contention I/O error yields recovery with no HostState. Existing corrupt/unreadable profile tests are updated for Result and must continue passing without changing snapshot bytes.
3. Deferred-UI admission test: contention invokes zero window/tray constructors; valid and corrupt-recovery startup invoke exactly one main/tray path. Verify effective context windows have create=false even with a QA override. Source inspection alone is not constructor-count proof.
4. Preserve existing startup shutdown gate and Dock helper tests. Healthy/recovery paths must still manage status before UI; recovery Settings remain disabled. No model dispatch introduced.

Builder may apply the patch only in its authorized source lane, run scoped library/main tests and native compilation with the existing cache, and report any API/compiler correction. All tests above except patch applicability remain unexecuted. A separately authorized double-invocation smoke is still required to prove no second native window/tray; no Dock activation claim follows from this suppression patch.

Exact next dependency: builder reviews deferred-window ordering and fatal-error exit policy, integrates in its lane, adds remaining admission tests and returns compile/test receipt. Do not launch a second app to validate this proposal now.
