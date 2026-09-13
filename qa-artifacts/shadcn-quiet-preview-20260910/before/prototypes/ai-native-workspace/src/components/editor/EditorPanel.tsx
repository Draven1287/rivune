import { useId, useRef, useState } from 'react';
import type { Artifact, WorkspaceFile } from '../../types';
import { ArtifactPreview } from './ArtifactPreview';
import { DiffView } from './DiffView';

type View = 'source' | 'diff' | 'preview';
interface Props { files: WorkspaceFile[]; artifacts: Artifact[]; activeFileId: string; onSelectFile(id: string): void }
export function EditorPanel({ files, artifacts, activeFileId, onSelectFile }: Props) {
  const [view, setView] = useState<View>('source');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const id = useId(), gutter = useRef<HTMLPreElement>(null);
  const file = files.find(item => item.id === activeFileId);
  const content = file ? drafts[file.id] ?? file.content : '';
  const dirty = Boolean(file && drafts[file.id] !== undefined && drafts[file.id] !== file.content);
  const artifact = artifacts.find(item => item.fileId === file?.id);
  const views: View[] = ['source', 'diff', 'preview'];
  return <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#15181d]" aria-label="Editor and artifacts">
    <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Workspace</span><span className="text-[10px] text-zinc-500">Local demo</span></div>
    <div className="flex shrink-0 overflow-x-auto border-b border-white/5" role="group" aria-label="Open files">{files.map(item => <button type="button" key={item.id} aria-pressed={item.id === activeFileId} onClick={() => onSelectFile(item.id)} className={`shrink-0 border-r border-white/5 px-4 py-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${item.id === activeFileId ? 'bg-white/5 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}><span className="mr-2 text-emerald-400/80" aria-hidden="true">{item.language === 'typescript' ? 'TS' : '◇'}</span>{item.name}{drafts[item.id] !== undefined && drafts[item.id] !== item.content && <span aria-label="Unsaved demo changes" className="ml-2 text-amber-300">●</span>}</button>)}</div>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-2">
      <div role="tablist" aria-label="Editor view" className="flex gap-1">{views.map((tab, index) => <button key={tab} type="button" role="tab" id={`${id}-${tab}`} aria-controls={`${id}-panel`} aria-selected={view === tab} tabIndex={view === tab ? 0 : -1} onClick={() => setView(tab)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length;
        setView(views[next]); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
      }} className={`rounded px-3 py-1.5 text-xs capitalize outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${view === tab ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}>{tab}</button>)}</div>
      {dirty && <button type="button" onClick={() => file && setDrafts(current => { const next = { ...current }; delete next[file.id]; return next; })} className="rounded px-2 py-1 text-xs text-zinc-400 outline-none hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-emerald-400">Discard demo edits</button>}
    </div>
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${view}`} className="flex min-h-0 min-w-0 flex-1 flex-col">
      {!file ? <p className="p-6 text-sm text-zinc-400">Select a file to begin.</p> : view === 'diff' ? <DiffView name={file.name} originalContent={file.originalContent} content={content} /> : view === 'preview' ? <ArtifactPreview artifact={artifact} content={content} /> : <>
        <div className="truncate border-b border-white/5 px-5 py-3 font-mono text-[11px] text-zinc-500" title={file.path}>{file.path}</div>
        <div className="relative flex min-h-0 flex-1 overflow-hidden py-4">
          <pre ref={gutter} aria-hidden="true" className="m-0 w-12 shrink-0 select-none overflow-hidden pr-3 text-right font-mono text-xs leading-6 text-zinc-600">{content.split('\n').map((_, index) => index + 1).join('\n')}</pre>
          <textarea key={file.id} aria-label={`${file.name} source, local demo edits`} value={content} onChange={event => setDrafts(current => ({ ...current, [file.id]: event.target.value }))} onScroll={event => { if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop; }} spellCheck={false} wrap="off" className="h-full min-h-0 min-w-0 w-full flex-1 resize-none overflow-auto border-0 bg-transparent pr-6 font-mono text-xs leading-6 text-zinc-300 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-emerald-400/60" />
        </div>
      </>}
    </div>
    <div className="flex shrink-0 justify-between gap-3 border-t border-white/5 px-4 py-2 text-[10px] text-zinc-500"><span>{dirty ? 'Unsaved demo edits · never written to disk' : 'Demo content · no filesystem access'}</span><span className="font-mono">{file?.language ?? '—'}</span></div>
  </section>;
}
