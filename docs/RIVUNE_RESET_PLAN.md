> Current status — September 6, 2026: the later user instructions authorize native-app implementation and review. The September 4 pause below is historical. The product is the native Mac app; the public website presents/downloads it. See [current account/build review](ACCOUNT_LIFECYCLE_0606.md) for installed0606 and fixture-tested lifecycle fixes; [0605 review](LOCAL_REVIEW_2026090605.md) preserves earlier rendered evidence. Live auth, deletion/export, signed updates and remaining visual checks are incomplete. No public release or account activation is authorized by this note.

# Rivune — product reset plan

Date: September 4, 2026  
Status: Proposed direction for review, not approval to implement or release.  
Scope of this pass: planning and read-only research. Existing app code, website, installed app, accounts, and release artifacts remain unchanged.

## 1. The product we are actually building

**Rivune is a premium native workspace where the AI models you choose form a working team: they understand the goal, divide the work, challenge each other, verify the result, and deliver one usable outcome.**

The user should not need to copy answers between AI apps, manage an argument manually, or work out which model should do each step. Rivune coordinates that work while keeping the user in control of models, access, context, and spending.

Three promises define the product:

1. **Bring your intelligence.** Connect supported CLI tools and API accounts; choose the team yourself or let Rivune propose it.
2. **Give it a real job.** Build a working website, edit an existing project, research a decision, or develop an idea—not just receive several blocks of text.
3. **Receive one clear result.** The completed answer or artifact comes first. Contributions, objections, revisions, tests, and remaining uncertainty are available beside it.

“Best output” is the objective, not a guarantee of a universally best or true answer. Agreement between models is not independent verification. Rivune must sometimes say that the current idea remains strongest among the alternatives examined, that evidence is insufficient, or that a result has not been tested.

### Audience and priorities

- Personal: a quality-first workspace for Aarav's coding, websites, research, business decisions, and experimentation.
- Public: the same open-source product with approachable setup, configurable usage limits, and understandable controls.
- Mac is the first complete workspace. Preserve the iPhone direction, but do not let simultaneous phone redesign block proof of the Mac experience.
- Keep the name **Rivune** and its current application mark unless the user explicitly changes the brand.

## 2. Why the current approach needs a reset

The current product contains useful foundations, but local polish has been moving faster than agreement on the complete experience. A working text coordinator is not yet the general-purpose agent workspace described above.

Read-only findings from the current checkout:

| Area | What exists | What is still missing |
| --- | --- | --- |
| Models | Fixed `CodexModelChoice` and `ClaudeModelChoice` lists | Refreshable model and capability discovery; GPT-6 Astra is absent from the fixed Codex list |
| Providers | Catalog types and an exact-route runtime registry | User-editable connections and fully integrated additional CLI/API providers |
| Collaboration | Shared planning, contributions, reciprocal review, integration | A scheduler that can use arbitrary chosen participants instead of Codex/Claude-specific assignments |
| Coding | Text/code responses, selected text attachments | Actual project editing, command execution, isolated work, integrated testing, and a runnable preview |
| Interface | Native SwiftUI shell, graphite styling, Settings, inspector | One agreed screen hierarchy, coherent controls, and visual acceptance across real states |
| Evaluation | Deterministic tests and blind-comparison foundations | Repeatable proof that collaboration improves useful outcomes on representative tasks |
| Website | Separate marketing site and labeled prewritten demonstration | A release-driven presentation of the verified app, with dependable installer availability |

Code evidence: `Rivune/Models.swift` (model choices and provider-shaped turn data), `Rivune/ProviderRegistry.swift` (compiled adapters), `Rivune/RivuneCollaborationRunner.swift` (fixed routes), `Rivune/TerminalAIService.swift` (disabled tool surfaces/read-only execution), and `website/app/product-demo.tsx` (prewritten demonstration).

Keep the native shell, original brand assets, persistence/migration protections, useful collaboration tests, and safe adapter boundary where they hold up under review. Rework the provider-specific model, scheduling, and execution assumptions. Do not delete the project or assume every existing component must survive unchanged.

## 3. GPT-6 Astra: fix the model lifecycle, not just the label

OpenAI's official model documentation lists `gpt-6-astra`. Rivune's current fixed choices explain why it does not appear in its picker. This planning pass has not tested Astra through the user's connected CLI or API account, so availability in those particular connections remains unverified. See the [official GPT-6 Astra page](https://developers.openai.com/api/docs/models/gpt-6-astra).

The future model system must:

