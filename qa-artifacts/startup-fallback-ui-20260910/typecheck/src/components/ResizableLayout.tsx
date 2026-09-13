import { useRef, useState, type CSSProperties, type ReactNode, type PointerEvent, type KeyboardEvent } from 'react';

type Layout = { sidebar: number; chat: number };
const defaults: Layout = { sidebar: 224, chat: 47 };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
function readLayout(): Layout {
  try {
    const saved = JSON.parse(localStorage.getItem('rivune-demo-layout-v1') || 'null');
    return { sidebar: clamp(Number(saved?.sidebar) || defaults.sidebar, 184, 300), chat: clamp(Number(saved?.chat) || defaults.chat, 35, 62) };
  } catch { return defaults; }
}
export function ResizableLayout({ sidebar, chat, editor, shelf, mobilePanel, editorOpen }: { sidebar: ReactNode; chat: ReactNode; editor: ReactNode; shelf: ReactNode; mobilePanel: 'chat' | 'editor' | 'context'; editorOpen: boolean }) {
  const [layout, setLayout] = useState(readLayout);
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: keyof Layout; x: number; initial: number; span: number } | null>(null);
  function save(next: Layout) { setLayout(next); try { localStorage.setItem('rivune-demo-layout-v1', JSON.stringify(next)); } catch { /* Layout still works without storage. */ } }
  function start(event: PointerEvent<HTMLDivElement>, kind: keyof Layout) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { kind, x: event.clientX, initial: layout[kind], span: Math.max(1, (root.current?.clientWidth || 1200) - layout.sidebar - 12) };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current; if (!d) return;
    const delta = event.clientX - d.x;
    save({ ...layout, [d.kind]: d.kind === 'sidebar' ? clamp(d.initial + delta, 184, 300) : clamp(d.initial + delta / d.span * 100, 35, 62) });
  }
  function keys(event: KeyboardEvent<HTMLDivElement>, kind: keyof Layout) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const min = kind === 'sidebar' ? 184 : 35, max = kind === 'sidebar' ? 300 : 62;
    const step = kind === 'sidebar' ? 12 : 2;
    const value = event.key === 'Home' ? min : event.key === 'End' ? max : clamp(layout[kind] + (event.key === 'ArrowRight' ? step : -step), min, max);
    save({ ...layout, [kind]: value });
  }
  function separator(kind: keyof Layout, label: string) {
    return <div className="resize-handle" role="separator" aria-orientation="vertical" aria-label={label} tabIndex={0} aria-valuemin={kind === 'sidebar' ? 184 : 35} aria-valuemax={kind === 'sidebar' ? 300 : 62} aria-valuenow={Math.round(layout[kind])} aria-valuetext={kind === 'sidebar' ? `${Math.round(layout.sidebar)} pixels` : `${Math.round(layout.chat)} percent`} onPointerDown={e => start(e, kind)} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={e => keys(e, kind)}><span /></div>;
  }
  return <div className={`workspace-layout mobile-view-${mobilePanel}`} ref={root} style={{ '--sidebar-width': `${layout.sidebar}px`, '--chat-width': `${layout.chat}%` } as CSSProperties}>
    <aside className="workspace-sidebar" aria-label="Project context">{sidebar}</aside>
    {separator('sidebar', 'Resize project sidebar')}
    <main className="workbench min-w-0 min-h-0 flex flex-col">
      <div className={`workspace-panels mobile-${mobilePanel} ${editorOpen ? 'has-editor' : 'chat-only'}`}>
        <section className="chat-region min-w-0 min-h-0" aria-label="Conversation">{chat}</section>
        {editorOpen && separator('chat', 'Resize conversation and editor')}
        <section hidden={!editorOpen} className="editor-region min-w-0 min-h-0" aria-label="Editor and artifacts">{editor}</section>
      </div>
      {shelf}
    </main>
  </div>;
}
