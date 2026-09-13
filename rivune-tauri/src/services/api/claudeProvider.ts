import type { ClaudeModel } from '../../features/conversations/liveReply.js';
export type ClaudeEvent = { type: 'text'; text: string } | { type: 'metadata'; model?: string; inputTokens?: number; outputTokens?: number } | { type: 'done' } | { type: 'error'; message: string };
function parseEvent(line: string): ClaudeEvent {
  const event = JSON.parse(line);
  if (!event || typeof event !== 'object') throw new Error('Invalid response from the local Claude adapter.');
  if (event.type === 'text' && typeof event.text === 'string' && event.text.length <= 48000) return { type: 'text', text: event.text };
  if (event.type === 'done') return { type: 'done' };
  if (event.type === 'error' && typeof event.message === 'string' && event.message.length <= 2000) return { type: 'error', message: event.message };
  if (event.type === 'metadata') {
    if (event.model !== undefined && (typeof event.model !== 'string' || event.model.length > 200)) throw new Error('Invalid model metadata.');
    for (const key of ['inputTokens', 'outputTokens']) if (event[key] !== undefined && (!Number.isSafeInteger(event[key]) || event[key] < 0)) throw new Error('Invalid usage metadata.');
    return { type: 'metadata', model: event.model, inputTokens: event.inputTokens, outputTokens: event.outputTokens };
  }
  throw new Error('Unrecognized response from the local Claude adapter.');
}
export class ClaudeProvider {
  constructor(private request: typeof fetch = (...args) => fetch(...args)) {}
  async *stream(request: { prompt: string; model: ClaudeModel; history: { role: 'user' | 'assistant'; content: string }[]; signal: AbortSignal }): AsyncIterable<ClaudeEvent> {
    const { signal, ...body } = request;
    signal.throwIfAborted();
    const response = await this.request('/__rivune/claude/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Rivune-Local-Chat': '1' }, body: JSON.stringify(body), signal }).catch(() => {
      if (signal.aborted) signal.throwIfAborted();
      throw new Error('Could not reach the local Claude connection. Check Connections and try again.');
    });
    if (signal.aborted) {
      void response.body?.cancel().catch(() => {});
      signal.throwIfAborted();
    }
    if (!response.ok) {
      const messages: Record<number, string> = { 401: 'Claude needs an account sign-in. Check Connections and try again.', 403: 'Claude chat is available only in the local development preview.', 409: 'Claude is answering another request. Wait or stop it before trying again.', 413: 'This conversation is too long for this adapter. Start a new chat.', 422: 'This request is not supported by the Claude adapter.', 503: 'Claude is unavailable. Check Connections and try again.' };
      throw new Error(messages[response.status] || 'Could not start Claude. Check Connections and try again.');
    }
    if (!response.body) throw new Error('Claude returned no response stream.');
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let total = 0;
    // Fetch usually handles abort, but injected transports and custom streams may
    // ignore its signal. Cancel the reader explicitly and wake any pending read.
    let rejectAbort!: (reason: unknown) => void;
    const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
    void aborted.catch(() => {});
    let cancelled = false;
    const cancelReader = () => {
      if (cancelled) return;
      cancelled = true;
      // A custom underlying cancel hook can itself remain pending indefinitely.
      // Stop must not wait for that hook before reporting the interruption.
      void reader.cancel().catch(() => {});
    };
    const onAbort = () => { cancelReader(); rejectAbort(signal.reason); };
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
    try {
      while (true) {
        signal.throwIfAborted();
        const chunk = await Promise.race([reader.read(), aborted]);
        signal.throwIfAborted();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        if (buffer.length > 200000) throw new Error('Claude response exceeded the adapter limit.');
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0 || (chunk.done && buffer.length)) {
          const line = newline >= 0 ? buffer.slice(0, newline) : buffer;
          buffer = newline >= 0 ? buffer.slice(newline + 1) : '';
          if (!line.trim()) continue;
          signal.throwIfAborted();
          const event = parseEvent(line);
          if (event.type === 'error') throw new Error(event.message);
          if (event.type === 'text') { total += event.text.length; if (total > 48000) throw new Error('Claude response exceeded the saved-message limit.'); }
          yield event;
          signal.throwIfAborted();
          if (event.type === 'done') return;
        }
        if (chunk.done) throw new Error('The connection ended before Claude finished. Partial output is kept.');
      }
    } catch (error) {
      signal.throwIfAborted();
      throw error;
    } finally {
      signal.removeEventListener('abort', onAbort);
      cancelReader();
      reader.releaseLock();
    }
  }
}
