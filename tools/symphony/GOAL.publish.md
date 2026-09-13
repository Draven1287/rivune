# Rivune — product goal and execution brief

Version: September 9, 2026. This brief consolidates the product owner's latest decisions, the original complete-experience request, relevant Rivune task history and current local implementation receipts. Later explicit owner decisions override earlier studies. This is a requirements and delivery contract, not a claim that all features exist.

## 1. Goal, audience and definition of success

Build Rivune into a dependable cross-platform AI workspace where a person can bring multiple AI tools into one conversation and receive one useful, coherent result. The core promise is “Your AI tools. Working together.” Rivune should make sophisticated work feel straightforward: open the app, connect a supported provider, ask a question or assign a project, follow progress when useful, review the outcome, and resume later without losing context.

The intended users include professionals doing demanding work at organizations such as Nvidia, Apple, Tesla and SpaceX. These are audience examples, not customers or endorsements. Design for concentration, technical depth and trust. A large number of panels, animations, agents or test counts is not evidence of quality. Every visible control must have a purpose, predictable placement and a working interaction.

Codex is the interaction reference: readable conversations, responsive composition, discoverable projects, understandable execution and useful adjacent results. Claude's clear reading and artifact experience provides historical context. The owner explicitly removed Traycer/Tracer as a design reference; do not recreate its aesthetic or build an integration with it. Rivune must have its own recognizable identity. Matching or exceeding another app's quality is a goal to demonstrate through complete workflows, not a marketing assertion.

The first usable milestone is install → connect → send a greeting → follow up → complete a real task → inspect/export the result → restart and continue. Aim for a useful simple answer within one minute under documented working provider conditions. Measure first visible response and completion latency separately. Do not promise every answer is correct or every complex task completes within a minute. Provider outages, authentication, network conditions and model limits must be visible and actionable.

## 2. Technology and canonical product

Use Tauri for the macOS, Windows and Linux desktop shell, with React, TypeScript and Tailwind for the shared interface and the existing Rust host where applicable. Do not switch to Electron or resume SwiftUI implementation. Earlier SwiftUI/Xcode work is a reference for worthwhile behavior and data migration, not the current shipping application. Port useful interactions deliberately; do not assume automatic code conversion preserves behavior.

Maintain one canonical app and one controlled integration path. Avoid duplicate QA applications, conflicting menu-bar instances, multiple preview servers and copied compiler caches. Test packages must be unmistakably labeled and must not silently replace an installed app. Preserve conversations, drafts, project data and a rollback path before migration. Do not delete old user data merely because a new shell exists.

Before working, verify the assigned checkout contains the current frontend, native host and bridge. The remote main branch was inspected during Symphony preparation and did not contain the current React frontend or Cargo manifest. Source reconciliation is therefore a prerequisite to remote implementation, not permission to recreate missing work. Local-only evidence does not become available in an issue workspace automatically.

## 3. Brand, images, colors and typography

The product name is Rivune. “Reviewing,” “Reviewer” and “Tory” in dictated feedback are not replacement brand names. The multi-AI experience is Constellation Engine. Reuse the selected silver R with orbital treatment and the Rivune wordmark. Remove obsolete V/Y-style artwork and generic missing icons from product bundles. Verify actual packaged icons on Dock, taskbar and tray/menu bar, including appropriate platform-specific small-icon treatment; a source image alone is insufficient.

The accepted artwork direction is a detailed Milky Way galaxy. The latest placement direction is restrained: sharp galaxy around workspace edges and welcome areas, subdued behind navigation, calm dark reading surfaces under chat, composer and editor. A bright galaxy covering all prose and a globally frosted, blurred interface were rejected. Final placement and intensity still need rendered owner feedback. Do not silently substitute another background or claim an open design choice is approved.

Use a coherent, licensed sans-serif family for interface and prose, and readable monospace for code and terminal output. Exact family, scale and final color tokens remain decisions to validate with real text samples. Establish reusable spacing, typography, border, radius, icon and status tokens. Dark neutral surfaces and restrained accents are candidates, not permission for decorative neon everywhere. Status must be understandable without color alone.

