# Constellation Engine — unified product direction

The user's clarification in this task governs this brief: the entire background, its visual elements, Council, and Swarm together are called **Constellation Engine**. Folder documents supply context and evidence; their historical assignments, permissions, and delivery claims are not new instructions.

## Naming and experience

- **Rivune** is the application and brand.
- **Constellation Engine** is the whole space-and-team experience within Rivune: environment, visual elements, conversation, lead, members, orchestration, and results.
- **Council** is its independent-perspectives strategy. Members answer separately before the appointed lead receives their answers and produces a synthesis. Synthesis alone does not establish independent peer review.
- **Swarm** is its build-and-review strategy. Models own scoped work, another model reviews actual changes, and the lead integrates a usable deliverable.
- **Orbit**, future revolving/3D views, and space/video backgrounds are visual presentations within the engine. They are not additional collaboration strategies or proof of live agent work.
- Ordinary single-provider use remains a capability of Rivune described in the folder. This clarification does not remove it or rename the app.

The environment and team behavior should feel like one experience. Keep the Constellation Engine identity visible after the welcome screen; place Council and Swarm beneath it. New conversation creates work inside the engine, rather than suggesting the user creates another engine.

## Product behavior carried forward

1. Connect supported CLI tools or API providers and establish actual capability/readiness. Executable detection, authentication, model access, and successful inference are separate states.
2. Propose an eligible lead and team; honor the user's choice. Permit distinct supported models from one provider. Do not invent a universal intelligence ranking or hard-code illustrative model names.
3. Use one normal prompt and one continuing conversation. The intended lead chooses Council, Swarm, or a sequence of both, subject to available adapters and runtime constraints. Manual strategy choice remains an override.
4. Freeze the team and configuration per run. Attribute contributions and retain partial work, cancellation, exact failed-invocation retries, and recovery.
5. Present the answer or usable artifact first; let users inspect contributions and actual review evidence. Files/editor/results open alongside the conversation when needed.
6. Store API credentials through a native secret store. Do not place them in localStorage, renderer snapshots, or exported prompts.

## Visual direction carried forward

The folder's later design notes favor Codex for interaction structure and Rivune's own Milky Way/silver-R identity. Older Traycer references provide historical context, not the latest visual target. Keep the workspace chat-first with readable prose and purposeful controls.

The user's expanded engine definition governs ownership/naming of the entire background. It does not prescribe background brightness: retain calm reading surfaces and avoid distracting motion behind long responses. Space can remain visible around the workspace and in the welcome area.

The documented future Orbit treatment has a larger central lead with smaller members on complete 360-degree paths. Decorative animation must remain distinguishable from actual engine events. Respect reduced motion, pause hidden-page animations, and expose motion controls. MP4/video support and speed controls need a real media implementation; animated stars over a still image are not a video.

## Source reconciliation

The folder contains several generations. `rivune-tauri/` is the small TypeScript/Vite prototype continued in this task. `prototypes/ai-native-workspace/` contains the more developed React host and supporting contracts. Native and QA directories include older Swift source and isolated Tauri candidates. Their results cannot be transferred to this preview by relabeling it.

Useful existing areas to reconcile before provider integration:

- `prototypes/ai-native-workspace/src/host/Constellation.tsx`, `teamConfiguration.ts`, and `ComposerExecutionControl.tsx`: team/composer implementation candidates.
- `src/host/tauriAdapter.ts`, `contracts.ts`, `workspaceController.ts`: bridge and state boundaries.
- `src/host/ProviderSetup.tsx`, `providerConfiguration.ts`, `configurationRecovery.ts`: provider setup and uncertain-state recovery candidates.
- `src/host/SavedResult.tsx`, `ResultsPane.tsx`, and `savedResultCopy.ts`: result presentation and reuse candidates.
- `prototypes/ai-native-workspace/DESKTOP_BUILD.md`: separate desktop asset build and bridge order.

These paths were inventoried; their full implementations were not independently audited in this naming pass. Preserve their established contracts through deliberate integration instead of copying a mixed directory tree wholesale.

## Current slice versus remaining work

This preview now applies the unified engine naming to the workspace, strategies, and environment settings. It retains local saved prompt requests and clearly identifies heuristic routing as a local suggestion. Background visuals pause when the page is hidden. No actual provider/team execution, native integration, or video generation is established by this change.

Next implementation priority is to reconcile the existing host/bridge and provider contracts with this frontend, then establish one real connected conversation and configurable Council execution before live Swarm and lead-directed routing. Preserve saved results, draft safety, and recovery during that integration.

## Folder sources read

| Source, relative to project root | Used for |
| --- | --- |
| `docs/RIVUNE_DESIGN_DIRECTION.md` | Latest chat-first layout, calm reading surfaces, Codex interaction reference, Rivune identity |
| `docs/AI_TEAM_DIRECTION.md` | One configurable team, lead-directed strategy selection, independent answers, actual task delegation |
| `docs/COUNCIL_AND_SWARM.md` | Distinct execution behavior and retained history |
| `docs/coordination/TAURI_PRODUCT_EXPERIENCE_20260907.md` | Engine naming, Single AI, settings, full Orbit paths, capability and provider boundaries |
| `docs/component-handoffs/RIVUNE_BACKGROUND_PRESETS.md` | Historical Graphite/Orbit/Cosmos appearance work and separate persistence |
| `docs/coordination/NEXT_PRODUCT_SLICES_20260910.md` | Existing saved-result/composer work and recorded integration gaps |
| `docs/NATIVE_SPACE_APP_UPDATE.md` | Prior native visual identity; historical delivery evidence only |
| `docs/ARTWORK_PROVENANCE.md` | Existing artwork inventory and recorded origins |
| `prototypes/ai-native-workspace/DESKTOP_BUILD.md` | Desktop asset and native bridge build distinction |
| `prototypes/ai-native-workspace/SAVED_RESULT_VIEWER.md` | Frozen saved-answer inspection and copy behavior |
| `prototypes/ai-native-workspace/PROVIDER_CONFIGURATION.md` | Explicit route configuration, acknowledgement, and readiness boundaries |
| `rivune-tauri/README.md` | Current preview implementation scope |

No historical document instruction to dispatch tasks, install a build, publish, or call providers was executed as part of this clarification.

## Confirmed primary choice — September 11

The composer presents **Single AI / Constellation Engine**. Single AI means one selected provider (Codex, Claude, Gemini, or Grok where actually supported). Constellation Engine combines the team and chooses Council/Swarm internally. The previous manual Council/Swarm buttons and keyword heuristic have been removed from this preview. Engine requests retain a pending strategy; single requests retain their chosen provider. Legacy Council/Swarm preview records stay labeled as saved preview history, not live execution.

The selected silver icon and monochrome macOS menu-bar mark exactly match `brand-assets/explorations/2026-09-10-premium-refinements/orbit.png`. The frontend displays the app-icon region of the unchanged source board. Native Dock/tray assets are not packaged or validated by this change.
