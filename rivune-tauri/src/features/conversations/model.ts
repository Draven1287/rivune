import { parseCouncilDemo, type CouncilDemo } from './councilDemo.js';
import { parseLiveReply, type LiveReply } from './liveReply.js';
import { scenarios, type Scenario } from '../../services/api/mockProvider.js';

export type Mode = 'council' | 'swarm' | 'single' | 'pending';
export type Route = 'auto' | 'single';
export interface SimulationResult {
  council?: CouncilDemo;
  text: string;
  status: 'completed' | 'stopped' | 'error' | 'streaming' | 'interrupted';
  error?: string;
  scenario?: Scenario;
}
export interface ConversationMessage { prompt: string; mode: Mode; createdAt: number; provider?: string; simulation?: SimulationResult; reply?: LiveReply }
export interface Conversation extends ConversationMessage { id: string; messages?: ConversationMessage[]; archived?: boolean; projectId?: string }
function isMessage(value: unknown): value is ConversationMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const message = value as ConversationMessage;
  if (typeof message.prompt !== 'string' || !message.prompt.trim() || message.prompt.length > 12000 || !['council', 'swarm', 'single', 'pending'].includes(message.mode) || typeof message.createdAt !== 'number' || !Number.isFinite(message.createdAt)) return false;
  return message.mode !== 'single' || ['Codex', 'Claude', 'Gemini', 'Grok'].includes(message.provider || '');
}
function parseSimulation(value: unknown): SimulationResult | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const result = value as SimulationResult;
  if (typeof result.text !== 'string' || result.text.length > 48000 || !['completed', 'stopped', 'error', 'streaming', 'interrupted'].includes(result.status)) return undefined;
  if (result.error !== undefined && (typeof result.error !== 'string' || result.error.length > 2000)) return undefined;
  if (result.scenario !== undefined && !scenarios.includes(result.scenario)) return undefined;
  return {
    text: result.text,
    ...(parseCouncilDemo(result.council) ? { council: parseCouncilDemo(result.council) } : {}),
    // A reloaded workspace cannot resume a stream that belonged to the previous page.
    status: result.status === 'streaming' ? 'interrupted' : result.status,
    ...(result.error !== undefined ? { error: result.error } : {}),
    ...(result.scenario !== undefined ? { scenario: result.scenario } : {}),
  };
}
function recoverMessage(message: ConversationMessage): ConversationMessage {
  const simulation = parseSimulation(message.simulation);
  const reply = !simulation && message.mode === 'single' && message.provider === 'Claude' ? parseLiveReply(message.reply) : undefined;
  // Preserve the user's request even if an optional simulated response is corrupt.
  return {
    prompt: message.prompt, mode: message.mode, createdAt: message.createdAt,
    ...(typeof message.provider === 'string' ? { provider: message.provider } : {}),
    ...(simulation ? { simulation } : {}),
    ...(reply ? { reply } : {}),
  };
}
export function parseConversations(raw: string | null): Conversation[] {
  try {
    const rows: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(rows)) return [];
    const ids = new Set<string>();
    return rows.filter((row): row is Conversation => {
      if (!row || typeof row !== 'object') return false;
      const r = row as Conversation;
      if (typeof r.id !== 'string' || !r.id || ids.has(r.id) || !isMessage(r)) return false;
      if (r.messages !== undefined && (!Array.isArray(r.messages) || r.messages.length === 0 || r.messages.length > 100 || !r.messages.every(isMessage))) return false;
      ids.add(r.id); return true;
    }).slice(0, 50).map(row => ({
      ...recoverMessage(row), id: row.id,
      ...(row.messages ? { messages: row.messages.map(recoverMessage) } : {}),
      ...(typeof row.archived === 'boolean' ? { archived: row.archived } : {}),
      ...(typeof row.projectId === 'string' && row.projectId.trim().length > 0 && row.projectId.length <= 200 ? { projectId: row.projectId.trim() } : {}),
    }));
  } catch { return []; }
}
