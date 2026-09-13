const RUN_STATES = new Set(["queued", "running", "completed", "failed", "cancelled", "preserved"]);

export function parseSnapshot(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.conversations) || !Array.isArray(value.runs)) {
    throw new Error("Rivune host returned an incompatible workspace snapshot.");
  }

  for (const conversation of value.conversations) {
    if (typeof conversation.id !== "string" || typeof conversation.title !== "string") {
      throw new Error("Rivune host returned an unreadable conversation.");
    }
    if (conversation.readOnly != null && typeof conversation.readOnly !== "boolean") {
      throw new Error("Rivune host returned an unreadable conversation access state.");
    }
    if (conversation.projectID != null && typeof conversation.projectID !== "string") {
      throw new Error("Rivune host returned an unreadable conversation project.");
    }
  }

  if (value.projects != null && !Array.isArray(value.projects)) {
    throw new Error("Rivune host returned unreadable projects.");
  }
  const projectIDs = new Set();
  for (const project of value.projects ?? []) {
    if (!project || project.schemaVersion !== 1 || typeof project.id !== "string" || !project.id || projectIDs.has(project.id) || typeof project.name !== "string" || typeof project.instructions !== "string") {
      throw new Error("Rivune host returned an unreadable project.");
    }
    projectIDs.add(project.id);
  }
  if (value.activeProjectID != null && typeof value.activeProjectID !== "string") {
    throw new Error("Rivune host returned an unreadable active project.");
  }
  if (value.activeProjectID != null && !projectIDs.has(value.activeProjectID)) {
    throw new Error("Rivune host returned an unknown active project.");
  }
  if (value.conversations.some(conversation => conversation.projectID != null && !projectIDs.has(conversation.projectID))) {
    throw new Error("Rivune host returned a conversation linked to an unknown project.");
  }

  if (value.activeConversationID != null && typeof value.activeConversationID !== "string") {
    throw new Error("Rivune host returned an unreadable active conversation.");
  }

  for (const run of value.runs) {
    if (typeof run.id !== "string" || typeof run.conversationID !== "string" || !RUN_STATES.has(run.status)) {
      throw new Error("Rivune host returned an unreadable run.");
    }
  }

  if (value.attachments != null && !Array.isArray(value.attachments)) throw new Error("Unreadable attachment metadata.");
  const attachmentMap = new Map();
  for (const item of value.attachments ?? []) {
    validateAttachmentMetadata(item);
    if (attachmentMap.has(item.attachmentID)) throw new Error("Duplicate attachment identity.");
    attachmentMap.set(item.attachmentID, item);
  }
  for (const conversation of value.conversations) {
    const rich = conversation.richDraft;
    if (rich == null) continue;
    parseModelSelection(rich.selection ?? null); parseTeamSelection(rich.team ?? null);
    if (rich.team && modelChoiceIdentity({selection:rich.selection}) !== modelChoiceIdentity({selection:rich.team.members[rich.team.leadIndex]})) throw new Error("Team lead does not match selection.");
    if (rich.schemaVersion !== 1 || !Number.isSafeInteger(rich.revision) || rich.revision < 0 || !Array.isArray(rich.attachmentIDs) || rich.attachmentIDs.length > 4 || new Set(rich.attachmentIDs).size !== rich.attachmentIDs.length) throw new Error("Unreadable rich draft.");
    if (rich.attachmentIDs.some(id => attachmentMap.get(id)?.conversationID !== conversation.id)) throw new Error("Attachment belongs to an unknown or different conversation.");
  }
  return value;
}

