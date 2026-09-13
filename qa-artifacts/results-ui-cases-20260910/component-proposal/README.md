# Isolated Results component proposal

Reviewable source only; not integrated into Rivune. Files use actual HostArtifactSummary, HostArtifactRequest and HostArtifactInspection imports from the existing host contracts. Only available/plainText is supported. No new dependencies, browser/server, controller wiring, native launch or production changes.

## Files and intended ownership

- ResultsPane.tsx: controlled complementary region, list/detail presentation, Back/Close, exact-text inspection, generic read error, frozen provenance, supersession copy and existing guarded clipboard helper.
- inspectionSession.ts: injected validated inspection function, local request generation, duplicate retry guard, clear/dispose invalidation. No Tauri command is called by this file.
- ResultsPane.css: scoped calm opaque reading surface; no global or host selectors.
- session-check.cjs: five deterministic asynchronous checks against the session implementation, using the earlier synthetic DTO triplets.
- tsconfig.json: existing installed TypeScript/React types; no installation or dependency mutation.

## Builder integration contract (not implemented here)

1. After independent foundation acceptance, inject the real validated adapter into createInspectionSession. The adapter must execute production parseArtifactInspection (schema, exact tuple, UTF-8 length and digest); a TypeScript annotation is not validation. The session's identity comparison is defense in depth only. Generic failure copy deliberately does not claim an unsupported availability state.
2. Own pane visibility and InspectionState above ResultsPane. Create one session per owner lifecycle, not each render. Publish into owner state; dispose on unmount. Call clear synchronously for Back, Close, successful conversation switch, lost host connection and invalidated selected metadata. Close also hides the pane. A failed conversation navigation must not clear it. Physical host promises need not be cancelled; clear/dispose prevent late publication.
3. Supply only the active conversation's authoritative summaries. For each selected state, ensure the current summary still matches the complete conversation/request/artifact/digest tuple BEFORE rendering it. Removed/changed selection returns to list and shows `The selected result is no longer available in saved status.` Never briefly render old content while waiting for a cleanup effect. Frozen runLabels must come from the matching historical run; missing labels get neutral `Saved result`, not a guessed synthesis/partial claim. Do not infer model names or use current provider labels.
4. Header owner adds Results (N) before Refresh, disabled as Results before compatible metadata. It opens a list only. Mount pane on explicit open so initial heading focus occurs; never auto-open on snapshots. Save the exact header opener; onClose clears/hides and restores that node, with current chat h1 tabindex -1 as fallback. The component handles Back-to-row and inspector/list heading focus; new data within the same selected tuple never moves focus. The owner handles successful mobile conversation focus on Message.
5. Desktop layout must reserve nominal 320px Results plus existing sidebar and at least 480px Chat; below the fit threshold use replacement mode. At 320/390, keep Chat mounted but hidden/inert while Results is visible, and existing Chat navigation must close Results. This proposal does not implement parent grid/navigation or draft preservation. Retain transcript scroll separately across list/detail remounts if required; row-list scroll also needs owner capture/restoration before integration acceptance.
6. Keep this region outside modal subtrees. Existing Settings/SavedResult dialogs retain their Escape/focus ownership; if a dialog is portalled under this component in React, prevent its Escape propagation. Pane Escape is scoped to events within the region. There is no focus trap. Preserve existing transcript SavedResult entirely; do not redirect it based on this proposal.
7. Move proposal files into the builder's chosen production location only as a deliberate reviewed integration; relative imports here are for isolated typechecking. Do not mount this alongside a second implementation. Reconcile any concurrent contract changes using source hashes before integration.

## Copy decisions

Entry/list/loading/error/provenance/details/version labels follow APP_RESULTS_COPY_20260910.md. Copy reviewer requested preserving the accepted SavedResult control/status strings to avoid cosmetic churn, so this proposal reuses `Copy saved text`, `Copying…`, `Copied saved text.`, `Select all text`, and the existing clipboard-failure wording. That is the sole intentional copy deviation. Member identities remain visible and accessible. Artifact IDs are appended to row accessible names so equal names/provenance/time still resolve distinctly. Displayed timestamps are exact host strings; localized date formatting can be supplied later without changing identities or sort keys.

## Verification and limits

PASS: existing tsc with strict/noUnused checks, no emit, using this directory's tsconfig.
PASS: session-check.cjs: A then B late response; same-tuple close/reopen late failure; duplicate pending retry admission; disposed session suppresses completion; foreign identity produces error without result.

NOT TESTED: rendered React, keyboard focus, Tab order, screen readers, 320/390 layout, zoom, clipboard, real adapter/parser invocation, native storage/restart or providers. These tests are session logic checks, not UI acceptance. The component does not yet satisfy integration-dependent navigation, parent layout, selected-record reconciliation or scroll preservation on its own. Use ../interaction-cases.json and ACCEPTANCE.md for builder's rendered proof after wiring.

Commands (from workspace root):

    prototypes/ai-native-workspace/node_modules/.bin/tsc -p qa-artifacts/results-ui-cases-20260910/component-proposal/tsconfig.json
    node qa-artifacts/results-ui-cases-20260910/component-proposal/session-check.cjs

Next dependency: independently accepted foundation, then sole builder integration with parent state/lifecycle/layout ownership and controlled fake-host browser tests. This proposal does not authorize replacing the accepted dialog or shipping an app.
