const DEFAULT_MAX_DRAFT_BYTES = 128 * 1024;
const MAX_ACTION_ID_BYTES = 64;
const MAX_SCOPE_ID_BYTES = 128;
const MAX_INCARNATION_ID_BYTES = 128;
const STORAGE_PREFIX = "rivune.pending-review.v2";
const encoder = new TextEncoder();

function byteLength(value) {
  return encoder.encode(value).byteLength;
}

function isBoundedASCII(value, maxBytes) {
  return typeof value === "string"
    && value.length > 0
    && byteLength(value) <= maxBytes
    && /^[\x21-\x7e]+$/.test(value);
}

function freezeRequest(request) {
  return Object.freeze({
    conversationID: request.conversationID,
    mutationID: request.mutationID,
    expectedRevision: request.expectedRevision,
    draft: request.draft,
    attachmentIDs: Object.freeze([...request.attachmentIDs]),
  });
}

function freezeGuard(target) {
  if (!Number.isSafeInteger(target.localDraftVersion) || target.localDraftVersion < 0) throw new Error("The local Review draft identity is invalid.");
  return Object.freeze({
    conversationID: target.conversationID,
    localDraftVersion: target.localDraftVersion,
    richRevision: target.revision,
    draft: target.draft,
    attachmentIDs: Object.freeze([...target.attachmentIDs]),
  });
}

function validateRequest(request, maxDraftBytes) {
  if (!request || typeof request !== "object") throw new Error("The pending Review request is invalid.");
  if (typeof request.conversationID !== "string" || !request.conversationID) throw new Error("The Review target is invalid.");
  if (!isBoundedASCII(request.mutationID, 128)) throw new Error("The Review mutation identifier is invalid.");
  if (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) throw new Error("The Review draft revision is invalid.");
  if (typeof request.draft !== "string" || byteLength(request.draft) > maxDraftBytes) throw new Error("The Review draft is too large.");
  if (!Array.isArray(request.attachmentIDs) || request.attachmentIDs.some(id => typeof id !== "string" || !id)) throw new Error("The Review attachments are invalid.");
  if (new Set(request.attachmentIDs).size !== request.attachmentIDs.length) throw new Error("The Review attachments contain duplicates.");
  return freezeRequest(request);
}

function validateAction(event) {
  if (!event || event.schemaVersion !== 1) throw new Error("The Review action is not supported.");
  if (!isBoundedASCII(event.actionID, MAX_ACTION_ID_BYTES)) throw new Error("The Review action identifier is invalid.");
  if (!isBoundedASCII(event.recoveryScopeID, MAX_SCOPE_ID_BYTES)) throw new Error("The Review recovery scope is invalid.");
  if (!isBoundedASCII(event.workspaceIncarnationID, MAX_INCARNATION_ID_BYTES)) throw new Error("The Review workspace incarnation is invalid.");
  const mutationID = `review:${event.actionID}`;
  if (!isBoundedASCII(mutationID, 128)) throw new Error("The Review mutation identifier is too long.");
  return Object.freeze({
    schemaVersion: 1,
    actionID: event.actionID,
    recoveryScopeID: event.recoveryScopeID,
    workspaceIncarnationID: event.workspaceIncarnationID,
    mutationID,
  });
}

function appendExplicitText(baseDraft, explicitText) {
  if (typeof baseDraft !== "string" || typeof explicitText !== "string") throw new Error("Review text is invalid.");
  const reviewed = explicitText.trim();
  if (!reviewed) throw new Error("Type or paste text to add.");
  if (!baseDraft) return reviewed;
  const separator = baseDraft.endsWith("\n") ? "\n" : "\n\n";
  return `${baseDraft}${separator}${reviewed}`;
}

function parsePending(raw, scopeID, workspaceIncarnationID, maxDraftBytes) {
  if (typeof raw !== "string" || byteLength(raw) > maxDraftBytes * 8 + 64 * 1024) return null;
  let value;
  try { value = JSON.parse(raw); } catch { return null; }
  try {
    if (value?.schemaVersion !== 2 || value.recoveryScopeID !== scopeID) return null;
    if (!isBoundedASCII(value.actionID, MAX_ACTION_ID_BYTES)) return null;
    if (!isBoundedASCII(value.sessionID, 128)) return null;
    const action = validateAction({ schemaVersion: 1, actionID: value.actionID, recoveryScopeID: scopeID, workspaceIncarnationID: value.workspaceIncarnationID });
    const request = validateRequest(value.request, maxDraftBytes);
    if (typeof value.explicitText !== "string" || byteLength(value.explicitText) > maxDraftBytes) return null;
    if (request.mutationID !== action.mutationID) return null;
    return Object.freeze({ schemaVersion: 2, ...action, request, explicitText: value.explicitText, sessionID: value.sessionID, incarnationMatches: value.workspaceIncarnationID === workspaceIncarnationID });
  } catch {
    return null;
  }
}

