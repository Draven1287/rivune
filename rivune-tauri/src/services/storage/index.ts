/** Preserve synchronous errors: callers own recovery and session-only fallback. */
export interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function createStorage(resolve: () => KeyValueStorage): KeyValueStorage {
  return { getItem: key => resolve().getItem(key), setItem: (key, value) => resolve().setItem(key, value), removeItem: key => resolve().removeItem(key) };
}
export const storage = createStorage(() => globalThis.localStorage);
