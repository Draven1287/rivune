export interface DraftStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}
export interface DraftStore {
  subscribe: (listener: () => void) => () => void;
  getDraft: (conversationId: string) => string;
  setDraft: (conversationId: string, value: string) => void;
  getNotice: () => string | null;
}

const storageNotice = 'Browser draft storage failed. Drafts available in this page remain in memory; reloading may lose unsaved changes.';

/** Shared page-lifetime memory is authoritative after an ID's first read.
 * No effect or getter writes to storage. An unchanged empty fallback therefore
 * cannot erase a saved draft whose initial read failed.
 */
export function createDraftStore(getStorage: () => DraftStorage): DraftStore {
  const drafts = new Map<string, string>();
  const listeners = new Set<() => void>();
  let notice: string | null = null;
  const notify = () => { for (const listener of listeners) listener(); };
  const markStorageFailure = () => {
    if (notice !== null) return false;
    notice = storageNotice;
    return true;
  };

  const getDraft = (conversationId: string): string => {
    if (drafts.has(conversationId)) return drafts.get(conversationId)!;
    let draft = '';
    let noticeChanged = false;
    try {
      const stored = getStorage().getItem(`rivune-draft-${conversationId}`);
      if (stored !== null && typeof stored !== 'string') throw new Error('Invalid draft storage value');
      draft = stored ?? '';
    } catch { noticeChanged = markStorageFailure(); }
    // Cache failures too: a later remount must not replace edits with stale disk
    // content, or repeatedly access inaccessible browser storage.
    drafts.set(conversationId, draft);
    // Snapshot reads can happen during React render. Notify other subscribers
    // after that render instead of updating another component synchronously.
    if (noticeChanged) queueMicrotask(notify);
    return draft;
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getDraft,
    setDraft(conversationId, value) {
      if (getDraft(conversationId) === value) return;
      drafts.set(conversationId, value);
      try { getStorage().setItem(`rivune-draft-${conversationId}`, value); }
      catch { markStorageFailure(); }
      notify();
    },
    getNotice: () => notice,
  };
}

// Access remains lazy, so importing this module does not touch browser storage.
export const browserDraftStore = createDraftStore(() => window.sessionStorage);
