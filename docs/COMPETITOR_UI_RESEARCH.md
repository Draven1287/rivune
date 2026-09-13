# Rivune: competitor UI research and recommended structure

Research date: September 4, 2026. This is a design recommendation, not a claim that the proposed structure is implemented.

The user's subsequent note adds CLI orchestration projects that are more directly relevant to Rivune's execution layer. See [CLI_ORCHESTRATOR_REFERENCES.md](CLI_ORCHESTRATOR_REFERENCES.md) for verified identities, corrections, and the revised technical shortlist. The five products below remain useful interface references.

## Recommendation

Build Rivune around **projects, conversations, and usable results**. Let people connect their intelligence once, choose the team for the current task, and inspect what happened without losing the main conversation. Preserve the original silver Rivune mark, native Mac behavior, quiet dark surfaces, and restrained lavender accent.

The strongest combination for Rivune is Jan's straightforward navigation, LibreChat's project scope and optional activity views, AnythingLLM's context boundaries, and LobeHub's treatment of work as something that persists beyond a chat. Open WebUI is a useful reference for expandable provider configuration.

## What was actually inspected

Reviewed official websites, documentation, and repositories for all five products. Visually inspected the official screenshots linked below in the browser. These are published product references and may depict different releases; they are not proof of every current capability. No competitor app was installed, no model calls were made, and no new account was created. LobeHub's shared task example redirected to sign-in, so its authenticated task workflow was not tested. Its canary-branch design guidance describes development intent rather than guaranteed stable-release behavior.

