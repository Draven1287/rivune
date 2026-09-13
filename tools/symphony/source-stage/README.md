Latest local export: accepted saved-result slice `4ae1b21ab3d0687babde9a86a8e4496363cd65c1`; docs/coordination/SAVED_RESULT_EXPORT_RECEIPT_20260910.md. Generated files remain untracked; native app remains dd9cfed and has not been rebuilt. Independent export check next.

Latest test-only checkpoint: terminal acknowledgement recovery `dd9cfedd6130c4704e5addeb28307a12b20c341f`; docs/coordination/S02_TERMINAL_ACK_RECEIPT_20260910.md. S02 execution dependencies unchanged.

Latest checkpoint: persistent configuration recovery `94fbdcefe9fcad64d3527bf88e4a24acec84ceb6`; docs/coordination/S02_CONFIGURATION_RECOVERY_RECEIPT_20260910.md. Independent review next; no provider/native launch.

Latest correction: inherited admission `ae27a875aab6bc4d78f05f73e1374d73a5826171`; docs/coordination/S02_INHERITED_ADMISSION_RECEIPT_20260910.md.

Latest local checkpoint: follow-default `6119dad12a2af59bee4f77e7d616e2cdfd76b46d`; receipt docs/coordination/S02_FOLLOW_DEFAULT_RECEIPT_20260910.md. Focused checks passed; independent review next.

Latest binding successor: 49777f343d8488621060d31edfd5666c418a9c1b; see docs/coordination/S02_CONVERSATION_BINDING_RECEIPT_20260910.md.

Latest S02 picker successor: dd9706b37e2b5fe162bf0390b2b1bf073e3fd4a0; see docs/coordination/S02_ROUTE_PICKER_RECEIPT_20260910.md.

Latest S02 configuration contract: e49efc20e0c50609730787534ecfaa4556198b5a; see docs/coordination/S02_PROVIDER_CONFIGURATION_RECEIPT_20260910.md.

Latest S02 guidance successor: d7e20910a39aab51acbe79460caac5e2d7e3f77f; see docs/coordination/S02_CONNECTION_GUIDANCE_RECEIPT_20260910.md.

Latest semantic successor: 7ff40f55b43fde56297a96b5806ee80bff3dbac9; see docs/coordination/S04_LEAD_SYNTHESIS_RECEIPT_20260910.md.

Latest frozen successor: 016bde7243034e8059d266ca5ce6ff9f28483410; see docs/coordination/S04_DISCOVERY_ADMISSION_PRECEDENCE_RECEIPT_20260909.md.

Latest frozen discovery successor: 3325e095ad28ae2aceb208e5520109ebee60632b; see docs/coordination/S04_DISCOVERY_CLEANUP_BOUND_RECEIPT_20260909.md.

Latest discovery correction: 1d789e5eab04eaa4d5157a4b7ef405e232f4cfe5; 112 files. See docs/coordination/S04_DISCOVERY_FENCING_RECEIPT_20260909.md.

Latest bounded checkpoint: 1a33f47e9e5193db9686f7c159dd998e5a3f91bf; 112 files. See docs/coordination/S04_CODEX_MODEL_DISCOVERY_RECEIPT_20260909.md for tested scope, exclusions and lifecycle limitations.

> Latest functional successor `e0c19ec8f01316e1f7535dbd6e3f4bbfe2a1b995` / source SHA `06a61e27ca034c2deed55406d8a9dc7c174ecd0ef9ba9b672b35beb6235b2db6`: 108 files. Versioned model capability limits and configuration-save validation added; 123 frontend tests, web build and 4 focused native library checks passed. Unsupported model controls remain unavailable. See local S04_MODEL_CAPABILITY_RECEIPT_20260909.md; earlier checkpoints below are historical.

> Latest notice-only successor `ad4d37273e09be94b673432214bf78aac5b61772` / source SHA `0b5c9fe968599f8847d09cfb99ebf75dfa0da419c2e6a58cfa82ef6f6f7ba786`: 106 files. Seven of 17 runtime notice-material gaps filled from exact upstream/steward sources; ten objc2-family gaps remain explicit with supplemental evidence. See local S00_RUNTIME_NOTICE_COMPLETION_RECEIPT_20260909.md. Earlier counts and gap totals below are historical.

