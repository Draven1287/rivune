"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parsePreferences, preferencesStorageKey, serializePreferences, type WorkspacePreferences } from "./preferences-contract";

const listeners = new Set<() => void>();
let temporaryPreferences: string | null = null;
let storageFailed = false;
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const storage = (event: StorageEvent) => { if (event.key === preferencesStorageKey || event.key === null) listener(); };
  window.addEventListener("storage", storage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", storage); };
};
const read = () => {
  if (temporaryPreferences !== null) return temporaryPreferences;
  try { return window.localStorage.getItem(preferencesStorageKey); }
  catch { storageFailed = true; return null; }
};
const serverValue = () => null;

export function useWorkspacePreferences() {
  const raw = useSyncExternalStore(subscribe, read, serverValue);
  const preferences = useMemo(() => parsePreferences(raw), [raw]);
  const updatePreferences = (patch: Partial<WorkspacePreferences>) => {
    const next = serializePreferences({ ...parsePreferences(read()), ...patch });
    try { window.localStorage.setItem(preferencesStorageKey, next); temporaryPreferences = null; storageFailed = false; }
    catch { temporaryPreferences = next; storageFailed = true; }
    emit();
  };
  return { preferences, updatePreferences, storageFailed };
}
