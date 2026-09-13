# Rivune design product brief — next review

Date: September 10, 2026  
Audience: Claude Design and the sole **RIVUNE APP BUILDER**  
Status: product and interaction requirements only. This document does not edit application source, generate an alternate UI, run a provider, launch or replace the app, or authorize added spending.

## Product promise

Rivune brings several AI perspectives into one calm conversation and turns them into one useful answer or saved result. The first experience should feel as direct as opening a good chat app: choose or create a conversation, confirm an available AI connection, type, and send. Team coordination and evidence remain inspectable without dominating the workspace.

Keep the current Tauri desktop foundation with React and TypeScript. The website is only the future marketing/download surface for the desktop app; it is not a second product workspace.

## Capability labels used in this brief

| Label | Meaning |
|---|---|
| **Established contract** | Behavior already represented by the accepted app/host design and must be preserved. It is not a public-release claim. |
| **Candidate integration** | A bounded implementation or specification exists but still needs builder integration and acceptance. |
| **Future capability** | Product direction that must not appear as working until its runtime, persistence and recovery are implemented. |

### Established contract

- Local Tauri workspace with durable conversations, drafts and run history.
- Compact conversation search and a Show all path instead of exposing every chat at once.
- Explicit inspection of supported installed CLI routes. Installation, sign-in and successful response are separate facts.
- Single AI and current Council-style Constellation configuration with 2–6 distinct members and one lead.
- Configuration saves separately from sending; the saved configuration is frozen into each admitted run.
- Saved-snapshot progress, cancellation, exact recovery/reconciliation and failed-step retry where supported.
- Plain-text direct answers, Constellation member contributions and lead synthesis.

### Candidate integrations to accommodate now

- Connection setup ending in an explicit **Continue to chat** with the first draft unchanged.
- Clear-on-admission that leaves a clean follow-up composer without losing newer typing.
- On-demand durable Results list and exact-text inspector beside chat on wide screens.

### Future capabilities to reserve space for, without depicting them as live

- Live token streaming.
- Automatic lead-directed choice between Council and real Swarm work.
- Real Swarm delegation and deliverable production.
- Additional CLI/API providers after each has a reviewed adapter. “Every AI” means an extensible provider system, not a fictional universal connection.
- Exact model, reasoning and usage displays only when the provider reports them through a supported interface.
- Cloud account sync, Google/Apple account sign-in, iPhone continuation and in-app updating after their services and distribution path are complete.

## Brand identity

- Product name: **Rivune**.
- Primary mark: the large left-hand concept in `brand-assets/explorations/2026-09-10-premium-refinements/orbit.png`—an all-silver ribbon **R**, a tilted silver orbit and a smooth near-black tile. Preserve its geometry, overlap, proportions and metal treatment. The selected icon has no stars, galaxy, blue glow or central pearl.
- The concept PNG is a presentation board, not a shippable icon crop. After the builder faithfully creates and validates the production asset, use that same primary mark for the app icon, launch view, sidebar identity and compact in-product identity. At very small sizes, use a single-color silhouette from the same geometry. Pair it with the approved vector wordmark only when space permits.
- Keep macOS traffic-light controls in their native title-bar region. The Rivune mark and name must begin below or to the right of that safe area so the red/yellow/green controls never cover them.
- The galaxy belongs around the perimeter, corners and welcome area. Put calm, nearly opaque dark surfaces under conversation, composer, settings and results text. Avoid a bright star, glow, seam or galaxy edge crossing a reading surface.
- Silver carries the mark; cool blue may carry interface focus and space ambience without recoloring or glowing the icon. Green, amber and red are reserved for state and always paired with text or an icon.
- “Review,” when shown as a branded phase label, should use one consistent approved silver/blue display treatment. Ordinary verbs such as “review connections” remain normal interface text. The exact display typeface is still a visual decision and should be presented for approval rather than guessed.
- The overall feeling is premium, calm and precise. Space imagery should express more perspective and possibility while the interface remains useful for long reading sessions.

## Primary user journey

1. Open Rivune and see an honest local-workspace loading state.
2. Arrive at the last conversation or a quiet new-conversation state.
3. If no usable route is configured, inspect supported installed providers, choose one, save it, and explicitly continue to the unchanged draft.
4. Write a prompt. Keep the default Single AI route or open one compact control to configure Constellation.
5. Send once. Preserve the prompt until the host durably admits the exact request; then show it once in history and prepare a clean follow-up box.
6. Show saved progress and results from the actual admitted run. Make independent contributions inspectable and the lead’s final result the clearest reading surface.
7. Let the person open saved Results only when needed, then return to the unchanged conversation and draft.

## Screen requirements

### 1. Launch and recovery

**Goal:** establish identity and explain what the app is actually doing.

