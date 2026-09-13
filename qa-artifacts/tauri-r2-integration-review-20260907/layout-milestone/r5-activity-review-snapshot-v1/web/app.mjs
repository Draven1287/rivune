import { createHostAdapter, createSubmissionGate, newestRunForConversation, parseAcknowledgement, parseSnapshot, parseRichDraftReceipt, validateAttachmentMetadata, modelChoiceIdentity, parseModelCatalog, parseRunActivity } from "./core.mjs";
import { createTranscript } from "./transcript.mjs";
import { initializeArchiveInspector } from "./archive-inspector.mjs";

let modelCatalog = null;
let modelEditor = null;
let modelLoading = false;
const host = createHostAdapter(globalThis.__RIVUNE_DESKTOP_HOST__);
const archiveInspector = host?.inspectLegacyImport
  ? initializeArchiveInspector({ inspect: fingerprint => host.inspectLegacyImport(fingerprint) })
  : null;
const gate = createSubmissionGate(host);
const status = document.querySelector("#connection-status");
const conversationList = document.querySelector("#conversations");
const runStatus = document.querySelector("#run-status");
const form = document.querySelector("#prompt-form");
const prompt = document.querySelector("#prompt");
const submit = document.querySelector("#submit");
const retry = document.querySelector("#retry");
const reconcile = document.querySelector("#reconcile");
const cancel = document.querySelector("#cancel");
const retryRun = document.querySelector("#retry-run");
const newConversation = document.querySelector("#new-conversation");
const transcriptElement = document.querySelector("#transcript");
const welcome = document.querySelector("#welcome");
const conversationTitle = document.querySelector("#conversation-title");
const contentStatus = document.querySelector("#content-status");
const transcript = createTranscript({ container: transcriptElement, scroller: document.querySelector(".response-scroll"), onStatus: message => { contentStatus.textContent = message; } });
const providerKind = document.querySelector("#provider-kind");
const providerPath = document.querySelector("#provider-path");
const providerModel = document.querySelector("#provider-model");
const connectProvider = document.querySelector("#connect-provider");
const composerHint = document.querySelector(".composer-hint");
const importInputs = ["history", "history-backup", "projects", "drafts", "preferences"].map(kind => {
  const input = document.querySelector(`[data-import-kind="${kind}"]`);
  input.dataset.importKind = kind;
  return input;
});
const previewImport = document.querySelector("#preview-import");
const confirmImport = document.querySelector("#confirm-import");
const importPreview = document.querySelector("#import-preview");
const importedData = document.querySelector("#imported-data");
const projectList = document.querySelector("#projects");
const projectDialog = document.querySelector("#project-dialog");
const projectName = document.querySelector("#project-name");
const projectInstructions = document.querySelector("#project-instructions");
const projectEditorStatus = document.querySelector("#project-editor-status");
const searchInput = document.querySelector("#workspace-search");
const searchResults = document.querySelector("#search-results");
const searchStatus = document.querySelector("#search-status");
let projectMutationPending = false;
let projectSignature = "";
let editingProjectID = null;
let newProjectID = null;
let newProjectAdmission = null;
let projectOpener = null;
let searchRevision = 0;
let searchTimer;
const projectDrafts = new Map();
const richDrafts = new Map();
const attachmentMetadata = new Map();
const attachmentChips = document.querySelector("#attachment-chips");
const attachmentStatus = document.querySelector("#attachment-status");
const attachButton = document.querySelector("#attach-text-file");
const attachmentDialog = document.querySelector("#attachment-dialog");
const previewStatus = document.querySelector("#attachment-preview-status");
let attachmentBusy = false;
let previewQueue = [];
let currentPreview = null;
let attachmentSignature = "";

let snapshot = null;
let selectedConversationID = null;
let draftRevision = 0;
let unresolvedDraft = null;
let draftSaveTimer = null;
let submissionPreparing = false;
let conversationSignature = "";
let importReceiptSignature = "";
let statusPinned = false;
let shutdownPreparing = false;
let shutdownFrozen = false;
let hostShutdownToken = null;
const localDrafts = new Map();
const localDraftVersions = new Map();
const dirtyDrafts = new Map();
const draftWrites = new Map();
let refreshRevision = 0;
let appliedRefreshRevision = 0;
let navigationRevision = 0;
let navigationPending = false;
let creatingConversation = false;
const recoveryKey = "rivune.pending-submission.v1";
const retryRecoveryKey = "rivune.pending-retry.v1";
const maxDraftBytes = 128 * 1024;
const recoveryStorage = globalThis.localStorage ?? null;
let retryPreparing = false;
let unresolvedRetry = null;
let reviewedImportFingerprint = null;
let importSelectionRevision = 0;
prompt.disabled = true;
submit.disabled = true;
newConversation.disabled = true;

function rememberDraft() {
  if (selectedConversationID) localDrafts.set(selectedConversationID, prompt.value);
}

function richState(conversationID) {
  if (!richDrafts.has(conversationID)) {
    const saved = snapshot?.conversations.find(c => c.id === conversationID)?.richDraft;
    richDrafts.set(conversationID, { revision: saved?.revision ?? 0, attachmentIDs: [...(saved?.attachmentIDs ?? [])], selection: structuredClone(saved?.selection ?? null), team: structuredClone(saved?.team ?? null), pending: null, conflictRevision: null });
  }
  return richDrafts.get(conversationID);
}
async function commitRich(request, token = null, clientRevision = 0) {
  if (!token) return parseRichDraftReceipt(await host.saveRichDraft(request), request);
  const value = await host.flushShutdownDraft({ token, ...request, clientRevision, expectedRichRevision: request.expectedRevision });
  if (value?.token !== token || value.clientRevision !== clientRevision) throw new Error("Shutdown draft acknowledgement is uncertain.");
  return parseRichDraftReceipt({ ...value, revision: value.richDraftRevision }, request);
}
async function writeRich(conversationID, draft, attachmentIDs, token, clientRevision, choices) {
  const rich = richState(conversationID);
  if (token && rich.shutdownSaved?.token === token && rich.shutdownSaved.draft === draft && JSON.stringify(rich.shutdownSaved.attachmentIDs) === JSON.stringify(attachmentIDs) && modelChoiceIdentity(rich.shutdownSaved) === modelChoiceIdentity(choices)) return rich.revision;
  if (token && rich.conflictRevision === rich.revision) rich.conflictRevision = null;
  if (rich.conflictRevision !== null) throw new Error("This draft changed elsewhere. Use Retry draft save to review and save your retained edits.");
  async function resolvePending() {
    const result = await commitRich(rich.pending, token, clientRevision);
    if (result.state === "rejected") {
      rich.conflictRevision = result.revision;
      throw new Error(result.error ?? "Draft save rejected. Your edits remain here.");
    }
    if (result.state !== "durable") throw new Error(result.error ?? "Draft durability is uncertain. Retry draft save before sending.");
    rich.revision = result.revision;
    rich.lastSaved = { draft: rich.pending.draft, attachmentIDs: [...rich.pending.attachmentIDs], selection: rich.pending.selection, team: rich.pending.team };
    rich.pending = null;
  }
  const reconciledPending = Boolean(rich.pending);
  if (rich.pending) await resolvePending();
  if ((!token || reconciledPending) && rich.lastSaved?.draft === draft && JSON.stringify(rich.lastSaved.attachmentIDs) === JSON.stringify(attachmentIDs) && modelChoiceIdentity(rich.lastSaved) === modelChoiceIdentity(choices)) {
    if (token) rich.shutdownSaved = { token, draft, attachmentIDs: [...attachmentIDs], ...choices };
    return rich.revision;
  }
  rich.pending = Object.freeze({ conversationID, mutationID: crypto.randomUUID(), expectedRevision: rich.revision, draft, attachmentIDs: Object.freeze([...attachmentIDs]), ...choices });
  await resolvePending();
  if (token) rich.shutdownSaved = { token, draft, attachmentIDs: [...attachmentIDs], ...choices };
  return rich.revision;
}
function saveDraft(conversationID, draft, revision = localDraftVersions.get(conversationID) ?? 0, token = null) {
  if (!host?.saveRichDraft) return Promise.reject(new Error("Rich draft storage is unavailable."));
  const attachmentIDs = [...richState(conversationID).attachmentIDs];
  const choices = structuredClone({selection:richState(conversationID).selection, team:richState(conversationID).team});
  const previous = draftWrites.get(conversationID) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(() => writeRich(conversationID, draft, attachmentIDs, token, revision, choices)).then(result => {
    const dirty = dirtyDrafts.get(conversationID);
    if (dirty?.draft === draft && dirty?.revision === revision && JSON.stringify(richState(conversationID).attachmentIDs) === JSON.stringify(attachmentIDs) && modelChoiceIdentity(richState(conversationID)) === modelChoiceIdentity(choices)) dirtyDrafts.delete(conversationID);
    return result;
  });
  draftWrites.set(conversationID, next);
  next.finally(() => { if (draftWrites.get(conversationID) === next) draftWrites.delete(conversationID); render(); }).catch(() => {});
  return next;
}

