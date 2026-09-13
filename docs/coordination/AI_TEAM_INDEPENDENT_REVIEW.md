# Configurable AI team — independent review

Started September 6, 2026; checkpoint 1 verified September 7 at 02:57 UTC / September 6 at 20:57 MDT. Owner: **Summarize current work**. Scope: this source review, the status ledger and the separately tracked [native product audit](NATIVE_APP_PRODUCT_AUDIT.md). Native implementation, adapter work and evaluation have separate owners; UI control is explicitly handed off between native owner and product reviewer.

**Status: corrected 0.2 (2026090619) is independently identified in `/Applications` by plist and executable SHA-256 `c7e880b9f770a8dbe2e7f1dd35bba0d15ef012156eda406c476d5d7468c5128b`.** All 44 accepted-source files match final manifest `b8fbe353d8cb011658d0fc9b29283c4414475dc8a22a404830d29ccf4e613db1`; final receipt records 278/0/0. The [product audit](NATIVE_APP_PRODUCT_AUDIT.md) records saved screenshot/AX inspection, bounded closure of the three Settings focus/accessibility findings, strengthened S04 synthetic completion checks and the owner's four-file semantic-history receipt. Full walkthrough, live account/provider states and broader window/keyboard behavior remain unqualified. IR-01 stays closed at checkpoint4; unchanged runner/team evidence and bounded freshness19/19 are retained. This reviewer has controlled only an isolated 0618 Home fixture and saved evidence, with no installed-user-app control, app build/install or live model call.

## Current facts and review contract

- [AI_TEAM_IMPLEMENTATION_SLICE.md](../AI_TEAM_IMPLEMENTATION_SLICE.md) and [AI_TEAM_ADAPTER_HANDOFF.md](../AI_TEAM_ADAPTER_HANDOFF.md) define two to six stable member IDs, including repeated routes, a selected orchestrator, explicit stop/ordered fallback, immutable requested model/effort and shared local process bounds. Auto and Swarm remain unavailable in this slice. Nil options retain account-default uncertainty.
- [AI_TEAM_DIRECTION.md](../AI_TEAM_DIRECTION.md) refines the earlier app-appointed lead design into one configurable team with orchestrator/member roles. Existing Council histories retain their original transport-based IDs and rotation policy; they must not acquire a fabricated team snapshot.
- The direction's current **Transcript reconciliation** governs product scope: Rivune proposes an eligible reusable team and manager, with user model/reasoning overrides beside the prompt and multiple members on one CLI. Council is temporary staging; real task-dividing/delegating/reviewing/integrating Swarm and then Auto remain required milestones. Fixed two-per-provider, cheapest consolidator and manager-always-drafting are implementation experiments. Custom menus/focus fixes support native Team delivery; browser prototype work is stopped. This bounded checkpoint review does not qualify the later milestones or create a third mandatory role.
- Installed **0.2 (2026090617)** has a saved receipt for **259 passed / 0 failed / 0 skipped**, disabled account services and uncompiled direct updates. Executable SHA-256: `dbdc31a140cde3de62e003d8e02b0c1f43cd859c3d850bb8b105e30a9d262680`. [0617 review and receipts](../../qa-artifacts/council-output-budget-20260906/REVIEW.md) include memory-only rendering fixtures and preserved real history. This reviewer read the receipts and did not rerun the app suite.
- That 0617 record is historical. Current [0618 installation/review](../../qa-artifacts/team-foundation-20260906/build-0618/REVIEW.md) and [receipt](../../qa-artifacts/team-foundation-20260906/build-0618/installation.json) identify executable SHA-256 `885efabc70eef4c63b96d2add18c0414c98cc6acf0c52b742874fe83b621de94`; the reviewer independently read the installed plist and matched that executable hash. All 44 files in the frozen build mirror match its [manifest](../../qa-artifacts/team-foundation-20260906/build-0618/source-manifest.json), SHA-256 `5e3218c8bb853f97d9f363adfe490caba351e06aea29bcd0d1535d6a749a2617`. All 16 checkpoint-4 inputs match the mirror without changes. The [test summary](../../qa-artifacts/team-foundation-20260906/build-0618/test-summary.json) records 276/0/0; no suite rerun occurred here.
- The native owner records isolated Team editing/save/reopen, keyboard selections/Escape, custom conversation actions, and actual Finder activation/Cmd-H dismissal checks. Cmd-Tab/AX-only attempts did not prove app activation. [History verification](../../qa-artifacts/team-foundation-20260906/build-0618/history-verification.json) records all four real JSON files semantically unchanged and the owner reports 24 restored conversations. These are owner receipts, not this reviewer's UI or history replay. The receipt describes local ad-hoc signing and no live evaluation; its `accountEnabled: null` is not evidence of an enabled/disabled account service. Rollback 0617 remains recorded.
- The most recent [live grounding review](../../qa-artifacts/council-grounding-20260906/REVIEW.md) records **execution 3/3, full-quality 0/3** on 0616. The 0617 word-budget checks are not a new quality evaluation and do not repair arbitrary unsupported premises by themselves. Swarm remains disabled; the website is local and unpublished.
- [RIVUNE_DIFFERENTIATION_PLAN.md](../RIVUNE_DIFFERENTIATION_PLAN.md) records current strategy/assignments, not measured superiority. [AI_TEAM_EVALUATION_PLAN.md](../AI_TEAM_EVALUATION_PLAN.md) and eight frozen prompts/separate rubrics are prepared; no evaluation has run. Root reports [check_candidate.py](../../qa-artifacts/team-evaluation-plan/check_candidate.py) prepared with 19 passing synthetic adversarial tests. That is checker evidence, not a live quality result. Evaluator files must stay outside future model input and tool-accessible workspaces: a private filename or presence in this repository is not access isolation. This review neither reads the withheld rubrics nor supplies them to a model execution context.
- [LAUNCH_AND_REVENUE_CYCLE.md](../LAUNCH_AND_REVENUE_CYCLE.md) and [CLOUD_AND_PRICING_PLAN.md](../CLOUD_AND_PRICING_PLAN.md) separate an informational project preview, verified downloadable beta and usable paid cloud service. Their offers/economics are planning hypotheses, not approved pricing, measured demand/revenue or activated services. Root holds the pending first-paid-offer and pre-revenue-budget questions. Website owner prepares the Pages source/workflow split without deployment; no purchase/payment/cloud activation follows from this review or plan.

