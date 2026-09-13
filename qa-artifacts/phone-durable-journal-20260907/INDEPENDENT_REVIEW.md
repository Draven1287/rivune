# Independent review — durable phone journal foundation v1

Verdict: **REJECT for native integration.** Useful isolated state-machine foundation, with three reproduced correctness/privacy gaps. Installed0623 and shared production source remain unchanged.

Reviewed local copy: `/private/tmp/rivune-phone-journal.KDRIzy`. Source SHA-256 `6664b8e57435f47fff79c6457c622da3b8c4c8dd0db3c7666bbf72e95a158efa`. Shared-source/doc reads stalled, so this review used the readable latest local SwiftPM copy and asked the author to confirm its identity. Do not infer byte identity with unread shared files until confirmed.

## P1 — Two journal owners can authorize the same request twice

RemoteRequestJournal owns a per-instance NSLock and in-memory Snapshot (lines181–182). FileRemoteJournalStorage provides atomic replacement but no exclusive journal ownership or transaction spanning read/check/write. Reproduction using a real temporary file: construct two journal instances against the same absent file, admit the same immutable identity and fingerprint through each sequentially; both return dispatch. No thread race is required. A second cached writer can also replace records written by the first. This breaks the feature's central duplicate-dispatch guarantee if more than one owner is created.

Enforce one storage owner for the journal lifetime, or use a store-wide atomic transaction with reload/compare/commit. The integration contract must establish and test ownership; an instance lock alone is insufficient. Add two-instance real-file and ownership-release/restart tests.

## P2 — Completed references are persisted and replayed without semantic validation

validateAll (lines417–422) validates record identity but never validates completed result references. complete accepts revision -7 and an arbitrary multiline resultDigest; restart successfully decodes it and admit returns replay with revision -7. The digest may contain full prompt/answer/diagnostic text. This defeats both replay-reference validity and the claimed corrupt-storage fail-closed boundary.

Validate result revision/domain, fixed-length canonical SHA-256 digest and any required run-ID constraints before mutation and during load. Reject invalid persisted completed references before exposing replay. Test malformed decoded records as well as API inputs; preserve previous committed state on failure.

## P2 — Character checks do not exclude secret-bearing identity metadata

validate/isSafeToken (lines431–449) accepts any nonempty non-whitespace string up to256bytes in model, mode, route, effort and digest fields. A requested model `sk-SYNTHETIC_SECRET` is persisted verbatim. Other token-shaped private strings or paths also fit this schema. The existing privacy fixture never injects any of its forbidden strings into admitted fields, so its passing assertions cannot establish exclusion.

Represent trusted route/mode/effort selections with canonical values; hash untrusted opaque model identifiers where metadata privacy requires raw exclusion. Validate all purported digests as actual fixed-format hashes. Inject secret canaries into every external string field and confirm rejection or omission, including result references. State the privacy guarantee accurately: local hashes/counts are metadata, not anonymization.

## Additional ship boundary

FNV identityDigest is explicitly documented as non-production. That is an honest prototype limitation, not concealed evidence. Replace it with the actual canonical SHA-256 implementation in the isolated candidate before the next integration review, so acceptance covers the code that will ship rather than deferring an unreviewed identity change to integration.

## Evidence

Compiled the unmodified reviewed component plus a synthetic standalone harness with swiftc; compilation and execution exited0. Real FileRemoteJournalStorage was used. Output: rawSecretPersisted=true, promptPersisted=true, negativeRevisionReplayed=-7, firstDispatch=true, secondDispatchSameID=true. Retained exact reviewed source, harness and results under independent-review-v1. No provider call, auth access, UI or app installation occurred. The author's11-test pass is owner-reported; this review independently ran the new adversarial harness, not that suite.

Existing source usefully separates detach from explicit Stop, persists reservations before returning dispatch within one instance, preserves terminal tombstones, and recovers unfinished records as interruptedUnknown. Those points do not eliminate the reproduced gaps. Foundation acceptance must remain distinct from host integration, live reconnect, physical-device or power-loss durability proof.

Author assigned isolated versioned v2; preserve v1 and all rejection evidence. Native owner must not integrate v1.
