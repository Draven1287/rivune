import test from 'node:test';
import assert from 'node:assert/strict';
import { commitMessage } from './compiled/features/conversations/commitMessage.js';
const turn = { prompt: 'Keep this draft', mode: 'single', provider: 'Claude', createdAt: 1 };
test('a failed new-chat save leaves no phantom chat and retry creates exactly one turn', () => {
  const rows = []; const row = { id: 'one', ...turn };
  assert.equal(commitMessage(rows, row, turn, () => false), false);
  assert.deepEqual(rows, []); assert.equal(Object.hasOwn(row, 'messages'), false);
  assert.equal(commitMessage(rows, row, turn, () => true), true);
  assert.equal(rows.length, 1); assert.deepEqual(row.messages, [turn]);
});
test('failed append preserves completed replies and original message-array identity', () => {
  const original = [{ ...turn, reply: { text: 'Keep this reply', status: 'completed' } }];
  const row = { id: 'one', ...turn, messages: original }; const rows = [row];
  assert.equal(commitMessage(rows, row, { ...turn, prompt: 'Follow-up' }, () => { throw new Error('quota'); }), false);
  assert.equal(row.messages, original); assert.equal(rows[0], row); assert.equal(rows.length, 1);
});
test('legacy single-turn conversations are preserved on rollback and upgraded on success', () => {
  const row = { id: 'one', ...turn }; const rows = [row]; const next = { ...turn, prompt: 'Next' };
  assert.equal(commitMessage(rows, row, next, () => false), false);
  assert.equal(Object.hasOwn(row, 'messages'), false);
  let persisted;
  assert.equal(commitMessage(rows, row, next, () => { persisted = JSON.parse(JSON.stringify(rows)); return true; }), true);
  assert.deepEqual(persisted[0].messages.map(m => m.prompt), ['Keep this draft', 'Next']);
});
