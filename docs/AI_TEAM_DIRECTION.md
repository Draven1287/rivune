# Rivune: one configurable AI team

Date: September 6, 2026
Status: Product interpretation from the user's supplied conversation with their dad. Recommendations below are identified separately from that direction. This describes the next design, not functionality already shipped.

## User clarification — September 7: lead-directed automatic teamwork

The user reaffirmed the final discussion with their dad: one Rivune product, one conversation and one team. The appointed lead AI decides whether the request benefits from independent Council answers, divided Swarm work, or a sequence of both. Council and Swarm are execution strategies inside that experience, not separate products or a mandatory choice before typing.

The default product experience is to send a normal prompt with a proposed or user-selected lead and available team. The lead returns a structured strategy decision and a brief user-facing reason; the runtime validates it against available adapters, permissions, team capacity and work limits before dispatch. Deterministic checks constrain the lead's decision rather than substituting keyword routing for it. Manual strategy selection remains an optional override. Unsupported strategies must be disclosed and must never be labeled as executed; the user can be offered the supported part of the work without silently substituting another strategy.

A combined task can gather independent advice, delegate implementation and review the result in the same conversation. Each phase preserves its own correctness rules: independent initial Council drafts, scoped Swarm assignments, evidence-based integration and one lead-owned final answer or deliverable. Record transitions and retain context, cancellation and recovery across phases. A routing decision does not expand permissions or budgets. This clarification changes the target product contract; it does not declare automatic routing or live Swarm implemented.

## Transcript reconciliation — September 6

Re-read against the complete user-supplied `text-4325-A241-2B-0.txt` and the existing RIVUNE_RESET_PLAN.md, COUNCIL_AND_SWARM.md, and RIVUNE_INTERFACE.md. The transcript is a discussion that develops toward one product; its opening suggestion of two products and illustrative model names are not separate final requirements. The user subsequently corrected the competitor name to Traycer and explicitly required work in the installed Rivune app.

**The intended experience:** open Rivune, connect supported AI tools already available to the user, receive a proposed team and manager, adjust them beside a normal prompt when desired, and get one useful answer or completed piece of work. The app should do the coordination. Everyday questions, decisions, writing and planning are as central as software projects.

The decisions and experiments must remain distinct:

| Topic | Product commitment | Implementation or experiment |
| --- | --- | --- |
| One product | One installed Rivune workspace and one configurable team, with orchestrator and member roles | Website/prototype work does not count as delivering the native feature. Keep the accepted Swift app architecture. |
| Manager selection | Rivune proposes an eligible manager; the user can keep it or choose a model and reasoning level beside the prompt | Freeze the actual appointed member for each run. A deterministic default is acceptable initially, with no invented intelligence ranking. A manually selected manager must be honored. |
| Team selection | Rivune proposes a reusable team that the user can edit; multiple members can use one CLI with different model/effort choices | Two per provider was a suggested experiment, not a fixed rule. Initial two-to-three-member recommendation and six-member ceiling are engineering choices, not transcript mandates. |
| Council | Independent answers to the same question, followed by the manager's review and one final answer | The first implementation can use the manager as an independent member in a separate call. The transcript does not require a third user-facing consolidator role or a mandatory extra model. |
| Swarm | The manager assigns different real tasks, permits supported bounded worker delegation, coordinates partner review and integrates the actual deliverable | Text describing workers is insufficient. A shared team configuration is groundwork, not completed Swarm. |
| Automatic behavior | The intended default lets Rivune choose a suitable way of working, with a simple visible explanation and manual override | Council-only availability is a temporary implementation stage. Auto must not pretend to execute an unavailable Swarm path. Do not turn this staging decision into a permanent Council-only product. |
| Discovery and usage | Read supported installed CLI/model capabilities and account readiness; refresh them without asking the user to manage every terminal | Usage percentages only when a supported interface reports them. Account access, model availability and task performance are separate facts. |
| Quality | Partners contribute different useful work, review actual evidence, and deliver a better-supported result | Additional members and a cheaper consolidator need comparison against individual-model baselines; agreement alone is not a quality result. |

The primary controls belong beside the real app's composer: **Manager**, **Team**, and a compact automatic/manual workflow choice when supported. Detailed member IDs, fallback order, process limits and diagnostics belong in secondary controls or task details. Defaults should make the first task usable without a configuration exercise.

Current delivery priority is a working, installed configurable Council team with a proposed/selected manager, exact per-member execution and retained results. Real Swarm and Auto follow as explicit required milestones, not abandoned ideas. Fixing menus and focus behavior supports that experience and must not replace orchestration work. The platform still owns Mac window controls and system security/file dialogs; Rivune owns the designed product controls inside the window.

