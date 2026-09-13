# Artifact TypeScript correction — focused P2 closure

2026-09-10. PASS: both parser/adapter P2s from REVIEW.md are CLOSED at the captured corrected TypeScript boundary. This does not accept the changing native provenance/truncation implementation or the whole artifact foundation.

Read DURABLE_ARTIFACT_CORRECTION_RECEIPT_20260910.md; copied the six TypeScript source/test paths plus four dependencies into correction-ts/snapshot. All six receipt-addressed hashes matched before testing. Post-test live drift: none. Original positive defect-characterization package remains unchanged.

## Desired-outcome results

correction-ts/closure.test.mjs: 6/6 passed. Four tests mutate artifact ID, conversation ID, request ID or expected hash inside the bridge after an await and return matching substituted content/identity. Each now rejects, makes exactly one inspection invocation and leaves the caller request unchanged. These extend the original shared-request reproduction to each identity component.

The fifth test rejects isolated high/low surrogates, an embedded high surrogate, repeated high surrogates and reversed low/high sequences even when byte length/digest match TextEncoder replacement bytes. The sixth retains exact valid surrogate pairs, combining marks, leading BOM, literal U+FFFD, whitespace and empty text with exact UTF-8 length.

Selected copied owner controller test: 1/1 passed (`private expected identity`). Both artifact A and B exist in the snapshot; a custom adapter mutating A to B still rejects. This independently executed owner regression checks the controller boundary in addition to the typed adapter.

Logs: correction-ts/reviewer-results.log and controller-results.log. Only these two defects and their positive controls were exercised; unrelated suites and native tests were not repeated.

## Source confirmation

The adapter and controller retain their privately parsed expected request and pass a separate flat copy to the downstream bridge/adapter. All request fields are validated scalars, so a shallow copy separates every mutable field used in response comparison.

parseArtifactInspection now compares the TextDecoder UTF-8 round trip with the original text before hashing. ignoreBOM:true preserves a leading BOM; invalid surrogate repair changes the round trip and rejects. Output remains the exact original valid string.

## Boundaries and next dependency

No production edits, builds, browser/native/provider/server/signing/publication actions. Native checkpoint binding and unlabeled truncation gaps reported by the provenance reviewer remain separate outstanding corrections. NATIVE_FOUNDATION_REVIEW.md's earlier bounded PASS does not cover or close those semantics. Full foundation acceptance requires their corrected receipt/review plus reliability evidence; no native source was re-reviewed here while changing.

## Captured hashes

- prototypes/ai-native-workspace/src/host/contracts.ts: `668780d2fa0d9ba7ff32750b1547a9c7f52a3fa6e80227e7fd863779329eb992` (receipt match)
- prototypes/ai-native-workspace/src/host/tauriAdapter.ts: `eef4490bf8194325247533cf8f6f18e6c5c4d3c19622b4f61e37b6ff8f813e36` (receipt match)
- prototypes/ai-native-workspace/src/host/workspaceController.ts: `240221a02c3294ad7dbcaee75fab35caca5dfeb8608baaeb86ecaa17d98cae7d` (receipt match)
- prototypes/ai-native-workspace/tests/hostContracts.test.mjs: `75d353b65e82d19bed93c2bbcb60e759822a121e34fe153334db6c023dd1f0c3` (receipt match)
- prototypes/ai-native-workspace/tests/hostController.test.mjs: `81b5c78f5daf42a7d61b32e4c2ec6eeb2227123d373512862536f2226b046f74` (receipt match)
- prototypes/ai-native-workspace/tests/tauriAdapter.test.mjs: `dc2aa58f3e1ea1f408ebdce54372c6c50cbcd543c2219d3c075e6d747f45558b` (receipt match)
- prototypes/ai-native-workspace/src/host/modelDiscovery.ts: `a458c7308977c2b20bb217d8f540dca220cd35b4eea66554ac204f53adf965cf` (dependency)
- prototypes/ai-native-workspace/src/host/composerConfiguration.ts: `49cd0bce2b8a78fdb9a1236e328bfad40b99c931f0e02e00cf6567fa73bca433` (dependency)
- prototypes/ai-native-workspace/src/host/teamConfiguration.ts: `4ec927f7ca38d5318d98868b0ad7e7d9c73489298d2968a00d9cc1da70e482e6` (dependency)
- prototypes/ai-native-workspace/src/hooks/workspaceAdapter.ts: `0b8d8756ad7c0109974e89da40a74744ef0d63a25f90aa596ad772301b50fbb8` (dependency)
