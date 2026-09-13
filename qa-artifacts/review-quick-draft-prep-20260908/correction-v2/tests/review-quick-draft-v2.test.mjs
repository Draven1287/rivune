import test from "node:test";
import assert from "node:assert/strict";
import { applyDurableIfCurrent, createReviewQuickDraftController } from "../candidate/web/review-quick-draft.mjs";

class Storage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

const scope = "profile-scope";
const incarnation = "workspace-incarnation-one";
const action = (actionID, workspaceIncarnationID = incarnation) => ({ schemaVersion: 1, actionID, recoveryScopeID: scope, workspaceIncarnationID });
const durable = request => ({ state: "durable", mutationID: request.mutationID, conversationID: request.conversationID, revision: request.expectedRevision + 1, attachmentIDs: [...request.attachmentIDs] });

function harness(overrides = {}) {
  const storage = overrides.storage ?? new Storage();
  const saves = [];
  const applications = [];
  let target = overrides.target ?? {
    recoveryScopeID: scope,
    workspaceIncarnationID: incarnation,
    conversationID: "c1",
    localDraftVersion: 7,
    revision: 4,
    draft: "Existing",
    attachmentIDs: ["file-b", "file-a"],
    readOnly: false,
  };
  const controller = createReviewQuickDraftController({
    storage,
    recoveryScopeID: scope,
    workspaceIncarnationID: overrides.workspaceIncarnationID ?? incarnation,
    sessionID: overrides.sessionID ?? "session-one",
    settleCurrentDraft: overrides.settleCurrentDraft ?? (async () => {}),
    getCurrentTarget: overrides.getCurrentTarget ?? (async () => target),
    saveRichDraft: overrides.saveRichDraft ?? (async request => { saves.push(request); return durable(request); }),
    applyDurable: overrides.applyDurable ?? (async (request, receipt, guard) => applications.push({ request, receipt, guard })),
  });
  return { controller, storage, saves, applications, setTarget: value => { target = value; } };
}

test("immediate durable acknowledgement carries immutable renderer identity", async () => {
  const h = harness();
  h.controller.open(action("A"));
  h.controller.setText("Review text");
  await h.controller.add();
  assert.equal(h.controller.state.kind, "durable");
  assert.equal(h.applications.length, 1);
  assert.deepEqual(h.applications[0].guard, {
    conversationID: "c1",
    localDraftVersion: 7,
    richRevision: 4,
    draft: "Existing",
    attachmentIDs: ["file-b", "file-a"],
  });
});

test("late durable acknowledgement cannot apply over newer text, attachments, revision, or pending save", async () => {
  let applied = 0;
  let refreshed = 0;
  const guard = { conversationID: "c1", localDraftVersion: 7, richRevision: 4, draft: "Existing", attachmentIDs: ["old-file"] };
  const result = await applyDurableIfCurrent({
    guard,
    readCurrent: () => ({ conversationID: "c1", localDraftVersion: 8, richRevision: 5, draft: "NEWER", attachmentIDs: ["new-file"], pendingMutationID: "newer-save" }),
    applyCurrent: async () => { applied += 1; },
    refreshAuthoritative: async () => { refreshed += 1; },
  });
  assert.deepEqual(result, { applied: false, reason: "renderer-state-advanced" });
  assert.equal(applied, 0);
  assert.equal(refreshed, 1);
});

test("matching renderer identity applies once", async () => {
  let applied = 0;
  const guard = { conversationID: "c1", localDraftVersion: 7, richRevision: 4, draft: "Existing", attachmentIDs: ["file-a"] };
  const result = await applyDurableIfCurrent({
    guard,
    readCurrent: () => ({ conversationID: "c1", localDraftVersion: 7, richRevision: 4, draft: "Existing", attachmentIDs: ["file-a"], pendingMutationID: null }),
    applyCurrent: async () => { applied += 1; },
  });
  assert.deepEqual(result, { applied: true });
  assert.equal(applied, 1);
});

test("new tray activation cannot replace a settling action", async () => {
  let release;
  const settlement = new Promise(resolve => { release = resolve; });
  const h = harness({ settleCurrentDraft: () => settlement });
  h.controller.open(action("A"));
  h.controller.setText("Text A");
  const pending = h.controller.add();
  h.controller.open(action("B"));
  assert.equal(h.controller.state.action.actionID, "A");
  assert.equal(h.controller.state.explicitText, "Text A");
  release();
  await pending;
  assert.equal(h.saves.length, 1);
});

test("dismissal cancels settlement before host save and a later action remains intact", async () => {
  let release;
  const settlement = new Promise(resolve => { release = resolve; });
  const h = harness({ settleCurrentDraft: () => settlement });
  h.controller.open(action("A"));
  h.controller.setText("Text A");
  const pendingA = h.controller.add();
  h.controller.close();
  h.controller.open(action("B"));
  h.controller.setText("Text B");
  release();
  await pendingA;
  assert.equal(h.saves.length, 0);
  assert.equal(h.controller.state.action.actionID, "B");
  assert.equal(h.controller.state.explicitText, "Text B");
});

test("same-incarnation restart is visible but never blindly replayed", async () => {
  const storage = new Storage();
  const first = harness({ storage, sessionID: "session-old", saveRichDraft: async () => { throw new Error("lost ack"); } });
  first.controller.open(action("pending"));
  first.controller.setText("Maybe committed");
  await first.controller.add();

  const replayed = [];
  const restarted = harness({ storage, sessionID: "session-new", saveRichDraft: async request => { replayed.push(request); return durable(request); } });
  restarted.controller.restore();
  assert.equal(restarted.controller.state.kind, "blockedRecovery");
  await restarted.controller.retry();
  assert.equal(replayed.length, 0);
});

test("copied or reset profile incarnation cannot replay an old request", async () => {
  const storage = new Storage();
  const first = harness({ storage, sessionID: "session-old", saveRichDraft: async () => { throw new Error("lost ack"); } });
  first.controller.open(action("pending"));
  first.controller.setText("Original workspace text");
  await first.controller.add();

  const replayed = [];
  const clone = harness({ storage, workspaceIncarnationID: "workspace-clone", sessionID: "clone-session", saveRichDraft: async request => { replayed.push(request); return durable(request); } });
  clone.controller.restore();
  assert.equal(clone.controller.state.kind, "blockedRecovery");
  assert.match(clone.controller.state.message, /another workspace incarnation/);
  await clone.controller.retry();
  assert.equal(replayed.length, 0);
});

test("malformed recovery record fails closed instead of permitting a new append", async () => {
  const storage = new Storage();
  const h = harness({ storage });
  storage.setItem(h.controller.storageKey, "{broken");
  h.controller.restore();
  assert.equal(h.controller.state.kind, "blockedRecovery");
  h.controller.open(action("new-action"));
  assert.equal(h.controller.state.kind, "blockedRecovery");
  assert.equal(h.saves.length, 0);
});

test("same-process uncertain retry replays exact mutation and bytes", async () => {
  const attempts = [];
  const h = harness({ saveRichDraft: async request => {
    attempts.push(JSON.stringify(request));
    if (attempts.length === 1) throw new Error("lost ack");
    return durable(request);
  } });
  h.controller.open(action("same-process"));
  h.controller.setText("One append");
  await h.controller.add();
  assert.equal(h.controller.state.kind, "uncertain");
  await h.controller.retry();
  assert.equal(h.controller.state.kind, "durable");
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0], attempts[1]);
});