function draftSaveFailed() {
  setStatus("We couldn’t save this draft durably. Your text and files are still here. Use Retry draft save before sending.", "warning", true);
}

function saveCurrentDraft() {
  rememberDraft();
  clearTimeout(draftSaveTimer);
  draftSaveTimer = null;
  const selected = snapshot?.conversations?.find(conversation => conversation.id === selectedConversationID);
  if (selectedConversationID && !selected?.readOnly && host?.saveRichDraft) {
    return saveDraft(selectedConversationID, prompt.value, localDraftVersions.get(selectedConversationID) ?? 0);
  }
  return Promise.resolve();
}

function oversizedDraftBeforeShutdown() {
  rememberDraft();
  const drafts = new Map(localDrafts);
  for (const [conversationID, value] of dirtyDrafts) drafts.set(conversationID, value.draft);
  if (selectedConversationID) drafts.set(selectedConversationID, prompt.value);
  for (const [conversationID, draft] of drafts) {
    const conversation = snapshot?.conversations?.find(item => item.id === conversationID);
    if (!conversation?.readOnly && new TextEncoder().encode(draft).byteLength > maxDraftBytes) {
      return conversation?.title ?? "A conversation";
    }
  }
  return null;
}

host?.onShutdownRequested?.(async token => {
  if (shutdownPreparing || typeof token !== "string" || !token || !host.beginShutdown || !host.completeShutdown || !host.flushShutdownDraft) return;
  if (projectDrafts.size) {
    setStatus("Save your project edits before quitting. They are still in the project editor.", "warning", true);
    return;
  }
  const oversizedConversation = oversizedDraftBeforeShutdown();
  if (oversizedConversation) {
    setStatus(`${oversizedConversation} has a draft larger than Rivune’s 128 KB local limit. Shorten or copy that draft before quitting; your text remains editable.`, "warning", true);
    return;
  }
  shutdownPreparing = true;
  shutdownFrozen = true;
  document.querySelector(".shell").inert = true;
  for (const openDialog of document.querySelectorAll("dialog[open]")) openDialog.close();
  setStatus("Saving your draft and stopping local tasks before Rivune closes…", "quiet", true);
  render();
  try {
    const quiescenceDeadline = Date.now() + 5000;
    while (navigationPending || creatingConversation || projectMutationPending || attachmentBusy) {
      if (Date.now() >= quiescenceDeadline) throw new Error("A workspace change did not finish in time.");
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    rememberDraft();
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
    while (draftWrites.size) await Promise.allSettled([...draftWrites.values()]);
    if (hostShutdownToken === null) {
      for (const [conversationID, value] of dirtyDrafts) {
        try { await saveDraft(conversationID, value.draft, value.revision); } catch { /* retain failed state for preflight */ }
      }
      const unresolved = [...richDrafts.entries()].find(([, rich]) => rich.conflictRevision !== null || rich.pending);
      if (unresolved) {
        const title = snapshot?.conversations.find(c => c.id === unresolved[0])?.title ?? "A conversation";
        throw new Error(`${title} has an unresolved draft save. Open that conversation and choose Retry draft save before quitting.`);
      }
      hostShutdownToken = token;
    } else if (hostShutdownToken !== token) {
      throw new Error("The previous shutdown must be resolved before a new shutdown can start.");
    }
    await host.beginShutdown(token);
    const selected = snapshot?.conversations?.find(conversation => conversation.id === selectedConversationID);
    if (selectedConversationID && !selected?.readOnly) {
      dirtyDrafts.set(selectedConversationID, { draft: prompt.value, revision: localDraftVersions.get(selectedConversationID) ?? 0 });
    }
    const pendingDrafts = [...dirtyDrafts.entries()]
      .filter(([conversationID]) => !snapshot?.conversations?.find(conversation => conversation.id === conversationID)?.readOnly)
      .sort(([left], [right]) => left.localeCompare(right));
    if (!pendingDrafts.length) {
      const mutationID = `empty:${token}`;
      const receipt = await host.flushShutdownDraft({ token, conversationID: null, draft: "", clientRevision: 0, expectedRichRevision: null, mutationID, attachmentIDs: [], selection:null, team:null });
      if (receipt?.state !== "durable" || receipt.token !== token || receipt.mutationID !== mutationID || receipt.conversationID !== null || receipt.richDraftRevision !== null || receipt.clientRevision !== 0 || JSON.stringify(receipt.attachmentIDs) !== "[]" || receipt.selection !== null || receipt.team !== null) throw new Error("Empty shutdown flush was not durably acknowledged.");
    }
    for (const [conversationID, value] of pendingDrafts) {
      await saveDraft(conversationID, value.draft, value.revision, token);
      dirtyDrafts.delete(conversationID);
    }
    await host.completeShutdown(token);
  } catch (error) {
    shutdownPreparing = false;
    if (hostShutdownToken === null) {
      shutdownFrozen = false;
      document.querySelector(".shell").inert = false;
      setStatus(`Rivune stayed open: ${error.message ?? String(error)}`, "warning", true);
      render();
      return;
    }
    document.querySelector("#shutdown-recovery").hidden = !host?.abortShutdown;
    setStatus(`Rivune stayed open and remains paused because it could not close safely: ${error.message ?? String(error)} Choose Quit again to retry the verified save.`, "warning", true);
    render();
  }
});

function restoreDraft(conversationID, workspace) {
  richState(conversationID);
  prompt.value = localDrafts.has(conversationID) ? localDrafts.get(conversationID) : workspace.conversations.find(c => c.id === conversationID)?.draft ?? "";
  draftRevision += 1;
}

try {
  const saved = recoveryStorage?.getItem(recoveryKey);
  if (saved) {
    unresolvedDraft = Object.freeze(JSON.parse(saved));
    gate.restoreUnresolved(unresolvedDraft);
  }
} catch { unresolvedDraft = null; }

try {
  const saved = recoveryStorage?.getItem(retryRecoveryKey);
  if (saved) {
    const value = JSON.parse(saved);
    if (typeof value?.id === "string" && typeof value?.sourceRunID === "string") unresolvedRetry = Object.freeze(value);
  }
} catch { unresolvedRetry = null; }

function persistUnresolved(value) {
  unresolvedDraft = value ? Object.freeze(value) : null;
  try {
    if (unresolvedDraft) recoveryStorage?.setItem(recoveryKey, JSON.stringify(unresolvedDraft));
    else recoveryStorage?.removeItem(recoveryKey);
  } catch { /* reconciliation remains available for this process */ }
}

function persistRetryUnresolved(value) {
  unresolvedRetry = value ? Object.freeze(value) : null;
  try {
    if (unresolvedRetry) recoveryStorage?.setItem(retryRecoveryKey, JSON.stringify(unresolvedRetry));
    else recoveryStorage?.removeItem(retryRecoveryKey);
  } catch { /* this-process reconciliation remains available */ }
}

async function clearSubmittedDraftIfUnchanged(submission) {
  if (!submission || !Number.isSafeInteger(submission.richDraftRevision) || !Array.isArray(submission.attachmentIDs) || !Object.hasOwn(submission,"selection") || !Object.hasOwn(submission,"team")) return false;
  const id = submission.conversationID;
  const rich = richState(id);
  const matches = () => {
    const text = localDrafts.has(id) ? localDrafts.get(id) : selectedConversationID === id ? prompt.value : snapshot?.conversations.find(c => c.id === id)?.draft;
    const versionMatches = submission.conversationRevision === undefined
      ? selectedConversationID === id && draftRevision === submission.revision
      : (localDraftVersions.get(id) ?? 0) === submission.conversationRevision;
    return versionMatches && text === submission.draft && rich.revision === submission.richDraftRevision && !rich.pending && rich.conflictRevision === null && JSON.stringify(rich.attachmentIDs) === JSON.stringify(submission.attachmentIDs) && modelChoiceIdentity(rich) === modelChoiceIdentity(submission);
  };
  if (!matches()) return false;
  const previous = draftWrites.get(id) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    if (shutdownFrozen || !matches()) return false;
    const request = Object.freeze({ conversationID: id, mutationID: crypto.randomUUID(), expectedRevision: submission.richDraftRevision, draft: "", attachmentIDs: Object.freeze([]), selection:structuredClone(submission.selection), team:structuredClone(submission.team) });
    let receipt;
    try { receipt = parseRichDraftReceipt(await host.saveRichDraft(request), request); }
    catch {
      rich.pending = request;
      dirtyDrafts.set(id, { draft: localDrafts.get(id) ?? submission.draft, revision: localDraftVersions.get(id) ?? 0 });
      draftSaveFailed(); return false;
    }
    if (receipt.state !== "durable") {
      rich.pending = request;
      if (receipt.state === "rejected") rich.conflictRevision = receipt.revision;
      dirtyDrafts.set(id, { draft: localDrafts.get(id) ?? submission.draft, revision: localDraftVersions.get(id) ?? 0 });
      draftSaveFailed(); return false;
    }
    const stillMatches = matches();
    rich.revision = receipt.revision;
    rich.lastSaved = { draft: "", attachmentIDs: [], selection:request.selection, team:request.team };
    if (!stillMatches) return false;
    localDrafts.set(id, ""); rich.attachmentIDs = []; dirtyDrafts.delete(id);
    if (selectedConversationID === id) {
      clearTimeout(draftSaveTimer); draftSaveTimer = null;
      prompt.value = ""; draftRevision += 1;
    }
    return true;
  });
  draftWrites.set(id, next);
  try { return await next; }
  finally { if (draftWrites.get(id) === next) draftWrites.delete(id); render(); }
}

