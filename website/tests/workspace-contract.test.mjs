import assert from "node:assert/strict";
import { test } from "node:test";
import { parseConnectionCode, parseWorkspaceSnapshot, modeIsReady, preferredReadyMode, startupState, promptFits, workspaceRequest, WorkspaceAPIError, chooseModel, effectiveModelSelection, modelSelectionIsValid, requestModelSelections, workspaceProviderCatalog, modelControlChanged } from "../app/workspace/client-contract.ts";

const code = { endpoint: "http://127.0.0.1:49152", token: "local-test-token-123456" };
const connection = (provider, state = "ready") => ({ id: provider, title: `${provider} CLI`, provider, transport: "cli", state });
const snapshot = () => ({
  schemaVersion: 1, revision: 4, device: { name: "Test Mac", status: "online", execution: "local" },
  connections: [connection("codex"), connection("claude")],
  conversations: [{ id: "conversation-1", title: "A real conversation", updatedAt: "2026-09-05T01:00:00Z", mode: "rivune" }],
  runs: [{ id: "request-1", conversationID: "conversation-1", turnID: "turn-1", prompt: "A question", mode: "rivune", status: "running", stage: "planning", createdAt: "2026-09-05T01:00:00Z", updatedAt: "2026-09-05T01:00:00Z" }],
});

test("accepts only explicit local HTTP endpoint codes and normalizes their trailing slash", () => {
  assert.deepEqual(parseConnectionCode(JSON.stringify({ ...code, endpoint: `${code.endpoint}/` })), code);
  for (const endpoint of ["https://example.com:1234", "http://127.0.0.1.evil.test:1234", "http://192.168.1.2:1234", "http://user:secret@localhost:1234", "http://localhost:1234/path", "http://localhost:1234/?token=x", "http://localhost"]) {
    assert.throws(() => parseConnectionCode(JSON.stringify({ ...code, endpoint })), /local/);
  }
  assert.throws(() => parseConnectionCode("not a code"), /complete connection code/);
  assert.throws(() => parseConnectionCode(JSON.stringify({ ...code, token: "short" })), /incomplete/);
});

test("accepts current optional fields, omitted results and future fields without inventing state", () => {
  const value = { ...snapshot(), hasMoreHistory: true, futureField: "ignore" };
  value.runs[0].result = null;
  value.runs[0].error = null;
  value.runs[0].activities = [{ title: "Review", body: "Recorded evidence" }];
  value.runs[0].resultTruncated = true;
  assert.equal(parseWorkspaceSnapshot(value), value);
  assert.deepEqual(parseWorkspaceSnapshot({ ...snapshot(), conversations: [], runs: [], connections: [] }).runs, []);
});

test("rejects incompatible schemas and malformed results instead of silently showing an empty workspace", () => {
  assert.throws(() => parseWorkspaceSnapshot({ ...snapshot(), schemaVersion: 2 }), /incompatible/);
  const value = snapshot();
  value.runs[0].result = { unsupported: "structured result" };
  assert.throws(() => parseWorkspaceSnapshot(value), /could not be read/);
  value.runs[0].result = "Valid result";
  value.runs[0].status = "unknown";
  assert.throws(() => parseWorkspaceSnapshot(value), /could not be read/);
});

test("team mode requires both provider readiness records, not installed or checking", () => {
  assert.equal(modeIsReady("rivune", [connection("codex"), connection("claude", "checking")]), false);
  assert.equal(modeIsReady("codex", [connection("codex")]), true);
  assert.equal(modeIsReady("claude", [connection("claude", "signInRequired")]), false);
  assert.equal(modeIsReady("rivune", [connection("codex"), connection("claude")]), true);
});

test("prompt budget counts UTF-8 bytes, including non-ASCII text", () => {
  assert.equal(promptFits("a".repeat(16 * 1024)), true);
  assert.equal(promptFits("a".repeat(16 * 1024 + 1)), false);
  assert.equal(promptFits("🙂".repeat(4097)), false);
});

test("uncertain submission makes exactly one request and preserves its ID", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); throw new TypeError("Connection lost"); };
  try {
    await assert.rejects(workspaceRequest(code, "/v1/runs", { id: "same-request-id", prompt: "Hello", mode: "codex", shareWithTeam: false }), /Connection lost/);
    assert.equal(calls.length, 1);
    assert.equal(JSON.parse(calls[0].options.body).id, "same-request-id");
    assert.equal(calls[0].options.headers.Authorization, `Bearer ${code.token}`);
    assert.equal(calls[0].options.credentials, "omit");
    assert.equal(calls[0].options.redirect, "error");
    assert.equal(calls[0].url.includes(code.token), false);
  } finally { globalThis.fetch = original; }
});

