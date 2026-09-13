# App state and accessibility audit — draft/setup verification

Bounded independent recheck of SETUP_ADAPTER_DRAFT_RECEIPT_20260909.md in `prototypes/ai-native-workspace`. Source inspection and isolated Node tests only in this pass. No app-source changes, builds, native/server/provider actions, or browser-storage corruption.

## Previous draft-storage P2: closed for the tested page-lifetime boundary

Independently ran:

```sh
/Users/Aaravshah/.local/bin/node --experimental-strip-types --test tests/draftStore.test.mjs tests/workspaceAdapter.test.mjs
```

**18/18 passed:** seven draft-store tests and eleven setup-adapter tests. The tests use in-memory fake storage and fake bridges, not real accounts or browser storage.

Draft checks cover read/write/quota failure, read-once caching, exact independent conversation text across unsubscribe/resubscribe, intentional clearing, stable notices, and subscription cleanup. An additional independent inline probe combined failing reads and quota writes, retained exact Unicode/multiline text `Synthetic draft α\nsecond line` through A→B→A and subscriber remount, then cleared A in memory. Passed; no saved bytes were touched.

`draftStore.ts:29-43,53-58` now keeps an authoritative page-lifetime map before attempting writes. An unreadable initial value is cached without automatically writing an empty fallback. `ChatPanel.tsx:9-10` subscribes to that shared store instead of mount-local draft state; App subscribes to its notice and displays a role=status saving warning. Settings suppresses its successful-saving claim when that notice exists. These integration details were source-verified; failure notices were tested at store level, not injected into the running browser.

Normal-path tests still verify existing storage keys, successful reads/writes, per-conversation isolation and no spurious notices. Page reload can still lose edits that could not be persisted, as the notice explicitly states; this is not desktop durability or sync. Full React DOM remount under forced failure was not performed, but the store remount tests plus module-level singleton/useSyncExternalStore wiring address the original loss mechanism.

## Setup failure handling: passes requested failure boundary

Absent/partial bridge returns unavailable without calling methods. Synchronous errors, asynchronous rejection, invalid metadata and bounded timeout return error with **zero provider rows**, no stale prior results and unavailable Constellation. Error messages are sanitized. An additional independent probe made `discoverProviders` reject while catalog/snapshot succeeded; it returned error, empty rows and unavailable Constellation.

ConnectionSetup clears prior results before an explicit check and only renders provider cards for an available result. A detected bridge alone is described as unchecked. Installation, configuration, authentication and previous response testing remain separate, and even readiness is labeled host-reported/not tested here. There is no configure/send/cancel surface in this adapter.

## New P2 — contradictory discovery authentication can still produce ready

**Reproduced with isolated fixture, no live provider:** use the same provider ID/kind/executable in all three responses. Discovery reports `installed:true, authentication:'not-authenticated'`; catalog reports `adapterState:'supported', installation:'installed', authentication:'authenticated', responseTest:'passed'`. Current output is `authentication:'authenticated', readiness:'hostReportedReady'`.

**Cause:** `workspaceAdapter.ts:131-142` matches discovery identity but takes authentication exclusively from catalog. It checks discovery's negative installation signal, but ignores its explicit sign-in-required signal; the matched discovery row is then suppressed. ConnectionSetup consequently presents signed-in/ready without exposing the contradiction. The existing sign-in test covers discovery-only rows, not matched configured rows.

**Acceptance:** contradictory negative authentication evidence must prevent a ready/signed-in presentation, or yield an explicit inconsistent/unknown state explaining the conflict. Preserve the distinction between unavailable discovery, unknown authentication and explicit sign-in-required. Add exact-ID and unique-path-join regression cases, plus a consistent authenticated case; rerun the existing18 tests. Do not perform a real authentication/response test to mask this metadata inconsistency.

## Retained earlier acceptance and limits

The previous independent browser pass closed390px artifact destination/return focus and early cancellation terminal-state P2s. It verified new conversation draft switch/reload recovery, completed history continuity, four cancelled steps/three cancelled agents, no unfinished cancelled artifact action and preserved earlier answer/card after reload. Those remain prior-pass evidence, not rerun here.

Connected execution, provider retry/timeout recovery, durable desktop history, cross-device sync and full visual/accessibility acceptance remain outside this setup-only slice.

## Current inspected hashes

- `src/hooks/draftStore.ts`: `75944dcf6127610fc15f9719326e2272df63c0e20fd7db1ff33be32bfb76c847`
- `src/hooks/workspaceAdapter.ts`: `f54bf1d0753132eb3e3a661e9af5b1f6bc90e578a7ef7148b471d443ddd108f2`
- `src/components/chat/ChatPanel.tsx`: `9fee3e8e708a10b8f71cfc4c34d6ee2ff767923194440c56cd20f697a76de47b`
- `src/components/settings/ConnectionSetup.tsx`: `2f8ef5c4fd6dbaf75cd90b0c6bdc1a703386cdb673a39f22f05c9d6eb6fb38c7`
- `src/App.tsx`: `de2e61c815d0c7ee57dc40f558ef1690597c735b34ce34559b31fa8030bc763a`
- `tests/draftStore.test.mjs`: `237f7fe2987793061f8f5f1a2fc9b76cceaa78d21078b943901dedccffc4ac64`
- `tests/workspaceAdapter.test.mjs`: `a84c4e7775f7b0e21c39029116b068eb35759bc7284108404c1aac75304561db`