## Frozen evidence and boundaries

### Checkpoint 4 — current frozen review target

[Checkpoint 4](../../qa-artifacts/team-foundation-20260906/checkpoint-4) contains 16 files independently matched before and after the retest to [source-manifest.json](../../qa-artifacts/team-foundation-20260906/checkpoint-4/source-manifest.json); manifest SHA-256 `ca0c4240bcd40ff646e8e95dfdf4911ec5b4ec83a9feed05de499f110fa11f41`. Only the coordinator, its tests and Theme changed from checkpoint 3.

| Changed checkpoint-4 file | SHA-256 |
| --- | --- |
| `Rivune/RivuneRunCoordinator.swift` | `2e5fcdeee68c0d959aca1f9005c54268948de5845c01eb4efa00f6ac9727bcda` |
| `RivuneTests/RivuneRunCoordinatorTests.swift` | `6699eaffb0361f9daaacae03c734e17ef966027372912ac2efc9aac61fab9d27` |
| `Rivune/Theme.swift` | `ce61bf506ef0b5d2ea07e396faf75d5843114a7e586b711f947351cf393c1a16` |

The fresh [12-case journal results](/private/tmp/rivune-checkpoint4-journal-independent-fet8zy6i/results.json) and [verified summary](/private/tmp/rivune-checkpoint4-journal-independent-fet8zy6i/verified-summary.json) pass every prior reproduction and both valid legacy controls. Temporary coordinator/runner/team copies match the frozen manifest. The 15-group checkpoint-3 runner evidence carries forward because runner/team sources are byte-identical; those checks were not unnecessarily rerun.

The subsequently supplied [checkpoint-4 test summary](../../qa-artifacts/team-foundation-20260906/checkpoint-4/test-summary.json) was independently read and confirms **276 passed / 0 failed / 0 skipped**; [final4 test log](/private/tmp/rivune-0618-final4-tests.log) records `TEST SUCCEEDED` at line 570. This is the later checkpoint's receipt, distinct from checkpoint 3. No app suite/build/UI/live provider was run here.

The Theme diff adds dismissal when `NSWorkspace.didActivateApplicationNotification` identifies a process other than Rivune. This is source evidence supporting F01, not rendered focus-lifecycle acceptance; the native owner retains UI control. Adapter/store sources are unchanged from checkpoint 3; the adapter's bounded checkpoint-4 freshness pass is recorded below with its probe-execution limit.

### Checkpoint 3 — preserved historical review target

[Checkpoint 3](../../qa-artifacts/team-foundation-20260906/checkpoint-3) contains 16 source files, all independently matched to [source-manifest.json](../../qa-artifacts/team-foundation-20260906/checkpoint-3/source-manifest.json); manifest SHA-256 `9088d1d629a4e2df81707a5c4b4c8a9947912629972eb540aaeffe19d99d9653`. Native owner subsequently added the exported [test summary](../../qa-artifacts/team-foundation-20260906/checkpoint-3/test-summary.json): **276 passed / 0 failed / 0 skipped**. The supplied `/private/tmp/rivune-0618-final3-tests.log` also records `TEST SUCCEEDED`. This reviewer did not rerun the app suite.

| Checkpoint-3 reviewed seam | SHA-256 |
| --- | --- |
| `Rivune/CouncilRunner.swift` | `ca8b244b1dd344c5a76fade0c7ec587b7fc9d0cde854a84e1379e46eb23b29de` |
| `Rivune/RivuneRunCoordinator.swift` | `c782dc47611a08b265281b6b811ee708c986fbcda71f031deb822c6ccb235aa2` |
| `Rivune/TeamConfiguration.swift` | `86d281c9b8e94bb984594713c41e87cfcccc3b4eb2a9d6e7adf966e145f05f72` |
| `Rivune/RivuneStore.swift` | `19b3bc48316d9ea0bcd06d17cd07a329e3faaa34877fe93eb561cbed1e6f5b96` |
| `RivuneTests/RivuneRunCoordinatorTests.swift` | `378d7d3280a8ea9d7013efd0d70e0b590c90839a01ddf779c60d3162ce643ad9` |

The [15-group runner results](/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-team-checkpoint3-adversarial-ydqcd5xu/results.txt) and [verification](/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-team-checkpoint3-adversarial-ydqcd5xu/verification.json) cover the prior 13 groups plus saved cardinalities 0/1/7 and invalid legacy provider/adapter/routeRef rejection. The [12-case journal results](/private/tmp/rivune-checkpoint3-journal-independent-igdy0aoj/results.json) and [source receipt](/private/tmp/rivune-checkpoint3-journal-independent-igdy0aoj/source-receipt.json) retain the eight earlier cases and add forged/empty member-ID failed/running controls. All frozen source hashes remained unchanged; harnesses use exact source with synthetic surrounding types/transports.

The store's frozen lines 263–266 now skip initial run-journal merging and conversation saving when the coordinator has a storage error, displaying its notice instead. That integration guard was source-inspected, not exercised through the app. Native UI QA and the adapter's source-timestamp correction review are separately owned; no installed acceptance is supplied here.

### Checkpoint 2 — preserved historical review target

[Checkpoint 2](../../qa-artifacts/team-foundation-20260906/checkpoint-2) contains six frozen files and an owner [test receipt](../../qa-artifacts/team-foundation-20260906/checkpoint-2/test-summary.json) recording **274 passed / 0 failed / 0 skipped**. The full app suite was not rerun here. All six files independently match [source-manifest.json](../../qa-artifacts/team-foundation-20260906/checkpoint-2/source-manifest.json), whose SHA-256 is `771c2cec16627d877d58de9d94ff4ccd8e09d0903618c052cf7d64f800cc7a7e`.

