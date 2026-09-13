# Council grounding review — September 6, 2026

Evaluation plan frozen before implementation or new model calls: frozen-tasks.json SHA25675321f53433cef2d5b6c41b26eb6a80c91c7d71479c7e007437f3bd68c524151. Two new tasks cover finite-resource feasibility and causal inference/output length; the third is the exact original decision prompt. Only prompt fields are sent to providers. Rubrics are withheld and unchanged. Scope: exactly three new Council runs through existing CLI routes.

Review build0.2(2026090616), optional saved reviewPolicyVersion=council-grounding-v2. Changes only the lead's general instruction to independently check supplied facts and constraints, distinguish assumptions, reject unsupported premises even when drafts agree, and preserve requested limits. No expected answers or calendar-specific fixes appear in production instructions. Independent drafting, lead selection, model configuration, route execution, and limits are unchanged.

246/246macOS tests pass,0failures/skips: /private/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_19-45-07--0600.xcresult. New boundary tests preserve exact JSON fields/drafts despite marker-like quoted content, reject oversized context before any provider call, and preserve full oversized drafts without synthesis or truncation. Native universal Release build/deepstrictad-hoc signature pass. Installed executableSHA25628b5178c889422595983ad913cce507c2f828bf8ee618e9a0c10d4d7434ca412. Frozen71nativeinputs and installationreceipt /private/tmp/rivune-review-2026090616.615rollback retained there. No public release, authentication, Swarm, cloud or permission changes.

Live results pending.

## Actual results

Exactly three new runs completed, each with both independent drafts and a separate lead response, all on616. Only frozen prompts were submitted, each in a fresh conversation with no previous-message context. All three selected Claude through the unchanged run-ID rotation policy; this is not evidence of a quality ranking. Requested Codex model/effort remained gpt-5.6-sol/high; Claude account default/automatic. Resolved model, token usage and cost remain unknown.

| Task | Run | Latency | Runtime | Full-quality acceptance |
|---|---|---:|---|---|
| Resource plan |2059D72D-3DCD-449E-960F-16113E5AB6E6|109.0s|Complete,2drafts+lead|Not passed: unsupported future guarantee|
| Evidence decision |CF599C26-1BD3-4316-A7A6-801F370344B8|54.8s|Complete,2drafts+lead|Not passed: output limit and unsupported sample-size certainty|
| Original decision |2A6A5E4F-D5E6-4132-B31D-1989CDEE773A|98.2s|Complete,2drafts+lead|Not passed: timing premise persists|

### Resource plan

Task coverage: correctly derives18maximumhands-on completions from18nonreusablekits; accounts for the6remainingregistrants distinctly; proposes9hands-on+3observers perroom,1volunteer perroom,45minutes inparallel and check-in/cleanup within90minutes. Advance disclosure, voluntary deferral, random allocation and standby order are clearly proposed. The lead correctly rejects a draft's assertion that a12/6hands-on split necessarily strands observers:12hands-on inone room and6hands-on+6observers intheother is feasible.

Remaining unsupported premises: it offers a guaranteed future slot and confirmation before departure, although no future event, funding or kit supply is established. It also treats an opened kit for a no-show as permanently lost, which does not follow simply from a consumed-kit-per-participant rule. The18count is explicitly conditioned on attendance, but later says records “must say18” without retaining that condition. Thus core feasibility passes; complete assumption discipline does not. Fullresponse1064whitespacewords; no length limit was requested for this task.

### Evidence decision

Task coverage: correctly reports9/12=75% vs7/12≈58.3%, a2-reader/~16.7percentagepoint difference; rejects causalattribution; names nonrandomassignment, neighborhoodconfounding and unknownbaselines; proposes randomassignmentwithin neighborhoods, consistentoutcome/period, and intention-to-treat analysis, clearly as futurework. No actualexperiment/testexecution is claimed. It removes a draft's invented “returned a day earlier” premise and declines a specific several-hundredsample recommendation with no power calculation.

Remaining failures: finalresponse is495whitespacewords includingreview, exceeding the frozen250word complete-response limit. The answer labels its main note225words but appends a long review note. It replaces the unsupported specific sample target with categorical “twelve cannot resolve a difference this size” and “far more than twelve,” still without specifying a precision/power target. The shortfall is not fixed by reporting that both drafts agree. Causal distinction passes; overall constrained-output acceptance fails.

### Unchanged original decision

Task coverage: proposes a six-week video pilot with5sessions after setup; retains4volunteers,8combinedhours,20interestedreaders and12seats; supplies hour estimates, metrics and explicit change thresholds; marks freevideo/devices/materials and session-length assumptions. The lead rejects a draft's in-person trial because venuecost/availability were not supplied, demonstrating a real useful review action.

Remaining unsupported premises: the rationale still says quarterly gives “probably zero” because sixweeks is less than a quarter, and the review says “at most one, and zero in practice.” Neither follows from a specified frequency without a firstdate. It also asserts the demandcondition for revisiting a publicevent will not resolve in sixweeks without supporting evidence. Its unconditionalfallback toin-person ifvideofails still lacks a check forvenuecost/availability, despiteflagging that sameomission in the rejectedtrial. It calls hours thebindingconstraint “not money” althoughfreevideocapacity isstill anunverifiedassumption. Originaltimingfailure thereforepersists; no claimthatgrounding isfixed.

## Verification and limits

Original614records and responsecontent remain unchanged inapphistory and qa-artifacts/council-20260906. The frozenevaluationfilehash stillmatches; newrunprompts matchitexactly and no rubric is presentinapprovedcontext. Exact run/turn/participant/lead identities, timings, originaltext and SHA256s are in each JSON and run-summary.json. NativeAX and screenshots confirmedfinishedanswers and properheadingrendering.246/246tests, universalRelease and installedsignature checks pass. No fourthrun, fallbacktrial, modelchange, extraagent/workload or publication occurred.

Outcome: execution3/3; no task passes every quality criterion. The general instruction elicited some explicit corrections but was insufficient for reliablegrounding or whole-response length compliance. These are exploratory observations, not a controlledsingle-model comparison or proof ofimprovement. Next engineering candidates are machine-checkable output-budget enforcement and a separately inspectable premise/constraint review with bounded repair; neither is implemented or verified by thiswork. Swarm andcloudremain unchanged.