## Problem and intended product

People who use several AI providers currently choose a provider, repeat context, compare answers and combine work themselves. Rivune should let them assemble a team once, adjust it beside each prompt, and get a useful answer or finished deliverable through one interface. The intended audience includes everyday research, decisions, writing and planning as well as software projects.

The conversation refines the earlier Council/Swarm contract: **one app, one team configuration, two ways of working**. The two user-facing roles are **orchestrator** and **member**. Council and Swarm remain distinct execution behaviors with shared team, context, persistence and result presentation.

## Direction understood from the conversation

- Rivune proposes an eligible orchestrator and team; the user can keep them or choose the orchestrator model and reasoning setting for each task.
- Choose which other model configurations are available to the team. Multiple members may use the same provider/CLI, including different models or different reasoning settings.
- Council members answer the same question independently; the orchestrator reviews their contributions and delivers one final answer.
- Swarm members take different assignments. Where supported, they can delegate actual worker sessions; the orchestrator coordinates, reviews and integrates the deliverable.
- The appointed lead AI chooses the working strategy from the request by default, subject to runtime capability and permission checks. The user can also choose explicitly.
- Provider/model discovery and a simple composer should make this usable without managing terminal sessions manually.
- The product should improve outcomes across everyday work. “Best answer from any AI” is the aspiration to evaluate, not a claim established by the current tests.

## Recommended first experience

The composer keeps one prompt box. A compact control row exposes:

`Workflow: Auto / Council / Swarm     Orchestrator: model + reasoning     Team: members`

Auto is the target default only after both execution paths qualify. Until then, show the available Council workflow honestly and keep unsupported options unavailable. Expanding Team shows each member's provider, model, supported reasoning setting and readiness; selecting two models from one provider creates two real member entries.

Recommend two or three independent members initially, usually one capable model from each selected provider. Do not require two members per provider or let agents expand the team without a limit. Offer larger custom teams within verified adapter/account capacity; benchmark their extra value and latency. The orchestrator may also contribute an independent answer, provided that answer is produced before it sees the other drafts.

Use a capable orchestrator for review initially. A smaller model may later handle well-specified formatting or consolidation if evaluation supports it; it must not become a mandatory extra model everyone must install. Combining conflicting answers involves correctness decisions, not just summarization. Keep this an internal execution choice instead of adding a third mandatory user-facing role.

## Goals and user stories

1. A user can identify the orchestrator, members and workflow before sending, and the actual configuration remains inspectable afterward.
2. Two selected models on the same CLI produce separately attributable work without identity collisions or retrying the wrong configuration.
3. Routing and delegation respect the selected team, supported capabilities and bounded work budget.
4. The product's quality, task completion and latency are measured against a single-model baseline.

- As a person using two providers, I want to choose my preferred manager without losing a useful second opinion.
- As a person comparing models from one provider, I want separate independent members with their own reasoning settings.
- As someone asking for a document or website, I want usable files and clear progress without learning agent orchestration.
- As someone with limited provider access, I want unsupported models and unknown remaining usage shown honestly.

## Requirements

| Priority | Requirement | Acceptance |
| --- | --- | --- |
| P0 | Persist a task's team configuration | Frozen orchestrator/member IDs, route, model, effort, workflow and limits survive restart/retry; later composer edits affect only later runs. |
| P0 | Separate member identity from transport identity | Two members on one CLI with different model/effort choices remain distinct in execution, history, disclosures and failed-member retry. Historical transport-based IDs remain readable. |
| P0 | Per-task orchestrator choice | The selected eligible orchestrator receives the final-review role. Failure follows an explicit saved fallback policy or stops with retained work; no silent change to another model. |
| P0 | Preserve independent Council answers | A member sees the frozen request/context, not peer drafts, before submitting its own answer. Orchestrator/member dual use has separate sessions. |
| P0 | Honest model and reasoning discovery | Select only adapter-supported identifiers/settings. Distinguish catalog advertisement, authenticated access and successful execution. Keep exact resolved identity unknown when not supplied. |
| P0 | Bounded real Swarm work | Worker identity, parent, task, workspace, permissions, dependency, model/effort and cancellation are traceable. Native provider subagents and Rivune-managed sessions are labeled accurately. |
| P0 | Useful final output | Readable answer or exact artifact files/preview/save; errors and review evidence remain accessible. Measured word limits do not imply factual correctness. |
| P1 | Auto routing | Manual choice takes precedence. Deterministic capability/permission checks constrain routing; record chosen behavior and reason. A missing worker adapter cannot produce a result labeled Swarm. |
| P1 | Reusable team presets | Save and edit a team; recheck readiness when it is used. No global assumption that one provider is always strongest. |
| P2 | Adaptive team size and separate consolidation model | Adopt only after comparative quality/latency/usage evidence. Never expand past the configured provider/member/worker budget. |

