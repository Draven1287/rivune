# Artifact workflow revision 2 recheck

Both original P2 findings are closed in contract scope.

The operation-scoped readPreparedDiff now retrieves immutable captured originals and proposed bytes using operation ID, capture token, file index and bounded offsets. The contract forbids caller paths/current-disk substitution, requires byte/hash verification before confirmation, rejects stale Apply, and bounds capture/chunk sizes.

Persistence now distinguishes precommit rejection, postrename visible uncertainty and lost durable acknowledgement. Continuation has immutable mutation identity, visible and mutation revisions, same-ID durable synchronization, missing-record recovery and newer-edit protection. Apply/revert receipt failure no longer implies project rollback; readback alone cannot establish durable success.

Independently verified all eight validation hashes, 40 unique synthetic acceptance cases, captured before/after base64 against text and content hashes, capture encoding against its token, and unchanged original artifact fixture. These are specification and fixture checks, not executed host/UI/storage fault tests. Runtime implementation and acceptance remain pending.
