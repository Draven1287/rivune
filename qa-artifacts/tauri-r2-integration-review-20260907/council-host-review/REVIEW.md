# Frozen Council host review

Disposition: two actionable source-traced findings. Six hashes in r5-model-catalog/constellation-review-snapshot-v1/HASHES.json independently verified. Canonical requested host/main/acceptance-test hashes also matched. No source edits, Cargo run, app build, launch, native UI, or provider requests performed.

## P1 — checkpoint persistence failures strand workerless runs and completed delivery

host.rs:1254–1261, with save_constellation_checkpoint:1184–1194 and worker removal:1752–1757.

A precommit failure during finalCompleted persistence leaves the preceding durable checkpoint containing the Complete TeamSession and delivery, but the RunRecord still running with answer None. execute_constellation rejects and its caller removes the active cancellation flag. reconcile:1977–2037 does not repair this state because the checkpoint helper never records its terminal persistence prefix on the run. cancel_persisted_constellation:1441–1453 requires failed plus Failed/Uncertain/RecoveryRequired engine state. Reopen converts running to failed, but the restored Complete session still has neither a retryable failed invocation nor permitted cancellation; its completed answer stays inaccessible. Similar checkpoint errors earlier in execution leave running with no worker. The cancellation branch:1219–1237 also discards any save error and returns accepted.

Required: represent checkpoint-save uncertainty/failure as a recoverable state, retain completed outcome/delivery for reconciliation, and finalize a Complete checkpoint without provider redispatch. Do not report durable cancellation when its checkpoint failed. Runtime acceptance should inject precommit and postrename failures before dispatch, after outcome, at finalCompleted, and during cancellation; prove recovery/no duplicate provider call, accurate acknowledgement, and durable reopen.

## P2 — retry command does not bind the failed attempt

host.rs:1518–1530 and RetryConstellationInvocationRequest:703–708; team_strategy.rs:1617–1619.

The command includes requestID and invocationID only. Invocation ID deliberately remains stable while retry changes attemptID. After attempt A fails, retry payload R admits B; if B also fails, replaying the identical R finds B's current failed binding and admits C. Lifecycle registration blocks concurrent repeats, but not delayed delivery after B fails. The caller has not supplied B's failed identity, so the server silently substitutes a newer attempt.

Required: bind the expected failed attemptID or an immutable idempotent retry admission token. Test that replaying the exact original payload after another failure cannot start another provider process, while an explicit retry of the new failed attempt remains possible within budget.

## Qualified positive evidence

Prior route-duplicate P2 is closed at source plus owner-executed regression scope: validate_team_structure:2367–2375 uses provider/model/effort tuple independent of catalog revision. Our authored save/nonmutation/reopen test is included in the owner-reported passing suite; it was not independently rerun here.

Normal dispatch persists the TeamSession dispatched state before run_direct; restored Dispatched becomes Uncertain and is excluded from failed-invocation retry. Routes and admitted inputs are retained for ordinary failed-invocation retry, and generic retry_run rejects Council. Normal final answer assignment is guarded by session.delivery and saved together with finalCompleted. Private constellationSessions are removed from public_snapshot; activity is bounded and uses summaries, and the normalized fixture is not proof of general raw-snapshot privacy. Broader settings path exposure is already explicitly documented and is not raised again as a new finding.

main.rs registers the retry command. The reported 93 library, 2 binary, and 51 Node passes, including the authored acceptance tests, are owner-executed evidence. They do not cover the two failure sequences above. Serial execution and unavailable trusted uncertain-call reconciliation remain explicit scope limitations. No native/live acceptance is granted.
