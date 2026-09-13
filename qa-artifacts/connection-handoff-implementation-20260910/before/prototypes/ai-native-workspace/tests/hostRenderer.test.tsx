import type {HostArtifactSummary,HostArtifactRequest} from '../src/host/contracts';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HostWorkspace } from '../src/host/HostWorkspace';
import App from '../src/App';
import { rendererScenarioSelection } from './rendererScenarios';
import type { RendererScenario } from './rendererScenarios';
import '../src/styles.css';

type Result = { name: string; passed: boolean; error?: string };
declare global {
  interface Window { __HOST_RENDERER_RESULTS__: { status: 'running' | 'passed' | 'failed'; results: Result[] }; }
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// A private storage stand-in for this test document only. Existing browser
// session data is never read, overwritten, removed, or used as a host journal.
const storageValues = new Map<string, string>();
const memoryStorage: Storage = {
  get length() { return storageValues.size; }, clear() { storageValues.clear(); },
  getItem(key) { return storageValues.get(key) ?? null; }, key(index) { return [...storageValues.keys()][index] ?? null; },
  removeItem(key) { storageValues.delete(key); }, setItem(key, value) { storageValues.set(key, String(value)); },
};
const originalSessionStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
Object.defineProperty(window, 'sessionStorage', { configurable: true, value: memoryStorage });
const clone = <T,>(value: T): T => structuredClone(value);
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

function createFixture() {
  const provider = { id: 'fixture-cli', kind: 'fixture', executablePath: '/fake/provider', model: null, timeoutMs: 60000 };
  const conversation = (id: string, title: string) => ({ id, title, readOnly: false, draft: '', richDraft: { schemaVersion: 1, revision: 0, attachmentIDs: [] as string[], selection: null as unknown, team: null as unknown } });
  const snapshot = {
    artifacts: [] as HostArtifactSummary[],
    schemaVersion: 1, activeConversationID: 'fixture-chat', selectedProviderID: provider.id, providers: [provider], projects: [], attachments: [],
    conversations: [conversation('fixture-chat', 'Fixture chat')],
    runs: [] as { id: string; conversationID: string; status: string; updatedAt: string; admitted: { requestID: string; conversationID: string; prompt: string; mode: string; provider: typeof provider; retryOf: null }; answer: string | null; error: string | null }[],
  };
  const catalog = { schemaVersion: 1, revision: 'fixture-revision', providers: [{ id: provider.id, label: 'Local test fixture', transport: 'cli', adapterState: 'supported', installation: 'installed', authentication: 'unknown', responseTest: 'notTested', catalogState: 'unknown', models: [], defaults: { modelID: null, effortID: null }, supportsProviderDefault: true, errorCode: null }] };
  const calls: { name: string; value?: unknown }[] = [];
  let submitThrows = false, conflict = false, shutdownSaveFails = false, holdSubmit = false;
  let submitSettled = true;
  let releaseSubmit: (() => void) | null = null;
  let cancelOutcome: 'accepted' | 'rejected' | 'throw' = 'accepted';
  let recovery: { schemaVersion: 1; requestID: string; conversationID: string; state: 'reserved' | 'rejected' } | null = null;
  let runListener: ((event: unknown) => void) | null = null;
  let shutdownListener: ((token: unknown) => void) | null = null;
  let settingsListener: (() => void) | null = null;
  type DraftRequest = { conversationID: string; mutationID: string; expectedRevision: number; draft: string; attachmentIDs: string[]; selection: unknown; team: unknown };
  type SubmitRequest = { id: string; conversationID: string; prompt: string; mode: string };
  const bridge = {
    async getSubmissionRecovery() { calls.push({ name: 'recoveryRead' }); return clone(recovery); },
    async reserveSubmissionRecovery(value: { requestID: string; conversationID: string }) {
      calls.push({ name: 'recoveryReserve', value: clone(value) });
      if (recovery && (recovery.requestID !== value.requestID || recovery.conversationID !== value.conversationID)) throw new Error('Fixture unresolved request already reserved');
      recovery = { schemaVersion: 1, ...clone(value), state: 'reserved' };
      return clone(recovery);
    },
    async clearSubmissionRecovery(value: { requestID: string; conversationID: string }) {
      calls.push({ name: 'recoveryClear', value: clone(value) });
      if (!recovery || recovery.requestID !== value.requestID || recovery.conversationID !== value.conversationID) throw new Error('Fixture recovery identity mismatch');
      recovery = null; return { schemaVersion: 1, ...clone(value), state: 'cleared' };
    },
    async getSnapshot() { calls.push({ name: 'snapshot' }); return clone(snapshot); },
    async getModelCatalog() { return clone(catalog); },
    async createConversation(value: { id: string; title: string }) { calls.push({ name: 'create', value: clone(value) }); snapshot.conversations.push(conversation(value.id, value.title)); return null; },
    async openConversation(id: string) { calls.push({ name: 'open', value: id }); snapshot.activeConversationID = id; return null; },
    async saveRichDraft(request: DraftRequest) {
      calls.push({ name: 'save', value: clone(request) });
      if (conflict) return { state: 'rejected', mutationID: request.mutationID, conversationID: request.conversationID, revision: request.expectedRevision, attachmentIDs: [], selection: request.selection, team: null, error: 'Fixture draft conflict' };
      const chat = snapshot.conversations.find(item => item.id === request.conversationID)!;
      chat.draft = request.draft; chat.richDraft = { schemaVersion: 1, revision: request.expectedRevision + 1, attachmentIDs: clone(request.attachmentIDs), selection: clone(request.selection), team: clone(request.team) };
      return { state: 'durable', mutationID: request.mutationID, conversationID: request.conversationID, revision: chat.richDraft.revision, attachmentIDs: clone(request.attachmentIDs), selection: clone(request.selection), team: clone(request.team) };
    },
    async submitRun(request: SubmitRequest) {
      calls.push({ name: 'submit', value: clone(request) });
      snapshot.runs.push({ id: request.id, conversationID: request.conversationID, status: 'running', updatedAt: '2026-09-09T00:00:00Z', admitted: { requestID: request.id, conversationID: request.conversationID, prompt: request.prompt, mode: request.mode, provider, retryOf: null }, answer: null, error: null });
      snapshot.conversations.find(item => item.id === request.conversationID)!.draft = '';
      if (submitThrows) throw new Error('Fixture dropped admission reply');
      if (holdSubmit) {
        submitSettled = false;
        await new Promise<void>(resolve => { releaseSubmit = resolve; });
        submitSettled = true; releaseSubmit = null;
        calls.push({ name: 'submitResolved', value: request.id });
      }
      return { state: 'accepted', requestID: request.id };
    },
    async submitReservedRun(request: SubmitRequest) {
      if (recovery?.requestID !== request.id || recovery.conversationID !== request.conversationID || recovery.state !== 'reserved') throw new Error('Fixture request not reserved');
      return bridge.submitRun(request);
    },
    async reconcileRun(requestID: string) {
      calls.push({ name: 'reconcile', value: requestID });
      const accepted = snapshot.runs.some(run => run.id === requestID);
      if (!accepted && recovery?.requestID === requestID) recovery.state = 'rejected';
      return { state: accepted ? 'accepted' : 'rejected', requestID };
    },
    async cancelRun(requestID: string) {
      calls.push({ name: 'cancel', value: requestID });
      if (cancelOutcome === 'throw') throw new Error('Fixture cancellation transport failure');
      if (cancelOutcome === 'rejected') return { state: 'rejected', requestID, error: 'Fixture cancellation rejected' };
      snapshot.runs.find(run => run.id === requestID)!.status = 'cancelled'; return { state: 'accepted', requestID };
    },
    async onRunEvent(callback: (value: unknown) => void) { runListener = callback; return () => { runListener = null; }; },
    async onShutdownRequested(callback: (token: unknown) => void) { shutdownListener = callback; return () => { shutdownListener = null; }; },
    async onOpenSettings(callback: () => void) { settingsListener = callback; return () => { settingsListener = null; }; },
    async beginShutdown(token: string) { calls.push({ name: 'beginShutdown', value: token }); return null; },
    async completeShutdown(token: string) { calls.push({ name: 'completeShutdown', value: token }); return null; },
    async abortShutdown(token: string) { calls.push({ name: 'abortShutdown', value: token }); return null; },
    async flushShutdownDraft(request: { token: string; clientRevision: number; mutationID: string; conversationID: string | null; draft: string; expectedRichRevision: number | null; attachmentIDs: string[]; selection: unknown; team: unknown }) {
      calls.push({ name: 'flushShutdownDraft', value: clone(request) });
      if (shutdownSaveFails) throw new Error('Fixture shutdown save failed');
      const chat = snapshot.conversations.find(item => item.id === request.conversationID);
      if (chat && request.expectedRichRevision !== null) {
        chat.draft = request.draft;
        chat.richDraft = { schemaVersion: 1, revision: request.expectedRichRevision + 1, attachmentIDs: clone(request.attachmentIDs), selection: clone(request.selection), team: clone(request.team) };
      }
      return { state: 'durable', token: request.token, clientRevision: request.clientRevision, mutationID: request.mutationID, conversationID: request.conversationID, richDraftRevision: request.expectedRichRevision === null ? null : request.expectedRichRevision + 1, attachmentIDs: request.attachmentIDs, selection: request.selection, team: request.team };
    },
  };
  return { bridge, snapshot, catalog, calls, holdSubmit() { holdSubmit = true; }, releaseSubmit() { releaseSubmit?.(); }, isSubmitSettled() { return submitSettled; }, setCancelOutcome(value: 'accepted' | 'rejected' | 'throw') { cancelOutcome = value; }, getRecovery() { return clone(recovery); }, setSubmitThrows(value: boolean) { submitThrows = value; }, setConflict(value: boolean) { conflict = value; }, setShutdownSaveFails(value: boolean) { shutdownSaveFails = value; }, emit(value: unknown) { runListener?.(value); }, openSettings() { settingsListener?.(); }, shutdown(token: string) { shutdownListener?.(token); } };
}
type Fixture = ReturnType<typeof createFixture>;
function populateMockTeam(f: Fixture) {
  for (const id of ['second-provider', 'third-provider']) {
    f.snapshot.providers.push({ ...clone(f.snapshot.providers[0]), id });
    f.catalog.providers.push({ ...clone(f.catalog.providers[0]), id, label: 'Mock connection' });
  }
  Object.assign(f.snapshot, { runtimeCapabilities: { schemaVersion: 1, constellation: 'available', minimumMembers: 2, reasonCode: null } });
  const members = f.snapshot.providers.map(p => ({ schemaVersion: 1, providerID: p.id, modelID: null as string | null, effortID: null as string | null, catalogRevision: f.catalog.revision }));
  const team = { schemaVersion: 1, leadIndex: 1, members: members.slice(0, 2) };
  Object.assign(f.snapshot.conversations[0].richDraft, { selection: team.members[team.leadIndex], team });
  return { team, members };
}
const container = document.getElementById('fixture-root')!;
let root: Root | null = null;
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function waitFor(check: () => boolean, message: string) {
  for (let attempt = 0; attempt < 150; attempt++) { if (check()) return; await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); }
  throw new Error(message);
}
function messageInput(): HTMLTextAreaElement {
  const input = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]');
  assert(input, 'Expected the accessible Message textarea'); return input;
}
function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find(item => (item.getAttribute('aria-label') ?? item.textContent ?? '').trim().toLowerCase() === name.toLowerCase());
  assert(found, `Expected accessible button: ${name}`); return found;
}
async function click(name: string) { await act(async () => { const target = button(name); assert(!target.disabled, `${name} unexpectedly disabled`); target.click(); }); await settle(); }
async function type(value: string) {
  await act(async () => {
    const input = messageInput();
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function mount(f: Fixture, preserveSession = false) {
  if (!preserveSession) memoryStorage.clear();
  root = createRoot(container);
  await act(async () => { root!.render(<HostWorkspace bridge={f.bridge} />); });
  await waitFor(() => !!container.querySelector('textarea[aria-label="Message"]'), 'Host renderer did not hydrate');
  await settle();
}
async function unmount() { if (root) { await act(async () => { root!.unmount(); }); root = null; } }
const tests: [string, (f: Fixture) => Promise<void>][] = [
  ['Create and reopen conversations while preserving local drafts', async f => {
    await type('Draft before switching'); await click('New conversation');
    assert(f.calls.some(call => call.name === 'create'), 'New conversation did not call host create');
    assert(f.snapshot.conversations.length === 2, 'Host conversation was not created');
    await click('Fixture chat');
    assert(f.snapshot.activeConversationID === 'fixture-chat', 'Conversation open used wrong ID');
    assert(messageInput().value === 'Draft before switching', 'Draft text was lost while switching');
  }],
  ['Save CAS, send once, and cancel the exact host request', async f => {
    await type('Mounted renderer prompt'); await click('Save draft');
    assert(f.snapshot.conversations[0].draft === 'Mounted renderer prompt', 'Save did not retain host draft');
    await act(async () => { const target = button('Send'); target.click(); target.click(); }); await settle();
    assert(f.calls.filter(call => call.name === 'submit').length === 1, 'Double-click admitted more than one run');
    const run = f.snapshot.runs[0]; assert(run?.admitted.prompt === 'Mounted renderer prompt', 'Submitted prompt did not match draft');
    await click('Cancel');
    assert(f.calls.some(call => call.name === 'cancel' && call.value === run.id), 'Cancel did not use exact run identity');
    assert(run.status === 'cancelled', 'Cancelled state was not saved');
  }],
  ['Eventless direct host polling exposes Cancel before submission completes', async f => {
    f.holdSubmit(); await type('Direct host without run events'); await click('Send');
    try {
      const run = f.snapshot.runs[0]; assert(run, 'Direct host did not save its run');
      await waitFor(() => [...container.querySelectorAll('button')].some(item => item.textContent?.trim() === 'Cancel' && !item.disabled), 'Eventless run never became cancellable through polling');
      await click('Cancel');
      assert(!f.isSubmitSettled(), 'Cancellation waited for execution completion');
      assert(f.calls.filter(call => call.name === 'submit').length === 1 && f.calls.filter(call => call.name === 'cancel' && call.value === run.id).length === 1, 'Polling duplicated submission or changed cancellation identity');
      assert(run.status === 'cancelled', 'Eventless cancellation was not durable');
    } finally { await act(async () => { f.releaseSubmit(); }); }
  }],
  ['Cancel stays actionable during the lifetime submit Promise and terminal state survives restart', async f => {
    f.holdSubmit(); await type('Cancel while process invocation is pending'); await click('Send');
    try {
      const run = f.snapshot.runs[0]; assert(run, 'Lifetime submit did not durably admit a run');
      assert(!f.isSubmitSettled(), 'Submit Promise resolved before the cancellation test');
      await act(async () => { f.emit({ schemaVersion: 1, eventID: `${run.id}:1`, requestID: run.id, conversationID: run.conversationID, sequence: 1, kind: 'providerStarted', phase: 'direct', state: 'running', memberID: null, providerID: 'fixture-cli', role: null, summary: 'Fixture provider process is running', textDelta: null, error: null }); });
      await waitFor(() => [...container.querySelectorAll('button')].some(item => item.textContent?.trim() === 'Cancel' && !item.disabled), 'Cancel was not enabled while submit Promise remained pending');
      await click('Cancel');
      const cancels = f.calls.filter(call => call.name === 'cancel');
      assert(cancels.length === 1 && cancels[0].value === run.id, 'Cancellation did not target exactly one admitted request');
      assert(!f.isSubmitSettled(), 'Cancel was delayed until after submit Promise settled');
      assert(run.status === 'cancelled', 'Cancelled terminal state was not durable');
      await act(async () => { f.releaseSubmit(); }); await settle();
      assert(f.isSubmitSettled(), 'Lifetime submit did not settle after explicit release');
      assert([...container.querySelectorAll('.host-run')].some(item => item.textContent?.includes('cancelled')), 'Released submit overwrote durable cancelled status');
      await unmount(); memoryStorage.clear(); await mount(f);
      assert([...container.querySelectorAll('.host-run')].some(item => item.textContent?.includes('cancelled')), 'Cancelled status was lost after renderer restart');
      assert(f.calls.filter(call => call.name === 'submit').length === 1, 'Restart replayed lifetime submission');
      assert(f.calls.filter(call => call.name === 'cancel').length === 1, 'Restart replayed cancellation');
    } finally { await act(async () => { f.releaseSubmit(); }); }
  }],
  ...(['rejected', 'throw'] as const).map(outcome => [
    `Cancellation ${outcome === 'throw' ? 'transport failure' : 'rejection'} does not claim success or reopen Send`,
    async (f: Fixture) => {
      f.holdSubmit(); f.setCancelOutcome(outcome); await type('Retain running state when cancellation fails'); await click('Send');
      try {
        const run = f.snapshot.runs[0]; assert(run, 'Missing admitted run for cancellation failure');
        await act(async () => { f.emit({ schemaVersion: 1, eventID: `${run.id}:1`, requestID: run.id, conversationID: run.conversationID, sequence: 1, kind: 'providerStarted', phase: 'direct', state: 'running', memberID: null, providerID: 'fixture-cli', role: null, summary: 'Fixture provider process is running', textDelta: null, error: null }); });
        await waitFor(() => [...container.querySelectorAll('button')].some(item => item.textContent?.trim() === 'Cancel' && !item.disabled), 'Failed-cancel scenario had no usable Cancel during pending submit');
        await click('Cancel');
        assert(!f.isSubmitSettled(), 'Failed Cancel waited for submit to settle');
        assert(run.status === 'running', 'Cancellation failure changed durable run status');
        assert(![...container.querySelectorAll('.host-run')].some(item => item.textContent?.includes('cancelled')), 'Renderer falsely claimed cancelled');
        assert(button('Send').disabled, 'Cancellation failure enabled another Send');
        assert(f.calls.filter(call => call.name === 'cancel').length === 1, 'Cancellation failure duplicated the call');
        await act(async () => { f.releaseSubmit(); }); await settle();
        assert(button('Send').disabled, 'Settled submit enabled Send while durable run remained active');
        assert(run.status === 'running' && f.calls.filter(call => call.name === 'submit').length === 1, 'Cancellation recovery changed history or replayed request');
      } finally { await act(async () => { f.releaseSubmit(); }); }
    },
  ] as [string, (f: Fixture) => Promise<void>]),
  ['Uncertain admission reconciles without replaying the prompt', async f => {
    f.setSubmitThrows(true); await type('Uncertain fixture prompt'); await click('Send');
    assert(f.calls.filter(call => call.name === 'submit').length === 1, 'Expected exactly one uncertain admission');
    assert(button('Send').disabled, 'Send must be disabled while admission is uncertain');
    await click('Reconcile request');
    assert(f.calls.some(call => call.name === 'reconcile' && call.value === f.snapshot.runs[0].id), 'Reconcile used wrong request');
    assert(f.calls.filter(call => call.name === 'submit').length === 1, 'Reconcile replayed submission');
    await click('Cancel');
  }],
  ['Fresh renderer with browser storage lost recovers durable request without replay', async f => {
    f.setSubmitThrows(true); await type('Survive renderer restart'); await click('Send');
    assert(f.calls.filter(call => call.name === 'submit').length === 1, 'Expected one initial submission');
    const requestID = f.snapshot.runs[0].id;
    assert(f.getRecovery()?.requestID === requestID, 'Uncertain request identity was not durably reserved');
    await unmount(); memoryStorage.clear(); await mount(f);
    assert(f.getRecovery() === null, 'Reconciliation did not clear durable recovery identity');
    await waitFor(() => f.calls.some(call => call.name === 'reconcile' && call.value === requestID), 'Remount did not reconcile saved request identity');
    assert(f.calls.filter(call => call.name === 'submit').length === 1, 'Remount replayed the request');
    assert(container.textContent?.includes('Survive renderer restart'), 'Saved prompt did not return after remount');
    await click('Cancel');
  }],
  ['Native host settings event opens the mounted settings dialog', async f => {
    await act(async () => { f.openSettings(); }); await settle();
    assert(container.querySelector('dialog')?.open, 'Host settings event did not open dialog');
    assert(container.querySelector('dialog')?.textContent?.includes('AI connections'), 'Settings dialog lacks connection state');
    assert(document.activeElement === button('Close settings'), 'Settings did not focus its close control');
    await click('Close settings');
    assert(!container.querySelector('dialog')?.open, 'Settings close did not dismiss dialog');
    await waitFor(() => document.activeElement === messageInput(), 'Native settings dismissal lost the message focus target');
  }],
  ['Clean Settings sidebar dismissal restores its opener without saving or submitting', async f => {
    await click('Settings');
    assert(document.activeElement === button('Close settings'), 'Sidebar Settings did not receive modal focus');
    await act(async () => { container.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })); });
    await waitFor(() => !container.querySelector('dialog')?.open && document.activeElement === button('Settings'), 'Escape cancellation did not restore the sidebar opener');
    assert(!f.calls.some(call => ['save', 'submit', 'flushShutdownDraft'].includes(call.name)), 'Clean Settings navigation mutated workspace data');
  }],
  ['Clean Settings remount releases the old listener and repeated activation keeps one dialog', async f => {
    await unmount();
    const original = f.bridge.onOpenSettings; let registered = 0, released = 0;
    f.bridge.onOpenSettings = async callback => { registered++; const dispose = await original(callback); return () => { released++; dispose(); }; };
    await mount(f); await unmount();
    assert(registered === 1 && released === 1, 'Settings subscription leaked after unmount');
    await mount(f);
    await act(async () => { f.openSettings(); f.openSettings(); }); await settle();
    assert(container.querySelectorAll('dialog[open]').length === 1, 'Repeated Settings activation created extra dialogs');
    await click('Close settings');
    await waitFor(() => document.activeElement === messageInput(), 'Remounted Settings lost the message focus target');
    assert(!f.calls.some(call => ['save', 'submit', 'flushShutdownDraft'].includes(call.name)), 'Clean Settings remount mutated workspace data');
  }],
  ['Shutdown flushes dirty draft before completing the exact token', async f => {
    await type('Durable draft at shutdown');
    await act(async () => { f.shutdown('shutdown-success'); }); await settle();
    await waitFor(() => f.calls.some(call => call.name === 'completeShutdown'), 'Shutdown never completed');
    const begun = f.calls.findIndex(call => call.name === 'beginShutdown');
    const flushed = f.calls.findIndex(call => call.name === 'flushShutdownDraft');
    const completed = f.calls.findIndex(call => call.name === 'completeShutdown');
    assert(begun >= 0 && begun < flushed && flushed < completed, 'Shutdown did not begin, flush, then complete');
    assert(f.calls[completed].value === 'shutdown-success', 'Shutdown completed with wrong token');
    assert(f.snapshot.conversations[0].draft === 'Durable draft at shutdown', 'Shutdown did not durably flush current text');
    assert(messageInput().readOnly, 'Composer remained editable while shutdown completed');
    assert(!f.calls.some(call => call.name === 'submit'), 'Shutdown unexpectedly submitted a prompt');
  }],
  ['Failed shutdown save keeps text and explicit Stay in workspace aborts', async f => {
    f.setShutdownSaveFails(true); await type('Keep text after failed shutdown');
    await act(async () => { f.shutdown('shutdown-failed'); }); await settle();
    await waitFor(() => [...container.querySelectorAll('button')].some(item => item.textContent === 'Stay in workspace'), 'Failed shutdown did not expose stay action');
    assert(!f.calls.some(call => call.name === 'completeShutdown'), 'Failed shutdown incorrectly completed');
    assert(messageInput().value === 'Keep text after failed shutdown', 'Failed shutdown lost draft text');
    await click('Stay in workspace');
    assert(f.calls.some(call => call.name === 'abortShutdown' && call.value === 'shutdown-failed'), 'Stay did not abort exact shutdown token');
    await waitFor(() => !messageInput().readOnly, 'Composer did not resume editing after abort');
    assert(messageInput().value === 'Keep text after failed shutdown', 'Aborting shutdown lost local text');
    await type('Edited after abort'); assert(messageInput().value === 'Edited after abort', 'Composer failed after abort');
  }],
  ['Blocked shutdown preserves unresolved durable request identity', async f => {
    f.setSubmitThrows(true); await type('Uncertain request before closing'); await click('Send');
    const pending = f.getRecovery(); assert(pending, 'Expected durable pending identity');
    await act(async () => { f.shutdown('unresolved-shutdown'); }); await settle();
    await waitFor(() => [...container.querySelectorAll('button')].some(item => item.textContent === 'Stay in workspace'), 'Unresolved request did not block shutdown');
    assert(!f.calls.some(call => call.name === 'completeShutdown'), 'Shutdown completed with unresolved request');
    assert(f.getRecovery()?.requestID === pending.requestID, 'Blocked shutdown lost durable identity');
    await click('Stay in workspace');
    assert(f.getRecovery()?.requestID === pending.requestID, 'Aborting shutdown discarded unresolved identity');
  }],
  ['Draft conflict blocks send and retains the current text', async f => {
    f.setConflict(true); await type('Keep my conflicting edit'); await click('Send');
    assert(f.calls.some(call => call.name === 'save'), 'Expected attempted draft save');
    assert(!f.calls.some(call => call.name === 'submit'), 'Draft conflict incorrectly admitted a run');
    assert(messageInput().value === 'Keep my conflicting edit', 'Conflicted draft text disappeared');
  }],
];