export function createHostAdapter(host) {
  const required = ["getSnapshot", "openConversation", "submitRun", "reconcileRun"];
  if (!host || required.some((name) => typeof host[name] !== "function")) return null;
  return Object.freeze({
    getSnapshot: () => host.getSnapshot(),
    openConversation: (id) => host.openConversation(id),
    submitRun: (request) => host.submitRun(request),
    reconcileRun: (requestID) => host.reconcileRun(requestID),
    ...(typeof host.configureProvider === "function" ? { configureProvider: (provider, select = true) => host.configureProvider(provider, select) } : {}),
    ...(typeof host.discoverProviders === "function" ? { discoverProviders: () => host.discoverProviders() } : {}),
    ...(typeof host.createProject === "function" ? { createProject: (project) => host.createProject(project) } : {}),
    ...(typeof host.updateProject === "function" ? { updateProject: (project) => host.updateProject(project) } : {}),
    ...(typeof host.selectProject === "function" ? { selectProject: (projectID) => host.selectProject(projectID) } : {}),
    ...(typeof host.moveConversationToProject === "function" ? { moveConversationToProject: (conversationID, projectID) => host.moveConversationToProject(conversationID, projectID) } : {}),
    ...(typeof host.searchWorkspace === "function" ? { searchWorkspace: (query, limit = 20) => host.searchWorkspace(query, limit) } : {}),
    ...(typeof host.createConversation === "function" ? { createConversation: (value) => host.createConversation(value) } : {}),
    ...Object.fromEntries(["getModelCatalog", "refreshModelCatalog", "selectTextAttachments", "approveTextAttachment", "inspectTextAttachment", "validateDraftAttachments", "saveRichDraft"].filter(name => typeof host[name] === "function").map(name => [name, (...args) => host[name](...args)])),
    ...(typeof host.previewLegacyImport === "function" ? { previewLegacyImport: (sources) => host.previewLegacyImport(sources) } : {}),
    ...(typeof host.commitLegacyImport === "function" ? { commitLegacyImport: (fingerprint) => host.commitLegacyImport(fingerprint) } : {}),
    ...(typeof host.recoverLegacyImport === "function" ? { recoverLegacyImport: (fingerprint) => host.recoverLegacyImport(fingerprint) } : {}),
    ...(typeof host.inspectLegacyImport === "function" ? { inspectLegacyImport: (fingerprint) => host.inspectLegacyImport(fingerprint) } : {}),
    ...(typeof host.exportLegacyImport === "function" ? { exportLegacyImport: (fingerprint) => host.exportLegacyImport(fingerprint) } : {}),
    ...(typeof host.cancelRun === "function" ? { cancelRun: (requestID) => host.cancelRun(requestID) } : {}),
    ...(typeof host.retryRun === "function" ? { retryRun: (sourceRunID, newRequestID) => host.retryRun(sourceRunID, newRequestID) } : {}),
    ...(typeof host.beginShutdown === "function" ? { beginShutdown: (token) => host.beginShutdown(token) } : {}),
    ...(typeof host.completeShutdown === "function" ? { completeShutdown: (token) => host.completeShutdown(token) } : {}),
    ...(typeof host.flushShutdownDraft === "function" ? { flushShutdownDraft: request => host.flushShutdownDraft(request) } : {}),
    ...(typeof host.abortShutdown === "function" ? { abortShutdown: (token) => host.abortShutdown(token) } : {}),
    ...(typeof host.onShutdownRequested === "function" ? { onShutdownRequested: (handler) => host.onShutdownRequested(handler) } : {}),
    ...(typeof host.onOpenSettings === "function" ? { onOpenSettings: (handler) => host.onOpenSettings(handler) } : {}),
  });
}

export function parseAcknowledgement(value, requestID) {
  const states = new Set(["accepted", "rejected", "uncertain"]);
  if (!value || value.requestID !== requestID || !states.has(value.state)) {
    return Object.freeze({ state: "uncertain", requestID });
  }
  return Object.freeze({
    state: value.state,
    requestID,
    ...(typeof value.error === "string" ? { error: value.error } : {}),
  });
}

export class SubmissionUncertainError extends Error {
  constructor(requestID, cause) {
    super(`Submission outcome is uncertain for request ${requestID}. Reconcile it before sending again.`, { cause });
    this.name = "SubmissionUncertainError";
    this.requestID = requestID;
  }
}

