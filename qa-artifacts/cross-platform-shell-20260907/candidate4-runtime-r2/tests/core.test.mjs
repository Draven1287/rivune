import assert from "node:assert/strict";
import { test } from "node:test";
import { createHostAdapter, createSubmissionGate, newestRunForConversation, parseAcknowledgement, parseSnapshot, SubmissionUncertainError } from "../web/core.mjs";

const snapshot = () => ({
  schemaVersion: 1,
  conversations: [{ id: "c1", title: "Real conversation", projectID: "p1" }],
  projects: [{ schemaVersion: 1, id: "p1", name: "Launch", instructions: "Use the brief." }],
  activeProjectID: "p1",
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
  const access = snapshot(); access.conversations[0].readOnly = "sometimes";
  assert.throws(() => parseSnapshot(access), /access state/);
  const project = snapshot(); project.projects[0].schemaVersion = 2;
  assert.throws(() => parseSnapshot(project), /unreadable project/);
  const activeProject = snapshot(); activeProject.activeProjectID = 4;
  assert.throws(() => parseSnapshot(activeProject), /active project/);
});

test("exposes the versioned project and bounded-search bridge only when host-owned", async () => {
  const calls = [];
  const host = {
    getSnapshot: async () => snapshot(), openConversation: async () => {},
    submitRun: async () => {}, reconcileRun: async () => {},
    createProject: async value => calls.push(["create", value]),
    updateProject: async value => calls.push(["update", value]),
    selectProject: async id => calls.push(["select", id]),
    moveConversationToProject: async (conversationID, projectID) => calls.push(["move", conversationID, projectID]),
    searchWorkspace: async (query, limit) => { calls.push(["search", query, limit]); return { query, truncated: false, matches: [] }; },
  };
  const adapter = createHostAdapter(host);
  const project = { schemaVersion: 1, id: "p2", name: "Research", instructions: "Verify claims." };
  await adapter.createProject(project);
  await adapter.updateProject(project);
  await adapter.selectProject("p2");
  await adapter.moveConversationToProject("c1", null);
  await adapter.searchWorkspace("launch", 12);
  assert.deepEqual(calls, [
    ["create", project], ["update", project], ["select", "p2"],
    ["move", "c1", null], ["search", "launch", 12],
  ]);
});

test("exposes import only when the desktop host owns preview and confirmation", async () => {
  const calls = [];
  const adapter = createHostAdapter({
    getSnapshot: async () => snapshot(), openConversation: async () => {},
    submitRun: async () => {}, reconcileRun: async () => {},
    previewLegacyImport: async (sources) => { calls.push(["preview", sources]); return { fingerprint: "bound" }; },
    commitLegacyImport: async (fingerprint) => { calls.push(["commit", fingerprint]); return { state: "imported" }; },
    recoverLegacyImport: async (fingerprint) => { calls.push(["recover", fingerprint]); return []; },
    discoverProviders: async () => { calls.push(["discover"]); return []; },
  });
  await adapter.previewLegacyImport([{ kind: "history", bytes: [91, 93] }]);
  await adapter.commitLegacyImport("bound");
  await adapter.recoverLegacyImport("bound");
  await adapter.discoverProviders();
  assert.deepEqual(calls, [
    ["preview", [{ kind: "history", bytes: [91, 93] }]],
    ["commit", "bound"],
    ["recover", "bound"],
    ["discover"],
  ]);
  const withoutImport = createHostAdapter({
    getSnapshot: async () => snapshot(), openConversation: async () => {},
    submitRun: async () => {}, reconcileRun: async () => {},
  });
  assert.equal(withoutImport.previewLegacyImport, undefined);
  assert.equal(withoutImport.commitLegacyImport, undefined);
  assert.equal(withoutImport.recoverLegacyImport, undefined);
  assert.equal(withoutImport.discoverProviders, undefined);
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

test("repeated recoverable reconciliation failures keep the same send identity", async () => {
  const submissions = [];
  const reconciliations = [];
  let attempts = 0;
  const adapter = createHostAdapter({
    getSnapshot: async () => snapshot(), openConversation: async () => {},
    submitRun: async (request) => { submissions.push(request); return { state: "uncertain", requestID: request.id }; },
    reconcileRun: async (requestID) => {
      reconciliations.push(requestID);
      attempts += 1;
      return { state: attempts < 3 ? "uncertain" : "accepted", requestID };
    },
  });
  const gate = createSubmissionGate(adapter, () => "recoverable-send");
  assert.equal((await gate.submit({ conversationID: "c1", prompt: "Run once" })).state, "uncertain");
  assert.equal((await gate.reconcile()).state, "uncertain");
  assert.equal(gate.unresolvedRequestID, "recoverable-send");
  assert.equal((await gate.reconcile()).state, "uncertain");
  assert.equal(gate.unresolvedRequestID, "recoverable-send");
  assert.equal((await gate.reconcile()).state, "accepted");
  assert.equal(gate.unresolvedRequestID, null);
  assert.deepEqual(submissions.map(({ id }) => id), ["recoverable-send"]);
  assert.deepEqual(reconciliations, ["recoverable-send", "recoverable-send", "recoverable-send"]);
});

test("restores a durable uncertain request and reconciles the same ID after reload", async () => {
  const submissions = [];
  const reconciliations = [];
  const adapter = createHostAdapter({
    getSnapshot: async () => snapshot(), openConversation: async () => {},
    submitRun: async (request) => { submissions.push(request); return { state: "accepted", requestID: request.id }; },
    reconcileRun: async (requestID) => { reconciliations.push(requestID); return { state: "accepted", requestID }; },
  });
  const gate = createSubmissionGate(adapter);
  assert.equal(gate.restoreUnresolved({ id: "persisted-request", conversationID: "c1", prompt: "original", mode: "direct" }), true);
  await assert.rejects(gate.submit({ id: "new-id", conversationID: "c1", prompt: "must not dispatch" }), SubmissionUncertainError);
  assert.equal((await gate.reconcile()).state, "accepted");
  assert.deepEqual(submissions, []);
  assert.deepEqual(reconciliations, ["persisted-request"]);
});

test("accepts an explicit request ID for host-owned durable admission", async () => {
  const submissions = [];
  const adapter = createHostAdapter({
    getSnapshot: async () => snapshot(), openConversation: async () => {},
    submitRun: async (request) => { submissions.push(request); return { state: "accepted", requestID: request.id }; },
    reconcileRun: async () => {},
  });
  const gate = createSubmissionGate(adapter);
  await gate.submit({ id: "renderer-persisted-id", conversationID: "c1", prompt: "once" });
  assert.equal(submissions[0].id, "renderer-persisted-id");
});
