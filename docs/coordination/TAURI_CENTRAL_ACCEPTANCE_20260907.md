# Tauri implementation ownership and central acceptance

Controlling decision: TAURI_INSTALLED_APP_DECISION_20260907.md. Deliver a verified Tauri replacement for the installed Mac app, with a shared macOS/Windows/Linux implementation. Existing SwiftUI is frozen reference; no new SwiftUI features or Xcode app builds.

## Assignments sent and acknowledged by messaging transport

| Task | Responsibility | Current boundary |
| --- | --- | --- |
| Plan unified AI accounts app — 01a051fa-f42b-7501-b83b-44a75dc29634 | Sole Tauri runtime implementation | Confirm canonical durable workspace with inventory owner before writes; first runnable frontend/Rust host slice |
| Summarize current work — 01a06ff5-1b31-7120-b4ec-7dfd9f30b6c8 | Existing Tauri and toolchain inventory | Read-only inventory; preserve candidate3; no duplicate project |
| Audit Rivune native app — 01a074a4-a3e1-7cc2-a835-aa3f1ebdadb6 | Migration source audit, synthetic fixtures and retry-context contracts | Coordinate schema with runtime owner; no concurrent runtime edits without explicit file boundary |
| This central task — 01a07cde-764e-7551-92bc-b518107e2137 | Independent artifact review and installation acceptance | Review exact frozen source, meaningful tests, migration and rollback; maintain blockers |
| Review chat activity — 01a07ce4-1c17-7c10-9f3e-9b6a400b68f7 | User decisions and additional task assignments | Coordinate available tasks without duplicate ownership |
| Respond to greeting — 01a07caf-2bd5-75f0-88ea-726ff6ace03c | Independent offline behavior harness | No runtime edits; coordinate actual host interface and fixture coverage |
| Review and update website daily — 01a07831-61e0-72c3-b166-d19081c8e272 | Website Tauri status copy | Architecture selected, no verified Tauri runtime/download on any OS; no new deployment |

Runtime owner directly acknowledged ownership and canonical durable path: qa-artifacts/cross-platform-shell-20260907/candidate4-runtime. Candidate3 remains frozen reference. First source freeze is pending. Task retrieval currently returns stale historical turns for the runtime owner; direct acknowledgment supersedes that stale view.

Toolchain ownership update: Review chat activity (01a07ce4) has taken over actual official minimal Rust setup, after notifying inventory owner01a06ff5 to pause duplicate installation. Planned workspace-local .toolchains/cargo and .toolchains/rustup, no shell profile modification. Await verified versions/environment from that owner before compilation; no second setup.

Root subsequently reports completed official minimal setup and independently checked rustc1.98.1/cargo1.98.1 in workspace .toolchains/{rustup,cargo}. Missing Cargo is no longer a blocker. Use absolute workspace CARGO_HOME/RUSTUP_HOME and cargo/bin on PATH, without shell profile changes. Root owns smoke compilation; runtime owner receives environment. Inventory owner01a06ff5 is now assigned queued isolated packaging candidate2 source/CI fixes, not installation or competing heavy builds.

## Fresh source audit

Resident reference: qa-artifacts/cross-platform-shell-20260907/candidate3. Central read src-tauri/src/main.rs, Cargo.toml, package.json, web/core.mjs and web/app.mjs directly after the architecture change.

- Rust main registers no commands. The renderer expects __RIVUNE_DESKTOP_HOST__ with getSnapshot/openConversation/submitRun/reconcileRun. A real Tauri bridge and host commands are absent in this reference.
- Renderer provides snapshot and submission acknowledgment handling. It does not render answer content, create conversations, persist per-conversation drafts, stream updates, cancel a run, or retry a completed/failed run. Its retry button refreshes the connection; it is not a run retry implementation.
- Request uncertainty is held only in renderer memory. The production host must durably bind request IDs to admitted runs before acknowledging; reconnect/restart must reconcile without duplicate dispatch.
- This is a previously accepted bounded shell spike, not a working app or regression in its stated scope. Its tests cannot establish production host behavior.

