import test from 'node:test';
import assert from 'node:assert/strict';
import { createDurableRecoveryJournal } from '../src/host/durableRecovery.ts';
import { createHostWorkspaceController } from '../src/host/workspaceController.ts';

const copy = value => structuredClone(value);
function durableFixture() {
  let record = null;
  const calls = [];
  const bridge = {
    async getSubmissionRecovery() { calls.push(['read']); return copy(record); },
    async reserveSubmissionRecovery(value) {
      calls.push(['reserve', copy(value)]);
      if (record && (record.requestID !== value.requestID || record.conversationID !== value.conversationID)) throw Error('reserved');
      record = { schemaVersion: 1, ...copy(value), state: 'reserved' }; return copy(record);
    },
    async clearSubmissionRecovery(value) {
      calls.push(['clear', copy(value)]);
      if (!record || record.requestID !== value.requestID || record.conversationID !== value.conversationID) throw Error('wrong identity');
      record = null; return { schemaVersion: 1, ...copy(value), state: 'cleared' };
    },
  };
  return { bridge, calls, get record() { return record; }, set record(value) { record = value; } };
}
function controllerFixture() {
  const durable = durableFixture();
  const provider = { id: 'fixture', kind: 'fixture', executablePath: '/fake/provider', model: null, timeoutMs: 60000 };
  const snapshot = { schemaVersion: 1, activeConversationID: 'chat', selectedProviderID: provider.id, providers: [provider], conversations: [{ id: 'chat', title: 'Fixture chat', readOnly: false, draft: 'Private prompt not for recovery metadata', richDraft: { schemaVersion: 1, revision: 0, attachmentIDs: [], selection: null, team: null } }], projects: [], attachments: [], runs: [] };
  const catalog = { schemaVersion: 1, revision: 'revision', providers: [{ id: provider.id, label: 'Fixture', transport: 'cli', adapterState: 'supported', installation: 'installed', authentication: 'unknown', responseTest: 'notTested', catalogState: 'unknown', models: [], defaults: { modelID: null, effortID: null }, supportsProviderDefault: true, errorCode: null }] };
  let submitCount = 0, reconcileCount = 0, id = 0;
  const adapter = {
    async getSnapshot() { return copy(snapshot); }, async getModelCatalog() { return copy(catalog); },
    async onRunEvent() { return () => {}; },
    async saveRichDraft(request) {
      const chat = snapshot.conversations[0]; chat.draft = request.draft; chat.richDraft = { schemaVersion: 1, revision: request.expectedRevision + 1, attachmentIDs: request.attachmentIDs, selection: request.selection, team: request.team };
      return { state: 'durable', mutationID: request.mutationID, conversationID: request.conversationID, revision: chat.richDraft.revision, attachmentIDs: request.attachmentIDs, selection: request.selection, team: request.team };
    },
    async submitRun(request) {
      submitCount++;
      assert.equal(durable.record.requestID, request.id);
      snapshot.runs.push({ id: request.id, conversationID: request.conversationID, status: 'running', updatedAt: '2026-09-09', admitted: { requestID: request.id, conversationID: request.conversationID, prompt: request.prompt, mode: 'direct', provider, retryOf: null }, answer: null, error: null });
      throw Error('Lost invoke reply');
    },
    async reconcileRun(requestID) {
      reconcileCount++; assert.equal(requestID, durable.record.requestID);
      return { state: snapshot.runs.some(run => run.id === requestID) ? 'accepted' : 'rejected', requestID };
    },
  };
  return { durable, snapshot, adapter, get submitCount() { return submitCount; }, get reconcileCount() { return reconcileCount; }, controller() { return createHostWorkspaceController(adapter, createDurableRecoveryJournal(durable.bridge), { id: () => `identity-${++id}`, pollMs: 1_000_000 }); } };
}

