import assert from "node:assert/strict";
import { test } from "node:test";

function element() {
  return {
    disabled: false, hidden: false, value: "", textContent: "", dataset: {}, listeners: {}, children: [],
    addEventListener(kind, listener) { this.listeners[kind] = listener; },
    replaceChildren() { this.children = []; },
    append(child) { this.children.push(child); },
    setAttribute(name, value) { this[name] = value; },
  };
}

const settle = () => new Promise(setImmediate);

test("renderer gates stale state and preserves newer or rejected drafts", async () => {
  const elements = new Map();
  globalThis.document = {
    querySelector(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element,
  };
  let snapshotMode = "valid";
  let resolveSubmit;
  let rejectReconcile = false;
  const submissions = [];
  globalThis.__RIVUNE_DESKTOP_HOST__ = {
    getSnapshot: async () => snapshotMode === "valid"
      ? { schemaVersion: 1, conversations: [{ id: "c1", title: "Real conversation" }, { id: "c2", title: "Other" }], runs: [] }
      : snapshotMode === "changed"
        ? { schemaVersion: 1, conversations: [{ id: "c2", title: "Other" }], runs: [] }
        : { schemaVersion: 2 },
    openConversation: async () => {},
    submitRun: async (request) => { submissions.push(request); return new Promise((resolve) => { resolveSubmit = resolve; }); },
    reconcileRun: async (requestID) => {
      if (rejectReconcile) throw new Error("host temporarily unavailable");
      return { state: "accepted", requestID };
    },
  };

  await import(`../web/app.mjs?test=${Date.now()}`);
  await settle();
  const get = (id) => elements.get(id);
  assert.equal(get("#submit").disabled, false);

  snapshotMode = "invalid";
  await get("#retry").listeners.click();
  assert.equal(get("#submit").disabled, true, "invalid refresh must revoke submission admission");

  snapshotMode = "valid";
  await get("#retry").listeners.click();
  get("#prompt").value = "original";
  get("#prompt").listeners.input();
  const accepted = get("#prompt-form").listeners.submit({ preventDefault() {} });
  await settle();
  get("#prompt").value = "new unsent draft";
  get("#prompt").listeners.input();
  resolveSubmit({ state: "accepted", requestID: submissions.at(-1).id });
  await accepted;
  assert.equal(get("#prompt").value, "new unsent draft", "accepted older revision must not erase a newer draft");

  get("#prompt").value = "rejected request must remain";
  get("#prompt").listeners.input();
  const rejected = get("#prompt-form").listeners.submit({ preventDefault() {} });
  await settle();
  resolveSubmit({ state: "rejected", requestID: submissions.at(-1).id, error: "not ready" });
  await rejected;
  assert.equal(get("#prompt").value, "rejected request must remain");

  get("#prompt").value = "uncertain request must remain";
  get("#prompt").listeners.input();
  const uncertain = get("#prompt-form").listeners.submit({ preventDefault() {} });
  await settle();
  const uncertainID = submissions.at(-1).id;
  resolveSubmit({ state: "uncertain", requestID: uncertainID });
  await uncertain;
  assert.equal(get("#prompt").value, "uncertain request must remain");
  assert.equal(get("#reconcile").hidden, false);
  assert.match(get("#connection-status").textContent, new RegExp(uncertainID));
  rejectReconcile = true;
  await get("#reconcile").listeners.click();
  assert.equal(get("#prompt").value, "uncertain request must remain");
  assert.match(get("#connection-status").textContent, /temporarily unavailable/);
  assert.match(get("#connection-status").textContent, new RegExp(uncertainID));
  assert.equal(get("#reconcile").hidden, false);
  assert.equal(get("#reconcile").disabled, false);
  rejectReconcile = false;
  await get("#reconcile").listeners.click();
  assert.equal(get("#prompt").value, "", "confirmed acceptance consumes only the unchanged uncertain draft");

  get("#prompt").value = "original uncertain draft";
  get("#prompt").listeners.input();
  const changedUncertain = get("#prompt-form").listeners.submit({ preventDefault() {} });
  await settle();
  resolveSubmit({ state: "uncertain", requestID: submissions.at(-1).id });
  await changedUncertain;
  get("#prompt").value = "edited after uncertain acknowledgement";
  get("#prompt").listeners.input();
  await get("#reconcile").listeners.click();
  assert.equal(get("#prompt").value, "edited after uncertain acknowledgement", "reconciliation must preserve a newer revision");

  get("#prompt").value = "draft submitted from c1";
  get("#prompt").listeners.input();
  const switched = get("#prompt-form").listeners.submit({ preventDefault() {} });
  await settle();
  resolveSubmit({ state: "uncertain", requestID: submissions.at(-1).id });
  await switched;
  await get("#conversations").children[1].listeners.click();
  get("#prompt").value = "draft now belongs to the newly selected context";
  get("#prompt").listeners.input();
  await get("#reconcile").listeners.click();
  assert.equal(get("#prompt").value, "draft now belongs to the newly selected context", "old-conversation acceptance must not clear current context");

  snapshotMode = "changed";
  await get("#retry").listeners.click();
  assert.equal(get("#submit").disabled, false, "removed selection must rebase to a current conversation");
  assert.equal(get("#conversations").children[0]["aria-pressed"], "true");

  get("#prompt").value = "accepted unchanged draft";
  get("#prompt").listeners.input();
  const finalAccepted = get("#prompt-form").listeners.submit({ preventDefault() {} });
  await settle();
  resolveSubmit({ state: "accepted", requestID: submissions.at(-1).id });
  await finalAccepted;
  assert.equal(get("#prompt").value, "", "only the unchanged accepted revision is cleared");
});
