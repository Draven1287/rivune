# Artifact retry provenance review — September 10, 2026

**Status:** Implementation handoff; no product source changed  
**Accepted source inspected:** `tools/symphony/source-import-candidate` at commit `5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b`  
**Scope:** Council failed-invocation retry and immutable saved-result identity only. Parser work, managed-file storage faults, provider calls, builds, deployment and UI changes are outside this review.

## Verdict

The earlier `runText` proposal is directionally sound but its `member:<memberID>` locator is not a sufficient provenance key.

The current engine does **not** overwrite a successful contribution during retry. Only a failed invocation is retryable; successful work is retained, the failed pending invocation receives a new `attemptID`, and a later success is appended as a new `Contribution`. A completed final answer is terminal and cannot enter this retry path. Therefore an already-existing member or final text slot is stable under today's engine invariants.

The problem is identity, not an observed text overwrite:

- the public `memberResults` projection removes `invocationID` and `attemptID` and identifies a row only by `memberID`;
- the public activity journal also removes invocation and attempt identity;
- retry keeps the logical `invocationID` but changes `attemptID`;
- a digest cannot distinguish identical text produced by two different attempts; and
- `final` identifies a presentation slot, not the exact successful contribution that produced the delivery.

Consequently, an artifact may use the existing checkpoint/run text as its byte source, but it must resolve that text through an immutable **result revision identity**, never through the current public slot alone.

## What actually changes during a Council retry

| Persisted/checkpoint field | Before retry | Retry admission and execution | Stable or mutable |
|---|---|---|---|
| `FrozenRun`, admitted request, input digest, team and frozen routes | Original admitted values | Reused unchanged | Stable |
| Failed pending invocation `binding.invocationID` | Logical invocation ID | Reused for the retry | Stable |
| Failed pending invocation `binding.attemptID` | Failed attempt ID | Replaced with `invocationID:attempt:<new reserved-call number>` | **Mutates** |
| Failed pending invocation status | `Failed` | `Reserved`, then `Dispatched`; removed after successful outcome | **Mutates** |
| Engine event log | Contains failed outcome under old binding | Appends `Retry(old binding)`, then dispatch/outcome under new binding | Append-only |
| Engine `outcomes` replay state | Contains failed outcome with old attempt | Retains old failure and adds successful outcome with new attempt | Append-only |
| Previously successful sibling contributions | Retained `Contribution { binding, text, artifacts }` | Preserved byte-for-byte | Stable |
| Retried invocation contribution | Absent because the earlier attempt failed | A successful `Contribution` is appended with the new attempt binding | Append-only |
| Integration invocation | Usually absent while a member is failed; may itself be the failed pending invocation | Either newly reserved after all member answers exist, or retried with a new attempt | **Can appear or change attempt** |
| `Session.delivery` | `None` on the failed run | Created only after the exact required success path completes | None-to-value |
| `RunRecord.status` / `error` | `failed` / failure text | Retry admission sets `running` / `None`; terminal persistence sets `completed` or `failed` | **Mutates** |
| `RunRecord.answer` | `None` for a retryable failed Council run | Remains `None` until delivery; then becomes the delivery text | None-to-value |
| Host `RunActivity` | Existing bounded events | Appends retry/start/completion/final events | Append-only but bounded |
| Public `memberResults` | Projection of retained independent contributions | Preserves prior rows and may add the recovered member row | Recomputed view |
| Public `resolution` | Absent without delivery | Appears after Council delivery | Recomputed view |

Source evidence:

