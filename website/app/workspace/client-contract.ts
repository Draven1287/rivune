export type RunMode = "codex" | "claude" | "rivune";
export type RunStatus = "running" | "complete" | "failed" | "cancelled" | "interrupted";
export type ConnectionCode = { endpoint: string; token: string };
export type ModelProvider = "codex" | "claude";
export type ModelSelection = { model: string; reasoning: string };
export type ModelSelections = Partial<Record<ModelProvider, ModelSelection>>;
export type ProviderModelControl = {
  provider: ModelProvider; transport: "cli" | "api"; selectedModel: string; selectedReasoning: string;
  models: { id: string; label: string; reasoningIds: string[] }[];
  reasoning: { id: string; label: string }[]; editable: boolean; note?: string | null;
};
export type ProviderConnection = {
  id: string; title: string; provider: string; transport: string; state: string; message?: string | null;
};
export type ProviderTransport = {
  id: string; title: string; kind: "cli" | "api"; supported: boolean;
  state: string; message: string; active: boolean; modelSettings: boolean;
};
export type CatalogProvider = {
  id: string; title: string; workspaceProvider?: ModelProvider; activeTransportId?: string;
  selectionPolicy: "automatic"; transports: ProviderTransport[];
};
export type NativeSettingsSection = "connections" | "models" | "privacy" | "devices" | "account";
export type WorkspaceConversation = { id: string; title: string; updatedAt: string; mode: RunMode };
export type WorkspaceRun = {
  id: string; conversationID: string; turnID: string; status: RunStatus; stage: string;
  prompt: string; createdAt: string; updatedAt: string; result?: string | null; error?: string | null;
  mode: RunMode; resultTruncated?: boolean; activities?: { title: string; body: string }[];
};
export type WorkspaceSnapshot = {
  schemaVersion: 1; revision: number; hasMoreHistory?: boolean;
  device: { name: string; status: string; execution: string };
  startup?: { phase: "checking" | "ready" | "needsConnection"; progress: number; message: string };
  connectionChecks?: ProviderConnection[];
  modelControls?: ProviderModelControl[];
  providerCatalog?: CatalogProvider[];
  capabilities?: { apiProviders?: boolean; settingsNavigation?: boolean; connectionManagement?: boolean };
  connections: ProviderConnection[]; conversations: WorkspaceConversation[]; runs: WorkspaceRun[];
};
export type RunSubmission = {
  id: string; conversationID?: string; prompt: string; mode: RunMode; shareWithTeam: boolean;
  modelSelections?: ModelSelections;
};

const modes = new Set(["codex", "claude", "rivune"]);
const statuses = new Set(["running", "complete", "failed", "cancelled", "interrupted"]);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const nullableText = (value: unknown) => value === undefined || value === null || text(value);
const date = (value: unknown) => text(value) && Number.isFinite(Date.parse(value));
const mode = (value: unknown) => text(value) && modes.has(value);

export function parseConnectionCode(input: string): ConnectionCode {
  let value: unknown;
  try { value = JSON.parse(input.trim()); } catch { throw new Error("Paste the complete connection code copied from Rivune on your Mac."); }
  if (!record(value) || !text(value.endpoint) || !text(value.token)) {
    throw new Error("This code needs an endpoint and a token. Copy a fresh code from Rivune.");
  }
  let endpoint: URL;
  try { endpoint = new URL(value.endpoint); } catch { throw new Error("The connection code contains an invalid local address."); }
  if (endpoint.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname)
      || !endpoint.port || endpoint.username || endpoint.password || endpoint.search || endpoint.hash
      || !["", "/"].includes(endpoint.pathname)) {
    throw new Error("Use a local Rivune connection code for the Mac running this browser.");
  }
  if (!/^[A-Za-z0-9_=-]{16,512}$/.test(value.token)) {
    throw new Error("The connection token is incomplete. Copy a fresh code from Rivune.");
  }
  return { endpoint: endpoint.origin, token: value.token };
}

