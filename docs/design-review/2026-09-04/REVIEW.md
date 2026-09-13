# Rivune design review 01

September 4, 2026 · Proposed direction · Awaiting user review

This packet turns `docs/RIVUNE_RESET_PLAN.md` and `docs/NEW_CHAT_HANDOFF.md` into one reviewable experience. It contains isolated HTML/CSS/JavaScript design artifacts. It does not implement the native app, change the production website, call models, edit a project through agents, or create a release.

Open `index.html` in a browser, or serve this directory locally. The review toolbar is outside the proposed app. It switches screens, demonstrates a compact window and increases reading text. All account names, activity, artifacts, timestamps, diffs and check receipts are fixtures. The Fieldwork preview is designed sample content.

## Product contract

**Rivune is a premium native workspace where the supported AI connections you choose work as a team to deliver one usable outcome.**

The team understands the goal, assigns temporary responsibilities, works on versioned artifacts, challenges concrete contributions, resolves findings and verifies the integrated result. The result is primary; the process and evidence remain inspectable. Direct single-provider conversation stays available, and an ordinary greeting stays brief.

Model agreement is not verification. Rivune preserves missing evidence, incomplete checks and unresolved disagreement. It can recommend keeping an existing idea without claiming that no better option exists. Quality-first means thoughtful selection and useful review within explicit boundaries, not automatically maximizing participants or rounds.

### Established requirements

- Keep Rivune's name and actual application mark. This packet copies the existing `brand-assets/RivuneAppIcon-master.png` without altering it.
- Use the native Apple direction, restrained graphite surfaces, readable typography, controlled glass and a small purple accent.
- Support configurable eligible CLI/API connections and variable teams, as well as direct mode.
- Deliver real website/project work and useful research/decision support.
- Put one clear outcome first, with contributions, objections and evidence accessible beside it.
- Preserve quality-first personal use and open-source intent.
- Obtain visual approval before production implementation resumes.

### Recommendations made in this packet

- Chat-first, with an optional Team / Files / Changes / Preview work panel.
- Mac first; preserve the iPhone direction without blocking the first complete workspace.
- One personal/public codebase with different configuration and presets.
- Show the work panel as a replacement for the detail pane at compact sizes; close it explicitly or with Escape. Close the work view to return to the unchanged transcript.
- Keep Settings coherent: General, Connections, Intelligence, Permissions, Privacy & Memory, Appearance, and Updates. Show Devices only once supported device behavior is ready. It appears in this design review to explain the deferral.
- Omit microphone and other unsupported inputs from the first-release composer. Bring them back with an implemented, accessible path.
- Prove one independent third-provider adapter and mixed CLI/API work before claiming broad interoperability. The prototype intentionally uses a named placeholder, not an unverified vendor promise.

These recommendations are not recorded as user-approved decisions.

## First complete release scope

| Area | Required user outcome | Evidence required later |
| --- | --- | --- |
| Native Mac experience | Approved chat, work panel, Settings and onboarding | Rendered native wide/compact states, keyboard and accessibility inspection |
| Connections and models | Configure supported CLI/API accounts; refresh model choices without rebuilding where supported | Connection-specific catalog, capability and stale/no-access checks; account isolation |
| Team and direct mode | Select eligible participants; run without either current vendor | Three-participant run, a run excluding each current vendor, and a mixed CLI/API team |
| Real project work | Edit actual files, run checks and open a local preview | Fresh workspace; isolated contributions; integrated diff; actual command output and screenshots |
| Reasoning | Give evidence-aware recommendations and preserve useful objections | Representative blind comparisons against each selected single-provider baseline, including ties and losses |
| History and recovery | Keep truthful state after Stop, restart, auth expiry and disconnect | Verified unfinished checkpoints and linked retry attempts; no false completion |
| Access and usage | Understand recipients, permissions and measurable limits | Shared enforceable tool boundary; no silent route/account substitution; measured versus estimated usage |
| Distribution | Download source independently and install the verified Mac release | Versioned manifest, archive checks, signed/notarized DMG, browser download and clean-Mac install/open validation |

Deferred: automatic support for unknown CLIs, consumer-app feature parity, proprietary account-memory imports, broad voice/video/image tools, cloud relay, widgets and simultaneous iPhone redesign. These stay out of the first-release interface unless they acquire working behavior.