- `team_strategy.rs:1443-1452,1591-1624` permits explicit retry only for a failed pending invocation, increments the reserved-call counter, retains `invocationID`, and assigns a new `attemptID`.
- `team_strategy.rs:1626-1683,1868-1921` validates a success, appends a `Contribution` containing the exact binding and text, and removes only the matching pending binding. A success is not converted into a retryable pending call.
- `team_strategy.rs:2021-2079` preserves completed independent answers, fills only missing Council members, and derives Council delivery from the successful `Integrate` contribution.
- `host.rs:1837-1915` admits retry only while the run is `failed`, matches the exact failed invocation and attempt, checkpoints the retried session, then clears the run error while setting it to `running`.
- `host.rs:1259-1317,1400-1426` atomically persists checkpoint changes and writes the final delivery into `RunRecord.answer` only when delivery exists.
- `constellation_projection.rs:77-115` regenerates member rows from successful contributions but exposes only member/provider/role/text/truncation—not the invocation or attempt binding.
- `host.rs:3626-3672` similarly reduces a binding in `RunActivity` to member and role. Its event ID is request plus sequence, not result-attempt identity.
- `constellation_acceptance_tests.rs:69-173,179-270` proves that a failed run has no final answer, restart preserves the checkpoint and admitted request, invalid retry is atomic, prior member-completed activity survives, and cancelled recovery still has no answer.
- `team_strategy.rs:673-709,983-1009` proves that sibling success survives concurrent failure and that retry generates a new attempt ID while retaining the successful contribution.

## Correction to the durable artifact contract

Replace the semantic locator:

```text
resultSlot: final | member:<memberID>
```

with an immutable host-private revision locator:

```text
PersistedResultRevisionV1
  schemaVersion: 1
  resultRevisionID: host-issued immutable ID
  requestID: exact RunRecord.id
  conversationID: exact RunRecord.conversationID
  kind: finalAnswer | memberAnswer
  memberID: frozen member identity, null only where no member binding exists
  role: answer | independentAnswer | integrate | review | directAnswer
  invocationID: exact engine binding when one exists
  attemptID: exact successful attempt binding when one exists
  contentSHA256: digest of the exposed result bytes
  byteLength: exact UTF-8 byte length
  source:
    kind: checkpointContribution | checkpointDelivery | runAnswer
    contributionBinding: exact binding for checkpointContribution
    deliveryBinding: exact producing binding plus delivery digest for checkpointDelivery
  createdAt: host timestamp
```

The public artifact summary can continue to hide `invocationID` and `attemptID`. The private persisted record and inspection resolver must retain and check them.

### Minimal storage strategy

Do not duplicate result text in a second large string for this slice. Keep the accepted checkpoint/run as the byte store, but make the reference exact:

1. **Member answer:** resolve one `Contribution` by the full tuple `requestID + invocationID + attemptID + memberID + independentAnswer`; verify its full, untruncated text length and SHA-256. Never resolve by the public `memberResults` row because that is a bounded presentation projection.
2. **Council final:** resolve the successful `Integrate` contribution by its full binding, require `Session.delivery.text == contribution.text`, require `RunRecord.answer == delivery.text`, and verify the persisted digest. This identifies both the attempt and the final presentation bytes.
3. **Normal engine final:** use the successful `Answer` contribution with the same equality checks.
4. **Direct non-engine final:** use `requestID` as the admitted execution identity plus the final digest; no Constellation attempt binding exists.
5. **Swarm final, when that product mode is admitted later:** bind the exact successful `Review` contribution and persist a delivery digest because the delivered `LeadReview.text` is parsed from, rather than byte-equal to, the whole review contribution. Do not claim this as current Council capability.

An implementation may instead copy immutable result bytes into the result revision record. That is simpler to resolve but duplicates potentially large text. The exact-binding reference above is the smaller V1 and is safe while successful contributions and terminal answers remain immutable.

## Identity rules for retry, identical text and partial/final results

### Same text, different attempts

Content hash is integrity, not identity. Derive or persist `resultRevisionID` from a versioned canonical tuple containing at least:

```text
schemaVersion
requestID
kind
role
memberID-or-null
invocationID-or-null
attemptID-or-null
contentSHA256
```

