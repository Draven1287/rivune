# Compact conversation list — independent delta source review

2026-09-10. Bounded source review of the correction requested after the independent source and rendered reviews. No blocking finding in the inspected delta. This closes the identified source-evidence gaps; rendered manual navigation and mobile reachability require the owner's separate browser evidence.

## Exact boundary

All seven current files match `delta-source-hashes.json` by independently computed SHA-256. The four product files, pure projection tests, and scenario selector match the prior rendered review boundary. Only `tests/hostRenderer.test.tsx` differs from the prior captured source review. Its current SHA-256 is `20a159ecdead048879255dfe209ad9416c2016753698ded98fdb043f380776da`.

## Delta findings

- Mounted old-active coverage is now meaningful: eight distinct conversations (`saved-2` through `saved-9`) each receive a valid September 11 run, newer than the active conversation's September 10 run. The active conversation therefore starts outside the first eight by recency; the mounted assertion requires eight displayed rows including the active row. The test also asserts exactly eight newer fixture runs.
- Failed draft-save navigation explicitly focuses the destination list button before clicking, then requires the identical button to retain focus and explicitly excludes Message focus. It still checks unchanged active ID, preserved draft, no host open, and the visible mobile Conversations pane.
- The added rejected host-open case explicitly focuses the destination button, saves a dirty draft, invokes a throwing synthetic open, and checks saved and visible draft, unchanged active ID, the same intended focus target, no Message focus, save-before-open ordering, and preserved mobile pane.
- The retained preview uses `createFixture()`'s mutable synthetic bridge: `openConversation` updates `snapshot.activeConversationID`; `getSnapshot` clones that current snapshot. No retained-preview override freezes the selected ID. The delta exits React act-test mode after its final mounted setup. Source supports normal manual state updates; whether this resolves the previously observed manual no-op must be established in the separate rendered recheck.
- The selected results move into a closed-by-default native details/summary panel in document flow. The output is relative and scrollable, and ResizeObserver deducts the panel's measured height from the workspace viewport height. This removes the prior fixed-overlay structure and preserves expandable results. Actual mobile reachability is outside this source-only review.

The failed-save test title still says “filtered navigation” although that case does not enter a search query. Its assertions substantiate rejected list navigation and focus; no additional filtered-failure coverage is claimed here.

## Validation and limits

Independently ran `node --experimental-strip-types --test tests/conversationList.test.mjs` in the frontend: all four tests passed, zero failures. Read both requested independent prior reports and compared the current fixture against the captured prior fixture. Did not execute the mounted browser tests, infer a served-bundle hash, or claim every viewport was tested. No product/source edits, browser actions, providers, persistence, native actions, servers, publication, or private forwarding. This report is the only review write.
