# Rivune: CLI orchestration references

Research date: September 4, 2026. Both newly supplied attachments contain the same note. This supplements [the UI comparison](COMPETITOR_UI_RESEARCH.md). Its numerical fit ratings are subjective, and its capability lists require qualification.

## Revised recommendation

Use **Clopen to study engine adapters**, **The Cog to study coordination**, and **GT Office to study desktop process/workspace structure**. Use VibeSpace and Clodex for focused lessons about normalized activity and session visibility. Retain Rivune's SwiftUI interface and existing collaboration records. No repository has been selected as a replacement foundation, installed, or incorporated into Rivune.

These are closer references for CLI execution than a universal API chat client. They do not establish that Rivune can safely combine their components without engineering, or that a group of agents will reliably finish arbitrary projects.

## Verified shortlist

| Project | What the evidence supports | Qualification for Rivune |
|---|---|---|
| [The Cog](https://github.com/the-cog-dev/cog) | Electron/React IDE with CLI agents, role-targeted tasks, messaging through MCP, project persistence, editor and Git views. The inspected launcher has provider-specific branches for Claude, Codex, Gemini, Kimi, Copilot, Grok, OpenClaude and Pi. | Strong coordination reference. Its published UI uses many floating agent terminals. Rivune should keep such details behind Activity. The README declares MIT; this was not a full license/dependency audit. |
| [Clopen](https://github.com/myrialabs/clopen) | Bun, Svelte, Elysia/WebSockets and SQLite. An engine registry includes Claude Code, OpenCode, Codex, Copilot, Qwen Code, Pi, Cline and Cursor; source documentation describes normalized events and per-run cancellation. | Strong adapter reference. Registration is not proof of feature parity. Distinct engines and accounts remain identifiable within a session. Its broad development-tool UI is more than Rivune needs on first launch. [MIT license](https://github.com/myrialabs/clopen/blob/97d42157684d783eab2af551e9e4c8e4d5c385af/LICENSE) verified. |
| [GT Office](https://github.com/Laplace-bit/GT-Office) | Tauri, React and Rust; persistent agent workspaces, terminal/files/Git/tasks, and an agent task bus. Apache 2.0 license. | Inspected installer and settings paths implement Claude and Codex. Gemini appears in repository marketing but was not established in those built-in integration paths. Tauri is a desktop shell with web UI, not SwiftUI. |
| [Coder Studio](https://github.com/spencerkit/coder-studio) | React/Fastify browser workbench with Electron packaging, provider management and supervisor workflows around coding CLIs. [MIT license](https://github.com/spencerkit/coder-studio/blob/main/LICENSE) verified. | [Provider docs](https://github.com/spencerkit/coder-studio/blob/main/docs/wiki/Agent-Providers.md) describe Claude/Codex/Gemini/Cursor as stable, OpenCode as limited/experimental, and Aider as preset/custom-command support. Do not present all as equivalent built-in adapters. |
| [VibeSpace](https://github.com/ProblemFactory/vibespace) | Browser workspace with terminal and structured chat, editor, and persistent CLI sessions. Claude Code and Codex are the documented built-in backends. | Other CLIs require an adapter. “Backend-agnostic” is an architecture goal, not proof of arbitrary CLI support. README declares MIT; separate license text was not retrieved. |
| [Clodex — avirtual](https://github.com/avirtual/clodex) | Electron interface plus headless Node engine for Claude Code, Codex and shell fleets, with local/remote sessions, messaging and activity. | This matches the supplied fleet description; similarly named repositories are different products. Current repository declares Apache 2.0, while older cached package metadata says MIT. Check the exact revision before any code reuse. |
| **MADE** | The note describes generic CLI execution and automatic development-server previews. | No exact repository was established from the supplied name and description during bounded research. Its claimed features and reuse suitability remain unverified. A direct project link would resolve this. |

Read-only inspection covered official sites, repositories, documentation and selected source files. The Cog's official animated workspace demo was visually inspected. None of these programs or their provider integrations was executed. Source availability and metadata differed between cached and live pages; release parity was not audited.

## Source-level lessons

**The Cog:** [src/main/cli-launch.ts](https://github.com/the-cog-dev/cog/blob/main/src/main/cli-launch.ts) builds provider-specific shell commands. It attaches MCP differently for different CLIs; Codex/Gemini launch sequences include removing and adding Cog-related MCP registrations, while Claude uses a configuration argument. This demonstrates that “connect a CLI” includes configuration side effects, process ownership and provider-specific behavior. Rivune should prefer scoped per-run configuration where supported and make any persistent setup explicit. The file was fetched and read; commands in it were not run.

The [documented workflow](https://github.com/the-cog-dev/cog#ceo-notes--controlling-agent-behavior) relies partly on instructions supplied to agents. That is useful coordination infrastructure, not an enforced guarantee that a reviewer ran tests or a worker completed a task. Persist concrete execution evidence separately from agent summaries.

**Clopen:** [backend/engine/README.md](https://github.com/myrialabs/clopen/blob/main/backend/engine/README.md) describes lazy engine loading, normalized tool messages, engine identity and cancellation ownership. Cross-engine handoff is handled separately. Rivune should similarly separate provider adapters from the conversation UI and retain the source of every event.

**GT Office:** at inspected revision `e4cc209bc8100916cf0b7d857860fa6e3762c4c3`, [agent_installer.rs](https://github.com/Laplace-bit/GT-Office/blob/e4cc209bc8100916cf0b7d857860fa6e3762c4c3/crates/gt-tools/src/agent_installer.rs) and [AiProvidersSection.tsx](https://github.com/Laplace-bit/GT-Office/blob/e4cc209bc8100916cf0b7d857860fa6e3762c4c3/apps/desktop-web/src/features/settings/ai-providers/AiProvidersSection.tsx) expose Claude and Codex integration paths. Treat advertised providers and implemented capability records separately in Rivune too.

**VibeSpace:** its [chat-mode documentation](https://github.com/ProblemFactory/vibespace/blob/master/docs/chat-mode.md) distinguishes backend-reported state from requested values and unknown limits. Show “not reported” when context or usage is unavailable. Subagent logs can stay in optional read-only viewers instead of flooding the main conversation.

**Coder Studio:** the [supervisor evaluator](https://github.com/spencerkit/coder-studio/blob/main/packages/server/src/supervisor/evaluator.ts) invokes a provider and parses structured continue/stop output; the [injector](https://github.com/spencerkit/coder-studio/blob/main/packages/server/src/supervisor/injector.ts) submits guidance into the existing terminal session. This is supervision of an executing session, not verified peer-team collaboration. Its [Work Analysis](https://github.com/spencerkit/coder-studio/blob/main/docs/help/work-analysis.md) reads provider logs with uneven available telemetry. Inspected [preview routes](https://github.com/spencerkit/coder-studio/blob/main/packages/server/src/routes/preview.ts) and [preview UI](https://github.com/spencerkit/coder-studio/blob/main/packages/web/src/features/code-editor/components/document-preview.tsx) support workspace HTML/Markdown through a sandboxed iframe; automatic development-server discovery was not verified.

## The Rivune structure this supports

```text
One conversation
       ↓
Run record: goal, project, selected connections, permissions
       ↓
Coordinator → bounded tasks → provider adapters
       ↓                         ↓
Review actual changes      owned processes / tool events
       └────────────┬────────────┘
                    ↓
Result + files + changes + actual checks
                    ↓
One clear delivery, with optional team activity
```

The app needs more than a final text synthesizer. A durable run should own its processes, cancellation, approvals, output artifacts and check results. Concurrent agents need explicit file ownership or isolated worktrees; sharing a folder alone does not resolve conflicting edits. Stop, retry and resume should preserve successful work and identify incomplete stages.

The user's example assigning implementation to Codex and UX to Claude is an illustration, not a rule to hard-code. Choose temporary roles according to the task and connected capabilities. Direct work should still function with one provider, and a broader team picker should not imply the engine supports more participants than it does.

## UI consequence

Keep the sidebar for projects and conversations, the center for the user's request and result, and an optional right panel for **Preview / Files / Changes / Activity** when a development task produces those objects. For research or writing, the result view should show a document and sources instead. Connections belongs in a separate setup journey; users should not manage terminal windows to get a useful answer.

A completion card must derive its counts and checks from actual run evidence. Displaying “12 tests passed” from model prose is insufficient. When no project runner is attached, the UI should present generated code and an export action, not claim a built application.

## Next implementation increment

Complete one narrow vertical slice before expanding provider breadth: open a small local project, use the existing supported CLI adapters, record actual changes, run a configured check, let a second provider review the same revision, and show the resulting files/diff/preview with a clear completion receipt. Validate interruption and recovery as part of that slice. This is proposed future execution work, not functionality delivered by the current UI refinement.

The current [native test build](NATIVE_UI_TEST_BUILD.md) already provides the refreshed interface, first-run connection sheet and optional activity/code/context inspector. Google sign-in, API adapters, repository execution and automatic preview remain separate implementation work.
