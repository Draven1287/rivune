# R3 Projects renderer handoff

Implemented in the canonical Tauri renderer: active project sidebar; create/edit instructions; linked-chat filtering and explicit move chooser; bounded host title search. Main conversation project context follows the selected conversation, while project selection filters sidebar and sets the destination for new chats.

Preserves current chat drafts across project filtering. Failed project saves keep editable values; closing/reopening the editor retains edits during this session. Explicit Discard edits is available. Dirty project edits block quit with a message to save them first. New creation uses a retained UUID and reconciles a lost acknowledgement against exact saved contents. Keyboard focus uses stable project/action identities.

Validation: 65 prior synthetic browser regressions passed before final focus/ack fixes; 12 targeted current project checks passed, zero page errors. Targeted evidence is PROJECT_CHECKS.json. Screenshot was inspected at desktop 1120x760. This is synthetic Chromium evidence, not native Tauri acceptance, provider execution, restart proof or a release.

Runtime owns host/schema/core/desktop-host and sole combined build. Renderer frozen at SOURCE_RECEIPT.json for handoff. No app install, launch, shutdown or public publication performed. M4 wrapper and QA profile preserved separately.

Final reviewer correction: original creation payload is retained across uncertain readback. If later saved original differs from newer edits, the editor rebinds to that saved project and offers an explicit update save. Final 14 targeted checks pass in PROJECT_CHECKS_FINAL.json. SOURCE_RECEIPT_FINAL.json supersedes initial renderer receipt. The 65 prior regression checks were not rerun after fixes; runtime owns combined integration validation.

Final v2: independent source reviewer closed all reported P2 corrections, no remaining P1/P2 in reviewed fixes. Creation retries now always send immutable admitted payload; newer edits become explicit updates after confirmation. 16 targeted browser checks passed plus focused Node renderer test 1/1 after updating its DOM mock. SOURCE_RECEIPT_FINAL_V2.json and PROJECT_CHECKS_FINAL_V2.json supersede earlier final receipts. Exact renderer and tests/app.test.mjs ownership released to runtime for combined validation/build. No native acceptance.