window.__HOST_RENDERER_RESULTS__ = { status: 'running', results: [] };
const output = document.getElementById('test-results')!;
tests.push(['Constellation configuration saves lead and members; saved results remain separate from final answer', async f => {
  const second = { ...clone(f.snapshot.providers[0]), id: 'second-provider' };
  f.snapshot.providers.push(second);
  Object.assign(f.snapshot, { runtimeCapabilities: { schemaVersion: 1, constellation: 'available', minimumMembers: 2, reasonCode: null } });
  f.catalog.providers.push({ ...clone(f.catalog.providers[0]), id: second.id, label: 'Second connection' });
  await click('Refresh'); await type('Use the saved team');
  await openComposer(); await chooseExecution('Execution mode','team');
  await act(async () => {
    for (const input of container.querySelectorAll<HTMLInputElement>('.composer-execution input[type="checkbox"]')) input.click();
  }); await settle();
  await act(async () => { const lead = container.querySelector<HTMLSelectElement>('[aria-label="Constellation lead"]')!; lead.value = second.id; lead.dispatchEvent(new Event('change', { bubbles: true })); });
  await click('Save configuration');
  const team = f.snapshot.conversations[0].richDraft.team as { leadIndex: number; members: unknown[] };
  assert(team.leadIndex === 1 && team.members.length === 2, 'Team or lead was not durably saved');
  assert(!f.calls.some(c => c.name === 'submit'), 'Configuration dispatched work');
  await click('Send'); const submitted = f.calls.find(c => c.name === 'submit')!.value as { mode: string };
  assert(submitted.mode === 'constellation', 'Saved team sent as direct mode');
  const savedRun = f.snapshot.runs[0];
  Object.assign(savedRun.admitted, { team: clone(team) });
  Object.assign(savedRun, { status: 'completed', answer: 'Host final answer', memberResults: [{ schemaVersion: 1, memberID: 'member-1', providerID: f.snapshot.providers[0].id, role: 'independentAnswer', text: 'Saved independent member answer', truncated: true }], resolution: { schemaVersion: 1, kind: 'leadSynthesis', reviewed: false, reviewerMemberID: 'member-2', providerID: second.id, summary: 'Host saved synthesis summary' } });
  await click('Refresh');
  assert(container.textContent?.includes('Lead · second-provider'), 'Admitted lead role missing');
  assert(container.textContent?.includes('Host final answer') && container.textContent?.includes('Saved independent member answer'), 'Saved contributions or canonical answer missing');
  assert(container.textContent?.includes('Lead synthesis · evidence') && container.textContent?.includes('no separate peer review was run'), 'Lead synthesis semantics missing');
  assert(!container.querySelector<HTMLDetailsElement>('.host-team-run')?.open, 'Evidence should start collapsed');
  assert(!container.querySelector<HTMLDetailsElement>('.host-team-run details')?.open, 'Member answer should start collapsed');
  assert(container.textContent?.includes('shortened this saved member answer'), 'Truncation not disclosed');
  assert(!container.querySelector('[aria-label="Strategy"]'), 'Unsupported strategy control appeared');
}]);
tests.push(['Missing Constellation capability leaves direct chat available and team configuration disabled', async f => {
  await openComposer(); await chooseExecution('Execution mode','team');
  assert(container.textContent?.includes('has not reported Constellation support'), 'Missing capability explanation');
  assert(button('Save configuration').disabled, 'Unavailable team permits saving'); await click('Cancel configuration');
  await type('Direct remains available'); await click('Send');
  assert((f.calls.find(c => c.name === 'submit')!.value as { mode: string }).mode === 'direct', 'Direct mode regressed');
}]);

