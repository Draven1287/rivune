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
  const required = ["getSnapshot", "openConversation", "submitRun"];
  if (!host || required.some((name) => typeof host[name] !== "function")) return null;
  return Object.freeze({
    getSnapshot: () => host.getSnapshot(),
    openConversation: (id) => host.openConversation(id),
    submitRun: (request) => host.submitRun(request),
  });
}

export function createSubmissionGate(adapter, createID = () => crypto.randomUUID()) {
  let pending = false;
  return {
    get pending() { return pending; },
    async submit({ conversationID, prompt, mode = "direct" }) {
      if (pending) throw new Error("A submission is already pending.");
      if (!adapter) throw new Error("The Rivune desktop host is not connected.");
      const cleanPrompt = prompt.trim();
      if (!conversationID || !cleanPrompt) throw new Error("Choose a conversation and enter a prompt.");
      pending = true;
      const request = Object.freeze({ id: createID(), conversationID, prompt: cleanPrompt, mode });
      try {
        // Deliberately one call. An uncertain outcome must be reconciled by request ID,
        // never retried automatically from the renderer.
        return await adapter.submitRun(request);
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