export function createSubmissionGate(adapter, createID = () => crypto.randomUUID()) {
  let pending = false;
  let unresolvedRequest = null;
  return {
    get pending() { return pending; },
    get unresolvedRequestID() { return unresolvedRequest?.id ?? null; },
    restoreUnresolved(request) {
      if (pending || unresolvedRequest || !request || typeof request.id !== "string" || typeof request.conversationID !== "string" || typeof request.prompt !== "string") return false;
      unresolvedRequest = Object.freeze({ ...request });
      return true;
    },
    async submit({ conversationID, prompt, mode = "direct", id = null, richDraftRevision }) {
      if (pending) throw new Error("A submission is already pending.");
      if (!adapter) throw new Error("The Rivune desktop host is not connected.");
      if (unresolvedRequest) throw new SubmissionUncertainError(unresolvedRequest.id);
      const cleanPrompt = prompt.trim();
      if (!conversationID || !cleanPrompt) throw new Error("Choose a conversation and enter a prompt.");
      pending = true;
      const requestID = id ?? createID();
      if (typeof requestID !== "string" || !requestID || requestID.length > 128) throw new Error("A valid request ID is required.");
      const request = Object.freeze({ id: requestID, conversationID, prompt: richDraftRevision === undefined ? cleanPrompt : prompt, mode, ...(richDraftRevision === undefined ? {} : { richDraftRevision }) });
      try {
        // Deliberately one call. An uncertain outcome must be reconciled by request ID,
        // never retried automatically from the renderer.
        const acknowledgement = parseAcknowledgement(await adapter.submitRun(request), request.id);
        unresolvedRequest = acknowledgement.state === "uncertain" ? request : null;
        return acknowledgement;
      } catch (error) {
        unresolvedRequest = request;
        throw new SubmissionUncertainError(request.id, error);
      } finally {
        pending = false;
      }
    },
    async reconcile() {
      if (pending) throw new Error("A submission is already pending.");
      if (!adapter || !unresolvedRequest) return null;
      pending = true;
      try {
        const acknowledgement = parseAcknowledgement(
          await adapter.reconcileRun(unresolvedRequest.id),
          unresolvedRequest.id,
        );
        if (acknowledgement.state !== "uncertain") unresolvedRequest = null;
        return acknowledgement;
      } catch (error) {
        throw new SubmissionUncertainError(unresolvedRequest.id, error);
      } finally {
        pending = false;
      }
    },
  };
}

export function newestRunForConversation(snapshot, conversationID) {
  // The host appends runs in admission order; completion time can change later.
  for (let index = snapshot.runs.length - 1; index >= 0; index -= 1) {
    if (snapshot.runs[index].conversationID === conversationID) return snapshot.runs[index];
  }
  return null;
}

export function validateAttachmentMetadata(value) {
  if (!value || typeof value.attachmentID !== "string" || !value.attachmentID || value.attachmentID.length > 128 || typeof value.conversationID !== "string" || typeof value.displayName !== "string" || new TextEncoder().encode(value.displayName).length > 256 || !Number.isSafeInteger(value.byteLength) || value.byteLength < 1 || value.byteLength > 65536 || !/^[a-f0-9]{64}$/.test(value.sha256) || !["unchecked", "valid", "changed", "missing", "permissionRequired"].includes(value.sourceState)) throw new Error("Unreadable attachment metadata.");
  return value;
}
export function parseRichDraftReceipt(value, request) {
  if (!value || !["durable", "rejected", "uncertain"].includes(value.state) || value.mutationID !== request.mutationID || value.conversationID !== request.conversationID || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.attachmentIDs)) throw new Error("Draft save acknowledgement is uncertain. Retry the same save.");
  if (value.state === "durable" && (value.revision !== request.expectedRevision + 1 || JSON.stringify(value.attachmentIDs) !== JSON.stringify(request.attachmentIDs))) throw new Error("Draft save acknowledgement does not match this edit.");
  if (Object.hasOwn(request, "selection")) {
    if (!Object.hasOwn(value, "selection") || !Object.hasOwn(value, "team")) throw new Error("Draft choice acknowledgement is uncertain.");
    parseModelSelection(value.selection); parseTeamSelection(value.team);
    if (value.state === "durable" && modelChoiceIdentity(value) !== modelChoiceIdentity(request)) throw new Error("Draft choice acknowledgement does not match this edit.");
  }
  return value;
}

