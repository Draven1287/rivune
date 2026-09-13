import { createHostAdapter, createSubmissionGate, newestRunForConversation, parseAcknowledgement, parseSnapshot } from "./core.mjs";

const host = createHostAdapter(globalThis.__RIVUNE_DESKTOP_HOST__);
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
const answer = document.querySelector("#answer");
const providerKind = document.querySelector("#provider-kind");
const providerPath = document.querySelector("#provider-path");
const providerModel = document.querySelector("#provider-model");
const connectProvider = document.querySelector("#connect-provider");
let snapshot = null;
let selectedConversationID = null;
let draftRevision = 0;
let unresolvedDraft = null;
let draftSaveTimer = null;
let submissionPreparing = false;
let conversationSignature = "";
const recoveryKey = "rivune.pending-submission.v1";
const recoveryStorage = globalThis.localStorage ?? null;

try {
  const saved = recoveryStorage?.getItem(recoveryKey);
  if (saved) {
    unresolvedDraft = Object.freeze(JSON.parse(saved));
    gate.restoreUnresolved(unresolvedDraft);
  }
} catch { unresolvedDraft = null; }

function persistUnresolved(value) {
  unresolvedDraft = value ? Object.freeze(value) : null;
  try {
    if (unresolvedDraft) recoveryStorage?.setItem(recoveryKey, JSON.stringify(unresolvedDraft));
    else recoveryStorage?.removeItem(recoveryKey);
  } catch { /* reconciliation remains available for this process */ }
}

function clearSubmittedDraftIfUnchanged(submission) {
  if (submission && selectedConversationID === submission.conversationID && draftRevision === submission.revision && prompt.value === submission.draft) {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
    prompt.value = "";
    draftRevision += 1;
    host?.saveDraft?.(submission.conversationID, "").catch(() => {});
  }
}

function setStatus(message, tone = "quiet") {
  status.textContent = message;
  status.dataset.tone = tone;
}

function render() {
  const conversations = snapshot?.conversations ?? [];
  const nextSignature = JSON.stringify(conversations.map(({ id, title }) => [id, title]));
  if (nextSignature !== conversationSignature) {
    conversationList.replaceChildren();
    for (const conversation of conversations) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "conversation";
      button.dataset.conversationId = conversation.id;
      button.textContent = conversation.title;
      button.addEventListener("click", async () => {
        await host.openConversation(conversation.id);
        selectedConversationID = conversation.id;
        snapshot = parseSnapshot(await host.getSnapshot());
        prompt.value = snapshot.conversations.find(({ id }) => id === conversation.id)?.draft ?? "";
        draftRevision += 1;
        render();
      });
      conversationList.append(button);
    }
    conversationSignature = nextSignature;
  }
  for (const button of conversationList.children) {
    button.setAttribute("aria-pressed", String(button.dataset.conversationId === selectedConversationID));
  }

  const run = newestRunForConversation(snapshot ?? { runs: [] }, selectedConversationID);
  runStatus.textContent = run ? `Latest task: ${run.status}` : "No task status reported";
  answer.hidden = !run?.answer && !run?.error;
  answer.textContent = run?.answer ?? run?.error ?? "";
  cancel.hidden = run?.status !== "running" || typeof host?.cancelRun !== "function";
  retryRun.hidden = !run || !["failed", "cancelled"].includes(run.status) || typeof host?.retryRun !== "function";
  cancel.dataset.runId = run?.id ?? "";
  retryRun.dataset.runId = run?.id ?? "";
  const selectionIsValid = Boolean(
    host && snapshot && snapshot.conversations.some(({ id }) => id === selectedConversationID),
  );
  submit.disabled = !selectionIsValid || submissionPreparing || gate.pending || Boolean(gate.unresolvedRequestID);
  prompt.disabled = !selectionIsValid;
  reconcile.disabled = gate.pending || !gate.unresolvedRequestID;
  reconcile.hidden = !gate.unresolvedRequestID;
}

async function refresh() {
  if (!host) {
    setStatus("Desktop host not connected", "warning");
    retry.disabled = true;
    render();
    return;
  }
  try {
    snapshot = parseSnapshot(await host.getSnapshot());
    if (!snapshot.conversations.some(({ id }) => id === selectedConversationID)) {
      selectedConversationID = snapshot.conversations[0]?.id ?? null;
      prompt.value = snapshot.conversations[0]?.draft ?? "";
    }
    setStatus(snapshot.selectedProviderID ? "Connected to this device" : "Connected — select a local provider", snapshot.selectedProviderID ? "ready" : "warning");
  } catch (error) {
    snapshot = null;
    selectedConversationID = null;
    setStatus(error.message, "warning");
  }
  render();
}

