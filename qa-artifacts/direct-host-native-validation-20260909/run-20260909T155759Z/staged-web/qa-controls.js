// prototypes/ai-native-workspace/src/hooks/workspaceAdapter.ts
function reject() {
  throw new Error("invalid metadata");
}
function record(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value) || keys && Object.keys(value).some((key) => !keys.includes(key))) reject();
}
function text(value, max = 128) {
  if (typeof value !== "string" || !value || new TextEncoder().encode(value).length > max) reject();
}
function choice(value, options) {
  if (typeof value !== "string" || !options.includes(value)) reject();
}
function boolean(value) {
  if (typeof value !== "boolean") reject();
}
function list(value, max) {
  if (!Array.isArray(value) || value.length > max) reject();
  const ids = /* @__PURE__ */ new Set();
  for (const item of value) {
    record(item);
    text(item.id);
    if (ids.has(item.id)) reject();
    ids.add(item.id);
  }
}
function parseModelCatalog(value) {
  record(value, ["schemaVersion", "revision", "providers"]);
  if (value.schemaVersion !== 1) reject();
  text(value.revision);
  list(value.providers, 32);
  for (const provider of value.providers) {
    record(provider, ["id", "label", "transport", "adapterState", "installation", "authentication", "responseTest", "catalogState", "models", "defaults", "supportsProviderDefault", "errorCode"]);
    text(provider.label, 256);
    choice(provider.transport, ["cli", "api"]);
    choice(provider.adapterState, ["supported", "unsupported", "unavailable"]);
    choice(provider.installation, ["installed", "missing", "notApplicable", "unknown"]);
    choice(provider.authentication, ["authenticated", "authNeeded", "unknown"]);
    choice(provider.responseTest, ["passed", "failed", "notTested"]);
    choice(provider.catalogState, ["available", "unknown", "unavailable", "stale"]);
    boolean(provider.supportsProviderDefault);
    if (provider.errorCode !== null) text(provider.errorCode);
    list(provider.models, 128);
    for (const model of provider.models) {
      record(model, ["id", "label", "availability", "effortState", "efforts", "supportsDefaultEffort"]);
      text(model.label, 256);
      choice(model.availability, ["available", "unavailable", "unknown"]);
      choice(model.effortState, ["supported", "unsupported", "unknown"]);
      boolean(model.supportsDefaultEffort);
      list(model.efforts, 16);
      if (model.effortState !== "supported" && model.efforts.length) reject();
      for (const effort of model.efforts) {
        record(effort, ["id", "label"]);
        text(effort.label, 256);
      }
    }
    record(provider.defaults, ["modelID", "effortID"]);
    const defaults = provider.defaults;
    if (defaults.modelID !== null) {
      text(defaults.modelID);
      const model = provider.models.find((item) => item.id === defaults.modelID);
      if (!model) reject();
      if (defaults.effortID !== null) {
        text(defaults.effortID);
        if (!model.efforts.some((item) => item.id === defaults.effortID)) reject();
      }
    } else if (defaults.effortID !== null) reject();
  }
  return value;
}