function setStatus(message, tone = "quiet", pinned = false) {
  if (status.textContent !== message) status.textContent = message;
  status.dataset.tone = tone;
  statusPinned = pinned;
}

function render() {
  let historyIsValid = true;
  const conversations = snapshot?.conversations ?? [];
  const receipts = snapshot?.legacyImports ?? [];
  const nextImportReceiptSignature = JSON.stringify(receipts);
  if (nextImportReceiptSignature !== importReceiptSignature) {
    importedData.replaceChildren();
    for (const receipt of receipts) {
    const item = document.createElement("div");
    item.className = "import-receipt";
    const heading = document.createElement("strong");
    heading.textContent = `${receipt.conversationCount} read-only conversation${receipt.conversationCount === 1 ? "" : "s"} activated`;
    const detail = document.createElement("small");
    detail.textContent = `${receipt.answerCount ?? 0} answers and ${receipt.activatedDraftCount ?? 0} matched drafts activated · archive only: ${receipt.projectCount} projects, ${receipt.archiveOnlyDraftCount ?? 0} unmatched drafts, ${receipt.attachmentCount ?? 0} attachments${receipt.preferencesPreserved ? ", preferences" : ""} · ${receipt.sourceCount} original files retained privately`;
    item.append(heading, detail);
    if (archiveInspector) {
      const inspect = document.createElement("button");
      inspect.type = "button";
      inspect.className = "secondary import-inspect";
      inspect.textContent = "Inspect preserved data";
      inspect.addEventListener("click", () => archiveInspector.open(receipt.fingerprint, inspect));
      item.append(inspect);
    }
    if (host?.exportLegacyImport) {
      const recover = document.createElement("button");
      recover.type = "button";
      recover.className = "secondary import-recover";
      recover.textContent = "Export originals…";
      recover.addEventListener("click", async () => {
        recover.disabled = true;
        try {
          const result = await host.exportLegacyImport(receipt.fingerprint);
          if (!result || result.platform !== "macOS" || !Array.isArray(result.saved) || typeof result.cancelled !== "boolean" || (result.error !== null && typeof result.error !== "string") || (result.uncertainFilename !== null && typeof result.uncertainFilename !== "string")) {
            throw new Error("The native export receipt was unreadable.");
          }
          if (result.saved.some(file => typeof file.filename !== "string" || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes))) {
            throw new Error("A saved-file verification receipt was unreadable.");
          }
          if (result.error) {
            const verified = result.saved.length ? `${result.saved.length} earlier original file${result.saved.length === 1 ? " was" : "s were"} saved and verified. ` : "";
            const uncertain = result.uncertainFilename ? `${result.uncertainFilename} may have been published but could not be fully verified. ` : "";
            setStatus(`${verified}${uncertain}Export stopped: ${result.error}`, "warning", true);
          } else if (result.cancelled) {
            setStatus(result.saved.length ? `${result.saved.length} original file${result.saved.length === 1 ? " was" : "s were"} saved and verified before export was cancelled.` : "Export cancelled. No file was changed by Rivune.", "quiet", true);
          } else {
            setStatus(`${result.saved.length} original file${result.saved.length === 1 ? " was" : "s were"} saved, synchronized, and verified by SHA-256.`, "ready", true);
          }
        } catch (error) {
          setStatus(`The preserved originals could not be exported: ${error.message ?? String(error)}`, "warning", true);
        } finally {
          recover.disabled = false;
        }
      });
      item.append(recover);
    }
      importedData.append(item);
    }
    importReceiptSignature = nextImportReceiptSignature;
  }
  const visibleConversations = snapshot?.activeProjectID ? conversations.filter(c => c.projectID === snapshot.activeProjectID) : conversations;
  const nextSignature = JSON.stringify(visibleConversations.map(({ id, title }) => [id, title]));
  if (nextSignature !== conversationSignature) {
    conversationList.replaceChildren();
    for (const conversation of visibleConversations) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "conversation";
      button.dataset.conversationId = conversation.id;
      button.textContent = conversation.title;
      button.addEventListener("click", () => openWorkspaceConversation(conversation.id));
      conversationList.append(button);
    }
    conversationSignature = nextSignature;
  }
  for (const button of conversationList.children) {
    button.setAttribute("aria-pressed", String(button.dataset.conversationId === selectedConversationID));
  }

  renderProjects();
  renderAttachments();
  const run = newestRunForConversation(snapshot ?? { runs: [] }, selectedConversationID);
  runStatus.textContent = run ? `Latest task: ${run.status}` : "";
  runStatus.hidden = !run;
  renderRunActivity(run);
  if (snapshot && selectedConversationID) {
    try {
      const conversation = transcript.render(snapshot, selectedConversationID);
      welcome.hidden = conversation.rows.length > 0;
      conversationTitle.textContent = conversation.title;
    } catch {
      historyIsValid = false;
      transcriptElement.hidden = true;
      welcome.hidden = true;
      conversationTitle.textContent = snapshot.conversations.find(c => c.id === selectedConversationID)?.title ?? "Conversation";
      setStatus("We couldn’t read this conversation’s history. Your draft is still here. Retry the connection.", "warning", true);
    }
  }
  const selectionIsValid = Boolean(
    host && snapshot && snapshot.conversations.some(({ id }) => id === selectedConversationID),
  );
  const selectedConversation = snapshot?.conversations.find(({ id }) => id === selectedConversationID);
  const selectionIsReadOnly = Boolean(selectedConversation?.readOnly);
  cancel.hidden = run?.status !== "running" || typeof host?.cancelRun !== "function";
  const importedRun = run?.admitted?.provider?.kind === "imported" || run?.admitted?.mode?.startsWith("imported-read-only");
  retryRun.hidden = !historyIsValid || !run || selectionIsReadOnly || importedRun || !["failed", "cancelled"].includes(run.status) || typeof host?.retryRun !== "function";
  retryRun.disabled = shutdownFrozen || retryPreparing || submissionPreparing || gate.pending || Boolean(gate.unresolvedRequestID) || Boolean(unresolvedRetry);
  cancel.dataset.runId = run?.id ?? "";
  retryRun.dataset.runId = run?.id ?? "";
  const providerIsConfigured = Boolean((selectedConversationID && richState(selectedConversationID).selection) || snapshot?.selectedProviderID);
  const welcomeDescription = document.querySelector("#welcome-description");
  if (welcomeDescription) welcomeDescription.textContent = providerIsConfigured
    ? "Bring a question, an idea, or your next task. Your configured AI will receive the message you send."
    : "Bring a question, an idea, or your next task. Connect your AI in workspace settings to begin.";
  const diagnostics = document.querySelector("#request-diagnostics");
  const diagnosticID = gate.unresolvedRequestID || unresolvedRetry?.id;
  if (diagnostics) {
    diagnostics.hidden = !diagnosticID;
    document.querySelector("#request-diagnostic-id").textContent = diagnosticID ? `Request ID: ${diagnosticID}` : "";
  }
  submit.disabled = dirtyDrafts.has(selectedConversationID) || draftWrites.has(selectedConversationID) || !host?.saveRichDraft || attachmentBusy || Boolean(richDrafts.get(selectedConversationID)?.pending) || richDrafts.get(selectedConversationID)?.conflictRevision != null || shutdownFrozen || !selectionIsValid || selectionIsReadOnly || !historyIsValid || !providerIsConfigured || submissionPreparing || retryPreparing || gate.pending || Boolean(gate.unresolvedRequestID) || Boolean(unresolvedRetry);
  prompt.disabled = shutdownFrozen || !selectionIsValid || selectionIsReadOnly;
  prompt.placeholder = selectionIsReadOnly ? "Imported conversation · read-only" : "Message your AI…";
  const modelButton = document.querySelector("#choose-model");
  const savedChoice = selectedConversationID ? richState(selectedConversationID).selection : null;
  const providerLabel = modelCatalog?.providers.find(p => p.id === savedChoice?.providerID)?.label;
  if (modelButton) {
    modelButton.disabled = shutdownFrozen || !selectionIsValid || selectionIsReadOnly || !host?.getModelCatalog || modelLoading;
    modelButton.textContent = savedChoice ? (providerLabel ?? savedChoice.providerID) : "Choose AI";
  }
  composerHint.textContent = selectionIsReadOnly ? "Preserved legacy conversation" : "Single AI conversation";
  newConversation.disabled = shutdownFrozen || !host?.createConversation || !snapshot || creatingConversation || navigationPending || projectMutationPending;
  for (const button of conversationList.querySelectorAll?.("button") ?? []) button.disabled = shutdownFrozen;
  reconcile.disabled = gate.pending || retryPreparing || (!gate.unresolvedRequestID && !unresolvedRetry);
  reconcile.hidden = !gate.unresolvedRequestID && !unresolvedRetry;
}