## First executable acceptance slice

### Initial candidate4 host source findings — not accepted

Central directly read host.rs and main.rs after the first implementation handoff; no compiled Rust verification is claimed. Corrections sent to runtime owner and concrete failure cases to independent harness:

- Persist moves primary to backup before pending becomes primary; open ignores backup and initializes an empty store when primary is absent. A crash between renames can lose the recoverable store. Require crash-boundary recovery tests.
- Stdin write happens synchronously before output readers and deadline/cancellation checks. A child that does not consume input or blocks on output can hang the host. Concurrent IO and deadline-owned cleanup are required.
- Reader joins can hang after child exit when a descendant retains pipes; cancellation/timeout detach readers and some IO error exits do not reap the child. Bound complete process/pipe lifetime and test cleanup.
- Reopen leaves persisted running records running without an owning process. Reconcile as interrupted without redispatch.
- Host does not reject unsupported modes before direct dispatch. It must not run Council/Swarm requests as Normal.
- AdmittedRequest retains raw prompt/provider, not approved project/history context; exact-context retry is not yet implemented to the accepted contract.
- Provider configuration lacks a user connection path and production allowlist/Windows script checks. Generic absolute-path execution is not verified provider integration.
- Main always uses app_data_dir/profile-v1. Explicit isolated-profile selection and development bundle identity are required before desktop test launch.

Additional independent renderer findings from migration/website reviewer: deterministic Node tests against frozen actual modules reproduced accepted-send draft resurrection from a pending 180ms save, and saved draft hidden on conversation return because a closure uses stale snapshot data. Evidence qa-artifacts/tauri-renderer-draft-audit-20260907/{REVIEW.md,FAILURES.tap,SOURCE.json}. Runtime owner has fixes; central has not duplicated the reproduction. Both require regression evidence before draft acceptance. Migration owner has runtime authorization for a separate transactional archive crate; no overlapping candidate4 edits.

Reviewer follow-up reports those two original draft regressions and asynchronous answer refresh now pass on app hash prefix cb68d616. New reproduced blockers: duplicate unchanged submission while pre-submit save awaits; unhandled save rejection; background refresh removes focused conversation button (Chromium fixture). Evidence qa-artifacts/tauri-renderer-followup-20260907/{REVIEW.md,RESULTS.tap,KEYBOARD_REVIEW.json}. Runtime owner has fixes. These remain reviewer evidence, not central replay or installed-app verification.

### Required checks

First runtime source freeze central review: 23 entries verified, manifest432e6736e4f130b9c93f3489e98c670f56cdd61aa5a53708f88baf03f040d4ac. Owner reports seven Rust tests and ARM64 build passing; central read full host/main/config but has not replayed those tests. Not accepted for launch yet. New remaining blockers: admitted approved_context is never serialized to subprocess stdin; wall-clock generation ordering can load an older state after clock rollback; no exclusive profile lock or post-rename directory sync; full snapshots have no retention boundary; detached IO threads can survive descendant-held pipes; stdin completion errors can be missed after child exit and reader errors are treated as EOF. Runtime and independent harness received these concrete cases. Development bundle identity and debug-only absolute profile override are now present; unsupported modes now reject, startup marks interrupted runs, and provider configuration UI/commands are present. These improvements do not close the remaining blockers.

