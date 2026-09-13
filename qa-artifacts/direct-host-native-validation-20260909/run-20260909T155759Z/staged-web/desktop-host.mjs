const invoke = globalThis.__TAURI__?.core?.invoke;
const listen = globalThis.__TAURI__?.event?.listen;

if (typeof invoke === "function") {
  globalThis.__RIVUNE_DESKTOP_HOST__ = Object.freeze({
    getStartupStatus: () => invoke("get_startup_status"),
    exitRecoveryWorkspace: () => invoke("exit_recovery_workspace"),
    getModelCatalog: () => invoke("get_model_catalog"),
    refreshModelCatalog: (providerID = null) => invoke("refresh_model_catalog", {providerId: providerID}),
    getSnapshot: () => invoke("get_snapshot"),
    configureProvider: (provider, select = true) => invoke("configure_provider", { provider, select }),
    discoverProviders: () => invoke("discover_providers"),
    createProject: (project) => invoke("create_project", { project }),
    updateProject: (project) => invoke("update_project", { project }),
    selectProject: (projectID) => invoke("select_project", { projectId: projectID }),
    moveConversationToProject: (conversationID, projectID) => invoke("move_conversation_to_project", { conversationId: conversationID, projectId: projectID }),
    searchWorkspace: (query, limit = 20) => invoke("search_workspace", { query, limit }),
    createConversation: ({ id, title }) => invoke("create_conversation", { id, title }),
    openConversation: (conversationID) => invoke("open_conversation", { conversationId: conversationID }),
    selectTextAttachments: conversationID => invoke("select_text_attachments", { conversationId: conversationID }),
    approveTextAttachment: (conversationID, selectionID, sha256) => invoke("approve_text_attachment", { conversationId: conversationID, selectionId: selectionID, sha256 }),
    inspectTextAttachment: (conversationID, attachmentID, runID = null) => invoke("inspect_text_attachment", { conversationId: conversationID, attachmentId: attachmentID, runId: runID }),
    validateDraftAttachments: (conversationID, revision) => invoke("validate_draft_attachments", { conversationId: conversationID, revision }),
    saveRichDraft: ({ conversationID, mutationID, expectedRevision, draft, attachmentIDs, selection, team }) => invoke("save_rich_draft", { conversationId: conversationID, mutationId: mutationID, expectedRevision, draft, attachmentIds: attachmentIDs, selection, team }),
    previewLegacyImport: (sources) => invoke("preview_legacy_import", { sources }),
    commitLegacyImport: (fingerprint) => invoke("commit_legacy_import", { fingerprint }),
    recoverLegacyImport: (fingerprint) => invoke("recover_legacy_import", { fingerprint }),
    inspectLegacyImport: (fingerprint) => invoke("inspect_legacy_import", { fingerprint }),
    exportLegacyImport: (fingerprint) => invoke("export_legacy_import", { fingerprint }),
    getSubmissionRecovery: () => invoke("get_submission_recovery"),
    reserveSubmissionRecovery: (request) => invoke("reserve_submission_recovery", { request }),
    clearSubmissionRecovery: (request) => invoke("clear_submission_recovery", { request }),
    submitReservedRun: (request) => invoke("submit_reserved_run", { request }),
    submitRun: (request) => invoke("submit_run", { request }),
    reconcileRun: (requestID) => invoke("reconcile_run", { requestId: requestID }),
    cancelRun: (requestID) => invoke("cancel_run", { requestId: requestID }),
    retryConstellationInvocation: request => invoke("retry_constellation_invocation", {request}),
    retryRun: (sourceRunID, newRequestID) => invoke("retry_run", { request: { sourceRunID, newRequestID } }),
    beginShutdown: (token) => invoke("begin_shutdown", { token }),
    completeShutdown: (token) => invoke("complete_shutdown", { token }),
    flushShutdownDraft: ({ token, conversationID, draft, clientRevision, expectedRichRevision, mutationID, attachmentIDs, selection, team }) => invoke("flush_shutdown_draft", { token, conversationId: conversationID, draft, clientRevision, expectedRichRevision, mutationId: mutationID, attachmentIds: attachmentIDs, selection, team }),
    abortShutdown: (token) => invoke("abort_shutdown", { token }),
    ...(typeof listen === "function" ? {
      onShutdownRequested: async (handler) => {
        const unlisten = await listen("rivune://prepare-shutdown", event => handler(event.payload));
        const pending = await invoke("pending_shutdown_request");
        if (typeof pending === "string" && pending) await handler(pending);
        return unlisten;
      },
      onRunEvent: handler => listen("rivune://run-event", event => handler(event.payload)),
      onOpenSettings: (handler) => listen("rivune://open-settings", handler),
    } : {}),
  });
}
