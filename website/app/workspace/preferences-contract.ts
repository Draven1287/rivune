export type WorkspacePreferences = {
  stars: boolean;
  galaxy: boolean;
  backgroundDim: number;
  motion: "system" | "reduced";
  textSize: "standard" | "large";
  sendShortcut: "enter" | "mod-enter";
};

export const defaultPreferences: WorkspacePreferences = {
  stars: true, galaxy: true, backgroundDim: 0.35, motion: "system", textSize: "standard", sendShortcut: "enter",
};
export const preferencesStorageKey = "rivune.workspace.preferences.v1";

// Only these non-sensitive presentation choices can be read or written.
export function normalizePreferences(value: unknown): WorkspacePreferences {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    stars: typeof record.stars === "boolean" ? record.stars : defaultPreferences.stars,
    galaxy: typeof record.galaxy === "boolean" ? record.galaxy : defaultPreferences.galaxy,
    backgroundDim: typeof record.backgroundDim === "number" && Number.isFinite(record.backgroundDim) ? Math.max(0.15, Math.min(0.85, record.backgroundDim)) : 0.35,
    motion: record.motion === "reduced" ? "reduced" : "system",
    textSize: record.textSize === "large" ? "large" : "standard",
    sendShortcut: record.sendShortcut === "mod-enter" ? "mod-enter" : "enter",
  };
}

export function parsePreferences(raw: string | null): WorkspacePreferences {
  try { return normalizePreferences(raw ? JSON.parse(raw) : null); }
  catch { return { ...defaultPreferences }; }
}

export function serializePreferences(value: WorkspacePreferences): string {
  return JSON.stringify(normalizePreferences(value));
}

export function shouldSubmitMessage(shortcut: WorkspacePreferences["sendShortcut"], event: {
  key: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean;
}) {
  return event.key === "Enter" && !event.isComposing && !event.shiftKey && !event.altKey
    && (shortcut === "mod-enter" ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey);
}
