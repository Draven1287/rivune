# AI team evaluation: everyday outcomes

Prepared September 6, 2026. **Prepared only: no evaluations, provider requests, artifact generation or pilot recruitment have run under this plan.** This plan belongs to the one-app direction in `AI_TEAM_DIRECTION.md`; it does not enable Swarm, Auto, new providers or a public release.

## Question to answer

Does a user-selected team produce a more useful result than the same available models working individually, often enough to justify extra waiting and usage? Execution success and more model calls are not quality evidence. We will evaluate the orchestrator's final answer or integrated deliverable, not just the best intermediate contribution. Member drafts remain available for a separate diagnosis after blinded scoring.

The previous `qa-artifacts/council-grounding-20260906/REVIEW.md` reports three completed Council workflows but zero complete-quality passes, including unsupported scheduling/resource assumptions and an appended review that exceeded a full-response word limit. Those originals, frozen prompts, rubrics, outputs and hashes remain unchanged. This new task set is not a disguised rerun or evidence that those failures were fixed. The cases are diagnostic examples, not a representative benchmark of every task.

## Files and separation

All paths below are relative to the repository root:

- `qa-artifacts/team-evaluation-plan/prompts.json`: eight task payloads; only the exact `prompt` string and its empty attachment list may reach a model.
- `qa-artifacts/team-evaluation-plan/rubrics.private.json`: task-specific expected outcomes and critical failures, withheld from execution. The `.private` name is an instruction, not an access-control mechanism or a statement that it is ignored by Git.
- `qa-artifacts/team-evaluation-plan/run-receipt.template.json`: empty recording schema; nulls are not measurements.
- `qa-artifacts/team-evaluation-plan/manifest.json`: file hashes and exact prompt-string hashes.
- `qa-artifacts/team-evaluation-plan/validate_plan.py`: local static validation only; it makes no model, network or UI calls.

For an actual run, give the model only a copied prompt in a fresh conversation. Do not attach the plan, manifest, rubrics, baseline answers, evaluator notes, prior history or this repository as project context. A tool-enabled worker must use a new task-specific workspace containing only the permitted input and output area, without evaluator files. Before a live run, inspect the recorded context and tool scope to establish that this separation is real; if it cannot be established, mark the trial contaminated and do not use it for comparisons. Hash matching alone does not prove absence of leaked context.

The prompts and rubrics are frozen as version 1 by the manifest. Revisions require a new version with an explanation before any subsequent trials; never edit a rubric to make an observed response pass.

## Eight realistic tasks

| ID | Situation | Primary quality question | Mechanical checks |
| --- | --- | --- | --- |
| T01 | Reading-group format decision | Handles access constraints and unknown event timing without inventing certainty | Whole-response length; stated budget/time bounds |
| T02 | Laptop choice using supplied fictional offers | Explains a justified tradeoff and distinguishes advertised from usable storage | All-in arithmetic; length |
| T03 | Library reminder results | Separates observation from causation; proposes an honest next test | Rates/difference; strict word maximum |
| T04 | Family welcome email | Ready-to-use, warm, complete writing without invented amenities | Required facts; full email length |
| T05 | Supervised craft session | Actually feasible allocation of people, tools, rooms and time | Timeline, capacity, continuous supervision, length |
| T06 | Messy project-note handoff | Distinguishes commitments from proposals; preserves owners and dependencies | Sections, length, location dependency |
| T07 | Picnic CSV and organizer note | A usable non-code deliverable with accurate money calculations | CSV parsing/rows/costs, note length, file identity |
| T08 | Offline seed-swap page | Finished readable artifact, exact facts and functional keyboard use | Two files, no network/JS, responsive and interaction checks |

T01–T06 start as Council tasks. T07/T08 can compare artifacts from single-model and Council paths if those paths support delivery of usable files. Swarm trials are a later matched extension only after real worker execution qualifies. Unsupported execution or artifact delivery is recorded as unsupported, not silently replaced by raw text or a different workflow. The prompt does not predetermine how the orchestrator splits work; actual assignments and integration are recorded. A text-only proposal is not a Swarm worker execution.

