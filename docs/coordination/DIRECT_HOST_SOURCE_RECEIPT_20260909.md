# Direct host source slice — 2026-09-09

Implemented in `prototypes/ai-native-workspace/src/host/`: strict host snapshot, acknowledgement and event parsing; an explicit Tauri bridge wrapper; and a direct conversation controller with durable rich-draft revision checks, provider-managed-default selection, single submission, uncertain-request reconciliation, saved-answer projection, cancellation and subscription cleanup.

Conversation switching and creation save dirty drafts before changing the active conversation. Concurrent host changes retain local edits and block submission. Draft receipt comparison ignores object-key ordering. A pending request identity is recorded before submission; recovery reconciles that identity without replaying the prompt. Events only trigger durable snapshot refreshes and cannot supply transcript answers. Existing team, attachment and explicit-model drafts cannot silently become a direct provider-default send.

Validation: all 50 Node mocked tests passed; TypeScript and Vite build passed. A test caught local draft replacement during post-save verification; the controller now retains local text until durable verification succeeds. No actual provider or desktop calls were made.

This controller is source-only and is not mounted in App. The browser remains an explicitly labelled local demo, and absent-host setup remains honest. The existing desktop frontendDist is unchanged.

Minimum remaining integration gate: preserve desktop settings and shutdown draft-flush handshake, mount the host controller with visible save/conflict/reconcile states and separate demo routing, then validate a packaged fixture-host journey covering hydration, conversation creation/switching, draft persistence, one submission, completed answer, cancellation, interrupted admission/restart reconciliation, settings and shutdown. Real provider validation follows separately; mocked tests do not prove it. Constellation execution remains outside this slice.
