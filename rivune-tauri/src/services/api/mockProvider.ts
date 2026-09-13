export const scenarios = ['success', 'streaming', 'slow', 'rate-limit', 'invalid-auth', 'offline', 'malformed', 'context-limit', 'tool-call'] as const;
export type Scenario = typeof scenarios[number];
export type ProviderEvent = { type: 'text'; text: string } | { type: 'tool'; name: string } | { type: 'usage'; input: number; output: number; simulated: true };
export interface ProviderRequest {
  prompt: string;
  fixtureText?: string;
  model: string;
  scenario: Scenario;
  signal: AbortSignal;
  history?: { role: 'user' | 'assistant'; content: string }[];
}
export interface AIProvider {
  stream(request: ProviderRequest): AsyncIterable<ProviderEvent>;
}
export class ProviderError extends Error {
  constructor(public code: string, message: string, public retryable = false) { super(message); }
}
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Stopped', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Stopped', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
// Intentionally no fetch, credentials, SDK, or fallback to a live provider.
export class MockProvider implements AIProvider {
  constructor(private delay = 90) {}
  async *stream({ prompt, model, scenario, signal, history = [], fixtureText }: ProviderRequest): AsyncIterable<ProviderEvent> {
    await pause(scenario === 'slow' ? this.delay * 20 : this.delay, signal);
    const errors: Partial<Record<Scenario, ProviderError>> = {
      'rate-limit': new ProviderError('429', 'Simulated rate limit. Retry when ready.', true),
      'invalid-auth': new ProviderError('401', 'Simulated invalid credentials. No real key was checked.'),
      offline: new ProviderError('offline', 'Simulated provider offline.', true),
      malformed: new ProviderError('invalid-response', 'Simulated malformed provider response.'),
      'context-limit': new ProviderError('context-limit', 'Simulated context limit. Shorten the request.'),
    };
    if (errors[scenario]) throw errors[scenario];
    if (scenario === 'tool-call') yield { type: 'tool', name: 'read_example_file (simulated; no file access)' };
    const context = history.length ? ` This fixture received ${history.length} previous messages for continuation.` : '';
    const reply = fixtureText ?? `[Simulation · ${model}] This is a mock response. Your ${prompt.length}-character request stayed on this device.${context} No model ran.`;
    for (const text of scenario === 'success' ? [reply] : reply.match(/.{1,12}/gs) || []) {
      await pause(this.delay, signal); yield { type: 'text', text };
    }
    signal.throwIfAborted();
    yield { type: 'usage', input: 120, output: 35, simulated: true };
  }
}