## Bounded comparison protocol

1. **Qualify engineering first.** Independently test same-CLI member identity, frozen model/effort replay, selected orchestrator, explicit fallback, cancellation, no silent unsupported options and intact legacy records using recording transports. An app build and UI usable for the selected configuration must exist. No runtime fixture may be scored as a real provider result.
2. **Freeze the configuration.** Start with two supported, executable member configurations A and B. Save stable member IDs, exact route tuples, requested model/effort, available resolved metadata, A as selected orchestrator, stop-on-orchestrator-failure policy, the installed build and prompt hashes. Choose A before results, using the user's preference or a documented selection rule; never choose the stronger baseline afterward. The two configurations can share a CLI when supported, but shared-account capacity and local concurrency are recorded.
3. **Initial batch: T01, T03, T04 and T07.** For each task run A alone, B alone and Council A+B with A orchestrating. That is exactly 12 logical runs. Nominally this uses 20 model requests: eight single-model calls plus four Council runs with two independent drafts and one synthesis. Permit at most one existing bounded length repair for each Council run, for a ceiling of 24 requests. No automatic task retries, additional quality repairs, fallback, team growth or exploratory calls in this batch. Stop and report provider/access failures; retained failed outputs count in the operational record. This plan prepares the batch; it does not itself dispatch it.
4. **Match conditions.** All variants receive the exact prompt and approved context, supported artifact permissions, output handling and chosen model/effort. Use separate fresh conversations. A baseline is the standalone A or B answer without peer outputs or Council synthesis instructions; this compares the actual single-model product path against the Council product path, not equal compute. Record any unavoidable wrapper difference. Use the same overall time cap of five minutes for each text trial and ten minutes for each artifact trial, including queue/repair. Stop/cancel on the cap only through verified cancellation. Never assume a timed-out worker has stopped.
5. **Preassign order.** Before sending, use a saved seed (for example 20260906) to shuffle task order and rotate A/B/Council positions within each task. Save the execution schedule and blind-label mapping in evaluator-only storage. Execute runs sequentially, respecting provider/shared-account capacity and the native UI owner's work. Do not run several trials concurrently to hide queue time or rate-limit failures.
6. **No silent replacements.** A rate limit, timeout, cancellation, lost artifact, unexpected route or failed correction is recorded against the assigned attempt. Unknown resolved metadata stays unknown. If a provider/build change is needed, stop that batch; start a separately identified matched block with the changed conditions. Do not cherry-pick best-of retries.
7. **Score before decoding.** Collect original outputs and exact artifacts, assign random neutral labels, and give reviewers task, rubric and candidate deliverables without route, mode, latency or contribution labels. Keep full model text intact: if it self-identifies, flag imperfect blinding rather than editing substantive content. Preserve a private mapping and score timestamps. Do not use participating models as the sole judges.
8. **Expansion requires a checkpoint.** If the first batch is technically valid and informative, run T02/T05/T06/T08 under the same predeclared three variants: another 12 logical runs, 24-request ceiling. There is no automatic expansion. Three-member teams, a smaller orchestrator, adaptive routing and repeated-seed trials are separate experiments; do not change several variables in this initial comparison.

The selected A baseline is the primary paired comparison. B is a secondary comparison showing whether a different individual already does better. Report Council versus each independently. A post hoc best-of-A/B statistic is optional and explicitly labeled an oracle comparison that costs two runs; it is not the user's actual baseline. One sample per task cannot establish repeatability or model-wide superiority.

For later Swarm evaluation, use T07/T08 with the same chosen A baseline, frozen team and tool permissions. Require real member tasks, distinct parent/worker identities, explicit dependencies/owned artifacts, bounded execution, integration and exact saved output. Begin with no more than two concurrent workers, six tasks, delegation depth one and one repair per task, further restricted by verified adapter capability. Record the resulting actual call count; a parent model call is not a reliable unit of hidden native subagent work. Do not label unsupported native delegation as available or compare a tool-enabled Swarm with a tool-disabled baseline without prominently recording the confound.

