# R5 renderer current slice

Canonical implementation, not installed/native proof. Strict bounded model catalog/selection/team parsers; exact scoped IDs and capability enums. Custom in-app provider/model/reasoning dialog calls cached catalog and explicit refresh; no provider guessing/ranking. Selected choices save with text/files. Imported conversations cannot edit.

Every normal/shutdown rich save now explicitly includes selection/team. Pending immutable payload, last-saved dedup, shutdown dedup, receipt proof, dirty clearing, submission recovery and fixed-CAS old-ACK cleanup all include choices. Legacy recovery without choice identity retains the draft. Empty-conversation shutdown requires null echo. Bridge forwards exact fields. No runtime Rust changes.

14 model/parser/identity tests +18 existing Node tests passed. 7 canonical synthetic-host model UI checks passed, including uncertain-save/retry/no dispatch, compact screenshot inspected. R4 browser fixtures now echo R5 fields; extended model/team old-ACK regression receipt in r5-regression.

Pending: independent integration review with current Rust receipts and actual host catalog. Constellation mode/activity UI not yet enabled. Artifact compatibility patch not applied. Native build/launch/provider proof not performed. R5_RENDERER_HASHES.json binds this checkpoint; newer work needs a new receipt.

## Activity checkpoint
R5_ACTIVITY_HASHES.json supersedes the earlier source checkpoint. Snapshot activity is strictly parsed with authoritative truncation, collapsed, and uses only host summaries. Final answer remains primary even if activity is malformed. Native run-event notifications are deduplicated and trigger coalesced snapshot reads, never dispatch. No simulated text deltas. 16 parser/identity tests; 10 model/activity rendered fixture checks; 50 attachment/recovery checks. Constellation selection/execution awaits actual runtime capability; no enabled fake mode.
