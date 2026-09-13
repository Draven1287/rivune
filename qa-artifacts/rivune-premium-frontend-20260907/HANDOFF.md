# Rivune premium frontend — isolated review candidate

This package changes the renderer structure and styling for the current Tauri single-AI slice. It is not an installed replacement, native runtime acceptance, or a completed Council/Swarm product.

## Changes

- Approved Milky Way asset and silver Rivune identity, readable dark response panel, fixed composer, conversation sidebar.
- Local workspace footer and Settings inside the app document. No separate OS Settings window or fake traffic lights.
- Existing provider controls and IDs moved into the Settings dialog; styled provider radio controls preserve the underlying value contract.
- Keyboard navigation, modal focus containment, Escape and invoking-focus restoration, Cmd/Ctrl-comma shortcut.
- Real local galaxy preference; no animations required; reduced motion honored.
- Existing conversation navigation remains available at narrow widths through a horizontal strip.

## Integration

Apply `premium-frontend.patch` to the runtime's web directory, copy `web/assets/`, and review against the current runtime HTML first. Runtime owner retains sole ownership of candidate4. The package includes frozen reference files and SOURCE.json; do not overwrite newer app.mjs, core.mjs or desktop-host.mjs with the included copies. Those modules are byte-identical to this package's reference and are included only to make its rendered evidence reproducible.

All IDs consumed by the frozen app.mjs are preserved. `provider-kind` is now a hidden input supplied by keyboard-accessible radio buttons. `chrome.mjs` handles presentation only; existing app.mjs still owns configure/create/draft/submit/reconcile/stop/retry operations. Native titlebar decorations remain Tauri-owned.

## Verification

- Existing five draft/submission/async-result regression tests pass against the copied runtime modules.
- 46 Chromium checks pass using an explicitly synthetic HTTPS host: modal/focus, provider payload, submit once, saved draft, returned answer, new conversation, appearance persistence, no-host state, reduced motion, and desktop/narrow layouts.
- Inspected desktop empty, settings, 760px and 320px captures. Screenshots containing answers explicitly label synthetic fixtures.
- Independent source review identified narrow conversation access, focus restoration and availability wording; all corrected before final handoff.
- No real Tauri app, CLI provider, credential store, old application, or user history was opened or modified.

The first rendered run caught missing modal focus wrapping, which was repaired. The next run exposed a test harness issue: the HTTP .test origin lacked crypto.randomUUID. The harness now uses a routed HTTPS origin. This is not evidence of a native host defect.

## Remaining gates and known inherited limitations

The Rust/JS wire-contract mismatch reported separately must be fixed and validated with actual serialized fixtures. This browser fixture deliberately isolates presentation; it cannot prove that boundary. Real webview CSP, installed app keyboard/window semantics and provider execution still need acceptance. The source currently renders only the latest answer as plain text; full message history, markdown/artifacts, projects, lead-directed Council/Swarm, cloud account sign-in, Review, remote control and installers remain separate work. No unavailable feature has a pretend interactive control here.

The inherited host status uses provider configuration as a connection indicator. Runtime owner must distinguish configured, authenticated and provider-tested states. Existing polling can overwrite transient operation errors; this package mirrors the current status and does not claim to fix that runtime behavior.
