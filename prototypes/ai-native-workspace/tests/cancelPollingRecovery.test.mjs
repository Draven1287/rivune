import test from 'node:test';
import assert from 'node:assert/strict';
import { createHostWorkspaceController } from '../src/host/workspaceController.ts';

const clone = value => structuredClone(value);
async function waitFor(predicate, message) {
  const end = Date.now() + 1000;
  while (!predicate() && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 5));
  assert(predicate(), message);
}

for (const failure of ['snapshot', 'catalog']) {
  test(`eventless pending submit resumes polling after one transient ${failure} failure`, async t => {
    const provider = { id: 'codex', kind: 'codex', executablePath: '/fixture/codex', model: null, timeoutMs: 60000 };
    const conversation = { id: 'chat', title: 'Host chat', readOnly: false, draft: 'Saved prompt', richDraft: { schemaVersion: 1, revision: 2, attachmentIDs: [], selection: null, team: null } };
    const snapshot = { schemaVersion: 1, activeConversationID: 'chat', selectedProviderID: 'codex', providers: [provider], projects: [], attachments: [], runs: [], conversations: [conversation] };
    const catalog = { schemaVersion: 1, revision: 'revision', providers: [{ id: 'codex', label: 'Codex CLI', transport: 'cli', adapterState: 'supported', installation: 'installed', authentication: 'unknown', responseTest: 'notTested', catalogState: 'unknown', models: [], defaults: { modelID: null, effortID: null }, supportsProviderDefault: true, errorCode: null }] };
    let pending = null, nextID = 0, submitCount = 0, cancelCount = 0, failures = 0;
    let faultArmed = false, request, resolveSubmit, enteredSubmit;
    const entered = new Promise(resolve => { enteredSubmit = resolve; });
    const journal = { read: () => pending, write: value => { pending = value; }, clear: () => { pending = null; } };
    function read(kind, value) {
      if (faultArmed && kind === failure) { faultArmed = false; failures++; throw Error('Transient host read failure'); }
      return clone(value);
    }
    const adapter = {
      async getSnapshot() { return read('snapshot', snapshot); },
      async getModelCatalog() { return read('catalog', catalog); },
      async onRunEvent() { return () => {}; }, // Native direct submission emits no events.
      async saveRichDraft(value) {
        conversation.draft = value.draft;
        conversation.richDraft = { schemaVersion: 1, revision: value.expectedRevision + 1, attachmentIDs: value.attachmentIDs, selection: value.selection, team: value.team };
        return { state: 'durable', mutationID: value.mutationID, conversationID: value.conversationID, revision: conversation.richDraft.revision, attachmentIDs: value.attachmentIDs, selection: value.selection, team: value.team };
      },
      submitRun(value) {
        submitCount++; request = value;
        const promise = new Promise(resolve => { resolveSubmit = resolve; });
        enteredSubmit(); return promise;
      },
      async cancelRun(requestID) { cancelCount++; snapshot.runs.find(run => run.id === requestID).status = 'cancelled'; return { state: 'accepted', requestID }; },
    };
    const controller = createHostWorkspaceController(adapter, journal, { id: () => `id-${++nextID}`, pollMs: 5 });
    t.after(() => { controller.dispose(); resolveSubmit?.({ state: 'accepted', requestID: request.id }); });
    await controller.start();
    let submitSettled = false;
    const sending = controller.send('chat').then(() => { submitSettled = true; });
    await entered;
    faultArmed = true;
    await waitFor(() => failures === 1, 'The pending poll should encounter the transient failure');
    snapshot.runs.push({ id: request.id, conversationID: request.conversationID, status: 'running', updatedAt: '2026-09-09T00:00:00Z', admitted: { requestID: request.id, conversationID: request.conversationID, prompt: request.prompt, mode: 'direct', provider, retryOf: null }, answer: null, error: null });
    conversation.draft = '';
    await waitFor(() => controller.getState().snapshot.runs.length === 1, 'Polling must recover automatically without a manual refresh or event');
    assert.equal(submitSettled, false);
    assert.equal(controller.getState().phase, 'running');
    await controller.cancel(request.id);
    assert.equal(controller.getState().snapshot.runs[0].status, 'cancelled');
    assert.equal(submitSettled, false);
    resolveSubmit({ state: 'accepted', requestID: request.id });
    await sending;
    assert.equal(controller.getState().pending, null);
    assert.equal(submitCount, 1);
    assert.equal(cancelCount, 1);
    assert.equal(failures, 1);
  });
}