## Scoring and failure rules

Mechanical compliance is separate from semantic quality. Count whitespace-delimited words across all visible answer text, including headings, subject line and appended review notes; an artifact-specific limit applies to the named artifact. “Under N” requires fewer than N; “at most N” permits N. Separately record useful content, empty/invalid output and artifact usability: a one-word error can meet a length limit while failing the task. Numeric/factual required-item checks may need a human to locate prose, but the underlying facts and arithmetic are fixed.

A task's mechanical result is passed, failed, unsupported or uncheckable, with observed value and evidence. For browser artifacts, save the tested viewport size, screenshot, local resource/DOM evidence and keyboard observations. A DOM assertion alone does not establish visual quality or accessibility. Do not claim a complete accessibility audit from these checks.

Two independent human reviewers, blind where possible, each score four dimensions from 0 to 4: correctness/grounding, requirement coverage, practical usefulness and clarity. Shared anchors: 0 unusable/contradictory, 1 major repair needed, 2 partly usable with material changes, 3 usable with minor edits, 4 fully satisfies this dimension. Total is 0–16. A disagreement of two or more points on a dimension or a critical-failure disagreement triggers evidence-based adjudication; retain both originals and the adjudication. With only one reviewer, label results preliminary and potentially biased.

Critical failures include invented material commitments/evidence, consequential wrong arithmetic, infeasible required allocation, missing/corrupt files, external actions outside scope, or a changed provider/configuration hidden from the user. Record every task-specific critical failure in the withheld rubric. A full-quality pass requires all mandatory mechanical checks, no critical failure, and at least 3/4 on every quality dimension. A weighted score cannot erase a critical failure. Higher polish is not a substitute for accurate grounded content.

Inspect drafts only after final-answer scoring to categorize: error introduced by synthesis, error inherited from a draft, useful correction, or information omitted. This diagnostic step is not an additional independent evaluation or a reason to rewrite scores without recorded evidence.

## Receipts, reporting and pilot hypotheses

Every attempt records the schema fields in the receipt template plus output/artifact paths and hashes. Record workflow, selected and actual orchestrator, member IDs versus route references, model/effort requests, resolved metadata and evidence, account-default uncertainty, fallback, all draft/synthesis/repair/worker calls, errors, final status, timestamps and wall time including queue/repair. Persist full failed and pre-repair outputs. Token counts/costs/quota percentages are null unless a supported interface actually supplies them; identify scope and source. Never report null as zero or infer cost from a consumer subscription. Report call count and elapsed time even when usage is unavailable.

Publishable internal report format: one row per task/variant with mechanical result, four quality scores, critical failures, completion status, latency, actual call count, measured usage or “unknown,” and evidence link. Summarize paired wins/ties/losses for quality and first-attempt usable completion, median latency and range; include all attempts and every failure. Report request totals and missing observations. Avoid significance/superiority claims from eight handpicked tasks.

Suggested development checkpoint, **a hypothesis rather than a release gate or proven demand**: on all eight tasks, Council has zero critical factual/artifact failures, passes every mandatory mechanical requirement, is judged preferable to A on at least five tasks, and has no worse first-attempt usable completion than A. Two unambiguous regressions on the same failure class warrant fixing that class before adding more members. Latency must be shown alongside improvement; ask users whether the wait was worth it rather than inventing a universal acceptable ratio.

Then a separate five-person usability pilot can test the existing discovery hypotheses: at least four complete a real task and at least three return within a week. Add whether each person understands their orchestrator/team and can find/save the result unaided, plus willingness to wait for Council on that task. Recruitment, consent and any logging/telemetry are separate work; this plan sends no invitations and adds no tracking. Those tiny samples guide iteration, not marketing claims or market validation.

## Next executable check

Run `python3 qa-artifacts/team-evaluation-plan/validate_plan.py`. It verifies the eight task IDs, prompt/rubric separation, empty attachments, template state and frozen hashes. It does **not** execute models or score answers. Next, the app owner should qualify the chosen team using recording transports and preserve evidence. Only after readiness and an explicit bounded evaluation dispatch should an evaluator prepare the isolated prompt inputs and 12-run initial schedule.

