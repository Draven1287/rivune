# Compact conversation list — independent rendered review

Selected existing URL: http://127.0.0.1:4317/tests/hostRenderer.html?scenario=conversation-list&preview=1&conversationList=1. No unfiltered harness, servers/native/provider/real persistence or app edits.

## Observed acceptance

Selected harness visibly PASSED both checks: compact search preserves selected draft/transcript node, and failed draft save blocks navigation/preserves mobile pane. Inspected actual assertions:8/20 counts, old active retention, toggle/search focus, case-insensitive older-title search, unchanged active/draft/history, same transcript node/nonzero scroll, no save/open during filtering, save-before-successful-open and Message focus; conflict blocks host open and preserves draft. This is reviewer-observed selected automated evidence at initial viewport, not manual execution of every case at each width.

Manual retained24-row preview: eight default rows including active; Show all exposes24; title search finds Saved conversation2 beyond default rows; no-match status accurate and active transcript retained. Keyboard Select-all/Backspace clears search and restores expanded toggle; Show recent returns compact view. A fill-empty API attempt left old query in place, so no product defect inferred from it.

Screenshots inspected at1440×900,390×844,320×568. Desktop list is compact, readable, active row indicated, long title ellipsized with full accessible name. Mobile visible rows similarly truncate long title. At320 navigation scrolls vertically.

## Concrete fixture limitations / remaining manual evidence

The fixed selected-test results panel overlays lower mobile sidebar controls at390 and much of the list at320, obstructing full visual reachability acceptance. This is fixture UI, not demonstrated product overflow. Minimum correction: collapsible/non-overlapping retained results panel so Show all/Settings and composer can be inspected unobstructed; retain pass evidence separately.

Manual filtered Saved conversation2 click did not yield a changed heading or Message focus in the retained preview (heading remained Active older conversation). No visible error appeared; this is an unresolved retained-fixture/manual navigation observation, not an independently isolated app defect. Need a retained fixture whose open/refresh behavior demonstrably updates selected ID, or an exact explanation of that fixture limitation. Selected automated navigation assertion passed independently above; do not substitute it for this missing manual proof.

0/1/8 and duplicate titles have pure-test source cases, not separate rendered fixtures;9 exactly, failed host-open after successful save, collapse after selecting an older item, and every mobile failure focus target remain unverified. No broad repeated matrix run. Viewport reset.

## Verdict

Bounded pass for observed projection/search/compact visual rows and selected automated preservation tests. Full manual mobile reachability/navigation acceptance remains qualified by the two fixture observations above. Preserve prior branding and saved-result acceptance. Request only fixture clarification/correction, then missing observations; no speculative app redesign.

Current manifest comparison (changing workspace; no served-bundle attestation):
- `prototypes/ai-native-workspace/src/host/HostWorkspace.tsx`: `d251d9b9c7f67e7417b388465aed90a5471dccbde9c6ea7eda32ed04d2dbbb3f`; matches.
- `prototypes/ai-native-workspace/src/host/ConversationList.tsx`: `62a401cd97c6d2f9927b10f1405537450f46e0ba9d9a9f4cc5f6ea9fa268eebe`; matches.
- `prototypes/ai-native-workspace/src/host/ConversationList.css`: `a4bd549638bef86a61677b454f7052d71303c22544f1ef14604c3b21ab7a0e2c`; matches.
- `prototypes/ai-native-workspace/src/host/conversationProjection.ts`: `32e33c7cfea22076789a66ce6837b60b7b510f586905d2cf6fc98664c1fda466`; matches.
- `prototypes/ai-native-workspace/tests/conversationList.test.mjs`: `e3466cc470e98c6b149f7d1651897790826eec086c57ad3ff8ab6afdb6780e66`; matches.
- `prototypes/ai-native-workspace/tests/hostRenderer.test.tsx`: `07f293f78b6a87f58189bffba0f07a2692ec425e8b584cc78f7b0268191f0d19`; matches.
- `prototypes/ai-native-workspace/tests/rendererScenarios.ts`: `8a4944357193e9e826daf1a48182bfb887a2c11de157ca47b6db69dadfe84e6e`; matches.
