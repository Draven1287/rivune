import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockServer } from '../scripts/mock-api.mjs';

async function fixture(run) {
  const server = createMockServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const endpoint = `http://127.0.0.1:${server.address().port}/v1/chat/completions`;
  const request = (options = {}) => fetch(endpoint, { method: 'POST', headers: { authorization: 'Bearer rivune-mock-only', 'content-type': 'application/json', ...options.headers }, body: options.body || JSON.stringify({ model: 'mock-model', messages: [{ role: 'user', content: 'Hello' }], stream: options.stream || false }) });
  try { await run(request); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('mock HTTP success returns representative completion and fixture usage', () => fixture(async request => {
  const response = await request(); assert.equal(response.status, 200);
  const body = await response.json(); assert.equal(body.mock, true); assert.equal(body.choices[0].message.role, 'assistant'); assert.equal(body.usage.total_tokens, 155);
}));
test('mock HTTP refuses real-looking credentials and simulates auth/rate limits', () => fixture(async request => {
  assert.equal((await request({ headers: { authorization: 'Bearer not-the-dummy' } })).status, 401);
  assert.equal((await request({ headers: { 'x-rivune-scenario': '401' } })).status, 401);
  const limited = await request({ headers: { 'x-rivune-scenario': '429' } }); assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '1');
}));
test('mock HTTP SSE frames terminate and preserve content', () => fixture(async request => {
  const response = await request({ stream: true }); assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const frames = (await response.text()).trim().split('\n\n').map(frame => frame.slice(6));
  assert.equal(frames.pop(), '[DONE]'); const events = frames.map(JSON.parse);
  assert.equal(events.map(event => event.choices[0]?.delta.content || '').join(''), 'This is a simulated API response. No model ran.');
  assert.ok(events.every(event => event.mock)); assert.equal(events.at(-1).usage.total_tokens, 155);
}));
test('mock HTTP rejects oversized bodies and external origins', () => fixture(async request => {
  assert.equal((await request({ body: 'x'.repeat(65537) })).status, 413);
  const blocked = await request({ headers: { origin: 'https://example.com' } }); assert.equal(blocked.status, 403); assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  const allowed = await request({ headers: { origin: 'http://127.0.0.1:1420' } }); assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://127.0.0.1:1420');
}));
test('mock HTTP provides offline and malformed fixtures', () => fixture(async request => {
  assert.equal((await request({ headers: { 'x-rivune-scenario': 'offline' } })).status, 503);
  const malformed = await request({ headers: { 'x-rivune-scenario': 'malformed' } }); await assert.rejects(() => malformed.json());
}));
