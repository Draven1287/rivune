# Rivune workspace interior

September 5, 2026. Local implementation; not installed or published.

## Direction implemented

The workspace now opens directly. The approved arrival stays available through Replay arrival, with full startup integration deferred. Readiness checks continue independently and still gate sending.

- Plain silver ribbon R inside the app.
- Rivune replaces Together as the visible collaboration mode. Internal mode identifiers are unchanged.
- Labeled Home, Conversations and Connections navigation, a separate Recent list, and Settings.
- Compact composer with Rivune, ChatGPT and Claude controls; Think, Build and Review starters.
- Dedicated provider cards expose CLI and API state, with the existing local Mac pairing flow in the browser.
- Dark glass surfaces over a separate star-and-galaxy backdrop with a quiet center for reading.
- Native Home preserves an unsent draft's provider selection. Browser-to-native conversation opening has an explicit presentation event, including when the requested conversation is already selected.

## Visual and interaction checks

Rendered the real local browser UI at its normal size and a 390 x 844 CSS viewport. Reviewed Home, the conversation/composer, Connections and collapsed navigation. Raised small-text size and contrast after initial inspection, and kept both galaxy corners visible on tall workspace panels. Restored the default viewport afterward.

Verified disconnected sending is disabled and a draft survives a visit to Connections. Used a separate temporary tab and loopback-only, fictional UI transport to verify:

- ChatGPT CLI and Claude API routes render distinct status details.
- Rivune sending is disabled before sharing consent and enabled afterward.
- An accepted request appears in its conversation; Stop reflects the cancelled state.
- A next-message draft survives cancellation and navigating to a different conversation and back.
- Completed Markdown responses and request activity render in the conversation view.
- Compact navigation opens, routes to Home/Connections, and starter cards fill the composer.

The temporary transport never called a model, read native history, or stored credentials. Its fictional tab was closed and the server stopped. The user's original preview was left unpaired, with the temporary test draft removed.

## Build evidence

- Web contract tests: 9/9 passing.
- Web lint and TypeScript: passing.
- Web production build: passing, including the final typography/background refinement.
- Mac build: passing; `/private/tmp/rivune-native-workspace-mac-build.log`.
- Generic iOS Simulator build: passing; `/private/tmp/rivune-native-workspace-ios-build.log`.

Native sources and the isolated built mirror match. Native app was not manually launched. Fixture checks verify UI behavior, not live provider connectivity; real chat still requires a configured, paired Mac. No Google account or cloud sync was implemented by this UI change.

## Background asset

Master: `brand-assets/explorations/rivune-workspace-cosmos.png`.
SHA-256: `cd772e6a23e83846950361540ac0e3c1c830bce56139001c74c3335b246929ce`.
Generated output: `/Users/Aaravshah/.codex/generated_images/01a06efc-96d4-76d1-a67f-60d63b0fb1e2/exec-c0c7096e-984d-4d3e-b11a-40800662acfd.png`.

Generated as original widescreen deep-space artwork with no logos or typography, a nearly black center, navy galactic dust in the upper-right and lower-left corners, sparse small stars, and a tiny crescent planet. Copied without modifying the generated artwork. The web uses `/brand/rivune-workspace-cosmos.png`; native uses `RivuneWorkspaceCosmos.imageset`.