async function refresh(clearPinnedStatus = false) {
  if (shutdownFrozen || navigationPending) return;
  const revision = ++refreshRevision;
  const navigation = navigationRevision;
  if (clearPinnedStatus) statusPinned = false;
  if (!host) {
    setStatus("Rivune could not reach its desktop host. Retry the connection.", "warning", true);
    retry.disabled = true;
    render();
    return;
  }
  try {
    const incoming = parseSnapshot(await host.getSnapshot());
    if (revision < appliedRefreshRevision || navigation !== navigationRevision) return;
    appliedRefreshRevision = revision;
    snapshot = incoming;
    if (selectedConversationID === null) {
      selectedConversationID = snapshot.conversations.some(({ id }) => id === snapshot.activeConversationID)
        ? snapshot.activeConversationID
        : snapshot.conversations[0]?.id ?? null;
      if (selectedConversationID) restoreDraft(selectedConversationID, snapshot);
    }
    if (!statusPinned) {
      setStatus(
        snapshot.selectedProviderID
          ? "Provider configured on this device; sign-in and readiness are not yet verified."
          : "Choose an AI provider to send messages.",
        snapshot.selectedProviderID ? "quiet" : "warning",
      );
    }
  } catch (error) {
    if (revision < appliedRefreshRevision || navigation !== navigationRevision) return;
    appliedRefreshRevision = revision;
    rememberDraft();
    snapshot = null;
    setStatus(`Rivune could not load this workspace: ${error.message ?? String(error)}. Retry the connection.`, "warning", true);
  }
  render();
}

retry.addEventListener("click", () => refresh(true));
prompt.addEventListener("input", () => {
  draftRevision += 1;
  if (selectedConversationID) localDraftVersions.set(selectedConversationID, (localDraftVersions.get(selectedConversationID) ?? 0) + 1);
  rememberDraft();
  clearTimeout(draftSaveTimer);
  const conversationID = selectedConversationID;
  const draft = prompt.value;
  if (conversationID) dirtyDrafts.set(conversationID, { draft, revision: localDraftVersions.get(conversationID) ?? 0 });
  if (conversationID && host?.saveRichDraft) {
    const revision = localDraftVersions.get(conversationID) ?? 0;
    draftSaveTimer = setTimeout(() => saveDraft(conversationID, draft, revision).catch(draftSaveFailed), 180);
  }
  submit.disabled = true;
  renderAttachments();
});
prompt.addEventListener("change", async () => {
  if (!selectedConversationID || !host?.saveRichDraft) return;
  try {
    await saveCurrentDraft();
  } catch {
    draftSaveFailed();
  }
});
newConversation.addEventListener("click", async () => {
  if (shutdownFrozen || creatingConversation || projectMutationPending) return;
  if (!host?.createConversation) return setStatus("This host cannot create conversations yet.", "warning");
  creatingConversation = true;
  const navigation = ++navigationRevision;
  navigationPending = true;
  render();
  try {
    const id = crypto.randomUUID();
    await host.createConversation({ id, title: "New conversation" });
    if (shutdownFrozen) return;
    await host.openConversation(id);
    if (shutdownFrozen || navigation !== navigationRevision) return;
    saveCurrentDraft().catch(draftSaveFailed);
    selectedConversationID = id;
    prompt.value = "";
    localDrafts.set(id, "");
    draftRevision += 1;
    navigationPending = false;
    navigationRevision += 1;
    await refresh();
  } catch {
    setStatus("We couldn’t create a conversation. Your current draft is still here. Try again.", "warning", true);
  } finally {
    if (navigation === navigationRevision) navigationPending = false;
    creatingConversation = false;
    render();
  }
});
connectProvider.addEventListener("click", async () => {
  if (shutdownFrozen) return;
  if (!host?.configureProvider) return setStatus("This host cannot configure providers yet.", "warning");
  const kind = providerKind.value;
  const executablePath = providerPath.value.trim();
  const model = providerModel.value.trim() || null;
  try {
    const configured = { id: `${kind}:local`, kind, executablePath, model, timeoutMs: 120000 };
    await host.configureProvider(configured, true);
    globalThis.dispatchEvent(new CustomEvent("rivune:provider-configured", { detail: configured }));
    setStatus(`${kind === "codex" ? "Codex" : "Claude"} was configured. Sign-in and provider readiness still need verification.`, "quiet", true);
    await refresh();
  } catch (error) {
    const raw = error.message ?? String(error);
    const detail = executablePath.startsWith("/") ? raw : "Choose the full path to a supported provider app or command.";
    setStatus(detail, "warning", true);
  }
});

function describeImportIssue(issue) {
  const labels = {
    "invalid-or-ambiguous-json": "is not valid legacy JSON",
    "history-not-array": "does not contain a conversation list",
    "invalid-conversation": "contains an unreadable conversation",
    "invalid-turn": "contains an unreadable message",
    "source-too-large": "is larger than the 32 MB per-file limit",
    "import-too-large": "pushes the selection over the 64 MB total limit",
    "duplicate-source-kind": "was selected more than once",
    "history-source-selection-required": "requires the primary history file too",
  };
  return `${issue.source} ${labels[issue.code] ?? `needs attention (${issue.code})`}`;
}

function clearImportReview() {
  importSelectionRevision += 1;
  reviewedImportFingerprint = null;
  confirmImport.hidden = true;
  importPreview.textContent = "Files changed. Review the selection again before importing.";
  importPreview.dataset.tone = "quiet";
}

function setImportInputsDisabled(disabled) {
  for (const input of importInputs) input.disabled = disabled;
}

for (const input of importInputs) input.addEventListener("change", clearImportReview);

previewImport.addEventListener("click", async () => {
  if (!host?.previewLegacyImport) {
    importPreview.textContent = "Legacy import is unavailable in this build.";
    importPreview.dataset.tone = "warning";
    return;
  }
  const selected = importInputs.filter(input => input.files?.[0]);
  if (!selected.some(input => input.dataset.importKind === "history")) {
    importPreview.textContent = "Choose the primary conversation history file first.";
    importPreview.dataset.tone = "warning";
    return;
  }
  const revision = ++importSelectionRevision;
  const maxSourceBytes = 32 * 1024 * 1024;
  const maxTotalBytes = 64 * 1024 * 1024;
  let totalBytes = 0;
  for (const input of selected) {
    const size = input.files[0].size;
    if (!Number.isSafeInteger(size) || size < 0 || size > maxSourceBytes) {
      importPreview.textContent = "Nothing was read. Every legacy file must be 32 MB or smaller.";
      importPreview.dataset.tone = "warning";
      return;
    }
    totalBytes += size;
    if (totalBytes > maxTotalBytes) {
      importPreview.textContent = "Nothing was read. The selected legacy files exceed the 64 MB total limit.";
      importPreview.dataset.tone = "warning";
      return;
    }
  }
  previewImport.disabled = true;
  setImportInputsDisabled(true);
  confirmImport.hidden = true;
  reviewedImportFingerprint = null;
  importPreview.textContent = "Reviewing the selected files on this device…";
  importPreview.dataset.tone = "quiet";
  try {
    const sources = [];
    for (const input of selected) {
      const bytes = new Uint8Array(await input.files[0].arrayBuffer());
      if (revision !== importSelectionRevision) return;
      sources.push({ kind: input.dataset.importKind, bytes: Array.from(bytes) });
    }
    const result = await host.previewLegacyImport(sources);
    if (revision !== importSelectionRevision) return;
    const blocking = result.issues.filter(issue => issue.blocking);
    if (!result.reviewable || blocking.length) {
      importPreview.textContent = `Nothing was imported. ${blocking.map(describeImportIssue).join("; ") || "The selected files need attention."}`;
      importPreview.dataset.tone = "warning";
      return;
    }
    reviewedImportFingerprint = result.fingerprint;
    const notices = result.issues.filter(issue => !issue.blocking).length;
    importPreview.textContent = `Ready to activate ${result.conversationCount} read-only conversation${result.conversationCount === 1 ? "" : "s"}, ${result.answerCount} answer${result.answerCount === 1 ? "" : "s"}, and ${result.activatedDraftCount} matched draft${result.activatedDraftCount === 1 ? "" : "s"}. Archive only: ${result.projectCount} project${result.projectCount === 1 ? "" : "s"}, ${result.archiveOnlyDraftCount} unmatched draft${result.archiveOnlyDraftCount === 1 ? "" : "s"}, ${result.attachmentCount} attachment${result.attachmentCount === 1 ? "" : "s"}${result.preferencesPreserved ? ", and preferences" : ""}.${notices ? ` ${notices} safety notice${notices === 1 ? "" : "s"} will remain in the archive.` : ""}`;
    importPreview.dataset.tone = "ready";
    confirmImport.hidden = false;
  } catch (error) {
    importPreview.textContent = `Nothing was imported. ${error.message ?? String(error)}`;
    importPreview.dataset.tone = "warning";
  } finally {
    previewImport.disabled = false;
    setImportInputsDisabled(false);
  }
});

