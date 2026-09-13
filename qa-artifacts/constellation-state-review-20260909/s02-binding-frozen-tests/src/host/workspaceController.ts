import { parseModelCatalog, type ModelCatalog } from '../hooks/workspaceAdapter.ts';
import { parseHostSnapshot, parseHostAcknowledgement, parseHostRunEvent, type HostSnapshot, type HostProviderConfig } from './contracts.ts';
import type { HostBridgeAdapter, SaveRichDraftRequest, RetryConstellationInvocationRequest } from './tauriAdapter.ts';
import { configuredTeam, validateSavedTeam, teamRoutes } from './teamConfiguration.ts';

class HostActionError extends Error {}

export type PendingRun = { requestID: string; conversationID: string };
export interface RecoveryJournal {
  /** Absence is a host-enforced admission fence, not a browser cache miss. */
  authoritative?: boolean;
  read(): PendingRun | null | Promise<PendingRun | null>;
  write(value: PendingRun): void | Promise<void>;
  clear(value?: PendingRun): void | Promise<void>;
}
/** Legacy browser-session test helper only. Desktop mode requires the durable host journal. */
export function createSessionRecoveryJournal(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): RecoveryJournal {
  const key = 'rivune-host-pending-v1';
  return {
    read() {
      const raw = storage.getItem(key); if (raw === null) return null;
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object') throw new HostActionError('Unresolved request record is unreadable.');
      const v = value as Record<string, unknown>;
      if (v.version !== 1 || typeof v.requestID !== 'string' || !v.requestID || v.requestID.length > 128 || typeof v.conversationID !== 'string' || !v.conversationID || v.conversationID.length > 128) throw new HostActionError('Unresolved request record is unreadable.');
      return { requestID: v.requestID, conversationID: v.conversationID };
    },
    write(value) { storage.setItem(key, JSON.stringify({ version: 1, ...value })); },
    clear() { storage.removeItem(key); },
  };
}
export interface HostControllerState {
  retryNotice: { requestID: string; message: string } | null;
  retry: (RetryConstellationInvocationRequest & { conversationID: string; phase: 'pending' | 'uncertain'; message: string }) | null;
  phase: 'disconnected' | 'hydrating' | 'ready' | 'saving' | 'submitting' | 'uncertain' | 'running' | 'cancelling' | 'error';
  snapshot: HostSnapshot | null; catalog: ModelCatalog | null;
  pending: PendingRun | null; error: string | null;
  drafts: Readonly<Record<string, string>>;
}
const active = (status: string) => status === 'queued' || status === 'running';
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
    : value;