// prototypes/ai-native-workspace/src/host/contracts.ts
var incompatible = () => {
  throw new Error("Rivune host returned incompatible workspace data. Refresh to try again.");
};
function object(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return incompatible();
  if (keys && Object.keys(value).some((key) => !keys.includes(key))) return incompatible();
  return value;
}
function string(value, max = 128, empty = false) {
  if (typeof value !== "string" || !empty && !value || new TextEncoder().encode(value).length > max) return incompatible();
  return value;
}
function nullableString(value, max = 128, empty = false) {
  return value === null ? null : string(value, max, empty);
}
function integer(value, minimum = 0) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) return incompatible();
  return value;
}
function bool(value) {
  return typeof value === "boolean" ? value : incompatible();
}
function enumValue(value, values) {
  if (typeof value !== "string" || !values.includes(value)) return incompatible();
  return value;
}
function array(value, max) {
  return Array.isArray(value) && value.length <= max ? value : incompatible();
}
function unique(items, identify) {
  if (new Set(items.map(identify)).size !== items.length) return incompatible();
  return items;
}
function version(value) {
  if (value !== 1) incompatible();
}
function parseProvider(value) {
  const v = object(value);
  return { id: string(v.id), kind: enumValue(v.kind, ["codex", "claude", "fixture", "imported"]), executablePath: string(v.executablePath, 4096, true), model: nullableString(v.model), timeoutMs: integer(v.timeoutMs) };
}
function parseSelection(value) {
  if (value === null) return null;
  const v = object(value, ["schemaVersion", "providerID", "modelID", "effortID", "catalogRevision"]);
  version(v.schemaVersion);
  const modelID = nullableString(v.modelID);
  const effortID = nullableString(v.effortID);
  if (modelID === null && effortID !== null) incompatible();
  return { schemaVersion: 1, providerID: string(v.providerID), modelID, effortID, catalogRevision: string(v.catalogRevision) };
}
function parseTeam(value) {
  if (value === null) return null;
  const v = object(value, ["schemaVersion", "leadIndex", "members"]);
  version(v.schemaVersion);
  const members = array(v.members, 6).map((item) => parseSelection(item) ?? incompatible());
  const leadIndex = integer(v.leadIndex);
  if (members.length < 2 || leadIndex >= members.length) incompatible();
  unique(members, (item) => JSON.stringify([item.providerID, item.modelID, item.effortID]));
  return { schemaVersion: 1, leadIndex, members };
}
function parseRichDraft(value) {
  const v = object(value);
  version(v.schemaVersion);
  const attachmentIDs = unique(array(v.attachmentIDs, 4).map((id) => string(id)), (id) => id);
  const selection2 = parseSelection(v.selection);
  const team = parseTeam(v.team);
  const route = (item) => item === null ? null : [item.providerID, item.modelID, item.effortID];
  if (team && JSON.stringify(route(selection2)) !== JSON.stringify(route(team.members[team.leadIndex]))) incompatible();
  return { schemaVersion: 1, revision: integer(v.revision), attachmentIDs, selection: selection2, team };
}
function parseConversation(value) {
  const v = object(value);
  return { id: string(v.id), title: string(v.title, 4096, true), readOnly: bool(v.readOnly), draft: string(v.draft, 1048576, true), richDraft: parseRichDraft(v.richDraft), projectID: v.projectID === void 0 ? null : nullableString(v.projectID) };
}
function parseRun(value) {
  const v = object(value);
  const admitted = object(v.admitted);
  const id = string(v.id);
  const conversationID = string(v.conversationID);
  if (admitted.requestID !== id || admitted.conversationID !== conversationID) incompatible();
  return {
    id,
    conversationID,
    status: enumValue(v.status, ["queued", "running", "completed", "failed", "cancelled", "preserved"]),
    updatedAt: string(v.updatedAt, 128),
    admitted: { requestID: id, conversationID, prompt: string(admitted.prompt, 1048576, true), mode: string(admitted.mode), provider: parseProvider(admitted.provider), retryOf: nullableString(admitted.retryOf) },
    answer: nullableString(v.answer, 4194304, true),
    error: nullableString(v.error, 65536, true)
  };
}
function parseCapabilities(value) {
  if (value === void 0 || value === null) return null;
  const v = object(value, ["schemaVersion", "constellation", "minimumMembers", "reasonCode"]);
  version(v.schemaVersion);
  if (v.minimumMembers !== 2) incompatible();
  return { schemaVersion: 1, constellation: enumValue(v.constellation, ["available", "unavailable"]), minimumMembers: 2, reasonCode: nullableString(v.reasonCode) };
}
function parseHostSnapshot(value) {
  const v = object(value);
  version(v.schemaVersion);
  const conversations = unique(array(v.conversations, 1e4).map(parseConversation), (item) => item.id);
  const runs = unique(array(v.runs, 5e4).map(parseRun), (item) => item.id);
  const providers = unique(array(v.providers, 128).map(parseProvider), (item) => item.id);
  const conversationIDs = new Set(conversations.map((item) => item.id));
  const providerIDs = new Set(providers.map((item) => item.id));
  const activeConversationID = nullableString(v.activeConversationID);
  const selectedProviderID = nullableString(v.selectedProviderID);
  if (activeConversationID !== null && !conversationIDs.has(activeConversationID) || selectedProviderID !== null && !providerIDs.has(selectedProviderID)) incompatible();
  for (const run of runs) if (!conversationIDs.has(run.conversationID)) incompatible();
  const projects = unique(array(v.projects ?? [], 1e4).map((item) => {
    const project = object(item);
    version(project.schemaVersion);
    string(project.name, 4096);
    string(project.instructions, 1048576, true);
    return { id: string(project.id) };
  }), (item) => item.id);
  const projectIDs = new Set(projects.map((item) => item.id));
  const activeProjectID = v.activeProjectID === void 0 ? null : nullableString(v.activeProjectID);
  if (activeProjectID !== null && !projectIDs.has(activeProjectID)) incompatible();
  const attachments = unique(array(v.attachments ?? [], 4e4).map((item) => {
    const attachment = object(item);
    string(attachment.displayName, 256);
    const byteLength = integer(attachment.byteLength, 1);
    if (byteLength > 65536 || !/^[a-f0-9]{64}$/.test(string(attachment.sha256))) incompatible();
    enumValue(attachment.sourceState, ["unchecked", "valid", "changed", "missing", "permissionRequired"]);
    return { id: string(attachment.attachmentID), conversationID: string(attachment.conversationID) };
  }), (item) => item.id);
  const attachmentMap = new Map(attachments.map((item) => [item.id, item.conversationID]));
  for (const attachment of attachments) if (!conversationIDs.has(attachment.conversationID)) incompatible();
  for (const conversation of conversations) {
    if (conversation.projectID !== null && !projectIDs.has(conversation.projectID)) incompatible();
    if (conversation.richDraft.attachmentIDs.some((id) => attachmentMap.get(id) !== conversation.id)) incompatible();
  }
  return { schemaVersion: 1, conversations, runs, providers, activeConversationID, selectedProviderID, runtimeCapabilities: parseCapabilities(v.runtimeCapabilities) };
}
function parseHostAcknowledgement(value, requestID) {
  try {
    const v = object(value, ["state", "requestID", "error"]);
    if (string(v.requestID) !== requestID) incompatible();
    const state = enumValue(v.state, ["accepted", "rejected", "uncertain"]);
    return { state, requestID, ...v.error === void 0 ? {} : { error: string(v.error, 65536, true) } };
  } catch {
    return { state: "uncertain", requestID };
  }
}
function parseHostRunEvent(value) {
  try {
    const v = object(value, ["schemaVersion", "eventID", "requestID", "conversationID", "sequence", "kind", "phase", "state", "memberID", "providerID", "role", "summary", "textDelta", "error"]);
    version(v.schemaVersion);
    const requestID = string(v.requestID);
    const sequence = integer(v.sequence, 1);
    const eventID = string(v.eventID, 256);
    if (eventID !== `${requestID}:${sequence}`) incompatible();
    return {
      schemaVersion: 1,
      eventID,
      requestID,
      sequence,
      conversationID: string(v.conversationID),
      kind: enumValue(v.kind, ["admitted", "providerStarted", "answerDelta", "memberStarted", "memberCompleted", "leadReviewStarted", "finalCompleted", "failed", "cancelled", "recoveryRequired"]),
      phase: enumValue(v.phase, ["admission", "direct", "decide", "contribute", "integrate", "review", "final", "recovery"]),
      state: enumValue(v.state, ["queued", "running", "completed", "failed", "cancelled", "uncertain"]),
      memberID: nullableString(v.memberID),
      providerID: nullableString(v.providerID),
      role: nullableString(v.role),
      summary: string(v.summary, 512),
      textDelta: nullableString(v.textDelta, 16384),
      error: nullableString(v.error, 1024)
    };
  } catch {
    return null;
  }
}

