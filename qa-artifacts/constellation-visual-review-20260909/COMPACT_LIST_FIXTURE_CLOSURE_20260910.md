# Compact-list retained fixture correction closure

Independently used only existing selected conversation-list retained URL on4317. Observed Synthetic checks: PASSED(3), including preservation, failed-save and failed-open cases. No broad matrix repeated.

Retained navigation PASS: at320×568 searched Saved conversation2 and clicked exact row. Subsequent DOM read: heading Saved conversation2, active row Saved conversation2, focused element aria-label Message. This closes the prior manual navigation observation.

Results rail PASS:320 collapsed screenshot exposes Show all and Settings below internally scrolling rows. Expanded results occupy their own top region rather than overlaying app. At320 expanded, clicking Message scrolls it into view with visible focus; short viewport requires scrolling, but no results overlay covers it. At390 expanded, sidebar/search/Settings are unobstructed. Cleared filter via keyboard; Show all and Settings both clicked successfully, Settings dialog observed open then dismissed with Escape.390 collapsed screenshot shows expanded list, Show recent and Settings unobstructed. Viewport reset.

Bounded verdict: both previously reported fixture observations closed. No residual defect in sampled navigation or results-panel placement. Existing responsive/list acceptance and its other untested edge-case qualifications are preserved. Native/provider/real persistence not exercised; screenshots inspected inline, not forwarded. No app/server edits or launches.

End-of-review exact SHA256 against delta manifest (local-source match, not served-bundle byte attestation):
- `prototypes/ai-native-workspace/src/host/HostWorkspace.tsx`: `d251d9b9c7f67e7417b388465aed90a5471dccbde9c6ea7eda32ed04d2dbbb3f`; matches.
- `prototypes/ai-native-workspace/src/host/ConversationList.tsx`: `62a401cd97c6d2f9927b10f1405537450f46e0ba9d9a9f4cc5f6ea9fa268eebe`; matches.
- `prototypes/ai-native-workspace/src/host/ConversationList.css`: `a4bd549638bef86a61677b454f7052d71303c22544f1ef14604c3b21ab7a0e2c`; matches.
- `prototypes/ai-native-workspace/src/host/conversationProjection.ts`: `32e33c7cfea22076789a66ce6837b60b7b510f586905d2cf6fc98664c1fda466`; matches.
- `prototypes/ai-native-workspace/tests/conversationList.test.mjs`: `e3466cc470e98c6b149f7d1651897790826eec086c57ad3ff8ab6afdb6780e66`; matches.
- `prototypes/ai-native-workspace/tests/hostRenderer.test.tsx`: `20a159ecdead048879255dfe209ad9416c2016753698ded98fdb043f380776da`; matches.
- `prototypes/ai-native-workspace/tests/rendererScenarios.ts`: `8a4944357193e9e826daf1a48182bfb887a2c11de157ca47b6db69dadfe84e6e`; matches.
