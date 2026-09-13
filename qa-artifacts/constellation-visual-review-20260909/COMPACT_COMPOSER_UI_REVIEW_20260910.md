# Compact composer independent UI review

Selected existing4317 hostRenderer.html?scenario=compact-composer&preview=1 only. Observed PASSED(10). No native/provider/real persistence/OS clipboard/newserver actions. Synthetic configuration save only.

## Finding

P2 usability: duplicate provider labels make explicit pin choice ambiguous. In Single AI connection, two different routes display exactly Pin to: Mock connection. The Constellation member/lead controls distinguish second-provider and third-provider by ID, but the pin selector omits it. Reproduction: retained fixture → open summary → Single AI → inspect connection options. User cannot reliably identify the desired route by visible/accessibility option name. Show stable distinguishing IDs (at least for colliding labels); verify both options separately identifiable and exact chosen ID saved. Do not change branding.

## Observed bounded passes

One saved summary initially Constellation ·2members ·Lead:Mock connection. Changing editor to Single AI leaves that summary unchanged and shows Not saved. Default and Pin to options explicitly distinguish inheritance from pinning. Cancel closes/discards and restores summary focus. Reopen, Single AI with workspace default, Save configuration: summary becomes Single AI ·Local test fixture only after save; summary focused. Escape from Execution mode also closes and returns summary focus.

320×568 open team editor screenshot shows bounded internal scrolling in normal flow, with Message and draft/send controls below rather than an overlay.390×844 open Single AI screenshot shows Review connections/Save/Cancel reachable and Message visible; desktop1440×900 shows editor and Message in normal flow. Header summary remains visually one line with full DOM name. Provider default ·exact model not reported and availability-is-not-sign-in/response wording observed. No new layout defect established. Viewport reset.

Selected automated cases observed pass; source inspected for catalog-change conflict requiring Keep my choices, no silent save, missing second-provider visible by ID/unavailable, retained team, blocked invalid save, and explicit valid mode change. Those are selected automated observations, not manual retained conflict injection. Prior tests also cover Load saved and uncertain recovery; no independent live-provider or native claim. Full keyboard traversal and every conflict-focus edge were not manually repeated.

## Provenance

Current file SHA256 comparison to supplied manifest below; no before/after bundle freeze or served JS byte attestation claimed. No app edits or screenshot forwarding.
- `prototypes/ai-native-workspace/src/host/ComposerExecutionControl.tsx`: `806220c29d44b786d6a303801b390a063834852f5998d3223401f14e4f689c27`; matches.
- `prototypes/ai-native-workspace/src/host/ComposerExecutionControl.css`: `32826f66be0fc2b142ddac9f5e4db1a89dd7154d1754e61341a3f266fb36bea2`; matches.
- `prototypes/ai-native-workspace/src/host/composerConfiguration.ts`: `6cdada6cc23c64cc85a7f1161c5ae2907130014371edac8371be04e1df5bc486`; matches.
- `prototypes/ai-native-workspace/src/host/workspaceController.ts`: `86f6bb4b8c1b9825471f506c700d6ac8be5eee3471687458b0e6dc33301330df`; matches.
- `prototypes/ai-native-workspace/src/host/HostWorkspace.tsx`: `1311183148c39f91cc5a8a3cefd56dc84ba1acba80c20da620f1c10fd06f5b37`; matches.
- `prototypes/ai-native-workspace/tests/hostController.test.mjs`: `3734a51eb3cff9191b4f1353bb43401f391f63b110c31dc934e47386fc9173d3`; matches.
- `prototypes/ai-native-workspace/tests/hostRenderer.test.tsx`: `e8f7dd369a7c0eb9f081754a5023db67de5ec494c21ab8f268acda25de7c7ee2`; matches.
- `prototypes/ai-native-workspace/tests/rendererScenarios.ts`: `2b6abffffc5b3ff9636cd08c18d05acbdc6475cf0d42a878ed5c763aaf546708`; matches.