| Checkpoint-2 file | SHA-256 |
| --- | --- |
| `Rivune/TeamConfiguration.swift` | `86d281c9b8e94bb984594713c41e87cfcccc3b4eb2a9d6e7adf966e145f05f72` |
| `Rivune/CouncilRunner.swift` | `d31fe1082a525394c5b0fc07adc8c9e84a140bd8b1388c0db31892161e04cac7` |
| `Rivune/RivuneRunCoordinator.swift` | `aa0408c31946b407d20b4127663a74b315c40e25c338691428aba68c982f03fd` |
| `RivuneTests/RivuneRunCoordinatorTests.swift` | `acc1357da2a35a9552e7fd4605447ede3b8fcfd58abbd088ec0afaaed13c6a4d` |
| `RivuneTests/RivuneDeterministicTests.swift` | `7ef581ce693aa2386526c2464f9426367fae31d10cd28302c8f092e0373a285d` |
| `Rivune.xcodeproj/project.pbxproj` | `69d98e1f2afc8972450ccf9ce1365cdddc2e87c96fb6806f32061eb01fe15aa6` |

The [13-group runner results](/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-team-checkpoint2-adversarial-shygc3gs/results.txt) and [hash verification](/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-team-checkpoint2-adversarial-shygc3gs/verification.json) use exact runner/team files with recording transports. The separate [eight-case journal results](/private/tmp/rivune-checkpoint2-journal-independent-w8eybfo0/results.json) use exact coordinator/runner/team files with minimal surrounding types. Temporary copies match the checkpoint; frozen inputs remained unchanged. Compiling these small command-line harnesses is not an app build, UI inspection, real user-history incident or live-provider evaluation. Native Team UI/custom-control integration is separately reported in build/test, with no new installed acceptance supplied.

### Checkpoint 1 — preserved historical evidence

Native owner supplied [checkpoint 1](../../qa-artifacts/team-foundation-20260906/checkpoint-1) after four new types/storage/admission tests, with a [263/263 test summary](../../qa-artifacts/team-foundation-20260906/checkpoint-1/test-summary.json), zero failures/skips. Execution, selected-lead, retry and shared-gate paths are present, but their focused owner tests are being added. UI is not connected; default team admission is unavailable. The checkpoint is source evidence, not a new installed build.

All five files matched [source-manifest.json](../../qa-artifacts/team-foundation-20260906/checkpoint-1/source-manifest.json) independently. Manifest SHA-256: `f44f0568b4fd732645816978814884a1a0ddc11aab68e4afd91872a91eb018ba`.

| Checkpoint-1 file | SHA-256 |
| --- | --- |
| `Rivune/TeamConfiguration.swift` | `86d281c9b8e94bb984594713c41e87cfcccc3b4eb2a9d6e7adf966e145f05f72` |
| `Rivune/CouncilRunner.swift` | `3e87c9422cfe69c1c88266c816af14b9cac73baebd7f7bd8abfee4de6f94019a` |
| `Rivune/RivuneRunCoordinator.swift` | `d6d4eaced52867d0defaf6b416c2bcf2aa9a2e4eb30f729b0e212af7c97617ee` |
| `RivuneTests/RivuneRunCoordinatorTests.swift` | `3c6f29b6b8ec77364d1950cca659334b3ba7df0120b28b59ecf39b78f314f01e` |
| `Rivune.xcodeproj/project.pbxproj` | `69d98e1f2afc8972450ccf9ce1365cdddc2e87c96fb6806f32061eb01fe15aa6` |

Earlier working-tree reads changed during inspection and were excluded from a frozen-checkpoint verdict. Baseline runner reproductions use the exact archived 0617-era runner, SHA-256 `7acf04fdbefdc2d1383fa9ae3a205450bc03801a0cd57432ca729b49bbc3d7c2`, rather than a mixture of old and new code.

## Findings and hypotheses

### IR-01 — malformed saved Council records must reject before mutation — P2

**Closed for exact checkpoint 4.** Coordinator lines 86–91 apply the persisted legacy transport-ID/provider/adapter tuple before any running-state normalization. The fresh 12-case harness confirms all ten invalid records—including forged/empty IDs in both running and failed states—set a storage error, preserve original bytes and status, keep revision/publications at zero, reject retry and make zero provider calls. Valid legacy failed retry completes in two synthetic calls with nil team; valid legacy running interruption remains accepted without execution. The owner's regression fixture now includes `runningIdentity`; independent checks also cover blank IDs and failed-state controls. Closure was sent to native owner/root and clears this assigned source-review finding; it is not installed UI, adapter-capability or quality acceptance.

**Historical checkpoint-3 disposition follows; its remaining ID-binding defect is corrected in checkpoint 4.** Six earlier malformed journal cases set a storage error before normalization, preserve original bytes/status, retain revision/publications at zero, reject retry and make zero provider calls. Valid legacy failed retry completes with two synthetic calls and nil team; valid legacy running interruption remains accepted. All 15 bounded runner groups pass.

The additional journal cases use two distinct participants with known provider/adapter metadata and nil team/routeRef, but replace one historical transport ID with a forged or empty ID. A running record passes shared saved validation, is rewritten on initialization and becomes interrupted without a storage error. Failed-state controls preserve bytes and reject retry. Frozen [CouncilRunner.swift](../../qa-artifacts/team-foundation-20260906/checkpoint-3/source/Rivune/CouncilRunner.swift) lines 181–185 omit the ID-to-transport binding enforced by [RivuneRunCoordinator.swift](../../qa-artifacts/team-foundation-20260906/checkpoint-3/source/Rivune/RivuneRunCoordinator.swift) at retry line 240. No provider calls occur in these cases.