// prototypes/ai-native-workspace/src/host/workspaceController.ts
var HostActionError = class extends Error {
};
var active = (status) => status === "queued" || status === "running";
var canonical = (value) => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
var equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function createHostWorkspaceController(adapter, journal, options = {}) {
  const id = options.id ?? (() => crypto.randomUUID());
  let state = { phase: "disconnected", snapshot: null, catalog: null, pending: null, error: null, drafts: {} };
  const listeners = /* @__PURE__ */ new Set();
  let busy = false, disposed = false, started = false, recoveryBlocked = false;
  let shutdownFrozen = false;
  let unsubscribe = null;
  let poll;
  let refreshPromise = null;
  let refreshAgain = false;
  const sequences = /* @__PURE__ */ new Map();
  const pendingSaves = /* @__PURE__ */ new Map();
  const dirty = /* @__PURE__ */ new Set();
  const draftBases = /* @__PURE__ */ new Map();
  const editVersions = /* @__PURE__ */ new Map();
  let cancelling = null;
  let cancelBusy = false;
  function publish(next) {
    if (disposed) return;
    state = { ...state, ...next };
    listeners.forEach((fn) => fn());
  }
  function fail(message2) {
    publish({ phase: state.pending ? "uncertain" : "error", error: message2 });
  }
  function schedulePoll() {
    clearTimeout(poll);
    if (!disposed && (state.pending || state.snapshot?.runs.some((run) => active(run.status)))) {
      poll = setTimeout(() => {
        void refresh().catch(() => fail("Saved run status could not be refreshed. Retrying while the request remains active.")).finally(schedulePoll);
      }, options.pollMs ?? 1500);
    }
  }
  async function refreshOnce() {
    if (!adapter) throw new HostActionError("Desktop host unavailable.");
    const [rawSnapshot, rawCatalog] = await Promise.all([adapter.getSnapshot(), adapter.getModelCatalog()]);
    const snapshot = parseHostSnapshot(rawSnapshot), catalog = parseModelCatalog(rawCatalog);
    if (disposed) return;
    const drafts = { ...state.drafts };
    for (const c of snapshot.conversations) {
      if (!dirty.has(c.id) && !pendingSaves.has(c.id)) {
        drafts[c.id] = c.draft;
        draftBases.set(c.id, c.richDraft.revision);
      }
    }
    const cancellingRun = snapshot.runs.find((run) => run.id === cancelling);
    if (cancellingRun && !active(cancellingRun.status)) cancelling = null;
    publish({ snapshot, catalog, drafts });
    const pendingActive = state.pending && snapshot.runs.some((run) => run.id === state.pending.requestID && run.conversationID === state.pending.conversationID && active(run.status));
    if (cancelling) publish({ phase: "cancelling" });
    else if (pendingActive) publish({ phase: "running", error: null });
    else if (!busy) publish({ phase: state.pending ? "uncertain" : snapshot.runs.some((run) => active(run.status)) ? "running" : "ready", error: null });
    schedulePoll();
  }
  function refresh() {
    if (refreshPromise) {
      refreshAgain = true;
      return refreshPromise;
    }
    refreshPromise = (async () => {
      do {
        refreshAgain = false;
        await refreshOnce();
      } while (refreshAgain && !disposed);
    })().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }
  function receive(raw) {
    if (disposed || !adapter) return;
    const event = parseHostRunEvent(raw);
    if (!event) {
      void refresh().catch(() => fail("An unreadable update requires a workspace refresh."));
      return;
    }
    const run = state.snapshot?.runs.find((item) => item.id === event.requestID);
    const matchesPending = state.pending?.requestID === event.requestID && state.pending.conversationID === event.conversationID;
    if (!run && !matchesPending) return;
    if (run && (run.conversationID !== event.conversationID || !active(run.status))) return;
    const previous = sequences.get(event.requestID);
    if (previous !== void 0 && event.sequence <= previous) return;
    sequences.set(event.requestID, event.sequence);
    void refresh().catch(() => fail("Live update received; saved run status could not be refreshed."));
  }
  async function action(work, allowPending = false) {
    if (!adapter || !started || disposed || busy || cancelBusy || recoveryBlocked || shutdownFrozen) throw new HostActionError("Workspace action unavailable.");
    if (state.pending && !allowPending) throw new HostActionError("Reconcile the unresolved request before another action.");
    busy = true;
    publish({ error: null, ...state.phase === "error" ? { phase: "ready" } : {} });
    try {
      await work();
    } catch (error) {
      const message2 = error instanceof HostActionError ? error.message : "Host action failed. Current edits and request identity are retained.";
      fail(message2);
      throw new HostActionError(message2);
    } finally {
      busy = false;
      if (state.phase !== "error" && state.phase !== "uncertain") publish({ phase: cancelling ? "cancelling" : state.snapshot?.runs.some((run) => active(run.status)) ? "running" : "ready" });
      schedulePoll();
    }
  }
  function currentConversation(conversationID) {
    const c = state.snapshot?.conversations.find((item) => item.id === conversationID);
    if (!c || c.readOnly) throw new HostActionError("Choose an editable host conversation.");
    return c;
  }
  function defaultSelection(conversationID) {
    const c = currentConversation(conversationID), catalog = state.catalog;
    if (!catalog || c.richDraft.team || c.richDraft.attachmentIDs.length) throw new HostActionError("This direct slice cannot replace an existing team or attachment draft.");
    const providerID = c.richDraft.selection?.providerID ?? state.snapshot?.selectedProviderID;
    const provider = catalog.providers.find((item) => item.id === providerID);
    if (!provider || !state.snapshot?.providers.some((p) => p.id === providerID && ["codex", "claude", "fixture"].includes(p.kind)) || provider.adapterState !== "supported" || provider.installation !== "installed" || !provider.supportsProviderDefault || provider.authentication === "authNeeded" || provider.responseTest === "failed") throw new HostActionError("No admitted provider-default route is configured. Inspect desktop setup.");
    if (c.richDraft.selection?.modelID || c.richDraft.selection?.effortID) throw new HostActionError("Existing explicit model choices must be reviewed before using provider defaults.");
    return { schemaVersion: 1, providerID: provider.id, modelID: null, effortID: null, catalogRevision: catalog.revision };
  }
  async function save(conversationID, draft2, forSend = false) {
    if (!adapter) throw new HostActionError("Desktop host unavailable.");
    const c = currentConversation(conversationID);
    const old = pendingSaves.get(conversationID);
    if (old && forSend && !equal(old.selection, defaultSelection(conversationID))) throw new HostActionError("Resolve the earlier draft save before selecting a provider and sending.");
    if (!old && (draftBases.get(conversationID) ?? c.richDraft.revision) !== c.richDraft.revision) throw new HostActionError("This draft changed elsewhere. Retained edits need explicit conflict review before saving.");
    const request = old ?? { conversationID, mutationID: id(), expectedRevision: c.richDraft.revision, draft: draft2, attachmentIDs: [...c.richDraft.attachmentIDs], selection: forSend ? defaultSelection(conversationID) : c.richDraft.selection, team: c.richDraft.team };
    if (old && old.draft !== draft2) throw new HostActionError("Resolve the earlier draft save before replacing it. Current edits remain here.");
    pendingSaves.set(conversationID, request);
    publish({ phase: "saving" });
    let receipt2;
    try {
      receipt2 = await adapter.saveRichDraft(request);
    } catch {
      throw new HostActionError("Draft save outcome is uncertain. Retry the same save before sending.");
    }
    if (!receipt2 || typeof receipt2 !== "object") throw new HostActionError("Draft save receipt is unreadable.");
    const r = receipt2;
    if (r.mutationID === request.mutationID && r.conversationID === conversationID && r.state === "rejected") pendingSaves.delete(conversationID);
    if (r.mutationID !== request.mutationID || r.conversationID !== conversationID || r.state !== "durable" || r.revision !== request.expectedRevision + 1 || !equal(r.attachmentIDs, request.attachmentIDs) || !equal(r.selection, request.selection) || !equal(r.team, request.team)) throw new HostActionError("Draft save was not durably acknowledged. Edits are retained; review conflict or retry the same save.");
    pendingSaves.delete(conversationID);
    draftBases.set(conversationID, r.revision);
    dirty.add(conversationID);
    await refresh();
    const saved = currentConversation(conversationID);
    if (saved.richDraft.revision !== r.revision || saved.draft !== request.draft || !equal(saved.richDraft.selection, request.selection)) throw new HostActionError("Saved draft changed before submission. Review it before sending.");
    if (state.drafts[conversationID] === request.draft) dirty.delete(conversationID);
    return r.revision;
  }
  async function reconcilePending() {
    if (!adapter || !state.pending) return;
    const token = state.pending;
    if (journal.authoritative && await journal.read() === null) {
      await refresh();
      publish({ pending: null, phase: "ready", error: null });
      return;
    }
    let raw;
    try {
      raw = await adapter.reconcileRun(token.requestID);
    } catch {
      throw new HostActionError("Request outcome remains uncertain. Reconcile again; do not resend.");
    }
    const ack = parseHostAcknowledgement(raw, token.requestID);
    if (ack.state === "uncertain") {
      publish({ phase: "uncertain", error: "Request outcome remains uncertain. Reconcile again; do not resend." });
      return;
    }
    await refresh();
    if (ack.state === "accepted" && !state.snapshot?.runs.some((run) => run.id === token.requestID && run.conversationID === token.conversationID)) throw new HostActionError("Accepted request is not yet in saved history. Reconcile again.");
    await journal.clear(token);
    publish({ pending: null, phase: "ready", error: ack.state === "rejected" ? "The host rejected this request. Its saved draft is retained." : null });
  }
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async start() {
      if (started || disposed) return;
      if (!adapter) {
        publish({ phase: "disconnected", error: "Desktop host unavailable. No demo data is used by this controller." });
        return;
      }
      started = true;
      publish({ phase: "hydrating" });
      try {
        let pending;
        try {
          pending = await journal.read();
        } catch {
          recoveryBlocked = true;
          throw new HostActionError("Unresolved request storage is unavailable or unreadable.");
        }
        publish({ pending });
        unsubscribe = await adapter.onRunEvent(receive);
        if (disposed) {
          unsubscribe();
          return;
        }
        await refresh();
        if (pending) await action(reconcilePending, true);
      } catch {
        fail("Host recovery could not finish. Saved request identity and edits are retained.");
      }
    },
    refresh: () => action(async () => {
      await refresh();
    }),
    async refreshStatus() {
      if (!adapter || !started || disposed || recoveryBlocked || shutdownFrozen) throw new HostActionError("Workspace status unavailable.");
      try {
        await refresh();
      } catch {
        fail("Saved run status could not be refreshed.");
        throw new HostActionError("Saved run status could not be refreshed.");
      }
    },
    editDraft(conversationID, draft2) {
      if (shutdownFrozen || disposed) throw new HostActionError("Draft editing is paused while closing.");
      currentConversation(conversationID);
      if (typeof draft2 !== "string" || new TextEncoder().encode(draft2).length > 128 * 1024) throw new HostActionError("Draft exceeds the direct preview limit.");
      dirty.add(conversationID);
      editVersions.set(conversationID, (editVersions.get(conversationID) ?? 0) + 1);
      publish({ drafts: { ...state.drafts, [conversationID]: draft2 } });
    },
    saveDraft: (conversationID) => action(async () => {
      await save(conversationID, state.drafts[conversationID] ?? currentConversation(conversationID).draft);
    }),
    retryDraftSave: (conversationID) => action(async () => {
      const request = pendingSaves.get(conversationID);
      await save(conversationID, request?.draft ?? state.drafts[conversationID] ?? currentConversation(conversationID).draft);
    }),
    keepLocalDraft: (conversationID, reviewedRevision) => action(async () => {
      if (pendingSaves.has(conversationID)) throw new HostActionError("Retry the earlier draft save to resolve its outcome first.");
      await refresh();
      if (reviewedRevision !== void 0 && currentConversation(conversationID).richDraft.revision !== reviewedRevision) throw new HostActionError("The saved draft changed again. Review its latest text before keeping your draft.");
      draftBases.set(conversationID, currentConversation(conversationID).richDraft.revision);
      publish({ phase: "ready", error: null });
    }),
    prepareShutdownDrafts() {
      shutdownFrozen = true;
      if (!started || disposed || busy || cancelBusy || recoveryBlocked || state.pending || pendingSaves.size || !state.snapshot) throw new HostActionError("Resolve pending workspace changes before closing.");
      return [...dirty].sort().map((conversationID) => {
        const c = currentConversation(conversationID);
        if (draftBases.get(conversationID) !== c.richDraft.revision) throw new HostActionError("Review the conflicting draft before closing.");
        return { conversationID, draft: state.drafts[conversationID], clientRevision: editVersions.get(conversationID) ?? 0, expectedRichRevision: c.richDraft.revision, mutationID: id(), attachmentIDs: [...c.richDraft.attachmentIDs], selection: c.richDraft.selection, team: c.richDraft.team };
      });
    },
    resumeAfterShutdown() {
      shutdownFrozen = false;
    },
    acknowledgeShutdownDraft(input, revision2) {
      if (input.conversationID === null || revision2 === null) return;
      draftBases.set(input.conversationID, revision2);
      if ((editVersions.get(input.conversationID) ?? 0) === input.clientRevision && state.drafts[input.conversationID] === input.draft) dirty.delete(input.conversationID);
    },
    createConversation: (title) => action(async () => {
      if (typeof title !== "string" || !title.trim() || new TextEncoder().encode(title).length > 256) throw new HostActionError("Enter a valid conversation title.");
      const previous = state.snapshot?.activeConversationID;
      if (previous && dirty.has(previous)) await save(previous, state.drafts[previous]);
      const conversationID = id();
      try {
        await adapter.createConversation({ id: conversationID, title: title.trim() });
      } catch {
        await refresh();
        if (!state.snapshot?.conversations.some((c) => c.id === conversationID)) throw new HostActionError("Conversation creation was not confirmed. Refresh before creating another.");
      }
      await adapter.openConversation(conversationID);
      await refresh();
    }),
    openConversation: (conversationID) => action(async () => {
      if (!state.snapshot?.conversations.some((c) => c.id === conversationID)) throw new HostActionError("Unknown host conversation.");
      const previous = state.snapshot?.activeConversationID;
      if (previous && dirty.has(previous)) await save(previous, state.drafts[previous]);
      await adapter.openConversation(conversationID);
      await refresh();
    }),
    send: (conversationID) => action(async () => {
      await refresh();
      if (state.snapshot?.runs.some((run) => active(run.status))) throw new HostActionError("Wait for or cancel the current host run first.");
      const draft2 = state.drafts[conversationID] ?? currentConversation(conversationID).draft;
      if (!draft2.trim()) throw new HostActionError("Enter a message.");
      const revision2 = await save(conversationID, draft2, true);
      if (disposed) return;
      if (shutdownFrozen) throw new HostActionError("Submission paused because the workspace is closing.");
      const pending = { requestID: id(), conversationID };
      publish({ pending, phase: "submitting", error: null });
      try {
        await journal.write(pending);
      } catch {
        throw new HostActionError("Request recovery could not be confirmed. Nothing was submitted; reconcile the reservation before continuing.");
      }
      if (disposed) return;
      if (shutdownFrozen) throw new HostActionError("Submission paused because the workspace is closing. Reconcile the reserved request after reopening.");
      publish({ pending, phase: "submitting", error: null });
      schedulePoll();
      let raw;
      try {
        raw = await adapter.submitRun({ id: pending.requestID, conversationID, prompt: draft2, mode: "direct", richDraftRevision: revision2 });
      } catch {
        publish({ phase: "uncertain", error: "Submission outcome is uncertain. Reconcile this request; do not resend." });
        return;
      }
      if (disposed) return;
      const ack = parseHostAcknowledgement(raw, pending.requestID);
      if (ack.state === "uncertain") {
        publish({ phase: "uncertain", error: "Submission outcome is uncertain. Reconcile this request; do not resend." });
        return;
      }
      await refresh();
      if (ack.state === "accepted" && !state.snapshot?.runs.some((run) => run.id === pending.requestID && run.conversationID === conversationID)) {
        publish({ phase: "uncertain", error: "Accepted request is not yet in saved history. Reconcile before sending again." });
        return;
      }
      await journal.clear(pending);
      publish({ pending: null, phase: "ready", error: ack.state === "rejected" ? "The host rejected this request. The draft is retained." : null });
      if (ack.state === "accepted" && state.drafts[conversationID] === draft2) publish({ drafts: { ...state.drafts, [conversationID]: currentConversation(conversationID).draft } });
    }),
    reconcile: () => action(reconcilePending, true),
    async cancel(requestID) {
      if (!adapter || !started || disposed || recoveryBlocked || shutdownFrozen || cancelBusy) throw new HostActionError("Cancellation is unavailable.");
      const run = state.snapshot?.runs.find((item) => item.id === requestID);
      if (!run || !active(run.status)) throw new HostActionError("Choose an active saved run to cancel.");
      if (state.pending && (state.pending.requestID !== requestID || state.pending.conversationID !== run.conversationID)) throw new HostActionError("Cancellation does not match the unresolved request.");
      cancelBusy = true;
      cancelling = requestID;
      publish({ phase: "cancelling" });
      try {
        let raw;
        try {
          raw = await adapter.cancelRun(requestID);
        } catch {
          throw new HostActionError("Cancellation is unconfirmed. The request may still be active; refresh its saved status.");
        }
        const ack = parseHostAcknowledgement(raw, requestID);
        if (ack.state !== "accepted") throw new HostActionError("Cancellation was not confirmed. The request may still be active; refresh its saved status.");
        await refresh();
      } catch (error) {
        cancelling = null;
        const message2 = error instanceof HostActionError ? error.message : "Cancellation status could not be refreshed. The saved run remains authoritative.";
        fail(message2);
        throw new HostActionError(message2);
      } finally {
        cancelBusy = false;
        schedulePoll();
      }
    },
    dispose() {
      disposed = true;
      unsubscribe?.();
      clearTimeout(poll);
      listeners.clear();
    }
  };
}

