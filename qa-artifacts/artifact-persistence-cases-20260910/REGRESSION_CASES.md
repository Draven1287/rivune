# Artifact persistence and migration regression cases

Status: precisely specified native regression cases; NOT executed tests. No native build, provider, app, real profile or shutdown operation was executed. Captured working host source and existing tests in source-snapshot/ with manifest.json hashes. This is a point-in-time working-source snapshot, not an accepted candidate commit. Production source is builder-owned.

## Actual persistence seams

HostState::open deserializes old profiles using default artifact fields, repairs interrupted runs, calls saved_artifacts::materialize, and writes a new generation only if repaired. HostState::save clones the input, materializes artifacts, calls persist_with_fault, and assigns the enriched candidate only on success. persist_with_fault has AfterWrite, AfterSync and AfterRename faults. finish_execution retains uncertainty in memory; artifacts are not added to that input candidate when save fails. save_constellation_checkpoint retries once, then retains the candidate with a persistence error. Use fail_checkpoint_saves(event_kind, fault, 2) to reach that failure branch. One injected fault alone can be recovered internally.

Implement cases in a snapshot-only copy of the host test module using the existing saved_artifact_tests.rs helpers profile(), run(), council(), complete(), success(), query(). Profiles must be fresh synthetic directories owned by each test. None of these helpers should spawn the fixture executable: drive finish_execution and checkpoint persistence directly. Read raw committed snapshot JSON in addition to in-memory artifacts. Ignore .pending as committed data. Drop host before opening a second host against the same synthetic profile.

## Cases and exact assertions

### P01 — old-profile migration repeated opens

Create a completed direct run and Council checkpoint with retained independent results using existing helpers. Write generation 1, explicitly remove artifacts and artifactSchemaVersion from its serialized JSON, as the current migration test does. Include a cancelled direct run with no final answer. Record draft, bindings, run answers, providers and checkpoint bytes. Open, capture complete artifact vector and committed generation names; drop/open twice. Assert complete vector equality, no new generations on clean subsequent opens, schema migration recorded, original non-artifact data preserved, and no cancelled final. Existing test proves one direct artifact remains equal after one reopen; this adds no-op write/idempotency and multi-result migration coverage, not identity parsing.

### P02 — migration interruption matrix

For each AfterWrite/AfterSync/AfterRename, start from the old generation above. Deserialize it, call materialize on a clone, then persist_with_fault(profile, migrated_clone, next_generation, fault). Assert error. Drop all handles and call real HostState::open. For pre-rename faults, old generation remains authoritative until open performs migration; for post-rename, the committed enriched snapshot is authoritative. Assert one resulting artifact vector, no duplicates, unchanged draft/run/provider data, and a second open causes no further migration. IMPORTANT: this directly executes the migration candidate and persistence primitive, not an injected failure inside HostState::open; open has no pre-construction fail_next_save seam. Label that limitation if implemented, rather than claiming exact startup fault injection.

### P03 — direct terminal failure then immediate reopen

Matrix AfterWrite/AfterSync/AfterRename. Persist a running synthetic run, inject fault, call finish_execution with a unique answer; assert uncertain and no newly visible artifact in memory. BEFORE reconcile or any other save, drop/open. Pre-rename: no answer artifact; original committed running state is repaired to failed. Post-rename: completed answer and its artifact appear together. Read disk and require the answer/artifact pair in the same generation, never one without the other. Existing generic save matrix retries successfully before reopen and therefore does not establish this immediate-reopen distinction.

### P04 — direct same-process recovery preserves earlier results

Commit result A. Persist running result B, inject each fault, finish B. Assert A's full artifact unchanged and no B artifact in the immediate uncertain view. Reconcile B explicitly; assert recovery outcome, A unchanged, exactly one B artifact if result recovery succeeds. Reconcile again, then reopen; vectors must remain equal. Existing AfterRename reconciliation case covers one result; this adds prior-history preservation and both pre-rename faults. Do not execute a retry provider; use retained-result reconciliation only.

### P05 — Council checkpoint double-fault then reopen

Commit member A. Complete member B in a synthetic session and inject two memberCompleted faults, each of the three fault values. save_constellation_checkpoint must return error; immediate memory must preserve A and expose no new B artifact. Drop/open before any recovery save. Pre-rename: only A; post-rename: A and B, each supported by that committed checkpoint. No final artifact. Assert full A record equality. Existing Council test has an AfterWrite double-fault and later succeeds, but does not cover post-rename immediate reopen.

### P06 — terminal Council answer plus artifacts atomicity

Prepare a Council session with committed member answers, then complete synthesis. Matrix all fault values with two injected faults for the terminal event. Save terminal completed run+checkpoint. Immediate failure must not expose the new final artifact; committed member records remain unchanged. Drop/open: pre-rename has no final artifact/terminal answer pair; post-rename has both in the same committed snapshot. A successful explicit persistence/reconciliation path must produce one final, never a duplicate. This tests checkpoint/run/artifact transaction boundaries, not member identity rules.

### P07 — cancellation retention across failure and reopen

Commit member A; leave B incomplete. Cancel the in-memory TeamSession and save a cancelled checkpoint with terminal status cancelled and no final answer. Run no-fault plus each double-fault case. Assert A's complete record/content unchanged and no final artifact in memory or reopened snapshot. Successful/post-rename cancellation reopens cancelled; pre-rename reopen may mark the prior active run failed, so do NOT incorrectly demand cancelled there. Reopened retained member A must remain available in every branch. Existing happy cancellation case verifies two retained results and reopen but not cancellation commit failures.

### P08 — cancellation followed by late unrelated edits

After P07's successful cancellation, save changed conversation draft/provider/team selection through a candidate workspace without changing the historical run/checkpoint. Reopen and compare old artifact records byte-for-byte; no final artifact is synthesized. This is persistence retention only, not late-provider callback or parser validation.

## Existing evidence and next dependency

Inspected existing source tests: saved_artifact_migration_idempotent_and_corruption_rejected; saved_artifact_save_faults_are_atomic_and_uncertainty_reconciles_once; saved_artifact_terminal_failure_does_not_publish_unsaved_final; saved_artifact_council_checkpoint_retry_and_cancel_keep_exact_history; saved_artifact_direct_postrename_reconciliation_is_idempotent. No passing execution is claimed from reading test bodies. New cases above are specifications, not test results, and do not assert an implementation defect.

Next dependency: builder freezes the artifact implementation and selects uncovered cases P02/P03/P05/P06/P07 for integration into its single native test run using its existing target/cache. Snapshot the final code before executing and record exact test filters/results. P01/P04/P08 are retention refinements if not already covered by intervening work. No parallel duplicate native build is needed. Managed-file admission remains disabled and outside this slice; no identity/parser or UI coverage is claimed.