**Checkpoint-3 correction request, addressed and independently retested in checkpoint 4:** apply the coordinator's existing persisted legacy provider/adapter/transport-ID tuple validation before initialization normalization. Preserve valid historical IDs and leave any separate direct-runner identity semantics intentional. Native owner/root received the exact 12-case reproduction; the targeted correction and running-identity regression fixture are now frozen in checkpoint 4. This was a synthetic journal defect, not a reported user-history incident.

**Historical checkpoint-2 disposition follows; its cardinality/provider/adapter gaps are corrected in checkpoint 3.** The 13-group runner harness rejects duplicate, foreign and forged saved results with zero provider calls and retained original outputs. Successful answers count only distinct matching members. Configured and legacy runtime route/options mismatches reject before calls; same-CLI members, selected manager/stop/fallback, frozen retry and bounded repair remain accepted.

The coordinator harness independently reproduces these remaining cases in validly encoded nil-team legacy records:

| Case | Checkpoint-2 observation |
| --- | --- |
| Failed record with zero or one participant | `retryCouncil` returns without rejection, rewrites the journal and publishes running once. Runner subsequently fails its two-to-six-participant check; provider calls remain zero |
| Running record with one participant | Initialization rewrites bytes and normalizes the malformed record to interrupted |
| Running record with two participants but invalid legacy provider/route identity | Initialization rewrites bytes and marks interrupted. Its failed-state retry variant correctly rejects without mutation |

Frozen [CouncilRunner.swift](../../qa-artifacts/team-foundation-20260906/checkpoint-2/source/Rivune/CouncilRunner.swift) `validateSavedResults` at line 172 checks participant/result uniqueness and membership, but not saved cardinality or legacy route identity. Its cardinality guard at line 232 is later than coordinator mutation. Frozen [RivuneRunCoordinator.swift](../../qa-artifacts/team-foundation-20260906/checkpoint-2/source/Rivune/RivuneRunCoordinator.swift) normalizes running records starting at line 93 and mutates retry state at line 245.

**Checkpoint-2 correction request, addressed in checkpoint 3 for these cases:** use shared saved-participant cardinality and legacy route-identity validation before initialization normalization and retry mutation, while preserving valid historical identities. Reject malformed records with byte-identical journal, no status/revision/publication change and zero provider calls. The remaining checkpoint-3 ID-binding case is described above.

Passing journal controls: a foreign-result running record retained identical bytes and running status, set a storage error and rejected retry with zero publications/calls. A valid two-participant legacy failed record loaded without rewriting, retried only its missing draft plus synthesis in two synthetic calls, completed and retained `teamConfiguration == nil`. Valid legacy running records still normalize to interrupted without execution. Nested run/turn/prompt binding precedes mutations in initialization lines 81–85 and retry lines 220–224; that binding was source-inspected, with owner fixtures covering each mismatch, rather than independently exercised in this eight-case harness.

**Historical checkpoint-1 reproduction follows; its original three result defects are corrected in checkpoint 2.**

**Reproduced against exact checkpoint-1 runner and team sources in three recording cases.** Duplicate successful A results satisfy the two-answer rule even when B fails; a foreign saved member is included in synthesis; and a saved result using B's ID but conflicting provider/model/effort suppresses B's retry and enters synthesis. Frozen runner locations: result reuse 237–238, retry suppression 250, success count 266–267. [Checkpoint reproduction results](/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-team-checkpoint1-adversarial-5y39hngj/results.txt) and [hash verification](/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-team-checkpoint1-adversarial-5y39hngj/verification.json) bind these cases to the manifest above. Earlier [baseline reproduction results](/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-council-adversarial-2oprkeca/results.txt) remain separate evidence.

Checkpoint-1 coordinator journal loading validates top-level run ID uniqueness but not saved Council result membership/uniqueness. Configured retry checks the saved participants against the team but forwards `previous.results` without validating their identities before journal/status/publication mutation. See frozen [coordinator](../../qa-artifacts/team-foundation-20260906/checkpoint-1/source/Rivune/RivuneRunCoordinator.swift), load 72–87 and retry 199–230. This is static reachability, not a reproduced full-app crash or user-history incident.

**Checkpoint-1 correction request, now addressed in checkpoint 2 for these cases:** validate unique saved result IDs and exact membership/identity against frozen participants before retry provider calls and before coordinator mutation; derive success from distinct accepted members. Also validate nested Council run/turn/prompt binding to the enclosing journal run and chat turn. Reject foreign, duplicate or option-conflicting results while preserving the original record. The earlier related all-foreign-results/empty-lead-list crash was a source hypothesis, not a reproduced full-app defect. The remaining checkpoint-2 participant-validation defect is described above.

### IR-02 — baseline retry can execute options that disagree with its record — P2

**Reproduced baseline seam; closed for the configured checkpoint-1 runner path by independent retest.** Keeping B's recorded identity unchanged while changing its separate route/model/effort was accepted by the old runner and executed the changed options; A's successful draft was reused. Baseline 209–215 compares identities, while 314 executes route/options. The legacy coordinator reconstructs options from recorded identity and may prevent this route in normal use; this is not a claim that ordinary UI retries currently drift.

Checkpoint 1's `TeamRunConfiguration.matches` rejected the forged route/model/effort before any call in the execution harness. A full failed-member runner retry after Codable roundtrip also retained A and repeated only B with its original requested options, then selected B for synthesis. Full app restart/composer and literal legacy-journal checks remain required; the harness is not those checks. Preserve the explicit legacy resolver rather than silently upgrading old records.

### Known integration work, not new defects

The moving store/browser submission extension had no new team UI/evidence wiring during the preliminary read. The native owner explicitly identifies checkpoint 1 as types/admission before UI hookup; default unavailable admission is intentional. These unfinished paths are not separate regressions. Adapter owner is independently reviewing actual route/model/effort evidence; no capability or account entitlement is inferred from a synthetic supported-option set.

Adapter owner found no blocking exact-tuple source defect in checkpoint 1: full option-pair membership and stale/future/duplicate/not-ready rejection are explicit, and nil/nil is an intentional ready-route default. Its production evidence-builder qualification is still pending; a fixture deriving supported options from its requested team proves no real model/effort capability. A minor disclosure concern remains: coordinator line 284 displays the requested model without explicitly labeling it requested/unresolved. The adapter owner sent that suggestion to native owner.