## Recommended screen system

| Screen | Primary task | Key design choice |
| --- | --- | --- |
| 01 New conversation | Start with a question, decision or project | Quiet home, existing mark, one composer, optional examples |
| 02 Team at work | Understand progress while continuing to write | Two concise transcript paragraphs; assignments and review details in the work panel; real Stop semantics |
| 03 Decision answer | Act on a recommendation with uncertainty | Plain prose, small comparison table, retained objection and a validation experiment |
| 04 Website workspace | Inspect the result and actual work | Result beside preview; Files and Changes show versioned sample artifacts and evidence |
| 05 Connections | Understand which account offers which model | Connection list and detail; CLI/API identity; explicit model states; stale-catalog fixture; zero/one/several account states |
| 06 Settings | Find each preference once | One native-style hierarchy; quality policy separate from provider reasoning effort |
| 07 Access approval | Authorize a concrete scope when needed | Named workspace, allowed actions, recipients, context and boundaries together |
| 08 Interrupted work | Recover without losing provenance | Saved checkpoint, missing review, explicit reconnect/reviewer replacement; incomplete remains incomplete |
| 09 Website concept | Understand and obtain the real product | Editorial promise, app image, workflow, honest setup and independent installer/source actions |
| 10 Walkthrough | Follow one complete website job | Same fictional project across briefing, grants, work, review, verification and handoff |
| 11 Scope and notes | Give targeted feedback | Established versus recommended choices, release scope and exportable local notes |

The review toolbar is an artifact navigation aid, not part of the proposed product. It exposes states that would normally follow from real activity.

### Layout and visual behavior

At a wide window, the sidebar is approximately 215–235 px, the conversation expands, and the work panel is 350–385 px or wider for a preview. Reading content is constrained to roughly 710 px where space permits. At widths up to 1150 px in this prototype, the work panel replaces the detail pane instead of creating three narrow columns. Below 760 px, sidebar navigation is explicit and collapsible. These breakpoints are design hypotheses, not final native sizing contracts.

The transcript is independently scrollable. The composer is in normal flex layout below it, so the user can scroll the last answer line above the composer. Opening or changing work views preserves transcript scroll position. No automatic scroll-follow behavior is claimed by this prototype.

The primary surface is `#19191c`, navigation and panels sit slightly lighter, and the composer uses a restrained gradient. Near-white text is primary; lavender is an accent for selection and quality, not a permanent glow. Cards are reserved for artifacts and permission objects. Prose is not boxed paragraph by paragraph.

The existing logo appears in the sidebar, home, assistant identity and website. Neutral letter monograms identify fixture providers; these are not invented vendor logos. Dock and installer artwork remain the same existing mark in the proposed release contract; neither is rebuilt here.

### Interaction coverage

The prototype supports screen navigation; all four work views; the compact/larger-text controls; direct-route selection; a draft team excluding a vendor; draft composition during work; Stop with an incomplete checkpoint; adding/removing a fixture attachment; access/context/policy dialogs; model catalog refresh success/failure simulation; zero/one/several connection states; connection setup/test/import previews; Settings sections and selected controls; error recovery inspection; and browser-local review notes with Markdown export.

These interactions demonstrate behavior without executing a runtime. Selected draft team membership does not rewrite a fixture's existing assignments: a real active run must keep its frozen participants and capabilities. No actual accounts are configured, API keys accepted, model requests sent, files edited by agents, terminals started for the sample job, or downloads packaged.

## Website concept

The proposed headline is **“Give your AI team something real to do.”** It leads to the actual approved app image and a real recorded workflow at release time. The current image is explicitly a screenshot of the design prototype.

Proposed order:

1. Product promise, short explanation and native app preview.
2. Website-build example: brief, work split, concrete review, verified result.
3. Research/decision example: evidence, uncertainty and retained disagreement.
4. Versioned compatibility and supported setup, distinguishing CLI from API.
5. Release notes, platform requirements, privacy, documentation and limitations.
6. Distinct Mac DMG and source ZIP links, with repository/contribution links once verified.