- Discover models from the connected provider/runtime where a supported interface exists.
- Store stable IDs and capability records, not an enum case that requires a new app build for every release.
- Show the connection and account behind each model. “Known model,” “reported by connection,” and “request succeeded” are different states.
- Refresh after connection, on explicit request, and periodically with a visible last-checked time. A failed refresh preserves the last successful catalog and labels it stale.
- For providers without discovery, use a versioned compatibility catalog plus an explicitly labeled custom model ID option when the adapter supports it. Metadata must never grant executable authority.
- Derive reasoning controls from the specific model **and transport**. The Astra API documentation lists low through max; do not infer that every API or CLI supports an `Ultra` setting. Retain the small purple accent where an actual supported setting warrants it.
- Freeze the resolved model ID, effort, connection, and capability snapshot for each run. A background refresh must not change an active job.
- Explain unavailable/deprecated choices. Never silently substitute a different model, account, or billing route.

OpenAI documents `model/list`, including supported reasoning levels, for Codex App Server. This is a concrete candidate for the discovery layer, subject to checking the installed runtime and supported integration path. It is not yet used by Rivune. See [Codex App Server](https://learn.chatgpt.com/docs/app-server#list-models-modellist).

The public website should show versioned compatibility information and actual examples, not pretend to know which models a visitor's account can access. Personal account discovery belongs inside the app.

## 4. What “premium” means on screen

### Proposed main experience

Recommended provisional direction: **chat first, project-aware**. A simple question gets a simple conversation. A build request brings files, changes, tests, and a preview into the same workspace. The user can keep the project panel open when coding.

One open design question: should the default be chat-first or project-first? The plan uses chat-first until the user chooses otherwise.

```text
┌─────────────────┬─────────────────────────────────┬──────────────────────┐
│ Rivune       ▾  │ Project / conversation          │ Optional work panel  │
│                 │                                 │                      │
│ New chat        │ Your request                    │ Team · Files         │
│ Search          │                                 │ Changes · Preview    │
│ Projects        │ Working… Review details →       │                      │
│                 │                                 │ Assignments, reviews │
│ Recent chats    │ One answer or completed result  │ or the actual output │
│                 │                                 │                      │
│                 │ Tests / sources / next action   │ Closed for ordinary  │
│ Connections     │                                 │ conversation         │
│ Settings        │ [ +  Ask anything…              │                      │
│                 │   Access · Team · Quality  mic ↑]│                      │
└─────────────────┴─────────────────────────────────┴──────────────────────┘
```

This is an information-layout sketch, not an approved visual mockup. At smaller widths, the right panel becomes an explicit sheet or replaces the detail pane; it must not squeeze the transcript into an unreadable column.

### Visual rules

- Native SwiftUI/AppKit shell, familiar Mac selection, keyboard navigation, focus, scrolling, and window behavior. No embedded replicas of the consumer chat apps.
- Graphite surfaces, readable near-white text, restrained borders, and generous but purposeful spacing. Test both ordinary and increased text sizes.
- Glass belongs on navigation, the composer, and transient controls; long answers need a stable reading surface, not layers of blur.
- Rivune's actual mark appears consistently in the sidebar, home state, assistant identity, website, Dock, and installer. Remove generic sparkle substitutes for Rivune.
- One primary conversation title. No repeated brand headers, status badges, settings clusters, or permanent multi-stage process dashboard.
- Provider names and verified marks are small identifiers. Where a suitable mark is unavailable, use a consistent neutral monogram rather than inventing a vendor logo.
- Prefer plain transcript text with strong headings and comfortable paragraph spacing. Reserve cards for objects that need boundaries—files, approvals, previews—not every paragraph.
- Suggested starting tokens for mockups: 4/8/12/16/24/32 spacing; 15–16 pt Mac reading text; approximately 1.5 line height; 12–14 pt controls; roughly 680–800 pt reading width. These are design hypotheses to inspect, not fixed requirements regardless of rendering.
- Keep radius and elevation families small. Hover, selected, disabled, loading, error, keyboard-focus, and reduced-motion states must be designed, not added as afterthoughts.
- Aim for readable contrast, complete keyboard access, VoiceOver labels, and no animation required to understand status. Screen size and accessibility review are approval gates.

### Composer and navigation rules

- The sidebar selector always offers **Rivune** and the user's connected direct providers. Do not permanently hard-code two vendors into the layout.
- Rivune means coordinated work; Direct means one chosen provider. Team composition and per-model options live in one clear panel, not nested vendor submenus.
- The plus control exposes inputs actually supported by the selected route. Attachments show what will be shared and can be removed before sending.
- Access, context, model/team, and quality controls each have one location. Context reads “Include earlier messages” with an explanation; do not use ambiguous “on/off” headers.
- Clearly distinguish Send, Stop, waiting for approval, and a resumable paused checkpoint. Do not display Pause if a provider can only cancel and restart.
- The text field stays responsive while agents work. Scrolling never jumps away from what the user is reading, and the composer never covers the final lines of an answer.

### Settings structure

Use one quiet native Settings workspace: General, Connections, Intelligence, Permissions, Privacy & Memory, Appearance, Devices, and Updates. Exact grouping can be simplified during mockups.

Connections has one row per connection with provider, CLI/API route, state, and a relevant action. Selecting a row reveals models and supported settings. Distinguish provider-owned settings from Rivune-only overrides. Import only documented, allowlisted, non-secret settings; preview the import and do not overwrite the provider's configuration silently. Never assume a CLI exposes every preference in its consumer app.

## 5. How the AI team should work

The orchestration should adapt to the job, not force every greeting or decision through a large debate.

1. **Understand:** capture the user's goal, constraints, existing context, and definition of done. Ask only when a missing answer materially changes the job.
2. **Select:** propose models and responsibilities from the connected capabilities, observed performance, and chosen quality/usage policy. Explain the selection briefly and allow override.
3. **Plan:** create a shared task graph with owners, inputs, dependencies, expected artifacts, and acceptance checks. Roles are temporary responsibilities, not “Codex always builds; Claude always critiques.”
4. **Challenge the plan:** inspect missing requirements, risky assumptions, dependencies, and duplicated work before expensive execution.
5. **Work:** run independent tasks concurrently. Each participant sees the shared goal, relevant other assignments, and versioned artifacts needed for its own work.
6. **Cross-review:** a different participant checks the actual contribution or patch and the evidence behind it. Findings name the issue, evidence, proposed correction, and severity.
7. **Revise and verify:** resolve actionable findings; rerun relevant tests on the integrated artifact. Model agreement cannot substitute for command output, source checks, or rendered inspection.
8. **Deliver:** present one coherent answer or working artifact, what changed, verification status, unresolved issues, and a usable next step.

Stop when the acceptance criteria are met and further review produces no meaningful new findings, or when an explicit limit/blocker is reached. Preserve unresolved disagreement rather than manufacturing consensus. A bounded number of useful review rounds is preferable to an endless argument, even for a quality-first user.

The side panel shows task status, contribution summaries, objections, revisions, evidence, and provenance. It does not need private chain-of-thought or verbose internal role prompts to make the work inspectable.

### Three acceptance scenarios

**Website build:** the team agrees on a brief; divides implementation responsibilities without conflicting edits; runs the app; another participant reviews the real output; fixes are integrated; tests and responsive screenshots are attached; the user can open the site locally and inspect changed files. Deployment remains a separate authorized action.

**Business decision:** the team uses the same user-provided constraints, considers genuinely different alternatives, distinguishes facts from assumptions, checks evidence where available, and returns a ranked recommendation with uncertainty and a validation experiment. Repeatedly asking “anything better?” must not force a fabricated replacement. “No stronger option found under these criteria” is valid; “nothing better exists” generally is not established.

**Ordinary conversation:** a greeting or short factual exchange remains brief. No invented task split, committee report, or ten-minute review ceremony.

## 6. “Any AI” as an extensible product, not a false promise

The desired architecture accepts an arbitrary list of provider connections and participants. No vendor should be required by the data model or scheduler.

A connection comprises a provider, account reference, transport, discovered/declared capabilities, models, and an adapter version. An agent assignment combines a connection/model with a role, task context, tool grants, and a budget.

Connection flow: **Add connection → detect supported CLI or enter API configuration → authenticate with the provider → inspect capabilities → choose eligible models → test with clear consent → add to team.**

- Supported CLI discovery uses known integration rules and does not execute every binary in Terminal. An unknown CLI needs a documented adapter or supported common protocol.
- Compatible API endpoints may share an adapter, but matching request syntax does not prove streaming, tools, context, or error behavior are identical. Validate each capability separately.
- API-only models can participate in reasoning/review; execution requires an implemented tool loop or supported agent runtime. An API key alone is not an agent environment.
- New model IDs on an existing compatible adapter should not need an app release. New executable behavior or protocols still require reviewed code and tests.
- Use official provider authentication. Keep secrets in Keychain or provider-managed storage, never in chats, source archives, or the public website.
- Cross-provider sharing must show which connections receive the relevant prompt, memory, attachments, and artifacts. A new recipient requires the applicable consent.
- Consumer subscriptions, API billing, and CLI entitlements remain distinct. Do not claim import of proprietary chat history, account memory, or consumer-app features unless an actual supported path exists.

Proposed architecture: keep the native Mac shell and place a provider-neutral orchestration/execution service behind typed events. Evaluate whether that service lives in Swift or a small supervised helper based on the supported runtimes; choose after a bounded integration spike, not a framework rewrite for its own sake.

Core boundaries: connection registry; model/capability discovery; account/secret references; task scheduler; tool/permission broker; isolated project execution; artifact/version store; verification/evaluation; native presentation. Adapt existing code where it satisfies those boundaries.

## 7. Real project execution and trust

Building websites is a launch requirement, not a later cosmetic feature.

- Work in a user-selected workspace. Give parallel contributors isolated branches/worktrees or explicit non-overlapping file ownership. Version inputs and patches so reviewers know exactly what they reviewed.
- One integrator assembles changes; tests run against that final state. Avoid multiple unsynchronized agents writing the same checkout.
- Track subprocesses, commands, approvals, test results, diffs, preview state, and cancellation as structured events. Stream progress and text where the provider supports it; otherwise display honest phase activity while awaiting a result. Provider work must not block the UI thread.
- Support checkpoints and recoverable history. On disconnect or restart, show the true state; never turn an interrupted job into a completed result.
- Permission levels should map to enforceable behavior: discuss/read selected material, inspect a selected project, or edit/run within that project. Broader access and external actions require separate explicit grants.
- Budget freedom does not imply permission to delete data, publish a website, buy services, or send messages. All participants share the same enforceable boundary.
- Tools and external content can be adversarial. Treat repository files, web pages, documents, and another model's output as task data, not authority to expand access.

## 8. Quality and usage policy

The personal preset should prioritize quality over speed/cost, reflecting the user's stated preference. Public users need visible Balanced and Custom policies with request, time, token/cost, and concurrency limits where measurable.

These are orchestration policies, not invented provider reasoning levels. Show known usage separately from estimates; a subscription connection may not expose precise remaining quota or a per-request dollar charge. Account changes must be explicit and respect provider limits—no silent account rotation.

Automatic routing begins with capabilities and declared preferences. Improve it using task-specific evaluation results with sample size and uncertainty, not permanent vendor stereotypes or an untested “best model” badge. Preserve manual model/team control.

Planning does not run a live benchmark. Before later paid testing, agree on a concrete batch and its boundaries. The user has expressed high usage tolerance, not a request to consume accounts during this paused design pass.

## 9. The website has a separate job

The website explains and distributes the actual product. It should not be another partially functional copy of the application.

Proposed page order:

1. A concise product promise and a current screenshot of the approved native app.
2. A real recorded website-build example, with task division, review, and final preview visible.
3. A research/decision example showing evidence and honest disagreement.
4. Connection setup and verified compatibility, separating CLI from API requirements.
5. Version history, known limitations, platform requirements, privacy, and documentation.
6. Distinct **Download for Mac (.dmg)** and **Source code (.zip)** actions, plus repository/contribution links once available.

Use the same logo, typography relationships, restrained palette, and vocabulary as the app. Preserve the bold editorial type the user likes, while replacing excessive process cards and generic superlatives with the working product.

A single versioned release manifest should drive app version metadata, website compatibility/release notes, artifact filenames, and checksums. No unverified announcement should automatically become a claim of working account access.

A DMG is an installer container, not the source code. The public installer is enabled only after signing, notarization, integrity checks, and an install/open test on a clean Mac. Test the actual browser download separately from Apple's launch checks; those are different failure modes. Keep source downloads available independently. Do not offer an unsigned local preview as a normal public installer.

## 10. Build order and approval gates

No deadline is assumed. Advance by demonstrated outcomes, not a count of code changes.

| Phase | Deliverable | Gate before moving on |
| --- | --- | --- |
| 0. Freeze and scope | Preserve current checkout; identify reusable pieces; agree on this brief | User confirms the product direction and first release scope |
| 1. Design the experience | One recommended visual direction; realistic screens for empty chat, active run, final answer, coding preview, connection setup, Settings, and errors; matching website concept | User sees and approves rendered designs at wide and narrow sizes |
| 2. Prove connections | Provider-neutral connection/model records; discovery/cache/error states; Codex, Claude, and one independent third-provider integration; both CLI and API paths | Prove a model refresh, account isolation, compatible effort choices, cancellation, and a team that is not fixed to Codex + Claude |
| 3. Prove one full job | One real website build through plan, divided work, reciprocal review, integration, execution, tests, and local preview | Fresh workspace produces runnable files with an inspectable review and verification trail |
| 4. Prove general reasoning | Business/research decision path; evidence/uncertainty handling; calibrated routing; blind evaluation | Compare representative work against each selected single-provider baseline without rewarding verbosity or forced agreement |
| 5. Finish the public Mac product | Onboarding, model settings, history, accessible controls, permissions, failure recovery, release website and installer | Every visible control has a working behavior or a clear unavailable state; install/download and regression checks pass |
| 6. Extend deliberately | iPhone companion polish, broader providers, multimodal tools, voice, integrations | Each addition passes adapter, privacy, UI, and outcome tests without undermining the core workflow |

Personal and public editions should share one codebase with different local configuration/presets. Avoid copying the app into two diverging projects. Keep private accounts, prompts, and history out of the open-source package.

### First complete release scope

Must have: premium approved Mac UI; configurable supported CLI/API connections; fresh model discovery including Astra when a connection offers it; variable team membership; real workspace editing/testing/preview; useful research/decision review; direct mode; trustworthy Stop/recovery; history; clear access/usage settings; verified distribution.

Deferred, not abandoned: consumer-app feature parity, every unknown CLI automatically working, proprietary account-memory imports, extensive voice/video/image features, cloud relay, widgets, and simultaneous redesign of every Apple platform. Do not place attractive dead controls in the first-release interface to imply these work.

## 11. What counts as done

Suggested acceptance targets below are proposed requirements, not claims about current results:

- A newly reported compatible model appears on refresh without rebuilding the app; stale/offline/no-access states are distinct.
- A three-participant run and a run excluding either current vendor both work. Adding a supported connection changes the appropriate UI without editing vendor-specific views.
- At least one mixed CLI/API team completes the same end-to-end job.
- Each substantive task has an owner and acceptance checks; reviewers receive the exact version they review.
- A website request creates usable files, a running preview, and verification on the integrated result—not just code in a message.
- Failed tests, missing evidence, dissent, and stopped jobs remain visible. No success state is inferred solely from a model saying it is done.
- A proposed 20-task evaluation set covers coding, bug fixes, research, decisions, false premises, greetings, and interruptions. Use held-out examples, executable checks for code, and blind human judging for decision quality; report ties, losses, cost, and time as well as wins. Expand repeats before claiming reliable superiority.
- Critical safety/recovery cases pass on every release: cancellation, lost connection, unavailable model, expired authentication, malformed output, conflicting edits, exceeded limits, and restart recovery.
- Visual review covers real long responses, wide tables/code, no accounts, one account, several accounts, permission prompts, and failure states—not only the empty home screen.
- At a compact Mac window and increased text size, no controls overlap or obscure content. Keyboard, screen reader, reduced motion, and contrast checks pass.
- Public DMG download, mount, drag into Applications, first launch, version display, and existing-history migration are tested independently of a developer's installed copy.

## 12. Decisions to carry into the new chat

Already established: Rivune branding; native Apple-platform direction; clean Codex-like usability with original restrained styling; a subtle purple accent; broad CLI/API vision; one main result with inspectable team work; quality-first personal use; real coding and decision support; open source.

Provisional defaults: chat-first with an optional project panel; Mac first; shared personal/public codebase; one third-provider adapter to prove neutrality; no fixed Codex/Claude role assignments.

User decisions: approve or revise the screen layout and first-release scope; choose chat-first versus project-first if desired; visually approve the redesigned screens before implementation resumes. Provider selection for the third live integration can wait until Phase 2 and account availability is known.

Engineering questions: which supported runtime interfaces expose model/effort/tool state; helper-process versus in-process orchestration; OS-level workspace containment; session recovery semantics; usage observability; signing credentials available for distribution. These require bounded investigation and evidence, not assumptions in marketing copy. This plan did not re-audit signing credentials or revalidate historical build/live-test claims.

The read-only gap review also found that discovery and execution currently check different installation directories, and model controls/readiness still contain two-provider branches. Record these in the connection work rather than resuming isolated patches before the design is approved.

**Next deliverable: the approved screen designs and one end-to-end website-build walkthrough. Do not resume the old incremental patch queue by default.**
