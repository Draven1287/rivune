# Sent-draft clear-on-admission acceptance contract

Status: design and acceptance artifact only. No production source, provider, native process, build, or installed app was changed.

Baseline reviewed: `tools/symphony/source-import-candidate` at `5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b`, plus the current workspace controller and host source.

## Current behavior and atomicity finding

The sent draft is **not cleared atomically with request admission today**. In fact, the authoritative persisted draft is not cleared at all.

The current durable sequence is:

1. The controller saves the exact composer text as the conversation draft and receives a rich-draft revision.
2. The host persists a recovery reservation for the request ID and conversation ID.
3. The host verifies the submitted prompt against the saved revision when the rich draft is bound, appends the admitted run to a workspace candidate, and durably saves that candidate.
4. Provider execution continues under the recovery guard.
5. The controller refreshes the authoritative workspace after an accepted acknowledgement.
6. The recovery reservation is cleared in a later durable save.

The admission save in step 3 appends the run but leaves the conversation draft equal to the sent prompt. The controller then republishes that same persisted prompt. Draft save, recovery reservation, run admission, and recovery clear are separate durable saves; there is no durable run-plus-draft-clear transaction.

A renderer-only clear is unacceptable. It can lose recovery after a crash, be overwritten by the next authoritative refresh, or erase text the user typed while the request was in flight.

## Required invariant

For a newly admitted request, one host workspace candidate and one durable save must perform both of these mutations:

- append the exact `RunRecord` for the admitted request; and
- clear the text of the exact matching conversation draft and advance its rich-draft revision.

The admission mutation must be conditional on all of the following matching the admitted request:

- request ID is new or is being reconciled idempotently;
- conversation ID;
- submitted prompt text;
- submitted rich-draft revision;
- conversation remains editable under the existing host rules.

The same durable state must never contain only one side of the admission mutation. After a crash or lost acknowledgement, authoritative storage may show either:

- no admitted run and the saved prompt still present; or
- the exact admitted run and that conversation's draft text cleared.

It must never show the exact new run with the old sent text still in its draft as the result of successful admission, and it must never clear the draft without the exact run being admitted.

An idempotent replay of the same request ID must not append another run, clear another draft, or advance the draft revision again.

## Preserved rich-draft state

This bounded change clears only the sent text. It preserves the conversation's selected context, team selection, attachment IDs, project association, read-only state, and other rich-draft metadata. The admitted run already freezes the request inputs it needs. Attachment cleanup after send is a separate product decision and must not be smuggled into this fix.

## Renderer adoption rule

The controller must capture the local draft text and a local edit generation immediately before sending. After an accepted admission or reconciliation, it must refresh the authoritative snapshot and observe the exact admitted run plus the host's advanced blank draft.

It may replace the visible composer with the authoritative blank only when the current local edit generation and text still equal the captured sent version. If the user typed or replaced text after send began, the controller must retain that newer local text as dirty, rebase it on the host's advanced revision, and allow the next explicit save to persist it.

The same rule applies to normal acknowledgement, uncertain-result reconciliation, lost-reply recovery, conversation switching, and restart. Acceptance must come from authoritative host state for the exact request ID. A transport acknowledgement alone must never clear text.

## Acceptance cases

The machine-readable cases are in `timeline-cases.json`.

1. **Accepted, same draft:** admission atomically appends the run and clears the matching draft; unchanged local text becomes blank after refresh.
2. **Newer edited draft:** admission clears the persisted sent text, while a newer local edit remains visible and dirty on the new host revision.
3. **Uncertain admission:** pending state remains until authoritative reconciliation distinguishes no admission from exact admission; no speculative clear occurs.
4. **Rejected request:** no run is appended and the saved prompt remains recoverable.
5. **Lost reply, then reconcile:** an already committed run-plus-clear is discovered by request ID; no replay and no second revision bump occurs.
6. **Switch conversation:** admission targets `request.conversationID`, never the currently displayed conversation; unrelated drafts remain unchanged.
7. **Restart:** committed admission and blank draft survive restart; a leftover recovery reservation reconciles idempotently.

## Smallest required source changes

### Host

`prepare_reserved_submission` currently releases the workspace lock before `execute_with_recovery_guard` reacquires it, and `prepare_submission` drops `rich_draft_revision` when it creates the persisted `AdmittedRequest`. A check made only during preparation therefore has a time-of-check/time-of-use gap. Plain-text drafts are also exempt from the current revision-and-prompt check unless attachments, selection, or team make the rich draft "bound."

In `src-tauri/src/host.rs`, carry an internal, non-persisted draft-admission guard from preparation into execution. It should contain the request conversation ID, prompt, and required rich-draft revision. Revalidate that guard under the same workspace lock used to build and save the admission candidate. Extend that same candidate mutation so it also:

1. locates the request's conversation by `conversation_id`;
2. verifies the submitted prompt and `rich_draft_revision` against that conversation;
3. clears only the conversation draft text;
4. increments the rich-draft revision exactly once; and
5. persists the run and cleared draft in the existing single candidate save.

Require the revision-and-prompt match for every newly submitted draft, including plain text. Do not attach this clear guard to `retry_run` or invocation retry: those reuse a prior admitted request and must not clear whatever the user is currently composing. Keep duplicate-request handling ahead of mutation so reconciliation is idempotent. Add host tests for successful atomic admission, pre-save rejection, post-save uncertainty, duplicate replay, wrong revision, wrong conversation, retry isolation, and preservation of non-text rich-draft fields.

### Controller

In `prototypes/ai-native-workspace/src/host/workspaceController.ts`, use the existing `editVersions` map as a local edit-generation fence around `send()` and `reconcilePending()`. Capture the generation together with the draft before the asynchronous save begins. After authoritative refresh, adopt the blank host draft only when the local composer still matches the captured sent version and generation. Otherwise retain the newer local text as dirty against the new authoritative revision.

Do not clear before host admission and do not restore the pre-send prompt after an accepted refresh. The external submit request, recovery-journal schema, and bridge acknowledgement do not need expansion for the smallest fix: the submit request already carries the draft revision, the existing request ID and conversation ID identify the admitted run, and the refreshed snapshot carries authoritative draft text and revision. The new admission guard is an internal host value because `AdmittedRequest` is persisted and reused by retries.

### Verification

Add mounted controller cases matching all seven timelines, including a second-controller conversation switch and a restart with an uncleared reservation. Existing configuration-save behavior must continue to preserve draft text and attachment IDs. Provider execution is unnecessary for these admission tests; use the existing synthetic host boundary.

## Release gate

This contract is accepted only when host tests prove the atomic persisted mutation and mounted controller tests prove the local edit fence. A visual blank composer alone, a successful provider response, or a renderer-only test is insufficient evidence.
