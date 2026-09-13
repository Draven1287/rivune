import assert from "node:assert/strict";
import { test } from "node:test";
import { createHostAdapter, createSubmissionGate, newestRunForConversation, parseAcknowledgement, parseSnapshot, SubmissionUncertainError } from "../web/core.mjs";

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
  assert.equal(createHostAdapter({ getSnapshot() {}, openConversation() {}, submitRun() {} }), null);
});

test("submits exactly once and preserves one request ID", async () => {
  const calls = [];
  const adapter = createHostAdapter({
    getSnapshot: async () => snapshot(),
    openConversation: async () => {},
    submitRun: async (request) => { calls.push(request); return { state: "accepted", requestID: request.id }; },
    reconcileRun: async () => {},
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
    reconcileRun: async () => {},
  });
  const gate = createSubmissionGate(adapter, () => "request-fixed");
  const first = gate.submit({ conversationID: "c1", prompt: "Continue" });
  await assert.rejects(gate.submit({ conversationID: "c1", prompt: "Continue" }), /already pending/);
  resolve({ state: "accepted", requestID: "request-fixed" }); await first;
});

test("shows only reported task status for the selected conversation", () => {
  assert.equal(newestRunForConversation(snapshot(), "c1").status, "running");
  assert.equal(newestRunForConversation(snapshot(), "missing"), null);
});

test("normalizes malformed or mismatched acknowledgement to uncertain", () => {
  assert.deepEqual(parseAcknowledgement({ state: "accepted", requestID: "other" }, "r1"), { state: "uncertain", requestID: "r1" });
  assert.deepEqual(parseAcknowledgement({ accepted: true }, "r1"), { state: "uncertain", requestID: "r1" });
});

test("retains one uncertain request ID and reconciles without resubmission", async () => {
  const submissions = [];
  const reconciliations = [];
  const adapter = createHostAdapter({
    getSnapshot: async () => snapshot(), openConversation: async () => {},
    submitRun: async (request) => { submissions.push(request); return { state: "uncertain", requestID: request.id }; },
    reconcileRun: async (requestID) => { reconciliations.push(requestID); return { state: "accepted", requestID }; },
  });
  const gate = createSubmissionGate(adapter, () => "request-fixed");
  assert.equal((await gate.submit({ conversationID: "c1", prompt: "Continue" })).state, "uncertain");
  assert.equal(gate.unresolvedRequestID, "request-fixed");
  await assert.rejects(gate.submit({ conversationID: "c1", prompt: "Do not resend" }), SubmissionUncertainError);
  assert.equal((await gate.reconcile()).state, "accepted");
  assert.deepEqual(submissions.map(({ id }) => id), ["request-fixed"]);
  assert.deepEqual(reconciliations, ["request-fixed"]);
  assert.equal(gate.unresolvedRequestID, null);
});
