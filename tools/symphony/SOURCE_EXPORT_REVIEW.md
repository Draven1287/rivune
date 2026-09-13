# S00 independent source-export review

2026-09-09 local review only. **Not cleared for promotion/publication or Symphony startup.** Only this report written; no build/install/provider/native/startup, external transfer or broad source copy. Builder's forthcoming clean-entry stage must receive a separate delta review.

## Exact baseline verified

Read source-stage README, ALLOWLIST, manifest and static checks. Manifest captured `2026-09-10T00:41:38.322463+00:00`, declared tree digest `f91c7f9771a83bcc0ba42a6008b349d1bc293ff6a73eb09d14bf858a6f589fda`.

Independently recomputed every file's SHA-256 and size: **89/89 match manifest and current authoritative source**, exact allowlist/tree/manifest set equality, zero extra files and zero symlinks. Declared aggregate tree digest is an identifier here; its aggregation algorithm was not independently recomputed. No source delta existed at inspection time.

Independent literal reference pass resolved **79/79** relative imports, Rust include_str/include_bytes and Cargo path entries. Manually checked both sibling import crates, ten referenced JSON migration fixtures and settingsBridge test's desktop-host dependency. No missing literal dependency found. This is not compiler resolution, dynamic-path coverage or clean-checkout proof.

## Blockers and minimum corrections

1. **P1 — clean desktop build entry absent in this baseline.** Native `src-tauri/tauri.conf.json` points frontendDist at `../web`, containing only the bridge. React index loads only main.tsx; browser CSP is not the native integration entry. Add only the source-owned React/bridge staging/build inputs and reviewed desktop policy/config; regenerate explicit allowlist/manifest and inspect the delta. Do not copy old dist or private QA staging drivers. Builder is already implementing this correction; this report does not assess unseen successor code.
2. **P1 before redistribution — image rights remain unestablished.** Galaxy bytes match local native lineage hash `0e758d81cd77a3ad9e73fe3db997e45eb91c34107cf538dfa95254996fe0878f`. Local `qa-artifacts/rivune-native-cosmos-candidate-20260907-v2/evidence/ASSET_PROVENANCE.md` explicitly lacks original creator/separate license. Stage also contains PNG/ICNS/ICO/SVG identity assets; byte equality does not establish original or derivative rights. Obtain asset-specific permission/provenance or approved replacement before promotion. No private provenance report copied or forwarded.
3. **P2 — dependency notices and effective toolchain not verified.** npm package/lock dependency maps agree; all resolved npm URLs use registry.npmjs.org. Lock metadata lists MIT 67, Apache-2.0 2, ISC 2, MPL-2.0 24, BSD-3-Clause 1, 0BSD 1. These counts describe metadata, not a completed license analysis or bundled runtime inventory. Three Cargo locks have only crates.io registry sources (432/21/21 entries respectively); lockfiles do not supply complete license notices. Root Apache-2.0 LICENSE alone does not establish rights to all dependency resources. Review actual packaged dependency license/notice inputs and document Node/Rust/OS SDK prerequisites during clean-checkout validation; do not infer an incompatibility solely from these license names.
4. **P1 acceptance gate — reviewed revision and clean-checkout validation missing.** No verified target commit/tree or runnable clean build is established by file equality. After authorized successor staging, verify exact changed inputs and locked dependency/build resolution in the intended environment. No such commands executed in this audit.

## Privacy and exclusion findings

Exact staged paths contain source/config/test/assets and root license; no separate profiles, transcripts, screenshots, runtime logs, dependency caches, binaries or private QA reports appeared in the allowlist. Manually read all ten migration JSON fixtures: fictional conversations, synthetic IDs, synthetic bookmarks and paths; no actual user record identified there. The fake bookmark text explicitly denotes synthetic invalid content.

Scanned included source/test literals with ignore rules disabled for home paths, email/URL shapes and credential markers; inspected returned context. `/Users/private/token=secret` in `tests/workspaceAdapter.test.mjs:80` is an authored error-redaction test, not evidence of a real home path or credential. Provider command paths and synthetic test text are not themselves credentials. No unintended personal value was identified in reviewed hits/fixtures.

