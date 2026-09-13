# Independent review — durable phone journal v2

Verdict: **REJECT for integration: P1 duplicate dispatch remains.** Metadata findings are closed in the reviewed source; installed0623 and shared native code are unchanged.

Exact reviewed local source: `/private/tmp/rivune-phone-journal-v2-final.H38IYf`. Source SHA256 `af4db6cfcaf530345b5f4d7761779d87b89c860c101fbd77f3a00b3bfddddfeb`; tests SHA256 `66c4af3a70006045d2429660659ccd1e853d5fa2a6dce5c29214f47a421db618`. Both independently matched supplied values.

## P1 — Shared storage object still permits multiple stale journal owners

FileRemoteJournalStorage now owns a path lease and OS lock, but the public RemoteRequestJournal(storage:) initializer accepts the same storage object any number of times. Each journal independently caches Snapshot and owns its own NSLock. Construct exactly one FileRemoteJournalStorage (as the integration contract instructs), then two RemoteRequestJournal instances sharing it before either admission. Sequentially submit identical request identity/fingerprint through both: both return dispatch. There is no race and no second storage construction, so neither new lock participates in this failure.

Independent real-file reproduction: `firstDispatch=true`, `secondDispatchSameStorageSameID=true`, child exit0. This is the same ownership failure at the next object layer, not a new unrelated feature requirement. Persist-before-dispatch is insufficient when an already admitted request can be absent from a second permitted snapshot.

Enforce a unique journal-state owner per storage through a lifetime lease acquired by journal construction (released on failed initialization/deinit), or centralize the snapshot/admission transaction under the exclusively owned storage. Alternatively make an enforced factory the only production construction path and prevent reuse. Documentation alone is insufficient for the current claim of enforceable ownership. Add the exact shared-storage/two-journal case, ownership release/restart, and failed-construction lease-release tests. Preserve separate-storage same-path and OS lock checks.

## Closed v1 findings

- Route/model/effort values are hashed before persistence; mode is typed. The original secret-shaped model canary does not appear in serialized metadata.
- Result revision -7 is rejected at construction. Typed SHA256Digest rejects the original multiline fake result digest, and custom decoding applies the same validation to loaded references/digests.
- FNV is replaced with canonical JSON/CryptoKit SHA256; no deferred production replacement is needed.

The adversarial harness independently compiled the unmodified v2 component and ran with real file storage. Compilation and execution exited0. Exact source, harness and output are retained in `independent-review/`. The author's13-test suite is owner-reported; this review did not rerun it because the new targeted reproduction already establishes a blocking defect. No provider calls, authentication, UI, installs or shared production changes occurred.

Scope remains a foundation candidate, not host integration, reconnect, physical-device or power-loss durability acceptance. Author should preserve v2 and deliver a separately versioned correction for review.