Two successful attempts with identical UTF-8 bytes therefore have different revision IDs because their `attemptID` values differ. This matters even though today's engine permits only the first successful outcome for one logical invocation: migrations, reconciliation, and later retry policy must not collapse historical executions merely because their text matches.

### Partial member result

A successful independent answer becomes its own immutable `memberAnswer` revision in the same durable candidate that first checkpoints that contribution. It remains visible if another invocation later fails or the run is cancelled. Retry must not update, supersede, relabel or re-time that revision.

The failed attempt does not create a result revision because it has no accepted successful result text. Its failure remains engine/audit provenance, not an artifact.

### Recovered member result

When the retried invocation succeeds, append a new `memberAnswer` revision using the **new** `attemptID`. Do not attach it to the failed attempt merely because `invocationID` is the same. If it is the first success for that admitted member, no supersession link is needed; it fills a previously absent result.

### Final result

Create the final revision only in the atomic persistence candidate that writes `Session.delivery` and `RunRecord.answer`. Its identity must name the exact delivery-producing attempt. It is a separate result from every member answer even when its text happens to equal one member's text.

A failed or cancelled run with no durable delivery has no final revision. A retry that later completes appends the final revision; it does not transform a partial member revision into a final one.

## Builder-owned implementation points

The smallest production change is limited to these seams:

1. Add a private `PersistedResultRevisionV1` collection to the workspace schema and validate it on open.
2. In `save_constellation_checkpoint`, compare the prior and candidate session by full successful contribution binding. For each newly durable independent answer, append exactly one member revision in that same candidate.
3. When terminal delivery is present, derive the exact producing contribution binding, append exactly one final revision, and persist it atomically with `RunRecord.answer`.
4. On retry admission, preserve all result revisions unchanged. Do not generate a revision for the retry event, failed attempt, or a merely reserved/dispatched attempt.
5. Make artifact `runText` storage point to `resultRevisionID`, not `final` or `member:<memberID>`. Inspection resolves the private revision, exact checkpoint contribution/delivery, and digest before returning text.
6. Keep public summaries bounded and omit private bindings. Public artifact identity is `artifactID`/`resultRevisionID`; current `memberResults` remains transcript presentation only.

Do not infer attempt identity from `RunActivity`: its current DTO intentionally omits `invocationID` and `attemptID`, and its bounded event list can discard older entries.

## Focused acceptance evidence the builder must add

1. Fail one Council member after a sibling succeeds. Persist one sibling revision; retry; assert the sibling revision is byte-for-byte unchanged and only the recovered member plus final revisions are appended.
2. Fail integration after both member answers succeed. Retry the same `invocationID`; assert a new `attemptID`, no duplicate member revisions, and a final revision bound to the retried integration attempt.
3. Return identical text from two synthetically distinct successful attempt bindings in a unit fixture. Assert distinct revision IDs despite equal digest and bytes. This is an identity test, not a policy change that permits double success in production.
4. Assert a failed-attempt binding cannot inspect the recovered successful result and a stale attempt cannot be substituted even when the expected digest matches.
5. Cancel after one member success. Assert that member revision survives restart and no final revision exists.
6. Complete a Council run. Assert final revision source binding is the successful `Integrate` contribution, its text equals `Session.delivery.text` and `RunRecord.answer`, and it is distinct from member revisions.
7. Inject a checkpoint-save rejection at member completion and final completion. Assert no result revision appears ahead of the durable contribution/delivery. Reconciliation may produce the same deterministic revision once, never a duplicate.

## Exact next dependency

The **RIVUNE APP BUILDER** must merge the result-revision identity into its current artifact implementation and return a focused diff plus the seven retry/provenance test receipts above. The key review gate is that no production lookup remains keyed only by `memberID`, `final`, display order, current projection, or content hash.

This report does not certify the builder's current in-progress source, the UI, managed files, parser behavior, storage-fault behavior, a build, or a live app. It certifies only the accepted baseline retry semantics and the required immutable identity contract.
