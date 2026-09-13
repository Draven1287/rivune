import type { Conversation, ConversationMessage } from './model.js';

/** Commit a user turn only when persistence succeeds. A failed attempt is retryable. */
export function commitMessage(rows: Conversation[], row: Conversation, turn: ConversationMessage, persist: () => boolean): boolean {
  const existed = rows.includes(row);
  const previous = row.messages;
  row.messages = existed ? [...(previous || [{ ...row }]), turn] : [turn];
  if (!existed) rows.unshift(row);
  try { if (persist()) return true; }
  catch { /* Restore the exact local state; the caller keeps the draft. */ }
  if (previous === undefined) delete row.messages;
  else row.messages = previous;
  if (!existed) { const index = rows.indexOf(row); if (index >= 0) rows.splice(index, 1); }
  return false;
}
