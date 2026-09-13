# Rivune: Council and Swarm

Date: September 6, 2026
Status: Product direction confirmed by the user; implementation and live acceptance pending.

September 6 refinement: [AI_TEAM_DIRECTION.md](AI_TEAM_DIRECTION.md) captures the user's subsequent conversation about one configurable team, per-task orchestrator selection, multiple models from the same CLI, and eventual automatic workflow routing. It supersedes the earlier placement of lead override in P1 and the fixed initial team as a long-term UI constraint. The execution distinctions, safety boundaries, historical records and evidence requirements below remain applicable. For actual implementation/validation status, use COUNCIL_IMPLEMENTATION.md and the dated QA receipts rather than this original planning status.

## Confirmed direction

Rivune is **one app with two collaboration modes**, Council and Swarm. In Council, **Rivune appoints a lead model** to review the independent answers and write the final response. In Swarm, participating models delegate separate tasks to agents, coordinate their work, and deliver an integrated result.

These are behaviors, not two names for the existing Together pipeline. Existing Together conversations retain their original mode and execution history. The running Lantern redesign uses that earlier pipeline and cannot establish that Council or Swarm works.

## Problem

A user connecting two or more AIs needs to choose between getting a considered answer and getting a project completed. The current fixed two-provider workflow mixes planning, contributions, review, and integration under Together; the Lantern test also exposed weak output presentation and brittle handoffs. Users need an understandable mode, evidence of actual work, and a usable final answer or artifact.

## Goals

1. A user can choose Council or Swarm before sending a prompt and understand the difference from one sentence of help.
2. Council collects independent responses from at least two connected models and produces one lead-authored answer, with inspectable sources and selection rationale.
3. Swarm executes distinct agent tasks against a scoped project and combines their results without silently overwriting another worker's changes.
4. Both modes preserve work through failures, expose progress and cancellation, and present finished answers or usable files.
5. Live acceptance tests establish what happened; a label, simulated transcript, or successful unit test alone does not establish a working mode.

## Initial scope

- Start with the two supported, authenticated CLI providers; model and participant data must allow more providers without fixed ChatGPT/Claude result slots in the new contract.
- Use the existing local app, project storage, and provider connections. No separate product, new cloud service, paid plan, or new account requirement is needed for this feature.
- Keep native macOS window controls and system permission/file dialogs. Use Rivune's own mode selector, menus, progress, cards, and file presentation across native and browser surfaces.
- Keep existing single-provider chats and historical Together records readable. A historical run must not acquire a Council/Swarm label that misrepresents how it ran.
- Do not enable unrestricted recursive agents, background purchases, or publication as a side effect of a project request.

## User stories

- As someone comparing ideas, I want several models to reason independently before a lead reviews them, so agreement is not merely copying the first response.
- As someone asking for a website, I want agents to own complementary parts and test their combined result, so I receive a working site with files I can use.
- As someone using free or limited accounts, I want readiness, limits, and partial failure explained, so I can recover without losing successful work.
- As someone inspecting a result, I want to open the answer's exact files and see which checks ran, so I can distinguish generated work from verified work.

## Council — P0

### Flow

1. Freeze the user request, approved project context, participants, and task criteria for this run.
2. Ask all participating models for independent responses. They receive the same task context and do not receive each other's drafts at this stage.
3. Rivune appoints an eligible lead using the selection policy below. The lead may also have submitted an independent response.
4. Give the lead every successful response and the criteria. It evaluates correctness, task coverage, evidence, feasibility, and relevant tradeoffs, then writes one coherent final response. It may adopt, combine, correct, or reject claims; it must preserve material uncertainty and disagreement.
5. Present the final response first. A compact disclosure shows the lead, why it was appointed, independent responses, and a concise comparison of the useful contributions. Do not request or expose hidden chain of thought.

### Lead appointment

- The app selects among connected, authorized participants whose actual adapter and model capabilities support the task and input size.
- Selection uses documented task fit and available evaluation/reliability evidence. Readiness and capacity are eligibility checks, not evidence of intelligence.
- Do not infer that one provider is universally smartest, use brand preference as an unexplained rule, or show invented quality scores. If task-specific evidence is absent, disclose a deterministic fallback and its reason as an estimate, not a proven ranking.
- Persist lead provider/model identity, reason, policy version, evidence basis, and any fallback in the run record. The exact model must be recorded when the transport supplies it; an unknown provider default stays unknown.
- A failed lead may be replaced by another eligible participant with an explicit progress event. Do not silently return a draft as a reviewed final answer.

### Acceptance

- Given two ready participants, both drafts start without seeing the other draft; a recording transport test verifies the request bodies.
- Given contradictory draft facts, the lead is instructed to resolve with supplied evidence or report uncertainty; disagreement is not hidden behind a unanimous label.
- Given the selected lead is unavailable, an eligible fallback is recorded, or the run ends recoverably with the successful drafts retained.
- Given only one successful draft, the UI calls the result partial and does not claim a completed multi-model Council. The user can retry the failed participant.
- Given cancellation, no final synthesis begins afterward and late callbacks cannot overwrite a cancelled or newer run.
- Given an artifact result, summary, Preview, file list, and reviewed save work on the exact run and answer revision; raw JSON is secondary.

## Swarm — P0

### Flow

