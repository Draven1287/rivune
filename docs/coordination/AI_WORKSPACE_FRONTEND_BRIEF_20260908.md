# Rivune AI workspace: shared frontend brief

This records Aarav's new prompt, deduplicated from five repetitions without dropping requirements. It authorizes this frontend architecture/layout work after the earlier pause. Older app builds, signing, installation, QA launches, cleanup and automatic dispatch remain paused. Deliver one shared implementation, not a new app per developer.

## User prompt

You are an expert Principal Frontend Architect specializing in React, TypeScript, Tailwind CSS, and Electron. Generate production-ready boilerplate code, component architecture, and layout for a state-of-the-art AI-native development workspace.

### Core inspiration and philosophy

Consolidate these requested UX qualities:

1. OpenAI Codex Desktop: an IDE layout with persistent sidebar, active multi-agent thread management, and real-time execution panels.
2. Tracer: visual debugging, execution timelines, step-by-step state inspection, and rich data-flow visualizations.
3. Claude: clean, readable typography and a side-by-side Artifacts pane for previewing code execution/rendering without polluting the chat thread.

These are desired product capabilities, not verified claims about another product. The previously confirmed reference is Traycer. The research task must distinguish observed behavior from proposed Rivune behavior.

### Application layout hierarchy

- Left sidebar — Navigation and Context: project file explorer, active agent list, terminal sessions, and environment variables.
- Center-left — Chat and Directives: high-fidelity AI agent chat, inline token streaming blocks, slash command menus, and rich system status banners.
- Center-right — Primary IDE and Artifacts: split-view file editor, inline green/red additions/deletions, interactive execution results, and live web canvas preview.
- Bottom shelf — Telemetry: collapsible terminal, performance metrics, token burn-rate counter, and real-time model thinking-state visualization.

### Design system and aesthetics

- Premium dark Slate/Zinc palette, minimal purposeful accents: emerald for active agents, amber for active streaming.
- Monospace for code; sharp sans-serif for interface text, clear hierarchy and scannability.
- Responsive interactions, skeletons for streaming blocks, smooth collapsible panes and visual anchors for diff highlights.

### Required deliverables

1. Structured TypeScript component tree including components/sidebar, components/editor, components/chat and hooks.
2. App.tsx using Tailwind Grid/Flexbox and resizable panels.
3. types.ts with mock-data schema for multiple parallel agents and output artifacts.

## Implementation interpretation and acceptance

- Shell decision: user delegated the choice; retain Tauri with React/TypeScript/Tailwind. Tauri supports framework-independent web frontends and existing Rust/IPC work remains usable. Electron's bundled Chromium/Node offers a consistent browser engine and Node ecosystem, but none of this brief requires a Node-enabled desktop shell. Switching would add host migration and packaging work without itself improving layout or typography. Keep an adapter boundary and test the intended system webviews; reconsider only on a demonstrated unmet requirement. Sources: https://v2.tauri.app/start/frontend/ , https://v2.tauri.app/concept/architecture/ , https://www.electronjs.org/docs/latest/tutorial/process-model . This is a project-specific engineering judgment, not a universal framework ranking or a measured performance claim.
- Mock data must be labelled as demo data. Real token/cost/performance values require measured provider events; unavailable values are unavailable, not zero or invented. Model state means observable phases/progress or provider-supplied summaries, not fabricated private reasoning.
- Environment values must be masked; use synthetic fixtures only. Previews and terminals are demonstrative until an explicitly scoped host integration exists. Never execute arbitrary generated code to make a mock preview look live.
- Retain Rivune identity, silver R and the approved galaxy as an optional surrounding theme, while keeping reading/editor panels calm. No screenshots embedded as UI. Constellation remains the unified lead/member experience.
- Panel resizing supports pointer and keyboard, minimum usable widths and persisted layout. Collapse auxiliary content on narrow windows; keep chat/composer usable. Reduced motion and visible focus are required.
- Diff conveys changes with text/signs as well as color. Slash menu supports keyboard selection/Escape. Streaming updates preserve scroll intent; Stop represents real cancellation only when wired.
- Review source typing/build and rendered interactions before calling this production-ready. Boilerplate/mock demonstration alone is not a finished AI runtime or an accepted installed app.

## One implementation group

Coordinator 01a07cde-764e controls one frontend source directory and file boundaries. First publish that exact directory and component contract to all owners; use existing React scaffolding if suitable, avoid duplicate dependencies/build caches.

| Owner | Bounded work |
| --- | --- |
| Frontend 01a074a4 | App.tsx, shell layout, typography/tokens, responsive resizable panes; sole integration owner |
| Runtime 01a051fa | types.ts and hooks/adapter contracts, deterministic mock agent/artifact/telemetry data; preserve existing host unchanged |
| App support 01a08294 | editor/artifact/diff/preview components within coordinator's released files |
| Menu 01a07cde-0293 | sidebar and slash-command interaction components within released files |
| Reviewer 01a08293 | independent rendered keyboard/resize/streaming/diff accessibility checks; report specific corrections |
| Packaging 01a07831 | frontend-only dependency/build portability check; no desktop packaging/signing or new app copies |
| PM 01a07f0d | requirement-by-requirement acceptance ledger and deduplicated progress; no competing implementation directives |
| Product direction 01a06efc | read-only Codex/Traycer/Claude source-backed UX comparison; no release authority |
| Continuous dispatcher 01a0845a | align backlog and ownership to this brief; no automatic fan-out restart without user instruction |

First reviewable outcome: one browser-rendered workspace demonstrating the requested layout and interactions with clearly marked synthetic data, accompanied by its TypeScript file tree and explicit host-integration gaps. No additional desktop application should be launched or installed for this review.
