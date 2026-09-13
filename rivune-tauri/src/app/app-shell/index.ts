import type { ShellSlots } from '../../platform/types.js';
import { createIcons, Plus, Search, MessageSquare, Orbit, Boxes, FolderOpen, Archive, PlugZap, Settings, Sparkles, Paperclip, Mic, ArrowUp, ChevronDown, PanelLeftClose, Command, CircleDot, ShieldCheck, Zap, Ellipsis, SlidersHorizontal, ArrowDown, Lightbulb, Layers } from 'lucide';

export function mountAppShell(): ShellSlots {
document.documentElement.classList.add('everyday-ui');
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div class="cosmos" data-engine-layer="environment" aria-hidden="true"><div class="nebula"></div><div class="stars stars-a"></div><div class="stars stars-b"></div></div>
<div class="shell">
  <aside class="sidebar">
    <div class="brand"><div class="brand-mark selected-icon" role="img" aria-label="Rivune silver orbit icon"></div><div><strong>Rivune</strong><span>Constellation Engine</span></div><button class="icon-btn collapse" aria-label="Collapse sidebar"><i data-lucide="panel-left-close"></i></button></div>
    <button class="new-thread"><i data-lucide="plus"></i><span>New conversation</span><kbd>⌘ N</kbd></button>
    <nav aria-label="Workspace navigation">
      <button class="nav-item"><i data-lucide="search"></i><span>Search</span><kbd>⌘ K</kbd></button>
      <button class="nav-item"><i data-lucide="folder-open"></i><span>Projects</span></button><button class="nav-item secondary-navigation"><i data-lucide="plug-zap"></i><span>Plugins</span></button>
    </nav>
    <div class="recent"><p class="nav-label">Recent chats <span class="tag">0</span></p><div id="history"></div></div>
    <div class="sidebar-bottom">
      <button class="nav-item secondary-navigation"><i data-lucide="plug-zap"></i><span>Connections</span><span class="status-connected">0</span></button>
      <button class="profile" aria-label="Settings"><i data-lucide="settings"></i><span><strong>Settings</strong></span></button>
      <button class="account-control" aria-label="Account and settings: local workspace"><span class="account-avatar">R</span><span><strong>Local workspace</strong><small>Account & settings</small></span><i data-lucide="chevron-down"></i></button>
    </div>
  </aside>
  <main>
    <header><div class="breadcrumbs"><button class="icon-btn"><i data-lucide="search"></i></button><span>New conversation</span></div><div class="top-actions"><button hidden id="environment-menu" aria-haspopup="dialog" aria-expanded="false">Orbit ⌄</button><button id="prompt-templates">Templates ⌄</button><button class="model-pill"><span class="model-glyph">✦</span>Connections<i data-lucide="chevron-down"></i></button><button class="icon-btn" id="chat-actions" aria-label="Conversation actions" hidden disabled>⋯</button></div></header>
    <section class="workspace" aria-label="Constellation Engine"><div id="history-conflict" role="alert" hidden>Another window changed saved work. Export this window’s copy before reloading. <button id="export-recovery">Export this copy</button><button id="reload-workspace">Reload saved chats</button></div>
      <div class="hero">
        <div class="orbit-stage"><div class="floating-mark" aria-hidden="true"><img src="/rivune-smooth-r.png" alt="" width="124" height="124" draggable="false"></div></div>
        <div class="eyebrow"><i data-lucide="sparkles"></i> CONSTELLATION ENGINE</div>
        <h1>What would you like to work on?</h1>
        <p>A question, an idea, a little progress. Start here.</p><button id="try-council-example" class="example-link">See how perspectives come together <span aria-hidden="true">→</span></button>

      </div>
      <section id="conversation" class="conversation" hidden aria-label="Conversation"></section>
      <button class="jump-to-latest" hidden aria-label="Jump to latest reply"><i data-lucide="arrow-down"></i><span>Latest reply</span></button>
      <div class="composer-card">
        <div class="attachment-list" aria-label="Attached files"></div>
        <input id="file-picker" type="file" multiple hidden>
        <textarea rows="1" maxlength="12000" aria-label="Message" placeholder="Ask anything…"></textarea>
        <div class="composer-controls">
          <div class="composer-primary">
            <button class="tool attach-files" aria-label="Add files, plugins, or connections" title="Add"><i data-lucide="plus"></i></button>
            <div class="mode-switch" role="group" aria-label="AI experience" hidden><button class="active" aria-pressed="true" data-mode="auto"><span><strong>Constellation Engine</strong></span></button><button aria-pressed="false" data-mode="single"><span><strong>Single AI</strong></span></button></div>
            <button class="experience-control" aria-label="Choose AI experience" aria-haspopup="dialog" aria-expanded="false">Constellation Engine <i data-lucide="chevron-down"></i></button>
            <button class="team-summary" aria-label="Choose team or model">Choose team <span aria-hidden="true">⌄</span></button><button class="model-selector" aria-label="Choose intelligence">Choose intelligence ⌄</button>
          </div>
          <div class="composer-secondary">
            <button class="tool permissions-control" aria-label="Permissions unavailable" title="Permissions unavailable until a provider is connected" hidden><i data-lucide="shield-check"></i></button>
            <button class="tool context-control" aria-label="Context usage unavailable" title="Context usage unavailable"><i data-lucide="circle-dot"></i></button>
            <button class="tool dictate-control" aria-label="Dictation help" title="Use system dictation" hidden><i data-lucide="mic"></i></button>
            <button class="tool composer-options" aria-label="Message options" title="Message options" aria-haspopup="dialog" aria-expanded="false"><i data-lucide="sliders-horizontal"></i></button>
            <button class="send" aria-label="Save message locally" title="Save locally · AI replies not connected" disabled><i data-lucide="arrow-up"></i></button>
          </div>
        </div>
        <div class="composer-meta"><button class="connection-shortcut"><span class="connection-dot" aria-hidden="true"></span><span id="routing-copy">Team not connected</span></button><button class="simulation-toggle" hidden>Simulation off</button><span id="draft-status" role="status">Saved locally</span><span class="enter-hint"><kbd>↵</kbd> Send</span></div>
      </div>
      <div class="suggestions"><button data-template="compare"><i data-lucide="layers"></i><div><strong>Compare perspectives</strong><small>See an idea from every angle</small></div></button><button data-template="build"><i data-lucide="command"></i><div><strong>Start a build</strong><small>Make room for your next project</small></div></button><button data-template="explore"><i data-lucide="lightbulb"></i><div><strong>Explore an idea</strong><small>Follow your curiosity</small></div></button></div>
    </section>
    <footer><span>Saved on this device</span><span></span><span>⌘ K · Search</span></footer>
  </main>
</div><p id="notice" role="status" aria-live="polite"></p><dialog aria-labelledby="dialog-title"><div id="dialog-body"></div><button class="dialog-close">Done</button></dialog>`;

createIcons({ icons: { Plus, Search, MessageSquare, Orbit, Boxes, FolderOpen, Archive, PlugZap, Settings, Sparkles, Paperclip, Mic, ArrowUp, ChevronDown, PanelLeftClose, Command, CircleDot, ShieldCheck, Zap, Ellipsis, SlidersHorizontal, ArrowDown, Lightbulb, Layers } });
  return {
    navigation: app.querySelector<HTMLElement>('.sidebar')!,
    toolbar: app.querySelector<HTMLElement>('main > header')!,
    content: app.querySelector<HTMLElement>('.workspace')!,
  };
}
