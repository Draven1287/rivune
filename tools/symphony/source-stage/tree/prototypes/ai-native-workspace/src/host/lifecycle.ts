import type { HostModelSelection, HostTeamSelection } from './tauriAdapter';

export interface FlushShutdownDraftInput {
  conversationID: string | null;
  draft: string;
  /** Renderer edit counter; echoed by the host independently of the durable CAS revision. */
  clientRevision: number;
  expectedRichRevision: number | null;
  mutationID: string;
  attachmentIDs: string[];
  selection: HostModelSelection | null;
  team: HostTeamSelection | null;
}
export interface FlushShutdownDraftRequest extends FlushShutdownDraftInput { token: string }
export interface HostLifecycleAdapter {
  beginShutdown(token: string): Promise<unknown>;
  flushShutdownDraft(request: FlushShutdownDraftRequest): Promise<unknown>;
  completeShutdown(token: string): Promise<unknown>;
  abortShutdown(token: string): Promise<unknown>;
  onShutdownRequested(handler: (token: unknown) => Promise<void>): Promise<() => void>;
  onOpenSettings(handler: () => void): Promise<() => void>;
}
export interface HostLifecycleState {
  phase: 'idle' | 'preparing' | 'flushing' | 'completing' | 'blocked' | 'completed' | 'disposed';
  token: string | null;
  message: string | null;
}
export interface HostLifecycleCallbacks {
  /** Freeze edits and reject if operations/submission outcomes remain unresolved. No replay. */
  prepareShutdown(): Promise<FlushShutdownDraftInput[]>;
  onOpenSettings(): void;
  onStateChange?(state: HostLifecycleState): void;
  onDraftFlushed?(input: FlushShutdownDraftInput, richDraftRevision: number | null): void;
}
const names = ['beginShutdown', 'flushShutdownDraft', 'completeShutdown', 'abortShutdown', 'onShutdownRequested', 'onOpenSettings'] as const;
function fail(): never { throw new TypeError('Invalid Rivune shutdown data.'); }
function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
}
function text(value: unknown, limit = 128): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || new TextEncoder().encode(value).length > limit) fail();
}
function revision(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) fail();
}
function model(value: unknown): asserts value is HostModelSelection | null {
  if (value === null) return;
  object(value); if (value.schemaVersion !== 1) fail(); text(value.providerID); text(value.catalogRevision);
  if (value.modelID !== null) text(value.modelID);
  if (value.effortID !== null) { text(value.effortID); if (value.modelID === null) fail(); }
}
function equal(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>; const b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
}
function validateDraft(value: unknown): asserts value is FlushShutdownDraftInput {
  object(value); text(value.mutationID); revision(value.clientRevision);
  if (typeof value.draft !== 'string' || new TextEncoder().encode(value.draft).length > 128 * 1024) fail();
  if (!Array.isArray(value.attachmentIDs) || value.attachmentIDs.length > 4 || new Set(value.attachmentIDs).size !== value.attachmentIDs.length) fail();
  value.attachmentIDs.forEach(id => text(id)); model(value.selection);
  if (value.conversationID === null) {
    if (value.draft !== '' || value.expectedRichRevision !== null || value.attachmentIDs.length || value.selection !== null || value.team !== null) fail();
    return;
  }
  text(value.conversationID); revision(value.expectedRichRevision);
  if (value.expectedRichRevision === Number.MAX_SAFE_INTEGER) fail();
  if (value.team !== null) {
    object(value.team); const team = value.team; revision(team.leadIndex);
    if (team.schemaVersion !== 1 || !Array.isArray(team.members) || team.members.length < 2 || team.members.length > 6 || team.leadIndex >= team.members.length) fail();
    const routes = new Set<string>();
    for (const member of team.members) { model(member); if (!member) fail(); const route = JSON.stringify([member.providerID, member.modelID, member.effortID]); if (routes.has(route)) fail(); routes.add(route); }
    if (!equal(value.selection, team.members[team.leadIndex])) fail();
  }
}
function durableReceipt(value: unknown, request: FlushShutdownDraftRequest): number | null {
  object(value);
  const next = request.expectedRichRevision === null ? null : request.expectedRichRevision + 1;
  if (value.state !== 'durable' || value.token !== request.token || value.clientRevision !== request.clientRevision || value.mutationID !== request.mutationID || value.conversationID !== request.conversationID || value.richDraftRevision !== next || !equal(value.attachmentIDs, request.attachmentIDs) || !equal(value.selection, request.selection) || !equal(value.team, request.team)) throw new Error('Shutdown draft was not durably acknowledged.');
  return next;
}