test("auth rejection is actionable and a successful empty action body is allowed", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("denied", { status: 401 });
    await assert.rejects(workspaceRequest(code, "/v1/workspace"), error => error instanceof WorkspaceAPIError && error.status === 401 && /new connection code/.test(error.message));
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await workspaceRequest(code, "/v1/open", { conversationID: "conversation-1" }), null);
  } finally { globalThis.fetch = original; }
});


test("startup requires live usable route state and falls back to a single ready provider", () => {
  const value = snapshot();
  value.connections = [connection("codex", "signInRequired"), { ...connection("claude"), transport: "api" }];
  value.startup = { phase: "ready", progress: 1, message: "Model access verified" };
  assert.equal(startupState(value, false, false).phase, "needsConnection");
  assert.equal(startupState(value, true, false).phase, "ready");
  assert.equal(startupState(value, true, true).phase, "checking");
  assert.equal(preferredReadyMode("rivune", value.connections), "claude");
  assert.equal(modeIsReady("rivune", value.connections), false);
  value.connections[1].state = "checking";
  assert.equal(startupState(value, true, false).phase, "needsConnection");
  value.connections[0].state = "ready";
  assert.equal(preferredReadyMode("claude", value.connections), "codex");
  value.startup.phase = "checking";
  value.startup.progress = .5;
  assert.equal(startupState(value, true, false).phase, "checking");
});

test("startup schema validates progress and individual connection diagnostics", () => {
  const value = { ...snapshot(), startup: { phase: "checking", progress: .5, message: "Checking providers" }, connectionChecks: [connection("codex"), { ...connection("claude"), transport: "api" }] };
  assert.equal(parseWorkspaceSnapshot(value), value);
  for (const progress of [NaN, -1, 1.1, "100"]) {
    assert.throws(() => parseWorkspaceSnapshot({ ...value, startup: { ...value.startup, progress } }), /could not be read/);
  }
  assert.throws(() => parseWorkspaceSnapshot({ ...value, connectionChecks: [{ state: "ready" }] }), /could not be read/);
});

const cliModelControl = (provider = "codex") => ({
  provider, transport: "cli", selectedModel: "default", selectedReasoning: "automatic", editable: true,
  models: [
    { id: "default", label: "Account default", reasoningIds: ["automatic", "high"] },
    { id: "fast", label: "Fast fixture model", reasoningIds: ["automatic", "low"] },
    { id: "focused", label: "Focused fixture model", reasoningIds: ["high"] },
  ],
  reasoning: [{ id: "automatic", label: "Auto" }, { id: "low", label: "Low" }, { id: "high", label: "High" }],
});

test("model metadata is optional, allows empty unconfigured API models, and rejects ambiguous option IDs", () => {
  const api = { provider: "claude", transport: "api", selectedModel: "", selectedReasoning: "provider-managed", models: [], reasoning: [{ id: "provider-managed", label: "Provider managed" }], editable: false };
  const value = { ...snapshot(), modelControls: [cliModelControl(), api] };
  assert.equal(parseWorkspaceSnapshot(value), value);
  assert.equal(parseWorkspaceSnapshot(snapshot()).modelControls, undefined);
  for (const invalid of [
    [cliModelControl(), cliModelControl()],
    [{ ...cliModelControl(), editable: "yes" }],
    [{ ...cliModelControl(), models: [{ id: "default", label: "Default", reasoningIds: ["unsupported"] }] }],
    [{ ...cliModelControl(), models: [{ id: "default", label: "Default", reasoningIds: [] }] }],
    [{ ...cliModelControl(), reasoning: [{ id: "automatic", label: "Auto" }, { id: "automatic", label: "Duplicate" }] }],
  ]) assert.throws(() => parseWorkspaceSnapshot({ ...snapshot(), modelControls: invalid }), /could not be read/);
});

test("model changes preserve supported reasoning and choose only an advertised fallback", () => {
  const control = cliModelControl();
  assert.deepEqual(chooseModel(control, { model: "default", reasoning: "high" }, "focused"), { model: "focused", reasoning: "high" });
  assert.deepEqual(chooseModel(control, { model: "default", reasoning: "high" }, "fast"), { model: "fast", reasoning: "automatic" });
  assert.deepEqual(chooseModel(control, { model: "fast", reasoning: "low" }, "focused"), { model: "focused", reasoning: "high" });
  assert.equal(chooseModel(control, { model: "default", reasoning: "automatic" }, "invented"), null);
  assert.equal(chooseModel({ ...control, editable: false }, { model: "default", reasoning: "automatic" }, "fast"), null);
  assert.equal(modelSelectionIsValid(control, { model: "fast", reasoning: "high" }), false);
  assert.deepEqual(effectiveModelSelection(control, { model: "removed", reasoning: "high" }), { model: "default", reasoning: "automatic" });
});

