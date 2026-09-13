# Current routing checkpoint

The September 8 frontend-only queue below is historical and is not the active ownership map. Use `LIVE_DISPATCH_STATE.md` and the latest user instruction. RIVUNE APP BUILDER is the sole app source/build owner; independent reviewers take bounded reviews after actual changes. S02 isolated runtime evidence has been independently accepted. Real provider execution, restart, installation and release remain separate scopes.

## Historical queue

# Current work: one React frontend browser preview

Authority: AI_WORKSPACE_FRONTEND_BRIEF_20260908.md and AI_WORKSPACE_FRONTEND_CONTRACT_20260908.md. Shared source: prototypes/ai-native-workspace. Reuse PM scaffold; no second preview. Desktop implementation, builds/signing/launch/install/cleanup and automatic fan-out remain PAUSED. Historical queue preserved in PAUSED_DESKTOP_QUEUE_20260908.md; its releases do not resume.

| Owner | Current exact work | Next/dependency |
|---|---|---|
| Frontend01a074 | App/main/styles, resizable layout, ChatPanel/composer/status, TelemetryShelf; sole integration/devserver | Integrate shared components, then rendered fixes |
| Runtime01a051 | types, demo data, useWorkspaceDemo and adapter contracts | Publish exact types first; integrate mock callbacks |
| Support01a08294 | editor/EditorPanel,DiffView,ArtifactPreview | Shared types; component then integration fixes |
| Menu01a07cde-0293 | Sidebar and SlashCommandMenu | Shared types/ChatPanel keyboard contract; integration fixes |
| Packaging01a07831 | package/lock/config/index only; reuse dependencies | Typecheck/build readiness, frontend-only portability |
| Reviewer01a08293 | Read-only component/rendered review | Wait actual sole previewURL; keyboard/resize/stream/diff/narrow acceptance |
| PM01a07f0d | Requirement ledger/acceptance evidence in PMoutputs | No code/competing dispatch |

Exact file ownership and props are in the contract. Chat and telemetry explicitly belong frontend. All mock data visibly labelled; environment synthetic/masked; no fabricated hidden reasoning or real metrics. Single browser preview, no desktop app. Component authors coordinate interfaces directly and send concrete files/results. First milestone is typed/buildable rendered workspace, not a finished runtime.
