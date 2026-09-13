import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import type { Agent, Artifact, ChatMessage, SlashCommand } from '../../types';
import { browserDraftStore } from '../../hooks/draftStore';
import { SlashCommandMenu, filterSlashCommands } from './SlashCommandMenu';

const scrollPositions = new Map<string, { top: number; follow: boolean }>();

export function ChatPanel({ messages, agents, commands, isStreaming, onSend, onStop, onOpenArtifact, onOpenFiles, artifacts, conversationId, title }: { messages: ChatMessage[]; agents: Agent[]; commands: SlashCommand[]; isStreaming: boolean; onSend: (text: string) => void; onStop: () => void; onOpenArtifact: (id: string) => void; onOpenFiles: () => void; artifacts: Artifact[]; conversationId: string; title: string }) {
  const draft = useSyncExternalStore(browserDraftStore.subscribe, () => browserDraftStore.getDraft(conversationId));
  const setDraft = (value: string) => browserDraftStore.setDraft(conversationId, value);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);
  const [follow, setFollow] = useState(true);
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const menuOpen = draft.startsWith('/') && !/\s/.test(draft) && !menuDismissed;
  const filtered = filterSlashCommands(commands, draft);
  const safeIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));
  useEffect(() => {
    const saved = scrollPositions.get(conversationId);
    if (saved && scroll.current) { scroll.current.scrollTop = saved.top; nearBottom.current = saved.follow; setFollow(saved.follow); }
  }, [conversationId]);
  useEffect(() => {
    if (nearBottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages]);
  function pick(command: SlashCommand) { setDraft(command.insertText); setMenuDismissed(true); input.current?.focus(); }
  function send() {
    if (!draft.trim() || isStreaming) return;
    onSend(draft.trim()); setDraft(''); setMenuDismissed(false); nearBottom.current = true; setFollow(true);
  }
  function keyboard(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (menuOpen) {
      if (event.key === 'Escape') { event.preventDefault(); setMenuDismissed(true); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (filtered.length) setActiveIndex((safeIndex + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length); return; }
      if (event.key === 'Enter') { event.preventDefault(); if (filtered.length) pick(filtered[safeIndex]); return; }
    }
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
  }
  return <div className="chat-panel flex flex-col h-full min-h-0">
    <header className="panel-heading"><div><span className="eyebrow">RIVUNE / CONVERSATION</span><h1>{title}</h1></div><button className="artifact-toggle" onClick={onOpenFiles}>Files & artifacts ↗</button></header>
    <div className="conversation-scroll" ref={scroll} onScroll={() => { const e = scroll.current; if (e) { nearBottom.current = e.scrollHeight - e.scrollTop - e.clientHeight < 60; setFollow(nearBottom.current); scrollPositions.set(conversationId, { top: e.scrollTop, follow: nearBottom.current }); } }}>
      <div className="session-context"><span aria-hidden="true">✧</span><span>Constellation · lead + 2 members</span><span className="quiet-badge">Demo</span></div>{messages.length === 0 && <div className="conversation-welcome"><span aria-hidden="true">✧</span><h2>What are we working on?</h2><p>Bring a question, an idea, or a demanding task.<br/>A little space for different perspectives.</p></div>}
      {messages.map(message => <article key={message.id} className={`message message-${message.role}`}>
        <div className="message-author"><span className={`avatar avatar-${message.role}`}>{message.role === 'user' ? 'Y' : message.role === 'system' ? '·' : 'R'}</span><strong>{message.role === 'user' ? 'You' : message.role === 'system' ? 'Workspace' : agents.find(a => a.id === message.agentId)?.name || 'Rivune'}</strong>{message.role === 'assistant' && <span className="message-role">AI team · demo</span>}{message.streaming && <span className="stream-badge">Streaming demo</span>}</div>
        <div className="message-content">{message.content.split(/(```[\s\S]*?```)/g).map((part, index) => part.startsWith('```') ? <pre key={index}><code>{part.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')}</code></pre> : <p key={index}>{part}</p>)}{message.streaming && <span className="stream-cursor" aria-hidden="true" />}</div>{message.role === 'assistant' && !message.streaming && message.artifactId && artifacts.some(a => a.id === message.artifactId) && <button className="result-card" onClick={() => onOpenArtifact(message.artifactId!)}><span aria-hidden="true">◇</span><span><strong>{artifacts.find(a => a.id === message.artifactId)?.title}</strong><small>Sample result · view file and diff</small></span><span aria-hidden="true">↗</span></button>}
      </article>)}
      {isStreaming && <div className="stream-skeleton" aria-hidden="true"><span/><span/></div>}
    </div>
    {!follow && <button className="latest-button" onClick={() => { nearBottom.current = true; setFollow(true); if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }}>↓ Latest message</button>}
    <form className="composer-wrap" onSubmit={e => { e.preventDefault(); send(); }}>
      <div className="composer">
        {menuOpen && <SlashCommandMenu commands={commands} query={draft} activeIndex={safeIndex} onActiveIndexChange={setActiveIndex} onSelect={pick} onClose={() => setMenuDismissed(true)} />}
        <label className="sr-only" htmlFor="workspace-message">Message the demo team</label>
        <textarea id="workspace-message" ref={input} value={draft} onChange={e => { setDraft(e.target.value); setMenuDismissed(false); setActiveIndex(0); }} onKeyDown={keyboard} placeholder="Ask, explore, or build something…" rows={3} aria-controls={menuOpen ? 'slash-command-menu' : undefined} aria-expanded={menuOpen} aria-haspopup="listbox" aria-activedescendant={menuOpen && filtered[safeIndex] ? `slash-command-option-${filtered[safeIndex].id}` : undefined}/>
        <div className="composer-actions"><button type="button" className="command-trigger" disabled={Boolean(draft.trim())} title={draft.trim() ? 'Keep your draft. Clear it to browse slash commands.' : 'Browse slash commands'} aria-label="Show slash commands" onClick={() => { setDraft('/'); setMenuDismissed(false); setActiveIndex(0); input.current?.focus(); }}>/ <span>Commands</span></button><span className="composer-mode">Lead + members</span>{isStreaming ? <button type="button" className="send-button stop-button" onClick={() => { onStop(); input.current?.focus(); }}>■ <span>Stop demo</span></button> : <button type="submit" className="send-button" disabled={!draft.trim()} aria-label="Send demo message">↑</button>}</div>
      </div>
      <div className="composer-note"><span>Local simulation · no AI connected</span><span>↵ Send <i>·</i> ⇧↵ New line</span></div>
      <span className="sr-only" role="status">{isStreaming ? 'Demo response streaming' : 'Demo ready'}</span>
    </form>
  </div>;
}
