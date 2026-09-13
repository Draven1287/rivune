import test from 'node:test';
import assert from 'node:assert/strict';
import { createHostWorkspaceController } from '../../prototypes/ai-native-workspace/src/host/workspaceController.ts';

const provider = { id: 'fixture', kind: 'fixture', executablePath: '/fixture/provider', model: null, timeoutMs: 60_000 };
const snapshot = {
  schemaVersion: 1,
  activeConversationID: 'chat',
  selectedProviderID: 'fixture',
  providers: [provider],
  projects: [],
  attachments: [],
  runs: [],
  conversations: [{ id: 'chat', title: 'Host chat', readOnly: false, draft: 'Run this', richDraft: { schemaVersion: 1, revision: 1, attachmentIDs: [], selection: null, team: null } }],
};
const catalog = {
  schemaVersion: 1,
  revision: 'catalog-1',
  providers: [{ id: 'fixture', label: 'Fixture', transport: 'cli', adapterState: 'supported', installation: 'installed', authentication: 'unknown', responseTest: 'notTested', catalogState: 'unknown', models: [], defaults: { modelID: null, effortID: null }, supportsProviderDefault: true, errorCode: null }],
};

test('source observation: cancellation is blocked while submitRun remains pending', async () => {
  let releaseSubmit;
  let submitted;
  const bridge = {
    async getSnapshot() { return structuredClone(snapshot); },
    async getModelCatalog() { return structuredClone(catalog); },
    async onRunEvent() { return () => {}; },
    async saveRichDraft(request) {
      const conversation = snapshot.conversations[0];
      conversation.draft = request.draft;
      conversation.richDraft = { schemaVersion: 1, revision: request.expectedRevision + 1, attachmentIDs: [], selection: structuredClone(request.selection), team: null };
      return { state: 'durable', mutationID: request.mutationID, conversationID: request.conversationID, revision: request.expectedRevision + 1, attachmentIDs: [], selection: structuredClone(request.selection), team: null };
    },
    async submitRun(request) {
      submitted = request;
      snapshot.runs.push({ id: request.id, conversationID: request.conversationID, status: 'running', updatedAt: '2026-09-09T00:00:00Z', admitted: { requestID: request.id, conversationID: request.conversationID, prompt: request.prompt, mode: 'direct', provider, retryOf: null }, answer: null, error: null });
      return new Promise((resolve) => { releaseSubmit = () => resolve({ state: 'accepted', requestID: request.id }); });
    },
    async reconcileRun() { throw new Error('unused'); },
    async cancelRun() { throw new Error('cancel should have been reachable'); },
    async createConversation() { throw new Error('unused'); },
    async openConversation() { throw new Error('unused'); },
  };
  const journal = { read: () => null, write() {}, clear() {} };
  let sequence = 0;
  const controller = createHostWorkspaceController(bridge, journal, { id: () => `id-${++sequence}`, pollMs: 1_000_000 });
  await controller.start();
  const sending = controller.send('chat');
  while (!submitted) await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(controller.cancel(submitted.id), /Workspace action unavailable/);
  assert.equal(controller.getState().phase, 'submitting');
  releaseSubmit();
  await sending;
  controller.dispose();
});
