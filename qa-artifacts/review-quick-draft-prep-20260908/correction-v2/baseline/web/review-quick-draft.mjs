const DEFAULT_MAX_DRAFT_BYTES = 128 * 1024;
const MAX_ACTION_ID_BYTES = 64;
const MAX_SCOPE_ID_BYTES = 128;
const STORAGE_PREFIX = "rivune.pending-review.v1";
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
  const mutationID = `review:${event.actionID}`;
  if (!isBoundedASCII(mutationID, 128)) throw new Error("The Review mutation identifier is too long.");
  return Object.freeze({
    schemaVersion: 1,
    actionID: event.actionID,
    recoveryScopeID: event.recoveryScopeID,
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

function parsePending(raw, scopeID, maxDraftBytes) {
  if (typeof raw !== "string" || byteLength(raw) > maxDraftBytes * 8 + 64 * 1024) return null;
  let value;
  try { value = JSON.parse(raw); } catch { return null; }
  try {
    if (value?.schemaVersion !== 1 || value.recoveryScopeID !== scopeID) return null;
    if (!isBoundedASCII(value.actionID, MAX_ACTION_ID_BYTES)) return null;
    const action = validateAction({ schemaVersion: 1, actionID: value.actionID, recoveryScopeID: scopeID });
    const request = validateRequest(value.request, maxDraftBytes);
    if (typeof value.explicitText !== "string" || byteLength(value.explicitText) > maxDraftBytes) return null;
    if (request.mutationID !== action.mutationID) return null;
    return Object.freeze({ schemaVersion: 1, ...action, request, explicitText: value.explicitText });
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
  if (![settleCurrentDraft, getCurrentTarget, saveRichDraft, applyDurable, isFrozen, onChange].every(value => typeof value === "function")) throw new Error("Review controller dependencies are incomplete.");

  const storageKey = `${STORAGE_PREFIX}:${recoveryScopeID}`;
  let state = Object.freeze({ kind: "idle" });
  const completedActions = new Set();

  function publish(next) {
    state = Object.freeze(next);
    onChange(state);
    return state;
  }

  function persist(action, request, explicitText) {
    storage.setItem(storageKey, JSON.stringify({
      schemaVersion: 1,
      recoveryScopeID,
      actionID: action.actionID,
      request,
      explicitText,
    }));
  }

  async function commit(action, request, explicitText) {
    persist(action, request, explicitText);
    publish({ kind: "uncertain", action, request, explicitText, message: "Confirm whether the Review text was saved, then retry the same action." });
    let receipt;
    try {
      receipt = parseReceipt(await saveRichDraft(request), request);
    } catch (error) {
      publish({ kind: "uncertain", action, request, explicitText, message: "Draft durability is uncertain. Retry reconciles this exact action.", error });
      return state;
    }
    if (matchingDurable(receipt, request)) {
      try {
        await applyDurable(request, receipt);
      } catch (error) {
        return publish({ kind: "uncertain", action, request, explicitText, receipt, message: "The host saved Review text, but local reconciliation is incomplete. Retry the same action.", error });
      }
      storage.removeItem(storageKey);
      completedActions.add(action.actionID);
      return publish({ kind: "durable", action, request, explicitText, receipt });
    }
    if (receipt?.state === "rejected") {
      storage.removeItem(storageKey);
      completedActions.add(action.actionID);
      return publish({ kind: "rejected", action, request, explicitText, receipt, message: receipt.error ?? "The conversation changed before Review could save. Your Review text is retained here." });
    }
    return publish({ kind: "uncertain", action, request, explicitText, receipt, message: "Draft durability is uncertain. Retry reconciles this exact action." });
  }

  function open(event) {
    if (isFrozen()) return publish({ kind: "blocked", message: "Review is unavailable while Rivune is closing or recovering." });
    const action = validateAction(event);
    if (action.recoveryScopeID !== recoveryScopeID) return publish({ kind: "blocked", message: "Review belongs to a different local workspace." });
    if (completedActions.has(action.actionID)) return state;
    if (["uncertain", "saving"].includes(state.kind)) {
      if (state.action.actionID === action.actionID) return state;
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
    if (["uncertain", "saving"].includes(state.kind)) return publish({ ...state, hidden: true });
    return publish({ kind: "idle" });
  }

  async function add() {
    if (state.kind !== "editing") return state;
    if (isFrozen()) return publish({ ...state, message: "Review is unavailable while Rivune is closing or recovering." });
    const { action, explicitText } = state;
    publish({ kind: "settling", action, explicitText });
    try {
      await settleCurrentDraft();
      if (isFrozen()) return publish({ kind: "editing", action, explicitText, message: "Review paused while Rivune is closing or recovering." });
      const target = await getCurrentTarget();
      if (!target || target.recoveryScopeID !== recoveryScopeID) throw new Error("The selected workspace changed. Review text was not added.");
      if (!target.conversationID || target.readOnly || target.imported || target.archived) throw new Error("Choose an editable conversation before adding Review text.");
      if (!Number.isSafeInteger(target.revision) || target.revision < 0 || target.pending || target.conflictRevision != null) throw new Error("The selected draft is not durably settled yet.");
      if (typeof target.draft !== "string" || !Array.isArray(target.attachmentIDs)) throw new Error("The selected draft state is invalid.");
      const mergedDraft = appendExplicitText(target.draft, explicitText);
      if (byteLength(mergedDraft) > maxDraftBytes) throw new Error("The combined draft exceeds Rivune’s 128 KiB draft limit.");
      const request = validateRequest({
        conversationID: target.conversationID,
        mutationID: action.mutationID,
        expectedRevision: target.revision,
        draft: mergedDraft,
        attachmentIDs: target.attachmentIDs,
      }, maxDraftBytes);
      publish({ kind: "saving", action, request });
      return await commit(action, request, explicitText);
    } catch (error) {
      return publish({ kind: "editing", action, explicitText, message: error.message, error });
    }
  }

  async function retry() {
    if (state.kind !== "uncertain") return state;
    if (isFrozen()) return publish({ ...state, message: "Review is unavailable while Rivune is closing or recovering." });
    const { action, request, explicitText } = state;
    publish({ kind: "saving", action, request, explicitText });
    return commit(action, request, explicitText);
  }

  function restore() {
    if (isFrozen()) return state;
    const recovered = parsePending(storage.getItem(storageKey), recoveryScopeID, maxDraftBytes);
    if (!recovered) return state;
    return publish({ kind: "uncertain", action: recovered, request: recovered.request, explicitText: recovered.explicitText, message: "A Review save may already have completed. Retry reconciles the same action; it does not append again." });
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
