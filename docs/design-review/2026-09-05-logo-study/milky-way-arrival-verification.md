# Milky Way workspace and startup readiness

September 5, 2026. Local source and browser preview; not published or installed over the user's Mac app.

## Result

- A continuous Milky Way panorama now fills the workspace and setup background, including the center. Dark glass behind chat keeps text readable. The accepted silver ribbon R and startup identity artwork are unchanged.
- Startup lasts at least twelve seconds, with a visible percentage and a 900ms completion hold before the next screen. Returning native users see it on each fresh application launch. Browser refresh and Replay arrival also show the full sequence. This was extended from eight seconds in the [timing follow-up](space-startup-verification.md).
- The percentage describes loading the interface, not compilation, network bytes or authenticated provider readiness. It reaches 100% when the reveal and artwork preparation finish. Chat remains independently gated by account and live provider readiness.
- Ready connections open the workspace. Missing, failed or still-checking connections automatically open account/connection setup, where the user can configure or recheck them. The reveal no longer sits at 90% with a connection error. A failed or timed-out artwork load uses a fallback and still advances.
- One ready provider is enough; the workspace selects an available mode. Reduced motion removes the visual motion while retaining the preparation interval and readiness gate.

## Desktop architecture

The side-browser preview is React/Vinext. Rivune's existing Mac application is SwiftUI, with a local runtime that discovers supported CLIs, probes sign-in and API model access, stores API credentials in Keychain, and executes requests. It is not an Electron application.

Keep SwiftUI for the current Mac build. Tauri is a reasonable future choice if sharing the React interface across desktop platforms becomes the priority; it would require deliberately migrating or packaging the current runtime. Tauri uses an operating-system WebView, whereas Electron uses Chromium and Node processes. This change does not introduce either framework.

References: [accepted project architecture](../../ADR-001-WEB-DESKTOP-RUNTIME.md), [Tauri architecture](https://v2.tauri.app/concept/architecture/), [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model).

## Connect your Mac

This pairs the browser tab with the Rivune app on the same Mac so the browser can use the local runtime. It is separate from a Rivune cloud account and separate from the AI provider's own sign-in. The installed Mac app uses its runtime directly and does not need this browser-pairing step.

Browser pairing is intentionally held in tab memory and cleared by refresh. Therefore an unpaired browser refresh can show the reveal but cannot silently inspect CLI sign-ins or API keys. It shows connection setup instead. This update does not persist the pairing token or bypass that boundary.

Readiness checks validate CLI sign-in or API model access without sending a chat. They do not guarantee remaining inference quota or future provider availability. Additional discovered CLI tools still require a compatible adapter before they can run chats. Account sign-in still requires the owner's authentication-service configuration.

## Generated asset

Created with the built-in image-generation tool, not the CLI. This is a new background, not an edit to the accepted logo.

- Master: `brand-assets/explorations/rivune-workspace-milky-way.png`
- Web: `website/public/brand/rivune-workspace-milky-way.png`
- Native: `Rivune/Assets.xcassets/RivuneWorkspaceCosmos.imageset/rivune-workspace-milky-way.png`

Final prompt:

> Use case: atmospheric background asset for the Rivune desktop AI workspace. Create a premium continuous deep-space panorama, landscape 16:9. The Milky Way visibly flows diagonally through the entire frame from lower left, across the center, into upper right. Fine pinprick stars scattered across ALL parts of the frame, including the center; layered wisps of indigo and silver-blue cosmic dust, delicate natural starlight and believable astronomical depth. A small distant crescent planet toward the upper left and a tiny distant planet low on the right, subordinate to the starfield. Dark midnight blue and near-black space, silvery white stars, very restrained teal and mauve; no bright white galactic core. The center must contain visible stars and fine nebula texture, NOT a large empty black region. Elegant and calm enough behind dark glass interface panels, not a noisy science fiction poster. No logos, no letter R, no typography, no UI, no borders, no watermark. Seamless feeling edge-to-edge cosmic environment. Make a new original background, not a modification of the logo.

## Verification before the setup handoff follow-up

| Check | Result |
|---|---|
| Mac XCTest | 164 passed, 0 failed, 0 skipped |
| Final Mac build | Passed |
| Generic iOS simulator build | Passed |
| Web workspace tests | 26 passed |
| Web ESLint, TypeScript, production build | Passed |

Native test result: `/private/tmp/rivune-space-mac-build/Logs/Test/Test-Rivune Mac-2026.09.05_17-09-23--0600.xcresult`. Logs: `/private/tmp/rivune-arrival-tests.log`, `/private/tmp/rivune-milky-way-mac-build.log`, `/private/tmp/rivune-milky-way-ios-build.log`, `/private/tmp/rivune-milky-way-web-build.log`. An old unassigned image asset warning was fixed before the final Mac and iOS builds.

The original verification covered the earlier readiness-bound percentage. The follow-up below supersedes that percentage and recovery behavior.

Rendered browser checks at CSS 1024×576 and 312×675 verified the continuous background, readable composer, visible startup percentage, and recovery controls without overlap. The unpaired reveal remained on connection setup. A separate hidden tab paired to a fictional memory-only loopback server showed a complete reveal despite ready connections, then entered chat automatically. Stopping that fixture produced an unavailable state rather than false readiness. The fixture was stopped after QA.

No live CLI sign-in, provider inference, real API key, Keychain write, cloud account creation, or normal native launch was used in this verification. Native behavior is build- and test-verified; native rendered appearance was not inspected in this pass.

## September 5 setup handoff follow-up

- 26 workspace tests and 18 account tests pass. TypeScript, ESLint and the web production build pass. The 16 native startup/readiness tests pass in the isolated XCTest host.
- Fresh unpaired browser: loading progressed through 32%, 65%, 96%, then 100%; setup opened automatically after the completion hold. Continue locally led to CLI/API setup with Continue disabled until a provider became ready.
- A separate hidden tab used the memory-only simulated Mac fixture. Replaying with ready connections showed 8% at 1s, 50% at 6s and 100% at 12.1s; the workspace was visible at 13.7s. The reveal did not skip because a provider was ready.
- Policy tests cover cached readiness, missing/checking connections, malformed time, artwork preparation and destination changes. Native tests retain the requirement that setup cannot authorize chat until checks finish and a provider is ready.
- Source and local preview/build mirrors were updated. No account service, external provider or normal native launch was used. Logs: `/private/tmp/rivune-account-arrival-web-build.log` and `/private/tmp/rivune-account-arrival-native-tests.log`.