// prototypes/ai-native-workspace/src/host/tauriAdapter.ts
function invalid() {
  throw new TypeError("Invalid Rivune host command input.");
}
function record2(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key) => typeof key !== "string" || !keys.includes(key))) invalid();
  if (keys.some((key) => !Object.getOwnPropertyDescriptor(value, key)?.hasOwnProperty("value"))) invalid();
}
function text2(value, max, empty = false) {
  if (typeof value !== "string" || !empty && !value.trim() || new TextEncoder().encode(value).length > max) invalid();
}
function identity(value) {
  text2(value, 128);
}
function revision(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) invalid();
}
function selection(value) {
  if (value === null) return;
  record2(value, ["schemaVersion", "providerID", "modelID", "effortID", "catalogRevision"]);
  if (value.schemaVersion !== 1) invalid();
  identity(value.providerID);
  identity(value.catalogRevision);
  if (value.modelID !== null) identity(value.modelID);
  if (value.effortID !== null) {
    identity(value.effortID);
    if (value.modelID === null) invalid();
  }
}
function selectionIdentity(value) {
  return JSON.stringify(value && [value.schemaVersion, value.providerID, value.modelID, value.effortID, value.catalogRevision]);
}
function draft(value) {
  record2(value, ["conversationID", "mutationID", "expectedRevision", "draft", "attachmentIDs", "selection", "team"]);
  identity(value.conversationID);
  identity(value.mutationID);
  revision(value.expectedRevision);
  text2(value.draft, 128 * 1024, true);
  if (!Array.isArray(value.attachmentIDs) || value.attachmentIDs.length > 4 || new Set(value.attachmentIDs).size !== value.attachmentIDs.length) invalid();
  for (const id of value.attachmentIDs) identity(id);
  selection(value.selection);
  const team = value.team;
  if (team === null) return;
  record2(team, ["schemaVersion", "leadIndex", "members"]);
  revision(team.leadIndex);
  if (team.schemaVersion !== 1 || !Array.isArray(team.members) || team.members.length < 2 || team.members.length > 6 || team.leadIndex >= team.members.length) invalid();
  const routes = /* @__PURE__ */ new Set();
  for (const member of team.members) {
    selection(member);
    if (member === null) invalid();
    const route = JSON.stringify([member.providerID, member.modelID, member.effortID]);
    if (routes.has(route)) invalid();
    routes.add(route);
  }
  if (selectionIdentity(value.selection) !== selectionIdentity(team.members[team.leadIndex])) invalid();
}
var required = ["getSnapshot", "getModelCatalog", "createConversation", "openConversation", "saveRichDraft", "submitRun", "reconcileRun", "cancelRun", "onRunEvent"];
function createTauriWorkspaceAdapter(bridge2, options = {}) {
  if (!bridge2 || typeof bridge2 !== "object" || Array.isArray(bridge2)) return null;
  const methods = {};
  try {
    for (const name of required) {
      const descriptor = Object.getOwnPropertyDescriptor(bridge2, name === "submitRun" && options.reservedSubmission ? "submitReservedRun" : name);
      if (!descriptor || typeof descriptor.value !== "function") return null;
      methods[name] = descriptor.value;
    }
  } catch {
    return null;
  }
  const call = async (name, ...args) => methods[name].apply(bridge2, args);
  return Object.freeze({
    getSnapshot: () => call("getSnapshot"),
    getModelCatalog: () => call("getModelCatalog"),
    async createConversation(value) {
      record2(value, ["id", "title"]);
      identity(value.id);
      text2(value.title, 256);
      return call("createConversation", value);
    },
    async openConversation(id) {
      identity(id);
      return call("openConversation", id);
    },
    async saveRichDraft(value) {
      draft(value);
      return call("saveRichDraft", value);
    },
    async submitRun(value) {
      record2(value, ["id", "conversationID", "prompt", "mode", "richDraftRevision"]);
      identity(value.id);
      identity(value.conversationID);
      text2(value.prompt, 128 * 1024);
      revision(value.richDraftRevision);
      if (value.mode !== "direct") invalid();
      return call("submitRun", value);
    },
    async reconcileRun(id) {
      identity(id);
      return call("reconcileRun", id);
    },
    async cancelRun(id) {
      identity(id);
      return call("cancelRun", id);
    },
    async onRunEvent(handler) {
      if (typeof handler !== "function") invalid();
      const unlisten = await call("onRunEvent", handler);
      if (typeof unlisten !== "function") throw new TypeError("Rivune host did not return an event cleanup function.");
      return unlisten;
    }
  });
}