function matchingDurable(receipt, request) {
  return receipt?.state === "durable"
    && receipt.mutationID === request.mutationID
    && receipt.conversationID === request.conversationID
    && receipt.revision === request.expectedRevision + 1
    && Array.isArray(receipt.attachmentIDs)
    && receipt.attachmentIDs.length === request.attachmentIDs.length
    && receipt.attachmentIDs.every((id, index) => id === request.attachmentIDs[index]);
}

export function createReviewQuickDraftController({
  storage,
  recoveryScopeID,
  workspaceIncarnationID,
  sessionID = globalThis.crypto?.randomUUID?.(),
  settleCurrentDraft,
  getCurrentTarget,
  saveRichDraft,
  parseReceipt = value => value,
  applyDurable,
  isFrozen = () => false,
  onChange = () => {},
  maxDraftBytes = DEFAULT_MAX_DRAFT_BYTES,
}) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") throw new Error("Review recovery storage is unavailable.");
  if (!isBoundedASCII(recoveryScopeID, MAX_SCOPE_ID_BYTES)) throw new Error("Review recovery scope is invalid.");
  if (!isBoundedASCII(workspaceIncarnationID, MAX_INCARNATION_ID_BYTES)) throw new Error("Review workspace incarnation is invalid.");
  if (!isBoundedASCII(sessionID, 128)) throw new Error("Review session identity is invalid.");
  if (![settleCurrentDraft, getCurrentTarget, saveRichDraft, applyDurable, isFrozen, onChange].every(value => typeof value === "function")) throw new Error("Review controller dependencies are incomplete.");

  const storageKey = `${STORAGE_PREFIX}:${recoveryScopeID}`;
  let state = Object.freeze({ kind: "idle" });
  const completedActions = new Set();
  let operationEpoch = 0;

  function publish(next) {
    state = Object.freeze(next);
    onChange(state);
    return state;
  }

  function persist(action, request, explicitText, guard) {
    storage.setItem(storageKey, JSON.stringify({
      schemaVersion: 2,
      recoveryScopeID,
      workspaceIncarnationID,
      sessionID,
      actionID: action.actionID,
      request,
      explicitText,
      guard,
    }));
  }

  async function commit(action, request, explicitText, guard) {
    persist(action, request, explicitText, guard);
    publish({ kind: "uncertain", action, request, explicitText, guard, sessionID, message: "Confirm whether the Review text was saved, then retry the same action." });
    let receipt;
    try {
      receipt = parseReceipt(await saveRichDraft(request), request);
    } catch (error) {
      publish({ kind: "uncertain", action, request, explicitText, guard, sessionID, message: "Draft durability is uncertain. Retry reconciles this exact action.", error });
      return state;
    }
    if (matchingDurable(receipt, request)) {
      try {
        await applyDurable(request, receipt, guard);
      } catch (error) {
        return publish({ kind: "uncertain", action, request, explicitText, guard, sessionID, receipt, message: "The host saved Review text, but local reconciliation is incomplete. Retry the same action.", error });
      }
      storage.removeItem(storageKey);
      completedActions.add(action.actionID);
      return publish({ kind: "durable", action, request, explicitText, guard, receipt });
    }
    if (receipt?.state === "rejected") {
      storage.removeItem(storageKey);
      completedActions.add(action.actionID);
      return publish({ kind: "rejected", action, request, explicitText, guard, receipt, message: receipt.error ?? "The conversation changed before Review could save. Your Review text is retained here." });
    }
    return publish({ kind: "uncertain", action, request, explicitText, guard, sessionID, receipt, message: "Draft durability is uncertain. Retry reconciles this exact action." });
  }

  function open(event) {
    if (isFrozen()) return publish({ kind: "blocked", message: "Review is unavailable while Rivune is closing or recovering." });
    const action = validateAction(event);
    if (action.recoveryScopeID !== recoveryScopeID) return publish({ kind: "blocked", message: "Review belongs to a different local workspace." });
    if (action.workspaceIncarnationID !== workspaceIncarnationID) return publish({ kind: "blocked", message: "Review belongs to a different workspace incarnation." });
    if (completedActions.has(action.actionID)) return state;
    if (["settling", "uncertain", "saving", "blockedRecovery"].includes(state.kind)) {
      if (state.action?.actionID === action.actionID) return state;
      return publish({ ...state, message: "Finish reconciling the pending Review action before starting another." });
    }
    if (state.kind === "editing" && state.action.actionID === action.actionID) return state;
    return publish({ kind: "editing", action, explicitText: "" });
  }

  function setText(explicitText) {
    if (state.kind !== "editing") return state;
    return publish({ ...state, explicitText: String(explicitText) });
  }

  function close() {
    if (state.kind === "settling") {
      operationEpoch += 1;
      return publish({ kind: "idle" });
    }
    if (["uncertain", "saving", "blockedRecovery"].includes(state.kind)) return publish({ ...state, hidden: true });
    return publish({ kind: "idle" });
  }

  async function add() {
    if (state.kind !== "editing") return state;
    if (isFrozen()) return publish({ ...state, message: "Review is unavailable while Rivune is closing or recovering." });
    const { action, explicitText } = state;
    const epoch = ++operationEpoch;
    publish({ kind: "settling", action, explicitText });
    try {
      await settleCurrentDraft();
      if (epoch !== operationEpoch || state.kind !== "settling" || state.action.actionID !== action.actionID) return state;
      if (isFrozen()) return publish({ kind: "editing", action, explicitText, message: "Review paused while Rivune is closing or recovering." });
      const target = await getCurrentTarget();
      if (epoch !== operationEpoch || state.kind !== "settling" || state.action.actionID !== action.actionID) return state;
      if (!target || target.recoveryScopeID !== recoveryScopeID) throw new Error("The selected workspace changed. Review text was not added.");
      if (target.workspaceIncarnationID !== workspaceIncarnationID) throw new Error("The workspace incarnation changed. Review text was not added.");
      if (!target.conversationID || target.readOnly || target.imported || target.archived) throw new Error("Choose an editable conversation before adding Review text.");
      if (!Number.isSafeInteger(target.revision) || target.revision < 0 || target.pending || target.conflictRevision != null) throw new Error("The selected draft is not durably settled yet.");
      if (typeof target.draft !== "string" || !Array.isArray(target.attachmentIDs)) throw new Error("The selected draft state is invalid.");
      const mergedDraft = appendExplicitText(target.draft, explicitText);
      if (byteLength(mergedDraft) > maxDraftBytes) throw new Error("The combined draft exceeds Rivune’s 128 KiB draft limit.");
      const guard = freezeGuard(target);
      const request = validateRequest({
        conversationID: target.conversationID,
        mutationID: action.mutationID,
        expectedRevision: target.revision,
        draft: mergedDraft,
        attachmentIDs: target.attachmentIDs,
      }, maxDraftBytes);
      publish({ kind: "saving", action, request, explicitText, guard, sessionID });
      return await commit(action, request, explicitText, guard);
    } catch (error) {
      return publish({ kind: "editing", action, explicitText, message: error.message, error });
    }
  }

  async function retry() {
    if (state.kind !== "uncertain") return state;
    if (isFrozen()) return publish({ ...state, message: "Review is unavailable while Rivune is closing or recovering." });
    if (state.sessionID !== sessionID) return publish({ kind: "blockedRecovery", message: "This Review action began in an earlier process. Inspect the authoritative draft; this build cannot safely replay it." });
    const { action, request, explicitText, guard } = state;
    publish({ kind: "saving", action, request, explicitText, guard, sessionID });
    return commit(action, request, explicitText, guard);
  }

  function restore() {
    if (isFrozen()) return state;
    const raw = storage.getItem(storageKey);
    if (raw == null) return state;
    const recovered = parsePending(raw, recoveryScopeID, workspaceIncarnationID, maxDraftBytes);
    if (!recovered) return publish({ kind: "blockedRecovery", message: "A pending Review record cannot be validated and will not be replayed." });
    return publish({ kind: "blockedRecovery", message: recovered.incarnationMatches
      ? "A Review action began in an earlier process. Inspect the authoritative draft; this build cannot safely replay it."
      : "A pending Review record belongs to another workspace incarnation and cannot be replayed." });
  }

  return Object.freeze({
    get state() { return state; },
    storageKey,
    open,
    setText,
    close,
    add,
    retry,
    restore,
  });
}

export const reviewQuickDraftContract = Object.freeze({
  eventName: "rivune://open-review",
  schemaVersion: 1,
  maxActionIDBytes: MAX_ACTION_ID_BYTES,
  maxMutationIDBytes: 128,
  maxDraftBytes: DEFAULT_MAX_DRAFT_BYTES,
  storagePrefix: STORAGE_PREFIX,
});

export async function applyDurableIfCurrent({ guard, readCurrent, applyCurrent, refreshAuthoritative = async () => {} }) {
  const current = readCurrent();
  const matches = current
    && current.conversationID === guard.conversationID
    && current.localDraftVersion === guard.localDraftVersion
    && current.richRevision === guard.richRevision
    && current.draft === guard.draft
    && current.pendingMutationID == null
    && JSON.stringify(current.attachmentIDs) === JSON.stringify(guard.attachmentIDs);
  if (!matches) {
    await refreshAuthoritative();
    return Object.freeze({ applied: false, reason: "renderer-state-advanced" });
  }
  await applyCurrent();
  return Object.freeze({ applied: true });
}
