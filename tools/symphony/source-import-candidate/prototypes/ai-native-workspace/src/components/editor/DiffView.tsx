import { useMemo } from 'react';

type Line = { kind: 'same' | 'add' | 'remove'; text: string; before?: number; after?: number };
const LIMIT = 400;
const linesOf = (text: string) => text.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g)?.filter((line, i, all) => line !== '' || i < all.length - 1) ?? [];

function compare(before: string, after: string): Line[] | null {
  if (before.length + after.length > 128 * 1024) return null;
  const a = linesOf(before), b = linesOf(after);
  if (a.length > LIMIT || b.length > LIMIT) return null;
  const grid = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) grid[i][j] = a[i] === b[j] ? 1 + grid[i + 1][j + 1] : Math.max(grid[i + 1][j], grid[i][j + 1]);
  const rows: Line[] = []; let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { rows.push({ kind: 'same', text: a[i], before: ++i, after: ++j }); }
    else if (i < a.length && (j === b.length || grid[i + 1][j] >= grid[i][j + 1])) { rows.push({ kind: 'remove', text: a[i], before: ++i }); }
    else { rows.push({ kind: 'add', text: b[j], after: ++j }); }
  }
  return rows;
}

export function DiffView({ originalContent, content, name }: { originalContent?: string; content: string; name: string }) {
  const rows = useMemo(() => compare(originalContent ?? '', content), [originalContent, content]);
  const added = rows?.filter(row => row.kind === 'add').length ?? 0;
  const removed = rows?.filter(row => row.kind === 'remove').length ?? 0;
  return <section className="flex min-h-0 flex-1 flex-col" aria-label={`Changes to ${name}`}>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/5 px-5 py-3 text-xs text-zinc-400">
      <span>{originalContent === undefined ? 'New file · no original' : originalContent === '' ? 'Original file is empty' : 'Original → local demo draft'}</span>
      {rows && <><span className="text-emerald-300">+{added} added</span><span className="text-rose-300">−{removed} removed</span></>}
    </div>
    {rows === null ? <p className="p-5 text-sm text-zinc-400">This diff exceeds the demo’s 400-line or 128K-character comparison limit. Open Source to inspect the full file.</p>
      : rows.length === 0 ? <p className="p-5 text-sm text-zinc-400">{originalContent === undefined ? 'New empty file.' : 'Both versions are empty. No text changes.'}</p>
      : <div className="min-h-0 flex-1 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400" tabIndex={0} aria-label="Scrollable line diff">
        <table className="w-full border-collapse font-mono text-xs leading-6" aria-label="Line changes">
          <thead className="sr-only"><tr><th>Original line</th><th>New line</th><th>Change</th><th>Content</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index} className={row.kind === 'add' ? 'bg-emerald-400/10 text-emerald-100' : row.kind === 'remove' ? 'bg-rose-400/10 text-rose-100' : 'text-zinc-400'}>
            <td className="w-10 select-none px-2 text-right text-zinc-500">{row.before}</td><td className="w-10 select-none px-2 text-right text-zinc-500">{row.after}</td>
            <td className="w-7 px-2" aria-label={row.kind === 'add' ? 'Added' : row.kind === 'remove' ? 'Removed' : 'Unchanged'}>{row.kind === 'add' ? '+' : row.kind === 'remove' ? '−' : ' '}</td>
            <td className="whitespace-pre pr-6"><code>{row.text.replace(/[\r\n]+$/, '')}</code>{!/[\r\n]$/.test(row.text) && <span className="ml-4 text-[10px] text-zinc-500">↵ No final line ending</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
  </section>;
}
