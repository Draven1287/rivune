import test from "node:test";
import assert from "node:assert/strict";
import { createReviewQuickDraftController } from "../candidate/web/review-quick-draft.mjs";

class Storage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

const scope = "profile-scope";
const incarnation = "workspace-incarnation";
const event = actionID => ({ schemaVersion: 1, actionID, recoveryScopeID: scope, workspaceIncarnationID: incarnation });
const target = {
  recoveryScopeID: scope,
  workspaceIncarnationID: incarnation,
  conversationID: "c1",
  localDraftVersion: 2,
  revision: 3,
  draft: "Base",
  attachmentIDs: [],
  readOnly: false,
};

function controller(overrides = {}) {
  const saves = [];
  const value = createReviewQuickDraftController({
    storage: new Storage(),
    recoveryScopeID: scope,
    workspaceIncarnationID: incarnation,
    sessionID: "session-current",
    settleCurrentDraft: overrides.settleCurrentDraft ?? (async () => {}),
    getCurrentTarget: overrides.getCurrentTarget ?? (async () => target),
    saveRichDraft: async request => { saves.push(request); throw new Error("not expected"); },
    applyDurable: async () => {},
  });
  return { value, saves };
}

test("stale settlement rejection cannot restore dismissed action A over action B", async () => {
  let rejectSettlement;
  const settlement = new Promise((_, reject) => { rejectSettlement = reject; });
  const h = controller({ settleCurrentDraft: () => settlement });
  h.value.open(event("A"));
  h.value.setText("Text A");
  const pendingA = h.value.add();
  h.value.close();
  h.value.open(event("B"));
  h.value.setText("Text B");
  rejectSettlement(new Error("A settlement failed late"));
  await pendingA;
  assert.equal(h.value.state.kind, "editing");
  assert.equal(h.value.state.action.actionID, "B");
  assert.equal(h.value.state.explicitText, "Text B");
  assert.equal(h.saves.length, 0);
});

test("stale target-acquisition rejection cannot restore dismissed action A over action B", async () => {
  let rejectTarget;
  let markTargetStarted;
  const targetStarted = new Promise(resolve => { markTargetStarted = resolve; });
  const targetResult = new Promise((_, reject) => { rejectTarget = reject; });
  const h = controller({ getCurrentTarget: () => { markTargetStarted(); return targetResult; } });
  h.value.open(event("A"));
  h.value.setText("Text A");
  const pendingA = h.value.add();
  await targetStarted;
  h.value.close();
  h.value.open(event("B"));
  h.value.setText("Text B");
  rejectTarget(new Error("A target failed late"));
  await pendingA;
  assert.equal(h.value.state.kind, "editing");
  assert.equal(h.value.state.action.actionID, "B");
  assert.equal(h.value.state.explicitText, "Text B");
  assert.equal(h.saves.length, 0);
});

test("current action rejection still restores its own editable text and error", async () => {
  const h = controller({ settleCurrentDraft: async () => { throw new Error("Current save failed"); } });
  h.value.open(event("A"));
  h.value.setText("Keep this text");
  await h.value.add();
  assert.equal(h.value.state.kind, "editing");
  assert.equal(h.value.state.action.actionID, "A");
  assert.equal(h.value.state.explicitText, "Keep this text");
  assert.equal(h.value.state.message, "Current save failed");
});