confirmImport.addEventListener("click", async () => {
  if (!reviewedImportFingerprint || !host?.commitLegacyImport) return;
  const fingerprint = reviewedImportFingerprint;
  const revision = importSelectionRevision;
  confirmImport.disabled = true;
  previewImport.disabled = true;
  setImportInputsDisabled(true);
  try {
    const result = await host.commitLegacyImport(fingerprint);
    if (revision !== importSelectionRevision) return;
    reviewedImportFingerprint = null;
    confirmImport.hidden = true;
    importPreview.textContent = result.state === "already-imported"
      ? "These exact files were already imported. No duplicate was created."
      : `Imported ${result.conversationCount} conversation${result.conversationCount === 1 ? "" : "s"}. Original files are preserved privately; imported messages remain read-only.`;
    importPreview.dataset.tone = "ready";
    selectedConversationID = null;
    await refresh();
  } catch (error) {
    importPreview.textContent = error.message ?? String(error);
    importPreview.dataset.tone = "warning";
  } finally {
    confirmImport.disabled = false;
    previewImport.disabled = false;
    setImportInputsDisabled(false);
  }
});
cancel.addEventListener("click", async () => {
  const requestID = cancel.dataset.runId;
  if (!requestID || !host?.cancelRun) return;
  const acknowledgement = parseAcknowledgement(await host.cancelRun(requestID), requestID);
  setStatus(acknowledgement.state === "accepted" ? "Stopping this local task…" : acknowledgement.error ?? "Could not stop this task.", acknowledgement.state === "accepted" ? "ready" : "warning");
  await refresh();
});
retryRun.addEventListener("click", async () => {
  const sourceRunID = retryRun.dataset.runId;
  const sourceRun = snapshot?.runs?.find(run => run.id === sourceRunID);
  const importedSource = sourceRun?.admitted?.provider?.kind === "imported" || sourceRun?.admitted?.mode?.startsWith("imported-read-only");
  if (!sourceRunID || importedSource || !host?.retryRun || shutdownFrozen || retryPreparing || submissionPreparing || gate.pending || gate.unresolvedRequestID || unresolvedRetry) return;
  retryPreparing = true;
  const requestID = crypto.randomUUID();
  persistRetryUnresolved({ id: requestID, sourceRunID });
  render();
  try {
    const acknowledgement = parseAcknowledgement(await host.retryRun(sourceRunID, requestID), requestID);
    if (shutdownFrozen) return;
    if (acknowledgement.state === "accepted") {
      persistRetryUnresolved(null);
      setStatus("Retry admitted with the original context.", "ready");
      await refresh();
    } else if (acknowledgement.state === "rejected") {
      persistRetryUnresolved(null);
      setStatus(acknowledgement.error ?? "Retry was rejected. No provider was started.", "warning", true);
      await refresh();
    } else {
      setStatus("We haven’t confirmed whether the retry started. Check request status before sending again.", "warning", true);
    }
  } catch (error) {
    setStatus(`${error.message ?? String(error)} Check request status before trying again.`, "warning", true);
  } finally {
    retryPreparing = false;
    render();
  }
});
reconcile.addEventListener("click", async () => {
  reconcile.disabled = true;
  try {
    if (unresolvedRetry) {
      const requestID = unresolvedRetry.id;
      const acknowledgement = parseAcknowledgement(await host.reconcileRun(requestID), requestID);
      if (shutdownFrozen) return;
      if (acknowledgement.state === "uncertain") {
        setStatus(`Retry ${requestID} is still uncertain.`, "warning", true);
      } else {
        persistRetryUnresolved(null);
        setStatus(
          acknowledgement.state === "accepted" ? "The host confirmed the retry state." : acknowledgement.error ?? "The retry was rejected; no new provider request was started.",
          acknowledgement.state === "accepted" ? "ready" : "warning",
          acknowledgement.state !== "accepted",
        );
        await refresh();
      }
      return;
    }
    const acknowledgement = await gate.reconcile();
    if (shutdownFrozen) return;
    if (!acknowledgement || acknowledgement.state === "uncertain") {
      setStatus(`Request ${gate.unresolvedRequestID} is still uncertain.`, "warning");
    } else if (acknowledgement.state === "rejected") {
      persistUnresolved(null);
      setStatus(acknowledgement.error ?? "The host rejected the request. Your draft was preserved.", "warning");
    } else {
      await clearSubmittedDraftIfUnchanged(unresolvedDraft);
      persistUnresolved(null);
      setStatus("The host confirmed the request was accepted.", "ready");
      await refresh();
    }
  } catch (error) {
    const detail = error.cause instanceof Error ? error.cause.message : error.message;
    const unresolvedID = unresolvedRetry?.id ?? gate.unresolvedRequestID;
    setStatus(`${detail}. Request ${unresolvedID} remains preserved; retry reconciliation.`, "warning", true);
  } finally {
    render();
  }
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (shutdownFrozen || attachmentBusy || submissionPreparing || retryPreparing || gate.pending || gate.unresolvedRequestID || unresolvedRetry) return;
  const submittedConversationID = selectedConversationID;
  const submittedDraft = prompt.value;
  const submittedRevision = draftRevision;
  const submittedConversationRevision = localDraftVersions.get(submittedConversationID) ?? 0;
  if (!submittedDraft.trim()) return setStatus("Enter a message before sending.", "warning");
  const recovery = { id: crypto.randomUUID(), conversationID: submittedConversationID, prompt: submittedDraft, mode: "direct", draft: submittedDraft, revision: submittedRevision, conversationRevision: submittedConversationRevision, requestID: null };
  submissionPreparing = true;
  render();
  try {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
    const richDraftRevision = await saveDraft(submittedConversationID, submittedDraft, submittedConversationRevision);
    const submittedIDs = [...richState(submittedConversationID).attachmentIDs];
    if (submittedIDs.length) {
      const validation = await host.validateDraftAttachments(submittedConversationID, richDraftRevision);
      if (validation?.conversationID !== submittedConversationID || validation.revision !== richDraftRevision || !Array.isArray(validation.attachments) || validation.attachments.length !== submittedIDs.length || submittedIDs.some(id => !validation.attachments.some(a => a.attachmentID === id && a.sourceState === "valid"))) throw new Error("A selected file changed or is unavailable. Remove it or choose and review it again.");
    }
    recovery.richDraftRevision = richDraftRevision;
    recovery.attachmentIDs = [...submittedIDs];
    recovery.selection = structuredClone(richState(submittedConversationID).selection);
    recovery.team = structuredClone(richState(submittedConversationID).team);
    persistUnresolved(recovery);
    const acknowledgement = await gate.submit({ conversationID: submittedConversationID, prompt: submittedDraft, id: recovery.id, richDraftRevision });
    if (shutdownFrozen) return;
    if (acknowledgement.state === "accepted") {
      persistUnresolved(null);
      await clearSubmittedDraftIfUnchanged(recovery);
      await refresh();
    } else if (acknowledgement.state === "rejected") {
      persistUnresolved(null);
      setStatus(acknowledgement.error ?? "The host rejected the request. Your draft was preserved.", "warning");
    } else {
      persistUnresolved({ ...recovery, id: acknowledgement.requestID, requestID: acknowledgement.requestID });
      setStatus("We haven’t confirmed whether your request started. Check request status before sending again.", "warning");
    }
  } catch (error) {
    if (gate.unresolvedRequestID && !unresolvedDraft) {
      persistUnresolved({ ...recovery, id: gate.unresolvedRequestID, requestID: gate.unresolvedRequestID });
    }
    setStatus(`${error.message ?? String(error)} Your draft was preserved; nothing was silently retried.`, "warning", true);
  } finally {
    submissionPreparing = false;
    render();
  }
});

refresh();
const refreshTimer = setInterval(() => { if (host) refresh(); }, 750);
refreshTimer?.unref?.();

async function openWorkspaceConversation(conversationID) {
        if (shutdownFrozen) return;
        const navigation = ++navigationRevision;
        navigationPending = true;
        try {
          await host.openConversation(conversationID);
          if (shutdownFrozen) return;
          const incoming = parseSnapshot(await host.getSnapshot());
          if (shutdownFrozen || navigation !== navigationRevision) return;
          saveCurrentDraft().catch(draftSaveFailed);
          selectedConversationID = conversationID;
          snapshot = incoming;
          restoreDraft(conversationID, snapshot);
          navigationPending = false;
          navigationRevision += 1;
          render();
        } catch {
          if (navigation === navigationRevision) setStatus("We couldn’t open that conversation. Your current draft is still here. Try again.", "warning", true);
        } finally {
          if (navigation === navigationRevision) navigationPending = false;
        }

}

