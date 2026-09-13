# Results parent lifecycle — independent source review

2026-09-10. Bounded PASS for selected-identity invalidation, session/controller lifetime, navigation outcome handling, exact-text/copy lifetime and mounted-chat/draft preservation in the inspected eight-file delta. No source-level blocker found in those paths. This does not close all integration/scroll/layout acceptance: the proposal's Results-list scroll restoration remains absent, and rendered observations belong to the independent UI reviewer.

## Exact boundary

All eight current files match RESULTS_PANE_INTEGRATION source-hashes.json; four available baseline copies match their recorded hashes. All 13 current durable foundation files independently match the current foundation source-hashes.json. Neither foundation nor product files were edited. Captured eight-file snapshot, scoped patch and detailed foundation hash comparison are retained beside this report. End drift: none.

## Parent lifecycle findings

- HostWorkspace creates one session via results.attach when creating a connected controller in the bridge-keyed effect. Cleanup calls detach (which disposes the inspection generation and invalidates scheduled focus), unsubscribes, and disposes the lifecycle/controller. Bridge replacement is hidden immediately by the attachedBridge identity gate, before effect cleanup. No inspection occurs merely on list open.
- Controller subscription calls results.reconcile(next) before setState(next). Reconcile closes on disconnect/missing snapshot/changed conversation owner and clears any selection whose full conversation/request/artifact/digest tuple vanished. A separate render-time validSelection gate returns list state before cleanup effects, preventing one stale ready render even if subscription reconciliation is bypassed.
- Results select checks visibility and membership against the active conversation's authoritative summaries. Controller inspection provides the accepted parser/adapter validation; local session generations suppress A/B, same-tuple reopen and cleared/disposed late outcomes. Failure state contains no previous result.
- run(action, focus) closes Results only after the navigation action resolves. Rejected open leaves the pane intact while current conversation stays unchanged; a changed authoritative activeConversationID independently closes it. Choosing mobile Conversations or Chat explicitly closes Results, as specified; that action is not a failed conversation navigation.
- Chat remains mounted. Narrow Results sets inert and aria-hidden on Chat and applies visibility:hidden rather than conditionally unmounting it. Draft state is unchanged by Results open/read/back/close. The hook captures transcript scroll on open and restores it on close when restoring focus; successful conversation navigation intentionally follows normal Message focus handling.
- ExactText is keyed by full tuple and uses layout-effect open/close for copy lifetime, improving the proposal's passive cleanup. Existing helper captures copy bytes at invocation and fences late notifications. Back/Close remove the old inspector synchronously through state; issued clipboard writes cannot be cancelled, but stale completion/failure UI is suppressed. No clipboard or React execution was performed here.
- Close focus uses a generation-checked animation frame and exact stored opener, falling back to chat heading if detached/hidden/inert. Later open/detach invalidates the callback. Frozen run labels derive from admitted mode/status; Constellation delta adds explicit member ID and adjusts existing SavedResult label strings without replacing its component or copy behavior.

## Actual assertions versus receipt

Read five selected mounted cases and selection wiring; did not run a browser, native compiler or repeat functional suites. Owner verification reports 5/5 at 320,390,1280, which is not independent rendered evidence from this review.

Flow asserts no inspection on list open, heading/row/opener focus, same Message node and draft, inert/visibility under 1000px, and preserved transcript scroll/no save/submit. Race case covers delayed A, same-tuple late error, duplicate retry, mismatched result and unmount/remount late completion. Invalidation tests remove/change digest while inspection is loading, then reject late content. Source render gate also protects already-ready content, but there is no dedicated ready-content-removal assertion here. Copy case checks captured write, disabled Copying state, stale success after switching results, and failed-copy manual selection.

Navigation qualification: failed open is exercised only above1000px. At narrow sizes the test directly updates activeConversationID and emits a snapshot; it proves closure on authoritative owner change, not an actual narrow navigation click/rejection. The receipt's shared cross-viewport five-case count must retain that distinction. Detached-opener fallback, disconnect while ready, and breakpoint-resize timing are source-inspected but not individually asserted in these five cases.

## Remaining proposal obligation

Results-list scroll is not captured/restored on list/detail/back transitions. Only Chat transcript scroll has explicit preservation. The proposal README required row-list scroll restoration before full integration acceptance. Treat this as a P3 integration gap: retain list scroll separately and add a long-list Back regression, or explicitly revise that acceptance scope. Exact row focus restoration is useful but does not prove preservation of the prior scroll offset. Desktop minimum Chat width around the replacement breakpoint also remains a rendered/layout review responsibility; source uses proportional columns rather than an explicit480px minimum.

No foundation/export/native/provider/release acceptance is inferred. Next dependency is independent rendered review plus disposition of the Results-list scroll obligation and appropriately qualified test evidence. All report/copy writes are under this review directory.

## Eight captured SHA-256 values

- prototypes/ai-native-workspace/src/host/ResultsPane.tsx: `a5abfab7a24aa8061138de8a83f7db4eba72c21fb168e8fbe299e4de436cd065`
- prototypes/ai-native-workspace/src/host/ResultsPane.css: `97254a705b9b2e2f2c743cd587e374622512e291863906555bd22c8feeb29f6f`
- prototypes/ai-native-workspace/src/host/inspectionSession.ts: `fcf34ae121d8e4ab349ea85195067323e6ffafd6d0f6f974779ca025c8782ccd`
- prototypes/ai-native-workspace/src/host/useHostResults.ts: `10580a34ad86a96d629f9d5d1d39fa128980714b954d8d1c9f73539446e6e739`
- prototypes/ai-native-workspace/src/host/HostWorkspace.tsx: `2be09a87d9193c71e073c47c561aaf9d669c26e6c20da1ed8bd890507567293b`
- prototypes/ai-native-workspace/src/host/Constellation.tsx: `118e5315b37db307ba3327d89d6783168304ad73aefe7787e823ee4433953f37`
- prototypes/ai-native-workspace/tests/hostRenderer.test.tsx: `5e8fd184689fe8e95357415d2501bc5d60ecb7ff6a74b31be3b2e1352951868b`
- prototypes/ai-native-workspace/tests/rendererScenarios.ts: `5cab789632b250ba63f154e77365ed3dcdfc8e40e9b527781678009da125c086`

## Narrow correction closure

../results-correction-review/REVIEW.md closes the Results-list scroll P3 and verifies corrected focus visibility, matching1200px breakpoints and expanded actual navigation/ready-invalidation assertions. Browser execution remains separate.