Runtime owner ACK: preserve first freeze unchanged; corrections in qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2. Independent reviewer also reproduced actual Rust/JS wire mismatch: Rust camelCase yields conversationId/requestId/selectedProviderId while renderer expects uppercase ID; request deserialization likewise rejects frontend payloads. Evidence qa-artifacts/tauri-wire-contract-audit-20260907/{REVIEW.md,WIRE_REVIEW.json,RUST_WIRE.json,SOURCE.json}. Require actual cross-language fixtures, not separate self-consistent mocks. Reviewer reports five renderer regressions and keyboard focus replay now pass (qa-artifacts/tauri-renderer-verified-20260907/REVIEW.md); this closes those renderer cases only, not host integration. Runtime authorized reviewer for a separate premium structure/styles port, with no edits to sole-owned runtime files.

1. Explicit isolated profile, real Tauri invoke bridge and Rust commands, visible conversation/answer state. No access to the current user store during tests.
2. Host-owned validation and provider selection; actual process boundary implemented with controlled local fixture executables for tests. Fixtures must be identified as fixtures. No paid or live provider call required for this stage, and no live-provider success claim follows from fixtures.
3. Durable admission before acknowledgment; same request ID reconciles after reload/restart without a second dispatch. Reject an altered request reusing an existing ID.
4. Preserve drafts and context when switching conversations, receiving late acknowledgments, retrying, cancelling, and recovering from a provider failure. Retry uses the admitted source context, not later edited project instructions/history.
5. Test cancellation against owned child processes; process exit, malformed output, timeout and restart interruption produce truthful recoverable states.
6. Build and launch the exact isolated Tauri artifact. Record source manifest, lockfiles, build command, bundle identity and test evidence. A browser fixture preview is not desktop runtime proof.

## Installation blockers

- Canonical runtime path confirmed as candidate4-runtime; first source/build freeze pending.
- Rust prerequisite setup complete per root version checks; actual runtime compile/test and desktop build evidence pending.
- Migration schema inventory, backed-up import and synthetic preservation evidence pending.
- No centrally accepted runnable Tauri app exists yet.
- Installer candidate1 rejected: Windows PATHEXT/entrypoint URL handling, unbound packaging working directory/source tree, and executable-only Mac identity that misses resources/Info.plist. Installer owner is currently unreachable; reassignment is coordinated with root.

Both former native owner 01a06efc and installer owner 01a07cde-0293 returned “Cannot steer ... without an active turn id.” They are not counted as working. Root confirmed packaging fixes remain queued to the inventory owner after free toolchain prerequisites. Do not repeatedly retry these failed assignments or divert the independent behavior harness.

## Migration artifact review

Central independently verified all 15 entries in qa-artifacts/tauri-migration-audit-20260907/MANIFEST.sha256 and read the report, fixture index and conversation/project fixture. Spot-checked Conversation, AIAnswer and PromptAttachment fields against resident Models.swift. The Foundation epoch conversion fixture is consistent with adding 978307200 seconds before conversion to Unix milliseconds. The report correctly distinguishes source inventory from the installed build and credential references from secrets.

This accepts artifact integrity and the scoped source/fixture inventory only. Native Codable decoding and real Tauri importer execution are explicitly unrun. Full preservation, interrupted-import rollback, repeated-import deduplication, source ID collisions, unknown records and no-dispatch behavior remain executable acceptance requirements; JSON parsing alone is insufficient.

Import-preview crate milestone now supersedes its uncompiled status: central reviewed lib.rs and independently ran cargo test --locked --offline, 17/17 tests passed. Nine manifest entries verified unchanged before/after. Separate central receipt: qa-artifacts/tauri-migration-central-review-20260907/LOCKED_OFFLINE_REPLAY.json. Accept this bounded read-only crate, not integrated host import/atomic commit or installed-data migration. No app/provider/user-data action occurred.

Import-archive milestone: central reviewed full lib.rs/HANDOFF and independently replayed locked offline fault-injection tests, 12 passed with one deliberately ignored child helper; nine manifest entries unchanged. Receipt qa-artifacts/tauri-migration-central-review-20260907/ARCHIVE_FAULT_REPLAY.json. Accept bounded append-only archive under documented trusted private parent/cooperating writer conditions on tested macOS. This does not establish visible workspace activation, import confirmation, activation rollback or complete app migration. Windows ACL/directory-flush implementation and Windows/Linux execution remain unverified.