function renderProjects() {
  const projects = snapshot?.projects ?? [];
  const signature = JSON.stringify([projects, snapshot?.activeProjectID]);
  if (signature !== projectSignature) {
    const focusedProject = document.activeElement?.dataset.projectKey;
    projectList.replaceChildren();
    for (const project of projects) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "conversation";
      button.textContent = project.name;
      button.dataset.projectKey = `select:${project.id}`;
      button.setAttribute("aria-pressed", String(project.id === snapshot?.activeProjectID));
      button.addEventListener("click", () => selectWorkspaceProject(project.id));
      const row = document.createElement("div"); row.className = "project-sidebar-row";
      const edit = document.createElement("button"); edit.type = "button"; edit.className = "text-button";
      edit.dataset.projectKey = `edit:${project.id}`;
      edit.textContent = "···"; edit.setAttribute("aria-label", `Edit project ${project.name}`);
      edit.addEventListener("click", () => openProjectEditor(project.id));
      row.append(button, edit); projectList.append(row);
    }
    projectSignature = signature;
    if (focusedProject) [...projectList.querySelectorAll("button")].find(b => b.dataset.projectKey === focusedProject)?.focus();
  }
  const busy = shutdownFrozen || projectMutationPending || navigationPending || creatingConversation;
  document.querySelector("#new-project").disabled = busy || !host?.createProject || !snapshot;
  document.querySelector("#all-projects").disabled = busy || !host?.selectProject || !snapshot;
  document.querySelector("#all-projects").setAttribute("aria-pressed", String(!snapshot?.activeProjectID));
  for (const button of projectList.querySelectorAll("button")) button.disabled = busy || !host?.selectProject;
  const conversation = snapshot?.conversations.find(c => c.id === selectedConversationID);
  const project = projects.find(p => p.id === conversation?.projectID);
  const filter = projects.find(p => p.id === snapshot?.activeProjectID);
  document.querySelector(".aside-title .local-label").textContent = filter ? `In ${filter.name}` : "On this device";
  newConversation.title = filter ? `New conversation in ${filter.name}` : "New conversation without a project";
  document.querySelector("#project-context").hidden = !project;
  document.querySelector("#project-context-label").textContent = project ? `Project · ${project.name}` : "";
  document.querySelector("#edit-project").disabled = busy || !host?.updateProject;
  const organize = document.querySelector("#organize-conversation");
  organize.hidden = !conversation || conversation.readOnly || !host?.moveConversationToProject;
  organize.disabled = busy;
  const linked = projects.find(p => p.id === conversation?.projectID);
  organize.textContent = linked ? `In ${linked.name} · Move` : "Move to project";
}

async function mutateProject(action, onError) {
  if (shutdownFrozen || projectMutationPending || navigationPending || creatingConversation) return false;
  const focusKey = document.activeElement?.dataset.projectKey;
  projectMutationPending = true; render();
  try {
    await action();
    await refresh();
    return true;
  } catch (error) {
    onError(error.message ?? String(error));
    return false;
  } finally {
    projectMutationPending = false; render();
    if (focusKey && (!document.activeElement || document.activeElement === document.body)) {
      [...projectList.querySelectorAll("button")].find(b => b.dataset.projectKey === focusKey)?.focus();
    }
  }
}
async function selectWorkspaceProject(id) {
  if (!host?.selectProject) return;
  await mutateProject(() => host.selectProject(id), message => setStatus(`Could not select the project: ${message}`, "warning", true));
}
function openProjectEditor(id = null) {
  if (shutdownFrozen || projectMutationPending) return;
  const saved = snapshot?.projects?.find(p => p.id === id);
  if (id && !saved) return;
  editingProjectID = id;
  if (!id && !newProjectID) newProjectID = crypto.randomUUID();
  const draft = projectDrafts.get(id ?? "new") ?? saved ?? { name: "", instructions: "" };
  projectName.value = draft.name; projectInstructions.value = draft.instructions;
  document.querySelector("#project-dialog-title").textContent = id ? "Edit project" : "New project";
  projectEditorStatus.textContent = projectDrafts.has(id ?? "new") ? "Your unsaved edits are restored." : "";
  projectOpener = document.activeElement;
  projectDialog.showModal(); projectName.focus();
}
function rememberProjectEditor() {
  const key = editingProjectID ?? "new";
  const value = { name: projectName.value, instructions: projectInstructions.value };
  const saved = snapshot?.projects?.find(p => p.id === editingProjectID) ?? { name: "", instructions: "" };
  if (saved.name === value.name && saved.instructions === value.instructions) projectDrafts.delete(key);
  else projectDrafts.set(key, value);
}
projectName.addEventListener("input", rememberProjectEditor);
projectInstructions.addEventListener("input", rememberProjectEditor);
document.querySelector("#new-project").addEventListener("click", () => openProjectEditor());
document.querySelector("#edit-project").addEventListener("click", () => openProjectEditor(snapshot?.conversations.find(c => c.id === selectedConversationID)?.projectID));
document.querySelector("#all-projects").addEventListener("click", () => selectWorkspaceProject(null));
document.querySelector("#close-project").addEventListener("click", () => { if (!projectMutationPending) projectDialog.close(); });
projectDialog.addEventListener("cancel", event => { if (projectMutationPending) event.preventDefault(); });
projectDialog.addEventListener("close", () => {
  const liveOpener = projectOpener?.isConnected ? projectOpener : [...projectList.querySelectorAll("button")].find(b => b.dataset.projectKey === projectOpener?.dataset.projectKey);
  (liveOpener ?? document.querySelector("#new-project")).focus();
});
document.querySelector("#project-form").addEventListener("submit", async event => {
  event.preventDefault();
  const instructions = projectInstructions.value;
  const name = projectName.value.trim();
  if (!name || name.length > 256 || new TextEncoder().encode(instructions).length > 32768) {
    projectEditorStatus.textContent = "Use a name up to 256 characters and instructions up to 32 KB."; return;
  }
  const key = editingProjectID ?? "new";
  const project = { schemaVersion: 1, id: editingProjectID ?? newProjectID, name, instructions };
  const save = editingProjectID ? host?.updateProject : host?.createProject;
  if (!save) { projectEditorStatus.textContent = "Project storage is unavailable."; return; }
  rememberProjectEditor();
  if (!editingProjectID && !newProjectAdmission) newProjectAdmission = { ...project };
  const saveButton = document.querySelector("#save-project");
  saveButton.disabled = true; projectName.disabled = true; projectInstructions.disabled = true;
  const success = await mutateProject(async () => {
    const admittedProject = editingProjectID ? project : newProjectAdmission;
    try { await save(admittedProject); }
    catch (error) {
      const incoming = parseSnapshot(await host.getSnapshot());
      const persisted = incoming.projects?.find(p => p.id === admittedProject.id);
      if (persisted?.name !== admittedProject.name || persisted?.instructions !== admittedProject.instructions) throw error;
    }
    if (admittedProject.name !== project.name || admittedProject.instructions !== project.instructions) {
      editingProjectID = admittedProject.id;
      projectDrafts.delete("new");
      projectDrafts.set(editingProjectID, { name: projectName.value, instructions: projectInstructions.value });
      document.querySelector("#project-dialog-title").textContent = "Edit project";
      newProjectID = null; newProjectAdmission = null;
      throw new Error("The original project was saved. Choose Save project again to apply your newer edits.");
    }
  }, message => { projectEditorStatus.textContent = `Could not save. Your edits are still here. ${message}`; });
  saveButton.disabled = false; projectName.disabled = false; projectInstructions.disabled = false;
  if (success) { projectDrafts.delete(key); if (!editingProjectID) { newProjectID = null; newProjectAdmission = null; } projectDialog.close(); }
});
const moveDialog = document.querySelector("#move-project-dialog");
document.querySelector("#close-move-project").addEventListener("click", () => moveDialog.close());
document.querySelector("#organize-conversation").addEventListener("click", () => {
  const conversationID = selectedConversationID;
  const options = document.querySelector("#move-project-options"); options.replaceChildren();
  const message = document.querySelector("#move-project-status"); message.textContent = "";
  for (const project of [{ id: null, name: "No project" }, ...(snapshot?.projects ?? [])]) {
    const button = document.createElement("button"); button.type = "button"; button.className = "secondary"; button.textContent = project.name;
    button.addEventListener("click", async () => {
      for (const option of options.children) option.disabled = true;
      const success = await mutateProject(() => host.moveConversationToProject(conversationID, project.id), error => { message.textContent = `Could not move: ${error}`; });
      for (const option of options.children) option.disabled = false;
      if (success) moveDialog.close();
    });
    options.append(button);
  }
  moveDialog.showModal();
});
searchInput.addEventListener("input", () => {
  const revision = ++searchRevision; clearTimeout(searchTimer);
  const query = searchInput.value.trim(); searchResults.replaceChildren(); searchResults.hidden = !query;
  searchStatus.textContent = "";
  if (!query) return;
  if (new TextEncoder().encode(query).length > 256) { searchStatus.textContent = "Use a shorter search (256 bytes maximum)."; return; }
  searchTimer = setTimeout(async () => {
    if (!host?.searchWorkspace) { searchStatus.textContent = "Title search is unavailable."; return; }
    searchStatus.textContent = "Searching titles…";
    try {
      const result = await host.searchWorkspace(query, 20);
      if (revision !== searchRevision || shutdownFrozen) return;
      searchStatus.textContent = result.matches.length ? `${result.matches.length}${result.truncated ? "+" : ""} title matches` : "No matching titles";
      for (const match of result.matches) {
        const button = document.createElement("button"); button.type = "button"; button.className = "conversation";
        button.textContent = `${match.kind === "project" ? "Project" : "Chat"} · ${match.title}${match.readOnly ? " · Read-only" : ""}`;
        button.addEventListener("click", () => match.kind === "project" ? selectWorkspaceProject(match.id) : openWorkspaceConversation(match.id));
        searchResults.append(button);
      }
    } catch { if (revision === searchRevision) searchStatus.textContent = "Search could not finish. Try again."; }
  }, 180);
});

