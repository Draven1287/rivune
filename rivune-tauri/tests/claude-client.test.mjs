import test from 'node:test';
import assert from 'node:assert/strict';
import { ClaudeProvider } from './compiled/providers.js';
import { parseConversations } from './compiled/workspace.js';
import { beginClaudeReply, claudeHistory } from './compiled/features/conversations/liveReply.js';

const request = () => ({ prompt: 'Hello', history: [], model: 'default', signal: new AbortController().signal });
const response = events => new Response(events.map(event => JSON.stringify(event)).join('\n') + '\n');
test('Claude client sends only the specified account request and parses fragmented Unicode streams', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ type: 'text', text: 'Hello 🌍' }) + '\n' + JSON.stringify({ type: 'done' }));
  let called = 0;
  const provider = new ClaudeProvider(async (url, options) => {
    called++; assert.equal(url, '/__rivune/claude/chat'); assert.equal(options.method, 'POST');
    assert.equal(options.headers['X-Rivune-Local-Chat'], '1');
    assert.deepEqual(JSON.parse(options.body), { prompt: 'Hello', history: [], model: 'default' });
    return new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } }));
  });
  const events = []; for await (const event of provider.stream(request())) events.push(event);
  assert.deepEqual(events, [{ type: 'text', text: 'Hello 🌍' }, { type: 'done' }]); assert.equal(called, 1);
});
test('EOF cannot turn a partial response into a completed reply', async () => {
  const provider = new ClaudeProvider(async () => response([{ type: 'text', text: 'Partial' }]));
  const seen = []; await assert.rejects(async () => { for await (const event of provider.stream(request())) seen.push(event); }, /ended before Claude finished/);
  assert.deepEqual(seen, [{ type: 'text', text: 'Partial' }]);
});
test('Claude client surfaces account, busy and context failures without exposing server bodies', async () => {
  for (const [status, pattern] of [[401, /sign-in/], [409, /another request/], [413, /too long/], [503, /unavailable/]]) {
    const provider = new ClaudeProvider(async () => new Response('sensitive raw stderr', { status }));
    await assert.rejects(async () => { for await (const _ of provider.stream(request())) {} }, pattern);
  }
});
test('invalid metadata, oversized replies, and protocol errors fail closed', async () => {
  for (const events of [[{ type: 'metadata', inputTokens: -1 }], [{ type: 'text', text: 'x'.repeat(48000) }, { type: 'text', text: 'x' }], [{ type: 'invented' }], [{ type: 'error', message: 'Account unavailable' }]]) {
    const provider = new ClaudeProvider(async () => response([...events, { type: 'done' }]));
    await assert.rejects(async () => { for await (const _ of provider.stream(request())) {} });
  }
});
test('closing a stream cancels its reader so the server can stop inference', async () => {
  let cancelled = false;
  const provider = new ClaudeProvider(async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"type":"text","text":"one"}\n')); }, cancel() { cancelled = true; } })));
  for await (const _ of provider.stream(request())) break;
  assert.equal(cancelled, true);
});
test('abort interrupts a stalled read even when fetch ignores its signal and cancellation never settles', { timeout: 1000 }, async () => {
  const controller = new AbortController();
  const reason = new DOMException('Stopped by the user', 'AbortError');
  let readerStarted;
  const started = new Promise(resolve => { readerStarted = resolve; });
  let cancelCount = 0;
  const body = new ReadableStream({
    pull() { readerStarted(); },
    cancel() { cancelCount++; return new Promise(() => {}); }
  });
  const provider = new ClaudeProvider(async () => new Response(body));
  const iterator = provider.stream({ ...request(), signal: controller.signal })[Symbol.asyncIterator]();
  const next = iterator.next();
  await started;
  // Let the provider attach its reader after the stream's initial pull.
  await new Promise(resolve => setImmediate(resolve));
  controller.abort(reason);
  await assert.rejects(next, error => error === reason);
  assert.equal(cancelCount, 1);
  assert.equal(body.locked, false);
});
test('abort preserves delivered partial output and cannot yield buffered completion', { timeout: 1000 }, async () => {
  const controller = new AbortController();
  const provider = new ClaudeProvider(async () => response([{ type: 'text', text: 'Keep this partial reply' }, { type: 'done' }]));
  const iterator = provider.stream({ ...request(), signal: controller.signal })[Symbol.asyncIterator]();
  assert.deepEqual(await iterator.next(), { value: { type: 'text', text: 'Keep this partial reply' }, done: false });
  controller.abort();
  await assert.rejects(iterator.next(), error => error.name === 'AbortError');
});
test('pre-aborted requests never start a provider call', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  const provider = new ClaudeProvider(async () => { calls++; return response([{ type: 'done' }]); });
  await assert.rejects(async () => { for await (const _ of provider.stream({ ...request(), signal: controller.signal })) {} }, error => error.name === 'AbortError');
  assert.equal(calls, 0);
});
test('explicit early closure does not hang on an underlying cancel hook', { timeout: 1000 }, async () => {
  let cancelled = false;
  const provider = new ClaudeProvider(async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('{"type":"text","text":"one"}\n')); },
    cancel() { cancelled = true; return new Promise(() => {}); }
  })));
  for await (const _ of provider.stream(request())) break;
  assert.equal(cancelled, true);
});
test('the default transport does not bind browser fetch to a provider instance', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = function () { assert.ok(this === undefined || this === globalThis); return Promise.resolve(response([{ type: 'done' }])); };
  try { for await (const _ of new ClaudeProvider().stream(request())) {} }
  finally { globalThis.fetch = original; }
});

