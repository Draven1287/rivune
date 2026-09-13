const invoke = globalThis.__TAURI__?.core?.invoke;
const listen = globalThis.__TAURI__?.event?.listen;

// One bounded renderer-side hint also survives a React unmount while the
// consume command is in flight. No request payload or workspace data is kept.
let retainedSettings = false;
let settingsSubscription = null;

async function subscribeSettings(handler) {
  if (typeof handler !== "function") throw new TypeError("Settings handler is required.");
  if (settingsSubscription) throw new Error("Settings already has a receiver.");
  const subscription = { live: true, handler };
  settingsSubscription = subscription;
  let unlisten;
  const cleanup = () => {
    subscription.live = false;
    if (settingsSubscription === subscription) settingsSubscription = null;
    if (typeof unlisten === "function") unlisten();
  };
  const deliver = async () => {
    const pending = await invoke("take_pending_settings_request");
    if (typeof pending !== "boolean") throw new TypeError("Invalid pending Settings acknowledgement.");
    retainedSettings ||= pending;
    if (settingsSubscription?.live && retainedSettings) {
      settingsSubscription.handler();
      retainedSettings = false;
    }
  };
  try {
    unlisten = await listen("rivune://open-settings", () => {
      // Native event callbacks have no awaiting caller. Registration/remount
      // retries consumption; navigation hints are not durable workspace data.
      void deliver().catch(() => {});
    });
    if (typeof unlisten !== "function") throw new TypeError("Settings listener has no cleanup function.");
    await deliver();
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}

if (typeof invoke === "function") {
  globalThis.__RIVUNE_DESKTOP_HOST__ = Object.freeze({
    getStartupStatus: () => invoke("get_startup_status"),
    exitRecoveryWorkspace: () => invoke("exit_recovery_workspace"),
    getModelCatalog: () => invoke("get_model_catalog"),
    discoverProviderModels: request => invoke("discover_provider_models", { request }),
    cancelModelDiscovery: requestID => invoke("cancel_model_discovery", { requestId: requestID }),
    refreshModelCatalog: (providerID = null) => invoke("refresh_model_catalog", {providerId: providerID}),
    getSnapshot: () => invoke("get_snapshot"),
    configureProvider: (provider, select = true) => invoke("configure_provider", { provider, select }),
    reserveProviderConfiguration: intent => invoke("reserve_provider_configuration", { intent }),
    getProviderConfigurationOperation: () => invoke("get_provider_configuration_operation"),
    applyProviderConfiguration: (intent, operationID) => invoke("apply_provider_configuration", { intent, operationId: operationID }),
    reconcileProviderConfiguration: operationID => invoke("reconcile_provider_configuration", { operationId: operationID }),
    acknowledgeProviderConfiguration: operationID => invoke("acknowledge_provider_configuration", { operationId: operationID }),
    configureSelectedProvider: (provider, select, guard) => invoke("configure_provider", { provider, select, guard }),
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
      onOpenSettings: subscribeSettings,
    } : {}),
  });
}