Galaxy motion should be slow, optional and pause when hidden. Orbit should show a larger central lead and smaller members moving around complete 360-degree paths with intentional depth. Keep text and composition steady. Decorative motion must not pretend to be real agent activity; a live view must be backed by actual events. Respect reduced motion. Retain Graphite customization and bounded local image/video backgrounds in the roadmap, with clear format/size/duration limits and no repeated large media copies.

## 4. Workspace, navigation and settings

The default workspace is chat-first, not a permanently dense IDE. Keep a persistent, collapsible sidebar for starting and finding conversations and projects. Provide sensible selection, search and navigation. Open files, editors, visual diffs, artifacts and browser previews alongside chat when needed. Activity and terminal detail should be optional and collapsible. Preserve enough room to read and type at narrow widths and short heights; restore focus predictably when panels close.

The composer supports prompt entry, follow-up, accessible Send/Cancel, discoverable Single AI or Constellation choice and quick supported provider/model/reasoning selection. Add command menus and attachments where backed by real capabilities. Prevent duplicate sends and accidental submission during setup or recovery. An ordinary greeting must not be mislabeled as blocked tool use. Do not show idle diagnostic banners without a useful next action.

Responses need streaming, readable paragraphs, code blocks and attached results. Separate progress from the final answer. Artifacts must open the result belonging to the selected response, not an unrelated previously selected file. Preserve drafts, conversation selection, scroll context and durable history. Unsaved, failed, cancelled, pending and complete states must be distinguishable.

Settings should use understandable categories rather than one long technical form: General, Connections, Models and Constellation, Permissions, Appearance, Voice, Keyboard where supported, and About/Support. Keep unavailable capabilities explicit. Manual executable paths belong under Advanced. Close controls must be visually centered, keyboard targets consistent, focus visible and dialog navigation contained with proper focus restoration. Test actual interactions, not screenshots alone.

## 5. Connections, onboarding and permissions

First launch briefly explains Rivune, Single AI and Constellation, discovers supported connections, guides missing setup, allows a preferred lead and reaches the first conversation. Do not strand users behind a percentage loader or force a long decorative startup on every launch. Historical animation studies do not override efficient everyday startup.

Distinguish executable discovery, configuration, account authentication, model availability and verified inference. One does not prove another. Offer supported CLI and API routes with truthful installation and sign-in guidance. Provider installation and authentication must be deliberate actions. Do not invent desktop capabilities from a CLI's presence or promise every frontier model to every account.

Discover supported model and reasoning options from actual provider interfaces and entitlements. Save the settings admitted for each run. Let the user choose a preferred lead; do not invent an objective smartest-model score. If the provider uses a default and does not report the exact model, say so.

API secrets belong in host-owned operating-system secret storage. Never place credentials in renderer storage, ordinary snapshots, logs, crash reports or published artifacts. Validate secret handling with synthetic credentials. Expose approval modes only where the provider adapter can enforce them. Unsupported permissions must not silently become unrestricted execution. Actual terminal, files, browser and agent tools need their own enforceable boundaries.

## 6. Constellation Engine

Single AI is one provider conversation. Constellation combines independent perspectives and delegated work under a coordinating lead, producing one reviewed answer or integrated deliverable. Council and Swarm are internal strategies, not two disconnected products users must understand before starting. Explain them plainly when configuration or task transparency requires it.

Council gathers independent contributions and combines them. Swarm assigns bounded parallel work, tracks dependencies and integrates outputs. A combined sequence may use both. For a website request, success is one coherent website, not two unrelated websites from different models. Persist the chosen team, lead, admitted strategy, participant identity, available model details and result provenance. Do not display an unsupported strategy as active.

Show real queued/running/waiting/failed/cancelled/completed states and actual contributions. Do not expose fabricated model thinking. A final response should stay primary, with details available on demand. Preserve successful partial work if a member fails. Retry only the authoritative failed step and attempt, prevent duplicate retry, and reconcile uncertain transport outcomes without replaying the entire prompt. Original run existence alone does not prove a retry was admitted.

