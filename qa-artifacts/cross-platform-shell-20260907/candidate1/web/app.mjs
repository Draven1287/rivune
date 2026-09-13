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
let snapshot = null;
let selectedConversationID = null;

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
  submit.disabled = !host || !selectedConversationID || gate.pending;
  prompt.disabled = !host || !selectedConversationID;
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
    selectedConversationID ||= snapshot.conversations[0]?.id ?? null;
    setStatus("Connected to this device", "ready");
  } catch (error) {
    snapshot = null;
    setStatus(error.message, "warning");
  }
  render();
}

retry.addEventListener("click", refresh);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  try {
    await gate.submit({ conversationID: selectedConversationID, prompt: prompt.value });
    prompt.value = "";
    await refresh();
  } catch (error) {
    setStatus(`${error.message} Check task status before trying again.`, "warning");
  } finally {
    render();
  }
});

refresh();
