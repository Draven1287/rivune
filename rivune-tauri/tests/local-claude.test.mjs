import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { SAFE_FLAGS, subscriptionEnvironment, accountAuth, supportedClaude, checkClaudeReadiness, validateChatBody, serializeChat, isLocalRequest, createClaudeParser, createClaudeChatMiddleware } from '../scripts/local-claude.mjs';

const help = [...SAFE_FLAGS, '--print', '--output-format', '--include-partial-messages', '--no-session-persistence', '--permission-mode', '--permission-prompts', '--verbose', '--model'].join(' ');
const valid = { prompt: 'Hello', history: [], model: 'default' };
const auth = JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', subscriptionType: 'max', email: 'must-never-leak@example.test' });
const tick = () => new Promise(resolve => setImmediate(resolve));
// Spawning awaits locate, readiness and a real mkdtemp, so a fixed tick count is not a wait:
// on a cold machine those ticks drain long before the filesystem replies. Bound the poll by
// wall-clock instead, so a genuinely missing child still fails and a merely slow one does not.
const waitFor = async (ready, timeoutMs = 10000) => { const deadline = Date.now() + timeoutMs; while (!ready() && Date.now() < deadline) await tick(); return ready(); };
const result = { type: 'result', subtype: 'success', is_error: false, result: 'hello', usage: { input_tokens: 10, cache_read_input_tokens: 20, cache_creation_input_tokens: 30, output_tokens: 5 } };
function request(body = valid, changes = {}) {
  const req = new PassThrough();
  req.method = 'POST'; req.headers = { host: '127.0.0.1:1420', origin: 'http://127.0.0.1:1420', 'x-rivune-local-chat': '1', 'content-type': 'application/json', ...changes }; req.socket = { remoteAddress: '127.0.0.1' };
  queueMicrotask(() => req.end(JSON.stringify(body)));
  return req;
}
function response() {
  const res = new EventEmitter(); res.headers = {}; res.data = ''; res.statusCode = 200;
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.flushHeaders = () => { res.headersSent = true; };
  res.write = value => { res.data += value; return true; };
  res.end = (value = '') => { res.data += value; res.ended = true; res.emit('close'); };
  return res;
}
function processFixture(onSpawn) {
  return (...args) => {
    const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.exitCode = null; child.kills = [];
    child.kill = signal => { child.kills.push(signal); child.exitCode = 143; queueMicrotask(() => child.emit('close', 143)); };
    onSpawn(child, args); return child;
  };
}
const fixtureOptions = { locate: async () => '/fixture/claude', readiness: async () => ({ canChat: true }) };