// prototypes/ai-native-workspace/src/host/durableRecovery.ts
var names = ["getSubmissionRecovery", "reserveSubmissionRecovery", "clearSubmissionRecovery"];
var message = "Durable request recovery is unavailable or unconfirmed. New submissions remain blocked.";
function invalid2() {
  throw new Error(message);
}
function identity2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid2();
  const data = value;
  for (const key of ["requestID", "conversationID"]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || typeof data[key] !== "string" || !data[key].trim() || new TextEncoder().encode(data[key]).length > 128) invalid2();
  }
}
function receipt(value, states, expected) {
  identity2(value);
  const v = value;
  const keys = Reflect.ownKeys(v);
  if (keys.length !== 4 || keys.some((key) => !["schemaVersion", "requestID", "conversationID", "state"].includes(String(key)))) invalid2();
  if (!Object.getOwnPropertyDescriptor(v, "schemaVersion")?.hasOwnProperty("value") || !Object.getOwnPropertyDescriptor(v, "state")?.hasOwnProperty("value")) invalid2();
  if (v.schemaVersion !== 1 || typeof v.state !== "string" || !states.includes(v.state) || expected && (expected.requestID !== v.requestID || expected.conversationID !== v.conversationID)) invalid2();
  return { requestID: v.requestID, conversationID: v.conversationID };
}
function createDurableRecoveryJournal(bridge2) {
  if (!bridge2 || typeof bridge2 !== "object" || Array.isArray(bridge2)) return null;
  const methods = {};
  try {
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(bridge2, name);
      if (typeof descriptor?.value !== "function") return null;
      methods[name] = descriptor.value;
    }
  } catch {
    return null;
  }
  async function call(name, value) {
    try {
      return await methods[name].apply(bridge2, value ? [{ requestID: value.requestID, conversationID: value.conversationID }] : []);
    } catch {
      return invalid2();
    }
  }
  return Object.freeze({
    authoritative: true,
    async read() {
      const value = await call("getSubmissionRecovery");
      return value === null ? null : receipt(value, ["reserved", "rejected"]);
    },
    async write(value) {
      identity2(value);
      receipt(await call("reserveSubmissionRecovery", value), ["reserved"], value);
    },
    async clear(value) {
      identity2(value);
      receipt(await call("clearSubmissionRecovery", value), ["cleared"], value);
    }
  });
}