The concept's release buttons open explanations of unavailable artifacts. They do not link to a stale installer, announce a version, or pretend the source archive is an installer. A single verified release manifest must eventually drive version labels, compatibility, notes, artifact names and checksums.

No new public page is created by this packet. No existing marketing files are edited. The matching concept lives only in this isolated review directory.

## Website-build walkthrough

The full illustrated sequence is screen 10. The following is the behavior contract for a later real proof:

| Step | What the user sees | Work and evidence | Permission |
| --- | --- | --- | --- |
| Brief | Normal conversation with a short statement of the objective | Capture pages, functional action, content constraints, responsive targets and local-review completion criteria | No new grant just to discuss |
| Workspace | A concrete access sheet if needed | Named folder, edit/run scope, receiving accounts, attachments and context | Grant only missing scope; reuse existing applicable authorization |
| Plan and challenge | Concise progress; inspectable task ownership | Task graph; inputs; artifacts; tests; challenge missing booking URL and business facts | No repeated permission for already granted project work |
| Divided work | Parallel task summaries in Team | Isolated worktrees or enforced file ownership; versioned copy/layout contributions | All contributors share the same enforced boundary |
| Cross-review | Findings beside exact changes | Another participant reviews v2 patch and screenshots; compact header and unsupported content claims identified | New recipient requires applicable consent |
| Revise and integrate | Findings resolved with evidence links | One integrator assembles v3; reviewers see the precise revision | Stay inside granted scope |
| Verify | Build/test/render receipts next to the preview | Run actual checks against v3; preserve command exits and screenshots; preview the same version | Broader access or new external effects need separate authorization |
| Deliver | One result with files, preview, checks and open issues | Clear local-review outcome; sample booking URL and hours remain flagged | Deploy only after separate authorization |
| Interrupt | Incomplete state and saved checkpoint | Preserve completed work, missing review, failed connection and attempt history | Explicit reconnect or replacement; no silent substitution |

Example temporary assignment: one model owns structure and integration, another owns service copy and reviews layout, and an independent API model reviews content and the booking path. Rotate roles as appropriate on other jobs. A model reviewing its own changes is not independent cross-review.

The screenshot's green check receipts are fixtures. The later engineering proof must generate actual runnable files and evidence in a fresh workspace. This packet does not demonstrate the current app's execution ability.

## Engineering questions to resolve after design approval

- Which installed supported interfaces report connection-specific model IDs, effort values, tool state, cancellation and session continuation? Codex App Server `model/list` is a candidate from the supplied plan, not an integration verified here.
- Which adapter/runtime combination should prove the independent third provider and mixed CLI/API team? Keep public compatibility claims pending evidence.
- Should the orchestration service live in Swift or a small supervised helper? Decide from a bounded runtime spike.
- How will workspace containment, process ownership, cancellation, versioned artifacts and recovery be enforced across every tool path?
- How will provider-owned settings and Rivune overrides remain separate? Import documented, allowlisted non-secret preferences only, with a concrete preview.
- Which usage signals are observable, and which are estimates or unavailable? Do not invent quota or dollar precision.
- What signing and distribution access is available? Recheck when distribution work is authorized.

Preserve and evaluate existing native shell, mark, persistence/migration, bounded-input, adapter and evaluation foundations. Fixed vendor-shaped models and scheduler routes need review; disabling the existing tool restrictions alone does not implement safe project execution. The supplied source findings are planning context, not a fresh code audit in this packet.

## Approval and feedback

**Current status: no user approval recorded.**

The requested review is whether to approve or revise this coherent visual direction, chat-first layout and first complete release scope. Provider choice and process architecture can remain unresolved until their bounded investigations.

Use screen 11 to write notes and export them, or reply in the task. Browser-local notes are not automatically committed to a file. `FEEDBACK.md` records the current approval state and will be updated with actual feedback received in this task. There is no button that silently approves production implementation.

Approval is requested because the user-authored reset plan and handoff explicitly require rendered visual approval before resuming implementation. The design-critique skill informs the review; it does not add a separate permission requirement.

## Validation scope

See `VALIDATION.md` and `inspection.json` for browser artifact inspection, screenshots and limitations. They do not validate the production SwiftUI app or demonstrate live provider capabilities. `source-baseline.json` records source/asset hashes for a read-only comparison before handoff.
