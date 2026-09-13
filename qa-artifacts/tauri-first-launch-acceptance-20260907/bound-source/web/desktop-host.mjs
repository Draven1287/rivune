const invoke = globalThis.__TAURI__?.core?.invoke;

if (typeof invoke === "function") {
  globalThis.__RIVUNE_DESKTOP_HOST__ = Object.freeze({
    getSnapshot: () => invoke("get_snapshot"),
    configureProvider: (provider, select = true) => invoke("configure_provider", { provider, select }),
    createConversation: ({ id, title }) => invoke("create_conversation", { id, title }),
    openConversation: (conversationID) => invoke("open_conversation", { conversationId: conversationID }),
    saveDraft: (conversationID, draft) => invoke("save_draft", { conversationId: conversationID, draft }),
    submitRun: (request) => invoke("submit_run", { request }),
    reconcileRun: (requestID) => invoke("reconcile_run", { requestId: requestID }),
    cancelRun: (requestID) => invoke("cancel_run", { requestId: requestID }),
    retryRun: (sourceRunID, newRequestID) => invoke("retry_run", { request: { sourceRunID, newRequestID } }),
  });
}
