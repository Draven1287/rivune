/** Local draft recovery and conflict detection; no storage side effects. */
export function parseDrafts(raw: string | null): Record<string, string> {
  try {
    const value: unknown = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length <= 12000)
      .slice(0, 200));
  } catch { return {}; }
}

export type DraftMerge = { ok: true; raw: string; value: string } | { ok: false };

/** Merge one edited draft into the latest snapshot without overwriting other keys. */
export function mergeDraft(currentRaw: string | null, key: string, localValue: string, baselineValue: string | undefined): DraftMerge {
  if (typeof localValue !== 'string' || localValue.length > 12000) return { ok: false };
  const current = parseDrafts(currentRaw);
  const stored = Object.hasOwn(current, key) ? current[key] : '';
  const baseline = baselineValue ?? '';
  if (stored !== baseline && localValue !== baseline && localValue !== stored) return { ok: false };
  const value = localValue === baseline ? stored : localValue;
  const entries = Object.entries(current).filter(([entryKey]) => entryKey !== key);
  if (value) entries.push([key, value]);
  if (entries.length > 200) return { ok: false };
  return { ok: true, raw: JSON.stringify(Object.fromEntries(entries)), value };
}
