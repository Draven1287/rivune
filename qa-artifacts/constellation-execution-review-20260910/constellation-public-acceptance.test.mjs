import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHostSnapshot } from '../../prototypes/ai-native-workspace/src/host/contracts.ts';
import { projectHostConversation } from '../../prototypes/ai-native-workspace/src/host/workspaceController.ts';

const provider = (id, kind) => ({
  id,
  kind,
  executablePath: `/synthetic/${id}`,
  model: null,
  timeoutMs: 1_000,
});

const providers = [provider('alpha', 'fixture'), provider('beta', 'fixture')];
const members = providers.map(({ id: providerID }) => ({
  schemaVersion: 1,
  providerID,
  modelID: null,
  effortID: null,
  catalogRevision: 'synthetic-public-v1',
}));
const team = { schemaVersion: 1, leadIndex: 0, members };

function event(requestID, sequence, fields) {
  return {
    schemaVersion: 1,
    eventID: `${requestID}:${sequence}`,
    requestID,
    conversationID: 'conversation',
    sequence,
    kind: 'memberCompleted',
    phase: 'contribute',
    state: 'completed',
    memberID: null,
    providerID: null,
    role: null,
    summary: 'Synthetic public event',
    textDelta: null,
    error: null,
    ...fields,
  };
}

function snapshot(run) {
  return {
    schemaVersion: 1,
    activeConversationID: 'conversation',
    selectedProviderID: 'alpha',
    providers,
    runtimeCapabilities: {
      schemaVersion: 1,
      constellation: 'available',
      minimumMembers: 2,
      reasonCode: null,
    },
    conversations: [{
      id: 'conversation',
      title: 'Synthetic acceptance',
      readOnly: false,
      draft: '',
      projectID: null,
      richDraft: {
        schemaVersion: 1,
        revision: 2,
        attachmentIDs: [],
        selection: members[0],
        team,
      },
    }],
    runs: [run],
  };
}

function admitted(requestID) {
  return {
    requestID,
    conversationID: 'conversation',
    prompt: 'Produce one challenged answer.',
    mode: 'constellation',
    provider: providers[0],
    retryOf: null,
    team,
  };
}

function controllerState(parsed) {
  return {
    phase: 'ready',
    snapshot: parsed,
    catalog: null,
    pending: null,
    retry: null,
    retryNotice: null,
    error: null,
    drafts: { conversation: '' },
  };
}

test('Council success exposes member evidence but projects exactly one unified assistant answer', () => {
  const requestID = 'council-success';
  const parsed = parseHostSnapshot(snapshot({
    id: requestID,
    conversationID: 'conversation',
    status: 'completed',
    updatedAt: '2026-09-10T00:00:00Z',
    admitted: admitted(requestID),
    answer: 'The single durable lead synthesis.',
    error: null,
    activity: {
      schemaVersion: 1,
      baseSequence: 4,
      entries: [
        event(requestID, 4, { memberID: 'member-1', providerID: 'alpha', role: 'independentAnswer' }),
        event(requestID, 5, { memberID: 'member-2', providerID: 'beta', role: 'independentAnswer' }),
        event(requestID, 6, { kind: 'finalCompleted', phase: 'final', memberID: 'member-1', providerID: 'alpha', role: 'integrate', summary: 'Lead synthesis saved' }),
      ],
    },
    memberResults: [
      { schemaVersion: 1, memberID: 'member-1', providerID: 'alpha', role: 'independentAnswer', text: 'Independent alpha draft.', truncated: false },
      { schemaVersion: 1, memberID: 'member-2', providerID: 'beta', role: 'independentAnswer', text: 'Independent beta draft.', truncated: false },
    ],
    resolution: {
      schemaVersion: 1,
      kind: 'leadSynthesis',
      reviewed: true,
      reviewerMemberID: 'member-1',
      providerID: 'alpha',
      summary: 'Lead synthesized two independent answers.',
    },
    failedInvocationID: null,
    failedAttemptID: null,
  }));

  const run = parsed.runs[0];
  assert.equal(run.memberResults.length, 2);
  assert.equal(run.resolution?.kind, 'leadSynthesis');
  assert.equal(run.answer, 'The single durable lead synthesis.');

  const projected = projectHostConversation(controllerState(parsed), 'conversation');
  assert.deepEqual(projected.messages.map(({ role, content }) => [role, content]), [
    ['user', 'Produce one challenged answer.'],
    ['assistant', 'The single durable lead synthesis.'],
  ]);
});

test('partial failure retains completed evidence and exact retry identity without inventing a final answer', () => {
  const requestID = 'council-partial-failure';
  const parsed = parseHostSnapshot(snapshot({
    id: requestID,
    conversationID: 'conversation',
    status: 'failed',
    updatedAt: '2026-09-10T00:00:01Z',
    admitted: admitted(requestID),
    answer: null,
    error: 'Synthetic beta failure.',
    activity: {
      schemaVersion: 1,
      baseSequence: 4,
      entries: [
        event(requestID, 4, { memberID: 'member-1', providerID: 'alpha', role: 'independentAnswer' }),
        event(requestID, 5, { kind: 'failed', state: 'failed', memberID: 'member-2', providerID: 'beta', role: 'independentAnswer', summary: 'Synthetic member failure', error: 'Synthetic beta failure.' }),
      ],
    },
    memberResults: [
      { schemaVersion: 1, memberID: 'member-1', providerID: 'alpha', role: 'independentAnswer', text: 'Durable alpha draft.', truncated: false },
    ],
    resolution: null,
    failedInvocationID: 'opaque-invocation-id',
    failedAttemptID: 'opaque-attempt-id',
  }));

  const run = parsed.runs[0];
  assert.equal(run.answer, null);
  assert.equal(run.resolution, null);
  assert.equal(run.memberResults[0].text, 'Durable alpha draft.');
  assert.deepEqual(
    { requestID: run.id, invocationID: run.failedInvocationID, failedAttemptID: run.failedAttemptID },
    { requestID, invocationID: 'opaque-invocation-id', failedAttemptID: 'opaque-attempt-id' },
  );

  const projected = projectHostConversation(controllerState(parsed), 'conversation');
  assert.deepEqual(projected.messages.map(({ role, content }) => [role, content]), [
    ['user', 'Produce one challenged answer.'],
  ]);
});