- Center the orbital R on a full-space scene, with a compact status region below it.
- Use honest stages such as **Opening workspace**, **Checking saved state**, and **Ready** only when backed by app state.
- Do not slow startup artificially or show a fabricated percentage. A determinate percentage belongs here only if the host supplies measurable progress.
- Long waiting, known startup failure, unavailable desktop bridge and corrupt saved workspace are different screens.
- A corrupt/unreadable workspace has no composer. Provide only supported recovery or exit actions and state that save status is unknown when it is unknown.

### 2. Home and empty conversation

**Goal:** make the next useful action obvious without creating a dashboard.

- Chat occupies the primary visual area. Use a restrained welcome line and one empty composer.
- With no conversations, show one clear **New conversation** action. With no active selection, show **Choose a conversation** as appropriate.
- Do not insert sample assistant messages into the real desktop workspace.
- The galaxy can be clearest here, fading beneath the transcript/composer surfaces as work begins.

### 3. Conversation workspace

**Goal:** support sustained reading and a natural second turn.

- Center the readable transcript at a comfortable line length. User messages, direct answers, member contributions and lead synthesis have distinct but quiet hierarchy.
- Keep technical IDs, hashes and low-level execution detail behind a Details disclosure.
- Put conversation title, honest run state, Results count and refresh in a stable header.
- Never call an acknowledgement “complete” until the saved run proves it. Clearly distinguish queued, running, waiting, failed, cancelled, uncertain and completed.
- Preserve draft text, transcript scroll and selected result through Settings and Results transitions.

### 4. Composer and execution control

**Goal:** keep sending simple while making the next route understandable.

- One primary message field and one compact control row. Attachments/tools, execution summary, voice when available, and Send remain reachable without stacked configuration cards.
- Resting summary uses saved authoritative state:
  - **Single AI · [connection]**
  - **Constellation · [N] members · Lead: [connection]**
- Inside the control, distinguish **Workspace default** from **Pinned to this conversation**.
- Current model copy is **Provider default · exact model not reported**. Do not invent model names, reasoning levels, “best model,” readiness or remaining usage.
- Configuration choices stay visibly unsaved until one explicit Save. Saving configuration does not send the message.
- During admission uncertainty, keep the draft and show **Check request status**; disable duplicate Send.
- After proven admission, clear only the sent text. Preserve newer local typing and retain the established attachment/context policy.

### 5. Conversation navigation

**Goal:** make history easy to scan without a wall of chats.

- Keep New conversation, Home, Conversations, Connections and Search in a compact left sidebar.
- Show a short Recent set by default, followed by **Show all** and full search. Do not place the entire history in the everyday view.
- Use consistent row height, readable labels, one-line truncation and accessible full names.
- The account/local-workspace control and Settings stay anchored at the bottom without overlapping the list.
- The sidebar collapses before the chat becomes too narrow. Preserve a clear way to reopen it.

### 6. Connections and provider setup

**Goal:** get from an installed supported route to a sendable prompt with one truthful next action.

- Sequence: **Find installed providers → choose route → Save default → Continue to chat**.
- For each route, separately show: installed/not found, sign-in status, response-test status and whether the adapter is supported.
- Unknown authentication and untested response are labeled as unknown/untested, not Ready.
- Scanning never launches a CLI or sends a provider request. If no supported route exists, give provider-owned install/sign-in guidance and retain the draft.
- A successful durable save plus refreshed workspace enables **Continue to chat**. An uncertain, rejected or refresh-failed save keeps setup open with the exact recovery action.
- Additional API providers belong under a clear **Add API provider** path only after a real adapter and secure key storage exist. Do not populate a decorative list of providers that cannot run.

### 7. Constellation run and final answer

**Goal:** show why multiple perspectives helped and what result the user should use.

- Freeze and display the actual admitted lead and members for that run. Later composer changes do not rewrite historical labels.
- Use a compact progress region for saved activity. Current progress is snapshot-based; do not animate fictional tokens or percentages.
- Independent contributions are collapsed summaries/cards with clear provider/member identity and availability states.
- The lead synthesis is the primary final reading surface. Do not call it consensus, verified, peer reviewed or unanimously agreed unless a future recorded workflow proves that claim.
- Include explicit variants for no saved activity, shortened contribution, partial work, failed/cancelled member, missing final, partial synthesis and uncertain retry.
- Retry targets the exact failed step; cancellation preserves completed contributions.

### 8. Results

**Goal:** make durable output useful without turning the default workspace into an IDE.

- Results opens only through an explicit **Results (N)** control. It never opens automatically when a run finishes.
- On wide screens, open a calm right pane while leaving at least 480px for chat. On narrow screens, Results replaces the chat region while the chat remains mounted and inert.
- Start with a list. Selecting a row opens the exact saved plain text with **Back to results**, **Close results**, **Copy saved text**, **Select all** and technical Details.
- Distinguish direct answer, member contribution, lead synthesis, partial answer, earlier/newer version, missing, corrupt and unreadable.
- Clear stale content immediately when selection, conversation or bridge identity changes. Retry inspection rereads saved text; it never reruns a prompt.
- Plain text that resembles Markdown, HTML, SVG or code remains inert and copies exactly.