document.querySelector("#discard-project").addEventListener("click", () => {
  if (projectMutationPending) return;
  projectDrafts.delete(editingProjectID ?? "new");
  if (!editingProjectID) { newProjectID = null; newProjectAdmission = null; }
  projectDialog.close();
});

function touchRichDraft(conversationID) {
  localDraftVersions.set(conversationID, (localDraftVersions.get(conversationID) ?? 0) + 1);
  if (conversationID === selectedConversationID) { rememberDraft(); draftRevision += 1; }
  const draft = localDrafts.get(conversationID) ?? snapshot?.conversations.find(c => c.id === conversationID)?.draft ?? "";
  dirtyDrafts.set(conversationID, { draft, revision: localDraftVersions.get(conversationID) });
  return saveDraft(conversationID, draft).catch(error => { draftSaveFailed(); throw error; });
}
function renderAttachments() {
  for (const item of snapshot?.attachments ?? []) attachmentMetadata.set(item.attachmentID, item);
  const conversation = snapshot?.conversations.find(c => c.id === selectedConversationID);
  const rich = conversation ? richState(conversation.id) : null;
  const ids = rich?.attachmentIDs ?? [];
  const signature = JSON.stringify([selectedConversationID, ids, ids.map(id => attachmentMetadata.get(id))]);
  if (signature !== attachmentSignature) {
    const focusID = document.activeElement?.dataset.attachmentAction;
    attachmentChips.replaceChildren();
    for (const id of ids) {
      const metadata = attachmentMetadata.get(id);
      const chip = document.createElement("div"); chip.className = "attachment-chip";
      const inspect = document.createElement("button"); inspect.type = "button";
      inspect.dataset.attachmentAction = `inspect:${id}`;
      inspect.textContent = metadata?.displayName ?? "Attached file";
      inspect.addEventListener("click", () => inspectAttachment(conversation.id, id));
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×";
      remove.dataset.attachmentAction = `remove:${id}`;
      remove.setAttribute("aria-label", `Remove ${metadata?.displayName ?? "attached file"}`);
      remove.addEventListener("click", async () => {
        if (shutdownFrozen || attachmentBusy) return;
        rich.attachmentIDs = rich.attachmentIDs.filter(item => item !== id);
        render(); attachButton.focus();
        try { await touchRichDraft(conversation.id); } catch { /* retained unsaved removal */ }
      });
      chip.append(inspect, remove); attachmentChips.append(chip);
    }
    attachmentSignature = signature;
    if (focusID) [...attachmentChips.querySelectorAll("button")].find(b => b.dataset.attachmentAction === focusID)?.focus();
  }
  const busy = shutdownFrozen || attachmentBusy || submissionPreparing || gate.pending || !conversation || conversation.readOnly;
  attachButton.disabled = busy || !host?.selectTextAttachments || !host?.approveTextAttachment || !host?.saveRichDraft || ids.length >= 4;
  for (const button of attachmentChips.querySelectorAll("button")) button.disabled = busy;
  const dirty = dirtyDrafts.has(selectedConversationID);
  attachmentStatus.textContent = rich?.pending ? "Draft save is pending or uncertain. Retry to confirm it." : rich?.conflictRevision != null ? "Draft save needs your attention. Your edits are retained." : dirty ? "Unsaved draft changes" : ids.length ? `${ids.length} file${ids.length === 1 ? "" : "s"} included with your next message` : "";
  document.querySelector("#retry-draft-save").hidden = !dirty && !rich?.pending && rich?.conflictRevision == null;
  document.querySelector("#retry-draft-save").disabled = shutdownFrozen || attachmentBusy || draftWrites.has(selectedConversationID);
}
function validatePreview(value, conversationID) {
  if (!value || value.conversationID !== conversationID || typeof value.text !== "string" || new TextEncoder().encode(value.text).length !== value.byteLength || value.text.includes("\0")) throw new Error("The file preview is invalid.");
  validateAttachmentMetadata({ ...value, attachmentID: value.attachmentID ?? value.selectionID, sourceState: value.sourceState ?? "valid" });
  return value;
}
function displayAttachmentPreview(preview, canApprove) {
  currentPreview = canApprove ? preview : null;
  document.querySelector("#attachment-title").textContent = preview.displayName;
  document.querySelector("#attachment-detail").textContent = `${preview.byteLength} bytes · Text file`;
  document.querySelector("#attachment-detail").title = `SHA-256 ${preview.sha256}`;
  document.querySelector("#attachment-preview").textContent = preview.text;
  document.querySelector("#approve-attachment").hidden = !canApprove;
  document.querySelector("#attachment-consent").hidden = !canApprove;
  previewStatus.textContent = "";
  if (!attachmentDialog.open) attachmentDialog.showModal();
  document.querySelector("#close-attachment").focus();
}
attachButton.addEventListener("click", async () => {
  if (shutdownFrozen || attachmentBusy || !selectedConversationID) return;
  const conversationID = selectedConversationID;
  const navigation = navigationRevision;
  attachmentBusy = true; render();
  try {
    const result = await host.selectTextAttachments(conversationID);
    if (shutdownFrozen || selectedConversationID !== conversationID || navigation !== navigationRevision) return;
    if (result?.cancelled) return;
    if (!Array.isArray(result?.previews) || result.previews.length > 4) throw new Error("File selection returned an invalid preview list.");
    previewQueue = result.previews.map(value => validatePreview(value, conversationID));
    if (previewQueue.length) displayAttachmentPreview(previewQueue.shift(), true);
    if (result.issues?.length) setStatus(`${result.issues.length} selected file(s) could not be included. Only supported text files up to 64 KB can be reviewed.`, "warning", true);
  } catch (error) { setStatus(`Files were not attached: ${error.message}`, "warning", true); }
  finally { attachmentBusy = false; render(); }
});
document.querySelector("#approve-attachment").addEventListener("click", async () => {
  if (shutdownFrozen || attachmentBusy || !currentPreview) return;
  const preview = currentPreview;
  const conversationID = preview.conversationID;
  if (conversationID !== selectedConversationID) return;
  attachmentBusy = true; document.querySelector("#approve-attachment").disabled = true; render();
  try {
    const metadata = validateAttachmentMetadata(await host.approveTextAttachment(conversationID, preview.selectionID, preview.sha256));
    if (metadata.conversationID !== conversationID || metadata.sha256 !== preview.sha256 || metadata.byteLength !== preview.byteLength) throw new Error("The approved file does not match its preview.");
    if (shutdownFrozen) return;
    const rich = richState(conversationID);
    attachmentMetadata.set(metadata.attachmentID, metadata);
    if (!rich.attachmentIDs.includes(metadata.attachmentID)) rich.attachmentIDs.push(metadata.attachmentID);
    currentPreview = null;
    await touchRichDraft(conversationID);
    if (previewQueue.length) displayAttachmentPreview(previewQueue.shift(), true);
    else attachmentDialog.close();
  } catch (error) {
    previewStatus.textContent = `Could not finish attaching: ${error.message}. Your draft is retained.`;
    if (!currentPreview) document.querySelector("#approve-attachment").hidden = true;
  } finally { attachmentBusy = false; document.querySelector("#approve-attachment").disabled = false; render(); }
});
async function inspectAttachment(conversationID, attachmentID) {
  if (shutdownFrozen || attachmentBusy || !host?.inspectTextAttachment) return;
  attachmentBusy = true; render();
  try {
    const value = validatePreview(await host.inspectTextAttachment(conversationID, attachmentID), conversationID);
    if (shutdownFrozen || selectedConversationID !== conversationID) return;
    if (value.attachmentID !== attachmentID) throw new Error("Attachment identity changed.");
    displayAttachmentPreview(value, false);
  } catch (error) { setStatus(`File preview unavailable: ${error.message}`, "warning", true); }
  finally { attachmentBusy = false; render(); }
}
document.querySelector("#close-attachment").addEventListener("click", () => { if (!attachmentBusy) attachmentDialog.close(); });
attachmentDialog.addEventListener("cancel", event => { if (attachmentBusy) event.preventDefault(); });
attachmentDialog.addEventListener("close", () => { previewQueue = []; currentPreview = null; attachButton.focus(); });
document.querySelector("#retry-draft-save").addEventListener("click", async () => {
  const id = selectedConversationID;
  if (!id || shutdownFrozen || draftWrites.has(id)) return;
  const rich = richState(id);
  try {
    if (rich.conflictRevision !== null) {
      const incoming = parseSnapshot(await host.getSnapshot());
      const conversation = incoming.conversations.find(c => c.id === id);
      if (!conversation || conversation.readOnly) throw new Error("Conversation is no longer editable.");
      rich.revision = conversation.richDraft?.revision ?? 0;
      rich.pending = null; rich.conflictRevision = null; rich.lastSaved = null;
    }
    await saveCurrentDraft();
    setStatus("Your draft and selected files are saved on this device.", "ready", true);
  } catch (error) { setStatus(`Draft save still needs attention: ${error.message}`, "warning", true); }
  finally { render(); }
});

