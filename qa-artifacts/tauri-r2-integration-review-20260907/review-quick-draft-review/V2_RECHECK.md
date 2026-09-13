# Quick-draft v2 bounded recheck

Disposition: integration held. Late-ACK P1 closed in isolated source/controller-test scope. Clone/reset blind replay is blocked, but usable restart recovery remains unimplemented. Settling P2 remains open on rejection.

Verified all six correction hashes, including patch6fa0ed7f. Independently ran9 correction tests:9 pass. Original11 were already run against unchanged v1 in the original review; they are not v2 coverage. No Rust/native/rendered/canonical action.

The guarded apply checks conversation, local version, rich revision, base text, ordered IDs and absence of pending mutation before local changes. Advanced state instead refreshes the snapshot; inspected refresh preserves local draft maps and composer for an existing selected conversation. This addresses the original overwrite/revision-rewind schedule in fixture scope.

All restored records now enter blockedRecovery with no replay request or exposed saved text, including matching-incarnation normal restarts. This closes blind restored-request admission conservatively, not the broader recovery feature. Authoritative outcome reconciliation/incarnation transport is a required runtime dependency. Do not accept the former copyable UUID file as lineage authority or claim restart recovery works.

Remaining P2: add() guards epoch after successful await but its catch unconditionally publishes old action/text. Reproduced against actual v2 controller: A enters settling; close A; open B and type B text; reject A settlement promise; final state becomes editing/A/A text. No host save is needed for this data loss. Guard the catch with the same operation epoch/action identity before publishing. Cover rejection from both settleCurrentDraft and getCurrentTarget after dismissal/new activation. Existing success-only cancellation test misses this.