**This is not full privacy clearance.** Pattern absence cannot establish that every unstructured literal, encoded blob or image metadata is free of private information. Binary image containers were hash-checked, not independently metadata-decoded or visually audited here. Before export, complete resource metadata/rights review and keep this local report outside the allowlist. Do not broaden promotion to all qa-artifacts merely because selected crate paths live there.

## Successor review boundary

Recheck regenerated exact file set and hashes; inspect new build scripts for recursive copying, private driver references, source paths, credential/env embedding and bridge/CSP ordering. Preserve source features and the explicit sibling-crate layout. Old static/test receipts do not transfer automatically to new build inputs. Private-evidence/N5 holds remain unchanged. Monitoring-only Symphony startup was subsequently authorized; the service is running on4320 with dispatch disabled and was not touched by this audit.


## Successor six-file clean-entry review

2026-09-09. Source-only independent delta review; no test/build/native/service operation. Current manifest declares tree `ab1d34946ad5d3ba96c30726032f2c32dde12e703f4e1cbcba1c28d7a57f5518`.

**93/93 individual file hashes and sizes match staged manifest and current source.** Exact allowlist/tree/manifest set equality; zero symlinks. Compared preserved `SOURCE_MANIFEST.s00-baseline.json`: exactly four additions (.gitignore, DESKTOP_BUILD.md, scripts/build-desktop.mjs, tests/desktopBuild.test.mjs), two changes (package.json and tauri.conf.json), no removals. All other staged bytes unchanged. Aggregate digest is reported, not independently recomputed.

**Previous clean-entry P1 closes in source.** Script resolves directories from its own module path, validates native frontendDist equals dedicated dist-desktop, typechecks/builds current React and copies only the explicit current desktop bridge. It replaces the sole local Vite module tag with an entry importing bridge first, React second. Bridge registration is synchronous at module evaluation; asynchronous subscriptions remain methods. No top-level async registration defers that global assignment. Native frontendDist now resolves to the dedicated output. No archived dist/private driver input, broad directory copy, environment-value embedding or QA control was introduced in the reviewed script. Output deletion is scoped to its generated directory; concurrent builds are explicitly prohibited by documentation.

Browser preview CSP is removed only in generated desktop HTML. Native app.security.csp remains the prior strict policy (including IPC connect origins), withGlobalTauri remains true, and capability files/bridge hashes are unchanged from baseline. This verifies source policy preservation, **not** Tauri runtime CSP/style/asset behavior. The script's CSP guard is a basic string check, not a policy parser; current exact config is the acceptance basis.

Focused wiring test source verifies bridge-before-app evaluation using synthetic modules, rejects missing/duplicate/nonlocal entry and policy, and asserts exact output/CSP configuration. Delta receipt reports 3 tests and desktop web build passed; these commands were not independently rerun in this source-only audit. No native validation is inferred.

### Remaining blockers

- **P2 review metadata correction:** `STATIC_CHECKS.json` still reports filesByteIdentical=89 and no build/test execution without clearly marking itself baseline-only. Regenerate it for93 files or explicitly label it historical and point to delta evidence. Independent checks above cover current set/hashes; do not use stale metadata as current proof.
- Asset-specific redistribution rights/metadata review, dependency notice inventory, named reviewed revision and fresh-checkout/native loading checks remain open as previously documented. The changed package adds build wiring, not new dependency versions; no lock dependency delta is required for that script-only change.
- Generated outputs remain excluded from the93-file allowlist. Do not publish the existing git index wholesale: delivery manifest reports an unrelated staged node_modules entry; this audit did not modify or independently validate that index.

The source stage is improved but still **not publication/S00 dispatch cleared**. Monitoring-only Symphony on4320 with dispatch disabled is already authorized; it was neither stopped, started nor reconfigured. N5 and private-forwarding holds persist. This section supersedes the old missing-entry finding only, not the other gates.