| Product | Documented structure | Lesson for Rivune |
|---|---|---|
| **Open WebUI** | Connections supply models. Workspace contains reusable model configurations, knowledge, prompts, skills, and tools; chat folders separately organize conversations and shared context. | Keep connections extensible and selection searchable. Use one plain meaning of “project” in Rivune. [Connections](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/), [Workspace](https://docs.openwebui.com/features/workspace/), [Folders](https://docs.openwebui.com/features/chat-conversations/chat-features/conversation-organization/) |
| **LibreChat** | Navigation separates history, pinned conversations, and projects. Agents can delegate to subagents, with compact cards that open activity details. Artifacts have their own view. | Use a project scope chip and optional work inspector. Avoid asking users to understand endpoints, agents, presets, and models before their first message. [Navigation](https://www.librechat.ai/docs/features/navigation), [Projects](https://www.librechat.ai/docs/features/projects), [Subagents](https://www.librechat.ai/docs/features/subagents), [Artifacts](https://www.librechat.ai/docs/features/artifacts) |
| **LobeHub / LobeChat** | Current material describes agent groups, projects, pages, tasks, and shared work. Provider configuration is separate from per-agent model choice. | Make outputs easy to find again. Keep the everyday workspace focused even as advanced capabilities grow. [Product](https://lobehub.com/), [Introduction](https://github.com/lobehub/lobehub/blob/canary/docs/usage/start.mdx), [Provider configuration](https://github.com/lobehub/lobehub/blob/canary/docs/usage/providers.mdx) |
| **AnythingLLM** | Workspace configuration and shared documents provide context for threads; attached documents have a narrower scope. Composer tools are separate from detailed skill settings and filesystem permissions. | Name the scope of every input. Attaching a document and allowing folder operations should be visibly different actions. [Documents](https://docs.anythingllm.com/chatting-with-documents/introduction), [Agent setup](https://docs.anythingllm.com/agent/setup), [Filesystem access](https://docs.anythingllm.com/agent/usage/file-system-agent) |
| **Jan** | Chat and projects sit alongside a model Hub. Provider setup lives in Settings, with model choice in the conversation. Projects combine conversations, assistant configuration, and files. | Make first use short: connect one usable route, then start. Put advanced model controls behind a compact disclosure. [Quickstart](https://www.jan.ai/docs/desktop/quickstart), [Projects](https://www.jan.ai/docs/desktop/projects), [Model settings](https://www.jan.ai/docs/desktop/model-parameters) |

## Visual references and observations

- **Jan:** [New chat](https://www.jan.ai/_next/static/media/start-chatting.3f59145e.png), [Project](https://www.jan.ai/_next/static/media/projects.d1ef4b08.png), [Provider settings](https://www.jan.ai/_next/static/media/provider-openai.91fb3b76.png). The inspected chat screen has a quiet sidebar, a small model control, and one dominant composer. The project screen makes shared files explicit. The provider screen becomes a denser list suitable for settings.
- **Open WebUI:** [New-chat reference](https://docs.openwebui.com/assets/images/new-chat-placeholder-be568eb047e004bf0757ff35e34b4289.png). Small navigation, generous empty space, and suggestions beneath the composer create a clear starting point. Rivune should keep its own identity in the center rather than making a provider model name the product identity.
- **LibreChat:** [Agent selector and builder](https://www.librechat.ai/_next/static/media/endpoints_menu.92a7f5d1.png). This published image labels itself v0.7.5. It illustrates a useful separation between a compact selector and detailed configuration, but also the cognitive cost of mixing providers, assistants, and agents in one menu.
- **AnythingLLM:** [Annotated chat walkthrough](https://docs.anythingllm.com/_next/image?q=100&url=%2Fimages%2Fguides%2Fchat-ui.png&w=3840). Workspace/thread nesting is clear. Numerous message actions and composer icons compete for attention; Rivune can reveal secondary actions on hover or through a menu. This older walkthrough is not a release-parity reference.
- **LobeHub:** [Published app overview](https://lobehub.com/img/hub/images/home/overview-cao-dark.webp). Work summaries and task controls are prominent, with neutral surfaces and subtle dividers. Its lengthy agent navigation demonstrates why Rivune should initially keep team configuration inside the current project or task. [Published design guidance](https://github.com/lobehub/lobehub/blob/canary/DESIGN.md) also supports consistent spacing and limited accent color.

## Proposed Rivune layout

```text
Rivune                  Project / conversation                 Work
─────────────────────   ────────────────────────────────────   ───────────────────
New chat                Request and one readable conversation   Result
Search                  Compact progress / needs-input row     Activity
                                                               Context
Pinned                  Final answer or usable output
Projects
  Project name          ┌──────────────────────────────────┐   Optional inspector
    Conversations       │ Ask Rivune…                      │   Resizable / closable
Recent                  │ +  Project  Team  Tools      ↑  │
                        └──────────────────────────────────┘
Connections
Settings / account
```

**Sidebar:** organize the user's work. Projects contain conversations, shared instructions, and shared context. Keep New chat available outside projects. Use chat, code, folder, and document icons according to the object; reserve the star for something the user actually pinned or favorited. Names must remain available through tooltips and accessibility labels when visually truncated.

**Composer:** keep four everyday decisions close to the request: attachments, project scope, team, and enabled tools. The Team control opens a searchable list of usable connections, model choice, and supported reasoning settings. Connection forms belong in Connections. A saved project team can be overridden for one conversation without silently changing the project's default.

**Work inspector:** Result holds the current output and export actions; Activity contains named contributions, review comments, tool actions, and actual check results; Context shows precisely what was supplied. Show a runnable preview or file diff only when the underlying execution supports it. Returned code is a snippet until saved or applied. Model agreement is not a passed test.

**While working:** use readable states such as Working, Reviewing, Needs input, Stopped, and Complete. Show the proposed action and its scope where approval is needed. If one provider fails, preserve successful work and offer an explicit recovery choice; do not silently represent partial work as a completed team result.

**Window behavior:** the conversation gets priority. Open the work inspector on demand; let it collapse at narrow widths. Preserve draft text, selection, and scroll position when moving between views. Keyboard shortcuts, focus visibility, clear tooltips, and predictable resizing provide the developer feel.

## First-run flow and connection model

1. **Rivune account:** sign in through the intended Google account flow. This identifies the Rivune user; it does not connect an AI provider. Real authentication must be configured before enforcing this in the public product.
2. **Connect intelligence:** select an access method—installed CLI, provider API, or local model server—then the provider. Discover installed CLIs where supported. Explain the next action with specific states: not installed, sign-in needed, checking, ready, unavailable.
3. **Start working:** with one usable connection, enable direct work. With multiple connections, offer team selection. Let additional connections be added later. Keep MCP/tool connections distinct from inference providers, because tools provide capabilities rather than an interchangeable model.

The UI should handle zero connections without a dead-end composer, one without a misleading “team of two” label, and three or more without fixed OpenAI/Anthropic dots. Arbitrary connection names need a readable label and access-method badge. Do not imply that adding a third provider automatically makes the current two-provider collaboration engine support it.

## Corrections to the pasted comparison

- “Best-looking,” “most powerful,” and “closest match” are subjective. These products overlap substantially; compare specific journeys rather than treating those rankings as established facts.
- LibreChat and LobeHub already document agent collaboration. Multi-model chat or delegation alone is not a defensible uniqueness claim. Rivune can test a narrower advantage: a native Mac experience with understandable provider access, mutual review, and one usable result. [LibreChat subagents](https://www.librechat.ai/docs/features/subagents), [LobeHub groups](https://github.com/lobehub/lobehub/blob/canary/docs/usage/start.mdx)
- Jan has documented MCP support and a Claude Code integration. The latter routes **Claude Code to Jan's local models**; it does not document consuming a signed-in Claude subscription CLI from Jan. [MCP](https://www.jan.ai/docs/desktop/mcp), [Claude Code integration](https://www.jan.ai/docs/desktop/integrations/claude-code)
- AnythingLLM's own CLI is a client for its instance API. This is different from an adapter that runs Codex or Claude Code using an existing supported login. [Official CLI](https://github.com/Mintplex-Labs/anything-llm-cli)
- Open WebUI's terminal capability requires a configured execution environment. A model connection alone does not establish access to local files or a working terminal. [Tool integrations](https://docs.openwebui.com/features/extensibility/plugin/tools/)
- LobeHub Desktop uses Electron and Jan uses Tauri. A polished Mac appearance does not mean native SwiftUI. Rivune can retain its existing native implementation. [LobeHub Desktop](https://github.com/lobehub/lobehub/blob/main/apps/desktop/README.md), [Jan repository](https://github.com/janhq/jan)

## What to test next

Use the native test build already prepared to assess the refined sidebar, composer, connection sheet, and Work inspector. The proposed project structure and general connection model above are the next design increment, not completed features of that build.

Validate three complete journeys: a new user connects one provider and sends a message; a returning user resumes a project with the correct context and team; a user inspects an output, understands what was checked, and saves it. Include cancellation, unavailable providers, a narrow window, long names, and zero/one/three-plus connections in the design review. Measure whether someone can explain what is connected, what will be shared, and what the app actually produced without assistance.

Current build, verification, and authentication limitations are recorded in [NATIVE_UI_TEST_BUILD.md](NATIVE_UI_TEST_BUILD.md).