test("request-local model choices are scoped, immutable, and omitted for legacy or managed API routes", () => {
  const controls = [cliModelControl(), cliModelControl("claude")];
  const local = { codex: { model: "fast", reasoning: "low" }, claude: { model: "focused", reasoning: "high" } };
  assert.deepEqual(requestModelSelections("codex", controls, local), { codex: local.codex });
  assert.deepEqual(requestModelSelections("claude", controls, local), { claude: local.claude });
  const request = requestModelSelections("rivune", controls, local);
  assert.deepEqual(request, local);
  local.codex.model = "removed";
  assert.equal(request.codex.model, "fast");
  assert.deepEqual(requestModelSelections("rivune", controls, local), { claude: local.claude });
  assert.equal(requestModelSelections("rivune", undefined, local), undefined);
  assert.equal(requestModelSelections("codex", controls, {}), undefined);
  const api = { ...controls[1], transport: "api", editable: false };
  assert.equal(requestModelSelections("claude", [api], local), undefined);
  assert.deepEqual(effectiveModelSelection(api, local.claude), { model: "default", reasoning: "automatic" });
});


const catalogProvider = () => ({ id: "openai", title: "OpenAI", workspaceProvider: "codex", selectionPolicy: "automatic",
  activeTransportId: "openai.codex-cli", transports: [
    { id: "openai.codex-cli", title: "Codex CLI", kind: "cli", supported: true, state: "ready", message: "Signed in", active: true, modelSettings: true },
    { id: "openai.responses-api", title: "OpenAI API", kind: "api", supported: true, state: "notConfigured", message: "Add key on Mac", active: false, modelSettings: true },
  ],
});

test("provider catalog is optional, preserves discovery-only adapters, and cannot grant runnable modes", () => {
  const discovery = { id: "research", title: "Research API", selectionPolicy: "automatic", transports: [
    { id: "research.api", title: "Research API", kind: "api", supported: false, state: "adapterRequired", message: "Runtime adapter required", active: false, modelSettings: false },
  ] };
  const value = { ...snapshot(), providerCatalog: [catalogProvider(), discovery], capabilities: { settingsNavigation: true } };
  assert.equal(parseWorkspaceSnapshot(value), value);
  assert.deepEqual(workspaceProviderCatalog(value), value.providerCatalog);
  assert.equal(workspaceProviderCatalog(value)[1].workspaceProvider, undefined);
  assert.equal(workspaceProviderCatalog(null).length, 0);
  assert.equal(modeIsReady("codex", [{ ...connection("research"), state: "ready" }]), false);
});

test("ambiguous catalog routes and invalid native-settings capability fail closed", () => {
  const valid = { ...snapshot(), providerCatalog: [catalogProvider()] };
  for (const mutate of [
    value => value.providerCatalog.push(catalogProvider()),
    value => value.providerCatalog[0].transports.push({ ...value.providerCatalog[0].transports[0] }),
    value => value.providerCatalog[0].activeTransportId = "missing",
    value => value.providerCatalog[0].transports[1].active = true,
    value => value.providerCatalog[0].transports[0].supported = false,
    value => value.providerCatalog[0].transports[0].kind = "shell-command",
    value => value.providerCatalog[0].selectionPolicy = "manual",
    value => value.capabilities = { settingsNavigation: "true" },
  ]) {
    const value = structuredClone(valid); mutate(value);
    assert.throws(() => parseWorkspaceSnapshot(value), /could not be read/);
  }
});

test("legacy catalog derives only reported supported routes and never upgrades API previews", () => {
  const value = { ...snapshot(), capabilities: { apiProviders: false }, connectionChecks: [
    connection("codex"), { ...connection("codex", "unavailable"), id: "codex-api", title: "API preview", transport: "api" },
    { ...connection("research"), transport: "api" },
  ] };
  const catalog = workspaceProviderCatalog(value);
  const openai = catalog.find(item => item.workspaceProvider === "codex");
  assert.equal(openai.transports.find(item => item.kind === "cli").supported, true);
  assert.equal(openai.transports.find(item => item.kind === "api").supported, false);
  assert.equal(catalog.find(item => item.id === "research").transports[0].supported, false);
  assert.equal(catalog.find(item => item.id === "research").workspaceProvider, undefined);
  value.capabilities.apiProviders = true;
  assert.equal(workspaceProviderCatalog(value).find(item => item.workspaceProvider === "codex").transports.find(item => item.kind === "api").supported, true);
  assert.deepEqual(workspaceProviderCatalog({ ...snapshot(), connections: [], connectionChecks: [] }), []);
});

test("transport changes invalidate local overrides even if model and effort IDs still match", () => {
  const cli = cliModelControl();
  const api = { ...cli, transport: "api", editable: false };
  assert.equal(modelControlChanged(cli, api), true);
  assert.equal(modelControlChanged(api, cli), true);
  assert.equal(modelControlChanged(cli, undefined), true);
  assert.equal(modelControlChanged(cli, { ...cli }), false);
  assert.equal(modelControlChanged(undefined, cli), false);
  assert.equal(requestModelSelections("codex", [api], { codex: { model: "default", reasoning: "automatic" } }), undefined);
});
