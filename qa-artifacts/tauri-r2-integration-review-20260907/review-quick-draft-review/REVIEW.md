# Quick-draft candidate independent review

Integration remains held: one P1 and two P2 findings. No candidate overwrite, canonical edits, Rust/build or UI execution. Independently ran existing11 tests (all pass), verified frozen baseline/candidate manifest hashes and source/controller identity, and executed check-findings.mjs against actual candidate callback/controller with stub host/storage.

## P1: late durable Review acknowledgement overwrites newer draft state

candidate/web/app.mjs applyDurable unconditionally assigns receipt.revision, clears rich.pending/conflict and dirtyDrafts, writes localDrafts/snapshot, and replaces the composer. Close the modal while a save is uncertain, edit/save the ordinary composer, then retry the original Review action: the host can durably reconcile the old mutation and return its original revision. The callback then replaces newer text, rewinds the renderer revision and clears newer pending-save state. The controller tests stub applyDurable and miss this integration behavior.

Exact callback fixture reproduced revision12/new text/pending mutation becoming revision11/old text/no pending or dirty state. Bind local reconciliation to the original draft/version/ordered IDs and mutation identity; resolve the old action without replacing newer state. Refresh authoritative current state safely when necessary. Test immediate and restart-delayed acknowledgements with newer text, attachments and pending saves.

## P2: copied profile scope does not isolate restored/reset workspaces

Proposed load_or_create_recovery_scope_id reuses any valid UUID found in recovery-scope-v1, independently of workspace lineage. Copying/restoring that file keeps the same storage key; resetting workspace data while leaving it also keeps that key. retry replays the frozen request without verifying a current incarnation/base identity. A restored pre-mutation snapshot can contain the same conversation ID and expected revision, so CAS does not distinguish it from the original workspace. The source only tests two newly created profile directories, not copying/restoring/resetting one.

Actual controller fixture with a copied scope and different reset-workspace target restored/retried old text without consulting that new target. Rust copy/reset behavior is source-derived, not executed. Define host-owned workspace-incarnation/restore policy and validate it in the mutation command, not only the localStorage key. New clone/reset must fail closed or require explicit rebinding; same-workspace normal restart should preserve exact-ID recovery. Add copy/reset/restore tests with colliding conversation/revision values before accepting the host contract.

## P2: settling action can be replaced while its async add continues

open only protects uncertain/saving states; settling is replaceable, and close drops it to idle. While A awaits settleCurrentDraft, another tray activation opens B and accepts B text. A resumes without an epoch/action check, saves and publishes A, overwriting B's state. The actual-controller deferred-settlement fixture reproduced B text being replaced by A's completion. Serialize settling as an active action or invalidate/check an operation epoch at asynchronous boundaries. Test new activation and dismissal during settlement, preserving new text and preventing unintended completion.

Existing positive11-test result does not cover these schedules. The R4 same-ID resync rejection finding also remains a dependency; do not treat that host error as evidence the original write never committed. Parent Review product scope is unchanged; no new product question is required by this review.