test('missing, partial and accessor bridges fail detection without invoking methods', () => {
  let invoked = 0;
  assert.equal(createDurableRecoveryJournal(undefined), null);
  assert.equal(createDurableRecoveryJournal({ getSubmissionRecovery() { invoked++; } }), null);
  const bridge = { reserveSubmissionRecovery() {}, clearSubmissionRecovery() {} };
  Object.defineProperty(bridge, 'getSubmissionRecovery', { get() { invoked++; return () => null; } });
  assert.equal(createDurableRecoveryJournal(bridge), null); assert.equal(invoked, 0);
});
test('durable journal stores only exact request/conversation identity and clears the same identity', async () => {
  const f = durableFixture(); const journal = createDurableRecoveryJournal(f.bridge);
  assert.equal(f.calls.length, 0); assert.equal(await journal.read(), null);
  await journal.write({ requestID: 'request', conversationID: 'chat' });
  assert.deepEqual(f.calls.find(call => call[0] === 'reserve')[1], { requestID: 'request', conversationID: 'chat' });
  assert.deepEqual(await journal.read(), { requestID: 'request', conversationID: 'chat' });
  await journal.clear({ requestID: 'request', conversationID: 'chat' }); assert.equal(f.record, null);
  assert.deepEqual(f.calls.find(call => call[0] === 'clear')[1], { requestID: 'request', conversationID: 'chat' });
});
test('malformed durable records and unsupported states reject instead of becoming an empty journal', async () => {
  for (const value of [{ schemaVersion: 2, requestID: 'r', conversationID: 'c', state: 'reserved' }, { schemaVersion: 1, requestID: '', conversationID: 'c', state: 'reserved' }, { schemaVersion: 1, requestID: 'r', conversationID: 'c', state: 'cleared' }, { schemaVersion: 1, requestID: 'r', conversationID: 'c', state: 'reserved', prompt: 'must not be accepted' }]) {
    const f = durableFixture(); f.record = value;
    await assert.rejects(createDurableRecoveryJournal(f.bridge).read()); assert.deepEqual(f.record, value);
  }
});
test('reserve and clear receipts must match exact identities and durable state', async () => {
  for (const receipt of [null, { schemaVersion: 1, requestID: 'wrong', conversationID: 'chat', state: 'reserved' }, { schemaVersion: 1, requestID: 'request', conversationID: 'chat', state: 'rejected' }]) {
    const f = durableFixture(); f.bridge.reserveSubmissionRecovery = async () => receipt;
    await assert.rejects(createDurableRecoveryJournal(f.bridge).write({ requestID: 'request', conversationID: 'chat' }));
  }
  const f = durableFixture(); const journal = createDurableRecoveryJournal(f.bridge); await journal.write({ requestID: 'request', conversationID: 'chat' });
  f.bridge.clearSubmissionRecovery = async () => ({ schemaVersion: 1, requestID: 'other', conversationID: 'chat', state: 'cleared' });
  await assert.rejects(createDurableRecoveryJournal(f.bridge).clear({ requestID: 'request', conversationID: 'chat' })); assert.equal(f.record.requestID, 'request');
});
test('native journal errors are sanitized and never expose prompt or credential paths', async () => {
  const f = durableFixture(); f.bridge.getSubmissionRecovery = async () => { throw Error('/private/credential=secret'); };
  await assert.rejects(createDurableRecoveryJournal(f.bridge).read(), error => !String(error).includes('secret') && !String(error).includes('/private'));
});
test('fresh controller and journal recover after all browser session state is lost without replay', async t => {
  const f = controllerFixture(); const first = f.controller(); t.after(() => first.dispose()); await first.start(); await first.send('chat');
  assert.equal(first.getState().phase, 'uncertain'); const pending = copy(f.durable.record); assert(pending);
  assert(!JSON.stringify(pending).includes('Private prompt')); assert.deepEqual(Object.keys(pending).sort(), ['conversationID', 'requestID', 'schemaVersion', 'state']);
  first.dispose();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw Error('Browser session lost'); } });
  try {
    f.snapshot.runs[0].status = 'completed'; f.snapshot.runs[0].answer = 'Durable completion after renderer crash';
    const second = f.controller(); t.after(() => second.dispose()); await second.start();
    assert.equal(f.submitCount, 1); assert.equal(f.reconcileCount, 1); assert.equal(second.getState().pending, null); assert.equal(f.durable.record, null);
    assert.equal(second.getState().snapshot.runs[0].id, pending.requestID); assert.equal(second.getState().snapshot.runs[0].answer, 'Durable completion after renderer crash');
  } finally { if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else delete globalThis.sessionStorage; }
});
test('unreadable native recovery storage blocks admission', async t => {
  const f = controllerFixture(); f.durable.bridge.getSubmissionRecovery = async () => { throw Error('unavailable'); };
  const c = f.controller(); t.after(() => c.dispose()); await c.start(); await assert.rejects(c.send('chat'));
  assert.equal(f.submitCount, 0); assert.equal(f.durable.calls.filter(call => call[0] === 'reserve').length, 0);
});
test('failed durable reservation leaves uncertain identity and never submits', async t => {
  const f = controllerFixture(); f.durable.bridge.reserveSubmissionRecovery = async () => { throw Error('native disk full'); };
  const c = f.controller(); t.after(() => c.dispose()); await c.start(); try { await c.send('chat'); } catch { /* UI exposes uncertain reservation outcome. */ }
  assert.equal(c.getState().phase, 'uncertain'); assert(c.getState().pending); assert.equal(f.submitCount, 0); await assert.rejects(c.send('chat'));
});
test('shutdown refusal retains unresolved durable identity for restart', async t => {
  const f = controllerFixture(); const c = f.controller(); t.after(() => c.dispose()); await c.start(); await c.send('chat');
  const pending = copy(f.durable.record); assert.throws(() => c.prepareShutdownDrafts());
  assert.deepEqual(f.durable.record, pending); assert.equal(f.submitCount, 1); assert.equal(c.getState().pending.requestID, pending.requestID);
});

