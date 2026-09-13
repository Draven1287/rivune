import test from "node:test";
import assert from "node:assert/strict";
import { createReviewQuickDraftController } from "../source/web/review-quick-draft.mjs";

class Storage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

const scope = "profile-2f4f97c7";
const event = (actionID = "a-0001", recoveryScopeID = scope) => ({ schemaVersion: 1, actionID, recoveryScopeID });
const durable = request => ({ state: "durable", mutationID: request.mutationID, conversationID: request.conversationID, revision: request.expectedRevision + 1, attachmentIDs: [...request.attachmentIDs] });

function harness(overrides = {}) {
  const storage = overrides.storage ?? new Storage();
  const saves = [];
  const applied = [];
  let target = overrides.target ?? { recoveryScopeID: scope, conversationID: "c1", revision: 4, draft: "Existing draft", attachmentIDs: ["file-b", "file-a"], readOnly: false };
  let frozen = false;
  const controller = createReviewQuickDraftController({
    storage,
    recoveryScopeID: overrides.scope ?? scope,
    settleCurrentDraft: overrides.settleCurrentDraft ?? (async () => {}),
    getCurrentTarget: overrides.getCurrentTarget ?? (async () => target),
    saveRichDraft: overrides.saveRichDraft ?? (async request => { saves.push(request); return durable(request); }),
    parseReceipt: value => value,
    applyDurable: async (request, receipt) => applied.push({ request, receipt }),
    isFrozen: () => frozen,
  });
  return { controller, storage, saves, applied, setTarget: value => { target = value; }, freeze: value => { frozen = value; } };
}

test("appends explicit text after the existing draft and preserves attachment order", async () => {
  const h = harness();
  h.controller.open(event());
  h.controller.setText("  Review this paragraph.  ");
  await h.controller.add();
  assert.equal(h.controller.state.kind, "durable");
  assert.equal(h.saves.length, 1);
  assert.deepEqual(h.saves[0], {
    conversationID: "c1",
    mutationID: "review:a-0001",
    expectedRevision: 4,
    draft: "Existing draft\n\nReview this paragraph.",
    attachmentIDs: ["file-b", "file-a"],
  });
  assert.equal(h.applied.length, 1);
});

test("duplicate tray event does not reset typed text or create a second save", async () => {
  const h = harness();
  h.controller.open(event());
  h.controller.setText("Keep me");
  h.controller.open(event());
  assert.equal(h.controller.state.explicitText, "Keep me");
  await h.controller.add();
  h.controller.open(event());
  assert.equal(h.saves.length, 1);
  assert.equal(h.controller.state.kind, "durable");
});

test("target is chosen only after current draft settlement", async () => {
  const order = [];
  const h = harness({
    settleCurrentDraft: async () => order.push("settled"),
    getCurrentTarget: async () => { order.push("read-target"); return { recoveryScopeID: scope, conversationID: "fresh", revision: 8, draft: "After navigation", attachmentIDs: [], readOnly: false }; },
  });
  h.controller.open(event());
  h.controller.setText("Add");
  await h.controller.add();
  assert.deepEqual(order, ["settled", "read-target"]);
  assert.equal(h.saves[0].conversationID, "fresh");
  assert.equal(h.saves[0].draft, "After navigation\n\nAdd");
});

test("stale or read-only target is rejected without a save", async () => {
  for (const target of [
    { recoveryScopeID: scope, conversationID: "c1", revision: 1, draft: "x", attachmentIDs: [], readOnly: true },
    { recoveryScopeID: scope, conversationID: "c1", revision: 1, draft: "x", attachmentIDs: [], archived: true },
    { recoveryScopeID: scope, conversationID: "c1", revision: 1, draft: "x", attachmentIDs: [], pending: {} },
  ]) {
    const h = harness({ target });
    h.controller.open(event());
    h.controller.setText("Add");
    await h.controller.add();
    assert.equal(h.controller.state.kind, "editing");
    assert.equal(h.saves.length, 0);
  }
});