## Local candidate checker: implemented scope

`qa-artifacts/team-evaluation-plan/check_candidate.py` is a dependency-free Python CLI for explicit candidate files. It pins version-1 prompt/rubric hashes, checks the existing manifest against those pins, and refuses a changed version. It reads no app history, provider configuration or credentials, performs no network/model calls, and never modifies candidate bytes. JSON goes to standard output; capture it separately from candidate paths. Files are UTF-8 (an optional BOM is accepted), bounded at 2 MiB; oversized inputs are uncheckable rather than truncated. File hashes identify the bytes inspected, not a provider run or app save-verification receipt.

Examples (replace candidate paths with actual explicit files):

```sh
python3 qa-artifacts/team-evaluation-plan/check_candidate.py --task T03 --answer /absolute/path/to/answer.txt
python3 qa-artifacts/team-evaluation-plan/check_candidate.py --task T07 --csv /absolute/path/to/budget.csv --note /absolute/path/to/organizer-note.md
python3 qa-artifacts/team-evaluation-plan/test_candidate_checker.py
```

For T01–T06 it checks **only the full-file whitespace word limit** plus screening for empty, one-word or recognizable error responses. It does not check those tasks' arithmetic, required facts, feasibility, headings or semantic truth. T03 is strictly below 180 words; other prose limits are inclusive. Appended review text is counted. The error screen recognizes common leading error messages and an error-only JSON envelope; it is a heuristic and cannot recognize all disguised failures or certify useful content. A response can pass length while being rejected by the independent empty/error check.

For T07 it checks exact filenames, strict CSV parsing, exact header/column order, three unique expected item rows, integer quantities, two-decimal numeric cost fields, supplied values, row multiplication and subtotal. Item names are compared case-insensitively after trimming outer whitespace; cost formatting remains strict. Missing, duplicate or malformed rows fail their corresponding checks and leave the task subtotal uncheckable rather than silently summing an incomplete budget.

The organizer note is screened for empty/errors and limited to 120 words. The checker validates the four budget amounts **only when each has one unambiguous recognized label on a line**. Example supported lines:

```text
Subtotal: $120.00
Remaining money: $30.00
Proposed contingency (10% of subtotal): $12.00
Remaining after contingency: $18.00
```

It also records whether literal `10%` occurs. Natural prose, absent/unrecognized labels and repeated labels yield uncheckable amount checks for human review; they are not automatically classified as incorrect. A clear labeled wrong amount fails. This intentionally limited extraction prevents finding an unrelated correct number elsewhere in prose and claiming that the requested calculation passed. No claim about purchases, the meaning of a percentage mention, appearance, review/save byte equality or artifact UX is verified here. T08 still requires separate rendered inspection and is not accepted by this CLI.

Every result includes individual measured/expected values and pass/fail/uncheckable status. `mechanical_result` aggregates only these implemented checks; `semantic_quality` and `overall_correctness` always remain `unverified`. `usable_answer` is `rejected` when a checked requirement fails and otherwise remains `unverified`, never certified by a passing count. Missing/unreadable files fail availability while their dependent word/arithmetic measurements remain uncheckable, not zero. Exit codes are 0 for all implemented checks passing, 1 for a mechanical failure, and 2 for uncheckable results or unsupported/frozen-version errors. Exit 0 does not mean the task's full rubric passed.

Nineteen local synthetic fixture tests passed on September 6. They cover inclusive/strict boundaries, appended text, empty/errors, UTF-8 and missing paths, correct artifacts without semantic certification, wrong totals, duplicate/missing/extra rows, malformed fields/CSV, wrong note values, ambiguous/missing note fields, note overflow, wrong filenames, preserved bytes, and semantically false prose that must remain unverified. These tests are checker validation, not provider evaluation. Original frozen task/rubric files and their manifest entries were not edited.