export function createHostLifecycleAdapter(bridge: unknown): HostLifecycleAdapter | null {
  if (!bridge || typeof bridge !== 'object' || Array.isArray(bridge)) return null;
  const methods = {} as Record<typeof names[number], (...args: unknown[]) => unknown>;
  try { for (const name of names) { const descriptor = Object.getOwnPropertyDescriptor(bridge, name); if (typeof descriptor?.value !== 'function') return null; methods[name] = descriptor.value; } } catch { return null; }
  const invoke = async (name: typeof names[number], ...args: unknown[]) => methods[name].apply(bridge, args);
  const tokenCall = async (name: 'beginShutdown' | 'completeShutdown' | 'abortShutdown', token: string) => { text(token); return invoke(name, token); };
  const subscribe = async (name: 'onShutdownRequested' | 'onOpenSettings', handler: unknown) => {
    if (typeof handler !== 'function') fail(); const cleanup = await invoke(name, handler);
    if (typeof cleanup !== 'function') throw new TypeError('Rivune lifecycle subscription has no cleanup function.');
    return cleanup as () => void;
  };
  return Object.freeze({
    beginShutdown: (token: string) => tokenCall('beginShutdown', token),
    completeShutdown: (token: string) => tokenCall('completeShutdown', token),
    abortShutdown: (token: string) => tokenCall('abortShutdown', token),
    async flushShutdownDraft(request: FlushShutdownDraftRequest) { text(request.token); validateDraft(request); return invoke('flushShutdownDraft', request); },
    onShutdownRequested: (handler: (token: unknown) => Promise<void>) => subscribe('onShutdownRequested', handler),
    onOpenSettings: (handler: () => void) => subscribe('onOpenSettings', handler),
  });
}

export function createHostLifecycleCoordinator(adapter: HostLifecycleAdapter, callbacks: HostLifecycleCallbacks) {
  let state: HostLifecycleState = Object.freeze({phase: 'idle', token: null, message: null});
  let disposed = false; let busy = false; let startup: Promise<void> | null = null;
  const cleanups: (() => void)[] = [];
  const cleanup = () => { for (const fn of cleanups.splice(0)) { try { fn(); } catch { /* Continue releasing the remaining listeners. */ } } };
  const set = (phase: HostLifecycleState['phase'], token: string | null, message: string | null = null) => {
    if (disposed) return;
    state = Object.freeze({phase, token, message});
    try { callbacks.onStateChange?.(state); } catch { /* UI observers cannot decide durability. */ }
  };
  const active = () => { if (disposed) throw new Error('Lifecycle disposed.'); };
  async function requestShutdown(value: unknown): Promise<boolean> {
    if (disposed || busy || state.phase !== 'idle') return false;
    try { text(value); } catch { return false; }
    const token = value; busy = true; set('preparing', token);
    try {
      const inputs = await callbacks.prepareShutdown(); active();
      if (!Array.isArray(inputs)) fail();
      // Snapshot every input before any shutdown mutation; caller edits cannot alter an admitted save.
      const drafts: FlushShutdownDraftInput[] = structuredClone(inputs);
      const ids = new Set<string | null>();
      for (const input of drafts) { validateDraft(input); if (ids.has(input.conversationID)) fail(); ids.add(input.conversationID); }
      if (!drafts.length) drafts.push({conversationID:null,draft:'',clientRevision:0,expectedRichRevision:null,mutationID:token,attachmentIDs:[],selection:null,team:null});
      await adapter.beginShutdown(token); active(); set('flushing', token);
      for (const input of drafts) {
        const request = {...input, token};
        const next = durableReceipt(await adapter.flushShutdownDraft(request), request); active();
        callbacks.onDraftFlushed?.(input, next);
      }
      set('completing', token); active(); await adapter.completeShutdown(token); active(); set('completed', token);
      return true;
    } catch {
      set('blocked', token, 'Rivune stayed open because shutdown could not be confirmed safely. Resume editing to recover before trying again.');
      return false;
    } finally { busy = false; }
  }
  return {
    getState: () => state,
    requestShutdown,
    start(): Promise<void> {
      if (disposed) return Promise.reject(new Error('Lifecycle disposed.'));
      if (startup) return startup;
      startup = (async () => {
        try {
          const settings = await adapter.onOpenSettings(() => { if (!disposed && state.phase === 'idle') callbacks.onOpenSettings(); });
          if (disposed) { settings(); return; } cleanups.push(settings);
          // Legacy bridge may deliver its pending token before subscription resolves.
          const shutdown = await adapter.onShutdownRequested(async token => { await requestShutdown(token); });
          if (disposed) { shutdown(); return; } cleanups.push(shutdown);
        } catch {
          cleanup(); set('blocked', state.token, 'Desktop lifecycle events are unavailable.');
          throw new Error('Desktop lifecycle subscription failed.');
        }
      })();
      return startup;
    },
    async abort(): Promise<boolean> {
      if (disposed || busy || state.phase !== 'blocked' || !state.token) return false;
      busy = true;
      try { await adapter.abortShutdown(state.token); active(); set('idle', null); return true; }
      catch { set('blocked', state.token, 'Shutdown recovery could not be confirmed. Rivune remains paused.'); return false; }
      finally { busy = false; }
    },
    dispose(): void {
      if (disposed) return;
      disposed = true; cleanup(); state = Object.freeze({phase:'disposed',token:state.token,message:null});
    },
  };
}
