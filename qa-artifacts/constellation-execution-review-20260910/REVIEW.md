# Constellation execution review — 2026-09-10

## Verdict

The current mounted Tauri/React path can run **Council** and return one unified
answer. No missing submission bridge is required for that outcome:

1. A saved team makes the controller submit `mode: "constellation"`.
2. The host freezes routes and identities and starts a Council session.
3. The lead decides the bounded strategy.
4. Every selected member produces an independent answer without seeing peer
   answers.
5. The appointed lead receives the actual independent contributions and saves
   one synthesis as the canonical run answer.
6. The renderer projects only that canonical answer into the conversation;
   member answers remain inspectable supporting evidence.

The partial-failure path also has the necessary recovery semantics: completed
member results survive, no final answer is fabricated, and retry is bound to the
saved request, invocation, and failed attempt.

## Smallest missing change

There is no missing engine change required to produce **one unified Council
result**. The smallest required product change is to make the existing contract
truthful in the interface:

- label the current result **Lead synthesis**, not peer-reviewed or mutually
  checked;
- keep the unified answer primary and place member answers/progress in a
  collapsed evidence panel;
- reserve **Reviewed** for a later explicit review invocation.

This matters because Council currently performs independent contributions and
one lead integration. It does not run a separate peer-review round. The engine
sets Council delivery `reviewed: true` when an `Integrate` contribution exists,
and the UI repeats that as “Host reports a reviewed delivery.” That wording
overstates the executed workflow.

If the intended promise is that agents actually check one another, the next
engine increment is a separate bounded review stage after integration, with a
new call-budget slot and a persisted review receipt. That is a new capability,
not a prerequisite for the already-working unified Council answer.

## Council versus Swarm

- **Council is host-wired:** the host always prepares `manual_strategy:
  Council`, gives every member text/decision capabilities, executes independent
  answers, and asks the appointed lead to integrate them.
- **Swarm exists only in the generic strategy engine:** it has scoped workers,
  dependency handling, artifact integration, and a separate lead review.
- **Swarm is not admitted by the current host:** Constellation preparation has
  no scope grants, no worker/artifact-review capabilities, and no strategy
  selector. The current UI correctly says Swarm is unavailable.

## Exact source evidence

- `prototypes/ai-native-workspace/src/host/workspaceController.ts:270-297` —
  saved teams select Constellation admission; durable request identity precedes
  submission.
- `prototypes/ai-native-workspace/src/host/HostWorkspace.tsx:133-153` — the
  canonical answer is primary; Constellation evidence and exact retry controls
  are subordinate.
- `prototypes/ai-native-workspace/src/host/Constellation.tsx:38-60` — current
  supporting-evidence UI and the overbroad reviewed label.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:3046-3114`
  — frozen team-to-route preparation, Council selection, concurrency, and call
  budget.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/team_strategy.rs:2019-2077`
  — independent contributions followed by one appointed-lead integration.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:1445-1602`
  — parallel member dispatch, outcome recording, checkpointing, and retained
  partial work.
- `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:3747-3818`
  — public member-result, resolution, and exact failed-invocation projection.

## Runnable synthetic acceptance fixture

Run from the repository root:

```sh
node --test qa-artifacts/constellation-execution-review-20260910/constellation-public-acceptance.test.mjs
```

The fixture imports the production public-contract parser and conversation
projection. It makes no provider calls and writes no production state. It proves
two public outcomes:

1. success exposes two member contributions but projects exactly one assistant
   answer;
2. partial failure retains the completed contribution and exact retry identity
   while projecting no invented assistant answer.

This is source-level and synthetic execution evidence. It is not proof of a
live provider-backed Council run, packaged-app behavior, or Swarm availability.