1. Establish the task, approved project, expected deliverables, acceptance checks, and a bounded run budget.
2. A coordinator creates a task graph with explicit owners, dependencies, file boundaries, and shared interfaces. Participating model leaders can propose and delegate worker tasks.
3. Rivune launches real worker executions through supported provider adapters. Each worker has a task ID, parent/leader, provider and model, scoped workspace, status, and output/change receipt.
4. Independent tasks run concurrently only when their dependencies and file ownership allow it. Workers use isolated workspaces or staged changes; integration detects conflicts instead of choosing the last writer.
5. Partners review each other's relevant work. A coordinator integrates changes and runs the stated checks. A review can return a specific repair task within the run's limits.
6. Present the integrated result, file changes, preview, and actual check results. Keep the task/agent activity available in a readable disclosure.

### Execution contract

- Text responses describing agents are not agent execution. `toolUse` in a model catalog is not proof that a particular installed adapter exposes tools or delegation.
- A provider may implement native child agents or Rivune-managed worker sessions. Identify which mechanism actually ran; do not pretend that one implements the other.
- Initial engineering default: two model leaders, at most two concurrent workers, at most six worker tasks per run, one level of delegation, one repair cycle per task. These are adjustable product limits, not claims about provider limits.
- Enforce limits before launch. Cancel stops the coordinator and all owned worker processes; completed changes stay inspectable. A limit or failure produces a partial/blocked result with a next action.
- Workers inherit only the approved project context and permissions. New external actions and access outside that scope retain the applicable user authorization boundary.
- Staged output is inspected before applying to the user's project. Preserve original bytes and support recovery when integration or save fails.

### Acceptance

- A real two-provider website run produces traceable tasks from both leaders, actual worker executions, distinct owned changes, integration, and checks.
- The run record links the final files to worker outputs and integration changes. It does not claim a partner reviewed or tested something without an actual receipt.
- A deliberate overlapping edit is detected and routed to integration/review, not silently overwritten.
- Cancelling during parallel work stops all owned workers and prevents new workers launching; late results do not change the cancelled result.
- One failed worker can be retried without discarding unrelated successful outputs, within the run limit.
- An adapter without tested worker support gives a precise unavailable explanation. It does not fall back to Together while keeping a Swarm label.

## Shared product experience — P0

The composer has a compact Council / Swarm selection with descriptions: “Independent answers, reviewed by a lead” and “Agents build different parts of a project.” Show participant readiness and the appointed lead when known. Unsupported modes remain clearly unavailable until execution is implemented.

Progress uses actual events: answering, reviewing, planning, working, checking, integrating, complete, partial, failed, cancelled. Do not fabricate percentages or display a completed check before receiving its result. During a run, changing the composer mode affects the next run only.

The primary result is readable prose or an artifact card with summary, exact files, preview, and reviewed save. Provider transcripts, JSON, plans, and detailed activity are secondary. For a website, preview quality at desktop and mobile sizes is part of acceptance, separately from compilation and file validation. Visual inspection is recorded only when it occurred.

Native and browser clients use the same run identity and mode semantics. A browser action targeting the native app includes the exact conversation, turn, and artifact revision, not just the most recent conversation.

## P1 and P2

P1: more participant adapters, user-adjustable run limits, lead override, richer checkpoint recovery, and task-specific routing calibrated on a recorded evaluation set.

P2: cloud execution, cross-device agents, paid compute orchestration, and deeper delegation. These need their own operating and cost model and are not prerequisites for the local version.

## Success measures and release gates

These are proposed acceptance targets, not observed performance:

- Automated tests cover independence, leader eligibility/fallback, identity persistence, cancellation, worker limits, conflicts, and failure recovery with zero unresolved failures.
- Complete at least three real Council tasks (a decision, an explanation, and a code review) with two connected models and inspectable lead synthesis.
- Complete one real two-provider Swarm website project and one repair project, including rendered review at 1280 and 390 CSS pixels, functional checks, and exact saved file receipts.
- In a five-person pilot, at least four people can explain the mode distinction and finish one task without help. Record failures and time to usable result; no superiority claim from this small pilot.
- Compare the same bounded tasks with a single-model baseline using prewritten criteria before claiming Council/Swarm improves quality. Track time and known usage alongside quality; unknown CLI cost remains unknown.

## Work sequence and ownership

1. Root: maintain this contract, finish the existing Lantern retry, and verify claims and rendered outputs.
2. Update Rivune product direction: implement Council execution, honest mode availability, persistence/migration, native UI, and focused tests. Own shared native integration. Prepare builds but do not quit/install while the Lantern run is active.
3. Plan unified AI accounts app: inspect actual CLI worker capabilities and implement/test the bounded Swarm worker foundation in new isolated files after agreeing interfaces with the native owner. No conflicting edits to existing runner/store/UI files; no unrestricted live execution.
4. Review and update website daily: update local preview copy to describe one app with two modes and accurate per-mode availability. Preserve coming-soon download state. Publish only after the existing release gates are met.
5. Summarize current work: update the shared ledger with verified versus implemented, pending, and unavailable states. Do not relabel the earlier Lantern test as Council/Swarm.

No calendar promise is made. Council can become usable before Swarm; each mode has its own completion evidence. Do not expose a functioning Swarm control until real worker execution is wired through and tested.

## Engineering questions

- Which capabilities do the installed CLI versions expose for worker sessions, safe scoped writes, cancellation, and exact model reporting? Engineering verifies before enabling.
- Which recorded task-specific evidence can currently inform lead appointment? Use the honest fallback policy where evidence is absent; gather evaluation data for later calibration.
- Which worker contract can both adapters implement without weakening project scoping or cancellation? Native owner and worker owner agree before shared integration.

The two product questions are resolved: one app; an app-appointed lead writes Council's final response.
