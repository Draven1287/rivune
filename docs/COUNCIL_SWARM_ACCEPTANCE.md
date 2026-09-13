# Council and Swarm: acceptance tasks

Prepared September 6, 2026, before the new modes' live evaluation.
Status: test briefs and criteria only; no Council or Swarm passes recorded.
Product contract: [COUNCIL_AND_SWARM.md](COUNCIL_AND_SWARM.md).

## Recording a run

Record app build/source revision, selected mode, immutable run ID, participant adapters and reported model identities, approved context, lead selection policy and reason, start/end times, terminal state, actual usage if available, and artifact hashes. Preserve original outputs and actual test receipts. Unknown model versions, usage, or costs remain unknown.

Evaluate task completion separately from runtime reliability and visual quality. A provider's self-assessment is a review, not proof that a browser or test command ran. Record the relevant command or UI observation for each verification claim.

## Council 1 — constrained decision

Prompt:

> Our fictional volunteer reading club needs a launch plan. We have four volunteers, eight combined volunteer hours a week, no budget, and twenty interested readers. The venue can seat twelve. We can run a monthly in-person group, a weekly video group, or a quarterly public event. Choose a practical first six weeks. Give a brief rationale, a schedule, what we should measure, and the condition that would make you change your recommendation. Use only these facts; label assumptions.

Acceptance:

- At least two independent drafts exist and neither request includes the other's draft.
- The appointed lead sees every successful draft and writes a coherent final recommendation.
- The final plan respects capacity, staffing, time, and budget. It accounts for twenty readers and twelve seats without inventing venue expansion.
- A measurable pilot and a condition for changing direction are present.
- A short review explains useful differences and any unresolved assumptions. Agreement is not claimed when evidence shows disagreement.

## Council 2 — explanation

Prompt:

> Explain to a nontechnical first-time user the difference between an AI model, a provider account, a CLI application, and Rivune. Use a fictional provider so the explanation does not depend on current subscription terms. Show where a prompt goes and where a finished answer returns. Explain why having an account does not automatically mean that every integration is ready. Keep it under 450 words.

Acceptance:

- Independent drafting and lead synthesis are recorded.
- The final answer distinguishes the four concepts and describes the request/response path without implying that Rivune owns the provider account.
- It does not invent API entitlements or current pricing.
- Readiness is explained using configuration, authentication, and actual supported integration behavior.
- Plain language and the word limit are respected.

## Council 3 — code review

Prompt:

> Review this complete Python function. It should return the average of all readings, where zero is a valid reading and None means missing. If there are no readings, it should return None. Identify defects, give a corrected function, and include a small set of tests. Do not claim you ran tests unless a tool actually ran them.
>
> def average(readings):
>     values = [x for x in readings if x]
>     return sum(values) / len(values)

Acceptance:

- The final answer identifies both the dropped-zero defect and division by zero for empty/all-missing input.
- The correction filters only None and returns None when no values remain.
- Examples cover zero, empty input, all missing, and mixed positive/negative values.
- Execution claims match actual receipts; plausible code alone is not a passed execution check.

## Swarm 1 — build a project

Run only after real worker execution, project scoping, and cancellation have passed adapter tests.

Prompt:

> Build a polished static website for a fictional neighborhood repair cafe called Second Saturday. It needs a welcoming home page with the next gathering, a clear list of repairs volunteers can help with, an explanation of how a visit works, an accessible FAQ, and a useful footer. Invent consistent sample details and disclose that they are fictional. No booking or signup backend exists. Use original local artwork, semantic HTML, CSS, and only any JavaScript that a real interaction needs. Make it work at 390px and 1280px. Coordinate complementary agent tasks, integrate the result, run available checks, and provide the website files and a preview. Do not claim visual review until you have rendered it.

Acceptance:

- Two model leaders are represented by actual executions. Their delegated worker tasks have real IDs, parent ownership, workspace scope, status, and outputs.
- Parallel tasks have compatible interfaces and disjoint writes. Every final file is traceable to worker output and integration changes.
- The combined site loads its local assets, has no broken internal links or fake successful form submission, and has one clear primary action.
- Review covers desktop and mobile composition, overflow, text and focus contrast, keyboard navigation, FAQ behavior, meaningful artwork, and consistency of event details.
- The final answer opens the exact preview and shows named files with a reviewed save. Raw manifests and internal coordination are secondary.
- Record which requirements passed, failed, or were not tested. The user can still reject the visual result despite functional passes.

## Swarm 2 — repair without losing work

Use a disposable copy of the first Swarm site's saved output. Introduce two small known defects: one broken section link and one CSS rule that causes overflow at 390px. Record the deliberate fixture diff before running.

Prompt:

> This site's navigation has a broken link and its mobile layout overflows. Find and repair both, preserve the established design and content, have the workers check each other's changes, and show the exact files changed plus the checks that actually ran.

Acceptance:

- Distinct tasks and review are real, not a narrative transcript.
- Both known defects are fixed and rendered/functional checks demonstrate it.
- Unrelated content and files are preserved; ownership or integration conflicts are explicit.
- The final artifact belongs to this repair run and is distinguishable from the earlier version.

## Required failure exercises

Use deterministic fixtures first, then a bounded live cancellation where safe:

1. Council participant fails: keep successful drafts, label partial, and retry only the failed participant.
2. Council lead fails: record an eligible fallback or a recoverable failure; never substitute a draft silently.
3. Cancellation: stop owned work and prevent new worker or synthesis starts; ignore late results.
4. Swarm overlapping writes: detect the conflict before applying to the project.
5. Swarm worker exceeds a limit: record why it stopped and preserve unrelated completed output.
6. Unsupported adapter: show unavailable, without silently running the older Together workflow.
7. Relaunch/history: old Together runs preserve their original meaning; completed Council/Swarm run identity and exact artifacts remain intact.

## Comparing quality

For any superiority claim, run the same prompts and approved context with a single-model baseline. Judge outputs against the prewritten task criteria with mode/provider labels hidden where practical. Report quality, elapsed time, failures, and known usage together. These few acceptance tasks establish functionality and help find defects; they do not establish universal model rankings or that multi-model work is always better.