// qa-artifacts/direct-host-native-validation-20260909/qa-controls-entry.ts
var original = globalThis.__RIVUNE_DESKTOP_HOST__;
var calls = [];
var tracked = /* @__PURE__ */ new Set(["reserveSubmissionRecovery", "submitReservedRun", "reconcileRun", "cancelRun", "clearSubmissionRecovery", "beginShutdown", "flushShutdownDraft", "completeShutdown", "abortShutdown", "saveRichDraft"]);
var bridge = Object.fromEntries(Object.entries(original).map(([name, fn]) => [name, typeof fn !== "function" || !tracked.has(name) ? fn : async (...args) => {
  calls.push({ name, phase: "start", args });
  render(calls);
  try {
    const result = await fn(...args);
    calls.push({ name, phase: "result", result });
    render(calls);
    return result;
  } catch (error) {
    calls.push({ name, phase: "error", error: String(error) });
    render(calls);
    throw error;
  }
}]));
globalThis.__RIVUNE_DESKTOP_HOST__ = Object.freeze(bridge);
var panel = document.createElement("details");
panel.id = "qa-native";
panel.open = true;
panel.innerHTML = '<summary>ISOLATED NATIVE QA \xB7 synthetic executable only</summary><div></div><textarea aria-label="QA evidence" readonly></textarea>';
document.body.append(panel);
var output = panel.querySelector("textarea");
function render(value) {
  output.value = JSON.stringify(value, null, 2);
}
function button(name, fn) {
  const el = document.createElement("button");
  el.textContent = name;
  el.onclick = async () => {
    try {
      render(await fn());
    } catch (e) {
      render({ error: String(e) });
    }
  };
  panel.querySelector("div").append(el);
}
button("QA configure synthetic", async () => {
  await bridge.configureProvider({ id: "qa:synthetic-only", kind: "codex", executablePath: "/private/tmp/rivune-recovery-qa-hja6fhqu/codex", model: null, timeoutMs: 65e3 }, true);
  return { configured: "/private/tmp/rivune-recovery-qa-hja6fhqu/codex" };
});
button("QA inspect state", async () => ({ snapshot: await bridge.getSnapshot(), recovery: await bridge.getSubmissionRecovery() }));
button("QA inspect calls", async () => calls);
button("QA reserve orphan", async () => {
  const s = await bridge.getSnapshot();
  return await bridge.reserveSubmissionRecovery({ requestID: "qa-orphan-" + crypto.randomUUID(), conversationID: s.activeConversationID });
});
button("QA terminal retain", async () => {
  const s = await bridge.getSnapshot(), c = s.conversations.find((c2) => c2.id === s.activeConversationID), cat = await bridge.getModelCatalog();
  const r = await bridge.saveRichDraft({ conversationID: c.id, mutationID: crypto.randomUUID(), expectedRevision: c.richDraft.revision, draft: "QA_TERMINAL_RETAIN", attachmentIDs: [], selection: { schemaVersion: 1, providerID: s.selectedProviderID, modelID: null, effortID: null, catalogRevision: cat.revision }, team: null });
  const id = crypto.randomUUID();
  await bridge.reserveSubmissionRecovery({ requestID: id, conversationID: c.id });
  const result = await bridge.submitReservedRun({ id, conversationID: c.id, prompt: "QA_TERMINAL_RETAIN", mode: "direct", richDraftRevision: r.revision });
  return { result, recovery: await bridge.getSubmissionRecovery() };
});
button("QA external draft edit", async () => {
  const s = await bridge.getSnapshot(), c = s.conversations.find((c2) => c2.id === s.activeConversationID);
  return await bridge.saveRichDraft({ conversationID: c.id, mutationID: crypto.randomUUID(), expectedRevision: c.richDraft.revision, draft: "Synthetic external edit for conflict test", attachmentIDs: c.richDraft.attachmentIDs, selection: c.richDraft.selection, team: c.richDraft.team });
});
button("QA invalid and duplicate cancel", async () => {
  const c = createHostWorkspaceController(createTauriWorkspaceAdapter(bridge, { reservedSubmission: true }), createDurableRecoveryJournal(bridge));
  await c.start();
  try {
    const s = c.getState().snapshot;
    const active2 = s.runs.find((r) => r.status === "running"), done = s.runs.find((r) => r.status === "completed");
    const bad = await Promise.allSettled([c.cancel("qa-unknown"), ...done ? [c.cancel(done.id)] : []]);
    const result = active2 ? await Promise.allSettled([c.cancel(active2.id), c.cancel(active2.id)]) : [];
    return { invalid: bad.map((r) => r.status), active: active2?.id, result: result.map((r) => r.status), calls };
  } finally {
    c.dispose();
  }
});