> Current successor: `5920d717c45b1ee351c2502c4c4efa3f4dbf311e` (parent a52cde8 preserved), 97 files, source SHA `5375a63cff76e96ca65e20132fb4dc542cbf052d9d7ef4099e41f94be2e35892`. Missing lock integrity is now resolved: 51 exact registry tarballs verified, all 97 entries complete, offline warm-cache install/118 tests/web build passed. Notice/resource holds remain. See local S00_LOCK_INTEGRITY_RECEIPT_20260909.md. Older missing-integrity statements below describe historical checkpoints.

> Latest checkpoint: 97 files, local candidate `a52cde8f25d0af4fc57ebd42b858510ca69b6797`, source SHA `d985a8468ee582877711d74705b7dde79135a61ee4a5b8c5bbd1aef488c4e4ec`. Four provisional notice input files are now included. Fresh desktop web build and native compile passed with shared caches; no launch/install. See `docs/coordination/S00_NATIVE_SOURCE_BUILD_RECEIPT_20260909.md` locally. Earlier 89/93-file and no-native-build statements below are historical checkpoints.

> Current checkpoint: local import candidate commit `64cf31c4224b8edd51af09d79e4f4d9d9cac2ffc`, tree `20ff5c40bfcaf061b97c2bb2b69747b758bfed9d`. It is an isolated, unpushed candidate awaiting independent approval, not the main workspace index. Current static checks report 93 files. See the local S00_LOCAL_GIT_IMPORT_RECEIPT_20260909.md for readiness and repeatable validation commands. Earlier “no commit” statements below describe the initial export checkpoint.

# S00 local source handoff — review only

This is a source-owner staging copy for issue 7 / S00, not a named reviewed revision, runnable desktop delivery, or permission to publish/start Symphony. `tree/` preserves every repository-relative path, including the historical `qa-artifacts/` names for source crates. There are no relocations, source edits or import rewrites. Promote only the explicit `ALLOWLIST.txt` entries after independent review; never recursively promote `qa-artifacts/` or this whole staging directory.

`SOURCE_MANIFEST.json` gives each path, byte count and SHA-256. `STATIC_CHECKS.json` records local byte comparison, literal import/include/path checks and a limited credential-pattern scan. These metadata files and this README are local review material, outside the allowlisted source tree.

## Included source

- Current React `src/`, package/lock/TypeScript/Vite configuration and entry HTML; all current frontend unit and mounted-browser test source. Tests contain authored fake hosts and synthetic strings, not captured user sessions or private packaged QA drivers.
- Current native `src-tauri/src/` including inline acceptance tests; Cargo manifest/lock, build script, capabilities, application configuration, Info.plist and icon resources.
- Matching `web/desktop-host.mjs`; no old web app or marked/vendor dependency, because the current React implementation does not import them.
- Both required sibling crates, `import-preview` and `import-archive`, their manifest/lock/source/test files, and the ten JSON fixtures actually referenced by their tests. Inspected fixtures contain fictional conversations, synthetic IDs/bookmarks and synthetic paths.
- Repository Apache-2.0 LICENSE. Existing app image/icon source resources are retained only in this local review copy; see rights blocker below. Image containers are build inputs, not executable binaries.

## Dependencies outside the primary frontend/native directories

1. Native Cargo uses `../../../tauri-migration-audit-20260907/import-preview` and `import-archive`. Archive uses `../import-preview`. All three path dependencies resolve within the staged tree.
2. Import test `include_str!` paths use `../../fixtures/`; the exact ten referenced files are included, preserving this layout.
3. Frontend `tests/settingsBridge.test.mjs` reads `../../../qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/desktop-host.mjs`; the stage preserves that dependency.
4. Registry dependencies require npm/Cargo downloads or a separately supplied trusted cache. No `node_modules`, `.toolchains`, Cargo target/cache, generated schema or dist is included. Frontend declares Node >=22.13; import-archive declares Rust >=1.89. A full tested cross-platform Rust/toolchain baseline has not been established by this export.
5. Native OS SDK/build prerequisites and provider command installation/authentication remain external runtime requirements. This export neither supplies credentials nor verifies providers. Existing source gates remain unchanged.

## Source-readiness blockers

