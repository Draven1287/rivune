# Accepted compact workspace local source export

Local candidate: tools/symphony/source-import-candidate, branch codex/s00-source-import.

- Parent: 4ae1b21ab3d0687babde9a86a8e4496363cd65c1 (accepted saved-result export).
- New commit: 3bc19ce0bd7e7a9a1f59dbf11c16a35f0d089f8d.
- Git tree: 9c588772e018a7b1cbbd1f742497f4c69c9ae71f.
- Manifest tree SHA256: 2fd881e5fe5f5579f0e1d4b7f7a094b894ba7a6d2453afb21d1fab9d8fe7c46e.
- Manifest:141 files,8,123,214 bytes;12-path delta (7 additions,5 modifications).

Scope was reconstructed and verified before copying. Inputs are the compact conversation-list delta-source-hashes.json overlaid by the accepted composer supersession-fix-hashes.json and retained-fixture-hashes.json. The resulting composer map exactly equals its current source-hashes.json. All12 live input files matched their accepted hashes. The final retained390 UI closure and acknowledged-supersession state PASS were read. No whole-live-tree substitution occurred.

Added source: ConversationList.tsx/.css, conversationProjection.ts, ComposerExecutionControl.tsx/.css and composerConfiguration.ts. Added test: conversationList.test.mjs. Modified existing files: HostWorkspace.tsx, workspaceController.ts, hostController.test.mjs, hostRenderer.test.tsx, rendererScenarios.ts. Full repository-relative paths and per-file SHA256 are in qa-artifacts/compact-workspace-export-20260910/included-paths.json and accepted-input-hashes.json; Git name/status delta is path-delta.txt.

Preservation: every preceding manifest file outside those12 paths remains byte-identical. This preserves the accepted SavedResult components, viewer fixture, lifecycle safety test, Constellation saved-result controls, assets, native source and unrelated imported work. HostWorkspace retains its accepted saved-result integration while adding the reviewed list/composer changes. The candidate/stage versions of live-modified ChatPanel.tsx, Sidebar.tsx and global styles.css were explicitly kept at their parent hashes. excluded-live-deltas.json records both live and candidate hashes; user live files were not edited. The candidate therefore retains its earlier global stylesheet; live preview visual approval is not a fresh exact-export rendered approval.

Validation executed against candidate source before commit:
- Static validator:141 files byte-identical, exact allowlist,135 literal dependency references checked; package/lock direct dependencies and registry integrity passed. Its nativeOutputWiring field is a static check, not a native build/runtime claim.
- npm run typecheck: passed.
- Node selected conversationList.test.mjs:4/4 passed.
- Node hostController.test.mjs filtered to “compact composer”:5/5 passed.

After commit, every manifest path's Git blob SHA256 was compared to the manifest. Git diff is clean for tracked files. The same two preexisting untracked paths remain: frontend node_modules symlink and candidate4-runtime-r2/src-tauri/gen/. Their symlink target/generated file hashes matched before/after and are recorded in preserved-generated.json. They were not staged or deleted. Candidate has no remotes. Workspace/root Git index was not used; commit was limited to the12 explicit candidate paths.

Updated local import bookkeeping: SOURCE_MANIFEST.json, ALLOWLIST.txt, STATIC_CHECKS.json, VALIDATOR_HASHES.json and GIT_IMPORT_CANDIDATE.json in tools/symphony/source-stage. Parent and exported manifests plus prior candidate metadata are retained in qa-artifacts/compact-workspace-export-20260910. result.json contains parent/new/tree metadata and preservation status. export.py records the exact operation and fails closed if rerun against a different parent; it is not a repeatable merge command.

No remote, push, publication, new server, provider, native build/launch, installed replacement or export-to-release operation occurred. Asset/notice holds remain unchanged. This is ready for independent local export review; native and exact-export rendering acceptance remain separate.
