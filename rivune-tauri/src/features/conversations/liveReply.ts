export const claudeModels = ['default', 'sonnet', 'opus', 'haiku'] as const;
export type ClaudeModel = typeof claudeModels[number];
export interface LiveReply {
  provider: 'Claude';
  transport: 'account-cli';
  requestedModel: ClaudeModel;
  model?: string;
  text: string;
  status: 'responding' | 'completed' | 'stopped' | 'error' | 'interrupted';
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  previousText?: string;
}
export function parseLiveReply(value: unknown): LiveReply | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const r = value as LiveReply;
  if (r.provider !== 'Claude' || r.transport !== 'account-cli' || !claudeModels.includes(r.requestedModel) || typeof r.text !== 'string' || r.text.length > 48000 || !['responding', 'completed', 'stopped', 'error', 'interrupted'].includes(r.status)) return;
  if (r.model !== undefined && (typeof r.model !== 'string' || r.model.length > 200)) return;
  if (r.error !== undefined && (typeof r.error !== 'string' || r.error.length > 2000)) return;
  if (r.previousText !== undefined && (typeof r.previousText !== 'string' || r.previousText.length > 48000)) return;
  for (const count of [r.inputTokens, r.outputTokens]) if (count !== undefined && (!Number.isSafeInteger(count) || count < 0)) return;
  return { provider: 'Claude', transport: 'account-cli', requestedModel: r.requestedModel, text: r.text,
    status: r.status === 'responding' ? 'interrupted' : r.status,
    ...(r.model !== undefined ? { model: r.model } : {}), ...(r.error !== undefined ? { error: r.error } : {}),
    ...(r.inputTokens !== undefined ? { inputTokens: r.inputTokens } : {}), ...(r.outputTokens !== undefined ? { outputTokens: r.outputTokens } : {}),
    ...(r.previousText !== undefined ? { previousText: r.previousText } : {}) };
}

export function beginClaudeReply(model: ClaudeModel, previous?: LiveReply): LiveReply {
  const previousText = previous?.text || previous?.previousText;
  return { provider: 'Claude', transport: 'account-cli', requestedModel: previous?.requestedModel || model, text: '', status: 'responding', ...(previousText ? { previousText } : {}) };
}

// Only successful Claude turns form real continuation. Simulations, unsent drafts,
// other providers and interrupted output never silently enter an account request.
export function claudeHistory(turns: { prompt: string; reply?: LiveReply }[], before: number) {
  return turns.slice(0, before).filter(turn => turn.reply?.status === 'completed').flatMap(turn => [
    { role: 'user' as const, content: turn.prompt },
    { role: 'assistant' as const, content: turn.reply!.text },
  ]);
}
