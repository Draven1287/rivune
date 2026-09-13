import { createModelDiscoveryAdapter, type ModelDiscoveryRequest, type ModelDiscoveryReport } from './modelDiscovery.ts';
/** Thin bridge boundary. Payload parsing and uncertain-outcome recovery belong to the controller. */
export interface HostModelSelection {
  schemaVersion: 1;
  providerID: string;
  modelID: string | null;
  effortID: string | null;
  catalogRevision: string;
}
export interface HostTeamSelection {
  schemaVersion: 1;
  leadIndex: number;
  members: HostModelSelection[];
}
export interface SaveRichDraftRequest {
  conversationID: string;
  mutationID: string;
  expectedRevision: number;
  draft: string;
  attachmentIDs: string[];
  selection: HostModelSelection | null;
  team: HostTeamSelection | null;
}
export interface SubmitRunRequest {
  id: string;
  conversationID: string;
  prompt: string;
  mode: 'direct' | 'constellation';
  richDraftRevision: number;
}
export interface HostBridgeAdapter {
  discoverProviderModels?(request: ModelDiscoveryRequest, signal?: AbortSignal): Promise<ModelDiscoveryReport>;
  cancelModelDiscovery?(requestID: string): Promise<boolean>;
  retryConstellationInvocation?(request: RetryConstellationInvocationRequest): Promise<unknown>;
  getSnapshot(): Promise<unknown>;
  getModelCatalog(): Promise<unknown>;
  createConversation(value: { id: string; title: string }): Promise<unknown>;
  openConversation(conversationID: string): Promise<unknown>;
  saveRichDraft(value: SaveRichDraftRequest): Promise<unknown>;
  submitRun(value: SubmitRunRequest): Promise<unknown>;
  reconcileRun(requestID: string): Promise<unknown>;
  cancelRun(requestID: string): Promise<unknown>;
  onRunEvent(handler: (value: unknown) => void): Promise<() => void>;
}

export interface RetryConstellationInvocationRequest { requestID: string; invocationID: string; failedAttemptID: string }

function invalid(): never { throw new TypeError('Invalid Rivune host command input.'); }
function record(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some(key => typeof key !== 'string' || !keys.includes(key))) invalid();
  // Inputs must be plain data, never accessor-backed command arguments.
  if (keys.some(key => !Object.getOwnPropertyDescriptor(value, key)?.hasOwnProperty('value'))) invalid();
}
function text(value: unknown, max: number, empty = false): asserts value is string {
  if (typeof value !== 'string' || (!empty && !value.trim()) || new TextEncoder().encode(value).length > max) invalid();
}
function identity(value: unknown): asserts value is string { text(value, 128); }
function revision(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid();
}
function selection(value: unknown): asserts value is HostModelSelection | null {
  if (value === null) return;
  record(value, ['schemaVersion', 'providerID', 'modelID', 'effortID', 'catalogRevision']);
  if (value.schemaVersion !== 1) invalid();
  identity(value.providerID); identity(value.catalogRevision);
  if (value.modelID !== null) identity(value.modelID);
  if (value.effortID !== null) { identity(value.effortID); if (value.modelID === null) invalid(); }
}
function selectionIdentity(value: HostModelSelection | null): string {
  return JSON.stringify(value && [value.schemaVersion, value.providerID, value.modelID, value.effortID, value.catalogRevision]);
}
function draft(value: unknown): asserts value is SaveRichDraftRequest {
  record(value, ['conversationID', 'mutationID', 'expectedRevision', 'draft', 'attachmentIDs', 'selection', 'team']);
  identity(value.conversationID); identity(value.mutationID); revision(value.expectedRevision); text(value.draft, 128 * 1024, true);
  if (!Array.isArray(value.attachmentIDs) || value.attachmentIDs.length > 4 || new Set(value.attachmentIDs).size !== value.attachmentIDs.length) invalid();
  for (const id of value.attachmentIDs) identity(id);
  selection(value.selection);
  const team = value.team;
  if (team === null) return;
  record(team, ['schemaVersion', 'leadIndex', 'members']); revision(team.leadIndex);
  if (team.schemaVersion !== 1 || !Array.isArray(team.members) || team.members.length < 2 || team.members.length > 6 || team.leadIndex >= team.members.length) invalid();
  const routes = new Set<string>();
  for (const member of team.members) {
    selection(member); if (member === null) invalid();
    const route = JSON.stringify([member.providerID, member.modelID, member.effortID]);
    if (routes.has(route)) invalid(); routes.add(route);
  }
  if (selectionIdentity(value.selection) !== selectionIdentity(team.members[team.leadIndex])) invalid();
}