export function parseWorkspaceSnapshot(value: unknown): WorkspaceSnapshot {
  if (!record(value) || value.schemaVersion !== 1 || typeof value.revision !== "number"
      || !Number.isFinite(value.revision) || !record(value.device)
      || !text(value.device.name) || !text(value.device.status) || !text(value.device.execution)
      || !Array.isArray(value.connections) || !Array.isArray(value.conversations) || !Array.isArray(value.runs)) {
    throw new Error("This Mac returned an incompatible workspace. Update both Rivune interfaces and reconnect.");
  }
  const connectionsValid = value.connections.every((item: unknown) => record(item)
    && [item.id, item.title, item.provider, item.transport, item.state].every(text) && nullableText(item.message));
  const conversationsValid = value.conversations.every((item: unknown) => record(item)
    && text(item.id) && text(item.title) && date(item.updatedAt) && mode(item.mode));
  const runsValid = value.runs.every((item: unknown) => record(item)
    && [item.id, item.conversationID, item.turnID, item.stage, item.prompt].every(text)
    && text(item.status) && statuses.has(item.status) && mode(item.mode)
    && date(item.createdAt) && date(item.updatedAt) && nullableText(item.result) && nullableText(item.error)
    && (item.activities === undefined || (Array.isArray(item.activities) && item.activities.every(
      (activity: unknown) => record(activity) && text(activity.title) && text(activity.body)))));
  const startupValid = value.startup === undefined || (record(value.startup)
    && ["checking", "ready", "needsConnection"].includes(String(value.startup.phase))
    && typeof value.startup.progress === "number" && Number.isFinite(value.startup.progress)
    && value.startup.progress >= 0 && value.startup.progress <= 1 && text(value.startup.message));
  const checksValid = value.connectionChecks === undefined || (Array.isArray(value.connectionChecks)
    && value.connectionChecks.every((item: unknown) => record(item)
      && [item.id, item.title, item.provider, item.transport, item.state].every(text) && nullableText(item.message)));
  const modelControlsValid = value.modelControls === undefined || (Array.isArray(value.modelControls)
    && new Set(value.modelControls.map(item => record(item) ? item.provider : undefined)).size === value.modelControls.length
    && value.modelControls.every((item: unknown) => {
      if (!record(item) || !["codex", "claude"].includes(String(item.provider))
        || !["cli", "api"].includes(String(item.transport)) || !text(item.selectedModel)
        || !text(item.selectedReasoning) || typeof item.editable !== "boolean" || !nullableText(item.note)
        || !Array.isArray(item.models) || !Array.isArray(item.reasoning)) return false;
      const optionsValid = item.reasoning.every((option: unknown) => record(option) && text(option.id) && !!option.id && text(option.label))
        && item.models.every((option: unknown) => record(option) && text(option.id) && !!option.id && text(option.label)
          && Array.isArray(option.reasoningIds) && option.reasoningIds.length > 0 && option.reasoningIds.every(text));
      if (!optionsValid) return false;
      const reasoningIds = new Set(item.reasoning.map(option => (option as { id: string }).id));
      const modelIds = new Set(item.models.map(option => (option as { id: string }).id));
      return reasoningIds.size === item.reasoning.length && modelIds.size === item.models.length
        && item.models.every(option => (option as { reasoningIds: string[] }).reasoningIds.every(id => reasoningIds.has(id)));
    }));
  const catalogValid = value.providerCatalog === undefined || (Array.isArray(value.providerCatalog)
    && new Set(value.providerCatalog.map(item => record(item) ? item.id : undefined)).size === value.providerCatalog.length
    && value.providerCatalog.every((item: unknown) => {
      if (!record(item) || !text(item.id) || !item.id || !text(item.title) || item.selectionPolicy !== "automatic"
        || (item.workspaceProvider !== undefined && !["codex", "claude"].includes(String(item.workspaceProvider)))
        || (item.activeTransportId !== undefined && !text(item.activeTransportId)) || !Array.isArray(item.transports)) return false;
      if (!item.transports.every((route: unknown) => record(route) && text(route.id) && !!route.id && text(route.title)
        && ["cli", "api"].includes(String(route.kind)) && text(route.state) && text(route.message)
        && typeof route.supported === "boolean" && typeof route.active === "boolean" && typeof route.modelSettings === "boolean")) return false;
      const routes = item.transports as ProviderTransport[];
      const active = routes.filter(route => route.active);
      return new Set(routes.map(route => route.id)).size === routes.length && active.length <= 1
        && active.every(route => route.supported && route.id === item.activeTransportId)
        && (item.activeTransportId === undefined || routes.some(route => route.id === item.activeTransportId && route.active && route.supported));
    }));
  const capabilitiesValid = value.capabilities === undefined || (record(value.capabilities)
    && [value.capabilities.apiProviders, value.capabilities.settingsNavigation, value.capabilities.connectionManagement].every(flag => flag === undefined || typeof flag === "boolean"));
  if (!connectionsValid || !conversationsValid || !runsValid || !startupValid || !checksValid || !modelControlsValid || !catalogValid || !capabilitiesValid) {
    throw new Error("The workspace response could not be read. Reconnect after updating Rivune on your Mac.");
  }
  return value as WorkspaceSnapshot;
}