**Historical adapter-owned concern, now closed at the bounded checkpoint-4 admission/getter seam:** the earlier moving-source report identified getter restamping of `observedAt: .now`, potentially re-aging stale readiness/default choices and extending cache validity, plus a missing nonnegative age bound. It was recorded provisionally and not promoted to an app reproduction. This reviewer did not duplicate the adapter-owned audit.

### Adapter freshness — checkpoint-4 bounded pass

**Plan unified AI accounts app** reports independent verification of all 16 manifest hashes and **19/19 passing Swift checks**, using the exact frozen `TeamAdmissionEvidence` and `RivuneStore.teamAdmissionEvidence` source extracted into stdin with minimal type doubles. This is an adapter-reviewer result, not an additional run by this document owner. No app initialization, credentials, install, shared-file edits, live CLI/file-cache reads or full 276-test rerun occurred in that check.

Cases cover fresh defaults/options; stale/future/missing metadata rejecting explicit options; stale/future readiness rejecting defaults and explicit options; not-ready rejection; separate provider ages; the exact seven-day readiness boundary versus one second beyond; and repeated getter reads preserving both readiness and metadata timestamps. The reviewer closes the admission/getter restamping defect, not model entitlement, installed behavior or release readiness.

The reviewer statically traced original cache modification time and future/older-than-seven-day rejection in frozen `ProviderRegistry.swift` lines 612–620; timestamp transfer for Codex and successful Claude help observation in `TerminalAIService.swift` lines 140–148; Store snapshot retention at line 115 and readiness assignment stamping at 79–82; and evidence requests at coordinator start/retry lines 149/241. This trace is distinct from actual probe execution.

| Frozen freshness source | SHA-256 |
| --- | --- |
| `Rivune/TeamConfiguration.swift` | `86d281c9b8e94bb984594713c41e87cfcccc3b4eb2a9d6e7adf966e145f05f72` |
| `Rivune/RivuneStore.swift` | `19b3bc48316d9ea0bcd06d17cd07a329e3faaa34877fe93eb561cbed1e6f5b96` |
| `Rivune/ProviderRegistry.swift` | `ab730234fe612e160fda358234a6c3982bdb3557e19bb6b4592f1d103744b98f` |
| `Rivune/TerminalAIService.swift` | `b78b67ffd65d15173674f61caf8668f0177d634b92b898af82f6719f66d00e31` |

**Remaining scope limit:** actual CLI probe observation plumbing is in `StartupReadiness.swift`, which is absent from checkpoint 4's manifest (also confirmed by this document owner). The reviewer found assignments in the moving workspace at lines 113–142 but does not claim frozen end-to-end probe execution.

**Evidence location supplied by the adapter reviewer:** **Plan unified AI accounts app**, task `01a051fa-f42b-7501-b83b-44a75dc29634`, execution session `45323`; completion chunk `4c222b` contains the 19 PASS lines and `RESULT 19/19`, and initial chunk `c3e5da` contains the 16/16 manifest verification. The harness used Ruby extraction into `xcrun swift` stdin; no standalone receipt/output file was created. These transcript references come from the reviewer's handoff and were not independently replayed here; no file path or public share link is invented.

## Independent focused checks completed

**15/15 focused cases passed** against unmodified checkpoint-1 `TeamConfiguration.swift`, with minimal surrounding type stubs and a synthetic held transport. The fifteenth case injects an unwritable parent directory during an atomic preset save. [Harness and receipts](/private/tmp/rivune-ai-team-independent-h37xuyhb), [latest results](/private/tmp/rivune-ai-team-independent-h37xuyhb/run-2/focused-checks.json), [checkpoint binding](/private/tmp/rivune-ai-team-independent-h37xuyhb/checkpoint-1-binding.json). The original 14-case receipt is retained.

The cases cover distinct same-route members/options; identical options with separate IDs; duplicate IDs; orchestrator/fallback references; invalid limits/workflow/version; unsupported explicit options versus nil defaults; stale/future/duplicate route evidence; conflicting runtime identity/route/options; saved-team reopen and 0600 permissions; malformed/oversized/future-version storage remaining byte-identical after rejected saves; isolated memory storage; global two/per-route one gate bounds; queued cancellation; no provider invocation for cancelled waiters; and releasing capacity after cancelled late results.

The permission-denied atomic save preserved both the original bytes and decoded preset. The harness does not qualify real adapter advertisement, shared app admission, full journal recovery, UI, provider execution or factual answer quality; disk-full and every other filesystem failure are not simulated.

The exact checkpoint runner harness separately passed seven groups: same-route distinct options with selected B/independent drafts; identical options with distinct IDs; frozen failed-member Codable retry; rejection of route/options drift; `.stop` after selected draft or synthesis failure; ordered A → C → B fallback with failed drafts skipped and unlisted D excluded; and selected-member one-repair/terminal-no-retry behavior. Its three malformed-result cases reproduced IR-01, so this is not an all-pass execution verdict. Earlier baseline checks remain separately recorded.

## Adversarial acceptance matrix

