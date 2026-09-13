import assert from "node:assert/strict";
import { test } from "node:test";
import { createHostAdapter, createSubmissionGate, newestRunForConversation, parseSnapshot } from "../web/core.mjs";

const snapshot = () => ({
  schemaVersion: 1,
  conversations: [{ id: "c1", title: "Real conversation" }],
  runs: [{ id: "r1", conversationID: "c1", status: "running", updatedAt: "2026-09-07T12:00:00Z" }],
});

test("accepts the shared schema and preserves host-owned state", () => {
  const value = snapshot();
  assert.equal(parseSnapshot(value), value);
});

test("fails closed on incompatible or invented task state", () => {
  assert.throws(() => parseSnapshot({ ...snapshot(), schemaVersion: 2 }), /incompatible/);
  const value = snapshot(); value.runs[0].status = "probably-running";
  assert.throws(() => parseSnapshot(value), /unreadable run/);
});

test("requires the complete desktop host instead of creating a fallback database", () => {
  assert.equal(createHostAdapter(null), null);
  assert.equal(createHostAdapter({ getSnapshot() {} }), null);
});

test("submits exactly once and preserves one request ID", async () => {
  const calls = [];
  const adapter = createHostAdapter({
    getSnapshot: async () => snapshot(),
    openConversation: async () => {},
    submitRun: async (request) => { calls.push(request); return { accepted: true }; },
  });
  const gate = createSubmissionGate(adapter, () => "request-fixed");
  await gate.submit({ conversationID: "c1", prompt: "  Continue this  " });
  assert.deepEqual(calls, [{ id: "request-fixed", conversationID: "c1", prompt: "Continue this", mode: "direct" }]);
});

test("blocks concurrent duplicate dispatch", async () => {
  let resolve;
  const adapter = createHostAdapter({
    getSnapshot: async () => snapshot(), openConversation: async () => {},
    submitRun: () => new Promise((done) => { resolve = done; }),
  });
  const gate = createSubmissionGate(adapter, () => "request-fixed");
  const first = gate.submit({ conversationID: "c1", prompt: "Continue" });
  await assert.rejects(gate.submit({ conversationID: "c1", prompt: "Continue" }), /already pending/);
  resolve({ accepted: true }); await first;
});

test("shows only reported task status for the selected conversation", () => {
  assert.equal(newestRunForConversation(snapshot(), "c1").status, "running");
  assert.equal(newestRunForConversation(snapshot(), "missing"), null);
});
