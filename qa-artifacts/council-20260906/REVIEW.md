# Council live acceptance — September 6, 2026

Execution build: installed native Rivune0.2(2026090614). All three tasks were submitted through native UI using existing authenticated Codex CLI and Claude Code CLI. No tools, files, purchases, or publication were enabled for the model sessions. Independent request-body isolation is verified by recording-transport tests; the actual frozen contexts and original drafts/results/lead policies are retained in each JSON journal receipt. CLI resolved model identity and usage/cost remain unknown. Requested Codex model was gpt-5.6-sol/high; Claude used account default/automatic.

| Task | Run | Elapsed | Lead | Runtime result |
|---|---|---:|---|---|
| Code review | 7211B4E0-307E-4B02-B4E4-236202C9CA5C |35.3s|ChatGPT|2 drafts and lead final, complete|
| Explanation | CD4A9DC8-2ECE-4551-AA82-5D24F0D5501A |38.0s|ChatGPT|2 drafts and lead final, complete|
| Decision | 54B0CFEE-872F-423C-89F9-2297243D68AC |119.3s|Claude|2 drafts and lead final, complete|

The native UI showed actual Answering/Reviewing/Complete states, final answers first, independent drafts and lead rationale under Council disclosure. Lead policy explicitly says stable rotation is a fallback, not a quality ranking. Both vendor lead paths executed across the tasks. All three frozen contexts belong to fresh conversations; switching conversations did not interrupt the run. Original Together history remains separate.

## Quality review — not an all-pass claim

Code review correctly identifies the dropped-zero and empty/all-missing division defects and provides the correct None-only filter. Suggested tests cover normal, zero, missing and empty cases; it explicitly says they were not run. The final omitted the acceptance matrix's mixed-positive/negative case. After completion, the Codex reviewer extracted the exact generated Python (code-review-generated.py), inspected it and executed its six test functions plus an additional average([-2,0,2,None])==0 test. All seven passed. This external reviewer execution is recorded in code-review-test-receipt.json and is not Council tool-use evidence.

Explanation is364words, distinguishes model/account/CLI/app with a fictional provider and describes a valid CLI request/response path plus readiness failures. It avoids real subscription claims. Qualification: its Rivune definition says it depends on CLI, omitting the app's supported API paths; it is accurate for this Council version's CLI route but too narrow as a general app description.

Decision respects the8-hour budget,12-seat limit and20interested readers, labels most resource assumptions, supplies a six-week schedule, measurements and switching conditions. However, it asserts the first quarterly event would be aroundweek12 and therefore no contact is possible in sixweeks. That does not follow from quarterly cadence: the first event could be scheduled sooner. The lead repeats an unsupported premise despite the supplied-facts-only instruction. The answer therefore fails the complete grounding criterion. Its preference thresholds and volunteer estimates are mostly explicitly labeled assumptions/estimates.

These runs establish operational Council behavior, not universal answer reliability or superiority over a single model. No pilot or controlled baseline comparison ran. No live fallback, partial retry or cancellation exercise was added; those paths have deterministic transport/coordinator coverage only. No Council website artifact task ran; the canonical artifact viewer is reused and tested separately. Swarm remains unavailable.

## Rendered issue found

Decision screenshot exposed literal## above Recommendation. Original model output is validMarkdown. Existing normalizeSectionBreaks guessed a section boundary inside a real Markdown heading. The615 source correction restricts that legacy heuristic to single-line unformatted prose and adds a heading/code preservation regression test. Final615 render verification is pending at time of this entry. The Council runner itself is unchanged between614and615.

Final615verification: installed native app relaunched, restored the saved decision, and rendered Recommendation as a proper heading without literal##. Screenshot decision-fixed-0615.png. All three Council run records are byte-content-equivalent after relaunch, with final hashes in relaunch-verification.json.243/243native tests pass. No new live provider calls were needed for this rendering-only correction.