- **Clean desktop integration source now implemented:** `prototypes/ai-native-workspace/scripts/build-desktop.mjs` runs typecheck and a fresh Vite web build, copies the matching bridge, and generates an entry that evaluates the bridge before React. Native frontendDist now points to `dist-desktop`; its existing CSP/capabilities are unchanged. Browser preview CSP is removed only from generated native HTML so Tauri's native policy applies. `DESKTOP_BUILD.md` documents the required web step before native builds. Three focused checks and the desktop web build passed with existing dependencies. Native build/launch and runtime CSP/asset loading remain unverified. See `DESKTOP_BUILD_DELTA.json`.
- **Asset rights/provenance:** the existing galaxy provenance record establishes repository-native byte lineage but explicitly lacks original creator/separate license. Root Apache-2.0 text is not proof of image redistribution rights. Icon originals/derivative rights likewise need explicit current provenance review. Preserve these files locally for fidelity; clear rights or obtain a user-approved replacement before promotion/publication. No private provenance report was copied into the stage.
- **Reviewed canonical revision:** no commit/PR/push was created, and remote main was not re-inspected in this task. The lead's reported missing-source condition is task context, not a fresh remote verification. Reconcile the allowlist against a reviewed target revision and record its exact commit/tree before S00 acceptance.
- **Fresh-checkout validation:** the initial export ran no tests/builds. The subsequent desktop entry passed three focused tests and a web build using existing dependencies; no fresh dependency install or native build/launch ran. Byte equality does not transfer prior local test results to a new checkout. Once authorized, use `npm ci`, frontend source checks/build, and locked Rust checks on the clean tree; pin/document the effective toolchain and OS prerequisites. Recheck locks and dependency notices during independent audit.
- **Independent exclusion review:** limited static pattern checks found no private-key/provider-token/personal-home patterns. This is not a complete secret scan or license audit. Inspect the exact allowlist, authored test literals, resources and package sources before any publication. Confirm no unnoticed dependency has been excluded; compiler resolution remains untested.

## Deliberate exclusions

No executable/app/installer binaries, dist, caches, node_modules, .git, profiles, logs, raw transcripts, screenshots, QA reports, credentials, private standalone provider fixtures/drivers, native example QA executables, private build/rebuild scripts, generated schemas or old web application were copied. The detached preview manager is excluded: it writes repository-specific QA process state and is not required by `npm run dev`. Native `examples/` and the old web-specific tests are excluded from the canonical React/native slice; native module tests and current frontend tests remain. No source feature was removed from the authoritative working tree.

## Minimal promotion plan

1. Independently audit `ALLOWLIST.txt` and compare every staged hash to source. Resolve asset rights and explicit missing dependencies first.
2. Independently review the new desktop build entry delta and unchanged native CSP/capabilities. Verify runtime asset/CSP behavior only under a separately authorized native validation scope.
3. Recreate the approved layout in a clean checkout, install locked dependencies, run documented source checks and then the separately authorized synthetic packaged retry/Dock gates.
4. Record the reviewed source revision and validation receipt before asking for source publication. Do not release Symphony workers from S00 based on this local copy.

No git push, publication, native build/launch, installation or Symphony startup occurred. The authorized desktop web build ran with existing dependencies. Existing startup, N5 and private-evidence-forwarding holds remain in force.

## Current delta checkpoint

The initial 89-file baseline is preserved as `SOURCE_MANIFEST.s00-baseline.json`. The current manifest includes 93 files: only package.json and native tauri.conf.json changed, with the desktop build script, focused test, build instructions and frontend .gitignore added. All other staged source hashes were rechecked unchanged. `STATIC_CHECKS.json` is regenerated by validate.mjs for the current 93-file tree; `DESKTOP_BUILD_DELTA.json` records the current delta and output hashes. Neither generated dist nor QA evidence is in the allowlist.

## Fresh-source frontend validation update

The same 93-file export was reconstructed into a new temporary tree. Network `npm ci --ignore-scripts` passed (51 packages); 118 unit tests and build:desktop/typecheck passed. Offline cache installation failed; 51 of 97 lock dependency entries lack integrity fields. No source/lock/allowlist changes. This improves frontend readiness only: no Git revision, native build/launch, minimum-toolchain or cross-platform proof. Local receipt: `docs/coordination/S00_FRESH_SOURCE_FRONTEND_RECEIPT_20260909.md` outside this export. The selected silver-R logo is pending integration; the old icon assets are not final export approval.
