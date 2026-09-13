# V3 independent journal review — REJECT pending lifecycle fix

Scope: isolated Swift foundation only. No shared native edits, provider calls, account changes, or app install.

Frozen source SHA-256: `1b0c8e664b2c1316c38006fb80fd81515475e4e507d88f5e1865b78217e7612f`.
Frozen tests SHA-256: `234463e1d8acce69342c3e7d97bdf606fc7c1821d50aa9d3857fca414cbbe063`.

Root independently ran 16 tests, all passed. An unmodified-source real-file harness independently passed: shared-storage duplicate ownership rejection, first dispatch, restart reattachment without redispatch, read-failure release, validation-failure release, and child-process OS writer lock rejection. V2's ordinary shared-storage reproduction is fixed.

## Remaining P1: failed initialization can remove a successor's lease

After `snapshot` is assigned, the second initializer catch explicitly releases the string-keyed journal lease. Swift also invokes `deinit` when this fully initialized instance throws; deinit releases the same key again. Between these releases another initializer can acquire the key. The stale deinit then removes that valid successor ownership, permitting a third live journal and again defeating single-owner admission.

Evidence: the `independent-review` folder preserves unmodified source/tests separately from `LifecycleInstrumented.swift`. The latter only adds a deterministic scheduling hook after the registry removal and mutex unlock; it repairs the fixture and constructs a successor in the allowed interval. Output confirms `successorAcquiredAfterCatchRelease`, then `failingInitializerReturned`, then `BUG_twoLiveJournalsAfterStaleDeinitRelease`. This is an instrumented interleaving demonstration, not an unmodified stress-run claim. A separate minimal Swift lifecycle program also confirmed catch cleanup plus deinit on a throwing fully initialized instance.

Required fix: token-owned RAII lease or equivalent single-release ownership; stale cleanup must never remove a successor claim. Cover early decode failure, semantic validation/recovery failure, ordinary deinit, and failed competing claim. Preserve existing metadata/privacy and fail-closed admission behavior.

No acceptance for native integration yet. Accounts owner has the bounded correction; installed 0623 is unaffected.