| Case | Trigger and required observation | Evidence state |
| --- | --- | --- |
| T01 — repeated CLI | A/B share a route with different explicit options; also repeat with identical options. Distinct member IDs, one request/result each, identical initial prompt/context, no peer drafts | Independent type and exact-checkpoint runner checks passed |
| T02 — invalid identity/route/options | Duplicate/empty IDs, mismatched route tuple, unknown explicit setting, stale evidence or forged participant options. Zero transport calls and no journal/revision/publication change | Type checks passed; coordinator/adapter qualification pending |
| T03 — chosen orchestrator | Selected B drafts independently, then alone receives all complete successful drafts in a separate synthesis call; appointment records B and its frozen options | Exact-checkpoint recording check passed |
| T04 — stop policy | Selected draft fails while two other drafts succeed; separately fail selected synthesis. `.stop` preserves work and never invokes an unlisted replacement | Exact-checkpoint recording checks passed |
| T05 — ordered fallback | A fails, then saved C/B order; skip ineligible entries with explanation; no rotation or unlisted route/model; appointments retain actual identities | Exact-checkpoint A → C → B check passed, unlisted D excluded |
| T06 — frozen retry/restart | Fail B, edit composer, reload journal and retry. Only B's draft repeats with original route/model/effort; successful A stays identical; synthesis uses the saved policy | Runner Codable roundtrip passed; full store/journal restart and composer integration pending |
| T07 — unavailable retry | Remove route or explicit option support after failure. Reject before status/time/revision/journal/publication changes; preserve saved work. Nil stays disclosed default | Adapter's 19-case frozen admission/getter checks pass for stale/future/missing/not-ready evidence and timestamp retention; coordinator start/retry evidence request is source-traced. Live probe and integrated retry qualification remain separate |
| T08 — malformed storage | Invalid/truncated/oversized/future-version team file; rejected read/save retains exact original bytes and launches nothing | Independent focused checks passed; full UI handling unqualified |
| T09 — write failure | Existing valid preset then fail an atomic save. Retain previous bytes/configuration; no false saved state; isolated previews use memory storage | Permission-denied atomic-save preservation passed; app UI and disk-full unverified |
| T10 — forged limits | Negative/inflated caps, unsupported workflow/version, invalid fallback IDs. Hard local limits win before calls and no Auto/Swarm admission | Independent type checks passed |
| T11 — shared gates | Two concurrent Council runs, repeated routes, draft/synthesis/fallback/repair. At most two total calls and one per route; no starvation from blocked same-route head | Narrow gate checks passed; integrated multi-run check pending |
| T12 — cancellation | Cancel queued, granted-before-provider, running, synthesis and repair; deliver late success/failure. No late launch/final overwrite, retained completed work and reusable capacity | Queued/running wrapper checks passed; full coordinator phase checks pending |
| T13 — corrupt results/participants | Duplicate/foreign/conflicting saved results, malformed legacy participant lists and nested run/turn mismatch. Reject before calls/mutation; never manufacture two independent answers | IR-01 closed in checkpoint 4: ten invalid journal cases preserve bytes/status/revision with zero publications/calls; unchanged runner retains 15-group evidence. Nested binding remains source-inspected with owner fixtures |
| T14 — terminal length repair | Original/repair retained, one repair using appointed member/options; restart/retry cannot spend another repair. Invalid output remains distinct from word-count pass | Configured selected-member recording check passed; integrated restart unverified |
| T15 — legacy Council | Literal pre-team JSON without routeRef/team/budget fields decodes/renders/retries with original IDs, rotation and absent new claims; malformed legacy records still rejected | Checkpoint-4 synthetic legacy retry completes with nil team and valid running records interrupt; invalid persisted IDs reject before init mutation. Unchanged runner retains old IDs/rotation/retry evidence. Earlier 0617 rendering/history retained; full installed restart unqualified |
| T16 — duplicate request identity | Reuse request ID with changed team/orchestrator/options; reject conflict or return only an exactly matching frozen request. No silent reuse of a different team | Coordinator 117–119 compares team even with identical requestKey. Future browser extension early-return path must preserve this check when team input is wired; current path has no team input |
| T17 — historical modes | Saved Direct/Together records retain modes and outputs; selected-answer artifact identity remains unchanged by team configuration | Existing receipts retained; integration regression check pending |
| T18 — evaluation isolation | Eight prepared prompts/withheld rubrics/checker are never attached as repository context. Verify actual copied prompt and tool scope before any future trial | Prepared rule only; no evaluation dispatched |

## Checkpoint coordination

Native owner supplied checkpoints 1–4 with source manifests. Checkpoint 4's exact retest closes the reproduced IR-01 defects; its log and exported summary confirm suite success. Adapter owner supplied a separate bounded freshness pass, with actual probe observation outside the frozen manifest; this review records it without duplicating the audit. Native Team UI integration continues separately. Actionable findings and closure verdicts go directly to native owner and root, with source/fixture scope stated. Under the user's current coordination preference, all product questions/decisions route through **Audit Rivune native app**; this task continues its authorized bounded work without asking the user separately.

Root reports all four existing tasks active and the existing 30-minute heartbeat updated for checkpoint review and single-owner files/UI. That is coordination state, not implementation or evaluation evidence. This reviewer does not create another monitor, modify evaluator files or reopen completed work without a concrete review target.

Root's earlier isolated prototype review found a buried orchestrator picker and misleading “2 calls total” concurrency wording. That is historical prototype evidence; browser prototype work is now stopped, and assigned owners are working in the native app. This review did not repeat UI inspection. Neither prototype progress nor checker tests qualify native execution.

This bounded source-review correction is complete. Further integration acceptance retains the distinction between source tests, integrated behavior, installed UI and live quality. No blanket feature or release approval follows from IR-01 closure, the owner-reported app test count or the independent harness count. Wait for a concrete next checkpoint or owner evidence instead of repeating unchanged audits.

## Installed-app controls and focus lifecycle — bounded 0618 owner evidence

**IR-01 source correction is closed at checkpoint 4.** The owner now supplies bounded 0618 focus evidence described above; that does not close every case in the matrix below. The original separate-menu/app-switch symptom and root's earlier native-menu/source observations remain historical. This reviewer did not operate the UI. The new Settings increment below keeps the main native owner in control of UI acceptance.

The previous custom-control increment used this ownership; the new Settings increment below supersedes its routing/appearance assignments:

