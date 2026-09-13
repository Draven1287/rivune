import type { PendingRun, RecoveryJournal } from './workspaceController.ts';

const names = ['getSubmissionRecovery', 'reserveSubmissionRecovery', 'clearSubmissionRecovery'] as const;
const message = 'Durable request recovery is unavailable or unconfirmed. New submissions remain blocked.';
function invalid(): never { throw new Error(message); }
function identity(value: unknown): asserts value is PendingRun {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  const data = value as Record<string, unknown>;
  for (const key of ['requestID', 'conversationID']) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || typeof data[key] !== 'string' || !data[key].trim() || new TextEncoder().encode(data[key]).length > 128) invalid();
  }
}
function receipt(value: unknown, states: string[], expected?: PendingRun): PendingRun {
  identity(value);
  const v = value as PendingRun & { schemaVersion: unknown; state: unknown };
  const keys = Reflect.ownKeys(v);
  if (keys.length !== 4 || keys.some(key => !['schemaVersion', 'requestID', 'conversationID', 'state'].includes(String(key)))) invalid();
  if (!Object.getOwnPropertyDescriptor(v, 'schemaVersion')?.hasOwnProperty('value') || !Object.getOwnPropertyDescriptor(v, 'state')?.hasOwnProperty('value')) invalid();
  if (v.schemaVersion !== 1 || typeof v.state !== 'string' || !states.includes(v.state) || (expected && (expected.requestID !== v.requestID || expected.conversationID !== v.conversationID))) invalid();
  return { requestID: v.requestID, conversationID: v.conversationID };
}

/** Host-owned, profile-scoped durability; no browser storage or prompt/credential data. */
export function createDurableRecoveryJournal(bridge: unknown): RecoveryJournal | null {
  if (!bridge || typeof bridge !== 'object' || Array.isArray(bridge)) return null;
  const methods = {} as Record<typeof names[number], (...args: unknown[]) => unknown>;
  try {
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(bridge, name);
      if (typeof descriptor?.value !== 'function') return null;
      methods[name] = descriptor.value;
    }
  } catch { return null; }
  async function call(name: typeof names[number], value?: PendingRun) {
    try { return await methods[name].apply(bridge, value ? [{ requestID: value.requestID, conversationID: value.conversationID }] : []); }
    catch { return invalid(); }
  }
  return Object.freeze({
    authoritative: true,
    async read() {
      const value = await call('getSubmissionRecovery');
      return value === null ? null : receipt(value, ['reserved', 'rejected']);
    },
    async write(value: PendingRun) { identity(value); receipt(await call('reserveSubmissionRecovery', value), ['reserved'], value); },
    async clear(value?: PendingRun) { identity(value); receipt(await call('clearSubmissionRecovery', value), ['cleared'], value); },
  });
}