// Public model metadata is bounded and explicit; labels never imply capability.
function modelRecord(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error("Unreadable model metadata.");
}
function modelString(value, max = 128) {
  if (typeof value !== "string" || !value || new TextEncoder().encode(value).length > max) throw new Error("Unreadable model identity.");
}
function modelEnum(value, values) {
  if (!values.includes(value)) throw new Error("Unreadable model capability.");
}
function modelList(value, max) {
  if (!Array.isArray(value) || value.length > max) throw new Error("Unreadable model list.");
  const ids = new Set();
  for (const item of value) { modelString(item?.id); if (ids.has(item.id)) throw new Error("Duplicate model identity."); ids.add(item.id); }
}
export function parseModelSelection(value) {
  if (value === null) return null;
  modelRecord(value, ["schemaVersion", "providerID", "modelID", "effortID", "catalogRevision"]);
  if (value.schemaVersion !== 1) throw new Error("Unreadable model selection.");
  modelString(value.providerID); modelString(value.catalogRevision);
  if (value.modelID !== null) modelString(value.modelID);
  if (value.effortID !== null) { modelString(value.effortID); if (value.modelID === null) throw new Error("Reasoning requires a selected model."); }
  return value;
}
export function parseModelCatalog(value) {
  modelRecord(value, ["schemaVersion", "revision", "providers"]);
  if (value.schemaVersion !== 1) throw new Error("Unreadable model catalog.");
  modelString(value.revision); modelList(value.providers, 32);
  for (const provider of value.providers) {
    modelRecord(provider, ["id", "label", "transport", "adapterState", "installation", "authentication", "responseTest", "catalogState", "models", "defaults", "supportsProviderDefault", "errorCode"]);
    modelString(provider.label, 256);
    modelEnum(provider.transport, ["cli", "api"]); modelEnum(provider.adapterState, ["supported", "unsupported", "unavailable"]);
    modelEnum(provider.installation, ["installed", "missing", "notApplicable", "unknown"]);
    modelEnum(provider.authentication, ["authenticated", "authNeeded", "unknown"]);
    modelEnum(provider.responseTest, ["passed", "failed", "notTested"]);
    modelEnum(provider.catalogState, ["available", "unknown", "unavailable", "stale"]);
    if (typeof provider.supportsProviderDefault !== "boolean") throw new Error("Unreadable provider default capability.");
    if (provider.errorCode !== null) modelString(provider.errorCode);
    modelList(provider.models, 128);
    for (const model of provider.models) {
      modelRecord(model, ["id", "label", "availability", "effortState", "efforts", "supportsDefaultEffort"]);
      modelString(model.label, 256); modelEnum(model.availability, ["available", "unavailable", "unknown"]);
      modelEnum(model.effortState, ["supported", "unsupported", "unknown"]);
      if (typeof model.supportsDefaultEffort !== "boolean") throw new Error("Unreadable reasoning default capability.");
      modelList(model.efforts, 16);
      if (model.effortState !== "supported" && model.efforts.length) throw new Error("Unverified reasoning choices.");
      for (const effort of model.efforts) { modelRecord(effort, ["id", "label"]); modelString(effort.label, 256); }
    }
    modelRecord(provider.defaults, ["modelID", "effortID"]);
    const defaults = provider.defaults;
    if (defaults.modelID !== null) {
      modelString(defaults.modelID);
      const model = provider.models.find(item => item.id === defaults.modelID);
      if (!model || (defaults.effortID !== null && !model.efforts.some(item => item.id === defaults.effortID))) throw new Error("Unknown recommended model or reasoning.");
    } else if (defaults.effortID !== null) throw new Error("Reasoning recommendation requires a model.");
  }
  return value;
}
export function parseTeamSelection(value) {
  if (value === null) return null;
  modelRecord(value, ["schemaVersion", "leadIndex", "members"]);
  if (value.schemaVersion !== 1 || !Array.isArray(value.members) || value.members.length < 2 || value.members.length > 6 || !Number.isSafeInteger(value.leadIndex) || value.leadIndex < 0 || value.leadIndex >= value.members.length) throw new Error("Unreadable team selection.");
  const routes = new Set();
  for (const member of value.members) {
    if (!parseModelSelection(member)) throw new Error("Missing team member.");
    const route = JSON.stringify([member.providerID, member.modelID, member.effortID]);
    if (routes.has(route)) throw new Error("Duplicate team route."); routes.add(route);
  }
  return value;
}
export function modelChoiceIdentity(value) {
  const selection = item => item == null ? null : [item.schemaVersion, item.providerID, item.modelID, item.effortID, item.catalogRevision];
  return JSON.stringify([selection(value.selection), value.team == null ? null : [value.team.schemaVersion, value.team.leadIndex, value.team.members.map(selection)]]);
}
