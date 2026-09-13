# Results component proposal — independent logic review

2026-09-10. Bounded PASS for inspected proposal/session logic under its stated parent contract. No actionable component defect found. Not production integration, rendered React, focus, clipboard or native acceptance. No author correction request is needed from this review.

Read ResultsPane.tsx, inspectionSession.ts, README.md, session-check.cjs, evidence.json and the existing savedResultCopy helper. Ran only the existing deterministic session-check.cjs: PASS 5 (A/B late response, same-tuple close/reopen late failure, duplicate pending retry, disposed outstanding response, foreign identity). No typecheck, browser, native, provider, server or clipboard operation was performed. Snapshot and hashes are retained beside this report; production/proposal files were not edited.

## Selected identity and generation

Session open captures selected metadata with a separate origin object before inspection, builds a scalar request and increments generation. A result must match the full captured artifact/conversation/request/digest tuple. Late success/failure after a newer open, clear or dispose does not publish. Loading carries no previous result. retry changes error to loading synchronously, so a second pending retry is ignored. Full schema/byte/digest validation belongs to the injected accepted adapter, explicitly documented; the session's tuple comparison is defense in depth.

Dispose invalidates outstanding tickets, but is not a permanent closed-state guard: the owner must stop calling the disposed session. This matches its stated owner-lifecycle usage and is not counted as a current defect. Published state/result objects remain owner-managed React data and must be treated immutably.

## Text and React state

ExactText is keyed by the selected tuple and mounted only in ready state. Switching tuple or moving to list/loading unmounts the old inspector; its effect cleanup closes the copy generation. The helper captures the string when Copy starts and suppresses old callbacks after close/open, so a newer result cannot replace bytes in an already issued copy. An already dispatched OS clipboard write cannot be cancelled; only stale status/focus callbacks are fenced. No clipboard execution was performed here.

Under the validated immutable-content tuple contract, the same tuple cannot legitimately acquire different text. The component relies on this and on the parent rejecting stale selected metadata before rendering. It is not a standalone validator. A same-tuple snapshot update does not move heading focus because the effect keys only on tuple; Back requests list state and restores the previous row or heading if absent. Initial mount requests heading focus. These are source observations, not rendered focus proof.

## Explicit parent responsibilities, not component defects

The README clearly assigns visibility and one session per owner lifecycle; synchronous clear on Back/Close/successful conversation switch/disconnect/metadata invalidation; no clearing for failed navigation; active-conversation filtering; complete selected-tuple reconciliation before render; frozen run labels; opener/fallback focus; responsive replacement layout; keeping Chat mounted/inert; and scroll restoration. ResultsPane invokes onBack/onClose rather than owning these actions itself. Stale content is possible if an integrator omits those responsibilities, so acceptance must test the actual parent wiring before mounting in production.

Escape is scoped to the pane event subtree and respects defaultPrevented; portalled dialogs require the documented parent propagation boundary. There is no focus trap. Existing SavedResult remains independent. Preview text is a read-only textarea, not HTML/Markdown execution. No read or copy happens merely from list mounting; read is on session open and copy is explicit.

## Next dependency

Accepted foundation including native provenance/truncation corrections, followed by sole-builder parent integration and selected fake-host rendered tests. Do not infer those semantics from this proposal's older available/plainText summary shape. Reconcile any changed contract/DTO hashes and expose required truncation/provenance wording before integration acceptance. Test the documented parent conditions plus delayed copy completion, mount/unmount timing and keyboard focus in the mounted system.

## Exact proposal and dependency hashes

- qa-artifacts/results-ui-cases-20260910/component-proposal/evidence.json: `6eaabccc54e0065e9f589c2cb80bcb90b06509697e9bda815d30e9400b6844c9`
- qa-artifacts/results-ui-cases-20260910/component-proposal/ResultsPane.tsx: `b9fc256b879b632778d33789ae9a6bd56a3fe99bbff4ea931561762d48fbc846`
- qa-artifacts/results-ui-cases-20260910/component-proposal/inspectionSession.ts: `70e8e927d21276ef4e5b501587ab147c153bd632ded665df00723510d5cc7731`
- qa-artifacts/results-ui-cases-20260910/component-proposal/ResultsPane.css: `a4e8639eec537b71218549fcae0ef66e8b16c82e7140e510da185d6e927aac2f`
- qa-artifacts/results-ui-cases-20260910/component-proposal/README.md: `3d917d7c90e4ec51ffefb2ff4917a482624304a7f620befbd6b3ffbc3853e8f4`
- qa-artifacts/results-ui-cases-20260910/component-proposal/session-check.cjs: `abf4e70f5eeca95199c1103db0f1a99c3b57c371929ecce1c7500b7e087b2834`
- qa-artifacts/results-ui-cases-20260910/component-proposal/tsconfig.json: `754c6ec78de2a792e9e700258db309320b1c2162949af13ca87e93d0c0353182`
- qa-artifacts/results-ui-cases-20260910/dto-fixtures.json: `5239a0e44c8f9f72364cf031a46cb8b610be0210681ebb422b2ae1bff2d5ede2`
- prototypes/ai-native-workspace/src/host/savedResultCopy.ts: `5dae7824119a9248236c5448b29f3817217179539ef2a2c70a2533adc6655f0a`