## Website review boundary

Review chat activity reports independent V4 rendered acceptance complete: 66 manifest entries, 320/390 containment, copy/focus and no-overflow checks. Evidence reference: qa-artifacts/rivune-native-cosmos-root-review-v3/REVIEW.md. Treat this as the root reviewer's accepted website reference; central has not repeated that rendered audit. Do not duplicate these completed narrow checks unless a later change affects them. This is not new deployment authorization or Tauri runtime acceptance.

V5: central verified corrected 56-file receipt and accepted only the Council-first wording correction. Website reviewer independently checked 56 hashes and 10 changed-route states; evidence qa-artifacts/rivune-native-cosmos-root-review-v5/REVIEW.md. Publication remains held for an unqualified local-storage claim in the guide and public copy containing internal implementation/acceptance terms. Website owner has a text-only successor assignment; do not repeat completed geometry checks without relevant changes.

## Temporary legacy build crash reported at 17:40

Root reports a crash screenshot: temporary /private/tmp/*/Rivune.app build2026090727, PID20126, launch17:40:04.5393 and crash17:40:09.2275, main-thread EXC_BAD_ACCESS/SIGSEGV with objc_release top frame; incident53865B37-5C0C-49C4-B20F-54FEBAD1EC92. Root is locating the full IPS. This is not installed0725 and does not establish the cause of previous reported quits. Central requested launch attribution from active owners and preservation of exact binary/source/symbols/logs. No further legacy app-host execution or reproduction; read-only forensics and Tauri work continue.

Root subsequently preserved qa-artifacts/rivune-crash-20260907-174009/Rivune-2026-09-07-174016.ips and identified XCTest app-host execution: objc_release → autoreleasePoolPop → XCTMemoryChecker _assertInvalidObjectsDeallocatedAfterScope → XCTestCase invokeTest, with RivuneTests.xctest build0727 loaded. Reported app debug UUID02a8ab70-0ba1-3a20-8bf4-8a8ed39f62e7 and test UUIDc4fc5f3d-ada3-39a8-af6d-aeb285b6a67e. Exact test/launcher attribution remains pending. Central did not run any app-host, Xcode or app lifecycle command in this recovery work.

Root then identified ongoing obsolete retry: xcodebuild PID21608, parent21604, started17:42, /private/tmp/rivune-stability-diagnostics.My22Uu, only-testing:RivuneTests/RivuneLifecycleRecorderTests, lifecycle-focused-r3.log. Root owns scoped SIGINT. The r2 17:40 TEST FAILED aligns with the crash; r1 had compilation errors. Installed app PID1621 is separate. Central tool discovery found no direct task interruption or applicable computer-control capability; handoff would relocate git state and is not used as a stop workaround. Native task steering remains unavailable, so task-level interruption must be obtained through available Codex UI controls; stopping one xcodebuild alone does not prove queued retries are prevented.

Later native owner submitted qa-artifacts/native-stability-diagnostics-20260907/v1, reported manifest9c0063750355fe55f591c9f4bfa40ffe325963c94579d8de5266daa5915f887d, four focused tests/330 suite/Mac and iOS release passes. Central has not verified these claims. REJECTED for current delivery/installation because SwiftUI work is superseded; retain as forensic/reference evidence only. No technical acceptance or replacement restart granted. Explicit STOP/REJECT message again failed with no active turn id; root was notified. Do not mistake the incoming handoff for controlling user authorization to resume legacy installation.

Before replacement, independently verify exact bundle, migration and rollback; back up old app and relevant data without logging private content; verify no active request; announce one replacement restart; verify installed Tauri launch and data preservation. The user already authorized this replacement. Current /Applications/Rivune.app remains untouched until these conditions are met. $0; no public release or deployment.
