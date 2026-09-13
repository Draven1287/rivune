# Compact workspace local export — independent review

2026-09-10. Verdict: PASS, bounded local source-export acceptance for 3bc19ce0bd7e7a9a1f59dbf11c16a35f0d089f8d. No mismatch found. Exact-export rendering, native runtime, distribution rights/notices and release acceptance remain separate.

## Independently verified

Repository: tools/symphony/source-import-candidate. HEAD is the requested commit; parent is 4ae1b21ab3d0687babde9a86a8e4496363cd65c1. Git tree is 9c588772e018a7b1cbbd1f742497f4c69c9ae71f.

All 141 Git blobs match exported-source-manifest.json by SHA-256 and byte length, totaling 8,123,214 bytes. Independently recomputed path-NUL-hash-newline aggregate is 2fd881e5fe5f5579f0e1d4b7f7a094b894ba7a6d2453afb21d1fab9d8fe7c46e. Tree path set is exact, with no extra Git files, symlinks or submodules. All 134 parent blobs also match the retained parent manifest. Current candidate files, stage tree files, stage manifest and exact allowlist match the verified export.

Reconstructed accepted input hashes independently by overlaying compact-list delta-source-hashes.json, composer supersession-fix-hashes.json and retained-fixture-hashes.json. The resulting 12-path map exactly matches accepted-input-hashes.json and the corresponding committed blobs. Git name/status delta is exactly seven additions and five modifications, matching path-delta.txt. Final retained CSS/fixture overrides are intentional, not supersession-manifest mismatches. Prior compact-list delta review and fixture closure, composer source supersession closure, and retained390 UI closure were inspected as input provenance.

The six new source files are ConversationList.tsx/.css, conversationProjection.ts, ComposerExecutionControl.tsx/.css and composerConfiguration.ts; the added test is conversationList.test.mjs. Five modifications are HostWorkspace.tsx, workspaceController.ts, hostController.test.mjs, hostRenderer.test.tsx and rendererScenarios.ts. No private review report/log, native executable, cache or build output was added by this delta. This is an exact reviewed-path check, not a fresh exhaustive secret scan of inherited content.

All 129 parent files outside the delta remain byte-identical. This includes native source, galaxy/assets, saved-result components/fixture/lifecycle test and other inherited files. HostWorkspace itself changes as accepted, so its saved-result integration preservation relies on the preceding accepted source review rather than an assertion that the entire file is unchanged.

ChatPanel.tsx, Sidebar.tsx and global styles.css are unchanged from the parent in candidate/stage. Their observed live hashes also match excluded-live-deltas.json and differ from the candidate. Therefore live preview approval is not exact-export rendered approval; the export retains the parent global stylesheet.

Tracked worktree and index are clean. Exactly two recorded untracked paths remain: frontend node_modules symlink and native src-tauri/gen/. The symlink target matches the preservation record; all four generated schema files match recorded hashes and there are no extra generated files. Candidate has no remotes. No Git mutation or root-workspace index operation was performed by this reviewer.

## Evidence and limits

Independent verification implementation: verify_compact_export.py. Result: COMPACT_EXPORT_VERIFICATION.json. Both reside beside this report and are the only new review artifacts for this audit.

Owner static-check report records 141 files, 135 literal dependency references, direct lock/dependency integrity and static native output wiring. Read those results, but did not repeat typecheck, functional tests, static dependency validation, UI tests or native builds; none is required to re-prove byte identity against the already reviewed source boundary. Prior source/renderer tests do not attest the exact export's rendered bundle. Asset and notice holds remain unchanged.

Read-only candidate/product operations only: Git object reads, file hashes and repository state inspection. No publication, remote configuration, provider, native launch, new server, install or release action occurred.
