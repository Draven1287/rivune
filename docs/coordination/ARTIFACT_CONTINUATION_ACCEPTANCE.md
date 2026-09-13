# Artifact continuation: next acceptance slice

September 6, 2026. Root product acceptance for AO-05 after build 0619 interface acceptance. This document does not enable any provider or execution mode. Native owner determines implementation ownership at that checkpoint.

## User outcome

From an existing generated-file result, choose **Continue editing these files**, type a change, and receive a revision based on the exact files selected. The composer identifies the attached result and lets the user remove it. Selecting this action prepares context; it does not send a request or write to a project folder.

Ordinary conversation history remains bounded. Increasing its limit alone does not satisfy this slice. Do not silently clip an artifact into invalid partial code, and do not automatically attach all prior files on every chat message.

## Reproduced baseline and constraints

The independent frozen-0618 recording harness used a valid two-file artifact containing 33,001 file bytes. Ordinary history retained no complete file: 20,071 bytes of index.html and all 1,001 bytes of style.css were lost. A newer short exchange could omit the artifact entirely. Direct and Council recording requests accepted the incomplete context; no live providers were used.

Evidence: `docs/coordination/ACCOUNT_OUTPUT_PRODUCT_AUDIT.md` and `/var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/rivune-ao05-frozen0618-8o686lsu/results.json`.

Current entry points have separate budgets: a 16 KiB typed-prompt guard, 20,000-byte encoded document context, bounded conversation history, and provider payload envelopes. The existing manual snapshot puts files into the prompt text, so the larger fixture also exceeds that prompt guard. These are source observations, not permission to increase all budgets globally.

## Required acceptance

1. **Explicit, immutable selection.** Bind the selected source answer/revision and validated relative paths to the draft. Preserve exact file bytes, including Unicode and characters expanded by JSON encoding. An unrelated newer answer must not replace the selected revision.
2. **Complete or blocked before send.** The 33,001-byte two-file fixture must either reach every selected direct/Council request in full or show a specific pre-send size/capability message with an actionable selection choice. Complete support for this fixture is the preferred implementation target; an honest block only closes silent data loss, not the full usability goal. Generic 'shorten your prompt' is insufficient for file-context overflow. No provider call, draft clearing or run creation on failed admission.
3. **Protected through every phase.** Validate the final encoded envelope, not only raw bytes. The selected files must not become shrinkable conversation history during member drafting, manager synthesis, fallback, retry or recovery. Record the frozen selection needed to reproduce a request; avoid duplicate insertion through old history.
4. **Visible and removable.** The composer shows which result/files are included before send, with a remove action. If memory is off, the explicit file attachment still behaves predictably and is explained separately from conversation memory. Do not guess file relevance from a keyword in the user's prompt.
5. **Persistence without surprise.** Selecting another conversation, opening Settings, relaunching and retrying preserve the intended draft/run context. Deleted or missing source data cannot resolve to a different artifact; fail with a useful recovery path. Existing conversations decode without a new required field.
6. **No automatic disk writes or new access.** Generated-result bytes are a proposal. Editing an on-disk project still needs the existing approved snapshot and conflict checks. External changes must not be overwritten by a revision derived from an old generated artifact. Existing path, file-type and size validation remains.
7. **Focused verification.** Use recording transports for direct and Council routes with complete-file sentinels/hashes, boundary/escaped payloads, selected older revision after a newer answer, missing source, restart/draft restoration, and failed admission producing zero calls/mutations. Inspect the actual native composer/result action on an isolated build. Record unsupported routes honestly; no live evaluation or auth is necessary for this engineering acceptance.

## Follow-on scope

Extra-API transcript recovery and parity remain AO-01/AO-05 follow-on work unless deliberately included with separately reviewed ownership. Keep this first correction bounded to supported native main-workspace routes; do not imply it fixes every connection or proves generated-site quality. A new live quality comparison remains a separate evaluation.