| File/surface | Assigned owner | Review boundary |
| --- | --- | --- |
| `Theme.swift` shared control primitive and focus modifier | Root's `team_quality_eval` subagent | Shared lifecycle primitive only; owner provides integration/checkpoint evidence |
| `SidebarView.swift` | **Review and update website daily** | Sidebar control replacement in the native app; earlier web prototype does not count as installed acceptance |
| `SettingsView.swift`, `UniversalAPIView.swift` | **Plan unified AI accounts app** | Assigned custom controls in those files; preserve existing guarded actions |
| Components, Workspace, team/integration/build | **Update Rivune product direction** | Main native owner coordinates integration and exclusively owns the native UI until release |
| Independent review and ledger | **Summarize current work** | Document checks now; stable-source retry review first. No concurrent native UI control, installs or source edits |

The following cases are **prepared acceptance checks, not tests performed here**. Record the installed build/source identity, actual menu, triggering app/window transition, focus owner before/after and rendered/AX evidence. Run installed UI cases only after the main native owner releases it.

| Case | Action | Required observation |
| --- | --- | --- |
| F01 — application resigns active | Open each affected menu/popover, then switch to another app by keyboard and by clicking its window | Rivune's transient content dismisses; no menu/panel remains above the other app. No app reactivation, focus steal or action execution accompanies dismissal |
| F02 — parent window resigns key | With Rivune still active, move key status to another Rivune window; also check the transition to a legitimate system dialog | Transient content belonging to the old parent dismisses. Ownership uses the actual parent window, not any unrelated window notification. Existing modal/file-dialog workflows retain their intended behavior |
| F03 — dismissal cannot reactivate | Trigger focus loss while a menu has keyboard focus or a deferred callback, then wait for queued UI work | Dismissal and deferred focus restoration never call the inactive app/window back to front. The user's new app/window remains focused; reopening requires an explicit user action |
| F04 — reopen and keyboard focus | Return to Rivune explicitly and reopen the same control; navigate by keyboard, activate a valid item, then reopen and press Escape | Focus enters the intended control/item, selection targets the correct row, Escape closes once and returns focus to the invoker only while its app/window is active. Repeated open/dismiss cycles do not accumulate handlers or duplicate popovers |
| F05 — disabled/destructive guards | Check disabled actions and an action whose preconditions change while the menu is open, including busy/save/run transitions | Pointer, keyboard and retained callbacks cannot bypass disabled/destructive guards. Focus-loss dismissal never invokes an action. Existing review/confirmation and state validation remain intact |
| F06 — unique identifiers and independent controls | Exercise repeated model/provider labels, several menus and multiple windows; inspect control/item identifiers and selected states | Each instance/item has a stable distinct identity; no duplicate identifiers, cross-window dismissal, wrong item activation or reused selection state. Identical visible labels do not collapse distinct members |

Source review should confirm subscriptions/observers are scoped and released with their owner and that any queued focus work checks current activity/window ownership before acting. That is a checklist, not a claim the new modifier implements it. Focus acceptance does not replace the independent corruption/retry, legacy-history or provider-gate checks above.

## AO-05 checkpoint review

Root approved a bounded immutable-artifact continuation increment, with native submission/caller hooks and frozen file context across supported run phases. The implementation owner supplies the stable manifest and recording evidence. **V2 frozen checkpoint accepted at the bounded source/recording level; AF02 closed after the targeted correction and 8/8 independent guard/filesystem checks.** See the [review and case dispositions](../../qa-artifacts/native-product-audit-20260906/ao05-checkpoint-review/REVIEW.md). The table below retains the original acceptance criteria, not an assertion that all checks passed. They do not reopen unchanged CP4 cases or expand the approved schema/worker scope. No TeamConfiguration field change is assumed.

| Case | Evidence required from the stable checkpoint |
| --- | --- |
| AF01 — immutable selection | Select a valid artifact revision, then change visible selection or original response. The submitted request retains the exact selected files, source/revision identity and complete content; no silent rebinding to another artifact |
| AF02 — validate before mutation | Load a persisted selection with an invalid digest, unsafe/duplicate path, unsupported file, invalid version or inconsistent identity. Rejection precedes run normalization, journal rewrite, publication and provider activity; preserve original bytes and expose a bounded recovery state |
| AF03 — nil compatibility | Old draft/turn/run data without the new optional selection decodes and follows its existing path. Ordinary web/bridge requests do not acquire artifact consent or a selected revision implicitly |
| AF04 — shared admission | Exercise the actual shared native submit entry with a malformed/over-budget selection. It rejects before dispatch even if the caller bypasses the visible chip/action; no backend endpoint or capability expansion is inferred |
| AF05 — every supported phase | With the larger-than-history-budget sentinel fixture, record actual provider-bound requests for each supported draft/review/synthesis/repair phase. Every phase gets complete selected files or fails explicitly before its call; inspecting only the first request is insufficient |
| AF06 — late overflow | Accumulated contributions make a later request exceed its existing envelope. Reject explicitly before that provider call, preserve earlier outputs and the immutable selection, and retain an actionable partial/failure state. Do not raise global budgets or clip files silently |
| AF07 — retry binding | After partial failure and serialization/reload, retry uses the same valid selected revision/content and preserved successful outputs. Tampered persisted selection is rejected before retry mutation or provider dispatch |
| AF08 — drafts and restart | Selection/chip and draft survive the supported persistence cycle together. Switching chats/new draft cannot attach A's files to B; removing selection affects only the intended next request and does not erase a prior run's provenance |
| AF09 — supported workflows | Supported direct/team workflows carry the selection through their real builders. Any unsupported legacy/web/bridge workflow remains explicit and cannot silently drop selected files while claiming continuation |
| AF10 — disk boundary | Continuation adds model context only. Existing reviewed save, external-edit/conflict checks, path/extension limits and no-implicit-write behavior remain intact; a selected snapshot does not authorize overwriting newer disk files |

Use exact frozen source or extracted builders with recording transports and declare every seam/type double. Bind final native tests and rendered evidence to their actual executable, separately from this source checkpoint. UI remains with root during its bounded inspection recovery; no direct UI work is performed here until explicit handoff.

## Next increment — in-window Settings, account footer and appearance

