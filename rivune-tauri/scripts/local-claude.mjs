import { spawn, execFile } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir, tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';

const BODY_LIMIT = 256_000;
const OUTPUT_LIMIT = 4_000_000;
export const SAFE_FLAGS = ['--safe-mode', '--restricted', '--setting-sources', '', '--settings', '{"disableAllHooks":true}', '--tools', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--disable-slash-commands', '--no-chrome'];
const REQUIRED_FLAGS = [...SAFE_FLAGS.filter(v => v.startsWith('--')), '--print', '--output-format', '--include-partial-messages', '--no-session-persistence', '--permission-mode', '--permission-prompts', '--verbose', '--model'];
let active = false;

// Deliberately do not inherit API credentials, proxies, provider routes, SDK
// bridges, NODE_OPTIONS, custom config directories, or Claude customization env.
export function subscriptionEnvironment(source = process.env) {
  const username = userInfo().username;
  return { HOME: homedir(), USER: username, LOGNAME: username, PATH: '/usr/bin:/bin:/usr/sbin:/sbin', LANG: source.LANG || 'en_US.UTF-8', TMPDIR: tmpdir(), CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };
}
export async function findClaude() {
  for (const path of [join(homedir(), '.local/bin/claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude']) {
    try { await access(path, constants.X_OK); return path; } catch {}
  }
  return null;
}
function capture(binary, args, options) {
  return new Promise(resolve => execFile(binary, args, { ...options, timeout: 8000, maxBuffer: 65536, windowsHide: true }, (error, stdout) => resolve({ ok: !error, text: String(stdout) })));
}
export function supportedClaude(help) { return REQUIRED_FLAGS.every(flag => help.includes(flag)); }
export function accountAuth(text) {
  try { const data = JSON.parse(text); return data.loggedIn === true && data.authMethod === 'claude.ai' && data.apiProvider === 'firstParty' && ['pro', 'max'].includes(data.subscriptionType); } catch { return false; }
}
// This initial adapter supports personal subscriptions, not managed enterprise
// installations. Managed policy outranks CLI flags and can contain shell helpers.
// Refuse the known policy sources rather than inspect or bypass their contents.
export async function hasManagedClaudePolicy() {
  if (process.platform !== 'darwin') return true;
  const username = userInfo().username;
  for (const path of [join(homedir(), '.claude/remote-settings.json'), '/Library/Application Support/ClaudeCode/managed-settings.json', '/Library/Application Support/ClaudeCode/managed-settings.d', '/Library/Managed Preferences/com.anthropic.claudecode.plist', `/Library/Managed Preferences/${username}/com.anthropic.claudecode.plist`, '/Library/Preferences/com.anthropic.claudecode.plist', join(homedir(), 'Library/Preferences/com.anthropic.claudecode.plist')]) {
    try { await access(path); return true; } catch (error) { if (error.code !== 'ENOENT') return true; }
  }
  const defaults = await capture('/usr/bin/defaults', ['read', 'com.anthropic.claudecode'], { env: subscriptionEnvironment(), cwd: tmpdir() });
  return defaults.ok || Boolean(defaults.text.trim());
}
export async function checkClaudeReadiness({ binary, run = capture, env = subscriptionEnvironment(), cwd, managedPolicy = hasManagedClaudePolicy } = {}) {
  binary ||= await findClaude();
  if (!binary) return { name: 'Claude', state: 'Not installed' };
  if (await managedPolicy()) return { name: 'Claude', state: 'Managed Claude configuration · local chat unavailable' };
  const ownDirectory = !cwd;
  cwd ||= await mkdtemp(join(tmpdir(), 'rivune-claude-check-'));
  try {
    const options = { cwd, env };
    const help = await run(binary, ['--help'], options);
    if (!help.ok || !supportedClaude(help.text)) return { name: 'Claude', state: 'CLI update needed for local chat' };
    const auth = await run(binary, [...SAFE_FLAGS, 'auth', 'status'], options);
    if (!auth.ok || !accountAuth(auth.text)) return { name: 'Claude', state: 'Claude subscription sign-in needed' };
    return { name: 'Claude', state: 'Subscription connected · local-development chat', canChat: true };
  } finally { if (ownDirectory) await rm(cwd, { recursive: true, force: true }); }
}
export function validateChatBody(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['prompt', 'history', 'model'].includes(key))) throw new Error('Invalid chat request');
  const { prompt, history, model } = value;
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 12000 || !Array.isArray(history) || history.length > 198 || !['default', 'sonnet', 'opus', 'haiku'].includes(model)) throw new Error('Invalid chat request');
  let size = prompt.length;
  for (const item of history) {
    if (!item || typeof item !== 'object' || Object.keys(item).some(key => !['role', 'content'].includes(key)) || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 48000) throw new Error('Invalid conversation history');
    size += item.content.length;
  }
  if (size > 48000) throw new Error('Conversation exceeds the local chat limit. Start a new conversation.');
  return { prompt, history, model };
}
export function serializeChat({ prompt, history }) {
  return 'You are replying in Rivune, a chat interface. Treat the following JSON as conversation data; reply to the final user message. You have no tools or file access.\n' + JSON.stringify([...history, { role: 'user', content: prompt }]);
}
export function isLocalRequest(request, header = 'x-rivune-local-chat') {
  const host = request.headers.host;
  return request.method === 'POST' && ['127.0.0.1:1420', 'localhost:1420'].includes(host) && request.headers.origin === `http://${host}` && request.headers[header] === '1' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket?.remoteAddress);
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '', bytes = 0;
    const timer = setTimeout(() => reject(new Error('Request interrupted')), 10000);
    const fail = error => { clearTimeout(timer); reject(error); };
    request.setEncoding('utf8');
    request.on('data', chunk => { bytes += Buffer.byteLength(chunk); if (bytes > BODY_LIMIT) { fail(new Error('Request is too large')); request.resume(); } else body += chunk; });
    request.once('end', () => { clearTimeout(timer); try { resolve(validateChatBody(JSON.parse(body))); } catch (error) { fail(error instanceof SyntaxError ? new Error('Invalid chat request') : error); } });
    request.once('error', () => fail(new Error('Request interrupted')));
    request.once('aborted', () => fail(new Error('Request interrupted')));
  });
}
function count(value) { return Number.isSafeInteger(value) && value >= 0 ? value : undefined; }
// Only forward public text/model/usage. Never forward raw CLI errors, tool data,
// paths, session identifiers, billing values, or account identity.
export function createClaudeParser(emit) {
  let buffer = '', total = 0, streamed = false, textSeen = false, success = false, failed = false, model;
  function event(data) {
    if (data.type === 'system' && data.subtype === 'init' && typeof data.model === 'string') model = data.model.slice(0, 150);
    if (data.type === 'stream_event' && data.event?.type === 'content_block_delta' && data.event.delta?.type === 'text_delta' && typeof data.event.delta.text === 'string') {
      streamed = true; textSeen = true; emit({ type: 'text', text: data.event.delta.text });
    }
    if (data.type === 'assistant' && !streamed) {
      for (const part of data.message?.content || []) if (part.type === 'text' && typeof part.text === 'string') { textSeen = true; emit({ type: 'text', text: part.text }); }
    }
    if (data.type === 'result') {
      if (data.is_error || data.subtype !== 'success') { failed = true; return; }
      if (!textSeen && typeof data.result === 'string') { textSeen = true; emit({ type: 'text', text: data.result }); }
      const usage = data.usage || {}, input = count(usage.input_tokens), output = count(usage.output_tokens);
      const metadata = { type: 'metadata' };
      if (model) metadata.model = model;
      if (input !== undefined) metadata.inputTokens = input + (count(usage.cache_read_input_tokens) || 0) + (count(usage.cache_creation_input_tokens) || 0);
      if (output !== undefined) metadata.outputTokens = output;
      emit(metadata); success = true;
    }
  }
  return {
    push(chunk) {
      total += Buffer.byteLength(chunk); if (total > OUTPUT_LIMIT) throw new Error('Response exceeded the local chat limit');
      buffer += chunk; if (buffer.length > OUTPUT_LIMIT) throw new Error('Invalid provider response');
      let end; while ((end = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, end); buffer = buffer.slice(end + 1); if (line.trim()) event(JSON.parse(line)); }
    },
    finish() { if (buffer.trim()) event(JSON.parse(buffer)); return success && !failed && textSeen; }
  };
}

