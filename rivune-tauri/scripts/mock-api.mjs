import http from 'node:http';
import { pathToFileURL } from 'node:url';

const origins = new Set(['http://localhost:1420', 'http://127.0.0.1:1420']);
const BODY_LIMIT = 64 * 1024;
// Representative local protocol fixtures only. No SDK, credentials, or upstream calls.
export function createMockServer() {
  return http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    const json = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(body));
    };
    if (origin && !origins.has(origin)) { json(403, { mock: true, error: { message: 'Origin not allowed' } }); return; }
    if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin'); }
    if (request.url !== '/v1/chat/completions') { json(404, { mock: true, error: { message: 'Unknown mock endpoint' } }); return; }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type, x-rivune-scenario' }); response.end(); return;
    }
    if (request.method !== 'POST') { json(405, { mock: true, error: { message: 'Use POST' } }); return; }
    if (request.headers.authorization !== 'Bearer rivune-mock-only') { json(401, { mock: true, error: { message: 'Use the dummy mock token', type: 'authentication_error' } }); return; }
    if (!request.headers['content-type']?.startsWith('application/json')) { json(415, { mock: true, error: { message: 'Use application/json' } }); return; }
    let size = 0;
    const chunks = [];
    try {
      await new Promise((resolve, reject) => {
        request.on('data', chunk => {
          size += chunk.length;
          if (size > BODY_LIMIT) { reject(new Error('limit')); return; }
          chunks.push(chunk);
        });
        request.once('end', resolve);
        request.once('error', reject);
      });
    } catch {
      if (!response.destroyed) json(size > BODY_LIMIT ? 413 : 400, { mock: true, error: { message: size > BODY_LIMIT ? 'Mock request exceeds 64 KiB' : 'Incomplete request' } });
      return;
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { json(400, { mock: true, error: { message: 'Invalid JSON' } }); return; }
    if (!body || typeof body !== 'object' || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 100 || typeof body.model !== 'string' || !body.model || body.model.length > 100 || (body.stream !== undefined && typeof body.stream !== 'boolean') || !body.messages.every(message => message && ['system', 'user', 'assistant'].includes(message.role) && typeof message.content === 'string')) {
      json(400, { mock: true, error: { message: 'Provide model and 1–100 text messages' } }); return;
    }
    const scenario = request.headers['x-rivune-scenario'] || 'success';
    if (scenario === '401') { json(401, { mock: true, error: { message: 'Simulated invalid credentials', type: 'authentication_error' } }); return; }
    if (scenario === '429') { response.setHeader('Retry-After', '1'); json(429, { mock: true, error: { message: 'Simulated rate limit', type: 'rate_limit_error' } }); return; }
    if (scenario === 'offline') { json(503, { mock: true, error: { message: 'Simulated provider unavailable' } }); return; }
    if (scenario === 'malformed') { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end('{"mock":true, broken fixture'); return; }
    if (scenario !== 'success') { json(400, { mock: true, error: { message: 'Unknown mock scenario' } }); return; }
    const text = 'This is a simulated API response. No model ran.';
    const base = { id: 'chatcmpl-rivune-mock', created: 0, model: body.model, mock: true };
    const usage = { prompt_tokens: 120, completion_tokens: 35, total_tokens: 155 };
    if (!body.stream) { json(200, { ...base, object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage }); return; }
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    const emit = (delta, finish_reason = null) => response.write(`data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason }] })}\n\n`);
    emit({ role: 'assistant', content: '' });
    for (const content of text.match(/.{1,12}/g)) emit({ content });
    emit({}, 'stop');
    response.write(`data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices: [], usage })}\n\n`);
    response.end('data: [DONE]\n\n');
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createMockServer();
  server.listen(3001, '127.0.0.1', () => console.log('Rivune mock API: http://127.0.0.1:3001/v1/chat/completions (local fixtures only)'));
}
