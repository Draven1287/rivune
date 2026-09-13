import { useRef, useState, useSyncExternalStore } from 'react';
import { ArrowUp, ArrowUpRight, ChevronDown, FileText, MessageSquare, PanelLeft, Plus, Search, Settings2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { browserDraftStore } from '../hooks/draftStore';
import { useWorkspaceDemo } from '../hooks/useWorkspaceDemo';
import mark from '../assets/rivune-icon-128.png';
import './browser-workspace.css';

/** Browser-only presentation adapter. Existing preview history and drafts retain
 * their keys; desktop data and provider execution never enter this surface. */
export function BrowserWorkspace() {
  const workspace = useWorkspaceDemo();
  const draft = useSyncExternalStore(browserDraftStore.subscribe, () => browserDraftStore.getDraft(workspace.activeConversationId));
  const notice = useSyncExternalStore(browserDraftStore.subscribe, browserDraftStore.getNotice);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [navigation, setNavigation] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const connections = useRef<HTMLDialogElement>(null);
  const results = useRef<HTMLDialogElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const title = workspace.conversations.find(c => c.id === workspace.activeConversationId)?.title ?? 'New conversation';
  const conversations = workspace.conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
  const messages = workspace.messages.filter(message => message.role !== 'system');
  const artifacts = workspace.artifacts.filter(artifact => messages.some(message => message.artifactId === artifact.id));
  const result = artifacts.find(artifact => artifact.id === selectedResult);
  function focusComposer() { requestAnimationFrame(() => composer.current?.focus()); }
  function selectConversation(id: string) { workspace.selectConversation(id); setSelectedResult(null); setNavigation(false); focusComposer(); }
  function newConversation() { workspace.newConversation(); setSelectedResult(null); setNavigation(false); focusComposer(); }
  function openResults(id: string | null = null) { setSelectedResult(id); setCopyStatus(''); results.current?.showModal(); }
  return <div className={`browser-workspace ${navigation ? 'navigation-open' : ''}`}>
    <aside className="bw-sidebar" aria-label="Conversations">
      <a className="bw-brand" href="#conversation"><img src={mark} alt=""/><span>Rivune</span></a>
      <Button variant="outline" className="bw-new" onClick={newConversation}><Plus size={17}/>New conversation</Button>
      <label className="bw-search"><Search size={15}/><input aria-label="Search conversations" placeholder="Search conversations" value={search} onChange={event => setSearch(event.target.value)}/></label>
      <div className="bw-list-heading">RECENT CONVERSATIONS</div>
      <nav className="bw-history">{(showAll || search ? conversations : conversations.slice(0, 7)).map(conversation => <button key={conversation.id} title={conversation.title} aria-current={conversation.id === workspace.activeConversationId ? 'page' : undefined} onClick={() => selectConversation(conversation.id)}><MessageSquare size={15}/><span>{conversation.title}</span></button>)}{conversations.length === 0 && <p>No conversations found.</p>}{!search && conversations.length > 7 && <button onClick={() => setShowAll(!showAll)}>{showAll ? 'Show recent' : 'Show all conversations'}</button>}</nav>
      <footer><button onClick={() => connections.current?.showModal()}><Settings2 size={17}/>Connections<ArrowUpRight size={14}/></button><div className="bw-local"><span className="bw-local-avatar">R</span><span>Personal workspace<small>Browser preview</small></span></div></footer>
    </aside>
    <main id="conversation" className="bw-main">
      <header className="bw-header"><Button variant="ghost" size="icon" className="bw-menu" aria-label="Toggle conversations" aria-expanded={navigation} onClick={() => setNavigation(!navigation)}><PanelLeft size={18}/></Button><h1>{title}</h1><Button variant="ghost" className="bw-results-trigger" onClick={() => openResults()}><FileText size={16}/>Results<span>{artifacts.length}</span></Button></header>
      <div className="bw-preview-note">Sample workspace <span>·</span> No AI connected</div>
      {(notice || workspace.persistenceNotice) && <p className="bw-storage" role="status">{[notice, workspace.persistenceNotice].filter(Boolean).join(' ')}</p>}
      <section key={workspace.activeConversationId} className="bw-transcript" aria-label="Conversation">
        {messages.length === 0 ? <div className="bw-welcome"><span className="bw-welcome-label">A LITTLE SPACE TO THINK</span><h2>What’s on your mind?</h2><p>Start with a question. Make room for a different perspective.</p></div> : <div className="bw-messages">{messages.map(message => <article key={message.id} className={`bw-message bw-${message.role}`}><div className="bw-author">{message.role === 'user' ? 'You' : 'Rivune'}{message.role === 'assistant' && <span>Sample answer</span>}</div><div className="bw-message-body">{message.content}</div>{message.artifactId && artifacts.some(a => a.id === message.artifactId) && <><button className="bw-result-card" onClick={() => openResults(message.artifactId)}><FileText size={20}/><span><strong>{artifacts.find(a => a.id === message.artifactId)?.title}</strong><small>Sample result · open to inspect</small></span><ArrowUpRight size={17}/></button><details className="bw-contributions"><summary>Constellation <span>3 sample participants</span><ChevronDown size={14}/></summary><p>These are recorded demonstration roles, not live activity or proof of peer review.</p>{workspace.agents.map(agent => <div key={agent.id}><span>{agent.name}</span><small>{agent.role === 'lead' ? 'Lead' : 'Member'} · sample</small></div>)}</details></>}</article>)}</div>}
      </section>
      <div className="bw-compose-area"><form onSubmit={event => { event.preventDefault(); connections.current?.showModal(); }}><label className="sr-only" htmlFor="browser-message">Message</label><textarea ref={composer} id="browser-message" placeholder="Ask, explore, or build something…" value={draft} onChange={event => browserDraftStore.setDraft(workspace.activeConversationId, event.target.value)} rows={2}/><div className="bw-compose-actions"><button type="button" onClick={() => connections.current?.showModal()}>Choose a connection <ChevronDown size={14}/></button><Button type="submit" size="icon" aria-label="Connect an AI to send" title="Connect an AI to send"><ArrowUp size={18}/></Button></div></form><p>Your draft stays here while you explore. <button onClick={() => connections.current?.showModal()}>Connect an AI to send</button></p></div>
    </main>
    <dialog ref={connections} className="bw-dialog bw-connections" aria-labelledby="bw-connections-title"><header><div><span className="bw-kicker">YOUR WORKSPACE</span><h2 id="bw-connections-title">Connections</h2></div><Button variant="ghost" size="icon" aria-label="Close connections" onClick={() => connections.current?.close()}><X size={19}/></Button></header><p className="bw-dialog-intro">Choose where your answers come from.</p><section className="bw-connection-empty"><Settings2 size={25}/><h3>No AI connected</h3><p>This browser preview lets you explore conversations and sample results. Connecting a provider requires the desktop host.</p><dl><div><dt>Installation</dt><dd>Not checked</dd></div><div><dt>Sign-in</dt><dd>Not verified</dd></div><div><dt>Response test</dt><dd>Not run</dd></div></dl></section><p className="bw-connection-footnote">No request has been sent. Your draft is unchanged.</p><Button className="bw-return" variant="outline" onClick={() => { connections.current?.close(); focusComposer(); }}>Return to conversation</Button></dialog>
    <dialog ref={results} className="bw-dialog bw-results" aria-labelledby="bw-results-title"><header><div><span className="bw-kicker">SAMPLE WORKSPACE</span><h2 id="bw-results-title">{result ? result.title : 'Results'}</h2></div><Button variant="ghost" size="icon" aria-label="Close results" onClick={() => results.current?.close()}><X size={19}/></Button></header>{result ? <><button className="bw-back" onClick={() => { setSelectedResult(null); setCopyStatus(''); }}>← All results</button><pre>{result.content}</pre><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(result.content); setCopyStatus('Copied sample text'); } catch { setCopyStatus('Copy unavailable. Select the text to copy it.'); } }}>Copy sample text</Button><p role="status">{copyStatus}</p></> : artifacts.length ? artifacts.map(artifact => <button className="bw-result-card" key={artifact.id} onClick={() => setSelectedResult(artifact.id)}><FileText size={20}/><span><strong>{artifact.title}</strong><small>Sample · {artifact.kind}</small></span><ArrowUpRight size={17}/></button>) : <p className="bw-dialog-intro">No results in this conversation yet.</p>}</dialog>
  </div>;
}