retry.addEventListener("click", refresh);
prompt.addEventListener("input", () => {
  draftRevision += 1;
  clearTimeout(draftSaveTimer);
  const conversationID = selectedConversationID;
  const draft = prompt.value;
  if (conversationID && host?.saveDraft) {
    draftSaveTimer = setTimeout(() => host.saveDraft(conversationID, draft).catch((error) => setStatus(error.message, "warning")), 180);
  }
});
prompt.addEventListener("change", async () => {
  if (selectedConversationID && host?.saveDraft) await host.saveDraft(selectedConversationID, prompt.value);
});
newConversation.addEventListener("click", async () => {
  if (!host?.createConversation) return setStatus("This host cannot create conversations yet.", "warning");
  const id = crypto.randomUUID();
  await host.createConversation({ id, title: "New conversation" });
  await host.openConversation(id);
  selectedConversationID = id;
  prompt.value = "";
  draftRevision += 1;
  await refresh();
});
connectProvider.addEventListener("click", async () => {
  if (!host?.configureProvider) return setStatus("This host cannot configure providers yet.", "warning");
  const kind = providerKind.value;
  const executablePath = providerPath.value.trim();
  const model = providerModel.value.trim() || null;
  try {
    await host.configureProvider({ id: `${kind}:local`, kind, executablePath, model, timeoutMs: 120000 }, true);
    setStatus(`${kind === "codex" ? "Codex" : "Claude"} is connected through its local CLI.`, "ready");
    await refresh();
  } catch (error) {
    setStatus(error.message ?? String(error), "warning");
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
  if (!sourceRunID || !host?.retryRun) return;
  const requestID = crypto.randomUUID();
  const acknowledgement = parseAcknowledgement(await host.retryRun(sourceRunID, requestID), requestID);
  setStatus(acknowledgement.state === "accepted" ? "Retry admitted with the original context." : acknowledgement.error ?? "Retry was not admitted.", acknowledgement.state === "accepted" ? "ready" : "warning");
  await refresh();
});
reconcile.addEventListener("click", async () => {
  reconcile.disabled = true;
  try {
    const acknowledgement = await gate.reconcile();
    if (!acknowledgement || acknowledgement.state === "uncertain") {
      setStatus(`Request ${gate.unresolvedRequestID} is still uncertain.`, "warning");
    } else if (acknowledgement.state === "rejected") {
      persistUnresolved(null);
      setStatus(acknowledgement.error ?? "The host rejected the request. Your draft was preserved.", "warning");
    } else {
      clearSubmittedDraftIfUnchanged(unresolvedDraft);
      persistUnresolved(null);
      setStatus("The host confirmed the request was accepted.", "ready");
      await refresh();
    }
  } catch (error) {
    const detail = error.cause instanceof Error ? error.cause.message : error.message;
    setStatus(`${detail}. Request ${gate.unresolvedRequestID} and its draft were preserved; retry reconciliation.`, "warning");
  } finally {
    render();
  }
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submissionPreparing || gate.pending || gate.unresolvedRequestID) return;
  const submittedConversationID = selectedConversationID;
  const submittedDraft = prompt.value;
  const submittedRevision = draftRevision;
  if (!submittedDraft.trim()) return setStatus("Enter a message before sending.", "warning");
  const recovery = { id: crypto.randomUUID(), conversationID: submittedConversationID, prompt: submittedDraft.trim(), mode: "direct", draft: submittedDraft, revision: submittedRevision, requestID: null };
  submissionPreparing = true;
  render();
  try {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
    if (host?.saveDraft) await host.saveDraft(submittedConversationID, submittedDraft);
    persistUnresolved(recovery);
    const acknowledgement = await gate.submit({ conversationID: submittedConversationID, prompt: submittedDraft, id: recovery.id });
    if (acknowledgement.state === "accepted") {
      persistUnresolved(null);
      clearSubmittedDraftIfUnchanged({ conversationID: submittedConversationID, draft: submittedDraft, revision: submittedRevision });
      await refresh();
    } else if (acknowledgement.state === "rejected") {
      persistUnresolved(null);
      setStatus(acknowledgement.error ?? "The host rejected the request. Your draft was preserved.", "warning");
    } else {
      persistUnresolved({ ...recovery, id: acknowledgement.requestID, requestID: acknowledgement.requestID });
      setStatus(`Request ${acknowledgement.requestID} has an uncertain outcome. Reconcile before sending again.`, "warning");
    }
  } catch (error) {
    if (gate.unresolvedRequestID && !unresolvedDraft) {
      persistUnresolved({ ...recovery, id: gate.unresolvedRequestID, requestID: gate.unresolvedRequestID });
    }
    setStatus(`${error.message ?? String(error)} Your draft was preserved; nothing was silently retried.`, "warning");
  } finally {
    submissionPreparing = false;
    render();
  }
});

refresh();
const refreshTimer = setInterval(() => { if (host) refresh(); }, 750);
refreshTimer?.unref?.();
