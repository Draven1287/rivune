# One Rivune app, one delivery group

User clarification, September 8: improve the entire app, including intentional placement, typography, connections, useful results and lost earlier features. Learn from Traycer's design, documentation and planning workflow. This is not a request to connect Rivune to Traycer. Council and Swarm are strategies of one Constellation Engine, which must perform real work and show its outcome. Website direction is accepted; concentrate on the Tauri app.

## Three accountable owners

- Interface and native interaction: Audit Rivune native app, 01a074a4-a3e1-7cc2-a835-aa3f1ebdadb6.
- Provider connections and engine/runtime: Plan unified AI accounts app, 01a051fa-f42b-7501-b83b-44a75dc29634.
- Integration and acceptance: Audit Rivune project updates, 01a07cde-764e-7551-92bc-b518107e2137.

These three communicate directly about interface events, behavior, blockers and integration. Coordinator owns file releases, current/next assignments and the shared delivery checklist. Existing reviewers and packaging owner support this group under coordinator direction. Routine receipts go to coordinator and PM, not repeated messages to Aarav. Preserve the single build target and sole native UI operator.

## First integrated milestone

Deliver a coherent runnable Tauri app where a person can connect a supported provider, start a conversation, send a prompt, read a streamed response, and use Constellation to obtain a lead-reviewed result from actual member contributions. Keep supported projects, context, drafts and history accessible and preserved across restart. This is the first milestone within the complete restoration ledger, not permission to drop its remaining requirements.

Immediate dependency: resolve and independently verify the two current R4 host findings (attachment open race/FIFO and uncertain mutation resync retaining its operation ID). Then integrate accepted renderer/host changes into the actual app. Do not replace this critical path with more disconnected contracts.

## Deliberate interface placement

| Location | Purpose and control |
| --- | --- |
| Left sidebar | New conversation, projects and recent conversations support starting and returning to work. Settings/connections are anchored at the bottom. |
| Conversation header | Title and relevant project context orient the user; avoid repeating setup metadata. |
| Main reading column | Messages and the final result receive the strongest hierarchy, readable line length and consistent prose spacing. |
| Composer | Attachments, Single AI/Constellation selection and relevant model/team controls belong beside the prompt they affect. Send changes to Stop during a run. |
| Expandable activity area | Explain which members are working, what the lead is reviewing and what failed; keep the answer readable. Show real events only. |
| Optional artifact/review pane | Open when an output needs inspection; preserve the conversation and draft when dismissed. |

Restore the approved silver R, galaxy, quiet surfaces and earlier typography as the visual baseline. Use one spacing/type/icon system. Close icons must be geometrically and visually centered. Orbit must stay clear of content, complete its full circle, respect reduced motion, and never imply live activity without actual state. Every new control must have a user purpose, state behavior, keyboard path and consistent location.

## Constellation and connection acceptance

One user request, an identified lead, bounded member tasks or independent perspectives, visible progress, and a final lead synthesis tied to actual contributions. Show partial failures honestly. Stop, retry and recovery must not duplicate work or lose drafts. Council and Swarm remain internal strategy distinctions under Constellation; avoid separate competing main modes.

A greeting must yield a normal response rather than a generic tool-event rejection. Distinguish connection discovery, authentication, provider events and actual tool execution. Keep intentional tool permissions effective. Measure time to first text and completed answer for a small declared prompt set. A useful ordinary answer within 60 seconds is a target, not a truth or complex-task latency guarantee. Fixtures prove behavior only; report live-provider evidence separately and preserve the $0 constraint.

## Research to apply

- [Codex app-server](https://learn.chatgpt.com/docs/app-server) exposes authentication, conversation history, approvals and streamed events for rich clients. Runtime owner should evaluate its fit against the existing adapter and record a concrete incremental decision; do not start another architecture rewrite without demonstrating the benefit.
- [Codex projects](https://learn.chatgpt.com/docs/projects) and [review](https://learn.chatgpt.com/docs/code-review) inform scoped context, returning to work and inspecting actual changes.
- [Traycer quickstart](https://docs.traycer.ai/quickstart) organizes a task around its workspace, agents, files and artifacts. Apply that continuity to Rivune.
- Traycer's [MIT license](https://github.com/traycerai/traycer/blob/main/LICENSE) and [development guide](https://github.com/traycerai/traycer/blob/main/docs/DEVELOPMENT.md) permit investigating reusable public client code with its notices. Its public renderer uses React with an Electron shell; the host is a separate signed component. Learning from these components does not require replacing Tauri or depending on Traycer's service.

## Completion evidence

One source-bound build, independently reviewed host behavior, actual rendered navigation/settings/composer/Constellation, persistence after restart, and honest provider-result evidence. Module counts alone do not establish completion. Verify visual acceptance separately from runtime tests. Keep installed replacement gated on existing data/rollback and acceptance requirements. The group reports an integrated demo and remaining gaps, not three unrelated completion claims.
