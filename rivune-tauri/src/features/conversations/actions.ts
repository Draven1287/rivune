import { downloadJson } from '../../services/storage/download.js';
import type { Conversation } from './model.js';

let pendingConfirmation: Promise<boolean> | null = null;

/** Confirm removal of a single local chat; closing the dialog always cancels. */
export function confirmDeleteConversation(title: string): Promise<boolean> {
  if (pendingConfirmation) return Promise.resolve(false);
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  pendingConfirmation = new Promise<boolean>(resolve => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'delete-conversation-title');
    dialog.setAttribute('aria-describedby', 'delete-conversation-description');
    const heading = document.createElement('h2');
    heading.id = 'delete-conversation-title';
    heading.textContent = 'Delete this chat?';
    const description = document.createElement('p');
    description.id = 'delete-conversation-description';
    const shortened = title.trim().slice(0, 160);
    description.textContent = `“${shortened}${title.trim().length > 160 ? '…' : ''}” will be deleted from this device. This cannot be undone.`;
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Keep chat';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete chat';
    let settled = false;
    const finish = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      dialog.close();
      dialog.remove();
      pendingConfirmation = null;
      previousFocus?.focus();
      resolve(confirmed);
    };
    cancel.addEventListener('click', () => finish(false));
    remove.addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
    dialog.addEventListener('close', () => finish(false));
    dialog.append(heading, description, cancel, remove);
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus();
  });
  return pendingConfirmation;
}

/** Download an explicit local export. This never contacts a provider. */
export function downloadConversation(row: Conversation): void {
  const exportData = { format: 'rivune-conversation', version: 1, exportedAt: new Date().toISOString(), conversation: row };
  const title = row.prompt.slice(0, 48).replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'chat';
  downloadJson(exportData, `rivune-${title}.json`);
}
