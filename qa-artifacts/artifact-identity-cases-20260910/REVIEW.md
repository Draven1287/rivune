# Adversarial artifact identity/parser cases

2026-09-10. Development-snapshot review only; no final acceptance of changing live implementation. All writes are confined to this directory. No native compilation/launch, persistence/fault tests, provider/server/signing/publication or production edits.

## Deliverable and results

parser-cases.test.mjs runs against exact copied production contracts.ts and tauriAdapter.ts with modelDiscovery.ts dependency. parser-results.log: 32/32 test functions completed. Thirty assert desired behavior; two are positive defect characterizations, so 32 passes does NOT mean acceptance. Run: `node --experimental-strip-types --test qa-artifacts/artifact-identity-cases-20260910/parser-cases.test.mjs` from the workspace root.

Cases cover exact multibyte/combining Unicode and inert script-tag text; returned artifact/conversation/run/hash equality; wrong version/preview/language/availability, fractional/negative/wrong byte count, changed content and oversize text; six private enumerable fields; duplicate artifact IDs, cross-conversation run binding, missing request, wrong frozen provider, forward/self supersession, nested private origin fields and missing member-team binding; request exact keys, bounded ASCII identity, inherited properties and getters without getter execution.

## Finding 1 — P2: bridge mutation changes validation's expected identity

Captured tauriAdapter.ts:117-119 parses an exact request, passes that object to inspect.call, and then uses the SAME object as the expected identity for parseArtifactInspection. A custom bridge mutating artifactID/conversationID/requestID to B and returning B is accepted for caller request A. The caller's original object remains A, so the mismatch is hidden from it. Reproduced with a synthetic bridge and actual copied adapter; no native host/provider called.

Keep a detached expected copy private across the await and pass a separate copy to the bridge. Regression should require rejection of the B response and retention of A as the comparison identity. The ordinary serialized Tauri bridge may not mutate this way; this is an adapter-boundary defect, not demonstrated OS/provider exfiltration.

## Finding 2 — P2 at strict UTF-8 DTO boundary: unpaired surrogate accepted

Captured contracts.ts:253-257 uses TextEncoder before SHA-256, but returns the original JavaScript string. For text containing an unpaired high surrogate, encoding silently substitutes U+FFFD; a digest/length for the replacement bytes passes while returned text still contains the invalid surrogate. The advertised exact UTF-8 identity therefore does not bind the returned string. Test constructs this response and confirms acceptance with byteLength=3.

Reject ill-formed Unicode before hashing (or require lossless encode/decode round trip); do not silently repair it. Include isolated high/low surrogates and valid pairs. Normal Rust String serialization cannot emit an unpaired surrogate; this finding concerns malformed custom-bridge DTO handling, not a claim that current native serialization produces it.

## Captured native source observations (not executed)

saved_artifacts.rs validates workspace/run/conversation binding, unique IDs, lowercase digest, exact Rust UTF-8 length/digest and recomputed tuple identity; supersession requires an earlier same-origin record. InspectRequest denies unknown fields and inspect resolves all three IDs plus digest after workspace validation. summaries returns cloned Summary values, omitting private text/invocation/attempt fields; Inspection serializes only its explicit public fields. host.rs exposes summaries and delegates inspect_artifact to this validator under workspace lock. Rust source/tests captured as evidence; no persistence/fault/native tests were duplicated here.

Design clarification: the proposed contract specifies runText references with canonical text in the run/checkpoint, while captured implementation owns immutable text in PersistedArtifact to retain previous versions. The native tests explicitly preserve an older version after run text changes. This is a visible schema/design departure, not automatically a corruption finding. Owner should record the accepted revised versioning contract before final artifact acceptance. Managed output remains absent/disabled in this code; no managed-file storage capability is inferred.

## Next dependency

Sole builder's frozen identity/parser correction receipt and updated hashes, plus explicit immutable-owned-text contract decision. Then rerun these bounded tests with desired-outcome assertions for the two findings. Native duplicate/forged-ID and serde rejection vectors below are ready for the native owner; execution/persistence proof remains their scope.

No late-response UI rendering or public/private runtime serialization proof is claimed by this parser test package. End-of-review live drift is recorded in end-drift.json, independently of snapshot results.

## Snapshot hashes

- docs/coordination/DURABLE_ARTIFACT_CONTRACT_20260910.md: `c6d35a8545af365786737c840a2642277937bcc6af4e44ca558dcfba7f493627`
- prototypes/ai-native-workspace/src/host/contracts.ts: `9eb738af3ab0e7d235d23b924b579331c4442929951e61861b858087ab56cc83`
- prototypes/ai-native-workspace/src/host/tauriAdapter.ts: `d3b4676726e14c23885b00c514919c01a2f613dbba5997b78a9ff16899cc0042`
- prototypes/ai-native-workspace/src/hooks/workspaceAdapter.ts: `0b8d8756ad7c0109974e89da40a74744ef0d63a25f90aa596ad772301b50fbb8`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/saved_artifacts.rs: `47b1bc148c98a08da697e02c5bde89a890338274a955e2a458ac6a2122003e25`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/saved_artifact_tests.rs: `df571ea4e22b17b8e4ed1baa85debc2a6efee2a9d97e744eb43182b1ce879395`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs: `6540006813844f12b0cc745a6c1817d9d8273deb5dc5c6af802449ba341f2ce1`
- qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/main.rs: `b5dc504c4f85b1a07876f9e0228cc146a25889f3918184d9dcc7f2bb5b6de061`
- prototypes/ai-native-workspace/src/host/modelDiscovery.ts: `a458c7308977c2b20bb217d8f540dca220cd35b4eea66554ac204f53adf965cf`

## Corrected TypeScript closure

TS_CORRECTION_CLOSURE.md closes both reproduced parser/adapter P2s at its exact corrected boundary with desired-outcome regressions. Original characterization tests above are historical. Native provenance/truncation corrections remain separate.
