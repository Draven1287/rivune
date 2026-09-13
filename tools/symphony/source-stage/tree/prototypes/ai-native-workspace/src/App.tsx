import { useRef, useState, useSyncExternalStore } from 'react';
import { browserDraftStore } from './hooks/draftStore';
import rivuneMark from './assets/rivune-icon-128.png';
import { Sidebar } from './components/sidebar/Sidebar';
import { EditorPanel } from './components/editor/EditorPanel';
import { ChatPanel } from './components/chat/ChatPanel';
import { TelemetryShelf } from './components/TelemetryShelf';
import { ResizableLayout } from './components/ResizableLayout';
import { ConnectionSetup } from './components/settings/ConnectionSetup';
import { useWorkspaceDemo } from './hooks/useWorkspaceDemo';
import { HostWorkspace } from './host/HostWorkspace';

export default function App() {
  const descriptor = Object.getOwnPropertyDescriptor(window, '__RIVUNE_DESKTOP_HOST__');
  if (descriptor || '__TAURI__' in window || '__TAURI_INTERNALS__' in window) return <HostWorkspace bridge={descriptor?.value}/>;
  return <DemoWorkspace/>;
}

function DemoWorkspace() {
  const workspace = useWorkspaceDemo();
  const draftNotice = useSyncExternalStore(browserDraftStore.subscribe, browserDraftStore.getNotice);
  const [mobilePanel, setMobilePanel] = useState<'chat' | 'editor' | 'context'>('chat');
  const [editorOpen, setEditorOpen] = useState(false);
  const artifactOpener = useRef<HTMLElement | null>(null);
  const focusComposer = () => requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('#workspace-message')?.focus());
  const settings = useRef<HTMLDialogElement>(null);
  const [orbit, setOrbit] = useState(() => { try { return localStorage.getItem('rivune-preview-theme') !== 'calm'; } catch { return true; } });
  const [largeText, setLargeText] = useState(false);
  function openEditor() { if (!editorOpen && document.activeElement instanceof HTMLElement) artifactOpener.current = document.activeElement; setEditorOpen(true); setMobilePanel('editor'); if (window.matchMedia('(max-width: 1100px)').matches) requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.editor-region [aria-label="Close artifact panel"]')?.focus()); }
  function selectFile(id: string) { workspace.selectFile(id); openEditor(); }
  function closeEditor() { setEditorOpen(false); setMobilePanel('chat'); requestAnimationFrame(() => { const opener = artifactOpener.current; if (opener?.isConnected && opener.getClientRects().length) opener.focus(); else document.querySelector<HTMLButtonElement>('.artifact-toggle')?.focus(); }); }
  function toggleTheme() { const next = !orbit; setOrbit(next); try { localStorage.setItem('rivune-preview-theme', next ? 'orbit' : 'calm'); } catch { /* Theme stays available without storage. */ } }
  const title = workspace.conversations.find(c => c.id === workspace.activeConversationId)?.title || 'New conversation';
  return <div className={`app-shell chat-first ${orbit ? 'theme-orbit' : ''} ${largeText ? 'large-text' : ''}`}>
    <header className="app-header flex items-center justify-between gap-4">
      <a href="#workspace" className="brand" aria-label="Rivune workspace"><img className="brand-mark" src={rivuneMark} alt=""/><span>Rivune</span></a>
      <div className="workspace-breadcrumb"><span>Personal workspace</span></div>
      <div className="header-actions"><span className="preview-label">Design preview · no AI connected</span></div>
    </header>
    <nav className="mobile-panel-tabs" aria-label="Workspace panes"><button className="context-tab" aria-pressed={mobilePanel === 'context'} onClick={() => setMobilePanel('context')}>Conversations</button><button aria-pressed={mobilePanel === 'chat'} onClick={() => setMobilePanel('chat')}>Chat</button><button aria-pressed={mobilePanel === 'editor'} onClick={openEditor}>Files & artifacts</button></nav>
    <div id="workspace" className="workspace-root">{(workspace.persistenceNotice || draftNotice) && <p className="storage-notice" role="status">{[workspace.persistenceNotice, draftNotice].filter(Boolean).join(' ')}</p>}<ResizableLayout mobilePanel={mobilePanel} editorOpen={editorOpen}
      sidebar={<Sidebar files={workspace.files} agents={workspace.agents} terminals={workspace.terminals} environment={workspace.environment} activeFileId={workspace.activeFileId} onSelectFile={selectFile} conversations={workspace.conversations} activeConversationId={workspace.activeConversationId} onSelectConversation={id => { workspace.selectConversation(id); setMobilePanel('chat'); focusComposer(); }} onNewConversation={() => { workspace.newConversation(); setMobilePanel('chat'); setEditorOpen(false); focusComposer(); }} onSettings={() => settings.current?.showModal()} conversationTitle={title}/>}
      chat={<ChatPanel key={workspace.activeConversationId} conversationId={workspace.activeConversationId} title={title} messages={workspace.messages} agents={workspace.agents} commands={workspace.commands} isStreaming={workspace.isStreaming} onSend={workspace.sendDemoMessage} onStop={workspace.stopDemoStream} artifacts={workspace.artifacts} onOpenFiles={openEditor} onOpenArtifact={id => { const fileId = workspace.artifacts.find(a => a.id === id)?.fileId; if (fileId) selectFile(fileId); }}/>}
      editor={<><div className="artifact-panel-bar"><span>Alongside your conversation</span><button aria-label="Close artifact panel" onClick={closeEditor}>×</button></div><EditorPanel files={workspace.files} artifacts={workspace.artifacts} activeFileId={workspace.activeFileId} onSelectFile={selectFile}/></>}
      shelf={<TelemetryShelf agents={workspace.agents} terminals={workspace.terminals} telemetry={workspace.telemetry} steps={workspace.steps} artifacts={workspace.artifacts} onOpenArtifact={id => { const fileId = workspace.artifacts.find(a => a.id === id)?.fileId; if (fileId) selectFile(fileId); }}/>}
    /></div>
    <dialog ref={settings} className="settings-dialog" aria-labelledby="settings-title"><header><div><span className="eyebrow">YOUR WORKSPACE</span><h2 id="settings-title">Settings</h2></div><button aria-label="Close settings" onClick={() => settings.current?.close()}>×</button></header><section><h3>Appearance</h3><p>A proposed treatment, ready for your feedback.</p><button className="settings-option" aria-pressed={orbit} onClick={toggleTheme}><span>Milky Way backdrop</span><span>{orbit ? 'On' : 'Off'}</span></button><button className="settings-option" aria-pressed={largeText} onClick={() => setLargeText(!largeText)}><span>Larger conversation text</span><span>{largeText ? 'On' : 'Off'}</span></button><p>Motion follows your system’s reduced-motion preference.</p></section><ConnectionSetup/><section><h3>Preview storage</h3><p>{workspace.persistenceStatus === 'session' && !draftNotice ? 'Conversations and drafts restore when you reload this browser tab. This is browser-session storage, not desktop history or cross-device sync.' : 'Some browser saving is unavailable. Current work remains available in memory while this page stays open; see the saving notice for details.'} No files are written to your project.</p></section></dialog>
  </div>;
}