tests.push(['Team form synchronizes pristine changes and requires explicit conflict resolution for local choices', async f => {
  const { members } = populateMockTeam(f); await click('Refresh');
  const select = () => container.querySelector<HTMLSelectElement>('[aria-label="Constellation lead"]')!;
  assert(select().value === 'second-provider', 'Pristine team failed to load changed lead');
  await act(async () => { container.querySelector<HTMLElement>('.composer-execution summary')!.click(); container.querySelector<HTMLInputElement>('.composer-execution input')!.click(); }); await settle();
  const changed = { schemaVersion: 1, leadIndex: 1, members: members.slice(1) };
  Object.assign(f.snapshot.conversations[0].richDraft, { revision: 2, selection: changed.members[1], team: changed });
  await click('Refresh');
  assert(container.textContent?.includes('Saved configuration or connections changed'), 'Local choices silently overwritten');
  assert(button('Save configuration').disabled, 'Conflicting team could overwrite refreshed settings');
  await click('Load saved configuration');
  assert(select().value === 'third-provider', 'Explicit reload failed to load saved lead');
  const checks = [...container.querySelectorAll<HTMLInputElement>('.composer-execution input')].map(input => input.checked);
  assert(JSON.stringify(checks) === '[false,true,true]', 'Saved participant choices were not loaded');
  assert(!f.calls.some(c => c.name === 'save' || c.name === 'submit'), 'Form refresh/conflict resolution mutated host');
  f.catalog.providers = f.catalog.providers.filter(p => p.id !== 'third-provider'); await click('Refresh');
  assert(container.textContent?.includes('third-provider · unavailable'), 'Removed selected provider was hidden');
  assert(button('Save configuration').disabled, 'Removed provider left Save enabled');
}]);
tests.push(['Terminal Constellation keeps partial answers and labels member progress as historical with saved model attribution', async f => {
  const { team } = populateMockTeam(f);
  const admittedTeam = clone(team); admittedTeam.members[0].modelID = 'historical-model-a'; admittedTeam.members[0].effortID = 'high';
  const savedRun = { id: 'partial-team', conversationID: 'fixture-chat', status: 'failed', updatedAt: '2026-09-09T00:00:00Z', admitted: { requestID: 'partial-team', conversationID: 'fixture-chat', prompt: 'Mock partial team request', mode: 'constellation', provider: f.snapshot.providers[1], retryOf: null, team: admittedTeam }, answer: null, error: 'Mock member failure', memberResults: [{ schemaVersion: 1, memberID: 'member-1', providerID: f.snapshot.providers[0].id, role: 'independentAnswer', text: 'Retained mock contribution', truncated: false }], activity: { schemaVersion: 1, baseSequence: 8, entries: [{ schemaVersion: 1, eventID: 'partial-team:8', requestID: 'partial-team', conversationID: 'fixture-chat', sequence: 8, kind: 'memberStarted', phase: 'contribute', state: 'running', memberID: 'member-2', providerID: 'second-provider', role: 'independentAnswer', summary: 'Mock member started', textDelta: null, error: null }] }, resolution: null };
  f.snapshot.runs.push(savedRun);
  for (const status of ['failed', 'cancelled', 'preserved']) {
    savedRun.status = status; await click('Refresh');
    assert(container.textContent?.includes('Last recorded progress: contribute · running'), 'Terminal member progress falsely presented as current');
    assert(container.textContent?.includes('Retained mock contribution'), 'Partial answer lost');
    assert(container.textContent?.includes('Saved model: historical-model-a · effort: high'), 'Historical model attribution lost');
    assert(container.textContent?.includes('Provider-managed default · resolved model unknown'), 'Unknown resolved default implied known model');
    const answerSummary = [...container.querySelectorAll('summary')].find(s => s.textContent?.includes('independent answer'));
    assert(answerSummary?.textContent?.includes('Member · fixture-cli'), 'Contribution lacks admitted role and provider ID');
    assert(!container.textContent?.includes('Host reports a reviewed delivery'), 'Partial run implied reviewed delivery');
  }
  await unmount(); await mount(f, true); assert(container.textContent?.includes('Retained mock contribution'), 'Partial answer lost on renderer restart');
  assert(!f.calls.some(c => c.name === 'submit'), 'Restart replayed team request');
}]);