### 9. Settings

**Goal:** expose real controls in predictable groups without making setup feel larger than chat.

- Use these sections only when backed by behavior: Account/local workspace, General, AI Connections, Models & Constellation, Appearance, Data & privacy, Devices, Keyboard, and About & updates.
- Appearance may offer a small set of approved galaxy/background presets, brightness/contrast and reduced motion. Every preset must keep reading surfaces calm and legible.
- Models/reasoning lists come from the selected supported route. Unknown values remain unknown.
- Account sign-in must distinguish a Rivune cloud account from AI-provider accounts. Google and Apple buttons appear enabled only when their real authentication configuration works end to end.
- Devices must explain that phone pairing requires the Rivune phone app and a valid app/universal link. Do not present an encoded webpage as successful pairing.
- About & updates may show installed version and update status. Download/install controls remain future until a signed, notarized and trusted update feed exists.
- Use native modal/focus behavior, visible close/back controls and consistent focus styling. Remove accidental purple outlines; preserve intentional keyboard focus rings.

### 10. Recovery, conflicts and quit

**Goal:** make uncertainty understandable without losing work.

- Draft save rejection, uncertain save, configuration conflict, uncertain submission, failed-step retry uncertainty and result inspection failure each get their own action. Avoid a generic **Try again**.
- Show retained local text beside authoritative saved text when conflict review is required.
- During quit, freeze editing while the host saves. If closing is blocked, keep the draft visible and offer the established **Stay in workspace** action.
- Decorative X/Close controls never bypass the native save-and-recovery handshake.

## Responsive and accessibility requirements

- Design desktop, 390px and 320px CSS-width variants plus 200% zoom.
- Chat keeps priority. Collapse navigation and replace chat with Results when necessary rather than compressing three columns.
- Visible interactive targets are at least 44px on narrow layouts. Labels wrap without horizontal page scrolling.
- All controls use native button/select/dialog semantics where possible, visible keyboard focus and predictable Tab order.
- Escape closes only the active surface and restores focus to its opener. Hidden chat/results content has no tab stops.
- Status never relies on color alone. Reduced-motion mode removes nonessential orbital/galaxy motion.

## What the existing Claude handoff was missing

The existing `CLAUDE_DESIGN_HANDOFF.md` correctly established the quiet conversation, compact composer, on-demand results, connection-state honesty and synthetic-content boundary. It did not give enough context for a whole-app design. The next design pass must add:

1. The exact orbital-R identity and title-bar safe area.
2. Launch, long-wait, startup failure, bridge unavailable and corrupt-workspace variants.
3. Home/empty-conversation behavior and compressed conversation history.
4. Authoritative saved versus unsaved composer configuration and admission uncertainty.
5. Connection-to-chat completion and recovery states.
6. Full Constellation partial/failure/no-final variants grounded in saved evidence.
7. Durable Results provenance, stale-response protection and narrow replacement behavior.
8. Settings structure, appearance choices, account/provider separation, devices and update boundaries.
9. Quit/save conflict behavior, keyboard focus return and reduced motion.
10. Clear labels separating current snapshot progress from future streaming, Council from future Swarm/Auto, and supported adapters from aspirational provider breadth.

## Concrete design deliverables for the builder

Claude Design should refine the existing Quiet Conversation direction, not create a new product or codebase. Use synthetic content only and return reviewable screens/components for:

1. Launch: checking, long wait, known failure and corrupt-workspace recovery.
2. Empty chat and populated direct conversation at desktop and narrow widths.
3. Compact composer resting states plus open Single AI/Constellation configuration, unsaved/conflict/uncertain variants.
4. Connections: found, not found, sign-in unknown, response untested, durable save, uncertain save and Continue to chat.
5. Constellation: working, partial, failed member, no final, completed lead synthesis and exact retry state.
6. Results: list, loading, exact text, missing/corrupt/read failure, wide pane and narrow replacement.
7. Settings: navigation shell, Appearance, Account/local workspace, AI Connections, Devices and About & updates.
8. Keyboard focus annotations for open, close, back, Escape and return-to-composer.

Use the same synthetic prompt already approved for the handoff: “Compare SQLite and JSON files for a local notes app. Recommend one and explain the trade-offs.” Show SQLite as the lead recommendation and JSON as the export format. Clearly mark design fixtures as synthetic.

The builder should integrate only user-approved presentation refinements into the existing Tauri source. Generated visuals or web code do not replace Rivune's host contracts, persistence, provider adapters or native acceptance. No external design action may incur additional cost, publish content, upload private conversations/source, or create a competing implementation.