test('clear committed before reply failure recovers on authoritative null read without replay', async t => {
  const f = controllerFixture(); const clear = f.durable.bridge.clearSubmissionRecovery;
  f.durable.bridge.clearSubmissionRecovery = async value => { await clear(value); throw Error('Clear reply lost after commit'); };
  const c = f.controller(); t.after(() => c.dispose()); await c.start(); await c.send('chat');
  const requestID = c.getState().pending.requestID;
  f.snapshot.runs[0].status = 'completed'; f.snapshot.runs[0].answer = 'Saved terminal answer';
  await assert.rejects(c.reconcile());
  assert.equal(f.durable.record, null); assert.equal(c.getState().phase, 'uncertain'); assert.equal(c.getState().pending.requestID, requestID);
  await c.reconcile();
  assert.equal(c.getState().phase, 'ready'); assert.equal(c.getState().pending, null);
  assert.equal(c.getState().snapshot.runs[0].answer, 'Saved terminal answer');
  assert.equal(f.submitCount, 1); assert.equal(f.reconcileCount, 1);
  assert.equal(f.durable.calls.filter(call => call[0] === 'clear').length, 1);
});

test('reservation rejected before persistence releases local pending only after valid authoritative null', async t => {
  const f = controllerFixture(); f.durable.bridge.reserveSubmissionRecovery = async () => { throw Error('Reservation rejected before persistence'); };
  const c = f.controller(); t.after(() => c.dispose()); await c.start();
  try { await c.send('chat'); } catch { /* Outcome intentionally remains uncertain until read. */ }
  const requestID = c.getState().pending.requestID;
  assert.equal(f.durable.record, null); assert.equal(f.submitCount, 0); assert.equal(c.getState().phase, 'uncertain');
  f.durable.record = { schemaVersion: 2, requestID, conversationID: 'chat', state: 'reserved' };
  await assert.rejects(c.reconcile());
  assert.equal(c.getState().pending.requestID, requestID); assert.equal(c.getState().phase, 'uncertain'); assert.equal(f.submitCount, 0);
  f.durable.record = null;
  await c.reconcile();
  assert.equal(c.getState().phase, 'ready'); assert.equal(c.getState().pending, null);
  assert.equal(c.getState().drafts.chat, 'Private prompt not for recovery metadata');
  assert.equal(f.submitCount, 0); assert.equal(f.reconcileCount, 0);
});
