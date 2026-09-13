# One browser preview: implementation contract

Authority: AI_WORKSPACE_FRONTEND_BRIEF_20260908.md, read in full. Desktop operations, old implementation work and automatic fan-out remain paused.

Shared source root: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/prototypes/ai-native-workspace`.

This is the only new frontend preview. No second scaffold or desktop shell. Use React, TypeScript and Tailwind with a browser-only entry point and a host adapter boundary. All fixture data and terminal/preview/telemetry behavior are visibly labelled demo. No real environment values or provider calls. Reuse existing dependency caches where compatible; no Cargo or desktop target.

## Exclusive ownership

- Frontend01a074: `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/components/chat/ChatPanel.tsx`, `src/components/TelemetryShelf.tsx`, `src/components/ResizableLayout.tsx`. Sole integration owner, owns responsive layout, design tokens, chat, keyboard/pointer resizing and layout persistence.
- Runtime01a051: `src/types.ts`, `src/data/demo.ts`, `src/hooks/useWorkspaceDemo.ts`, `src/hooks/workspaceAdapter.ts`. Shared types and deterministic local simulation only; no Rust/old-host edits.
- Support01a08294: `src/components/editor/EditorPanel.tsx`, `DiffView.tsx`, `ArtifactPreview.tsx` in the same editor directory. Text-safe editor/diff and bounded inert preview; no arbitrary execution.
- Menu01a07cde-0293: `src/components/sidebar/Sidebar.tsx` and `src/components/chat/SlashCommandMenu.tsx`. Navigation/explorer/agent list/terminal list/masked synthetic environment; accessible slash-menu interaction.
- Packaging01a07831: root `package.json`, one lockfile, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json` if needed, and dependency/build configuration only. Coordinate Tailwind version/CSS setup directly with frontend before edits. Reuse compatible installed runtime/caches; report actual paths/commands. One browser dev server after scaffold readiness, frontend owns its start/control.
- Reviewer01a08293: read-only source/rendered review; evidence under `qa-artifacts/ai-workspace-frontend-review-20260908`. No implementation edits unless a specific correction file is transferred.
- PM01a07f0d: acceptance ledger in PM outputs only, one row per brief requirement with evidence and remaining gap.
- Coordinator: this contract/queue, routing, reviews; no component edits overlapping owners.

## Shared exports and props

Runtime publishes exact TypeScript interfaces first and notifies all authors. Use these names; extend by direct agreement, not competing contracts:

- `WorkspaceFile`: `id`, `name`, `path`, `language`, `content`, optional `originalContent` (absence is distinct from empty text).
- `Agent`: `id`, `name`, `role: 'lead' | 'member'`, `status: 'idle' | 'working' | 'waiting' | 'done' | 'failed'`, `phase` (observable/demo phase, no hidden reasoning).
- `ChatMessage`: `id`, `role: 'user' | 'assistant' | 'system'`, `content`, optional `agentId`, optional `streaming`.
- `Artifact`: `id`, `title`, `kind: 'code' | 'web' | 'text'`, optional `fileId`, `content`.
- `TerminalSession`: `id`, `title`, `lines: string[]`, `status`.
- `EnvironmentVariable`: `name`, `maskedValue`, `synthetic: true`.
- `Telemetry`: measured values nullable, explicit `source: 'demo' | 'measured' | 'unavailable'`; fixtures never presented as real spend/performance.
- `SlashCommand`: `id`, `label`, `description`, `insertText`.

`Sidebar` named export props: `files`, `agents`, `terminals`, `environment`, `activeFileId`, `onSelectFile(id: string)`.

`EditorPanel` named export props: `files`, `artifacts`, `activeFileId`, `onSelectFile(id: string)`; it owns editor/diff/preview tabs and delegates its editor subcomponents. Editing can be local demo state, must not imply disk writes.

`SlashCommandMenu` named export props: `commands`, `query`, `activeIndex`, `onActiveIndexChange(index: number)`, `onSelect(command: SlashCommand)`, `onClose()`. Parent ChatPanel owns composer and routes ArrowUp/Down, Enter, Escape; menu exposes accessible active option IDs. Both owners agree focus handling directly.

`useWorkspaceDemo()` returns typed workspace state plus `activeFileId`, `selectFile`, `sendDemoMessage`, `stopDemoStream`. Runtime and frontend agree the exact return shape in `types.ts` before integration. Sending is local deterministic simulation, labelled demo; Stop cancels local timer only and must not imply real provider cancellation.

No component imports another owner's private module. Shared imports come from `types.ts`; fixtures from `data/demo.ts`. Components use named exports. Use relative imports initially; package owner may establish a shared alias only by agreement.

## First integrated check

One browser page with persistent left context, chat/composer, editor/artifact split and collapsible telemetry. Pointer/keyboard resizing with minimum sizes and persisted layout; narrow viewport collapses auxiliary panels. Diff uses signs/text as well as colors. Slash menu keyboard/Escape, streaming scroll intent, reduced motion and visible focus. Environment masked. Demo status prominent, no fabricated private reasoning or real usage metrics. Typecheck/build and actual rendered interactions are required before any production-readiness claim.

Owners send concrete file checkpoints to coordinator/PM and coordinate shared interfaces directly. After first implementation, fix assigned integration defects; do not create parallel apps or revive old desktop work. No automatic cadence restart.

Scaffold reconciliation: reuse PM-started prototypes/ai-native-workspace. PM stopped authoring; runtime takes existing types/data, packaging takes existing configs. The coordinator-created frontend-preview/rivune-ai-workspace contains empty directory placeholders only and is not an implementation or server; do not use it. No cleanup requested.
