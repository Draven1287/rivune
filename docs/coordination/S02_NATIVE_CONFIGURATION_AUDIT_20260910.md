# Independent native configuration recovery review

Reviewed frozen isolated repository tools/symphony/source-import-candidate at 94fbdcefe9fcad64d3527bf88e4a24acec84ceb6 against ae27a875aab6bc4d78f05f73e1374d73a5826171. HEAD matched and tracked working tree was clean. Source review only; no product edits, compilation, native launches, providers or publication.

## Result

Bounded source acceptance: no concrete native transition defect found in this delta. This is not packaged runtime or power-loss acceptance.

- reserve/apply/reconcile/acknowledge acquire the same lifecycle mutation lock and workspace mutex. Reservation blocks an unacknowledged operation and active/submission-recovery work. Apply checks those execution fences again.
- Reservation snapshots an immutable intent and increments the persisted sequence with checked_add. Returned successful reservations have passed persistence; failed pre-rename reservations return no usable identity. The sequence is retained after terminal acknowledgement and replacement. This establishes non-reuse for successfully issued IDs within the retained workspace lineage, not after restoring an older backup or an unconfirmed write disappearing in a machine crash.
- Apply requires exact ID and structural equality of the entire intent, including select and original guard. Applied same-ID retries persist the existing snapshot without applying again. Rejected/acknowledged operations are closed; replacement fails the old ID match.
- Current provider/default comparison guards are rechecked before first apply, along with route discovery. The provider change and applied marker are committed together in one candidate snapshot.
- A reserved operation reconciles to rejected before acknowledgement; a delayed apply is then fenced. An applied record reconciles without reapplication. Reconciliation and acknowledgement persist before success is returned.
- Atomic persistence writes a private pending snapshot, syncs the file, renames, then syncs the directory. Pre-rename errors preserve old memory; post-rename errors adopt the visible candidate but return an uncertainty error. Reconciliation re-establishes persistence. Reopen reads the latest committed snapshot and validates the operation/sequence binding, ignoring abandoned pending files.
- Legacy configure_provider checks the unacknowledged-operation fence under the same locks. Five new commands are registered in main.rs. No additional provider execution is introduced by these transitions.

## Existing synthetic evidence and limits

Inspected all four new native test bodies (host.rs:8832 onward) and the local native.log showing four passing tests. They cover apply acknowledgement loss/reopen, changed-payload rejection, same-ID no-reapply, reserved reopen/rejection, delayed old-ID apply after replacement, pre-rename and post-rename apply faults, reconciliation failure/retry, post-rename reservation failure with removed executable, and mismatched sequence validation.

This review did not rerun a build or reuse an unverified cached executable. The log is builder execution evidence; transition analysis is independently source-reviewed. Existing tests do not directly exercise acknowledgement-write failures, a legacy command invocation while pending, sequence exhaustion, or actual process/power loss at filesystem barriers. Those are evidence limits, not reproduced defects. A small follow-up native test for failed acknowledgement followed by retry/reopen would strengthen coverage without changing the implementation. Frontend display/remount handling belongs to the separate state reviewer.

## Frozen source SHA-256

- host.rs: 66023b90b9a4602d312d6809a8b19dff6685e5b49a8ecfad46d7945c4e3ef102
- main.rs: 63e147e278f094fe7ccdb18b989efd76ac122e8050e3fab645601e316b9e011c

Paths above are under qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src in the isolated repository.

## Final targeted addendum — terminal acknowledgement faults

Accepted frozen dd9cfedd6130c4704e5addeb28307a12b20c341f against 94fbdcefe9fcad64d3527bf88e4a24acec84ceb6. Independently inspected the complete Git delta: one host.rs change, 55 added lines inside the existing test module; no production changes. HEAD matched and tracked working tree was clean. Frozen host.rs SHA-256: 9018d2007f63b7f11614152fe2fcc39c3c1dc845bc4231c9fc2e40e3cb2a2a0d.

The actual nested loops execute eight combinations: applied/rejected terminal state × AfterSync/AfterRename fault × retry in existing/reopened host. Each case asserts failed acknowledgement returns an error, original ID and terminal state survive, and acknowledgement visibility matches the rename boundary. Unacknowledged cases block reservation. Delayed apply either reconfirms the already-applied record without entering application (panic closure) or rejects the closed operation. Explicit acknowledgement retry succeeds, subsequent reopen retains acknowledgement and byte-equal provider/default/conversation data, a fresh reservation gets a different ID, and the replaced ID cannot apply. An initial assertion also rejects acknowledgement of a still-reserved operation.

Inspected retained qa-artifacts/s02-terminal-ack-20260910/native.log: the named test passed, zero failures, 137 filtered tests. This is one test containing eight cases, not eight separately reported tests. Execution is builder-log evidence; assertions/delta independently reviewed without rerunning compilation or a cached executable.

This closes the specific acknowledgement-write failure/retry/reopen coverage gap from the original review. No concrete defect found; this bounded native source slice is complete. No further tests requested. Matched-runtime, real-provider and end-to-end restart dependencies in S02_EXECUTION_DEPENDENCIES_20260910.md remain; installation, native launch, publication and whole-build acceptance are not granted. Private artifact forwarding hold preserved; this addendum remains local.