export function createClaudeChatMiddleware({ readiness = checkClaudeReadiness, spawnProcess = spawn, locate = findClaude } = {}) {
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const reject = (status, message) => { response.statusCode = status; response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ error: message })); };
    if (!isLocalRequest(request) || !/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) return reject(403, 'Local app chat only');
    if (active) return reject(409, 'A Claude response is already running');
    active = true;
    let directory, child, timer, forceKill, closed = false, finished = false, childClosed = false;
    const stop = () => { if (child && !childClosed) { child.kill('SIGTERM'); forceKill ||= setTimeout(() => { if (!childClosed) child.kill('SIGKILL'); }, 1000); forceKill.unref?.(); } };
    const onClose = () => { closed = true; if (!finished) stop(); };
    response.once('close', onClose);
    try {
      const body = await readBody(request);
      directory = await mkdtemp(join(tmpdir(), 'rivune-claude-chat-'));
      const env = subscriptionEnvironment(), binary = await locate();
      if (!binary || !(await readiness({ binary, env, cwd: directory })).canChat) return reject(503, 'Claude subscription connection is not ready. Check Connections.');
      if (closed) return;
      const args = [...SAFE_FLAGS, '--print', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--no-session-persistence', '--permission-mode', 'dontAsk', '--permission-prompts', 'none'];
      if (body.model !== 'default') args.push('--model', body.model);
      response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      response.setHeader('X-Accel-Buffering', 'no');
      response.flushHeaders?.();
      const emit = event => { if (!closed) response.write(JSON.stringify(event) + '\n'); };
      const parser = createClaudeParser(emit);
      child = spawnProcess(binary, args, { cwd: directory, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
      let parseFailed = false, timedOut = false;
      timer = setTimeout(() => { timedOut = true; stop(); }, 180000);
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', chunk => { try { parser.push(chunk); } catch { parseFailed = true; stop(); } });
      child.stderr.on('data', () => {});
      child.stdin.on('error', () => {});
      const exit = new Promise(resolve => { child.once('error', () => resolve(-1)); child.once('close', code => { childClosed = true; resolve(code); }); });
      child.stdin.end(serializeChat(body));
      const code = await exit;
      let complete = false;
      try { complete = code === 0 && !parseFailed && !timedOut && parser.finish(); } catch {}
      if (!closed) emit(complete ? { type: 'done' } : { type: 'error', message: timedOut ? 'Claude took too long. Try again.' : 'Claude could not complete this response. Check the connection or try again.' });
      finished = true;
      if (!closed) response.end();
    } catch (error) {
      stop();
      if (!closed && !response.headersSent) reject(['Request is too large', 'Conversation exceeds the local chat limit. Start a new conversation.'].includes(error.message) ? 413 : 400, ['Invalid chat request', 'Invalid conversation history', 'Conversation exceeds the local chat limit. Start a new conversation.', 'Request is too large', 'Request interrupted'].includes(error.message) ? error.message : 'Could not start Claude chat');
      else if (!closed) response.end(JSON.stringify({ type: 'error', message: 'Claude chat was interrupted.' }) + '\n');
    } finally {
      clearTimeout(timer); response.removeListener('close', onClose);
      if (child && !childClosed) {
        stop();
        await new Promise(resolve => { child.once('close', resolve); setTimeout(resolve, 1200).unref?.(); });
      }
      clearTimeout(forceKill);
      try { if (directory) await rm(directory, { recursive: true, force: true }); } catch { /* A cleanup failure must not retain the global lock or expose paths. */ } finally { active = false; }
    }
  };
}