Provider usage percentages appear only when a supported interface exposes them, with a timestamp and scope. Shared account limits must not be presented as an independent allowance for every member. Unknown usage stays unknown. CLI access on a Mac does not establish that model inference runs on that Mac.

There is no inferred universal “smartest model” score. Recommendations should distinguish task-specific evaluation from capability/readiness metadata and user preference. Model names spoken in the transcript are illustrative, not identifiers to hard-code or a claim of account availability.

## Current implementation gaps, source inspected September 6

- `RivuneRunCoordinator.submit` constructs exactly one Codex and one Claude Council participant. Their IDs are transport IDs; retry also assumes that identity equals the transport. This must change for several models on one CLI.
- `CouncilRunner` has a broader two-to-six participant shape, but that alone does not make the native submission path configurable. Lead selection remains disclosed stable rotation, not the user's chosen orchestrator or a measured ranking.
- `CLICapabilitySnapshot` reads bounded model metadata/help into known model/effort choices. It does not establish intelligence rankings, universal model discovery or per-account remaining usage.
- `SwarmWorkerTask` has model/parent/task fields, but the current text adapter passes no reasoning override and remains a text-output foundation. It does not establish tool-enabled agent work.
- Recent Council execution worked, but the latest three grounding tasks failed at least one quality criterion each. The word-limit repair is under local review; it does not fix arbitrary unsupported premises.

## Validation and phases

First finish the existing 0617 rendering/installation task without changing its frozen feature scope. Then implement the team identity/configuration foundation and configurable Council admission. Integrate the team picker and orchestrator selection after focused identity, recovery and fallback checks. Add real Swarm execution before enabling automatic routing into Swarm.

Suggested engineering acceptance: no identity collisions with two same-provider members; exact effort/model replay on retry; legacy history intact; no unsupported route execution or expansion beyond the selected team. Test cancellation and failed-orchestrator behavior with recording transports before live calls.

Suggested product evaluation: freeze a small balanced set of decisions, explanations, evidence questions, writing tasks and artifact projects. Compare single-model, two-member and three-member configurations with hidden quality rubrics and blinded human review. Treat larger teams and smaller consolidators as experiments. Record quality failures, latency, call counts, and actual usage where exposed. Do not infer superiority from completing the workflow. Keep the existing five-person pilot targets in DISCOVERY_PLAN.md; these remain hypotheses.

## Outside this increment

- Paid cloud, automatic CLI upgrades and unattended unbounded agents are separate work.
- Broad new provider support requires actual adapters; installing or recognizing a CLI is insufficient.
- Replacing the native Mac shell with a competitor's UI/framework is not required for shared orchestration ideas.
- Public claims of universally better answers or provider personality stereotypes are unsupported.

## Prior art and open questions

**Project identified by user:** The intended project is **Traycer**, at [traycer.ai](https://traycer.ai/) and [traycerai/traycer](https://github.com/traycerai/traycer). The earlier Trace candidate was a different product and is not the intended comparison. Traycer's current site emphasizes coding; its README describes parallel agents, model switching, shared context and agent-to-agent debate/review. It is more than side-by-side chats. These are documentation findings, not a hands-on verification or proof that its workflows match Rivune's independent Council contract. Evaluate Rivune's everyday-task experience, independent answers and evidence-based final review as proposed differentiation, not established uniqueness.

[Superset's orchestration documentation](https://docs.superset.sh/orchestration) also describes one agent coordinating mixed workers in isolated workspaces. Cross-CLI orchestration already exists; Rivune needs evidence for its independent-answer review, understandable team controls and usable results.

**Reuse — engineering:** Traycer's directly inspected [main-branch LICENSE](https://raw.githubusercontent.com/traycerai/traycer/main/LICENSE) says MIT, copyright 2026 Traycer AI, with copyright/permission notice retention required for copies or substantial portions. Do not rely on search snippets describing older licensing. Pin a repository revision and inspect relevant files, separate dependency terms, protocol contracts and tests before selecting reusable code. Compare an adapter or execution component with retaining Rivune's existing Swift implementation. This pass inspected public documentation and the root license; no clone, install or code import occurred. A component-level reuse audit remains pending.

**Defaults — product/evaluation, non-blocking:** proposed initial two-to-three-member team and capable orchestrator require testing. The user has not chosen an exact universal team size or a separate cheap consolidator.

**Discovery — engineering:** determine each supported CLI's current model/effort and usage interfaces. Do not query credentials or invent access/remaining-percent values to populate the design.