Current local source supports bounded provider-default Council teams, persisted contributions and cancellation/recovery; explicit per-member model routing and Swarm remain incomplete. The new retry frontend has source and fake-host evidence but still needs current integrated native proof. Treat those as starting evidence, not shipping readiness. Implement versioned contracts and test strategy boundaries before expanding capability claims.

## 7. Reliability, delivery and remaining features

Data safety and stability precede a public installer. Cover crash recovery, interrupted work, shutdown, corrupt snapshots, exactly-once admission and late events. Preserve drafts and completed output. Recovery must not silently initialize an empty replacement workspace over unreadable data. Use one authoritative window and tray; closing, minimizing, reopening and quitting must behave predictably.

Keep remaining requested features explicit: microphone dictation with permission and processing disclosure; local appearance customization; organized projects and folders; real code, diff, terminal and browser tools; broad supported providers; reusable teams; meaningful permission controls; migration; and platform installers. Optional paid plans are later commercial work, not fake checkout screens or a prerequisite to basic usability.

The website is already in a good place. Preserve its approved galaxy, centered headline, concise explanation, rounded footer, practical FAQ, Gmail/copy-email contact and Constellation terminology. Maintain accurate availability. macOS uses an appropriate Mac artifact; Windows and Linux require their own packages, not DMGs. Provide download links only after real artifacts, install tests and release requirements pass. Signing, notarization, updates and rollback need actual evidence per platform.

## 8. How Symphony should execute this goal

Symphony is the development orchestrator; Constellation is the product feature. Do not conflate them. Symphony starts its own issue-based Codex workers; it does not automatically resume existing desktop sidebar chats. Every worker receives this brief plus one bounded issue, ownership, dependencies, acceptance checks and a completion condition.

Maintain a backlog larger than the currently active set, but release only ready, non-conflicting assignments. Use a three-minute polling fallback and available capacity to pick up ready work. On completion, record the concrete change, relevant test results, remaining limitations and review status. A coordinator must verify acceptance and dependencies before releasing downstream implementation. A scheduler alone does not judge quality or resolve arbitrary dependency prose.

Separate implementation from independent review. One owner integrates a given app slice; reviewers use separate evidence areas. Do not equate a completed chat, delivery receipt, mock test, successful compilation, screenshot or private QA package with a released app. Distinguish proposed, implemented, source-tested, rendered, native-tested, installed and published.

Preserve existing explicit approval holds, including dirty-draft shutdown testing and private QA forwarding. No automatic merges, deployments, native replacement, paid provider calls or secret handling outside assigned scope. Keep this public brief free of private transcripts, local credentials and raw diagnostic records. Workers should remain blocked when approval or prerequisites are genuinely missing, with a concrete reason. Do not create filler tasks simply to keep agents visibly running.

Completion means a coherent, attractive, accessible and dependable Rivune app with real supported execution, a verified platform installation path and the full agreed feature ledger accounted for. Deliver small integrated milestones and request focused visual feedback. Keep working toward that outcome without repeatedly asking the owner to restate the goal.


# Rivune implementation backlog

- [ ] S00: https://github.com/Draven1287/rivune/issues/7
- [ ] S01: https://github.com/Draven1287/rivune/issues/8
- [ ] S02: https://github.com/Draven1287/rivune/issues/9
- [ ] S03: https://github.com/Draven1287/rivune/issues/10
- [ ] S04: https://github.com/Draven1287/rivune/issues/11
- [ ] S05: https://github.com/Draven1287/rivune/issues/12
- [ ] S06: https://github.com/Draven1287/rivune/issues/13
- [ ] S07: https://github.com/Draven1287/rivune/issues/14
- [ ] S08: https://github.com/Draven1287/rivune/issues/15
- [ ] S09: https://github.com/Draven1287/rivune/issues/16
- [ ] S10: https://github.com/Draven1287/rivune/issues/17
- [ ] S11: https://github.com/Draven1287/rivune/issues/18
- [ ] S12: https://github.com/Draven1287/rivune/issues/4
- [ ] S13: https://github.com/Draven1287/rivune/issues/19
- [ ] S14: https://github.com/Draven1287/rivune/issues/20

Items are not ready merely because they exist. Source reconciliation comes first. Dependencies and acceptance criteria are in each work item. Symphony startup and dispatch are not claimed here.
