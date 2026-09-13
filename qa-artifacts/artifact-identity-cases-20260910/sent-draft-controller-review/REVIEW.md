# Sent draft controller — independent review

**Bounded PASS.** No actionable defect found in the reviewed controller delta and targeted synthetic timelines. Native admission atomicity and durable persistence belong to the separate host review. This does not establish mounted React, browser, or native UI behavior.

## Identity

Captured actual controller SHA-256: `21b1845891ab840d78aabc3059ceced5eadf70306b54b04e4a5d1ca5b20d81e5`.

Captured owner test file SHA-256: `747790c7a8da53b9e5edd7673792dfd9980d9b029f4d892d948cbffb752d0a97`.

Both match `qa-artifacts/sent-draft-implementation-20260910/source-hashes.json`. The actual controller and its runtime imports are copied under `snapshot/`; [hashes.json](hashes.json) records their identities. Review used the implementation receipt and scoped patch. Acceptance applies to these captured bytes.

## Findings

Send captures text and edit generation before awaiting draft save. The sent-version record then binds the generated request ID, original conversation, exact prompt, generation, and saved revision. Refresh clears the local sent text only when the authoritative snapshot contains that request/conversation/prompt and a blank draft at least one revision beyond the saved draft. An acknowledgement or event alone cannot clear it.

A newer local edit, including text changed away and back to the sent value, remains dirty when admission appears; its save base advances to the authoritative blank revision. The save acknowledgement's separate generation comparison also prevents an in-flight save from marking newer identical text clean. Distinct edits are retained as well. Rejection removes the sent fence without clearing the draft; unresolved outcomes retain the request identity. Polling and reconciliation share the snapshot rule.

The fence is in memory. A newly started controller hydrates the stored host draft and reconciles the journal rather than reconstructing a sent generation or resubmitting. This establishes controller behavior with supplied snapshots, not actual disk persistence. The owner switch scenario changes host active-conversation selection and starts another controller; it is not a mounted navigation test.

## Executed verification

Twelve independently authored tests passed against the captured actual controller:

- Distinct and ABA edits while the pre-submit save is blocked; retained text survives refresh and its next save uses the advanced admission revision.
- Distinct and ABA edits before a late save acknowledgement; a later remote revision does not overwrite them and explicit save reports the conflict.
- Missing run, wrong request, wrong prompt, nonblank host draft, and unadvanced revision cannot clear sent text; a subsequent qualifying snapshot does.
- Same request on another conversation cannot clear the original draft.
- Actual controller polling observes admission and clears before an outstanding submit reply completes.
- A mismatched mutation acknowledgement neither submits nor clears local text.

Eight selected owner timeline tests also passed: accepted, newer ABA, newer distinct, uncertain, rejected, lost reply, switched conversation, and restart. These are started real-controller instances with synthetic bridge/journal implementations. No React mounting is involved.

Evidence: [reviewer tests](snapshot/tests/reviewer.test.mjs), [reviewer log](reviewer-tests.log), and [owner timeline log](owner-timelines.log). Commands used Node's `--experimental-strip-types --test`; the owner run was filtered to `sent draft admission timeline:`. No unrelated suites were run.

Only local review evidence was written. No production or candidate source edits, browser/native execution, providers, builds, publication, or Git mutations occurred.
