import { createHostAdapter, createSubmissionGate, newestRunForConversation, parseSnapshot } from "./core.mjs";

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
let snapshot = null;
let selectedConversationID = null;
let draftRevision = 0;

function setStatus(message, tone = "quiet") {
  status.textContent = message;
  status.dataset.tone = tone;
}

function render() {
  conversationList.replaceChildren();
  const conversations = snapshot?.conversations ?? [];
  for (const conversation of conversations) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "conversation";
    button.textContent = conversation.title;
    button.setAttribute("aria-pressed", String(conversation.id === selectedConversationID));
    button.addEventListener("click", async () => {
      await host.openConversation(conversation.id);
      selectedConversationID = conversation.id;
      render();
    });
    conversationList.append(button);
  }

  const run = newestRunForConversation(snapshot ?? { runs: [] }, selectedConversationID);
  runStatus.textContent = run ? `Latest task: ${run.status}` : "No task status reported";
  const selectionIsValid = Boolean(
    host && snapshot && snapshot.conversations.some(({ id }) => id === selectedConversationID),
  );
  submit.disabled = !selectionIsValid || gate.pending || Boolean(gate.unresolvedRequestID);
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
    }
    setStatus("Connected to this device", "ready");
  } catch (error) {
    snapshot = null;
    selectedConversationID = null;
    setStatus(error.message, "warning");
  }
  render();
}

retry.addEventListener("click", refresh);
prompt.addEventListener("input", () => { draftRevision += 1; });
reconcile.addEventListener("click", async () => {
  const acknowledgement = await gate.reconcile();
  if (!acknowledgement || acknowledgement.state === "uncertain") {
    setStatus(`Request ${gate.unresolvedRequestID} is still uncertain.`, "warning");
  } else if (acknowledgement.state === "rejected") {
    setStatus(acknowledgement.error ?? "The host rejected the request. Your draft was preserved.", "warning");
  } else {
    setStatus("The host confirmed the request was accepted.", "ready");
    await refresh();
  }
  render();
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submittedConversationID = selectedConversationID;
  const submittedDraft = prompt.value;
  const submittedRevision = draftRevision;
  submit.disabled = true;
  try {
    const acknowledgement = await gate.submit({ conversationID: submittedConversationID, prompt: submittedDraft });
    if (acknowledgement.state === "accepted") {
      if (selectedConversationID === submittedConversationID && draftRevision === submittedRevision && prompt.value === submittedDraft) {
        prompt.value = "";
        draftRevision += 1;
      }
      await refresh();
    } else if (acknowledgement.state === "rejected") {
      setStatus(acknowledgement.error ?? "The host rejected the request. Your draft was preserved.", "warning");
    } else {
      setStatus(`Request ${acknowledgement.requestID} has an uncertain outcome. Reconcile before sending again.`, "warning");
    }
  } catch (error) {
    setStatus(error.message, "warning");
  } finally {
    render();
  }
});

refresh();
