# Sent-draft mounted React proof — ready for UI recheck

Validation-only two-file delta: tests/hostRenderer.test.tsx and tests/rendererScenarios.ts. Exact baselines, current hashes and test-only.patch in qa-artifacts/sent-draft-mounted-20260910/. All four implementation files under independent review still match their frozen sent-draft implementation manifest. No host/controller changes, exports, native builds or app launches.

Safe existing-server fixture:
http://127.0.0.1:4317/tests/hostRenderer.html?scenario=sent-draft-mounted

Five selected actual React HostWorkspace cases PASS at verified1280px and390px widths. A final scope-label-only edit was executed at390px and reports selected sent-draft composer only. TypeScript and3 selector tests pass. No Results matrix repeated.

Cases drive the accessible Message textarea via React input/change events and click visible Send/Save draft/Reconcile request controls. The fake host intercepts submission and supplies controlled acknowledgements and snapshots; no real provider or native bridge runs. Each case asserts the same textarea DOM node remains mounted, one submission only, and unchanged non-text draft metadata.

- Exact: composer remains populated before admission; accepted acknowledgement without saved run does not clear. A foreign request in history with advanced blank host draft also does not clear. Exact matching authoritative admission followed by reconciliation clears the visible textarea.
- Newer distinct: typing remains enabled while pending, new text survives accepted admission, explicit Save draft uses the host's advanced revision.
- ABA: typing away then back to the sent text advances local generation; identical visible text survives admission and saves on the new revision.
- Rejected: no run/revision advancement; visible and saved sent text retained.
- Uncertain: no speculative clear; explicit no-run reconciliation rejects and retains the sent text.

The selector permits the fake submit method only for this exact scenario; shutdown remains prohibited and other selected fixtures retain their existing submit prohibition. Test report is retained on completion. This fixture proves mounted UI/controller response to synthetic host authority, not native disk atomicity, provider output or OS restart. The separate host review owns those persistence claims.

Ready for independent UI recheck. No additional product edits made.
