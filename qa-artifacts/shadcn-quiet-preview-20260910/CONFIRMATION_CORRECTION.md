# Quiet toolbar confirmation correction

State-review P2 fixed. Pending confirmation now replaces the compact mode/provider controls with the existing confirmedSummary as visible, wrapping text. New snapshot mode/provider labels are withheld until confirmation clears. Default/noncompact summary behavior and all controller/save/send authority remain unchanged.

Changed files: src/host/ComposerExecutionControl.tsx, src/host/quiet-workspace.css, tests/hostRenderer.test.tsx under prototypes/ai-native-workspace. No result bytes, host contracts, lifecycle, backend, native artifact, candidate or default App changes.

Validation:
- Five quiet mounted scenarios pass at 1280 and 320 CSS pixels (correction-mounted-1280.json and correction-mounted-320.json). The added scenario covers applied save with lost reply, malformed reply and failed refresh after acknowledgement. It checks actual visible toolbar text after snapshot changes, not a title/hidden summary; verifies Send and keyboard shortcut remain fenced, draft retained, exact mutation recovery, and updated mode/provider only after confirmation clears.
- Focused actual-component source check passes acknowledged=false and acknowledged=true, with newer snapshot values and old confirmed summary. No callback invoked. confirmation-source-check.cjs / confirmation-source-check.log. This uses deterministic helper stubs and complements, not replaces, the mounted test.
- Frontend typecheck passes. Host controller regression suite passes; correction-controller.log.
- At 320px the document remains 320px wide. Existing preview server only; no new server/native/export/provider/paid operation.

quiet-cases.txt regenerated from the final harness: correct artifact name Final answer, exact response shape, preserved admitted team identity, and new confirmation scenario. quiet-cases-provenance.json records source/excerpt hashes and exact lines. final-source-hashes.json refreshed for independent review. Earlier state-review frozen copies remain untouched as historical evidence.

Ready for independent state/UI confirmation. No new visual rewrite or final visual acceptance claimed.