document.querySelector("#recover-shutdown").addEventListener("click", async () => {
  if (!hostShutdownToken || shutdownPreparing || !host?.abortShutdown) return;
  const token = hostShutdownToken;
  const button = document.querySelector("#recover-shutdown"); button.disabled = true;
  try {
    await host.abortShutdown(token);
    hostShutdownToken = null;
    shutdownFrozen = false; shutdownPreparing = false;
    document.querySelector(".shell").inert = false;
    document.querySelector("#shutdown-recovery").hidden = true;
    setStatus("Rivune is open again. Your drafts are retained. Resolve any draft save before sending or quitting.", "warning", true);
    render(); prompt.focus();
  } catch (error) {
    document.querySelector("#shutdown-recovery-status").textContent = `Rivune remains paused: ${error.message ?? String(error)}. Try Keep working again when local tasks have stopped.`;
  } finally { button.disabled = false; }
});


function renderModelOptions() {
  const container = document.querySelector("#model-options");
  container.replaceChildren();
  const apply = document.querySelector("#apply-model"); apply.disabled = true;
  if (!modelCatalog || !modelEditor) return;
  const group = (label, options, selected, choose) => {
    const section = document.createElement("section"); const title = document.createElement("h3"); title.textContent = label; section.append(title);
    const list = document.createElement("div"); list.className = "model-choice-list"; list.setAttribute("role","group"); list.setAttribute("aria-label",label);
    for (const option of options) {
      const button = document.createElement("button"); button.type="button"; button.textContent=option.label; button.disabled=Boolean(option.disabled);
      button.setAttribute("aria-pressed",String(option.id === selected));
      button.addEventListener("click",()=>{choose(option.id);renderModelOptions();const buttons=[...container.querySelectorAll('button')];buttons.find(b=>b.textContent===option.label)?.focus();}); list.append(button);
    }
    section.append(list); container.append(section);
  };
  group("Provider",modelCatalog.providers.map(p=>({id:p.id,label:p.label,disabled:p.adapterState!=="supported"||p.installation==="missing"||p.authentication==="authNeeded"})),modelEditor.providerID,id=>{modelEditor.providerID=id;modelEditor.modelID=null;modelEditor.effortID=null;});
  const provider=modelCatalog.providers.find(p=>p.id===modelEditor.providerID); if(!provider)return;
  document.querySelector("#model-status").textContent = `${provider.authentication === "unknown" ? "Sign-in not verified. " : provider.authentication === "authNeeded" ? "Sign in through your provider first. " : ""}${provider.catalogState !== "available" ? "Model list is not current. " : ""}Your text and files stay with this draft.`;
  const models=provider.models.map(m=>({id:m.id,label:m.label,disabled:provider.catalogState!=="available"||m.availability!=="available"}));
  if(provider.supportsProviderDefault)models.unshift({id:null,label:"Provider default"});
  group("Model",models,modelEditor.modelID,id=>{modelEditor.modelID=id;modelEditor.effortID=null;});
  const model=provider.models.find(m=>m.id===modelEditor.modelID);
  if(model){const efforts=model.efforts.map(e=>({id:e.id,label:e.label}));if(model.supportsDefaultEffort)efforts.unshift({id:null,label:"Default reasoning"});group("Reasoning",efforts,modelEditor.effortID,id=>{modelEditor.effortID=id;});}
  const validRoute=provider.adapterState==="supported"&&provider.installation!=="missing"&&provider.authentication!=="authNeeded";
  const validChoice=modelEditor.modelID===null ? provider.supportsProviderDefault&&modelEditor.effortID===null : provider.catalogState==="available"&&model?.availability==="available"&&(modelEditor.effortID===null ? model.supportsDefaultEffort : model.effortState==="supported"&&model.efforts.some(e=>e.id===modelEditor.effortID));
  apply.disabled=modelLoading||!validRoute||!validChoice;
}
async function loadModelChoices(refresh=false) {
  if(modelLoading)return; let loaded=false; modelLoading=true;render();
  try {
    modelCatalog=parseModelCatalog(await (refresh ? host.refreshModelCatalog(null) : host.getModelCatalog()));
    loaded=true;renderModelOptions();
  } catch(error){document.querySelector("#model-status").textContent=`Models unavailable: ${error.message}. Your saved choice is retained.`;document.querySelector("#apply-model").disabled=true;}
  finally{modelLoading=false;render();if(loaded)renderModelOptions();}
}
document.querySelector("#choose-model").addEventListener("click",async()=>{
  if(!selectedConversationID||shutdownFrozen||!host?.getModelCatalog)return;
  const choice=richState(selectedConversationID).selection;
  modelEditor={conversationID:selectedConversationID,providerID:choice?.providerID??null,modelID:choice?.modelID??null,effortID:choice?.effortID??null};
  document.querySelector("#model-dialog").showModal();await loadModelChoices();
});
document.querySelector("#refresh-models").addEventListener("click",()=>loadModelChoices(true));
document.querySelector("#close-model").addEventListener("click",()=>document.querySelector("#model-dialog").close());
document.querySelector("#model-dialog").addEventListener("close",()=>{modelEditor=null;document.querySelector("#choose-model").focus();});
document.querySelector("#apply-model").addEventListener("click",async()=>{
  if(!modelEditor||modelLoading||shutdownFrozen||modelEditor.conversationID!==selectedConversationID)return;
  const rich=richState(selectedConversationID);
  rich.selection={schemaVersion:1,providerID:modelEditor.providerID,modelID:modelEditor.modelID,effortID:modelEditor.effortID,catalogRevision:modelCatalog.revision};rich.team=null;
  document.querySelector("#apply-model").disabled=true;
  try{await touchRichDraft(selectedConversationID);document.querySelector("#model-dialog").close();}
  catch(error){document.querySelector("#model-status").textContent=`Choice retained here, but not saved: ${error.message}. Use Retry draft save.`;}
});


function renderRunActivity(run) {
  const panel=document.querySelector("#run-activity"); if(!panel)return;
  panel.hidden=!run?.activity;
  if(!run?.activity)return;
  const list=document.querySelector("#activity-entries");const error=document.querySelector("#activity-error");
  try {
    const ledger=parseRunActivity(run.activity,run);
    const signature=JSON.stringify([run.id,ledger]);
    if(list.dataset.signature===signature)return;
    list.replaceChildren();error.textContent="";
    for(const event of ledger.entries){
      // The final answer stays in the transcript; this panel shows host milestones only.
      if(event.kind==="answerDelta")continue;
      const item=document.createElement("li");item.textContent=event.summary;list.append(item);
    }
    list.dataset.signature=signature;
  }catch{list.replaceChildren();delete list.dataset.signature;error.textContent="Task activity could not be read. Retry the connection to refresh it. Your final answer and draft are retained.";}
}


// Notifications trigger an authoritative snapshot read, never a second dispatch.
// Rendering replaces the retained ledger, so duplicate delivery cannot append twice.
if (host?.onRunEvent) {
  const seenEvents = new Set(); let eventRefreshTimer = null;
  Promise.resolve(host.onRunEvent(event => {
    if (!event || event.schemaVersion !== 1 || typeof event.eventID !== "string" || event.eventID.length > 256) return;
    if (seenEvents.has(event.eventID)) return;
    seenEvents.add(event.eventID);
    if (seenEvents.size > 256) seenEvents.delete(seenEvents.values().next().value);
    if (eventRefreshTimer !== null) return;
    eventRefreshTimer = setTimeout(() => { eventRefreshTimer = null; refresh().catch(() => {}); }, 40);
  })).catch(() => { setStatus("Live task updates are unavailable. Rivune will continue checking saved task status.", "warning"); });
}