**User-approved increment installed as corrected 0619; bounded acceptance and remaining coverage are recorded in the product audit.** Root relays the user's screenshots showing a separate Settings window and missing account footer. Settings must live inside the main window and open consistently from the sidebar, app menu and Command-comma. Returning preserves the selected chat/project, draft and run. Add sidebar-bottom account identity/status and optional Graphite/Orbit/Cosmos appearance presets while preserving existing appearance preferences. The [0619 source assessment](NATIVE_APP_PRODUCT_AUDIT.md) records safeguards and the remaining evidence for this matrix; it does not constitute complete acceptance or reopen checkpoint-4 IR-01 and its unchanged test runs.

| Assigned scope | Current owner |
| --- | --- |
| Root/RivuneApp, Settings routing, integration/tests/build and native UI | **Update Rivune product direction** |
| `SidebarView.swift`, including account identity/status footer | **Review and update website daily** |
| Theme and Settings Appearance section | Root's assigned appearance subagent |
| Independent frozen review, synthetic recording harnesses, these records and the separate native product audit | **Summarize current work** |

Use the owner's declared return-navigation contract; do not invent a new Escape/Back shortcut. The cases below are the prepared acceptance requirements; source-supported coverage and gaps are now recorded in the [0619 assessment](NATIVE_APP_PRODUCT_AUDIT.md). No complete S01–S11 pass is claimed. The native owner supplied saved rendered evidence for the corrected increment; this reviewer inspected it. Remaining direct UI coverage requires an explicit handoff.

| Case | Trigger and observable acceptance |
| --- | --- |
| S01 — one Settings destination | Sidebar, app menu and Command-comma each open the same Settings route in the current main window. Repeated activation creates no separate window or duplicate navigation state |
| S02 — preserve unfinished work | Enter/return from a selected chat/project with an unsent draft and supported attachments. Preserve exact text, attachments, selections and run identity; navigation neither submits nor discards work |
| S03 — keyboard return | Open with Command-comma, navigate controls, and invoke the documented return control by keyboard. Restore a usable prior focus location without redirecting typing or firing a hidden action |
| S04 — run completes in Settings | Hold an existing run with a recording transport, enter Settings, then deliver its result. Returning shows the same run's progress/result exactly once, without restart, cancellation, duplicate provider work or mutation of another chat |
| S05 — route/persistence consistency | Change an explicitly chosen setting, return, then reopen through another entrypoint. Display the same persisted value; entering/leaving alone changes no preference or conversation state |
| S06 — account versus CLI status | Use local-only/CLI-ready, signed-in-account/CLI-unavailable, and both-unavailable fixtures. Footer and Settings agree on app-account state while clearly separating provider readiness; account footer actions route to the intended account destination |
| S07 — no implicit authentication | With recording auth/provider adapters, open Settings/account through each route. No sign-in session, external auth browser, account creation, model request or credential write starts without its explicit initiating action; ordinary displayed status must not imply authentication |
| S08 — no stale/cross-account identity | Inject A → signed-out → B transitions and delayed A status completion. Footer, Settings and account-related detail show only the current account/local state; late A data cannot restore A's identity or details |
| S09 — no secret presentation | Seed synthetic credentials with recognizable sentinels. Footer, Settings, accessibility labels, errors and newly emitted diagnostics expose no credential/token sentinel |
| S10 — preserve legacy appearance | Load existing appearance settings and a legacy fixture without new preset keys. Opening Settings leaves the prior appearance intact and does not silently select/persist a preset or overwrite unrelated settings |
| S11 — optional preset round trip | Explicitly select Graphite, Orbit and Cosmos. Each choice survives navigation and the supported persistence cycle, keeps controls/readable focus usable, and leaves chat/project/draft/run state unchanged |

Request the stable source manifest, relevant owner test receipt and declared route/return behavior with the checkpoint. The main owner currently holds native UI after this reviewer explicitly released CUA for 0619 acceptance. The separate product audit controls only an identified isolated QA clone after an explicit handoff; it does not control the installed user app or exercise real auth/providers. Source-only account fixtures cannot establish live account lifecycle. Website publication, first paid offer and pre-revenue budget decisions remain pending through root; the user's approval of this native increment authorizes none of those adjacent actions.

## AO05/AO02 v2 correction accepted

[Bounded v2 review](../../qa-artifacts/native-product-audit-20260906/ao05-checkpoint-review/v2/REVIEW.md): all 15 hashes verified against manifest `711c170ab0adce7f802516bdd2dcfc0a4d1f3b523b8cc3dd6891c93123cf97c1`; only Store guard and regression test differ from v1. Independent exact-extraction checks passed 8/8: six malformed-container cases preserve primary/backup bytes and block fallback/save; two healthy-primary precedence cases remain allowed. **AF02 P2 closed.** Supplied native XCTest is 297/0/0. Proceed to next local QA build; rendered AO05 and separate polish remain unreviewed. Installed0619 unchanged; no new UI/provider/install operation. Earlier v1 blocker entries are historical.

## Installed 0620 result

Build 2026090620 is installed and independently identified by version, build, executable hash, and strict signature verification. The [final build review](../../qa-artifacts/native-product-audit-20260906/build-0620/REVIEW.md) binds the 45-file source manifest, canonical 297/0/0 test result, and rendered continuation/focus/fallback evidence. AF01–AF10 and AO02 are accepted at their documented bounds. The remaining boundaries are live provider semantics, live account flows, broader whole-app accessibility and failure journeys, Developer ID/notarization/update delivery, and public release.

## Phone remote source audit

The frozen 12-file phone snapshot matches its manifest. The [independent review](PHONE_REMOTE_INDEPENDENT_REVIEW_20260907.md) accepts the owner audit's conclusion that current encrypted local pairing is not yet a durable remote for the Mac workspace. P1 blockers are route/model/provenance mismatch, missing Mac host admission, request IDs without immutable request binding, and disconnect/navigation cancellation. Council/Team, complete artifacts, protocol negotiation, physical-device behavior, and away-from-home transport remain unimplemented or unaccepted. No current phone-release claim is permitted.
