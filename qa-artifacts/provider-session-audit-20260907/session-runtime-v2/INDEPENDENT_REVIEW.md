# Independent provider-session runtime v2 review

**ACCEPT for bounded integration of the isolated actor/effect kernel and private persistence. No remaining P1/P2 findings in the reviewed scope.** This is not acceptance of a live CLI adapter, provider permission enforcement, native Store/UI integration, installed app behavior or ChatGPT/Claude parity.

## Verified evidence

Independently verified all three frozen MANIFEST.json hashes at `/private/tmp/rivune-session-runtime-v2-ngl3ol08`:

- Source: `072069bfb105f745c6c33a1090531dc394bbe710837174125fb88b6754c450a1`.
- Tests: `ff7d2bc385f6f6b63618540d22701e97406343310b639abe86ee0ee68bd3b37f`.
- Package: `c699065862d9fabe2fb1724658e3a855f113531b96a4fec3e4bd926171ba4e41`.

Reviewed the exact source and test diff from rejected v1. Independently copied the frozen package without changing its source or supplied tests, added the two original v1 ownership reproductions unchanged, and ran the complete suite: **24 passed, 0 failed, no compiler warnings** (22 supplied tests plus two independent regressions). Exact added tests, log, hashes and results are in `independent-evidence/`.

## V1 blocker resolved

Acknowledgement now rejects a provider session already assigned to a different binding on the same route, including archived bindings. Loaded-state validation enforces the same uniqueness. Both original failures now pass: unrelated conversations cannot adopt existing provider history, and explicit reset cannot rebind archived history. Legitimate continuation remains valid; the same opaque identifier on a different provider route is allowed and tested. A saved duplicate provider-session identity fails closed on reload.

The only additional production change combines approved documents and project instruction bytes under the existing 20KB limit. Its zero-reservation failure test passes. No unrelated production changes were present.

## Accepted behavior and integration limits

Within this isolated component, tests support durable reservation before launch effects, deduplication and bounded consumed-ID retention, per-turn approved context, one-time history seeding, pending-operation Stop before provider acknowledgement, event sequencing and identity checks, completion/Stop reconciliation, unknown-outcome recovery, private file persistence and result publication only after successful save.

The HANDOFF correctly places process launch ownership, pre-execution tool restrictions, termination, provider-event correlation and parse-failure cleanup in the future driver. Launch/interrupt effects do not themselves prove that provider work executed once or stopped. Host permission/artifact validation and cross-file workspace recovery still require integration verification. No live providers, native UI, app installation or shared source changes occurred during this review. Preserve v1 rejected evidence. Existing user authorization is unchanged; this review adds no approval gate.