const equal = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** Host controller. Never imports demo data or generates answers. */
export function createHostWorkspaceController(adapter: HostBridgeAdapter | null, journal: RecoveryJournal, options: { id?: () => string; pollMs?: number } = {}) {
  const id = options.id ?? (() => crypto.randomUUID());
  let state: HostControllerState = { phase: 'disconnected', snapshot: null, catalog: null, pending: null, retry: null, retryNotice: null, error: null, drafts: {} };
  const listeners = new Set<() => void>();
  let busy = false, disposed = false, started = false, recoveryBlocked = false;
  let shutdownFrozen = false;
  let unsubscribe: (() => void) | null = null;
  let poll: ReturnType<typeof setTimeout> | undefined;
  let refreshPromise: Promise<void> | null = null;
  let refreshAgain = false;
  const sequences = new Map<string, number>();
  const pendingSaves = new Map<string, SaveRichDraftRequest>();
  const dirty = new Set<string>();
  const draftBases = new Map<string, number>();
  const editVersions = new Map<string, number>();
  let cancelling: string | null = null;
  let cancelBusy = false;
  function publish(next: Partial<HostControllerState>) { if (disposed) return; state = { ...state, ...next }; listeners.forEach(fn => fn()); }
  function fail(message: string) { publish({ phase: state.pending ? 'uncertain' : 'error', error: message }); }
  function schedulePoll() {
    clearTimeout(poll);
    if (!disposed && (state.pending || state.retry || state.snapshot?.runs.some(run => active(run.status)))) {
      poll = setTimeout(() => { void refresh().catch(() => fail('Saved run status could not be refreshed. Retrying while the request remains active.')).finally(schedulePoll); }, options.pollMs ?? 1500);
    }
  }
  async function refreshOnce() {
    if (!adapter) throw new HostActionError('Desktop host unavailable.');
    const [rawSnapshot, rawCatalog] = await Promise.all([adapter.getSnapshot(), adapter.getModelCatalog()]);
    const snapshot = parseHostSnapshot(rawSnapshot), catalog = parseModelCatalog(rawCatalog);
    if (disposed) return;
    const drafts = { ...state.drafts };
    for (const c of snapshot.conversations) {
      if (!dirty.has(c.id) && !pendingSaves.has(c.id)) { drafts[c.id] = c.draft; draftBases.set(c.id, c.richDraft.revision); }
    }
    const cancellingRun = snapshot.runs.find(run => run.id === cancelling);
    if (cancellingRun && !active(cancellingRun.status)) cancelling = null;
    publish({ snapshot, catalog, drafts });
    const pendingActive = state.pending && snapshot.runs.some(run => run.id === state.pending!.requestID && run.conversationID === state.pending!.conversationID && active(run.status));
    if (cancelling) publish({ phase: 'cancelling' });
    else if (pendingActive) publish({ phase: 'running', error: null });
    else if (!busy) publish({ phase: state.pending ? 'uncertain' : snapshot.runs.some(run => active(run.status)) ? 'running' : 'ready', error: null });
    schedulePoll();
  }
  function refresh(): Promise<void> {
    if (refreshPromise) { refreshAgain = true; return refreshPromise; }
    refreshPromise = (async () => { do { refreshAgain = false; await refreshOnce(); } while (refreshAgain && !disposed); })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }
  function receive(raw: unknown) {
    if (disposed || !adapter) return;
    const event = parseHostRunEvent(raw);
    if (!event) { void refresh().catch(() => fail('An unreadable update requires a workspace refresh.')); return; }
    const run = state.snapshot?.runs.find(item => item.id === event.requestID);
    const matchesPending = state.pending?.requestID === event.requestID && state.pending.conversationID === event.conversationID;
    if (!run && !matchesPending) return;
    if (run && (run.conversationID !== event.conversationID || !active(run.status))) return;
    const previous = sequences.get(event.requestID);
    if (previous !== undefined && event.sequence <= previous) return;
    sequences.set(event.requestID, event.sequence);
    // Even a valid delta is only a notification. Durable host answers own the transcript.
    void refresh().catch(() => fail('Live update received; saved run status could not be refreshed.'));
  }
  async function action(work: () => Promise<void>, allowPending = false) {
    if (!adapter || !started || disposed || busy || cancelBusy || recoveryBlocked || shutdownFrozen) throw new HostActionError('Workspace action unavailable.');
    if (state.pending && !allowPending) throw new HostActionError('Reconcile the unresolved request before another action.');
    if (state.retry && !allowPending) throw new HostActionError('Check or cancel the unresolved retry before another action.');
    busy = true;
    publish({ error: null, ...(state.phase === 'error' ? { phase: 'ready' as const } : {}) });
    try { await work(); }
    catch (error) { const message = error instanceof HostActionError ? error.message : 'Host action failed. Current edits and request identity are retained.'; fail(message); throw new HostActionError(message); }
    finally {
      busy = false;
      if (state.phase !== 'error' && state.phase !== 'uncertain') publish({ phase: cancelling ? 'cancelling' : state.snapshot?.runs.some(run => active(run.status)) ? 'running' : 'ready' });
      schedulePoll();
    }
  }
  function currentConversation(conversationID: string) {
    const c = state.snapshot?.conversations.find(item => item.id === conversationID);
    if (!c || c.readOnly) throw new HostActionError('Choose an editable host conversation.');
    return c;
  }
  function defaultSelection(conversationID: string) {
    const c = currentConversation(conversationID), catalog = state.catalog;
    if (!catalog || c.richDraft.team || c.richDraft.attachmentIDs.length) throw new HostActionError('This direct slice cannot replace an existing team or attachment draft.');
    const providerID = c.richDraft.selection?.providerID ?? state.snapshot?.selectedProviderID;
    const provider = catalog.providers.find(item => item.id === providerID);
    if (!provider || !state.snapshot?.providers.some(p => p.id === providerID && ['codex', 'claude', 'fixture'].includes(p.kind)) || provider.adapterState !== 'supported' || provider.installation !== 'installed' || !provider.supportsProviderDefault || provider.authentication === 'authNeeded' || provider.responseTest === 'failed') throw new HostActionError('No admitted provider-default route is configured. Inspect desktop setup.');
    if (c.richDraft.selection?.modelID || c.richDraft.selection?.effortID) throw new HostActionError('Existing explicit model choices must be reviewed before using provider defaults.');
    return { schemaVersion: 1 as const, providerID: provider.id, modelID: null, effortID: null, catalogRevision: catalog.revision };
  }
  function sendSelection(conversationID: string) {
    const c = currentConversation(conversationID);
    if (!c.richDraft.team) return defaultSelection(conversationID);
    try { validateSavedTeam(state.snapshot, state.catalog, c.richDraft.team); }
    catch (error) { throw new HostActionError(error instanceof Error ? error.message : 'Review the saved team.'); }
    return c.richDraft.team.members[c.richDraft.team.leadIndex];
  }
  async function save(conversationID: string, draft: string, forSend = false, execution?: Pick<SaveRichDraftRequest, 'selection' | 'team'>): Promise<number> {
    if (!adapter) throw new HostActionError('Desktop host unavailable.');
    const c = currentConversation(conversationID);
    const old = pendingSaves.get(conversationID);
    if (old && execution) throw new HostActionError('Resolve the earlier draft save before changing the team.');
    if (old && forSend && (!equal(old.selection, sendSelection(conversationID)) || !equal(old.team, c.richDraft.team))) throw new HostActionError('Resolve the earlier draft save before selecting a provider and sending.');
    if (!old && (draftBases.get(conversationID) ?? c.richDraft.revision) !== c.richDraft.revision) throw new HostActionError('This draft changed elsewhere. Retained edits need explicit conflict review before saving.');
    const request = old ?? { conversationID, mutationID: id(), expectedRevision: c.richDraft.revision, draft, attachmentIDs: [...c.richDraft.attachmentIDs], selection: forSend ? sendSelection(conversationID) : c.richDraft.selection, team: c.richDraft.team, ...execution };
    if (old && old.draft !== draft) throw new HostActionError('Resolve the earlier draft save before replacing it. Current edits remain here.');
    pendingSaves.set(conversationID, request);
    publish({ phase: 'saving' });
    let receipt: unknown;
    try { receipt = await adapter.saveRichDraft(request); } catch { throw new HostActionError('Draft save outcome is uncertain. Retry the same save before sending.'); }
    if (!receipt || typeof receipt !== 'object') throw new HostActionError('Draft save receipt is unreadable.');
    const r = receipt as Record<string, unknown>;
    if (r.mutationID === request.mutationID && r.conversationID === conversationID && r.state === 'rejected') pendingSaves.delete(conversationID);
    if (r.mutationID !== request.mutationID || r.conversationID !== conversationID || r.state !== 'durable' || r.revision !== request.expectedRevision + 1 || !equal(r.attachmentIDs, request.attachmentIDs) || !equal(r.selection, request.selection) || !equal(r.team, request.team)) throw new HostActionError('Draft save was not durably acknowledged. Edits are retained; review conflict or retry the same save.');
    pendingSaves.delete(conversationID);
    draftBases.set(conversationID, r.revision as number);
    dirty.add(conversationID);
    await refresh();
    const saved = currentConversation(conversationID);
    if (saved.richDraft.revision !== r.revision || saved.draft !== request.draft || !equal(saved.richDraft.selection, request.selection) || !equal(saved.richDraft.team, request.team) || !equal(saved.richDraft.attachmentIDs, request.attachmentIDs)) throw new HostActionError('Saved draft changed before submission. Review it before sending.');
    if (state.drafts[conversationID] === request.draft) dirty.delete(conversationID);
    return r.revision as number;
  }
  async function reconcilePending() {
    if (!adapter || !state.pending) return;
    const token = state.pending;
    if (journal.authoritative && await journal.read() === null) {
      await refresh();
      publish({ pending: null, phase: 'ready', error: null });
      return;
    }
    let raw: unknown;
    try { raw = await adapter.reconcileRun(token.requestID); } catch { throw new HostActionError('Request outcome remains uncertain. Reconcile again; do not resend.'); }
    const ack = parseHostAcknowledgement(raw, token.requestID);
    if (ack.state === 'uncertain') { publish({ phase: 'uncertain', error: 'Request outcome remains uncertain. Reconcile again; do not resend.' }); return; }
    await refresh();
    if (ack.state === 'accepted' && !state.snapshot?.runs.some(run => run.id === token.requestID && run.conversationID === token.conversationID)) throw new HostActionError('Accepted request is not yet in saved history. Reconcile again.');
    await journal.clear(token); publish({ pending: null, phase: 'ready', error: ack.state === 'rejected' ? 'The host rejected this request. Its saved draft is retained.' : null });
  }
  return {
    supportsInvocationRetry: !!adapter?.retryConstellationInvocation,
    getState: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async start() {
      if (started || disposed) return;
      if (!adapter) { publish({ phase: 'disconnected', error: 'Desktop host unavailable. No demo data is used by this controller.' }); return; }
      started = true; publish({ phase: 'hydrating' });
      try {
        let pending: PendingRun | null;
        try { pending = await journal.read(); } catch { recoveryBlocked = true; throw new HostActionError('Unresolved request storage is unavailable or unreadable.'); }
        publish({ pending });
        unsubscribe = await adapter.onRunEvent(receive);
        if (disposed) { unsubscribe(); return; }
        await refresh();
        if (pending) await action(reconcilePending, true);
      } catch { fail('Host recovery could not finish. Saved request identity and edits are retained.'); }
    },
    refresh: () => action(async () => { await refresh(); }),
    async refreshStatus() {
      if (!adapter || !started || disposed || recoveryBlocked || shutdownFrozen) throw new HostActionError('Workspace status unavailable.');
      try { await refresh(); } catch { fail('Saved run status could not be refreshed.'); throw new HostActionError('Saved run status could not be refreshed.'); }
    },
    editDraft(conversationID: string, draft: string) {
      if (shutdownFrozen || disposed) throw new HostActionError('Draft editing is paused while closing.');
      currentConversation(conversationID);
      if (typeof draft !== 'string' || new TextEncoder().encode(draft).length > 128 * 1024) throw new HostActionError('Draft exceeds the direct preview limit.');
      dirty.add(conversationID);
      editVersions.set(conversationID, (editVersions.get(conversationID) ?? 0) + 1);
      publish({ drafts: { ...state.drafts, [conversationID]: draft } });
    },
    saveDraft: (conversationID: string) => action(async () => { await save(conversationID, state.drafts[conversationID] ?? currentConversation(conversationID).draft); }),
    retryDraftSave: (conversationID: string) => action(async () => {
      const request = pendingSaves.get(conversationID);
      await save(conversationID, request?.draft ?? state.drafts[conversationID] ?? currentConversation(conversationID).draft);
    }),
    keepLocalDraft: (conversationID: string, reviewedRevision?: number) => action(async () => {
      if (pendingSaves.has(conversationID)) throw new HostActionError('Retry the earlier draft save to resolve its outcome first.');
      await refresh();
      if (reviewedRevision !== undefined && currentConversation(conversationID).richDraft.revision !== reviewedRevision) throw new HostActionError('The saved draft changed again. Review its latest text before keeping your draft.');
      draftBases.set(conversationID, currentConversation(conversationID).richDraft.revision);
      publish({ phase: 'ready', error: null });
    }),
    prepareShutdownDrafts() {
      shutdownFrozen = true;
      if (!started || disposed || busy || cancelBusy || recoveryBlocked || state.pending || state.retry || pendingSaves.size || !state.snapshot) throw new HostActionError('Resolve pending workspace changes before closing.');
      return [...dirty].sort().map(conversationID => {
        const c = currentConversation(conversationID);
        if (draftBases.get(conversationID) !== c.richDraft.revision) throw new HostActionError('Review the conflicting draft before closing.');
        return { conversationID, draft: state.drafts[conversationID], clientRevision: editVersions.get(conversationID) ?? 0, expectedRichRevision: c.richDraft.revision, mutationID: id(), attachmentIDs: [...c.richDraft.attachmentIDs], selection: c.richDraft.selection, team: c.richDraft.team };
      });
    },
    resumeAfterShutdown() { shutdownFrozen = false; },
    acknowledgeShutdownDraft(input: {conversationID: string | null; draft: string; clientRevision: number}, revision: number | null) {
      if (input.conversationID === null || revision === null) return;
      draftBases.set(input.conversationID, revision);
      if ((editVersions.get(input.conversationID) ?? 0) === input.clientRevision && state.drafts[input.conversationID] === input.draft) dirty.delete(input.conversationID);
    },
    createConversation: (title: string) => action(async () => {
      if (typeof title !== 'string' || !title.trim() || new TextEncoder().encode(title).length > 256) throw new HostActionError('Enter a valid conversation title.');
      const previous = state.snapshot?.activeConversationID;
      if (previous && dirty.has(previous)) await save(previous, state.drafts[previous]);
      const conversationID = id();
      try { await adapter!.createConversation({ id: conversationID, title: title.trim() }); } catch { await refresh(); if (!state.snapshot?.conversations.some(c => c.id === conversationID)) throw new HostActionError('Conversation creation was not confirmed. Refresh before creating another.'); }
      await adapter!.openConversation(conversationID); await refresh();
    }),
    openConversation: (conversationID: string) => action(async () => {
      if (!state.snapshot?.conversations.some(c => c.id === conversationID)) throw new HostActionError('Unknown host conversation.');
      const previous = state.snapshot?.activeConversationID;
      if (previous && dirty.has(previous)) await save(previous, state.drafts[previous]);
      await adapter!.openConversation(conversationID); await refresh();
    }),
    configureConversationProvider: (conversationID: string, choice: { provider: HostProviderConfig; revision: number; catalogRevision: string }) => {
      const expected={...choice,provider:{...choice.provider}};
      return action(async () => {
        await refresh();
        if (state.snapshot?.runs.some(run => active(run.status)) || state.pending) throw new HostActionError('Resolve the pending run before changing this conversation connection.');
        const c=currentConversation(conversationID);
        if(c.richDraft.team) throw new HostActionError('This conversation is bound to a Constellation team. Review the team instead.');
        if(c.richDraft.revision!==expected.revision || state.catalog?.revision!==expected.catalogRevision || !equal(state.snapshot?.providers.find(p=>p.id===expected.provider.id),expected.provider)) throw new HostActionError('Connection choices changed. Review the current routes before saving.');
        if(!teamRoutes(state.snapshot,state.catalog).some(p=>p.id===expected.provider.id)) throw new HostActionError('This route is not currently available for provider-default chat.');
        if(c.richDraft.selection?.modelID || c.richDraft.selection?.effortID) throw new HostActionError('Explicit model choices need separate review before replacement.');
        await save(conversationID,state.drafts[conversationID]??c.draft,false,{team:null,selection:{schemaVersion:1,providerID:expected.provider.id,modelID:null,effortID:null,catalogRevision:expected.catalogRevision}});
      });
    },
    configureTeam: (conversationID: string, providerIDs: string[] | null, leadID = '') => action(async () => {
      await refresh();
      if (state.snapshot?.runs.some(run => active(run.status))) throw new HostActionError('Wait for the active run before changing its team.');
      const c = currentConversation(conversationID);
      let team = null;
      if (providerIDs !== null) {
        try { team = configuredTeam(state.snapshot, state.catalog, providerIDs, leadID); }
        catch (error) { throw new HostActionError(error instanceof Error ? error.message : 'Review the team configuration.'); }
      }
      await save(conversationID, state.drafts[conversationID] ?? c.draft, false, { team, selection: team ? team.members[team.leadIndex] : c.richDraft.selection });
    }),
    send: (conversationID: string) => action(async () => {
      await refresh();
      if (state.snapshot?.runs.some(run => active(run.status))) throw new HostActionError('Wait for or cancel the current host run first.');
      const draft = state.drafts[conversationID] ?? currentConversation(conversationID).draft;
      if (!draft.trim()) throw new HostActionError('Enter a message.');
      const revision = await save(conversationID, draft, true);
      sendSelection(conversationID);
      const mode = currentConversation(conversationID).richDraft.team ? 'constellation' as const : 'direct' as const;
      if (disposed) return;
      if (shutdownFrozen) throw new HostActionError('Submission paused because the workspace is closing.');
      const pending = { requestID: id(), conversationID };
      // Persist the identity before crossing the host admission boundary.
      publish({ pending, phase: 'submitting', error: null });
      try { await journal.write(pending); } catch { throw new HostActionError('Request recovery could not be confirmed. Nothing was submitted; reconcile the reservation before continuing.'); }
      if (disposed) return;
      if (shutdownFrozen) throw new HostActionError('Submission paused because the workspace is closing. Reconcile the reserved request after reopening.');
      publish({ pending, phase: 'submitting', error: null });
      schedulePoll();
      let raw: unknown;
      try { raw = await adapter!.submitRun({ id: pending.requestID, conversationID, prompt: draft, mode, richDraftRevision: revision }); }
      catch { publish({ phase: 'uncertain', error: 'Submission outcome is uncertain. Reconcile this request; do not resend.' }); return; }
      if (disposed) return;
      const ack = parseHostAcknowledgement(raw, pending.requestID);
      if (ack.state === 'uncertain') { publish({ phase: 'uncertain', error: 'Submission outcome is uncertain. Reconcile this request; do not resend.' }); return; }
      await refresh();
      if (ack.state === 'accepted' && !state.snapshot?.runs.some(run => run.id === pending.requestID && run.conversationID === conversationID)) { publish({ phase: 'uncertain', error: 'Accepted request is not yet in saved history. Reconcile before sending again.' }); return; }
      await journal.clear(pending); publish({ pending: null, phase: 'ready', error: ack.state === 'rejected' ? 'The host rejected this request. The draft is retained.' : null });
      if (ack.state === 'accepted' && state.drafts[conversationID] === draft) publish({ drafts: { ...state.drafts, [conversationID]: currentConversation(conversationID).draft } });
    }),
    reconcile: () => action(reconcilePending, true),
    retryInvocation: (request: RetryConstellationInvocationRequest) => action(async () => {
      if (!adapter?.retryConstellationInvocation) throw new HostActionError('This host does not expose failed-step retry.');
      await refresh();
      const run = state.snapshot?.runs.find(r => r.id === request.requestID);
      if (!run || run.admitted.mode !== 'constellation' || run.status !== 'failed' || !run.failedInvocationID || !run.failedAttemptID || run.failedInvocationID !== request.invocationID || run.failedAttemptID !== request.failedAttemptID) throw new HostActionError('The saved failure changed. Review the latest run before retrying.');
      currentConversation(run.conversationID);
      if (state.snapshot?.runs.some(r => active(r.status))) throw new HostActionError('Wait for or cancel active work before retrying.');
      const retry = { ...request, conversationID: run.conversationID, phase: 'pending' as const, message: 'Retrying the saved failed step. Completed answers are retained.' };
      publish({ retry, retryNotice: null }); schedulePoll();
      let ack;
      try { ack = parseHostAcknowledgement(await adapter.retryConstellationInvocation({ ...request }), request.requestID); }
      catch {
        if (state.retry) publish({ retry: { ...retry, phase: 'uncertain', message: 'Retry outcome is unconfirmed. Check its saved status or cancel recovery; the prompt will not be replayed.' } });
        return;
      }
      if (disposed || !state.retry) return;
      if (ack.state === 'uncertain') { publish({ retry: { ...retry, phase: 'uncertain', message: 'The host could not confirm retry completion. Check saved status or cancel recovery.' } }); return; }
      try { await refresh(); } catch { publish({ retry: { ...retry, phase: 'uncertain', message: 'Retry replied, but saved status could not be refreshed. Check retry status.' } }); return; }
      const saved = state.snapshot?.runs.find(r => r.id === request.requestID && r.conversationID === retry.conversationID);
      if (ack.state === 'accepted' && (!saved || saved.status === 'failed' && saved.failedInvocationID === request.invocationID && saved.failedAttemptID === request.failedAttemptID)) {
        publish({ retry: { ...retry, phase: 'uncertain', message: 'The reply is not confirmed by changed saved state. Check retry status or cancel recovery.' } }); return;
      }
      publish({ retry: null, retryNotice: ack.state === 'rejected' ? { requestID: request.requestID, message: `The host rejected this failed-step retry. Saved answers are retained.${ack.error ? ` ${ack.error.slice(0, 1024)}` : ''}` } : null });
    }),
    reconcileRetry: () => action(async () => {
      const retry = state.retry; if (!adapter || !retry) return;
      let ack;
      try { ack = parseHostAcknowledgement(await adapter.reconcileRun(retry.requestID), retry.requestID); await refresh(); }
      catch { if (state.retry) publish({ retry: { ...retry, phase: 'uncertain', message: 'Retry status could not be checked. Saved answers remain; check again or cancel recovery.' } }); return; }
      if (disposed || !state.retry) return;
      const run = state.snapshot?.runs.find(r => r.id === retry.requestID && r.conversationID === retry.conversationID);
      const unchangedFailure = run?.status === 'failed' && run.failedInvocationID === retry.invocationID && run.failedAttemptID === retry.failedAttemptID;
      if (ack.state !== 'accepted' || !run || unchangedFailure) {
        publish({ retry: { ...retry, phase: 'uncertain', message: 'Retry progress is not confirmed by saved state. Cancel this recovery before another attempt.' } }); return;
      }
      publish({ retry: null, error: null });
    }, true),
    async cancel(requestID: string) {
      // Cancellation has its own lane: the original submission stays awaited and
      // the admission lock remains held, while only this exact durable run can stop.
      if (!adapter || !started || disposed || recoveryBlocked || shutdownFrozen || cancelBusy) throw new HostActionError('Cancellation is unavailable.');
      const run = state.snapshot?.runs.find(item => item.id === requestID);
      const failedRecovery = run?.admitted.mode === 'constellation' && run.status === 'failed' && (!!state.retry && state.retry.requestID === requestID || !!run.failedInvocationID && !!run.failedAttemptID);
      if (!run || (!active(run.status) && !failedRecovery)) throw new HostActionError('Choose an active saved run to cancel.');
      if (state.retry && state.retry.requestID !== requestID) throw new HostActionError('Cancellation does not match the unresolved retry.');
      if (state.pending && (state.pending.requestID !== requestID || state.pending.conversationID !== run.conversationID)) throw new HostActionError('Cancellation does not match the unresolved request.');
      cancelBusy = true;
      cancelling = requestID; publish({ phase: 'cancelling' });
      try {
        let raw: unknown;
        try { raw = await adapter.cancelRun(requestID); } catch { throw new HostActionError('Cancellation is unconfirmed. The request may still be active; refresh its saved status.'); }
        const ack = parseHostAcknowledgement(raw, requestID);
        if (ack.state !== 'accepted') throw new HostActionError('Cancellation was not confirmed. The request may still be active; refresh its saved status.');
        await refresh();
        if (state.retry?.requestID === requestID && state.snapshot?.runs.some(r => r.id === requestID && r.status === 'cancelled')) publish({ retry: null });
      } catch (error) {
        cancelling = null;
        const message = error instanceof HostActionError ? error.message : 'Cancellation status could not be refreshed. The saved run remains authoritative.';
        fail(message); throw new HostActionError(message);
      } finally { cancelBusy = false; schedulePoll(); }
    },
    dispose() { disposed = true; unsubscribe?.(); clearTimeout(poll); listeners.clear(); },
  };
}

/** Renderer projection uses only persisted runs; notifications never supply answer text. */
export function projectHostConversation(state: HostControllerState, conversationID: string) {
  const conversation = state.snapshot?.conversations.find(c => c.id === conversationID);
  if (!conversation) return null;
  return {
    id: conversation.id, title: conversation.title, readOnly: conversation.readOnly,
    draft: state.drafts[conversationID] ?? conversation.draft,
    messages: state.snapshot!.runs.filter(run => run.conversationID === conversationID).flatMap(run => [
      { id: `${run.id}:prompt`, requestID: run.id, role: 'user' as const, content: run.admitted.prompt },
      ...(run.answer === null ? [] : [{ id: `${run.id}:answer`, requestID: run.id, role: 'assistant' as const, content: run.answer }]),
    ]),
    runs: state.snapshot!.runs.filter(run => run.conversationID === conversationID).map(run => ({ requestID: run.id, status: run.status, error: run.error })),
  };
}
