# Retained supersession panel — final narrow UI closure

Independently opened exact selected composer-supersession-preview URL on existing4317 at390×844. Setup verified banner, no automated full suite. Used only fake second-change and actual review/accept UI pointer clicks.

PASS: scrolled Write a message region; screenshot visibly shows Saved revision4:Single AI·Mock connection(third-provider), first external writer message and fully visible acceptance button. Text wraps and lower action is reachable.

PASS: Apply fake second change then acceptance rejects with Saved configuration changed again; captured revision4/third-provider/first message remains, local text retained and Send disabled.

PASS: explicit Re-review updates visible panel to revision5/second-provider/second writer message. Acceptance pointer click succeeds; DOM confirms no host-conflict panel, summary Single AI·Mock connection(second-provider), Message focus and exact original local text Keep this local message while reviewing saved configuration. Screenshot shows normal composer and enabled Send, without the review height restriction. No Send pressed.

Scoped CSS inspected: .host-composer:has(.composer-execution):has(.host-conflict) gets max-height65%,min-height0,overflow:auto. It is conditional on conflict/review presence; ordinary composer does not match after acceptance. This also applies to existing host-conflict panels, not solely supersession. No unrelated conflict matrix repeated.

Verdict: manual390 review-panel reachability and supersession flow CLOSED. No residual defect observed in this scope; prior automated/keyboard evidence remains separately accepted. Viewport reset. No app edits/server/native/provider/clipboard/publication actions; screenshots inspected inline only.

Exact current hashes versus retained manifest (no served bundle byte attestation):
- `prototypes/ai-native-workspace/src/host/ComposerExecutionControl.css`: `7865759b2ea2519f5f8b65187156f74cc01812f3c74d2887171df6d4040a1c8e`; matches.
- `prototypes/ai-native-workspace/tests/hostRenderer.test.tsx`: `2aefc2df52306408cb7c343ca2ae18e30d1188fae843e959b90bdd6ddf71a687`; matches.
- `prototypes/ai-native-workspace/tests/rendererScenarios.ts`: `612fcba6d2acbdf9a21158f6abeffa8e6086a22c070e917b4fdbd27d423f46ea`; matches.
