import type { Agent, EnvironmentVariable, TerminalSession, WorkspaceFile } from '../../types';

export interface SidebarProps {
  files: WorkspaceFile[];
  agents: Agent[];
  terminals: TerminalSession[];
  environment: EnvironmentVariable[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onNewConversation?: () => void;
  onSettings?: () => void;
  conversationTitle?: string;
  conversations?: { id: string; title: string }[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

const statusColors: Record<Agent['status'], string> = {
  idle: 'bg-zinc-500', working: 'bg-emerald-400', waiting: 'bg-amber-400',
  done: 'bg-sky-400', failed: 'bg-rose-400', cancelled: 'bg-zinc-400',
};

export function Sidebar({ files, agents, terminals, environment, activeFileId, onSelectFile, onNewConversation, onSettings, conversationTitle = 'Design a dependable workspace', conversations, activeConversationId, onSelectConversation }: SidebarProps) {
  const groups = new Map<string, WorkspaceFile[]>();
  for (const file of files) {
    const directory = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : 'Project root';
    groups.set(directory, [...(groups.get(directory) ?? []), file]);
  }
  return (
    <aside aria-label="Workspace navigation" className="flex h-full min-h-0 flex-col bg-zinc-950/70 text-zinc-200">
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-gradient-to-br from-white/20 to-white/5 text-xl font-semibold text-zinc-100">R</span>
          <span className="text-base font-semibold tracking-tight">Rivune</span>
          <span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">PREVIEW</span>
        </div>
        <button type="button" onClick={onNewConversation} disabled={!onNewConversation} className="mt-6 flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none">
          <span aria-hidden="true" className="text-lg leading-none text-zinc-300">+</span>
          New conversation
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
        <nav aria-label="Projects and conversations" className="pb-5 pt-2">
          <p className="px-2 text-xs font-medium text-zinc-400">Projects</p>
          <details open className="mt-3">
            <summary className="min-h-9 cursor-pointer rounded-md px-2 py-2 text-sm font-medium text-zinc-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">Rivune workspace</summary>
            <div className="ml-3 mt-1 space-y-1">
              {(conversations ?? [{ id: 'current', title: conversationTitle }]).map(conversation => {
                const selected = conversations ? conversation.id === activeConversationId : true;
                return <button key={conversation.id} type="button" onClick={() => onSelectConversation?.(conversation.id)} disabled={!onSelectConversation} aria-current={selected ? 'page' : undefined} className={`flex min-h-10 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${selected ? 'border-white/10 bg-white/[0.08] text-zinc-100' : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-zinc-400"><path d="M16 12.5a2 2 0 0 1-2 2H8l-4 3v-3.2a2 2 0 0 1-1-1.8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v7.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                  <span className="truncate" title={conversation.title}>{conversation.title}</span>
                </button>;
              })}
            </div>
          </details>
          <p className="ml-5 mt-2 text-[11px] leading-relaxed text-zinc-500">Synthetic project · local preview</p>
        </nav>
        <details className="border-t border-white/10 py-4">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-300">Project files <span className="ml-1 font-normal text-zinc-500">{files.length}</span></summary>
          <nav aria-label="Project files" className="mt-3 space-y-2">
            {[...groups].map(([directory, children]) => <div key={directory}>
              <p className="truncate px-2 py-1 font-mono text-[11px] text-zinc-500" title={directory}>{directory}</p>
              {children.map(file => <button key={file.id} type="button" onClick={() => onSelectFile(file.id)} aria-current={activeFileId === file.id ? 'page' : undefined} title={file.path} className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${activeFileId === file.id ? 'border-white/10 bg-white/10 text-white' : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
                <span aria-hidden="true" className="font-mono text-sky-300">{file.language === 'typescript' || file.name.endsWith('.tsx') ? 'TS' : '◇'}</span><span className="truncate">{file.name}</span>
              </button>)}
            </div>)}
            {files.length === 0 && <p className="px-2 text-xs text-zinc-500">No files in this preview.</p>}
          </nav>
        </details>
        <details className="border-t border-white/10 py-4">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-300">Constellation <span className="ml-1 font-normal text-zinc-500">Demo agents</span></summary>
          <ul className="mt-3 space-y-3">{agents.map(agent => <li key={agent.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="flex items-center gap-2"><span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColors[agent.status]}`} /><span className="min-w-0 flex-1 truncate text-xs font-medium">{agent.name}</span><span className="text-[10px] text-zinc-500">{agent.role}</span></div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">{agent.status} · {agent.phase}</p>
          </li>)}</ul>
        </details>
        <details className="border-t border-white/10 py-4">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-300">Terminal sessions</summary>
          <ul className="mt-3 space-y-2">{terminals.map(terminal => <li key={terminal.id} className="flex items-start gap-2 px-2 text-xs"><span aria-hidden="true" className="font-mono text-zinc-500">›_</span><div className="min-w-0"><p className="truncate text-zinc-300">{terminal.title}</p><p className="mt-0.5 text-[10px] text-zinc-500">{terminal.status} · demo output</p></div></li>)}</ul>
          {terminals.length === 0 && <p className="mt-2 text-xs text-zinc-500">No demo sessions.</p>}
        </details>
        <details className="border-t border-white/10 py-4">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-300">Environment</summary>
          <p className="mt-2 text-[11px] text-zinc-500">Synthetic values · always masked</p>
          <dl className="mt-3 space-y-3">{environment.map(variable => <div key={variable.name} className="px-2"><dt className="break-all font-mono text-[11px] text-zinc-400">{variable.name}</dt><dd className="mt-1 font-mono text-xs tracking-widest text-zinc-500" aria-label="Masked synthetic value">••••••••</dd></div>)}</dl>
        </details>
      </div>
      <div className="shrink-0 border-t border-white/10 p-3">
        <button type="button" onClick={onSettings} disabled={!onSettings} className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M7 3v4m6 1v4m-5 1v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