// Legacy Macs still supply connection records. Derive only the routes they report;
// the browser never manufactures a provider catalog or a ready state.
export function workspaceProviderCatalog(snapshot: WorkspaceSnapshot | null): CatalogProvider[] {
  if (snapshot?.providerCatalog) return snapshot.providerCatalog;
  if (!snapshot) return [];
  const records = [...(snapshot.connectionChecks ?? []), ...snapshot.connections];
  const providers = [...new Set(records.map(item => item.provider))];
  return providers.map(provider => {
    const selected = snapshot.connections.find(item => item.provider === provider);
    const routes = [...new Map(records.filter(item => item.provider === provider && ["cli", "api"].includes(item.transport))
      .map(item => [item.transport, item])).values()];
    const transports: ProviderTransport[] = routes.map(route => ({
      id: `${provider}.${route.transport}`, title: route.title, kind: route.transport as "cli" | "api",
      supported: ["codex", "claude"].includes(provider) && (route.transport === "cli" || snapshot.capabilities?.apiProviders === true || !!snapshot.modelControls?.some(item => item.provider === provider && item.transport === "api")),
      state: route.state, message: route.message ?? "",
      active: ["codex", "claude"].includes(provider) && selected?.transport === route.transport && (route.transport === "cli" || snapshot.capabilities?.apiProviders === true || !!snapshot.modelControls?.some(item => item.provider === provider && item.transport === "api")),
      modelSettings: !!snapshot.modelControls?.some(item => item.provider === provider && item.transport === route.transport),
    }));
    return { id: provider, title: provider === "codex" ? "ChatGPT" : provider === "claude" ? "Claude" : selected?.title ?? provider,
      ...(["codex", "claude"].includes(provider) ? { workspaceProvider: provider as ModelProvider } : {}),
      ...(transports.find(item => item.active) ? { activeTransportId: transports.find(item => item.active)!.id } : {}),
      selectionPolicy: "automatic" as const, transports };
  });
}

// A route change invalidates request-local overrides even if option IDs happen to match.
export function modelControlChanged(previous: ProviderModelControl | undefined, next: ProviderModelControl | undefined) {
  return !!previous && (!next || previous.transport !== next.transport);
}

export function modelSelectionIsValid(control: ProviderModelControl, selection: ModelSelection): boolean {
  return control.models.some(model => model.id === selection.model && model.reasoningIds.includes(selection.reasoning));
}

export function effectiveModelSelection(control: ProviderModelControl, local?: ModelSelection): ModelSelection {
  return local && control.editable && modelSelectionIsValid(control, local)
    ? local : { model: control.selectedModel, reasoning: control.selectedReasoning };
}