const teamFormTests: [RendererScenario, string, (f: Fixture) => Promise<void>][] = [];
async function openComposer(){await act(async()=>{const panel=container.querySelector<HTMLDetailsElement>('.composer-execution')!;if(!panel.open)panel.querySelector<HTMLElement>('summary')!.click();});await settle();}
async function chooseExecution(label:string,value:string){await act(async()=>{const select=container.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`)!;select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));});await settle();}
const teamLead = () => container.querySelector<HTMLSelectElement>('[aria-label="Constellation lead"]')!.value;
const teamChecks = () => [...container.querySelectorAll<HTMLInputElement>('.composer-execution input')].map(input => input.checked);
async function editThirdParticipant() {
  await act(async () => { container.querySelector<HTMLElement>('.composer-execution summary')!.click(); container.querySelectorAll<HTMLInputElement>('.composer-execution input')[2].click(); }); await settle();
}
function externalTeam(f: Fixture, members: ReturnType<typeof populateMockTeam>['members']) {
  const team = { schemaVersion: 1, leadIndex: 1, members: members.slice(1) };
  Object.assign(f.snapshot.conversations[0].richDraft, { revision: 2, selection: team.members[1], team });
}
teamFormTests.push(['team-pristine', 'Team form: pristine refresh loads the same conversation saved team', async f => {
  const { members } = populateMockTeam(f); await click('Refresh');
  assert(teamLead() === 'second-provider', 'Initial saved lead missing');
  externalTeam(f, members); await click('Refresh');
  assert(teamLead() === 'third-provider' && JSON.stringify(teamChecks()) === '[false,true,true]', 'Pristine form did not follow refreshed saved team');
  assert(!container.textContent?.includes('Saved configuration or connections changed'), 'Pristine form incorrectly requires conflict resolution');
  assert(!f.calls.some(c => c.name === 'save'), 'Pristine refresh wrote state');
}]);
teamFormTests.push(['team-dirty', 'Team form: dirty refresh retains choices and blocks overwrite', async f => {
  const { members } = populateMockTeam(f); await click('Refresh'); await editThirdParticipant();
  externalTeam(f, members); await click('Refresh');
  assert(container.textContent?.includes('Saved configuration or connections changed'), 'Dirty refresh hid the conflict');
  assert(teamLead() === 'second-provider' && teamChecks().every(Boolean), 'Dirty local choices were replaced');
  assert(button('Save configuration').disabled, 'Dirty conflict permits overwrite');
  assert(!f.calls.some(c => c.name === 'save'), 'Dirty refresh wrote state');
  await click('Load saved configuration');
  assert(teamLead() === 'third-provider' && JSON.stringify(teamChecks()) === '[false,true,true]', 'Load saved configuration did not restore remote participant IDs and lead');
  assert(!container.textContent?.includes('Saved configuration or connections changed'), 'Explicit saved-team load left the conflict unresolved');
  assert(!f.calls.some(c => c.name === 'save'), 'Loading the saved team wrote state');
}]);
teamFormTests.push(['team-keep', 'Team form: Keep my choices waits for explicit save using refreshed revision', async f => {
  const { members } = populateMockTeam(f); await click('Refresh'); await editThirdParticipant();
  externalTeam(f, members); await click('Refresh'); await click('Keep my choices');
  assert(teamLead() === 'second-provider' && teamChecks().every(Boolean), 'Keep choices discarded edits');
  assert(!button('Save configuration').disabled && !f.calls.some(c => c.name === 'save'), 'Keep choices saved without explicit action');
  await click('Save configuration');
  const saved = f.calls.filter(c => c.name === 'save');
  assert(saved.length === 1 && (saved[0].value as { expectedRevision: number }).expectedRevision === 2, 'Kept choices did not use the refreshed revision exactly once');
  const payload = saved[0].value as { team: { leadIndex: number; members: { providerID: string }[] }; selection: { providerID: string } };
  assert(JSON.stringify(payload.team.members.map(m => m.providerID)) === JSON.stringify(members.map(m => m.providerID)) && payload.team.leadIndex === 1 && payload.selection.providerID === 'second-provider', 'Keep save payload did not preserve the original local participant IDs and selected lead');
  assert(f.snapshot.conversations[0].richDraft.revision === 3 && teamChecks().every(Boolean), 'Kept choices were not acknowledged');
}]);
teamFormTests.push(['team-save-ack', 'Team form: durable save acknowledgement makes later refresh pristine', async f => {
  const { members } = populateMockTeam(f); await click('Refresh'); await editThirdParticipant();
  await click('Save configuration');
  assert(f.calls.filter(c => c.name === 'save').length === 1, 'Save was not acknowledged exactly once');
  assert(!container.textContent?.includes('Saved configuration or connections changed'), 'Own save acknowledgement appeared as conflict');
  externalTeam(f, members); await click('Refresh');
  assert(teamLead() === 'third-provider' && JSON.stringify(teamChecks()) === '[false,true,true]', 'Acknowledged form stayed dirty on a later refresh');
  assert(!container.textContent?.includes('Saved configuration or connections changed'), 'Acknowledged form incorrectly conflicts');
}]);
teamFormTests.push(['team-save-failed', 'Team form: rejected save keeps local choices and original saved team', async f => {
  const { members } = populateMockTeam(f); await click('Refresh'); const before = clone(f.snapshot.conversations[0].richDraft);
  await editThirdParticipant(); f.setConflict(true); await click('Save configuration');
  assert(JSON.stringify(f.snapshot.conversations[0].richDraft) === JSON.stringify(before), 'Rejected save changed durable team');
  assert(teamChecks().every(Boolean) && teamLead() === 'second-provider', 'Rejected save lost local choices');
  assert(container.textContent?.includes('Draft save was not durably acknowledged'), 'Rejected save was presented as success');
  await click('Refresh'); assert(teamChecks().every(Boolean), 'Refresh after rejection discarded unsaved choices');
  externalTeam(f, members); await click('Refresh');
  assert(container.textContent?.includes('Saved configuration or connections changed') && button('Save configuration').disabled, 'External team change after failed save did not require explicit resolution');
  assert(teamChecks().every(Boolean) && teamLead() === 'second-provider', 'External change after failure discarded local IDs or lead');
  assert(f.calls.filter(c => c.name === 'save').length === 1, 'Rejected save replayed');
}]);

function populateFailedRetry(f: Fixture) {
  const { team } = populateMockTeam(f);
  const run = { id: 'retry-run', conversationID: 'fixture-chat', status: 'failed', updatedAt: 'today', admitted: { requestID: 'retry-run', conversationID: 'fixture-chat', prompt: 'Synthetic partial failure', mode: 'constellation', provider: f.snapshot.providers[1], retryOf: null, team }, answer: null, error: 'Mock member failure', failedInvocationID: 'opaque-invocation', failedAttemptID: 'opaque-attempt', memberResults: [{ schemaVersion: 1, memberID: 'member-1', providerID: 'fixture-cli', role: 'independentAnswer', text: 'Already saved mock contribution', truncated: false }] };
  f.snapshot.runs.push(run); return run;
}
teamFormTests.push(['retry-pending', 'Invocation retry: exact payload, no duplicate pending action, cancellation retains answers', async f => {
  await unmount(); const saved = populateFailedRetry(f); let release: (value: unknown) => void = () => {};
  Object.assign(f.bridge, { retryConstellationInvocation(request: unknown) { f.calls.push({ name: 'retry', value: clone(request) }); saved.status = 'running'; return new Promise(resolve => { release = resolve; }); } });
  await mount(f);
  try {
    await click('Retry failed step');
    assert(![...container.querySelectorAll('button')].some(b => b.textContent === 'Retry failed step'), 'Duplicate pending retry action remains available');
    assert(container.textContent?.includes('Already saved mock contribution'), 'Pending retry hid saved answer');
    await click('Refresh'); await click('Cancel');
    await act(async () => { release({ requestID: saved.id, state: 'uncertain' }); }); await settle();
    assert(!container.textContent?.includes('Check retry status'), 'Late uncertain receipt resurrected cancelled retry');
    const retries = f.calls.filter(c => c.name === 'retry');
    assert(retries.length === 1 && JSON.stringify(retries[0].value) === JSON.stringify({ requestID: 'retry-run', invocationID: 'opaque-invocation', failedAttemptID: 'opaque-attempt' }), 'Retry did not bind exact saved identities once');
    assert(saved.status === 'cancelled' && saved.memberResults.length === 1, 'Cancellation lost retained contribution');
  } finally { await act(async () => { release({ requestID: saved.id, state: 'accepted' }); }); }
}]);
teamFormTests.push(['retry-uncertain', 'Invocation retry: lost response exposes status check and cancel recovery without replay', async f => {
  await unmount(); const saved = populateFailedRetry(f);
  Object.assign(f.bridge, { async retryConstellationInvocation(request: unknown) { f.calls.push({ name: 'retry', value: clone(request) }); throw new Error('Mock lost response'); } });
  await mount(f); await click('Retry failed step');
  assert(container.textContent?.includes('Retry outcome is unconfirmed') && container.textContent.includes('Already saved mock contribution'), 'Uncertain retry state or partial output missing');
  await click('Check retry status');
  assert(container.textContent?.includes('Cancel this recovery before another attempt'), 'Unchanged failed state incorrectly resolved retry');
  await click('Cancel recovery'); await unmount(); await mount(f);
  assert(saved.status === 'cancelled' && container.textContent?.includes('Already saved mock contribution'), 'Recovery cancellation/remount lost output');
  assert(f.calls.filter(c => c.name === 'retry').length === 1, 'Checking or remounting replayed retry');
}]);
teamFormTests.push(['retry-rejected', 'Invocation retry: rejection is explicit and missing capability has no action', async f => {
  await unmount(); const saved = populateFailedRetry(f); await mount(f);
  assert(container.textContent?.includes('does not expose failed-step retry'), 'Missing capability was implied available');
  await unmount(); Object.assign(f.bridge, { async retryConstellationInvocation(request: unknown) { f.calls.push({ name: 'retry', value: clone(request) }); return { requestID: saved.id, state: 'rejected' }; } });
  await mount(f); await click('Retry failed step');
  assert(container.textContent?.includes('host rejected this failed-step retry') && container.textContent.includes('Already saved mock contribution'), 'Rejected retry hid failure or partial output');
  assert(saved.status === 'failed' && f.calls.filter(c => c.name === 'retry').length === 1, 'Rejected retry changed saved status or replayed');
}]);

teamFormTests.push(['connection-guidance', 'Connection guidance is visible without setup or conversation mutations', async f => {
  await click('Settings');
  const text=container.querySelector('dialog')?.textContent ?? '';
  assert(text.includes('Next step:') && text.includes('Sign-in') && text.includes('Response test'), 'Separated connection guidance missing');
  assert(!text.includes('authNeeded') && !text.includes('notTested'), 'Internal state names leaked into settings');
  assert(!f.calls.some(call => ['save','submit','configureProvider','discoverProviders','discoverProviderModels'].includes(call.name)), 'Viewing guidance initiated setup or inference');
  await click('Close settings');
  await waitFor(() => document.activeElement === button('Settings'), 'Guidance dismissal lost focus');
}]);


teamFormTests.push(['provider-missing','Missing guarded setup bridge never offers legacy configuration',async f=>{
 if(window.innerWidth<=700)await click('Conversations');
 await click('Settings');assert(container.textContent?.includes('does not support guarded connection setup'),'Missing bridge explanation');assert(![...container.querySelectorAll('button')].some(b=>b.textContent==='Find installed providers'),'Legacy setup exposed');await click('Close settings');await waitFor(()=>document.activeElement===button('Settings'),'Settings focus lost');
}]);
for(const mode of ['provider-success','provider-setup','provider-stale'] as const) teamFormTests.push([mode,`Provider setup ${mode}: explicit inspection and uncertain-save reconciliation`,async f=>{
 await unmount();let saves=0,inspections=0;const route={id:'codex:discovered:synthetic',kind:'codex',executablePath:'/synthetic/codex',installed:true};
 Object.assign(f.bridge,{
  async discoverProviders(){inspections++;return [route];},
  async configureSelectedProvider(provider: typeof f.snapshot.providers[number]){saves++;if(mode==='provider-stale')throw Error('CONFIGURATION_ROUTE_STALE');f.snapshot.providers.push(provider);f.snapshot.selectedProviderID=provider.id;if(mode==='provider-success')return {schemaVersion:1,state:'durable',provider,selectedProviderID:provider.id};throw Error('Synthetic lost acknowledgement');}
 });
 await mount(f);await type('Preserve unsaved local draft');if(window.innerWidth<=700)await click('Conversations');await click('Settings');assert(inspections===0&&saves===0,'Setup ran on mount');
 await click('Find installed providers');await waitFor(()=>!!container.querySelector('#provider-route'),'Routes missing');
 const picker=container.querySelector<HTMLSelectElement>('#provider-route')!;picker.focus();assert(document.activeElement===picker,'Picker cannot receive keyboard focus');
 await act(async()=>{picker.value=route.id;picker.dispatchEvent(new Event('change',{bubbles:true}));});await settle();
 await click('Save as workspace default');assert(saves===1,'Configuration duplicate or missing');if(mode==='provider-success'){assert(container.textContent?.includes('Default connection saved'),'Durable acknowledgement missing');assert(!container.querySelector('#provider-route'),'Saved route still editable');await click('Close settings');assert(messageInput().value==='Preserve unsaved local draft','Successful setup changed draft');return;}assert(button('Find installed providers').disabled,'Uncertain state permits another inspection/save');
 assert(button('Save as workspace default').disabled,'Uncertain save allows retry');await click('Check saved configuration');
 assert(saves===1,'Reconciliation replayed configuration');
 assert(container.textContent?.includes(mode==='provider-stale'?'does not match this attempt':'visible configuration matches this attempt'),'Snapshot reconciliation was not authoritative');
 assert(!container.querySelector('#provider-route'),'Old route remained eligible after reconciliation');assert(container.textContent?.includes('earlier save remains unconfirmed'),'Snapshot promoted crash durability');assert(button('Find installed providers').disabled,'Snapshot implicitly enabled another save');assert(!button('Review routes for a new save').disabled,'Explicit re-review unavailable');
 await click('Close settings');assert(messageInput().value==='Preserve unsaved local draft','Setup changed local draft');await waitFor(()=>document.activeElement===button('Settings'),'Settings opener focus lost');
 assert(!f.calls.some(c=>['submit','save'].includes(c.name)),'Setup sent or saved a conversation');
}]);
teamFormTests.push(['provider-refresh','Durable provider save survives display refresh rejection',async f=>{
 await unmount();let failRefresh=false,saves=0;const read=f.bridge.getSnapshot;
 Object.assign(f.bridge,{async discoverProviders(){return [{id:'codex:discovered:synthetic',kind:'codex',executablePath:'/synthetic/codex',installed:true}];},async getSnapshot(){if(failRefresh)throw Error('Synthetic display failure');return read();},async configureSelectedProvider(p:typeof f.snapshot.providers[number]){saves++;f.snapshot.providers.push(p);f.snapshot.selectedProviderID=p.id;failRefresh=true;return {schemaVersion:1,state:'durable',provider:p,selectedProviderID:p.id};}});
 await mount(f);await type('Draft survives refresh failure');if(window.innerWidth<=700)await click('Conversations');await click('Settings');await click('Find installed providers');
 const select=container.querySelector<HTMLSelectElement>('#provider-route')!;await act(async()=>{select.value='codex:discovered:synthetic';select.dispatchEvent(new Event('change',{bubbles:true}));});await settle();await click('Save as workspace default');
 assert(container.textContent?.includes('saved durably'),'Durable result demoted');assert(!container.textContent?.includes('earlier save remains unconfirmed'),'Refresh failure implied uncertain persistence');assert(saves===1,'Duplicate configuration');
 failRefresh=false;await click('Refresh workspace display');assert(saves===1,'Display refresh configured again');await click('Close settings');assert(messageInput().value==='Draft survives refresh failure','Draft lost');
}]);
teamFormTests.push(['provider-empty','Empty provider copy matches guarded setup capability',async f=>{
 for(const supported of [false,true]){await unmount();f.catalog.providers=[];f.snapshot.providers=[];f.snapshot.selectedProviderID=null as unknown as string;
 if(supported)Object.assign(f.bridge,{async discoverProviders(){return [];},async configureSelectedProvider(){throw Error('Never called');}});
 await mount(f);if(window.innerWidth<=700)await click('Conversations');await click('Settings');assert(container.textContent?.includes(supported?'Use Add a connection below':'does not expose connection configuration in this panel'),'Contradictory empty setup copy');await click('Close settings');}
}]);
teamFormTests.push(['conversation-binding','Explicit conversation pin preserves draft and workspace default',async f=>{
 await unmount();const p={...f.snapshot.providers[0],id:'second-provider',executablePath:'/synthetic/second'};f.snapshot.providers.push(p);f.catalog.providers.push({...f.catalog.providers[0],id:p.id,label:'Second connection'});await mount(f);await type('Keep binding draft');
 await openComposer();await chooseExecution('Single AI connection',p.id);await click('Save configuration');
 assert(container.textContent?.includes('Single AI · Second connection'),'Pinned identity not visible');assert(f.snapshot.selectedProviderID==='fixture-cli','Workspace default silently changed');assert(messageInput().value==='Keep binding draft','Binding changed draft');assert(!f.calls.some(c=>c.name==='submit'),'Binding submitted prompt');
}]);
teamFormTests.push(['follow-default','Explicit inheritance remains visible after workspace default changes',async f=>{
 await unmount();const p={...f.snapshot.providers[0],id:'second-provider',executablePath:'/synthetic/second'};f.snapshot.providers.push(p);f.catalog.providers.push({...f.catalog.providers[0],id:p.id,label:'Later default'});f.snapshot.conversations[0].richDraft.selection={schemaVersion:1,providerID:'fixture-cli',modelID:null,effortID:null,catalogRevision:f.catalog.revision};await mount(f);await type('Keep inherited draft');
 await openComposer();await chooseExecution('Single AI connection','');await click('Save configuration');assert(f.snapshot.conversations[0].richDraft.selection===null,'Follow retained pin');assert(messageInput().value==='Keep inherited draft','Follow changed draft');f.snapshot.selectedProviderID=p.id;await click('Refresh');assert(container.textContent?.includes('Workspace default: Later default'),'Inherited state did not follow current default');assert(!f.calls.some(c=>c.name==='submit'),'Inheritance dispatched');
}]);
teamFormTests.push(['configuration-recovery','Renderer restart retains uncertain configuration and reconciles without replay',async f=>{
 await unmount();const provider={id:'codex:discovered:recovery',kind:'codex',executablePath:'/synthetic/codex',model:null,timeoutMs:60000};
 const op={schemaVersion:1,operationID:'configuration:1',intent:{provider,select:true,guard:{schemaVersion:1,expectedProvider:null,expectedSelectedProviderID:null}},state:'applied',acknowledged:false};let applies=0,reconciles=0;
 Object.assign(f.bridge,{async reserveProviderConfiguration(){throw Error('Must not reserve during recovery');},async getProviderConfigurationOperation(){return op.acknowledged?null:clone(op);},async applyProviderConfiguration(){applies++;throw Error('Must not replay');},async reconcileProviderConfiguration(id:string){assert(id===op.operationID,'Wrong recovery ID');reconciles++;if(op.state==='reserved')op.state='rejected';return clone(op);},async acknowledgeProviderConfiguration(id:string){assert(id===op.operationID,'Wrong ack ID');op.acknowledged=true;return clone(op);},async discoverProviders(){return [];}});
 await mount(f);if(window.innerWidth<=700)await click('Conversations');await click('Settings');assert(container.textContent?.includes('earlier connection save needs reconciliation'),'Restart lost uncertainty');assert(button('Find installed providers').disabled,'Restart allowed another save');await unmount();await mount(f);if(window.innerWidth<=700)await click('Conversations');await click('Settings');assert(button('Find installed providers').disabled,'Second restart lost fence');await click('Check saved configuration');assert(container.textContent?.includes('earlier connection save is durably confirmed'),'No durable recovered wording');assert(!button('Find installed providers').disabled,'Recovery did not unlock explicit review');assert(applies===0&&reconciles===1,'Recovery replayed or duplicated');await click('Close settings');
 await unmount();op.state='reserved';op.acknowledged=false;const read=f.bridge.getSnapshot;let failRefresh=false;f.bridge.getSnapshot=async()=>{if(failRefresh)throw Error('Synthetic refresh failure');return read();};await mount(f);if(window.innerWidth<=700)await click('Conversations');await click('Settings');failRefresh=true;await click('Check saved configuration');assert(container.textContent?.includes('Connection recovery is complete'),'Rejected recovery refresh wording missing');failRefresh=false;await click('Refresh workspace display');assert(!container.textContent?.includes('connection saved durably'),'Unused reservation falsely claimed a saved connection');assert(applies===0,'Rejected recovery applied configuration');await click('Close settings');
}]);
teamFormTests.push(['compact-composer','Acknowledged supersession requires explicit stable review and preserves local message',async f=>{
 for(const recovered of [false,true]){
  await unmount();if(f.snapshot.providers.length===1)populateMockTeam(f);f.snapshot.conversations[0].richDraft.team=null;f.snapshot.conversations[0].richDraft.selection=null;
  const original=f.bridge.saveRichDraft;let receipt:Awaited<ReturnType<typeof original>>|null=null;
  f.bridge.saveRichDraft=async request=>{if(receipt){f.calls.push({name:'save',value:clone(request)});return clone(receipt);}receipt=await original(request);f.snapshot.conversations[0].draft='External saved message';Object.assign(f.snapshot.conversations[0].richDraft,{revision:request.expectedRevision+2,selection:null,team:null});if(recovered)throw Error('Applied reply lost');return receipt;};
  await mount(f);await type('Keep newest local message');await openComposer();await chooseExecution('Execution mode','team');await act(async()=>{const inputs=container.querySelectorAll<HTMLInputElement>('.composer-execution input');inputs[0].click();inputs[1].click();});await chooseExecution('Constellation lead','second-provider');await click('Save configuration');
  if(recovered)await click('Retry draft save');await click('Review saved configuration');assert(container.textContent?.includes('External saved message'),'Review omitted saved message');const saves=f.calls.filter(c=>c.name==='save').length;
  f.snapshot.conversations[0].richDraft.revision++;f.snapshot.conversations[0].draft='Changed while review open';await click('Accept saved configuration and keep my text');assert(container.textContent?.includes('Saved configuration changed again'),'Stale review was accepted');assert(button('Send').disabled,'Stale review removed confirmation fence');assert(messageInput().value==='Keep newest local message','Stale review lost text');
  await click('Review saved configuration');assert(container.textContent?.includes('Changed while review open'),'Review did not refresh displayed saved text');await click('Accept saved configuration and keep my text');assert(!container.textContent?.includes('Showing the last confirmed configuration'),'Reviewed supersession remained fenced');assert(!button('Send').disabled,'Accepted supersession left Send blocked');assert(document.activeElement===messageInput(),'Accepted review did not return focus to local text');assert(messageInput().value==='Keep newest local message','Accepting saved configuration replaced local text');assert(f.snapshot.conversations[0].draft==='Changed while review open','Review wrote host draft');assert(f.calls.filter(c=>c.name==='save').length===saves&&!f.calls.some(c=>c.name==='submit'),'Review replayed or submitted');
  f.bridge.saveRichDraft=original;
 }
}]);
teamFormTests.push(['compact-composer','Applied unconfirmed configuration stays fenced across refresh until exact acknowledgement',async f=>{
 for(const outcome of ['lost','malformed','refresh']){
  await unmount();f.snapshot.conversations[0].richDraft.team=null;f.snapshot.conversations[0].richDraft.selection=null;
  if(f.snapshot.providers.length===1)populateMockTeam(f);f.snapshot.conversations[0].richDraft.team=null;f.snapshot.conversations[0].richDraft.selection=null;
  const original=f.bridge.saveRichDraft,read=f.bridge.getSnapshot;let receipt:Awaited<ReturnType<typeof original>>|null=null,failRead=false;
  f.bridge.getSnapshot=async()=>{if(failRead){failRead=false;throw Error('Synthetic refresh failure after acknowledgement');}return read();};
  f.bridge.saveRichDraft=async request=>{if(receipt){f.calls.push({name:'save',value:clone(request)});return clone(receipt);}receipt=await original(request);if(outcome==='lost')throw Error('Applied reply lost');if(outcome==='malformed')return {...receipt,mutationID:'wrong'};failRead=true;return receipt;};
  await mount(f);await type('Applied but uncertain draft');const summary=()=>container.querySelector('.composer-execution summary')!.textContent;const before=summary();const countBefore=f.calls.filter(c=>c.name==='save').length;
  await openComposer();await chooseExecution('Execution mode','team');await act(async()=>{const inputs=container.querySelectorAll<HTMLInputElement>('.composer-execution input');inputs[0].click();inputs[1].click();});await chooseExecution('Constellation lead','second-provider');await click('Save configuration');assert(summary()===before,'Unconfirmed operation changed resting summary');assert(container.textContent?.includes('Configuration not confirmed'),'Missing uncertainty status');assert(button('Send').disabled,'Unconfirmed configuration left Send enabled');await act(async()=>{for(const modifier of ['metaKey','ctrlKey']){const event=new KeyboardEvent('keydown',{key:'Enter',[modifier]:true,bubbles:true,cancelable:true});messageInput().dispatchEvent(event);assert(event.defaultPrevented,'Uncertain keyboard shortcut retained default text behavior');}});await settle();assert(!f.calls.some(c=>c.name==='submit')&&messageInput().value==='Applied but uncertain draft','Keyboard Send bypassed uncertainty or changed draft');
  if(outcome!=='refresh'){await click('Refresh');assert(summary()===before,'Normal refresh promoted unconfirmed host configuration');assert(container.textContent?.includes('Configuration not confirmed'),'Refresh hid uncertainty');await click('Retry draft save');const saves=f.calls.filter(c=>c.name==='save').slice(countBefore);assert(saves.length===2&&JSON.stringify(saves[0].value)===JSON.stringify(saves[1].value),'Recovery replaced original mutation');}
  else {await click('Retry draft save');assert(f.calls.filter(c=>c.name==='save').length===countBefore+1,'Acknowledged refresh retry saved again');}
  assert(summary()==='Constellation · 2 members · Lead: Mock connection (second-provider)','Exact acknowledgement and refreshed state did not update summary');assert(!container.textContent?.includes('Showing the last confirmed configuration'),'Confirmation fence remained after recovery');assert(!container.textContent?.includes('Configuration was not confirmed'),'Recovered editor retained stale uncertainty notice');assert(messageInput().value==='Applied but uncertain draft','Recovery lost draft');assert(!f.calls.some(c=>c.name==='submit'),'Recovery dispatched');
  f.bridge.saveRichDraft=original;f.bridge.getSnapshot=read;
 }
}]);
teamFormTests.push(['compact-composer','Duplicate connection labels expose stable IDs and pin each exact route',async f=>{
 populateMockTeam(f);await click('Refresh');await type('Preserve duplicate route draft');
 for(const id of ['second-provider','third-provider']){
  await openComposer();await chooseExecution('Execution mode','single');
  const picker=container.querySelector<HTMLSelectElement>('[aria-label="Single AI connection"]')!;
  for(const routeID of ['second-provider','third-provider'])assert([...picker.options].some(option=>option.value===routeID&&option.textContent===`Pin to: Mock connection (${routeID})`),'Duplicate route lacks unique visible option label');
  await chooseExecution('Single AI connection',id);await click('Save configuration');
  assert((f.snapshot.conversations[0].richDraft.selection as {providerID:string}|null)?.providerID===id,'Saved wrong duplicate-labeled route');assert(f.snapshot.conversations[0].richDraft.team===null,'Pin retained team');
  assert(container.querySelector('.composer-execution summary')?.textContent===`Single AI · Mock connection (${id})`,'Durable summary does not distinguish pinned route');assert(messageInput().value==='Preserve duplicate route draft','Pin lost draft');
 }
 assert(f.calls.filter(c=>c.name==='save').length===2&&!f.calls.some(c=>c.name==='submit'),'Duplicate selection saved extra times or submitted');
}]);
teamFormTests.push(['compact-composer','Composer catalog changes require explicit review and unavailable teams are never cleared',async f=>{
 populateMockTeam(f);await click('Refresh');await openComposer();await chooseExecution('Execution mode','single');const summary=container.querySelector<HTMLElement>('.composer-execution summary')!.textContent;
 f.catalog.revision='updated-catalog';await click('Refresh');assert(button('Save configuration').disabled&&container.textContent?.includes('Saved configuration or connections changed'),'Catalog change did not fence dirty editor');assert(container.querySelector<HTMLElement>('.composer-execution summary')!.textContent===summary,'Local mode leaked into summary');await click('Keep my choices');assert(!button('Save configuration').disabled,'Explicit catalog review did not unlock valid choices');assert(!f.calls.some(c=>c.name==='save'),'Keep choices saved silently');await click('Cancel configuration');await openComposer();
 f.catalog.providers=f.catalog.providers.filter(p=>p.id!=='second-provider');await click('Refresh');assert(container.querySelector<HTMLElement>('.composer-execution summary')!.textContent?.includes('Lead: second-provider'),'Missing catalog label lost saved lead ID');assert(f.snapshot.conversations[0].richDraft.team!==null,'Unavailable saved team cleared');assert(button('Save configuration').disabled,'Unavailable team could save');assert(container.textContent?.includes('second-provider · unavailable'),'Unavailable saved member hidden');await chooseExecution('Execution mode','single');assert(!button('Save configuration').disabled,'Unavailable team blocked explicit valid Single AI');await click('Cancel configuration');assert(f.snapshot.conversations[0].richDraft.team!==null,'Cancel cleared unavailable team');assert(!f.calls.some(c=>c.name==='save'||c.name==='submit'),'Review changed host state');
}]);
teamFormTests.push(['compact-composer','Uncertain atomic composer save retains choices and resting summary until recovery',async f=>{
 await unmount();populateMockTeam(f);const original=f.bridge.saveRichDraft;let fail=true;f.bridge.saveRichDraft=async request=>{if(fail){f.calls.push({name:'save',value:clone(request)});throw Error('Synthetic uncertain save');}return original(request);};await mount(f);await type('Uncertain composer draft');await openComposer();await chooseExecution('Execution mode','single');const initial=container.querySelector<HTMLElement>('.composer-execution summary')!.textContent;await click('Save configuration');assert(container.querySelector<HTMLElement>('.composer-execution summary')!.textContent===initial,'Uncertain save changed resting summary');assert(container.querySelector<HTMLDetailsElement>('.composer-execution')!.open,'Uncertainty closed choices');assert(messageInput().value==='Uncertain composer draft','Uncertainty lost draft');assert(container.textContent?.includes('Configuration was not confirmed'),'Uncertainty lacked notice');fail=false;await click('Retry draft save');assert(f.snapshot.conversations[0].richDraft.team===null&&f.snapshot.conversations[0].richDraft.selection===null,'Recovery lost atomic default intent');const saves=f.calls.filter(c=>c.name==='save');assert(saves.length===2&&JSON.stringify(saves[0].value)===JSON.stringify(saves[1].value),'Recovery changed mutation');assert(!f.calls.some(c=>c.name==='submit'),'Recovery sent request');
}]);
teamFormTests.push(['compact-composer','Compact composer keeps saved summary, atomically switches modes and restores keyboard focus',async f=>{
 const {team}=populateMockTeam(f);await click('Refresh');await type('Keep composer draft');
 const summary=()=>container.querySelector<HTMLElement>('.composer-execution summary')!;
 const initial=summary().textContent;assert(initial==='Constellation · 2 members · Lead: Mock connection (second-provider)','Saved team summary');
 await openComposer();await chooseExecution('Execution mode','single');assert(summary().textContent===initial,'Unsaved mode changed summary');assert(container.textContent?.includes('Provider default · exact model not reported'),'Honest model wording absent');assert(!f.calls.some(c=>c.name==='save'||c.name==='submit'),'Editor change persisted');
 await click('Save configuration');assert(f.snapshot.conversations[0].richDraft.team===null&&f.snapshot.conversations[0].richDraft.selection===null,'Single mode did not follow explicit default');assert(f.calls.filter(c=>c.name==='save').length===1,'Mode switch was not atomic');assert(document.activeElement===summary(),'Save failed to restore summary focus');assert(summary().textContent==='Single AI · Local test fixture','Durable default summary missing');assert(messageInput().value==='Keep composer draft','Configuration lost draft');
 await openComposer();await chooseExecution('Single AI connection','second-provider');assert(summary().textContent==='Single AI · Local test fixture','Unsaved pin changed summary');await act(async()=>{summary().dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));});assert(!container.querySelector<HTMLDetailsElement>('.composer-execution')!.open&&document.activeElement===summary(),'Escape did not close and restore focus');
 await openComposer();assert(container.querySelector<HTMLSelectElement>('[aria-label="Single AI connection"]')!.value==='','Escape kept hidden unsaved pin');await chooseExecution('Single AI connection','second-provider');await click('Save configuration');assert((f.snapshot.conversations[0].richDraft.selection as {providerID:string}|null)?.providerID==='second-provider','Explicit pin missing');assert(summary().textContent==='Single AI · Mock connection (second-provider)','Pinned summary missing');
 await openComposer();await chooseExecution('Execution mode','team');assert(button('Save configuration').disabled,'Empty team was saveable');await click('Cancel configuration');assert(!f.calls.some(c=>c.name==='submit'),'Configuration dispatched');
 // Frozen historical team is independent from the current Single AI summary.
 const run={id:'composer-history',conversationID:'fixture-chat',status:'failed',updatedAt:'2026-09-10T00:00:00Z',admitted:{requestID:'composer-history',conversationID:'fixture-chat',prompt:'Historical request',mode:'constellation',provider:f.snapshot.providers[1],retryOf:null,team:clone(team)},answer:null,error:'Synthetic failure',memberResults:[{schemaVersion:1,memberID:'member-1',providerID:'fixture-cli',role:'independentAnswer',text:'Retained composer history',truncated:false}]};f.snapshot.runs.push(run);await click('Refresh');assert(container.textContent?.includes('Lead · second-provider')&&container.textContent?.includes('Retained composer history'),'Current composer changed frozen run evidence');
}]);
teamFormTests.push(['conversation-list','Compact search preserves selected chat draft and transcript node',async f=>{
 await unmount();for(let i=1;i<20;i++)f.snapshot.conversations.push({...clone(f.snapshot.conversations[0]),id:`saved-${i}`,title:i===1?'Needle old conversation':`Saved conversation ${i}`});f.snapshot.runs.push({id:'list-scroll',conversationID:'fixture-chat',status:'completed',updatedAt:'2026-09-10T00:00:00Z',admitted:{requestID:'list-scroll',conversationID:'fixture-chat',prompt:'Synthetic scrolling check',mode:'direct',provider:f.snapshot.providers[0],retryOf:null},answer:'Saved synthetic line.\n'.repeat(200),error:null});for(let i=2;i<10;i++){const run=clone(f.snapshot.runs[0]);run.id=`newer-${i}`;run.conversationID=`saved-${i}`;run.updatedAt='2026-09-11T00:00:00Z';run.admitted={...run.admitted,requestID:run.id,conversationID:run.conversationID};f.snapshot.runs.push(run);}assert(f.snapshot.runs.filter(r=>Date.parse(r.updatedAt)>Date.parse(f.snapshot.runs[0].updatedAt)).length===8,'Fixture needs eight newer conversations');await mount(f);await type('Preserve my unsaved draft');
 const transcript=container.querySelector<HTMLElement>('.host-transcript')!;transcript.scrollTop=80;const savedScroll=transcript.scrollTop;assert(savedScroll>0,'Scroll fixture must overflow');const before=JSON.stringify(f.snapshot.conversations);const nav=()=>container.querySelectorAll('.host-conversation-list nav button');assert(nav().length===8,'Compact count');assert(container.querySelector('.host-conversation-list [aria-current="page"]'),'Active old chat missing');
 if(window.innerWidth<=700)await click('Conversations');await click('Show all (20)');assert(nav().length===20,'Show all incomplete');button('Show recent').focus();await click('Show recent');assert(nav().length===8,'Collapse failed');assert(document.activeElement===button('Show all (20)'),'Collapse lost focus');
 const input=container.querySelector<HTMLInputElement>('.host-conversation-list input')!;
 async function search(value:string){await act(async()=>{input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});await settle();}
 await search('NEEDLE');assert(nav().length===1&&nav()[0].textContent==='Needle old conversation','Full-list search failed');assert(document.activeElement===input,'Search lost focus');assert(f.snapshot.activeConversationID==='fixture-chat','Search changed selection');assert(messageInput().value==='Preserve my unsaved draft','Search changed draft');assert(container.querySelector('.host-transcript')===transcript,'Search replaced transcript');if(window.innerWidth<=700)await click('Chat');assert(transcript.scrollTop===savedScroll,'Search moved transcript scroll');if(window.innerWidth<=700)await click('Conversations');assert(JSON.stringify(f.snapshot.conversations)===before,'Filtering mutated history');assert(!f.calls.some(c=>['save','open'].includes(c.name)),'Filtering or collapse called persistence/navigation');
 await search('no match');assert(container.textContent?.includes('No matching conversations'),'Empty result missing');await search('');assert(nav().length===8,'Clear search did not restore compact view');await search('Needle');await click('Needle old conversation');assert(f.snapshot.activeConversationID==='saved-1','Open failed');await waitFor(()=>document.activeElement===messageInput(),'Open did not focus Chat');assert(f.snapshot.conversations[0].draft==='Preserve my unsaved draft','Navigation lost draft');
}]);
teamFormTests.push(['conversation-list','Failed draft save blocks filtered navigation and preserves mobile pane',async f=>{
 await unmount();f.snapshot.conversations.push({...clone(f.snapshot.conversations[0]),id:'other',title:'Other saved chat'});f.setConflict(true);await mount(f);await type('Keep failed-navigation draft');if(window.innerWidth<=700)await click('Conversations');const target=button('Other saved chat');target.focus();await click('Other saved chat');assert(document.activeElement===target,'Failed save lost intended list focus');assert(document.activeElement!==messageInput(),'Failed save focused Message');assert(f.snapshot.activeConversationID==='fixture-chat','Failed save changed selection');assert(messageInput().value==='Keep failed-navigation draft','Failed save lost draft');assert(!f.calls.some(c=>c.name==='open'),'Failed save reached open');if(window.innerWidth<=700)assert(container.querySelector('.host-sidebar.is-visible'),'Failed save switched away from Conversations');
}]);
teamFormTests.push(['conversation-list','Failed host open after saved draft preserves selection and list focus',async f=>{
 await unmount();f.snapshot.conversations.push({...clone(f.snapshot.conversations[0]),id:'other',title:'Other saved chat'});f.bridge.openConversation=async id=>{f.calls.push({name:'open',value:id});throw Error('Synthetic host open rejection');};await mount(f);await type('Save before rejected open');if(window.innerWidth<=700)await click('Conversations');const target=button('Other saved chat');target.focus();await click('Other saved chat');assert(f.snapshot.activeConversationID==='fixture-chat','Rejected open changed selection');assert(f.snapshot.conversations[0].draft==='Save before rejected open','Draft was not saved before open');assert(messageInput().value==='Save before rejected open','Rejected open lost visible draft');assert(document.activeElement===target,'Rejected open lost intended list focus');assert(document.activeElement!==messageInput(),'Rejected open focused Message');assert(f.calls.findIndex(c=>c.name==='save')<f.calls.findIndex(c=>c.name==='open'),'Open preceded save');if(window.innerWidth<=700)assert(container.querySelector('.host-sidebar.is-visible'),'Rejected open switched mobile pane');
}]);
async function populateResults(f:Fixture){
 const texts=['Saved A 🪐\n<script>not executed</script>\n'+('A reading line\n'.repeat(65)),'Saved B e\u0301\n'+('B reading line\n'.repeat(25))];
 const responses=new Map<string,unknown>();
 for(let i=0;i<2;i++){
  const text=texts[i],id=`result-${i===0?'a':'b'}`,requestID=`saved-run-${i}`;
  const bytes=new TextEncoder().encode(text);const contentSHA256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  f.snapshot.runs.push({id:requestID,conversationID:'fixture-chat',status:'completed',updatedAt:'2026-09-10',admitted:{requestID,conversationID:'fixture-chat',prompt:`Saved question ${i}`,mode:'direct',provider:f.snapshot.providers[0],retryOf:null},answer:text,error:null});
  const summary:HostArtifactSummary={schemaVersion:1,artifactID:id,conversationID:'fixture-chat',requestID,origin:{kind:'finalAnswer',memberID:null,providerID:f.snapshot.providers[0].id},displayName:'Final answer',previewKind:'plainText',languageHint:null,byteLength:bytes.length,contentSHA256,availability:'available',createdAt:`2026-09-10T00:00:0${i}Z`,supersedesArtifactID:null};f.snapshot.artifacts.push(summary);
  responses.set(id,{schemaVersion:1,artifactID:id,conversationID:summary.conversationID,requestID,previewKind:'plainText',languageHint:null,byteLength:bytes.length,contentSHA256,availability:'available',text});
 }
 Object.assign(f.bridge,{async inspectArtifact(q:HostArtifactRequest){f.calls.push({name:'inspectArtifact',value:clone(q)});return clone(responses.get(q.artifactID));}});
 return {responses,texts};
}
async function openResults(){await click('Results (2)');await waitFor(()=>!!container.querySelector('.host-results'),'Results absent');}
async function selectResult(id:string){await act(async()=>{const row=[...container.querySelectorAll<HTMLButtonElement>('.host-results li button')].find(b=>b.getAttribute('aria-label')?.endsWith(id));assert(row,'Result row missing');row.click();});await settle();}
const resultText=()=>container.querySelector<HTMLTextAreaElement>('.host-results textarea');
async function resultReady(text:string){await waitFor(()=>resultText()?.value===text,'Exact saved text missing');}
teamFormTests.push(['results-flow','Results actual adapter/list/text/focus and preserved chat',async f=>{
 await unmount();const {texts}=await populateResults(f);await mount(f);await type('Keep this unsaved draft');const chat=container.querySelector<HTMLElement>('#host-chat')!,transcript=container.querySelector<HTMLElement>('.host-transcript')!;transcript.scrollTop=85;const position=transcript.scrollTop;const draft=messageInput();const calls=f.calls.filter(c=>c.name==='save').length;
 await openResults();assert(!f.calls.some(c=>c.name==='inspectArtifact'),'List mounting inspected content');assert(document.activeElement===container.querySelector('.host-results h2'),'Results heading not focused');if(innerWidth<=1200){assert(chat.inert&&getComputedStyle(chat).visibility==='hidden','Narrow chat not mounted inert');}
 await selectResult('result-a');await resultReady(texts[0]);assert(!container.querySelector('.host-results script'),'Result executed markup');assert(draft===messageInput()&&draft.value==='Keep this unsaved draft','Chat remounted or draft lost');
 await click('Back to results');assert(document.activeElement?.getAttribute('aria-label')?.endsWith('result-a'),'Back did not restore exact row');
 await act(async()=>{container.querySelector('.host-results h2')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));});await waitFor(()=>!container.querySelector('.host-results'),'Escape did not close');await waitFor(()=>document.activeElement===button('Results (2)'),'Close did not restore opener');assert(!chat.inert&&transcript.scrollTop===position,'Scroll/inert restoration failed');assert(f.calls.filter(c=>c.name==='save').length===calls&&!f.calls.some(c=>c.name==='submit'),'Results mutated conversation');
}]);
teamFormTests.push(['results-races','Results A/B and same-tuple close/reopen races',async f=>{
 await unmount();const {responses,texts}=await populateResults(f);const pending:{id:string;resolve:(v:unknown)=>void;reject:(e:unknown)=>void}[]=[];Object.assign(f.bridge,{inspectArtifact(q:HostArtifactRequest){return new Promise((resolve,reject)=>pending.push({id:q.artifactID,resolve,reject}));}});await mount(f);await openResults();await selectResult('result-a');await click('Back to results');await selectResult('result-b');
 await act(async()=>pending[0].resolve(responses.get('result-a')));await settle();assert(!resultText(),'Late A leaked into B');await act(async()=>pending[1].resolve(responses.get('result-b')));await resultReady(texts[1]);
 await click('Back to results');await selectResult('result-a');await click('Close results');await openResults();await selectResult('result-a');await act(async()=>pending[2].reject(Error('late old A')));await settle();assert(container.textContent?.includes('Opening saved result')&&!container.textContent?.includes('Could not open this saved result'),'Same-tuple stale failure published');await act(async()=>pending[3].resolve(responses.get('result-a')));await resultReady(texts[0]);
 await click('Back to results');await selectResult('result-a');await act(async()=>pending[4].reject(Error('current read failed')));await waitFor(()=>!![...container.querySelectorAll('button')].find(b=>b.textContent==='Retry inspection'),'Retry missing');
 await act(async()=>{const retry=button('Retry inspection');retry.click();retry.click();});await settle();assert(pending.length===6,'Duplicate retry started multiple inspections');await act(async()=>pending[5].resolve(responses.get('result-b')));await waitFor(()=>container.textContent?.includes('Could not open this saved result')??false,'Foreign result accepted');assert(!resultText(),'Foreign result rendered');
 await click('Retry inspection');await unmount();await mount(f);await act(async()=>pending[6].resolve(responses.get('result-a')));await settle();assert(!container.querySelector('.host-results'),'Disposed owner published late content');
}]);
teamFormTests.push(['results-invalidation','Results selected tuple invalidation clears before late response',async f=>{
 await unmount();const {responses}=await populateResults(f);const original=clone(f.snapshot.artifacts[0]);let resolve!:(v:unknown)=>void;Object.assign(f.bridge,{inspectArtifact(){return new Promise(r=>resolve=r);}});await mount(f);await openResults();await selectResult('result-a');f.snapshot.artifacts=f.snapshot.artifacts.filter(a=>a.artifactID!=='result-a');await act(async()=>f.emit({}));await waitFor(()=>container.textContent?.includes('That saved result is no longer')??false,'Removed selection remained visible');assert(!resultText()&&!container.textContent?.includes('Opening saved result'),'Removed selection not cleared');await act(async()=>resolve(responses.get('result-a')));await settle();assert(!resultText(),'Late removed result reappeared');
 await unmount();await mount(f);assert(!container.querySelector('.host-results'),'Pane survived owner replacement');
 f.snapshot.artifacts.push(original);await act(async()=>f.emit({}));await waitFor(()=>[...container.querySelectorAll('button')].some(b=>b.textContent==='Results (2)'),'Metadata restore missing');await openResults();await selectResult('result-a');f.snapshot.artifacts.find(a=>a.artifactID==='result-a')!.contentSHA256='0'.repeat(64);await act(async()=>f.emit({}));await waitFor(()=>container.textContent?.includes('That saved result is no longer')??false,'Digest change did not invalidate full tuple');await act(async()=>resolve(responses.get('result-a')));await settle();assert(!resultText(),'Old digest content rendered');
}]);
teamFormTests.push(['results-navigation','Results failed navigation retains selection, successful navigation closes',async f=>{
 await unmount();const {texts}=await populateResults(f);f.snapshot.conversations.push({...clone(f.snapshot.conversations[0]),id:'other-chat',title:'Other saved chat'});let reject=true;f.bridge.openConversation=async id=>{if(reject)throw Error('Synthetic navigation rejected');f.snapshot.activeConversationID=id;return null;};await mount(f);await openResults();await selectResult('result-a');await resultReady(texts[0]);
 // Above 700px the sidebar remains reachable, including replacement mode.
 // Mobile opens Conversations first, intentionally closing Results before navigation.
 if(innerWidth>700){await click('Other saved chat');assert(resultText()?.value===texts[0],'Rejected navigation cleared Results');reject=false;await click('Other saved chat');}
 else {await click('Conversations');assert(!container.querySelector('.host-results'),'Conversations did not close Results');await click('Other saved chat');assert(f.snapshot.activeConversationID==='fixture-chat','Rejected mobile navigation changed conversation');assert(container.querySelector('.host-sidebar.is-visible'),'Rejected mobile navigation hid list');reject=false;await click('Other saved chat');}
 await waitFor(()=>!container.querySelector('.host-results'),'Successful navigation did not close Results');assert(!container.querySelector('#host-chat')?.hasAttribute('inert'),'Chat remained inert');
}]);
teamFormTests.push(['results-correction','Results long-list return, unavailable opener and ready invalidation',async f=>{
 await unmount();const {responses,texts}=await populateResults(f);
 for(let i=0;i<40;i++){const a={...clone(f.snapshot.artifacts[0]),artifactID:`long-${String(i).padStart(2,'0')}`};f.snapshot.artifacts.push(a);responses.set(a.artifactID,{...clone(responses.get('result-a') as object),artifactID:a.artifactID});}
 await mount(f);await click('Results (42)');const pane=container.querySelector<HTMLElement>('.host-results')!;
 const row=container.querySelectorAll<HTMLButtonElement>('.host-results li button')[25];row.focus();pane.scrollTop=1700;const position=pane.scrollTop;assert(position>0,'Long list did not scroll');const label=row.getAttribute('aria-label');await act(async()=>row.click());await resultReady(texts[0]);await click('Back to results');assert(document.activeElement?.getAttribute('aria-label')===label,'Long list exact row focus lost');assert(pane.scrollTop===position,'Long list position lost');
 const chat=container.querySelector<HTMLElement>('.host-chat')!;if(innerWidth>1200)assert(chat.getBoundingClientRect().width>=480,'Side-by-side chat below 480px');else assert(chat.inert,'Replacement chat not inert');
 await click('Close results');
 for(const mode of ['hidden','detached']){const opener=button('Results (42)'),parent=opener.parentElement!,next=opener.nextSibling;await click('Results (42)');if(mode==='hidden')opener.style.visibility='hidden';else opener.remove();await click('Close results');await waitFor(()=>document.activeElement===container.querySelector('.host-chat-header h1'),'Unavailable opener did not focus chat heading');if(mode==='hidden')opener.style.visibility='';else parent.insertBefore(opener,next);}
 await click('Results (42)');await selectResult('result-a');await resultReady(texts[0]);f.snapshot.artifacts=f.snapshot.artifacts.filter(a=>a.artifactID!=='result-a');await act(async()=>f.emit({}));await waitFor(()=>!resultText(),'Already-ready removed result remained visible');
 await selectResult('result-b');await resultReady(texts[1]);await act(async()=>root!.render(<HostWorkspace bridge={{}}/>));await settle();assert(!container.querySelector('.host-results')&&!resultText(),'Disconnected bridge retained ready Results');
}]);
teamFormTests.push(['results-copy','Results explicit copy uses captured text and suppresses stale completion',async f=>{
 await unmount();const {texts}=await populateResults(f);await mount(f);await openResults();await selectResult('result-a');await resultReady(texts[0]);const descriptor=Object.getOwnPropertyDescriptor(navigator,'clipboard');let finish!:(v?:unknown)=>void;const writes:string[]=[];
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText(text:string){writes.push(text);return new Promise(resolve=>finish=resolve);}}});
 try{await act(async()=>{const target=[...container.querySelectorAll<HTMLButtonElement>('.host-results button')].find(b=>b.textContent==='Copy saved text')!;target.click();});await settle();assert(writes.length===1&&writes[0]===texts[0],'Copy not captured');assert(container.querySelector<HTMLButtonElement>('.host-results button:disabled')?.textContent==='Copying…','Pending copy not guarded');await click('Back to results');await selectResult('result-b');await resultReady(texts[1]);await act(async()=>finish());await settle();assert(!container.textContent?.includes('Copied saved text.'),'Old copy completion leaked');Object.defineProperty(navigator,'clipboard',{configurable:true,value:{async writeText(){throw Error('Synthetic denied');}}});await act(async()=>{const target=[...container.querySelectorAll<HTMLButtonElement>('.host-results button')].find(b=>b.textContent==='Copy saved text')!;target.click();});await settle();await waitFor(()=>container.textContent?.includes('Clipboard access failed')??false,'Copy failure missing');assert(document.activeElement===resultText()&&resultText()?.selectionEnd===texts[1].length,'Manual selection fallback failed');}
 finally{if(descriptor)Object.defineProperty(navigator,'clipboard',descriptor);else Reflect.deleteProperty(navigator,'clipboard');}
}]);

for(const outcome of ['exact','newer','aba','rejected','uncertain'])teamFormTests.push(['sent-draft-mounted',`Mounted sent draft: ${outcome}`,async f=>{
 let captured:Parameters<typeof f.bridge.submitRun>[0]|undefined;let release!:(value:{state:string;requestID:string})=>void;
 f.bridge.submitRun=async request=>{f.calls.push({name:'submit',value:clone(request)});captured=request;return new Promise(resolve=>release=resolve);};
 const sent='Exact sent composer 🪐';await type(sent);const input=messageInput();await click('Send');await waitFor(()=>!!captured,'Submission not captured');assert(input.value===sent,'Composer cleared before admission');
 const q=captured!,revision=(q as typeof q & {richDraftRevision:number}).richDraftRevision;const conversation=f.snapshot.conversations.find(c=>c.id===q.conversationID)!;assert(conversation.draft===sent&&conversation.richDraft.revision===revision,'Send did not save exact version');const metadata=clone(conversation.richDraft);
 function admit(id=q.id){conversation.draft='';conversation.richDraft.revision=revision+1;f.snapshot.runs.push({id,conversationID:q.conversationID,status:'completed',updatedAt:'2026-09-10',admitted:{requestID:id,conversationID:q.conversationID,prompt:q.prompt,mode:q.mode,provider:f.snapshot.providers[0],retryOf:null},answer:'Synthetic response',error:null});}
 if(outcome==='newer'||outcome==='aba'){assert(!input.disabled&&!input.readOnly,'Typing is unavailable during submission');await type('A newer composer');if(outcome==='aba')await type(sent);}
 if(outcome==='exact'){
  await act(async()=>release({state:'accepted',requestID:q.id}));await waitFor(()=>!![...container.querySelectorAll('button')].find(b=>b.textContent==='Reconcile request'),'Unconfirmed acknowledgement did not retain pending state');assert(input.value===sent,'Acknowledgement alone cleared composer');
  admit('foreign-request');await act(async()=>f.emit({}));await settle();assert(input.value===sent,'Foreign run cleared composer');f.snapshot.runs=[];admit();await click('Reconcile request');await waitFor(()=>input.value==='','Exact authoritative admission did not clear');
 }else if(outcome==='rejected'||outcome==='uncertain'){
  await act(async()=>release({state:outcome,requestID:q.id}));await settle();assert(input.value===sent&&conversation.draft===sent&&f.snapshot.runs.length===0,'Unadmitted outcome lost draft');assert(conversation.richDraft.revision===revision,'Unadmitted outcome advanced revision');
  if(outcome==='uncertain'){await click('Reconcile request');await settle();assert(input.value===sent,'Rejected reconciliation lost saved draft');}
 }else{
  admit();await act(async()=>release({state:'accepted',requestID:q.id}));await waitFor(()=>!button('Save draft').disabled,'Submission remained busy');const expected=outcome==='aba'?sent:'A newer composer';assert(input.value===expected,'Newer typing was cleared');await click('Save draft');await waitFor(()=>conversation.draft===expected,'Newer draft did not save');const save=f.calls.filter(c=>c.name==='save').at(-1)!.value as {expectedRevision:number};assert(save.expectedRevision===revision+1,'Newer draft did not adopt admission revision');
 }
 assert(messageInput()===input,'Composer remounted');assert(JSON.stringify({...conversation.richDraft,revision:metadata.revision})===JSON.stringify(metadata),'Non-text draft metadata changed');assert(f.calls.filter(c=>c.name==='submit').length===1,'Submission replayed');
}]);

const selection = rendererScenarioSelection(location.search);
const selectionScope = selection.ids === null ? 'full suite' : selection.ids.includes('sent-draft-mounted') ? 'selected sent-draft composer only' : selection.ids.some(id => id.startsWith('retry-')) ? 'selected invocation retries only' : 'selected team forms only';
const selectedTests: [string, (f: Fixture) => Promise<void>][] = selection.ids === null
  ? [...tests, ...teamFormTests.map(([, name, run]) => [name, run] as [string, (f: Fixture) => Promise<void>])]
  : teamFormTests.filter(([id]) => selection.ids!.includes(id)).map(([, name, run]) => [name, run]);
if (selection.error) window.__HOST_RENDERER_RESULTS__.results.push({ name: 'Scenario selection', passed: false, error: selection.error });
for (const [name, run] of selectedTests) {
  const f = createFixture();
  try {
    await mount(f); await run(f);
    if (selection.ids !== null) assert(!f.calls.some(c => [...(selection.ids?.includes('sent-draft-mounted')?[]:['submit']), 'beginShutdown', 'flushShutdownDraft', 'completeShutdown', 'abortShutdown'].includes(c.name)), 'Selected team form scenario invoked unrelated run or shutdown methods');
    window.__HOST_RENDERER_RESULTS__.results.push({ name, passed: true });
  }
  catch (error) { window.__HOST_RENDERER_RESULTS__.results.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) }); }
  finally { await unmount(); }
  output.textContent = window.__HOST_RENDERER_RESULTS__.results.map(result => `${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? `\n  ${result.error}` : ''}`).join('\n');
}
// Mount the actual mode selector, with desktop globals isolated and restored.
const modeTests: [string, boolean][] = [
  ['Default App without a bridge stays in explicit demo mode', false],
  ['Partial desktop bridge fails closed without a demo fallback', true],
];
for (const [name, partial] of selection.ids === null ? modeTests : []) {
  const keys = ['__RIVUNE_DESKTOP_HOST__', '__TAURI__', '__TAURI_INTERNALS__'];
  const descriptors = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(window, key)]));
  let fakeHostCalls = 0;
  try {
    for (const key of keys) assert(Reflect.deleteProperty(window, key), `Cannot isolate ${key} in test document`);
    if (partial) Object.defineProperty(window, '__RIVUNE_DESKTOP_HOST__', { configurable: true, value: { getSnapshot() { fakeHostCalls++; throw new Error('Partial bridge must never run'); } } });
    memoryStorage.clear(); root = createRoot(container);
    await act(async () => { root!.render(<App />); }); await settle();
    if (partial) {
      assert(container.textContent?.includes('Desktop host unavailable.'), 'Partial bridge did not show unavailable desktop state');
      assert(!container.textContent?.includes('Design preview'), 'Partial bridge silently fell back to demo mode');
      assert(!container.querySelector('#workspace-message'), 'Partial bridge mounted a demo composer');
    } else {
      assert(container.textContent?.includes('Design preview · no AI connected'), 'Missing explicit demo label');
      const input = container.querySelector<HTMLTextAreaElement>('#workspace-message');
      assert(input, 'Default App did not mount demo composer');
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, 'Mode regression demo prompt');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await click('Send demo message');
      await waitFor(() => !!container.textContent?.includes('I split this demo request'), 'Local demo did not produce its labeled fixture response');
      assert(container.textContent?.includes('Mode regression demo prompt'), 'Demo prompt was not rendered');
    }
    assert(fakeHostCalls === 0, 'Mode selection invoked an unavailable fake host');
    window.__HOST_RENDERER_RESULTS__.results.push({ name, passed: true });
  } catch (error) { window.__HOST_RENDERER_RESULTS__.results.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) }); }
  finally {
    await unmount();
    for (const key of keys) { const descriptor = descriptors.get(key); if (descriptor) Object.defineProperty(window, key, descriptor); else Reflect.deleteProperty(window, key); }
  }
  output.textContent = window.__HOST_RENDERER_RESULTS__.results.map(result => `${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? `\n  ${result.error}` : ''}`).join('\n');
}
for (const blocked of selection.ids === null ? ['recovery', 'unavailable'] as const : []) {
  const name = `Startup ${blocked} never mounts workspace or invokes host mutations`;
  const f = createFixture();
  let exits = 0;
  const bridge = Object.assign(f.bridge, {
    async getStartupStatus() { if (blocked === 'unavailable') throw new Error('Sensitive internal path must not be shown'); return { recoveryRequired: true }; },
    async exitRecoveryWorkspace() { exits++; },
  });
  try {
    root = createRoot(container);
    await act(async () => { root!.render(<HostWorkspace bridge={bridge}/>); }); await settle();
    assert(container.textContent?.includes(blocked === 'recovery' ? 'Your saved workspace needs recovery' : 'Workspace connection unavailable'), 'Missing bounded startup screen');
    assert(!container.textContent?.includes('Sensitive internal'), 'Leaked native error detail');
    assert(!container.querySelector('textarea'), 'Startup failure exposed editable composer');
    assert(f.calls.length === 0, 'Startup failure touched host workspace');
    if (blocked === 'recovery') { await click('Close Rivune'); assert(exits === 1, 'Explicit recovery exit was not dispatched once'); }
    else assert(!container.querySelector('button'), 'Unknown startup offered a shutdown bypass');
    assert(f.calls.length === 0, 'Recovery exit invoked normal workspace operations');
    window.__HOST_RENDERER_RESULTS__.results.push({ name, passed: true });
  } catch (error) { window.__HOST_RENDERER_RESULTS__.results.push({ name, passed: false, error: String(error) }); }
  finally { await unmount(); }
}
window.__HOST_RENDERER_RESULTS__.status = window.__HOST_RENDERER_RESULTS__.results.every(result => result.passed) ? 'passed' : 'failed';
output.textContent = window.__HOST_RENDERER_RESULTS__.results.map(result => `${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? `\n  ${result.error}` : ''}`).join('\n');
output.textContent = `Mounted renderer: ${window.__HOST_RENDERER_RESULTS__.status.toUpperCase()}\nScope: ${selectionScope}\nFake host only; no provider, file, or actual session storage calls.\n\n${output.textContent}`;

function restoreSessionStorage() {
  if (originalSessionStorage) Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
  else Reflect.deleteProperty(window, 'sessionStorage');
}
if (!selection.error && new URLSearchParams(location.search).get('preview') === '1') {
  const f = createFixture();
  f.snapshot.conversations[0].title = 'Reliability review';
  if(new URLSearchParams(location.search).get('conversationList')==='1'){f.snapshot.conversations[0].title='Active older conversation';for(let i=1;i<24;i++)f.snapshot.conversations.push({...clone(f.snapshot.conversations[0]),id:`saved-${i}`,title:i===1?'Needle historical chat':i===22?'A very long saved conversation title that remains fully accessible while the compact row truncates its visual text':`Saved conversation ${i}`});}

  f.snapshot.runs.push({
    id: 'visual-fixture', conversationID: 'fixture-chat', status: 'completed', updatedAt: '2026-09-09T00:00:00Z',
    admitted: { requestID: 'visual-fixture', conversationID: 'fixture-chat', prompt: 'What should we prove before connecting this workspace to a real provider?', mode: 'direct', provider: f.snapshot.providers[0], retryOf: null },
    answer: 'This is a static fixture answer for reviewing the mounted desktop layout. No provider produced this text.\n\nFirst, prove the direct conversation workflow: create a conversation, retain the draft, save it with its revision, and admit exactly one request. If the reply is uncertain, reconcile that request instead of replaying it.\n\nSecond, recover durable state after restart. The saved prompt and final answer should return from the host snapshot. Provider events should update visible progress without inventing an answer or replacing earlier results.\n\nFinally, test cancellation and closing. Cancel the exact active request while preserving completed work. Before closing, flush dirty drafts and require a durable acknowledgement. If that save fails, keep the workspace open and preserve the text for the user.\n\nThese checks establish behavior in a controlled fixture. A packaged host test remains a separate step before any real provider connection.',
    error: null,
  });
  if (new URLSearchParams(location.search).get('team') === '1') {
    const { team } = populateMockTeam(f);
    f.snapshot.conversations[0].title = 'Mock Constellation review';
    const saved = f.snapshot.runs[0];
    Object.assign(saved.admitted, { mode: 'constellation', provider: f.snapshot.providers[1], team: clone(team) });
    Object.assign(saved, { memberResults: [{ schemaVersion: 1, memberID: 'member-1', providerID: f.snapshot.providers[0].id, role: 'independentAnswer', text: 'Mock saved member answer for layout and keyboard inspection. No provider produced this text.', truncated: false }], resolution: { schemaVersion: 1, kind: 'leadSynthesis', reviewed: false, reviewerMemberID: 'member-2', providerID: 'second-provider', summary: 'Mock synthesis record for visual inspection.' } });
    if (new URLSearchParams(location.search).get('retry') === '1') {
      Object.assign(saved, { status: 'failed', answer: null, resolution: null, failedInvocationID: 'preview-invocation', failedAttemptID: 'preview-attempt', error: 'Synthetic failed step', activity: { schemaVersion: 1, baseSequence: 1, entries: [{ schemaVersion: 1, eventID: `${saved.id}:1`, requestID: saved.id, conversationID: 'fixture-chat', sequence: 1, kind: 'failed', phase: 'contribute', state: 'failed', memberID: 'member-2', providerID: 'second-provider', role: 'independentAnswer', summary: 'Synthetic member failure', textDelta: null, error: 'Mock connection could not complete its answer.' }] } });
      Object.assign(f.bridge, { async retryConstellationInvocation(request: unknown) { f.calls.push({ name: 'retry', value: clone(request) }); return { requestID: saved.id, state: 'rejected', error: 'Synthetic rejection for reviewing recovery controls. No provider was called.' }; } });
    }
    output.textContent = `MOCK CONSTELLATION PREVIEW · no provider calls\n${window.__HOST_RENDERER_RESULTS__.status.toUpperCase()}: ${window.__HOST_RENDERER_RESULTS__.results.length} mounted checks · ${selectionScope}`;
    output.style.cssText = 'position:fixed;z-index:100000;left:0;right:0;top:0;height:44px;box-sizing:border-box;padding:4px 10px;background:#101522;color:#e8eef9;font:10px/1.5 system-ui;white-space:pre-wrap;pointer-events:none';
    container.style.paddingTop = '44px';
  }
  if(new URLSearchParams(location.search).get('scenario')==='compact-composer')populateMockTeam(f);
  const supersessionPreview=new URLSearchParams(location.search).get('scenario')==='composer-supersession-preview';
  if(supersessionPreview){
    populateMockTeam(f);Object.assign(f.snapshot.conversations[0].richDraft,{revision:2,selection:null,team:null});
    const original=f.bridge.saveRichDraft;let receipt:Awaited<ReturnType<typeof original>>|null=null;
    f.bridge.saveRichDraft=async request=>{if(receipt){f.calls.push({name:'save',value:clone(request)});return clone(receipt);}receipt=await original(request);f.snapshot.conversations[0].draft='Revision 4: saved by the first external writer.';Object.assign(f.snapshot.conversations[0].richDraft,{revision:4,selection:{schemaVersion:1,providerID:'third-provider',modelID:null,effortID:null,catalogRevision:f.catalog.revision},team:null});return receipt;};
    f.bridge.submitRun=async()=>{throw Error('Retained review fixture never submits requests');};
  }
  const setupPreview=new URLSearchParams(location.search).get('settings')==='1';
  if(setupPreview){Object.assign(f.bridge,{
    async discoverProviders(){return [{id:'codex:discovered:preview',kind:'codex',executablePath:'/synthetic/preview/codex',installed:true}];},
    async configureSelectedProvider(){throw Error('Synthetic preview does not persist configuration');}
  });}
  if(new URLSearchParams(location.search).get('scenario')==='results-pane'){f.snapshot.runs=[];await populateResults(f);}
  await mount(f);
  if(supersessionPreview){
    await type('Keep this local message while reviewing saved configuration.');await openComposer();await chooseExecution('Execution mode','team');await act(async()=>{const inputs=container.querySelectorAll<HTMLInputElement>('.composer-execution input');inputs[0].click();inputs[1].click();});await chooseExecution('Constellation lead','second-provider');await click('Save configuration');await click('Review saved configuration');await click('Cancel configuration');
    assert(container.textContent?.includes('Saved revision 4: Single AI · Mock connection (third-provider)'),'Retained review missing exact revision/route');assert(f.calls.filter(c=>c.name==='save').length===1&&!f.calls.some(c=>c.name==='submit'),'Retained setup used unexpected write/submit');
    output.textContent='Retained synthetic acknowledged-supersession fixture. Setup assertions passed; no automated suite run. One fake save acknowledged revision 3; external revision 4 is captured for review. No provider or real persistence.';
  }
  if(['results-pane','composer-supersession-preview','conversation-list','compact-composer'].includes(new URLSearchParams(location.search).get('scenario')??'')){
    const panel=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent=supersessionPreview?'Synthetic review fixture · setup verified':`Synthetic checks: ${window.__HOST_RENDERER_RESULTS__.status.toUpperCase()} (${window.__HOST_RENDERER_RESULTS__.results.length})`;
    panel.append(summary,output);
    const rail=document.createElement('div');rail.append(panel);document.body.prepend(rail);
    if(supersessionPreview){
      const controls=document.createElement('div'),change=document.createElement('button'),review=document.createElement('button'),status=document.createElement('p');
      controls.style.cssText='padding:6px 10px;background:#101522;color:#e8eef9;font:12px system-ui;display:flex;gap:6px;flex-wrap:wrap';
      change.textContent='Apply fake second change';review.textContent='Re-review saved configuration';status.textContent='Fake host revision 4 · captured review 4';status.style.cssText='margin:0;width:100%';
      change.onclick=()=>{f.snapshot.conversations[0].draft='Revision 5: saved by the second external writer.';Object.assign(f.snapshot.conversations[0].richDraft,{revision:5,selection:{schemaVersion:1,providerID:'second-provider',modelID:null,effortID:null,catalogRevision:f.catalog.revision},team:null});change.disabled=true;status.textContent='Fake host revision 5 · existing review stays unchanged until re-review';};
      review.onclick=()=>{const target=[...container.querySelectorAll('button')].find(b=>b.textContent==='Review saved configuration');if(target)target.click();else status.textContent='Review already resolved. Reload the fixture to reset.';};
      controls.append(change,review,status);rail.append(controls);
    }
    panel.style.cssText='position:relative;z-index:100000;background:#101522;color:#e8eef9;font:12px/1.5 system-ui';
    summary.style.cssText='height:32px;box-sizing:border-box;padding:6px 12px;cursor:pointer';
    output.style.cssText='position:relative;max-height:35dvh;overflow:auto;margin:0;padding:12px;white-space:pre-wrap';
    const resize=new ResizeObserver(()=>{(container.firstElementChild as HTMLElement).style.height=`calc(100dvh - ${rail.getBoundingClientRect().height}px)`;});resize.observe(rail);
    // Manual preview uses the same mutable synthetic bridge as the selected tests.
    // Leave React test mode after the final act; normal user events own subsequent renders.
    globalThis.IS_REACT_ACT_ENVIRONMENT=false;
  }
  if(setupPreview){if(window.innerWidth<=700)await click('Conversations');await click('Settings');output.textContent='SYNTHETIC SETTINGS PREVIEW · no provider calls or configuration';output.style.pointerEvents='none';output.style.maxHeight='48px';}
  if (new URLSearchParams(location.search).get('team') === '1') (container.firstElementChild as HTMLElement).style.height = 'calc(100dvh - 44px)';
  window.addEventListener('pagehide', restoreSessionStorage, { once: true });
} else restoreSessionStorage();
