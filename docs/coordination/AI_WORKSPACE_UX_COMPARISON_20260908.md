# Rivune workspace UX comparison

Status: source-backed product-direction input for the shared browser preview. This is not an implementation or a claim that the preview already contains these behaviors.

## Observed product behavior

### OpenAI Codex app

OpenAI describes the Codex app as a command center for multiple agents. Tasks run in separate project threads, can run in parallel, and can use isolated worktrees. The app supports reviewing changes inside a thread, commenting on diffs, and opening changes in an editor. OpenAI also describes multiple files and terminals, an in-app browser, scheduled work with a review queue, and shared state across local or remote hosts.

Primary sources:

- https://openai.com/index/introducing-the-codex-app/
- https://openai.com/index/codex-for-almost-everything/
- https://openai.com/index/work-with-codex-from-anywhere/

Applicable Rivune lesson: keep projects, conversations, agents, diffs, terminals and approvals visible as durable workspace objects. Show real task state and isolation explicitly. Do not imply that a visual agent card is executing unless a host event supports it.

### Traycer

Traycer's documentation centers on spec-driven development: turn intent into a structured plan, break complex work into phases, hand plans to coding agents, and verify that implementation matches the plan. Its documented orchestration spans multiple coding agents and returns targeted fix suggestions when verification finds gaps. Traycer's current product site also presents a unified multi-model canvas, but marketing claims such as sub-100 ms switching are not treated as Rivune requirements or reproduced as facts in the UI.

Primary sources:

- https://docs.traycer.ai/
- https://www.traycer.co/

Applicable Rivune lesson: the center-right area should make the chain from directive to planned work, changed files, execution evidence and review legible. A timeline should show observable events and verification outcomes. It must not display invented private reasoning or synthetic performance as measured activity.

### Claude Artifacts

Anthropic documents Artifacts as substantial, standalone content shown in a dedicated window to the right of the main conversation. Artifacts can include documents, code, websites, diagrams and React components. Edits create selectable versions, supporting iteration without filling the conversation with the entire artifact on every turn.

Primary source:

- https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them

Applicable Rivune lesson: keep chat readable while the editor, diff and preview share a separate artifact surface. Preserve artifact identity and version context so a user can tell what changed and which result is under review.

## Proposed Rivune behavior

The following behaviors come from Rivune's product brief. They are proposals until the shared preview demonstrates them and the Tauri host supplies corresponding events.

| Rivune surface | Proposed behavior | Evidence boundary |
| --- | --- | --- |
| Left context | Files, active Constellation members, terminal sessions and masked synthetic environment variables | Demo entries must say they are demo data; later host state replaces them through the adapter |
| Chat | Directives, slash commands, streaming blocks and status banners | Streaming uses a deterministic local timer in the preview; Stop cancels only that timer |
| Editor and artifacts | File tabs, textual green/red diff, execution result and inert web preview | No disk write or arbitrary generated-code execution in the browser preview |
| Telemetry shelf | Terminal output, observable phases and nullable token, cost and performance values | Demo values identify their source; unavailable values remain unavailable |
| Resizing | Pointer and keyboard resizing, minimum widths, persistence and narrow-window collapse | Must be verified in an actual browser, including focus and reduced motion |
| Constellation | Lead and member status with one final result and inspectable contributions | Only provider or host events may represent real execution; no hidden chain-of-thought display |

## Direction for the first preview

Use Codex's durable multi-task hierarchy for navigation, Traycer's plan-to-verification legibility for activity, and Claude's separate artifact surface for reading and iteration. Rivune's differentiator is the unified Constellation view across connected providers. Keep the galaxy identity around the workspace while using calm slate panels for code and reading.

The first review must answer five concrete questions:

1. Can a user find a project, active agent and file without scanning the whole screen?
2. Can a user distinguish a directive, observable progress, a changed file and a reviewed result?
3. Can the artifact remain visible while the conversation stays readable?
4. Do keyboard resizing, slash-menu navigation, focus and narrow-window collapse work?
5. Is every synthetic value, simulated stream and unavailable host feature labeled honestly?

