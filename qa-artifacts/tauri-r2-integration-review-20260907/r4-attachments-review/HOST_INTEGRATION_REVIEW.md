# R4 actual host integration independent review

Disposition: two P2 corrections required. Original host abort lost-ACK P2 is closed in source plus owner-executed test scope. All ten released source hashes and both handoff document hashes verified. No canonical edits or independent Rust/Cargo/native execution.

## Closed: shutdown abort replay

main.rs abort_shutdown_state holds the request lock across recovery and token bookkeeping. Replaying a recovered token succeeds only when no shutdown is current; a different current token rejects without host recovery or clearing that token. Actual HostState tests abort_replays_same_recovered_token_after_lost_ack and recovered_old_token_cannot_cancel_or_acknowledge_a_new_shutdown cover both schedules. Owner receipt reports both binary tests passed. This closes the source/test correction, not native transport/visual acceptance.

## P2: open selected sources without a path-check/open race

attachments.rs capture_text_file calls reject_symlink_components, then ordinary File::open(path), then checks descriptor and final leaf metadata. A parent directory replaced by a symlink between the first check and open is followed; final symlink_metadata(path) follows parent components, so it sees the same target as the descriptor and the checks accept it. This violates the explicit no-follow-in-any-component contract. Also File::open can block on a FIFO before the later is_file rejection, retaining the active operation and potentially preventing shutdown.

Use descriptor-relative component traversal with no-follow directory opens and a nonblocking/no-follow final open (or equivalent platform primitive), then validate the opened regular file and its identity. Do not rely on another separate pathname check. Add actual capture tests with a deterministic hook/barrier for parent replacement and a bounded FIFO rejection test. Current static symlink tests do not exercise either schedule. This finding is source-derived; no race/FIFO experiment ran in this review.

## P2: retain uncertainty when a same-ID durable synchronization fails

host.rs save_rich_draft_in existing-mutation branch returns rejected for host.save failure before rename, even when that mutation was already published by an earlier AfterRename failure. Schedule: mutation M expected0 publishes revision1 with uncertain; same M retry encounters a pre-rename storage failure; result becomes rejected revision1 although original mutation remains visible/unresolved. app.mjs writeRich converts rejection into conflictRevision; the Retry draft save callback then obtains a snapshot, clears pending M and creates a fresh mutation at revision1. This loses same-ID recovery and increments revision again for the same edit, contrary to the corrected persistence contract.

For an existing visible mutation, failed synchronization must retain uncertain/recovery-required state and original identity regardless of the phase of this retry. Keep genuine initial precommit rejection and payload/CAS conflict distinct. Extend rich_post_rename_uncertainty_reconciles_same_identity_and_reopens_once with a failing pre-rename resync between initial uncertainty and successful retry, and assert original mutation ID/revision survive renderer retry as well. Current test goes directly from uncertainty to successful synchronization and misses this branch. Source-derived schedule, not independently executed Rust.

## Other inspected scope and limits

Reviewed rich CAS, frozen admitted attachments and retry test, public snapshot redaction, reopen binding validation and existing owner test source. No additional blocking conclusion established in those inspected paths. Owner reports 83 library/2 binary Rust,19 Node,46 attachment browser,67 integrated browser plus wire/keyboard/rustfmt passes; these are owner-reported results. No claim every narrative contract case is executed. Native picker interaction, integrated app build/restart/provider behavior and release qualification remain unverified.