test("uncertain save freezes its full payload and retry replays identical bytes", async () => {
  const storage = new Storage();
  const saves = [];
  const h = harness({ storage, saveRichDraft: async request => { saves.push(JSON.stringify(request)); if (saves.length === 1) throw new Error("lost ack"); return durable(request); } });
  h.controller.open(event());
  h.controller.setText("Original text");
  await h.controller.add();
  assert.equal(h.controller.state.kind, "uncertain");
  h.controller.setText("Changed after uncertainty");
  assert.equal(h.controller.state.request.draft, "Existing draft\n\nOriginal text");
  await h.controller.retry();
  assert.equal(h.controller.state.kind, "durable");
  assert.equal(saves.length, 2);
  assert.equal(saves[0], saves[1]);
});

test("restart restores uncertain identity but performs no automatic save", async () => {
  const storage = new Storage();
  const first = harness({ storage, saveRichDraft: async () => { throw new Error("connection lost"); } });
  first.controller.open(event("restart-action"));
  first.controller.setText("One append");
  await first.controller.add();
  assert.equal(first.controller.state.kind, "uncertain");

  const replayed = [];
  const second = harness({ storage, saveRichDraft: async request => { replayed.push(request); return durable(request); } });
  second.controller.restore();
  assert.equal(second.controller.state.kind, "uncertain");
  assert.equal(replayed.length, 0);
  await second.controller.retry();
  assert.equal(replayed.length, 1);
  assert.equal(replayed[0].mutationID, "review:restart-action");
  assert.equal(replayed[0].draft, "Existing draft\n\nOne append");
});

test("another profile cannot restore or target a pending Review action", async () => {
  const storage = new Storage();
  const first = harness({ storage, saveRichDraft: async () => { throw new Error("lost ack"); } });
  first.controller.open(event("scoped"));
  first.controller.setText("Private text");
  await first.controller.add();

  const other = harness({ storage, scope: "profile-other" });
  other.controller.restore();
  assert.equal(other.controller.state.kind, "idle");
  other.controller.open(event("cross", scope));
  assert.equal(other.controller.state.kind, "blocked");
});

test("shutdown/recovery freeze blocks admission and retry", async () => {
  const h = harness({ saveRichDraft: async () => { throw new Error("lost ack"); } });
  h.freeze(true);
  h.controller.open(event());
  assert.equal(h.controller.state.kind, "blocked");
  h.freeze(false);
  h.controller.open(event());
  h.controller.setText("Add");
  await h.controller.add();
  h.freeze(true);
  const before = h.saves.length;
  await h.controller.retry();
  assert.equal(h.saves.length, before);
});

test("combined UTF-8 draft limit includes delimiter and never truncates", async () => {
  const maxDraftBytes = 128 * 1024;
  const h = harness({ target: { recoveryScopeID: scope, conversationID: "c1", revision: 0, draft: "x".repeat(maxDraftBytes - 1), attachmentIDs: [], readOnly: false } });
  h.controller.open(event());
  h.controller.setText("é");
  await h.controller.add();
  assert.equal(h.controller.state.kind, "editing");
  assert.match(h.controller.state.message, /128 KiB/);
  assert.equal(h.saves.length, 0);
});

test("a second action cannot replace an unresolved request", async () => {
  const h = harness({ saveRichDraft: async () => { throw new Error("lost ack"); } });
  h.controller.open(event("one"));
  h.controller.setText("First");
  await h.controller.add();
  h.controller.open(event("two"));
  assert.equal(h.controller.state.action.actionID, "one");
  assert.equal(h.controller.state.request.mutationID, "review:one");
  assert.match(h.controller.state.message, /Finish reconciling/);
});

test("controller never dispatches a model run", async () => {
  const h = harness();
  assert.equal("submitRun" in h.controller, false);
  h.controller.open(event());
  h.controller.setText("Draft only");
  await h.controller.add();
  assert.equal(h.saves.length, 1);
});