const required = ['getSnapshot', 'getModelCatalog', 'createConversation', 'openConversation', 'saveRichDraft', 'submitRun', 'reconcileRun', 'cancelRun', 'onRunEvent'] as const;
type Method = (...args: unknown[]) => unknown;

export function createTauriWorkspaceAdapter(bridge: unknown, options: { reservedSubmission?: boolean } = {}): HostBridgeAdapter | null {
  if (!bridge || typeof bridge !== 'object' || Array.isArray(bridge)) return null;
  const methods = {} as Record<typeof required[number], Method>;
  let retry: unknown;
  try {
    for (const name of required) {
      // The installed desktop bridge publishes own data methods. Do not execute getters
      // or bootstrap raw Tauri globals while deciding whether it is available.
      const descriptor = Object.getOwnPropertyDescriptor(bridge, name === 'submitRun' && options.reservedSubmission ? 'submitReservedRun' : name);
      if (!descriptor || typeof descriptor.value !== 'function') return null;
      methods[name] = descriptor.value as Method;
    }
    retry = Object.getOwnPropertyDescriptor(bridge, 'retryConstellationInvocation')?.value;
  } catch { return null; }
  const call = async (name: typeof required[number], ...args: unknown[]): Promise<unknown> => methods[name].apply(bridge, args);
  const discovery = createModelDiscoveryAdapter(bridge);
  return Object.freeze({
    ...(discovery ? { discoverProviderModels: discovery.discover, cancelModelDiscovery: discovery.cancel } : {}),    ...(typeof retry === 'function' ? { async retryConstellationInvocation(value: RetryConstellationInvocationRequest) {
      record(value, ['requestID', 'invocationID', 'failedAttemptID']);
      identity(value.requestID); identity(value.invocationID); identity(value.failedAttemptID);
      return retry.call(bridge, { ...value });
    } } : {}),
    getSnapshot: () => call('getSnapshot'),
    getModelCatalog: () => call('getModelCatalog'),
    async createConversation(value: { id: string; title: string }) {
      record(value, ['id', 'title']); identity(value.id); text(value.title, 256);
      return call('createConversation', value);
    },
    async openConversation(id: string) { identity(id); return call('openConversation', id); },
    async saveRichDraft(value: SaveRichDraftRequest) { draft(value); return call('saveRichDraft', value); },
    async submitRun(value: SubmitRunRequest) {
      record(value, ['id', 'conversationID', 'prompt', 'mode', 'richDraftRevision']);
      identity(value.id); identity(value.conversationID); text(value.prompt, 128 * 1024); revision(value.richDraftRevision);
      if (value.mode !== 'direct' && value.mode !== 'constellation') invalid();
      return call('submitRun', value);
    },
    async reconcileRun(id: string) { identity(id); return call('reconcileRun', id); },
    async cancelRun(id: string) { identity(id); return call('cancelRun', id); },
    async onRunEvent(handler: (value: unknown) => void) {
      if (typeof handler !== 'function') invalid();
      const unlisten = await call('onRunEvent', handler);
      if (typeof unlisten !== 'function') throw new TypeError('Rivune host did not return an event cleanup function.');
      return unlisten as () => void;
    },
  });
}
