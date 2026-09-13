# Rivune — our design direction

Working document for Aarav and Codex. September 8, 2026.

This document captures our design decisions. The current browser preview is a reference, not an approved final design. Aarav has authorized Rivune App builder (01a0847d-ff64-7d21-9285-20c144268a56) as the sole implementation task; older tasks and automatic coordination remain paused. This task may organize internal implementation subtasks without reviving the older chats. Unresolved choices below remain open for focused review.

Latest approved layout: chat is the main focus. Files, editors and artifacts open alongside the conversation when needed. Avoid an always-open dense IDE layout. Implement this direction in the existing shared frontend, keeping Tauri as the desktop foundation.

Latest surface feedback (September 9): galaxy behind the whole interface is too distracting. Prioritize logical placement and sustained reading. Current placement proposal: sharp galaxy around workspace edges and in the welcome area, subdued behind navigation, with calm dark glass beneath transcript/composer/editor. This supersedes the earlier all-glass interpretation; exact placement/treatment awaits rendered feedback. No foggy whole-pane blur.

## What we are creating

Rivune is a place to bring different AI perspectives into one useful conversation and result. It should feel comfortable, thoughtful and dependable. Every control has a clear purpose and an intentional place.

Codex is our primary interaction reference. Aarav explicitly removed Traycer as a design reference. Rivune should offer a similarly familiar and efficient workspace, with its own galaxy identity and Constellation Engine. More panels and more activity do not automatically make a better experience.

## Audience and quality bar — latest direction

We are designing for professionals doing demanding work at companies such as Nvidia, Apple, Tesla and SpaceX. These are examples of the intended audience, not customers, endorsements or affiliations.

The visual principles are sound; implementing them consistently is the problem to solve. Prioritize clear hierarchy, readable conversations, predictable navigation, useful results and responsive interactions. Constellation should earn its place through coordinated AI work and a clear outcome. The galaxy should provide identity while preserving contrast and concentration.

Codex-level efficiency is a target to validate through complete workflows, response latency, recovery and usability. It is not an achieved benchmark or a guarantee that every answer is correct.

## Direction already expressed

- Product name: Rivune.
- Teamwork name: Constellation Engine includes a council mode and a swarm, which are strategies within that experience.
- Identity: space, galaxies, many perspectives coming together; built in Denver, Colorado.
- Preferred artwork so far: the app's Milky Way background and silver R logo.
- Desired feel: premium, calm, readable and deliberately arranged.
- Desktop foundation: Tauri, with React, TypeScript and Tailwind for the new interface.
- The recent preview feels too much like Traycer. Stop using it as the design reference; use Codex for interaction structure and Rivune for identity.

## 1. Background

**Starting point:** the Milky Way artwork Aarav previously liked.

**Decisions to make together**

- Where does it appear: across the workspace, around solid reading panels, or mainly on the welcome screen?
- How bright and detailed should it be?
- Do chat, sidebar and editor share the background or have separate surfaces?
- Is motion optional, and what should Orbit look like?
- Which alternatives should Appearance offer?

**Approved specification:** To be decided.

## 2. Typography

**Aim:** comfortable reading with a recognizable Rivune character.

| Role | Font | Size / weight | Status |
| --- | --- | --- | --- |
| Interface and navigation | To choose | To choose | Open |
| Conversation text | To choose | To choose | Open |
| Headings | To choose | To choose | Open |
| Code and terminal | To choose | To choose | Open |

We will compare actual text samples before choosing. Specify line spacing, paragraph spacing and readable line length along with the font. Small labels must remain legible.

## 3. Sidebar

**Purpose:** help people start work and find their previous work easily.

**Decisions to make together**

- Conversation-first navigation, project-first navigation, or a switch between them?
- Which items are always visible, and which expand when needed?
- Where do projects, files, agents and terminal sessions belong?
- Where do New conversation, Search, Connections and Settings live?
- Collapsed appearance, width, selected state and icon style.

**Approved structure and order:** To be decided.

## 4. Main workspace

The supplied prompt proposed a sidebar, chat pane, editor/artifacts pane and bottom telemetry shelf. These are requested capabilities; their default visibility and proportions need our design decision.

| Area | Question to resolve | Approved behavior |
| --- | --- | --- |
| Conversation | What should be visible when the app first opens? | Open |
| Composer | Where do mode, model, attachments and Send belong? | Open |
| Artifacts / editor | Always visible or opened when a result needs it? | Open |
| Activity / timeline | How much execution detail appears by default? | Open |
| Terminal / telemetry | Where does it live, and when does it open? | Open |
| Narrow windows | What collapses first while chat remains usable? | Open |

## 5. Constellation Engine

**Established purpose:** multiple AIs contribute, with a lead coordinating and producing a useful combined result.

**Decisions to make together**

- How a person selects Single AI or Constellation.
- How the lead and members are shown and configured.
- How progress, contributions and the final result relate visually.
- Whether Orbit is branding, a real activity display, or two distinct treatments.
- How partial failure, retry and cancellation remain understandable.

Show real observable work when connected. Demonstrations must be identified as demonstrations. Do not invent private model reasoning or imply guaranteed correctness.

## 6. Settings

Candidate categories from the requested product scope, not an approved menu:

| Category | What belongs here | Decision |
| --- | --- | --- |
| General | Startup, default workspace and everyday behavior | Open |
| Appearance | Background, theme, text size and motion | Open |
| Connections | Providers, sign-in and connection health | Open |
| Models and Constellation | Defaults, lead/member configuration and supported model options | Open |
| Permissions and privacy | Tools, files and data handling | Open |
| Voice | Input and accessibility preferences when implemented | Open |
| Keyboard | Shortcuts and navigation | Open |
| About and support | Version, help and contact | Open |

Choose whether settings open as a page, side panel or dialog. Keep everyday choices easy to find; explain advanced options where they affect a decision.

## 7. Colors, icons and surfaces

- Base surface colors: To choose.
- Primary accent: To choose.
- Status colors and non-color indicators: To choose.
- Borders, corner radii and shadows: To choose.
- Icon family, stroke weight and sizes: To choose.
- Logo placement in sidebar, welcome screen, Dock and menu bar: To choose.

The earlier prompt's Slate/Zinc and emerald/amber palette is a candidate, not a final branding decision. Close controls must be centered; interactive targets and focus states must be consistent.

## 8. Interaction and comfort

- Predictable control locations and keyboard navigation.
- Resizable panes with useful minimum sizes.
- Readable contrast and reduced-motion support.
- Preserve drafts, scroll position and context through navigation.
- Distinguish loading, working, waiting, failed and complete states.
- Error messages explain what happened and the next useful action.

**Detailed interaction choices:** To be decided after the core layout.

## How we approve this design

We will decide one area at a time, view a focused example when useful, and record the accepted choice here. Developers should implement the approved decisions rather than independently reinterpret the entire product. One shared preview is reviewed before another desktop build or installation.

| Decision | Choice | Status |
| --- | --- | --- |
| Desktop foundation | Tauri with React / TypeScript / Tailwind | Confirmed |
| Product identity | Rivune; space and multiple perspectives; Denver | Expressed direction |
| Background artwork | Previously preferred Milky Way | Placement and treatment open |
| Typography | — | Open |
| Sidebar | — | Open |
| Default workspace | Chat-first; files and artifacts open alongside when needed | Confirmed |
| Settings layout | — | Open |
| Color and icon system | — | Open |