const turn = { prompt: 'Hello', mode: 'single', provider: 'Claude', createdAt: 1 };
const reply = { provider: 'Claude', transport: 'account-cli', requestedModel: 'default', model: 'reported-model', text: 'Real reply', status: 'completed', inputTokens: 24, outputTokens: 8 };
test('real replies survive reload with provenance and usage; in-flight replies become interrupted', () => {
  const rows = parseConversations(JSON.stringify([{ id: 'chat', ...turn, messages: [{ ...turn, reply }, { ...turn, reply: { ...reply, status: 'responding', text: 'Partial' } }] }]));
  assert.deepEqual(rows[0].messages[0].reply, reply);
  assert.equal(rows[0].messages[1].reply.status, 'interrupted'); assert.equal(rows[0].messages[1].reply.text, 'Partial');
});
test('corrupt or mismatched live data never removes prompts or relabels simulations as real', () => {
  for (const invalid of [{ ...reply, transport: 'api' }, { ...reply, inputTokens: -1 }, { ...reply, requestedModel: 'unknown' }, { ...reply, text: 'x'.repeat(48001) }]) {
    const row = parseConversations(JSON.stringify([{ id: 'chat', ...turn, reply: invalid }]))[0];
    assert.equal(row.prompt, turn.prompt); assert.equal(row.reply, undefined);
  }
  const row = parseConversations(JSON.stringify([{ id: 'chat', ...turn, simulation: { text: 'Mock', status: 'completed' }, reply }]))[0];
  assert.equal(row.reply, undefined); assert.equal(row.simulation.text, 'Mock');
});
test('continuation includes only completed live turns before the selected message', () => {
  const turns = [ { ...turn, reply }, { ...turn, prompt: 'Unsent' }, { ...turn, simulation: { text: 'Mock', status: 'completed' } }, { ...turn, reply: { ...reply, status: 'stopped' } }, { ...turn, prompt: 'Retry this' }, { ...turn, prompt: 'Future', reply } ];
  assert.deepEqual(claudeHistory(turns, 4), [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Real reply' }]);
});
test('retry keeps the previous partial reply across empty failures and reload', () => {
  const first = beginClaudeReply('default', { ...reply, status: 'stopped', text: 'Keep this partial answer' });
  assert.equal(first.previousText, 'Keep this partial answer');
  first.status = 'error'; first.error = 'Busy';
  const second = beginClaudeReply('default', first);
  const restored = parseConversations(JSON.stringify([{ ...turn, id: 'chat', reply: second }]))[0].reply;
  assert.equal(restored.previousText, 'Keep this partial answer'); assert.equal(restored.status, 'interrupted');
});