test('subscription policy drops every inherited provider, token, hook, proxy and runtime override', () => {
  const env = subscriptionEnvironment({ ANTHROPIC_API_KEY: 'secret', CLAUDE_CODE_USE_BEDROCK: '1', ANTHROPIC_BASE_URL: 'evil', HTTPS_PROXY: 'evil', CLAUDE_CONFIG_DIR: 'evil', NODE_OPTIONS: 'evil', CLAUDE_CODE_OAUTH_TOKEN: 'secret', LANG: 'en_US.UTF-8' });
  assert.deepEqual(Object.keys(env).sort(), ['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', 'HOME', 'LANG', 'LOGNAME', 'PATH', 'TMPDIR', 'USER']);
  assert.ok(SAFE_FLAGS.includes('--safe-mode')); assert.ok(SAFE_FLAGS.includes('--restricted')); assert.ok(!SAFE_FLAGS.includes('--bare')); assert.equal(SAFE_FLAGS[SAFE_FLAGS.indexOf('--tools') + 1], '');
});
test('readiness requires exact account auth and capabilities under safe execution flags', async () => {
  assert.equal(accountAuth(auth), true);
  for (const value of ['{}', 'not-json', '{"loggedIn":true,"authMethod":"apiKey","apiProvider":"firstParty"}', '{"loggedIn":true,"authMethod":"claude.ai","apiProvider":"bedrock"}']) assert.equal(accountAuth(value), false);
  assert.equal(supportedClaude(help), true); assert.equal(supportedClaude(help.replace('--safe-mode', '')), false);
  const calls = [];
  const status = await checkClaudeReadiness({ binary: '/fixture', cwd: '/tmp', managedPolicy: async () => false, run: async (_, args, opts) => { calls.push({ args, opts }); return { ok: true, text: args.includes('--help') ? help : auth }; } });
  assert.equal(status.canChat, true); assert.ok(!JSON.stringify(status).includes('must-never-leak'));
  assert.deepEqual(calls[1].args, [...SAFE_FLAGS, 'auth', 'status']); assert.deepEqual(calls[0].opts.env, calls[1].opts.env);
  const unsupported = await checkClaudeReadiness({ binary: '/fixture', cwd: '/tmp', managedPolicy: async () => false, run: async () => ({ ok: true, text: '' }) });
  assert.equal(unsupported.canChat, undefined);
  const managed = await checkClaudeReadiness({ binary: '/fixture', cwd: '/tmp', managedPolicy: async () => true, run: async () => { throw new Error('Do not execute managed helpers'); } });
  assert.equal(managed.canChat, undefined);
  assert.equal(accountAuth(auth.replace('"max"', '"enterprise"')), false);
});
test('body and history limits reject instead of dropping context or accepting commands', () => {
  assert.deepEqual(validateChatBody(valid), valid);
  for (const body of [{ ...valid, prompt: 'x'.repeat(12001) }, { ...valid, model: '--dangerously-skip-permissions' }, { ...valid, history: [{ role: 'system', content: 'x' }] }, { ...valid, sessionId: 'user-supplied' }, { ...valid, history: [{ role: 'user', content: 'x'.repeat(48000) }] }]) assert.throws(() => validateChatBody(body));
  const serialized = serializeChat({ ...valid, prompt: '$(command)\n/resume', history: [{ role: 'assistant', content: 'earlier' }] });
  assert.ok(serialized.includes('earlier')); assert.ok(serialized.includes('$(command)')); assert.ok(serialized.includes('final user message'));
});
test('request policy rejects foreign origins, host mismatch, missing intent and remote sockets', () => {
  const req = request(); assert.equal(isLocalRequest(req), true);
  for (const change of [{ origin: 'https://evil.test' }, { host: 'evil.test' }, { origin: 'http://localhost:1420' }, { 'x-rivune-local-chat': undefined }]) assert.equal(isLocalRequest(request(valid, change)), false);
  req.socket.remoteAddress = '192.168.1.4'; assert.equal(isLocalRequest(req), false);
});
test('stream parser deduplicates assistant text and reports total cached input without private fields', () => {
  const events = [], parser = createClaudeParser(e => events.push(e));
  const lines = [{ type: 'system', subtype: 'init', model: 'claude-fixture', session_id: 'private' }, { type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hello' } } }, { type: 'assistant', message: { content: [{ type: 'text', text: 'hello' }] } }, result].map(JSON.stringify).join('\n');
  parser.push(lines.slice(0, 15)); parser.push(lines.slice(15)); assert.equal(parser.finish(), true);
  assert.deepEqual(events, [{ type: 'text', text: 'hello' }, { type: 'metadata', model: 'claude-fixture', inputTokens: 60, outputTokens: 5 }]);
  const bad = createClaudeParser(() => {}); assert.throws(() => bad.push('invalid\n'));
  const failure = createClaudeParser(() => {}); failure.push(JSON.stringify({ type: 'result', subtype: 'error', is_error: true }) + '\n'); assert.equal(failure.finish(), false);
});
test('HTTP adapter streams through restricted child with stdin context and empty temporary workspace', async () => {
  let invocation, prompt = '';
  const handler = createClaudeChatMiddleware({ ...fixtureOptions, spawnProcess: processFixture((child, args) => {
    invocation = args; child.stdin.on('data', data => { prompt += data; });
    child.stdin.on('finish', () => { child.stdout.end(JSON.stringify(result) + '\n'); child.exitCode = 0; queueMicrotask(() => child.emit('close', 0)); });
  }) });
  const res = response(); await handler(request({ ...valid, model: 'sonnet' }), res);
  assert.equal(res.statusCode, 200); assert.ok(res.data.includes('"type":"done"')); assert.ok(prompt.includes('Hello'));
  assert.ok(invocation[1].includes('--no-session-persistence')); assert.ok(invocation[1].includes('sonnet')); assert.ok(invocation[2].cwd.includes('rivune-claude-chat-')); assert.equal(invocation[2].shell, undefined);
});
test('concurrent request is rejected and closing response terminates running Claude', async () => {
  let child;
  const handler = createClaudeChatMiddleware({ ...fixtureOptions, spawnProcess: processFixture(c => { child = c; }) });
  const res = response(), pending = handler(request(), res);
  try {
    assert.ok(await waitFor(() => child), 'Claude child process did not spawn');
    const second = response(); await handler(request(), second); assert.equal(second.statusCode, 409);
  } finally {
    // Always end the request. An abandoned handler keeps the module-global lock and its
    // three-minute deadline timer, so one failure here would also fail the next test and
    // hold the whole run open until that timer fires.
    res.emit('close'); await pending;
  }
  assert.deepEqual(child.kills, ['SIGTERM']); assert.ok(!res.data.includes('"type":"done"'));
});
test('unready and invalid requests do not spawn; process failures expose no raw stderr', async () => {
  const noSpawn = () => { throw new Error('must not spawn'); };
  const unready = createClaudeChatMiddleware({ ...fixtureOptions, readiness: async () => ({}), spawnProcess: noSpawn });
  const res = response(); await unready(request(), res); assert.equal(res.statusCode, 503);
  const invalid = response(); await unready(request({ ...valid, prompt: '' }), invalid); assert.equal(invalid.statusCode, 400);
  const oversized = response(); await unready(request({ ...valid, history: [{ role: 'user', content: 'x'.repeat(48000) }] }), oversized); assert.equal(oversized.statusCode, 413);
  const failure = createClaudeChatMiddleware({ ...fixtureOptions, spawnProcess: processFixture(child => child.stdin.on('finish', () => { child.stderr.write('secret-token email@example.test'); child.exitCode = 1; child.emit('close', 1); })) });
  const failed = response(); await failure(request(), failed); assert.ok(failed.data.includes('"type":"error"')); assert.ok(!failed.data.includes('secret-token')); assert.ok(!failed.data.includes('email@example.test'));
});
