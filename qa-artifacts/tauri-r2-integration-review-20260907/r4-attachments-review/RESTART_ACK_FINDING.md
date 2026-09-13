# P2: Recovered old acknowledgement clears newer attachment draft

Actual app.mjs `clearSubmittedDraftIfUnchanged`, hash `2ec13dc06a1b8a2209b54a09d0e92f4a9d282ee4391c82c393e74da61f946cc6`.

The recovery record stores richDraftRevision, but draft clearing ignores it and attachment identity. It compares text and conversationRevision against a process-local localDraftVersions counter. That map resets on renderer restart. A recovered request with conversationRevision zero can therefore match a newer restored draft with identical text and a different attachment list, then clear both text and files and schedule a persistent empty rich save.

Reproduction sequence: reopen saved text/file-A draft (local counter zero); submit, retain uncertain acknowledgement with rich revision 10; while unresolved, replace attachment selection and save a newer rich draft with the same text; restart renderer; reconcile the old request as accepted. Restored revision 11/file-B must survive, but the function clears it because text and reset zero counter match. Unresolved requests block new dispatch, but attachment edits are not disabled solely by unresolvedRequestID.

`node check-restart-ack.cjs` executes the exact production clearing function against a synthetic reopened rich state at revision 11/file-B and an old acknowledgement at revision 10/local-counter zero. It observes an empty-text/empty-attachment save. RESTART_ACK_RECEIPT.json records source identity and output. This is an exact-function fixture with stub save, not full browser/restart/Rust execution. The first harness assertion used cross-VM array deep equality; it was corrected to a length assertion and the completed run passed.

Correction: bind clearing to authoritative saved rich revision plus immutable submitted attachment identity, with host CAS protection; preserve newer draft state after recovery/restart regardless of identical text. Carry the identity through both immediate acceptance and persisted unresolved recovery. A changed draft should require explicit user action, not inferred clearing from a reset counter.

Acceptance: old accepted reconciliation after restart preserves newer same-text/different-file and same-text/removed-file drafts; unchanged exact revision may clear. No new provider dispatch or duplicate save from acknowledgement recovery. Canonical files were not edited.