// A model change keeps a supported effort, otherwise uses that model's authoritative default order.
export function chooseModel(control: ProviderModelControl, current: ModelSelection, modelID: string): ModelSelection | null {
  const model = control.models.find(item => item.id === modelID);
  if (!control.editable || !model) return null;
  const reasoning = model.reasoningIds.includes(current.reasoning) ? current.reasoning
    : model.reasoningIds.includes(control.selectedReasoning) ? control.selectedReasoning : model.reasoningIds[0];
  return { model: model.id, reasoning };
}

// Send only explicit, still-valid local overrides for providers involved in this request.
// An absent field preserves compatibility with earlier Mac builds and their defaults.
export function requestModelSelections(mode: RunMode, controls: ProviderModelControl[] | undefined, local: ModelSelections): ModelSelections | undefined {
  const result: ModelSelections = {};
  for (const control of controls ?? []) {
    const selection = local[control.provider];
    if ((mode === "rivune" || mode === control.provider) && control.editable && selection && modelSelectionIsValid(control, selection)) {
      result[control.provider] = { ...selection };
    }
  }
  return Object.keys(result).length ? result : undefined;
}

export class WorkspaceAPIError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = "WorkspaceAPIError"; this.status = status; }
}

// Exactly one HTTP attempt. In particular, uncertain POSTs are never retried here.
export async function workspaceRequest(
  connection: ConnectionCode, path: string, body?: unknown, signal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 10_000);
  try {
    const response = await fetch(`${connection.endpoint}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${connection.token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal,
    });
    if (!response.ok) {
      let message = response.status === 401 || response.status === 403
        ? "This connection is no longer authorized. Copy a new connection code from your Mac."
        : `The Mac could not accept this request (${response.status}).`;
      try {
        const error: unknown = await response.json();
        if (response.status !== 401 && response.status !== 403 && record(error) && text(error.error)) message = error.error.slice(0,500);
      } catch { /* The HTTP status still gives a definite rejection. */ }
      throw new WorkspaceAPIError(message, response.status);
    }
    // A successful action may return no body; refresh the authoritative snapshot.
    if (response.status === 204) return null;
    const payload = await response.text();
    return payload ? JSON.parse(payload) : null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export async function loadWorkspace(connection: ConnectionCode, signal?: AbortSignal) {
  return parseWorkspaceSnapshot(await workspaceRequest(connection, "/v1/workspace", undefined, signal));
}

export function modeIsReady(mode: RunMode, connections: ProviderConnection[]): boolean {
  const ready = (provider: string) => connections.some((item) => item.provider === provider && item.state === "ready");
  return mode === "rivune" ? ready("codex") && ready("claude") : ready(mode);
}

export function promptFits(prompt: string): boolean {
  return new TextEncoder().encode(prompt.trim()).byteLength <= 16 * 1024;
}

// Preserve a usable selected route; otherwise choose one that can actually send.
export function preferredReadyMode(current: RunMode, connections: ProviderConnection[]): RunMode {
  if (modeIsReady(current, connections)) return current;
  if (modeIsReady("codex", connections)) return "codex";
  if (modeIsReady("claude", connections)) return "claude";
  return current;
}

export function startupState(snapshot: WorkspaceSnapshot | null, online: boolean, checking: boolean) {
  if (!online || !snapshot) return { phase: checking ? "checking" : "needsConnection", progress: 0,
    message: checking ? "Reaching your Mac…" : "Connect your Mac to check your AI connections." } as const;
  if (snapshot.startup?.phase === "checking") return snapshot.startup;
  if (checking) return { phase: "checking", progress: 0, message: "Checking CLI sign-ins and API access…" } as const;
  const usable = modeIsReady("codex", snapshot.connections) || modeIsReady("claude", snapshot.connections);
  // A reported 100% is never enough on its own: at least one selected route must be ready.
  if (usable) return { phase: "ready", progress: 1, message: snapshot.startup?.message || "Your workspace is ready." } as const;
  return { phase: "needsConnection", progress: snapshot.startup?.progress ?? 1,
    message: snapshot.startup?.message || "Connect a CLI or API provider in the Mac app to start chatting." } as const;
}
