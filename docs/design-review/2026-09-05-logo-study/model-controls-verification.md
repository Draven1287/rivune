# Sidebar model controls — September 5, 2026

The Mac app and browser workspace now offer a Models & reasoning sidebar section. Each provider opens two parallel single-selection columns. The native composer reuses the same selection layout.

## Behavior

- ChatGPT and Claude have independent selections. CLI model choices come from the existing native catalog; this catalog is not an account entitlement check.
- Native choices update the existing preferences. Browser overrides are scoped to that browser's requests and do not change native defaults.
- Reasoning choices respect each model's supported values. The browser explains a fallback if a model change invalidates the selected reasoning level.
- Configured API models are displayed read-only with Provider managed reasoning. API configuration remains in Mac Connections.
- Pending or active requests lock editing. Invalid, stale, or off-mode request overrides are rejected before dispatch. Request identity includes supplied selections.
- Missing model metadata retains the older Mac-default behavior. An unpaired browser explains that a Mac connection is needed. The iPhone companion displays Manage models on your Mac because its bridge does not yet expose authoritative route/model metadata.

## Verification

- Native Mac suite: 146 tests passed, zero failures or skips, including eight model-selection tests. The final targeted JSON roundtrip/idempotency assertion passed separately.
- Native generic iOS build passed; final iPhone wording refinement is validated by the follow-up iOS build recorded in the native model-columns logs.
- Web: 12 contract tests passed; lint, TypeScript, and production build passed.
- Rendered browser QA used a temporary, isolated loopback fixture, not a live provider. Desktop and 390 × 844 viewport showed both columns, selected checkmarks, disabled unsupported efforts, independent API state, and reachable dialog controls.
- Selected GPT-5.6 Sol / Ultra, changed to Luna, and verified the explained supported fallback. Selected Sol / High and confirmed the fixture received exactly the codex model/reasoning override on a direct ChatGPT request, without a Claude override.
- Confirmed editing locks during a fixture request, cancellation unlocks it, Escape closes the dialog, and an unsent draft survives opening and closing it.
- The locked-selection footer now says Workspace selection when a local override exists, instead of incorrectly claiming Mac defaults.
- Closed the temporary QA tab, reset the viewport, and stopped the fixture server. The user's workspace remains unpaired with the new sidebar controls visible.

No live model completion, normal native app launch, installation, or publication was performed for these checks.
