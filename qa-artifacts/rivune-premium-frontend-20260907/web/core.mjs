const RUN_STATES = new Set(["queued", "running", "completed", "failed", "cancelled"]);

export function parseSnapshot(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.conversations) || !Array.isArray(value.runs)) {
    throw new Error("Rivune host returned an incompatible workspace snapshot.");
  }

  for (const conversation of value.conversations) {
    if (typeof conversation.id !== "string" || typeof conversation.title !== "string") {
      throw new Error("Rivune host returned an unreadable conversation.");
    }
  }

  for (const run of value.runs) {
    if (typeof run.id !== "string" || typeof run.conversationID !== "string" || !RUN_STATES.has(run.status)) {
      throw new Error("Rivune host returned an unreadable run.");
    }
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
    ...(typeof host.createConversation === "function" ? { createConversation: (value) => host.createConversation(value) } : {}),
    ...(typeof host.saveDraft === "function" ? { saveDraft: (conversationID, draft) => host.saveDraft(conversationID, draft) } : {}),
    ...(typeof host.cancelRun === "function" ? { cancelRun: (requestID) => host.cancelRun(requestID) } : {}),
    ...(typeof host.retryRun === "function" ? { retryRun: (sourceRunID, newRequestID) => host.retryRun(sourceRunID, newRequestID) } : {}),
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
    async submit({ conversationID, prompt, mode = "direct", id = null }) {
      if (pending) throw new Error("A submission is already pending.");
      if (!adapter) throw new Error("The Rivune desktop host is not connected.");
      if (unresolvedRequest) throw new SubmissionUncertainError(unresolvedRequest.id);
      const cleanPrompt = prompt.trim();
      if (!conversationID || !cleanPrompt) throw new Error("Choose a conversation and enter a prompt.");
      pending = true;
      const requestID = id ?? createID();
      if (typeof requestID !== "string" || !requestID || requestID.length > 128) throw new Error("A valid request ID is required.");
      const request = Object.freeze({ id: requestID, conversationID, prompt: cleanPrompt, mode });
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
  return snapshot.runs
    .filter((run) => run.conversationID === conversationID)
    .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))[0] ?? null;
}
