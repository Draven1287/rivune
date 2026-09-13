import { useMemo, useState } from 'react';
import type { Artifact } from '../../types';

interface CanvasConfig { schemaVersion: 1; title: string; body: string; accent: 'emerald' | 'blue' | 'violet'; layout: 'split' | 'stacked' }
function parseCanvas(content: string): CanvasConfig {
  if (content.length > 4096) throw new Error('Preview configuration must be 4,096 characters or fewer.');
  let value: unknown;
  try { value = JSON.parse(content); } catch { throw new Error('This canvas uses JSON configuration. Fix the JSON in Source to update the preview.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Preview configuration must be a JSON object.');
  const config = value as Record<string, unknown>;
  if (Object.keys(config).sort().join(',') !== 'accent,body,layout,schemaVersion,title' || config.schemaVersion !== 1) throw new Error('Supported fields: schemaVersion (1), title, body, accent, and layout. HTML, scripts, and other formats are not rendered.');
  if (typeof config.title !== 'string' || !config.title.trim() || config.title.length > 120) throw new Error('Use a title between 1 and 120 characters.');
  if (typeof config.body !== 'string' || !config.body.trim() || config.body.length > 600) throw new Error('Use body text between 1 and 600 characters.');
  if (typeof config.accent !== 'string' || !['emerald', 'blue', 'violet'].includes(config.accent) || typeof config.layout !== 'string' || !['split', 'stacked'].includes(config.layout)) throw new Error('Accent must be emerald, blue, or violet. Layout must be split or stacked.');
  return config as unknown as CanvasConfig;
}
const accents = {
  emerald: { text: 'text-emerald-700', surface: 'bg-emerald-100', button: 'bg-emerald-800' },
  blue: { text: 'text-blue-700', surface: 'bg-blue-100', button: 'bg-blue-800' },
  violet: { text: 'text-violet-700', surface: 'bg-violet-100', button: 'bg-violet-800' },
};

/** Constrained JSON drives authored React markup. No artifact code is executed. */
export function ArtifactPreview({ artifact, content }: { artifact?: Artifact; content?: string }) {
  const [compact, setCompact] = useState(false), [expanded, setExpanded] = useState(false);
  const source = content ?? artifact?.content ?? '';
  const parsed = useMemo(() => {
    try { return { config: parseCanvas(source), error: null }; }
    catch (error) { return { config: null, error: error instanceof Error ? error.message : 'Preview configuration is invalid.' }; }
  }, [source]);
  if (!artifact) return <div className="p-6 text-sm text-zinc-400">No artifact is linked to this file. Select a file with an artifact to inspect its demo output.</div>;
  if (artifact.kind !== 'web') return <div className="min-h-0 flex-1 overflow-auto p-5"><p className="mb-4 text-xs text-zinc-500">Demo artifact · text only</p><pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-zinc-300">{source}</pre></div>;
  const config = parsed.config, accent = config ? accents[config.accent] : accents.emerald;
  return <section className="flex min-h-0 flex-1 flex-col" aria-label="Constrained demo web canvas">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-5 py-3">
      <span className="text-xs text-zinc-400">Live demo canvas · validated JSON only</span>
      <div className="flex gap-1" role="group" aria-label="Canvas width">
        {[false, true].map(value => <button key={String(value)} type="button" aria-pressed={compact === value} onClick={() => setCompact(value)} className={`rounded px-3 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${compact === value ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}>{value ? 'Compact' : 'Wide'}</button>)}
      </div>
    </div>
    <div className="min-h-0 flex-1 overflow-auto bg-[#101216] p-5">
      {!config ? <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-5" role="status"><h3 className="text-sm font-medium text-amber-200">Preview needs valid configuration</h3><p className="mt-2 text-xs leading-6 text-zinc-400">{parsed.error}</p><p className="mt-3 text-xs text-zinc-500">Your source edits are retained. Nothing is executed.</p></div>
        : <div className={`mx-auto overflow-hidden rounded-xl border border-white/10 bg-[#f4f3ee] text-zinc-900 ${compact ? 'max-w-[320px]' : 'max-w-3xl'}`}>
          <div className="flex items-center justify-between border-b border-zinc-900/10 px-6 py-4"><span className="text-sm font-semibold tracking-tight">Northstar</span><span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Demo concept</span></div>
          <div className={`gap-5 p-7 ${config.layout === 'split' && !compact ? 'grid grid-cols-2 items-center' : 'flex flex-col'}`}>
            <div className="min-w-0 py-5"><span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${accent.text}`}>A little room to think</span><h3 className="mt-5 whitespace-pre-wrap break-words text-3xl font-medium leading-[1.15] tracking-tight">{config.title}</h3><p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-600">{config.body}</p><button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className={`mt-7 rounded-full px-5 py-3 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${accent.button}`}>{expanded ? 'Hide details' : 'Explore the concept'} <span aria-hidden="true">↗</span></button>{expanded && <p className="mt-4 text-xs leading-6 text-zinc-600">This demo interaction runs locally. Change the title, body, accent, or layout in Source to update this canvas.</p>}</div>
            <div className={`w-full min-w-0 rounded-xl p-5 ${accent.surface}`}><div className="rounded-lg bg-white/80 p-5"><div className="mb-5 flex gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-zinc-300" /><span className="h-2 w-2 rounded-full bg-zinc-300" /><span className="h-2 w-2 rounded-full bg-zinc-300" /></div><p className="text-xs font-medium">A place for your next step</p><p className="mt-3 text-xs leading-6 text-zinc-500">One idea. A clear starting point. Room to make it your own.</p></div></div>
          </div>
        </div>}
      <p className="mx-auto mt-4 max-w-lg text-center text-[11px] leading-5 text-zinc-500">{artifact.title} · Source configuration updates this authored canvas. No HTML, JavaScript, network, or host commands are executed.</p>
    </div>
  </section>;
}
