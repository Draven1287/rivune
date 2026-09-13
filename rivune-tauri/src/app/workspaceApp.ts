import { createAppUpdates } from '../services/updates/index.js';
import packageInfo from '../../package.json';
import { ReadingPositions, atLatest } from '../features/conversations/readingPosition.js';
import { mountWorlds } from '../features/worlds/renderer.js';
import { createIcons, Users, Settings, TriangleAlert, ChevronDown, ArrowUp, Square } from 'lucide';
import { openGatewayPreview } from '../features/connections/gatewayPreview.js';
import { commitMessage } from '../features/conversations/commitMessage.js';
import { renderAnswer } from '../components/shared/answerFormat.js';
import { councilDemo, councilDemoPrompt, type CouncilDemo } from '../features/conversations/councilDemo.js';
import { openPopover, closePopover } from '../components/shared/popover.js';
import { openProjects, getProjectName } from '../features/projects/projects.js';
import { launchOnboarding } from '../features/onboarding/onboarding.js';
import { parseDrafts, mergeDraft } from '../features/conversations/drafts.js';
import { confirmDeleteConversation, downloadConversation } from '../features/conversations/actions.js';
import { MockProvider, ProviderError, scenarios, type Scenario } from '../services/api/mockProvider.js';
import { platform, type ConnectionStatus } from '../platform/index.js';
import { ClaudeProvider } from '../services/api/claudeProvider.js';
import { beginClaudeReply, claudeHistory, claudeModels, type ClaudeModel } from '../features/conversations/liveReply.js';
import { mountAppShell } from './app-shell/index.js';
import { storage } from '../services/storage/index.js';
import { downloadJson } from '../services/storage/download.js';

import { parseConversations, type Route, type Conversation, type ConversationMessage } from '../features/conversations/model.js';

platform.presentShell(mountAppShell());

const modeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
const routingCopy = document.querySelector<HTMLSpanElement>('#routing-copy')!;
const textarea = document.querySelector<HTMLTextAreaElement>('textarea')!;
const conversation = document.querySelector<HTMLElement>('#conversation')!;
const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
const dialogBody = document.querySelector<HTMLElement>('#dialog-body')!;
const notice = document.querySelector<HTMLElement>('#notice')!;
const storageKey = 'rivune.conversations.v1';
let route: Route = 'auto';
let provider = 'Codex';
let rows: Conversation[] = [];
let currentId: string | null = null;
let showAllHistory = false;
let sidebarSearchActive = false;
let sidebarSearchQuery = '';
let sidebarSearchReturnFocus: HTMLElement | null = null;

let selectedProjectId: string | null = null;
try { selectedProjectId = storage.getItem('rivune.selected-project'); } catch { /* Session selection remains available. */ }
let simulationModel = 'Mock OpenAI';
const selectedTeam = new Set<string>();
try { const stored: unknown = JSON.parse(storage.getItem('rivune.team.v1') || '[]'); if (Array.isArray(stored)) for (const name of stored) if (['Codex', 'Claude', 'Gemini', 'Grok'].includes(name)) selectedTeam.add(name); } catch { /* Session team remains usable. */ }
let simulationEnabled = false;
let chatScenario: Scenario = 'streaming';
let claudeReady = false;
let checkedAccounts: ConnectionStatus[] = [];
let checkingAccounts = false;
let claudeModel: ClaudeModel = 'default';
const localClaudeAvailable = platform.runtime === 'browser' && platform.capabilities.connectionChecks;
function canSendClaude() { return localClaudeAvailable && claudeReady && route === 'single' && provider === 'Claude' && !simulationEnabled; }
const activeSimulations = new Map<string, AbortController>();
const appUpdates = createAppUpdates(() => {
  if (activeSimulations.size || draftConflicts.size) return false;
  try {
    const savedDrafts = parseDrafts(storage.getItem('rivune.drafts.v1'));
    return [...drafts].every(([id, text]) => (savedDrafts[id] || '') === text)
      && (storage.getItem(storageKey) || '[]') === JSON.stringify(rows);
  } catch { return false; }
});
let unsubscribeUpdates: (() => unknown) | undefined;
const drafts = new Map<string, string>();
const attachmentDrafts = new Map<string, File[]>();
try { for (const [key, value] of Object.entries(parseDrafts(storage.getItem('rivune.drafts.v1')))) drafts.set(key, value); }
catch { /* Saving failures are disclosed below. */ }
const draftBaselines = new Map(drafts);
const draftConflicts = new Set<string>();
function activeClaudeId() {
  return [...activeSimulations.keys()].find(id => { const row = rows.find(row => row.id === id); return row && (row.messages || [row]).some(turn => turn.reply?.status === 'responding'); });
}
function stopRun(id: string) {
  activeSimulations.get(id)?.abort();
  const row = rows.find(row => row.id === id); if (row) renderConversation(row);
  updateComposer();
}
function updateComposer() {
  const sendButton = document.querySelector<HTMLButtonElement>('.send')!;
  const currentRun = activeSimulations.get(currentId || '');
  const busyElsewhere = canSendClaude() && !!activeClaudeId() && activeClaudeId() !== currentId;
  sendButton.disabled = currentRun ? currentRun.signal.aborted : !textarea.value.trim() || busyElsewhere;
  const action = currentRun ? 'stop' : 'send';
  if (sendButton.dataset.action !== action) {
    sendButton.dataset.action = action; sendButton.replaceChildren();
    const icon = document.createElement('i'); icon.dataset.lucide = currentRun ? 'square' : 'arrow-up'; sendButton.append(icon);
    createIcons({ icons: { ArrowUp, Square } });
  }
  sendButton.setAttribute('aria-label', currentRun ? currentRun.signal.aborted ? 'Stopping reply' : 'Stop reply' : simulationEnabled ? 'Send simulated message' : canSendClaude() ? 'Send to Claude' : 'Save message locally');
  document.querySelector('.enter-hint')!.textContent = currentRun ? 'Draft kept while replying' : busyElsewhere ? 'Claude is busy' : simulationEnabled || canSendClaude() ? '↵ Send' : '↵ Save locally';
  sendButton.title = currentRun ? 'Stop this reply; keep partial output and your draft' : busyElsewhere ? 'Claude is replying in another chat' : simulationEnabled ? 'Send to local mock provider · no network' : canSendClaude() ? 'Send using your Claude account' : 'Save locally · connect an AI to receive replies';
  let runningLink = document.querySelector<HTMLButtonElement>('.active-run-link');
  if (!runningLink) { runningLink = document.createElement('button'); runningLink.className = 'active-run-link'; document.querySelector('.composer-meta')!.append(runningLink); }
  const other = busyElsewhere ? activeClaudeId() : [...activeSimulations.keys()].find(id => id !== currentId && rows.some(row => row.id === id));
  runningLink.hidden = !other;
  runningLink.textContent = 'View active reply';
  runningLink.onclick = () => { const row = rows.find(row => row.id === other); if (row) show(row); };
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(220, Math.max(52, textarea.scrollHeight)) + 'px';
}
function retainDraft() {
  const key = currentId || 'new';
  if (textarea.value) drafts.set(key, textarea.value); else drafts.delete(key);
  try {
    const merged = mergeDraft(storage.getItem('rivune.drafts.v1'), key, textarea.value, draftBaselines.get(key));
    if (!merged.ok) {
      draftConflicts.add(key); document.querySelector('#draft-status')!.textContent = 'Draft conflict · export this window’s copy';
      document.querySelector<HTMLElement>('#history-conflict')!.hidden = false;
    } else {
      storage.setItem('rivune.drafts.v1', merged.raw); draftBaselines.set(key, merged.value); draftConflicts.delete(key);
      textarea.value = merged.value; if (merged.value) drafts.set(key, merged.value); else drafts.delete(key);
      document.querySelector('#draft-status')!.textContent = 'Draft saved';
    }
  } catch { document.querySelector('#draft-status')!.textContent = 'Draft not saved · keep this window open'; }
  updateComposer();
}
function restoreDraft() {
  const key = currentId || 'new';
  if (!draftConflicts.has(key)) try {
    const stored = parseDrafts(storage.getItem('rivune.drafts.v1')); const value = Object.hasOwn(stored, key) ? stored[key] : '';
    if (value) drafts.set(key, value); else drafts.delete(key); draftBaselines.set(key, value);
  } catch { /* Keep the in-memory copy if storage is unavailable. */ }
  textarea.value = drafts.get(key) || ''; renderAttachments(); updateComposer();
}
function removeStoredDrafts(ids: string[]) {
  const stored = parseDrafts(storage.getItem('rivune.drafts.v1'));
  for (const id of ids) { delete stored[id]; drafts.delete(id); draftBaselines.delete(id); draftConflicts.delete(id); }
  storage.setItem('rivune.drafts.v1', JSON.stringify(stored));
}
textarea.addEventListener('input', retainDraft);
function renderAttachments() {
  const container = document.querySelector<HTMLElement>('.attachment-list')!;
  container.replaceChildren();
  const files = attachmentDrafts.get(currentId || 'new') || [];
  files.forEach((file, index) => {
    const chip = document.createElement('div'); chip.className = 'attachment-chip';
    const name = document.createElement('span'); name.textContent = file.name;
    const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${file.name}`);
    remove.onclick = () => { files.splice(index, 1); renderAttachments(); };
    chip.append(name, remove); container.append(chip);
  });
  if (files.length) { const hint = document.createElement('small'); hint.textContent = 'Local previews only · files are not sent or saved'; container.append(hint); }
}
document.querySelector('.attach-files')!.addEventListener('click', event => {
  const panel = openPopover(event.currentTarget as HTMLElement, 'Add to workspace');
  for (const [label, action] of [['Add files', () => { closePopover(); document.querySelector<HTMLInputElement>('#file-picker')!.click(); }], ['Connections', () => connections()], ['Plugins', () => { const content = openPopover(document.querySelector<HTMLElement>('.attach-files')!, 'Plugins'); content.innerHTML = '<strong>Plugins</strong><p>Plugin connections are planned. None are installed in this preview.</p>'; }]] as [string, () => void][]) {
    const button = document.createElement('button'); button.textContent = label; button.onclick = action; panel.append(button);
  }
});
document.querySelector<HTMLInputElement>('#file-picker')!.addEventListener('change', event => {
  const input = event.target as HTMLInputElement;
  const key = currentId || 'new'; const existing = attachmentDrafts.get(key) || [];
  attachmentDrafts.set(key, [...existing, ...Array.from(input.files || [])].slice(0, 8));
  input.value = ''; renderAttachments();
});
function openPermissions(anchor: HTMLElement) {
  const panel = openPopover(anchor, 'Permissions');
  panel.innerHTML = canSendClaude() ? '<strong>Chat only</strong><p>Claude receives your prompt and completed Claude replies in this conversation. Files, commands, plugins, and tools are disabled in this adapter.</p>' : '<strong>Permissions</strong><p>Connect a supported AI to see its available controls.</p>';
}
document.querySelector('.permissions-control')!.addEventListener('click', event => openPermissions(event.currentTarget as HTMLElement));
function openContext(anchor: HTMLElement) {
  const panel = openPopover(anchor, 'Context window');
  if (!simulationEnabled) {
    const row = rows.find(item => item.id === currentId);
    const reply = [...(row?.messages || (row ? [row] : []))].reverse().find(turn => turn.reply?.status === 'completed')?.reply;
    const title = document.createElement('strong'); title.textContent = reply ? 'Last Claude request' : 'Context window'; panel.append(title);
    const usage = document.createElement('p'); usage.textContent = reply?.inputTokens !== undefined && reply.outputTokens !== undefined ? `Last request: ${reply.inputTokens.toLocaleString()} input tokens · ${reply.outputTokens.toLocaleString()} output tokens.` : 'Usage will appear when Claude reports it.';
    const hint = document.createElement('small'); hint.textContent = 'Input includes reported cached tokens. Context capacity is not reported by this adapter, so no percentage is estimated.';
    if (reply?.model) { const model = document.createElement('p'); model.textContent = `Model: ${reply.model}`; panel.append(model); }
    panel.append(usage, hint); return;
  }
  const row = rows.find(item => item.id === currentId);
  const characters = (row?.messages || (row ? [row] : [])).reduce((sum, turn) => sum + turn.prompt.length + (turn.simulation?.text.length || 0), textarea.value.length);
  const estimated = Math.ceil(characters / 4); const capacity = 8192;
  panel.innerHTML = `<strong>Simulation context</strong><progress max="${capacity}" value="${Math.min(estimated, capacity)}" aria-label="Estimated fixture context usage"></progress><p>${Math.round(estimated / capacity * 100)}% · about ${estimated.toLocaleString()} / ${capacity.toLocaleString()} fixture tokens</p><small>Character-based estimate in a mock window. This is not a real model’s token count or limit.</small>`;
}
document.querySelector('.context-control')!.addEventListener('click', event => openContext(event.currentTarget as HTMLElement));
document.querySelector('.composer-options')!.addEventListener('click', event => {
  const anchor = event.currentTarget as HTMLElement; const panel = openPopover(anchor, 'Message options');
  for (const [label, action] of [
    ['Prompt templates', () => openPromptTemplates(anchor)], ['Permissions', () => openPermissions(anchor)], ['Usage and context', () => openContext(anchor)],
    ['Dictation help', () => { closePopover(); textarea.focus(); notify('Use your device’s dictation shortcut in the message field. In-app voice recording is not available yet.'); }],
    ['Text size & appearance', () => { closePopover(); settings(); }],
    ['Developer simulation', () => { closePopover(); configureChatSimulation(); }],
  ] as [string, () => void][]) { const button = document.createElement('button'); button.textContent = label; button.onclick = action; panel.append(button); }
});
document.querySelector('.connection-shortcut')!.addEventListener('click', connections);
document.querySelector('.dictate-control')!.addEventListener('click', () => { textarea.focus(); notify('Use your device’s dictation shortcut while the message field is focused. In-app dictation is not connected yet.'); });
let noticeTimer: ReturnType<typeof setTimeout>;
function notify(message: string) { clearTimeout(noticeTimer); notice.textContent = message; noticeTimer = setTimeout(() => { notice.textContent = ''; }, 8000); }
let historyBaseline: string | null = null;
try { historyBaseline = storage.getItem(storageKey); rows = parseConversations(historyBaseline); }
catch { notify('Local storage is unavailable. Conversations will last only for this session.'); }
function historyIsCurrent() {
  if (storage.getItem(storageKey) === historyBaseline) return true;
  document.querySelector<HTMLElement>('#history-conflict')!.hidden = false;
  return false;
}
function save() {
  try { if (!historyIsCurrent()) return false; const next = JSON.stringify(rows); storage.setItem(storageKey, next); historyBaseline = next; return true; }
  catch { notify('Could not save on this device. Keep this window open to retain your conversation.'); return false; }
}
function setRoute(value: Route) {
  route = value;
  modeButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.mode === value);
    button.setAttribute('aria-pressed', String(button.dataset.mode === value));
  });
  routingCopy.textContent = simulationEnabled ? 'Simulation · stays on this device' : canSendClaude() ? 'Connected · chat only' : value === 'single' ? `Connect ${provider} to send` : 'Connect your team';
  document.documentElement.dataset.accountReady = String(canSendClaude());
  const experience = document.querySelector<HTMLButtonElement>('.experience-control')!; experience.replaceChildren();
  if (value === 'single') experience.append(providerMark(provider));
  else { const mark = document.createElement('img'); mark.src = '/rivune-smooth-r.png'; mark.alt = ''; mark.width = 21; mark.height = 21; experience.append(mark); }
  experience.append(document.createTextNode(value === 'single' ? provider : 'Constellation Engine'));
  const chevron = document.createElement('i'); chevron.dataset.lucide = 'chevron-down'; experience.append(chevron); createIcons({icons:{ChevronDown}});
  experience.setAttribute('aria-label', `AI experience: ${value === 'single' ? provider : 'Constellation Engine'}`);
  document.querySelector<HTMLElement>('.team-summary')!.hidden = value === 'single';
  document.querySelector<HTMLElement>('.model-selector')!.hidden = !canSendClaude() && !simulationEnabled;
  document.querySelector<HTMLElement>('.context-control')!.hidden = !simulationEnabled && !canSendClaude();
  document.querySelector<HTMLElement>('.simulation-toggle')!.hidden = !simulationEnabled;
  document.querySelector('.status-connected')!.textContent = claudeReady ? '1' : '0';
  const teamControl = document.querySelector('.team-summary')!; teamControl.replaceChildren();
  const identities = document.createElement('span'); identities.className = 'provider-stack';
  for (const name of value === 'single' ? [provider] : [...selectedTeam]) identities.append(providerMark(name));
  teamControl.append(identities, document.createTextNode(value === 'single' ? `${provider} ⌄` : selectedTeam.size ? `Team ⌄` : 'Choose team ⌄'));
  teamControl.setAttribute('title', value === 'single' ? provider : [...selectedTeam].join(', ') || 'Choose providers');
  document.querySelector('.model-selector')!.textContent = simulationEnabled ? `${simulationModel} ⌄` : canSendClaude() ? `${claudeModel === 'default' ? 'Account default' : claudeModel[0].toUpperCase() + claudeModel.slice(1)} ⌄` : 'Choose intelligence ⌄';
  document.querySelector('.model-selector')!.setAttribute('aria-label', canSendClaude() ? `Claude model: ${claudeModel === 'default' ? 'Account default' : claudeModel}` : simulationEnabled ? `Simulation model: ${simulationModel}` : 'Choose intelligence');
  document.querySelector('.permissions-control')!.setAttribute('aria-label', canSendClaude() ? 'Permissions: chat only' : 'Permissions');
  document.querySelector('.permissions-control')!.setAttribute('title', canSendClaude() ? 'Chat only · tools disabled' : 'Permissions');
  document.querySelector('.context-control')!.setAttribute('aria-label', simulationEnabled ? 'Simulation context usage' : 'Usage and context');
  document.querySelector('.context-control')!.setAttribute('title', 'Reported usage and context availability');
  rememberWorkspace();
  textarea.placeholder = currentId ? 'Ask a follow-up…' : value === 'single' ? `Message ${provider}…` : 'Ask anything…';
  updateComposer();
}
modeButtons.forEach(button => button.addEventListener('click', () => setRoute(button.dataset.mode as Route)));
document.querySelector('.experience-control')!.addEventListener('click', event => {
  const panel = openPopover(event.currentTarget as HTMLElement, 'Choose AI experience');
  const section = document.createElement('span'); section.className = 'menu-section-label'; section.textContent = 'SINGLE AI'; panel.append(section);
  for (const name of ['Codex', 'Claude', 'Gemini', 'Grok']) {
    const button = document.createElement('button'); button.className = 'experience-option'; button.append(providerMark(name), document.createTextNode(name));
    button.setAttribute('aria-pressed', String(route === 'single' && provider === name));
    button.onclick = () => { provider = name; setRoute('single'); closePopover(); textarea.focus(); }; panel.append(button);
  }
  const divider = document.createElement('hr'); divider.className = 'menu-divider'; panel.append(divider);
  const engine = document.createElement('button'); engine.textContent = 'Constellation Engine'; engine.setAttribute('aria-pressed', String(route === 'auto'));
  engine.onclick = () => { setRoute('auto'); closePopover(); textarea.focus(); }; panel.append(engine);
  const hint = document.createElement('small'); hint.textContent = 'One AI for a direct conversation. Constellation Engine brings a team together through Council and Swarm; live team execution is still being built.'; panel.append(hint);
});

function renderSettingsArchives(container: HTMLElement) {
  container.replaceChildren();
  const archived = rows.filter(row => row.archived);
  if (!archived.length) { const empty = document.createElement('p'); empty.textContent = 'No archived chats.'; container.append(empty); }
  for (const row of archived) {
    const item = document.createElement('div'); item.className = 'archive-entry';
    const view = document.createElement('button'); view.textContent = row.prompt === councilDemoPrompt ? 'A neighborhood café' : row.prompt.slice(0, 60); view.title = row.prompt;
    view.onclick = () => { dialog.close(); show(row); };
    const restore = document.createElement('button'); restore.textContent = 'Restore'; restore.setAttribute('aria-label', `Restore ${row.prompt.slice(0, 60)}`);
    restore.onclick = () => { archiveChat(row); renderSettingsArchives(container); };
    item.append(view, restore); container.append(item);
  }
}
function providerMark(name: string) {
  const image = document.createElement('img');
  const slug = ({ Codex: 'openai', Claude: 'claude', Gemini: 'gemini', Grok: 'grok' } as Record<string,string>)[name];
  image.dataset.provider = slug; image.src = `/providers/${slug || 'openai'}.svg`; image.alt = ''; image.className = 'provider-mark'; image.width = 22; image.height = 22;
  return image;
}
function chooseProvider() {
  const panel = openPopover(document.querySelector<HTMLElement>('.team-summary')!, route === 'single' ? 'Choose AI' : 'Choose team');
  const title = document.createElement('strong'); title.textContent = route === 'single' ? 'Choose AI' : 'Your team'; panel.append(title);
  for (const name of ['Codex', 'Claude', 'Gemini', 'Grok']) {
    if (route === 'single') {
      const button = document.createElement('button'); button.textContent = name; button.prepend(providerMark(name)); button.setAttribute('aria-pressed', String(provider === name));
      button.onclick = () => { provider = name; setRoute('single'); closePopover(); textarea.focus(); }; panel.append(button);
    } else {
      const label = document.createElement('label'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = selectedTeam.has(name);
      checkbox.onchange = () => { if (checkbox.checked) selectedTeam.add(name); else selectedTeam.delete(name); try { storage.setItem('rivune.team.v1', JSON.stringify([...selectedTeam])); } catch { notify('Team selection saved for this session only.'); } setRoute('auto'); };
      label.append(checkbox, providerMark(name), document.createTextNode(name)); panel.append(label);
    }
  }
  const hint = document.createElement('small'); hint.textContent = claudeReady ? 'Claude account ready for Single AI. Team execution is not connected yet.' : 'Connect an account to receive replies.'; panel.append(hint);
  const connect = document.createElement('button'); connect.textContent = 'Connect accounts'; connect.onclick = () => { closePopover(); connections(); }; panel.append(connect);
}
document.querySelector('.model-selector')!.addEventListener('click', event => {
  const panel = openPopover(event.currentTarget as HTMLElement, 'Choose intelligence');
  if (canSendClaude()) {
    for (const model of claudeModels) {
      const button = document.createElement('button'); button.textContent = model === 'default' ? 'Account default' : model[0].toUpperCase() + model.slice(1);
      button.setAttribute('aria-pressed', String(model === claudeModel)); button.onclick = () => { claudeModel = model; setRoute(route); closePopover(); }; panel.append(button);
    }
    const hint = document.createElement('small'); hint.textContent = 'Claude CLI aliases. Availability depends on your account; Usage and context shows the model reported by Claude.'; panel.append(hint); return;
  }
  if (!simulationEnabled) { panel.innerHTML = '<strong>Models unavailable</strong><p>Connect an AI to discover its supported models.</p>'; return; }
  for (const model of ['Mock OpenAI', 'Mock Anthropic', 'Mock Gemini', 'Mock Grok']) { const button = document.createElement('button'); button.textContent = model; button.setAttribute('aria-pressed', String(model === simulationModel)); button.onclick = () => { simulationModel = model; setRoute(route); closePopover(); }; panel.append(button); }
});
function openPromptTemplates(anchor: HTMLElement) {
  const panel = openPopover(anchor, 'Prompt templates');
  for (const [title, prompt] of [['Business angles', 'Explore this business idea from customer, financial, and operational perspectives: '], ['Debate an idea', 'Present the strongest arguments for and against this idea, then summarize the tradeoffs: '], ['Compare perspectives', 'Compare several perspectives on this question and identify where they agree: ']]) {
    const button = document.createElement('button'); button.textContent = title; button.onclick = () => { textarea.value = (textarea.value ? textarea.value + '\n' : '') + prompt; textarea.value = textarea.value.slice(0, 12000); retainDraft(); closePopover(); textarea.focus(); }; panel.append(button);
  }
}
document.querySelector('#prompt-templates')!.addEventListener('click', event => openPromptTemplates(event.currentTarget as HTMLElement));

function rememberWorkspace() {
  try { storage.setItem('rivune.workspace.v1', JSON.stringify({ currentId, route, provider })); }
  catch { notify('Workspace position could not be saved.'); }
}
function show(row: Conversation) {
  retainDraft();
  currentId = row.id;
  selectedProjectId = row.projectId || null;
  conversation.hidden = false;
  document.querySelector('.hero')!.classList.add('compact');
  document.querySelector('.suggestions')!.classList.add('hidden');
  renderConversation(row);
  document.querySelector('.breadcrumbs > span')!.textContent = row.prompt === councilDemoPrompt ? 'A neighborhood café' : row.prompt.slice(0, 60);
  if (row.mode === 'single') provider = row.provider!;
  setRoute(row.mode === 'single' ? 'single' : 'auto'); restoreDraft(); renderHistory();
}
const simulationTextNodes = new WeakMap<ConversationMessage, HTMLElement>();
const readingPositions = new ReadingPositions();
let renderedConversationId: string | null = null;
function copyTextButton(label: string, value: string): HTMLButtonElement {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  button.onclick = async () => {
    button.disabled = true;
    try { await navigator.clipboard.writeText(value); button.textContent = 'Copied'; }
    catch { button.textContent = 'Copy unavailable'; notify('Select the text and use your system copy command.'); }
    finally { button.disabled = false; setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1600); }
  };
  return button;
}
function renderConversation(row: Conversation) {
  if (currentId !== row.id) return;
  if (renderedConversationId && !conversation.hidden) readingPositions.capture(renderedConversationId, conversation);
  conversation.replaceChildren();
  for (const turn of row.messages || [row]) {
    const isLastTurn = (row.messages || [row]).at(-1) === turn;
    const message = document.createElement('div'); message.className = 'message-user';
    const turnIndex = (row.messages || [row]).indexOf(turn);
    message.dataset.turnIndex = String(turnIndex); message.tabIndex = -1;
    const label = document.createElement('p'); label.className = 'message-meta';
    label.textContent = turn.mode === 'single' ? `You · ${turn.provider}` : 'You · Constellation Engine';
    const text = document.createElement('p'); text.className = 'message-text'; text.textContent = turn.prompt;
    const menu = document.createElement('button'); menu.type = 'button'; menu.className = 'message-menu'; menu.textContent = '⋯'; menu.setAttribute('aria-label', `Actions for your message ${turnIndex + 1}`); menu.setAttribute('aria-haspopup', 'dialog');
    menu.onclick = () => {
      const panel = openPopover(menu, `Message ${turnIndex + 1} actions`);
      const copy = copyTextButton('Copy prompt', turn.prompt); panel.append(copy);
      const reuse = document.createElement('button'); reuse.textContent = drafts.get('new')?.trim() ? 'Add to new conversation draft' : 'Use in a new conversation';
      reuse.onclick = () => { closePopover(); startNew(); provider = turn.provider || provider; setRoute(turn.mode === 'single' ? 'single' : 'auto'); const existingDraft = textarea.value.trim(); textarea.value = existingDraft ? `${existingDraft}\n\n${turn.prompt}` : turn.prompt; retainDraft(); textarea.focus(); }; panel.append(reuse);
    };
    message.append(label, text, menu); conversation.append(message);
    if (turn.reply) {
      const result = turn.reply;
      const assistant = document.createElement('div'); assistant.className = 'message-assistant live-reply';
      const meta = document.createElement('p'); meta.className = 'message-meta';
      meta.textContent = result.status === 'completed' ? 'Claude' : `Claude · ${result.status === 'responding' ? activeSimulations.get(row.id)?.signal.aborted ? 'Stopping…' : 'Responding…' : result.status}`;
      meta.title = result.model ? `Model reported by Claude: ${result.model}` : 'Claude account connection';
      const reply = result.status === 'completed' ? renderAnswer(result.text) : document.createElement('p');
      if (result.status !== 'completed') { reply.className = 'message-text'; reply.textContent = result.text || (result.status === 'responding' ? 'Connecting to your Claude account…' : 'No reply received.'); }
      simulationTextNodes.set(turn, reply); assistant.append(meta, reply);
      if (result.error) { const error = document.createElement('p'); error.className = 'reply-error'; error.textContent = result.error; assistant.append(error); }
      const actions = document.createElement('div'); actions.className = 'reply-actions';
      if (result.status === 'responding' && activeSimulations.has(row.id)) {
        const stop = document.createElement('button'); stop.textContent = 'Stop'; stop.disabled = !!activeSimulations.get(row.id)?.signal.aborted; stop.onclick = () => stopRun(row.id); actions.append(stop);
      } else if (['error', 'stopped', 'interrupted'].includes(result.status)) {
        const retry = document.createElement('button'); retry.textContent = !isLastTurn ? 'Try in a new chat' : claudeReady && localClaudeAvailable ? 'Retry with Claude' : 'Reconnect Claude'; retry.disabled = activeSimulations.has(row.id) || simulationEnabled;
        retry.onclick = () => { if (!isLastTurn) { startNew(); provider = 'Claude'; setRoute('single'); textarea.value = turn.prompt; retainDraft(); } else if (claudeReady && localClaudeAvailable) void runClaude(row, turn); else connections(); }; actions.append(retry);
      }
      if (result.text) {
        actions.append(copyTextButton('Copy reply', result.text));
      }
      if (result.previousText) {
        const previous = document.createElement('details'); previous.className = 'perspective-details';
        const summary = document.createElement('summary'); summary.textContent = 'Previous attempt';
        const text = document.createElement('p'); text.className = 'message-text'; text.textContent = result.previousText;
        previous.append(summary, text); assistant.append(previous);
      }
      assistant.append(actions); conversation.append(assistant);
    } else if (turn.simulation) {
      const assistant = document.createElement('div'); assistant.className = 'message-assistant';
      const meta = document.createElement('p'); meta.className = 'message-meta'; meta.textContent = `${turn.simulation.council ? 'Council example' : 'Simulation'} · ${turn.simulation.status}`;
      const reply = document.createElement('p'); reply.className = 'message-text'; reply.textContent = turn.simulation.text || (turn.simulation.status === 'streaming' ? 'Responding…' : 'No simulated output.');
      simulationTextNodes.set(turn, reply);
      assistant.append(meta, reply);
      if (turn.simulation.council && turn.simulation.status === 'completed') {
        const fixture = turn.simulation.council;
        const title = document.createElement('h2'); title.textContent = fixture.title;
        assistant.insertBefore(title, reply);
        const perspectives = document.createElement('div'); perspectives.className = 'perspective-rows';
        for (const contribution of fixture.contributions) {
          const item = document.createElement('div'); item.className = 'perspective-row';
          const icon = document.createElement('i'); icon.setAttribute('data-lucide', contribution.perspective === 'Demand' ? 'users' : contribution.perspective === 'Operations' ? 'settings' : 'triangle-alert');
          const heading = document.createElement('strong'); heading.textContent = contribution.perspective;
          const body = document.createElement('p'); body.textContent = contribution.summary;
          item.append(icon, heading, body); perspectives.append(item);
        }
        const details = document.createElement('details'); details.className = 'perspective-details';
        const summary = document.createElement('summary'); summary.textContent = `${fixture.contributions.length} perspectives combined · View contributions`;
        const disclaimer = document.createElement('p'); disclaimer.textContent = 'Authored example contributions. No AI provider was contacted.';
        details.append(summary, disclaimer);
        for (const contribution of fixture.contributions) {
          const heading = document.createElement('h3'); heading.textContent = contribution.perspective;
          const body = document.createElement('p'); body.textContent = contribution.detail;
          details.append(heading, body);
        }
        assistant.append(perspectives, details);
      }
      if (turn.simulation.error) { const error = document.createElement('p'); error.textContent = turn.simulation.error; assistant.append(error); }
      if (turn.simulation.status === 'streaming' && activeSimulations.has(row.id)) {
        const stop = document.createElement('button'); stop.textContent = 'Stop simulation'; stop.disabled = !!activeSimulations.get(row.id)?.signal.aborted; stop.onclick = () => stopRun(row.id); assistant.append(stop);
      } else if (['error', 'stopped', 'interrupted'].includes(turn.simulation.status)) {
        const retry = document.createElement('button'); retry.textContent = 'Retry simulation'; retry.disabled = activeSimulations.has(row.id);
        retry.onclick = () => { void runChatSimulation(row, turn); }; assistant.append(retry);
      }
      if (turn.simulation.text) {
        const actions = document.createElement('div'); actions.className = 'reply-actions';
        actions.append(copyTextButton('Copy reply', turn.simulation.text)); assistant.append(actions);
      }
      conversation.append(assistant);
      createIcons({icons:{Users, Settings, TriangleAlert}});
    } else {
      const pending = document.createElement('div'); pending.className = 'message-pending';
      const status = document.createElement('span'); status.textContent = 'Saved locally · not sent';
      const setup = document.createElement('button'); setup.textContent = turn.mode === 'single' && turn.provider === 'Claude' && claudeReady && localClaudeAvailable ? 'Send to Claude' : 'Connect AI';
      if (!isLastTurn) setup.textContent = 'Try in a new chat';
      setup.disabled = simulationEnabled;
      setup.onclick = () => { if (!isLastTurn) { startNew(); provider = turn.provider || provider; setRoute(turn.mode === 'single' ? 'single' : 'auto'); textarea.value = turn.prompt; retainDraft(); } else if (turn.mode === 'single' && turn.provider === 'Claude' && claudeReady && localClaudeAvailable) void runClaude(row, turn); else connections(); };
      pending.append(status, setup); conversation.append(pending);
    }
  }
  renderedConversationId = row.id;
  conversation.scrollTop = readingPositions.restore(row.id, conversation);
  updateJumpToLatest();
}
function updateJumpToLatest() {
  const button = document.querySelector<HTMLButtonElement>('.jump-to-latest')!;
  button.setAttribute('aria-label', 'Jump to latest message');
  button.querySelector('span')!.textContent = 'Latest';
  button.hidden = conversation.hidden || conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 100;
  const composer = document.querySelector<HTMLElement>('.composer-card')!;
  button.style.bottom = `${composer.offsetHeight + 44}px`;
}
conversation.addEventListener('scroll', () => { if (renderedConversationId && !conversation.hidden) readingPositions.capture(renderedConversationId, conversation); updateJumpToLatest(); }, { passive: true });
new ResizeObserver(updateJumpToLatest).observe(document.querySelector('.composer-card')!);
window.addEventListener('resize', updateJumpToLatest);
document.querySelector('.jump-to-latest')!.addEventListener('click', () => { conversation.scrollTo({top:conversation.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); });
function configureChatSimulation() {
  openDialog(`<h2 id="dialog-title">Chat simulation</h2><p>Local mock replies. No model, credentials, or network requests.</p><label><input id="chat-simulation-enabled" type="checkbox" ${simulationEnabled ? 'checked' : ''}> Enable simulated replies in conversations</label><label for="chat-scenario">Scenario</label><select id="chat-scenario">${scenarios.map(s => `<option value="${s}" ${s === chatScenario ? 'selected' : ''}>${s.replaceAll('-', ' ')}</option>`).join('')}</select><p>Scenario changes apply to your next message or manual retry. Simulated messages remain labeled in history.</p>`);
  const update = () => {
    simulationEnabled = document.querySelector<HTMLInputElement>('#chat-simulation-enabled')!.checked;
    chatScenario = document.querySelector<HTMLSelectElement>('#chat-scenario')!.value as Scenario;
    document.querySelector('.simulation-toggle')!.textContent = simulationEnabled ? `Simulation · ${chatScenario.replaceAll('-', ' ')}` : 'Simulation off';
    document.querySelector('.composer-card')!.classList.toggle('simulation-active', simulationEnabled);
    setRoute(route); const row = rows.find(item => item.id === currentId); if (row) renderConversation(row); updateComposer();
  };
  document.querySelector('#chat-simulation-enabled')!.addEventListener('change', update);
  document.querySelector('#chat-scenario')!.addEventListener('change', update);
}
document.querySelector('.simulation-toggle')!.addEventListener('click', configureChatSimulation);
function launchMark(origin?: DOMRect) {
  const badge = document.createElement('div'); badge.className = 'launch-mark'; badge.setAttribute('role', 'status');
  badge.innerHTML = '<span class="launch-vehicle"><img src="/rivune-smooth-r.png" alt=""/><span class="launch-flame"></span></span><small>Simulating</small>';
  document.body.append(badge);
  const target = badge.getBoundingClientRect();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  if (!reduced && origin && origin.width) {
    badge.classList.add('launching');
    const animation = badge.animate([
      {transform:`translate(${origin.left-target.left}px,${origin.top-target.top}px) scale(1.6)`,opacity:1},
      {transform:`translate(${(origin.left-target.left)*.7}px,${(origin.top-target.top)*.8-30}px) scale(1.2)`,opacity:1,offset:.35},
      {transform:'translate(0,0) scale(1)',opacity:1}
    ], {duration:950,easing:'cubic-bezier(.3,0,.25,1)'});
    animation.onfinish = () => badge.classList.remove('launching');
  }
  return (status: string) => { badge.querySelector('small')!.textContent = `Simulation ${status}`; badge.classList.remove('launching'); setTimeout(() => badge.remove(), 1600); };
}
async function runChatSimulation(row: Conversation, turn: ConversationMessage, origin?: DOMRect) {
  if (activeSimulations.has(row.id) || !rows.includes(row)) return;
  try { if (!historyIsCurrent()) return; } catch { /* In-memory simulation remains available. */ }
  const controller = new AbortController(); activeSimulations.set(row.id, controller);
  const finishLaunch = document.documentElement.dataset.backdrop === 'quiet' ? (_status: string) => {} : launchMark(origin);
  const fixture = turn.simulation?.council;
  turn.simulation = { text: '', status: 'streaming', scenario: chatScenario, ...(fixture ? { council: fixture } : {}) };
  const result = turn.simulation;
  const history = (row.messages || [row]).slice(0, (row.messages || [row]).indexOf(turn)).flatMap(previous => [
    { role: 'user' as const, content: previous.prompt },
    ...(previous.simulation?.text ? [{ role: 'assistant' as const, content: previous.simulation.text }] : []),
  ]);
  save(); renderConversation(row); updateComposer();
  try {
    for await (const event of new MockProvider().stream({ prompt: turn.prompt, model: simulationModel, scenario: chatScenario, signal: controller.signal, history, ...(fixture ? { fixtureText: fixture.summary } : {}) })) {
      if (!rows.includes(row)) { controller.abort(); break; }
      if (event.type === 'text') result.text += event.text;
      else if (event.type === 'tool') result.text += `Simulated tool: ${event.name}\n`;
      save();
      if (currentId === row.id) { const follow = atLatest(conversation); const textNode = simulationTextNodes.get(turn); if (textNode?.isConnected) textNode.textContent = result.text; else renderConversation(row); if (follow) conversation.scrollTop = conversation.scrollHeight; updateJumpToLatest(); }
    }
    result.status = 'completed';
  } catch (error) {
    result.status = controller.signal.aborted ? 'stopped' : 'error';
    if (!controller.signal.aborted) result.error = error instanceof Error ? error.message : 'Simulation failed.';
  } finally {
    finishLaunch(result.status);
    activeSimulations.delete(row.id); if (rows.includes(row)) { save(); renderConversation(row); } updateComposer();
  }
}
async function runClaude(row: Conversation, turn: ConversationMessage) {
  if (simulationEnabled || !localClaudeAvailable || !claudeReady || activeSimulations.has(row.id) || !rows.includes(row) || turn.provider !== 'Claude' || turn.mode !== 'single') return;
  try { if (!historyIsCurrent()) return; } catch { notify('Saving is unavailable. Keep your draft until local storage is available.'); return; }
  if (activeClaudeId() && activeClaudeId() !== row.id) { notify('Claude is replying in another chat. Open its active reply to stop it or wait for it to finish.'); return; }
  const turns = row.messages || [row]; const index = turns.indexOf(turn);
  if (index < 0 || index !== turns.length - 1) { notify('Try this earlier message in a new chat to preserve the conversation that followed it.'); return; }
  const history = claudeHistory(turns, index);
  if (history.reduce((size, message) => size + message.content.length, turn.prompt.length) > 48000) { notify('This conversation is too long for the Claude adapter. Start a new chat; your existing history is kept.'); return; }
  const controller = new AbortController(); activeSimulations.set(row.id, controller);
  const previous = turn.reply;
  turn.reply = beginClaudeReply(claudeModel, previous);
  const result = turn.reply;
  if (!save()) { turn.reply = previous; activeSimulations.delete(row.id); notify('Save this conversation before sending it to Claude.'); return; }
  renderConversation(row); if (currentId === row.id) conversation.scrollTop = conversation.scrollHeight; updateComposer();
  try {
    for await (const event of new ClaudeProvider().stream({ prompt: turn.prompt, model: result.requestedModel, history, signal: controller.signal })) {
      if (!rows.includes(row)) { controller.abort(); break; }
      if (event.type === 'text') result.text += event.text;
      if (event.type === 'metadata') {
        if (event.model !== undefined) result.model = event.model;
        if (event.inputTokens !== undefined) result.inputTokens = event.inputTokens;
        if (event.outputTokens !== undefined) result.outputTokens = event.outputTokens;
      }
      save();
      if (currentId === row.id) {
        const nearBottom = atLatest(conversation);
        const node = simulationTextNodes.get(turn); if (node?.isConnected) node.textContent = result.text || 'Waiting for Claude…';
        updateJumpToLatest();
        if (nearBottom) conversation.scrollTop = conversation.scrollHeight;
      }
    }
    result.status = controller.signal.aborted ? 'stopped' : 'completed';
  } catch (error) {
    result.status = controller.signal.aborted ? 'stopped' : 'error';
    if (!controller.signal.aborted) result.error = error instanceof Error ? error.message : 'Claude could not finish. Check Connections and try again.';
  } finally {
    activeSimulations.delete(row.id); if (rows.includes(row)) { save(); renderConversation(row); } updateComposer();
  }
}
function renderHistory() {
  const filter = sidebarSearchActive ? sidebarSearchQuery.trim().toLowerCase() : '';
  document.documentElement.dataset.environment = currentId ? 'focused' : 'idle';
  document.querySelector<HTMLButtonElement>('#chat-actions')!.disabled = !currentId;
  const history = document.querySelector('#history')!; history.replaceChildren();
  const matches = rows.filter(row => !row.archived && (sidebarSearchActive || !selectedProjectId || row.projectId === selectedProjectId) && (!filter || conversationSearchText(row).some(text => text.toLowerCase().includes(filter))));
  const visible = showAllHistory || filter ? matches : matches.slice(0, 8);
  const active = matches.find(row => row.id === currentId);
  if (active && !visible.includes(active)) visible.push(active);
  if (!visible.length) { const p = document.createElement('p'); p.className = 'empty-history'; p.textContent = filter ? 'No matching conversations.' : 'Your conversations will appear here.'; history.append(p); }
  visible.forEach(row => {
    const item = document.createElement('div'); item.className = 'history-row';
    const button = document.createElement('button'); button.className = 'history-title'; button.title = row.prompt;
    const title = document.createElement('span'); title.className = 'history-title-text'; title.textContent = row.prompt === councilDemoPrompt ? 'A neighborhood café' : row.prompt.slice(0, 80); button.append(title);
    if (filter) {
      const text = conversationSearchText(row).find(text => text.toLowerCase().includes(filter)) || row.prompt;
      const offset = Math.max(0, text.toLowerCase().indexOf(filter) - 28);
      const snippet = document.createElement('small'); snippet.className = 'history-search-snippet';
      snippet.textContent = `${offset ? '…' : ''}${text.slice(offset, offset + 115).replace(/\s+/g, ' ')}${text.length > offset + 115 ? '…' : ''}`;
      button.append(snippet);
    }
    button.classList.toggle('selected', row.id === currentId); if (row.id === currentId) button.setAttribute('aria-current', 'page'); button.onclick = () => { show(row); textarea.focus(); };
    const actions = document.createElement('button'); actions.className = 'history-actions'; actions.textContent = '⋯'; actions.setAttribute('aria-label', `Actions for ${row.prompt.slice(0, 48)}`); actions.setAttribute('aria-haspopup', 'dialog'); actions.setAttribute('aria-expanded', 'false'); actions.onclick = () => conversationMenu(row, actions);
    item.append(button, actions); history.append(item);
  });
  if (matches.length > 8 && !filter) { const more = document.createElement('button'); more.className = 'history-more'; more.textContent = showAllHistory ? 'Show recent' : `Show all ${matches.length} chats`; more.onclick = () => { showAllHistory = !showAllHistory; renderHistory(); }; history.append(more); }
  document.querySelector('.tag')!.textContent = String(matches.length);
  document.querySelector('.nav-label')!.firstChild!.textContent = sidebarSearchActive && filter ? 'Search results ' : 'Recent chats ';
  const status = document.querySelector('#conversation-search-status');
  if (status) status.textContent = filter ? `${matches.length} matching ${matches.length === 1 ? 'conversation' : 'conversations'}` : 'Search recent conversations';
}
function startNew() {
  if (renderedConversationId && !conversation.hidden) readingPositions.capture(renderedConversationId, conversation);
  renderedConversationId = null;
  document.querySelectorAll('.launch-mark').forEach(mark => mark.remove());
  retainDraft(); currentId = null; rememberWorkspace(); restoreDraft(); conversation.hidden = true;
  document.querySelector('.hero')!.classList.remove('compact'); document.querySelector('.suggestions')!.classList.remove('hidden');
  document.querySelector('.breadcrumbs > span')!.textContent = 'New conversation'; setRoute(route); renderHistory(); textarea.focus();
  updateJumpToLatest();
}
function send(fixture?: CouncilDemo) {
  if (activeSimulations.has(currentId || '')) return;
  if (draftConflicts.has(currentId || 'new')) { notify('Resolve the draft conflict before sending. Export this window’s copy to keep your changes.'); return; }
  const prompt = textarea.value.trim(); if (!prompt) { textarea.focus(); return; }
  const existing = rows.find(row => row.id === currentId);
  const sendLive = canSendClaude();
  if (sendLive && activeClaudeId()) { notify('Claude is replying in another chat. Use View active reply to return to it.'); return; }
  if (sendLive && attachmentDrafts.get(currentId || 'new')?.length) { notify('Claude chat cannot receive files yet. Remove the preview attachments before sending.'); return; }
  if (!existing && rows.length >= 50) { notify('This preview holds 50 conversations. Export and clear them in Settings before adding more.'); return; }
  if (existing && (existing.messages?.length || 1) >= 100) { notify('This conversation holds 100 saved messages. Start a new conversation.'); return; }
  const turn: ConversationMessage = { prompt, mode: route === 'single' ? 'single' as const : 'pending' as const, createdAt: Date.now(), ...(route === 'single' ? { provider } : {}) };
  if (fixture) { turn.mode = 'council'; turn.simulation = {text:'', status:'streaming', council:fixture}; }
  const row: Conversation = existing || { id: crypto.randomUUID(), ...turn, ...(selectedProjectId ? { projectId: selectedProjectId } : {}) };
  const selectedRoute = route; const selectedProvider = provider; const oldKey = currentId || 'new';
  const saved = commitMessage(rows, row, turn, save);
  if (!saved) { notify('Message was not sent. Your draft is still here; resolve the storage issue before retrying.'); updateComposer(); return; }
  textarea.value = ''; retainDraft();
  if (attachmentDrafts.has(oldKey) && oldKey !== row.id) { attachmentDrafts.set(row.id, attachmentDrafts.get(oldKey)!); attachmentDrafts.delete(oldKey); }
  const launchOrigin = document.querySelector('.floating-mark')!.getBoundingClientRect();
  show(row); provider = selectedProvider; setRoute(selectedRoute); updateComposer();
  if (simulationEnabled) { void runChatSimulation(row, turn, launchOrigin); }
  else if (sendLive && saved) { void runClaude(row, turn); }
  else if (saved) notify('Message saved locally · not sent.');
}
document.querySelector('.send')!.addEventListener('click', () => { const id = currentId || ''; if (activeSimulations.has(id)) stopRun(id); else send(); });
textarea.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(); } });
document.querySelector('.new-thread')!.addEventListener('click', startNew);
document.querySelectorAll<HTMLButtonElement>('.suggestions button').forEach(button => button.addEventListener('click', () => {
  const prompts: Record<string, string> = { compare: 'Help me compare different perspectives on this question: ', build: 'Help me turn this project into a practical plan, then build it step by step: ', explore: 'Help me explore this idea. Ask useful questions and suggest possibilities I might have missed: ' };
  const suggestion = prompts[button.dataset.template || 'explore'];
  textarea.value = (textarea.value ? textarea.value + '\n' : '') + suggestion; textarea.value = textarea.value.slice(0, 12000); retainDraft(); textarea.focus();
}));
function openDialog(html: string) { closePopover(); dialogBody.innerHTML = html; if (!dialog.open) dialog.showModal(); }
function simulation() {
  openDialog(`<h2 id="dialog-title">Developer simulation</h2><p>Mock provider · local only · no API charges</p>
    <label for="mock-model">Simulated model</label><select id="mock-model"><option>Mock OpenAI</option><option>Mock Anthropic</option><option>Mock Gemini</option><option>Mock Grok</option></select>
    <label for="mock-scenario">Scenario</label><select id="mock-scenario">${scenarios.map(s => `<option value="${s}">${s.replaceAll('-', ' ')}</option>`).join('')}</select>
    <label for="mock-prompt">Test request</label><input id="mock-prompt" maxlength="12000" value="Explain how this simulated connection works.">
    <button id="mock-run">Run simulation</button><button id="mock-stop" disabled>Stop</button><button id="mock-retry" hidden>Retry simulation</button>
    <p id="mock-status" role="status">Ready. Results are temporary.</p><pre id="mock-output" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><p id="mock-usage"></p>`);
  const run = dialogBody.querySelector<HTMLButtonElement>('#mock-run')!;
  const stop = dialogBody.querySelector<HTMLButtonElement>('#mock-stop')!;
  const retry = dialogBody.querySelector<HTMLButtonElement>('#mock-retry')!;
  const prompt = dialogBody.querySelector<HTMLInputElement>('#mock-prompt')!;
  const model = dialogBody.querySelector<HTMLSelectElement>('#mock-model')!;
  const scenario = dialogBody.querySelector<HTMLSelectElement>('#mock-scenario')!;
  const status = dialogBody.querySelector('#mock-status')!;
  const output = dialogBody.querySelector('#mock-output')!;
  const usage = dialogBody.querySelector('#mock-usage')!;
  let controller: AbortController | undefined;
  const cleanup = () => controller?.abort();
  dialog.addEventListener('close', cleanup, { once: true });
  async function start() {
    if (!prompt.value.trim()) { status.textContent = 'Enter a test request.'; return; }
    controller = new AbortController();
    run.disabled = prompt.disabled = model.disabled = scenario.disabled = true;
    stop.disabled = false; retry.hidden = true; output.textContent = ''; usage.textContent = ''; status.textContent = 'Simulating…';
    try {
      for await (const event of new MockProvider().stream({ prompt: prompt.value, model: model.value, scenario: scenario.value as Scenario, signal: controller.signal })) {
        if (event.type === 'text') output.textContent += event.text;
        else if (event.type === 'tool') output.textContent += `Simulated tool: ${event.name}\n`;
        else usage.textContent = `Fixture tokens: ${event.input} input · ${event.output} output · $0 API cost`;
      }
      status.textContent = 'Simulation complete. No live provider was contacted.';
    } catch (error) {
      if (controller.signal.aborted) status.textContent = 'Simulation stopped. Partial output kept.';
      else { status.textContent = error instanceof Error ? error.message : 'Simulation failed.'; retry.hidden = !(error instanceof ProviderError && error.retryable); }
    } finally { run.disabled = prompt.disabled = model.disabled = scenario.disabled = false; stop.disabled = true; }
  }
  run.onclick = start; retry.onclick = start; stop.onclick = cleanup;
}
function useClaudeConnection() {
  provider = 'Claude'; simulationEnabled = false;
  document.querySelector('.simulation-toggle')!.textContent = 'Simulation off'; document.querySelector('.composer-card')!.classList.remove('simulation-active');
  setRoute('single'); closePopover(); textarea.focus();
  const row = rows.find(item => item.id === currentId); if (row) renderConversation(row);
}
function renderConnectionAccounts(container: Element) {
  container.replaceChildren();
  for (const name of ['Codex', 'Claude', 'Gemini', 'Grok']) {
    const checked = checkedAccounts.find(account => account.name === name);
    const row = document.createElement('div'); row.className = 'connection-account';
    const copy = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = name;
    const status = document.createElement('small');
    status.textContent = checked?.state || (name === 'Claude' && claudeReady ? 'Account verified this session' : name === 'Grok' ? 'Adapter not available yet' : 'Account not checked');
    copy.append(title, status);
    if (name !== 'Claude') {
      const support = document.createElement('small'); support.textContent = 'Replies not connected in this build'; copy.append(support);
    }
    row.append(providerMark(name), copy);
    if (name === 'Claude' && claudeReady) {
      const use = document.createElement('button'); use.textContent = 'Use Claude'; use.onclick = useClaudeConnection; row.append(use);
    }
    container.append(row);
  }
}
function connections() {
  if (dialog.open) dialog.close();
  const panel = openPopover(document.querySelector<HTMLElement>('.model-pill')!, 'Connections');
  panel.classList.add('connections-popover');
  panel.innerHTML = `<strong class="popover-heading">Connections</strong><p>Use your existing AI accounts.</p>
    <div id="connection-results" aria-live="polite"></div>
    <button id="check-connections">Check AI accounts</button><p id="connection-note"></p>
    <details><summary>Sign-in help</summary><p>Codex: run <code>codex login</code>. Claude: run <code>claude auth login</code> and choose your Claude account, then check again. API-key authentication is not accepted by this chat adapter.</p><p>Gemini and Antigravity adapters are not connected in this build.</p><p>Grok: no supported CLI adapter is available in this build. A Grok web account alone does not connect it to Rivune.</p></details>
    <button id="open-simulation">Developer simulation</button><details><summary>API connections · optional</summary><p>OpenRouter brings multiple model providers into one API. Fireworks serves open and customized models. Both use separate API billing.</p><button id="open-gateway-preview">Preview OpenRouter &amp; Fireworks</button><p>Local simulations only. Live API setup remains off.</p></details>
    `;
  document.querySelector('#open-simulation')!.addEventListener('click', simulation);
  panel.querySelector('#open-gateway-preview')!.addEventListener('click', () => openGatewayPreview(document.querySelector<HTMLElement>('.model-pill')!));
  const results = document.querySelector('#connection-results')!;
  renderConnectionAccounts(results);
  const note = document.querySelector('#connection-note')!;
  const button = document.querySelector<HTMLButtonElement>('#check-connections')!;
  note.textContent = platform.runtime === 'tauri' ? 'Checks installation and sign-in only. Does not send a prompt or use API billing.' : 'Account checks are not available in this build. Your conversations still stay on this device.';
  const localCheckAvailable = platform.capabilities.connectionChecks;
  button.disabled = !localCheckAvailable || checkingAccounts;
  if (checkingAccounts) button.textContent = 'Checking…';
  else if (checkedAccounts.length) button.textContent = 'Check again';
  if (platform.runtime === 'browser' && localCheckAvailable) note.textContent = 'Local development check · installation and sign-in only. No model request.';
  button.onclick = async () => {
    checkingAccounts = true; button.disabled = true; button.textContent = 'Checking…';
    claudeReady = false; checkedAccounts = []; renderConnectionAccounts(results); setRoute(route);
    try {
      const connections = await platform.checkConnections();
      checkedAccounts = connections;
      claudeReady = localClaudeAvailable && connections.some(connection => connection.name === 'Claude' && connection.canChat === true);
      setRoute(route);
      if (!results.isConnected) return;
      renderConnectionAccounts(results);
      note.textContent = claudeReady ? 'Claude account verified. Use Claude to send text through the local development adapter. Replies use your account allowance. Files and tools are disabled.' : 'Checked just now. Sign-in checks do not send a prompt. Other provider reply adapters remain unfinished.';
    } catch { note.textContent = 'Account check could not finish. Try again; your chats are safe.'; }
    finally {
      checkingAccounts = false; button.disabled = false; button.textContent = 'Check again';
      const currentResults = document.querySelector('#connection-results');
      if (currentResults && currentResults !== results) {
        renderConnectionAccounts(currentResults);
        const currentButton = document.querySelector<HTMLButtonElement>('#check-connections');
        if (currentButton) { currentButton.disabled = false; currentButton.textContent = 'Check again'; }
      }
    }
  };
}
document.querySelector('.model-pill')!.addEventListener('click', connections);
document.querySelector('.team-summary')!.addEventListener('click', () => { chooseProvider(); });
document.querySelector('.dialog-close')!.addEventListener('click', () => dialog.close());
document.querySelectorAll<HTMLButtonElement>('.nav-item').forEach(button => button.addEventListener('click', () => {
  const name = button.querySelector('span')?.textContent;
  if (name === 'Connections') connections();
  else if (name === 'Archived') { settings('archives'); }
  else if (name === 'Plugins') openDialog('<h2 id="dialog-title">Plugins</h2><p>Plugin management is planned. No plugins are installed or executed by this preview.</p>');
  else if (name === 'Projects') openProjects(id => { startNew(); selectedProjectId = id; try { if (id) storage.setItem('rivune.selected-project', id); else storage.removeItem('rivune.selected-project'); } catch { /* Session only. */ } document.querySelector('.breadcrumbs > span')!.textContent = getProjectName(id) || 'New conversation'; renderHistory(); }, selectedProjectId);
  else if (name === 'Search') search();
  else if (name === 'Conversations') { renderHistory(); document.querySelector<HTMLButtonElement>('#history button')?.focus(); notify(`${rows.length} saved conversations in the sidebar.`); }
  else startNew();
}));
function conversationSearchText(row: Conversation): string[] {
  return [row.prompt, ...(row.messages || [row]).flatMap(turn => {
    const council = turn.simulation?.council;
    return [turn.prompt, turn.reply?.text || '', turn.simulation?.text || '', ...(council ? [council.title, council.summary, ...council.contributions.flatMap(item => [item.perspective, item.summary, item.detail])] : [])];
  })];
}
function closeConversationSearch(restoreFocus = true) {
  sidebarSearchActive = false; sidebarSearchQuery = '';
  document.querySelector('.shell')!.classList.remove('search-active');
  document.querySelector('#conversation-search-form')?.remove();
  const trigger = document.querySelector<HTMLButtonElement>('.conversation-search-trigger');
  if (trigger) trigger.hidden = false;
  renderHistory();
  if (restoreFocus) {
    const target = sidebarSearchReturnFocus?.isConnected ? sidebarSearchReturnFocus : trigger;
    target?.focus();
  }
  sidebarSearchReturnFocus = null;
}
function search() {
  closePopover();
  const shell = document.querySelector('.shell')!;
  shell.classList.remove('sidebar-small'); shell.classList.add('search-active');
  document.querySelector('.collapse')!.setAttribute('aria-label', 'Collapse sidebar');
  const existing = document.querySelector<HTMLInputElement>('#conversation-search');
  if (existing) { existing.focus(); existing.select(); return; }
  sidebarSearchReturnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body && document.activeElement !== document.documentElement ? document.activeElement : null;
  sidebarSearchActive = true;
  const trigger = [...document.querySelectorAll<HTMLButtonElement>('.sidebar nav .nav-item')].find(button => button.querySelector('span')?.textContent === 'Search')!;
  trigger.classList.add('conversation-search-trigger'); trigger.hidden = true;
  const form = document.createElement('form'); form.id = 'conversation-search-form'; form.setAttribute('role', 'search'); form.setAttribute('aria-label', 'Search conversations');
  const icon = document.createElement('span'); icon.className = 'conversation-search-icon'; icon.setAttribute('aria-hidden', 'true');
  const existingIcon = trigger.querySelector('svg'); if (existingIcon) icon.append(existingIcon.cloneNode(true));
  const input = document.createElement('input'); input.id = 'conversation-search'; input.type = 'search'; input.placeholder = 'Search chats'; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Search conversations'); input.setAttribute('aria-controls', 'history'); input.setAttribute('aria-describedby', 'conversation-search-status');
  const close = document.createElement('button'); close.type = 'button'; close.className = 'conversation-search-close'; close.textContent = '×'; close.setAttribute('aria-label', 'Close conversation search'); close.title = 'Close search · Esc'; close.onclick = () => closeConversationSearch();
  const status = document.createElement('span'); status.id = 'conversation-search-status'; status.setAttribute('role', 'status');
  form.append(icon, input, close, status); trigger.before(form);
  input.oninput = () => { sidebarSearchQuery = input.value; renderHistory(); };
  form.onsubmit = event => { event.preventDefault(); document.querySelector<HTMLButtonElement>('#history .history-title')?.click(); };
  input.onkeydown = event => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); document.querySelector<HTMLButtonElement>('#history .history-title')?.focus(); }
  };
  renderHistory(); input.focus();
}
document.querySelector('#history')!.addEventListener('keydown', event => {
  const keyboard = event as KeyboardEvent;
  if (!sidebarSearchActive || keyboard.isComposing || !['ArrowUp', 'ArrowDown'].includes(keyboard.key)) return;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('#history .history-title')];
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  keyboard.preventDefault();
  if (keyboard.key === 'ArrowUp' && index === 0) document.querySelector<HTMLInputElement>('#conversation-search')?.focus();
  else buttons[Math.min(buttons.length - 1, index + (keyboard.key === 'ArrowDown' ? 1 : -1))]?.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && sidebarSearchActive && !event.defaultPrevented && !event.isComposing && !dialog.open) {
    event.preventDefault(); closeConversationSearch();
  }
});
document.querySelector('.breadcrumbs button')!.setAttribute('aria-label', 'Search conversations');
document.querySelector('.breadcrumbs button')!.addEventListener('click', search);
document.querySelector('.collapse')!.addEventListener('click', () => { if (sidebarSearchActive) closeConversationSearch(false); document.querySelector('.shell')!.classList.toggle('sidebar-small'); const b = document.querySelector('.collapse')!; b.setAttribute('aria-label', document.querySelector('.sidebar-small') ? 'Expand sidebar' : 'Collapse sidebar'); });
// Stillwater is the sole environment; previous scene selections do not rotate it.
document.documentElement.dataset.worldScene = 'ocean';
document.documentElement.dataset.backdrop = 'ocean';
document.documentElement.dataset.worlds = 'true';
mountWorlds();
function applyMotion(value: string) { document.documentElement.dataset.motion = value === 'off' ? 'off' : 'slow'; }
applyMotion('off');
try { const value = storage.getItem('rivune.motion'); if (value && ['off','slow','normal'].includes(value)) applyMotion(value); } catch { /* session settings remain usable */ }
function settings(category = 'appearance') {
  unsubscribeUpdates?.();
  openDialog(`<h2 id="dialog-title">Settings</h2><div class="settings-layout"><nav class="settings-nav" aria-label="Settings categories">
    <button data-settings="account">Account</button><button data-settings="connections">AI connections</button><button data-settings="appearance">Appearance</button><button data-settings="archives">Archived chats</button><button data-settings="data">Data & privacy</button><button data-settings="keyboard">Keyboard</button><button data-settings="updates">Updates</button>
  </nav><div class="settings-content">
  <section data-panel="account"><h3>Your Rivune account</h3><div class="account-summary"><span class="account-avatar">R</span><div><strong>Local workspace</strong><p>Not signed in</p></div></div><p>Your Rivune account will appear at the bottom of the sidebar when you sign in. It is separate from your connected AI services.</p><p>Account sign-in is not available in this preview. Your saved conversations currently belong to this device.</p><button id="open-setup">Open setup</button></section>
  <section data-panel="connections"><h3>Your AI connections</h3><p>Manage account connections and optional API access in one place.</p><button id="manage-connections">Open AI setup</button></section>
  <section data-panel="appearance"><h3>Make yourself comfortable</h3><label for="reading-size">Conversation text</label><select id="reading-size"><option value="16">Compact</option><option value="17">Default</option><option value="19">Large</option><option value="21">Larger</option></select><p>Stillwater · dark water, distant mountains, a quiet night sky.</p><label for="motion">Environment motion</label><select id="motion"><option value="off">Still</option><option value="slow">Gentle reflections</option></select><p>The viewpoint stays still. Gentle water reflections pause during conversations. Your system’s reduced-motion setting takes priority.</p></section>
  <section data-panel="archives"><h3>Archived chats</h3><p>Open a conversation or restore it to Recent chats.</p><div id="settings-archives"></div></section>
  <section data-panel="data"><h3>Data & privacy</h3><p>Conversations are saved on this device, without encryption. Sending through a connected Claude account shares your prompt and completed Claude exchanges in that conversation with Claude. Simulation stays on this device. No passwords or API keys are stored in chat history.</p><p>This preview holds up to 50 conversations.</p><button id="export">Export conversations</button><button id="clear">Clear saved conversations</button></section>
  <section data-panel="updates"><h3>Keep Rivune up to date</h3><p>Version ${packageInfo.version}</p><p id="update-status" role="status">Loading update availability…</p><button id="check-updates" disabled>Check for updates</button><button id="install-update" hidden>Install and restart</button><p>Updates include the interface and the app. Your saved chats and settings stay on this device.</p></section>
  <section data-panel="keyboard"><h3>Keyboard shortcuts</h3><div class="connection-row"><strong>Settings</strong><kbd>⌘ / Ctrl + ,</kbd></div><div class="connection-row"><strong>New conversation</strong><kbd>⌘ / Ctrl + N</kbd></div><div class="connection-row"><strong>Search</strong><kbd>⌘ / Ctrl + K</kbd></div><div class="connection-row"><strong>Send or save message</strong><kbd>Enter</kbd></div><div class="connection-row"><strong>New line</strong><kbd>Shift + Enter</kbd></div><div class="connection-row"><strong>Archive conversation</strong><kbd>⌘ / Ctrl + Shift + A</kbd></div><div class="connection-row"><strong>Delete conversation (confirm)</strong><kbd>⌘ / Ctrl + Shift + Backspace</kbd></div><div class="connection-row"><strong>Close dialog</strong><kbd>Esc</kbd></div></section>
  <p id="storage-status" role="status"></p></div></div>`);
  const selectCategory = (name: string) => {
    dialogBody.querySelectorAll<HTMLElement>('[data-panel]').forEach(panel => panel.hidden = panel.dataset.panel !== name);
    dialogBody.querySelectorAll<HTMLButtonElement>('[data-settings]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.settings === name)); });
  };
  selectCategory(category);
  const updateStatus = dialogBody.querySelector<HTMLElement>('#update-status')!;
  const checkUpdate = dialogBody.querySelector<HTMLButtonElement>('#check-updates')!;
  const installUpdate = dialogBody.querySelector<HTMLButtonElement>('#install-update')!;
  void appUpdates.then(controller => {
    if (!updateStatus.isConnected) return;
    unsubscribeUpdates = controller.subscribe(state => {
      updateStatus.textContent = state.message;
      checkUpdate.disabled = ['unconfigured','checking','installing'].includes(state.phase);
      installUpdate.hidden = state.phase !== 'available';
    });
    checkUpdate.onclick = () => { void controller.check(); };
    installUpdate.onclick = () => { retainDraft(); void controller.install(); };
  }).catch(() => { updateStatus.textContent = 'Updates are unavailable in this build.'; });
  document.querySelector('#open-setup')!.addEventListener('click', () => { dialog.close(); launchOnboarding(true); });
  document.querySelector('#manage-connections')!.addEventListener('click', connections);
  dialogBody.querySelectorAll<HTMLButtonElement>('[data-settings]').forEach(button => button.onclick = () => selectCategory(button.dataset.settings!));
  const motion = document.querySelector<HTMLSelectElement>('#motion')!; motion.value = document.documentElement.dataset.motion || 'slow';
  const reading = document.querySelector<HTMLSelectElement>('#reading-size')!; reading.value = document.documentElement.style.getPropertyValue('--reading-size').replace('px', '') || '17';
  reading.onchange = () => { document.documentElement.style.setProperty('--reading-size', `${reading.value}px`); try { storage.setItem('rivune.reading-size', reading.value); } catch { document.querySelector('#storage-status')!.textContent = 'Text size changed for this session only.'; } };
  renderSettingsArchives(document.querySelector('#settings-archives')!);
  motion.onchange = () => { applyMotion(motion.value); try { storage.setItem('rivune.motion', motion.value); } catch { document.querySelector('#storage-status')!.textContent = 'Motion changed for this session only.'; } };
  document.querySelector('#export')!.addEventListener('click', () => downloadJson(rows, 'rivune-conversations.json'));
  document.querySelector('#clear')!.addEventListener('click', () => {
    const button = document.querySelector<HTMLButtonElement>('#clear')!;
    if (button.dataset.confirm !== 'yes') { button.dataset.confirm = 'yes'; button.textContent = 'Confirm: delete all saved conversations'; return; }
    try { if (!historyIsCurrent()) { dialog.close(); return; } storage.removeItem(storageKey); historyBaseline = null; for (const controller of activeSimulations.values()) controller.abort(); activeSimulations.clear(); removeStoredDrafts(rows.map(row => row.id)); for (const row of rows) attachmentDrafts.delete(row.id); rows = []; currentId = null; textarea.value = drafts.get('new') || ''; retainDraft(); startNew(); dialog.close(); notify('Saved conversations cleared.'); } catch { document.querySelector('#storage-status')!.textContent = 'Could not clear stored conversations. Please try again.'; }
  });
}
document.addEventListener('rivune:settings', () => settings());
document.querySelector('.profile')!.addEventListener('click', () => settings());
document.querySelector('.account-control')!.addEventListener('click', event => { const panel = openPopover(event.currentTarget as HTMLElement, 'Account menu'); for (const [label, category] of [['Account', 'account'], ['Settings', 'appearance'], ['Archived chats', 'archives'], ['AI connections', 'connections']]) { const button = document.createElement('button'); button.textContent = label; button.onclick = () => { closePopover(); settings(category); }; panel.append(button); } });
document.addEventListener('keydown', event => {
  if (!(event.metaKey || event.ctrlKey) || document.querySelector('dialog[open]')) return;
  if (event.shiftKey && event.key.toLowerCase() === 'a') { event.preventDefault(); const row = rows.find(item => item.id === currentId); if (row) archiveChat(row); return; }
  if (event.shiftKey && event.key === 'Backspace') { event.preventDefault(); const row = rows.find(item => item.id === currentId); if (row) void deleteChat(row); return; }
  if (event.key.toLowerCase() === 'k') { event.preventDefault(); search(); }
  if (event.key.toLowerCase() === 'n') { event.preventDefault(); startNew(); }
  if (event.key === ',') { event.preventDefault(); settings(); }
});
renderHistory(); restoreDraft();
try {
  const workspace = JSON.parse(storage.getItem('rivune.workspace.v1') || 'null');
  if (workspace) {
    if (['Codex', 'Claude', 'Gemini', 'Grok'].includes(workspace.provider)) provider = workspace.provider;
    const previous = rows.find(row => row.id === workspace.currentId);
    if (previous) show(previous);
    if (['Codex', 'Claude', 'Gemini', 'Grok'].includes(workspace.provider)) provider = workspace.provider;
    setRoute(workspace.route === 'single' ? 'single' : 'auto');
  }
} catch { /* Ignore invalid workspace state; saved conversations remain accessible. */ }
setRoute(route);

function syncEnvironmentVisibility() { document.documentElement.dataset.pageHidden = String(document.hidden); }
document.addEventListener('visibilitychange', syncEnvironmentVisibility);
syncEnvironmentVisibility();

window.addEventListener('rivune:open-connections', connections);
launchOnboarding();

window.addEventListener('pagehide', () => {
  if (!activeSimulations.size) return;
  for (const [id, controller] of activeSimulations) {
    controller.abort();
    const row = rows.find(item => item.id === id);
    for (const turn of row?.messages || []) {
      if (turn.simulation?.status === 'streaming') turn.simulation.status = 'interrupted';
      if (turn.reply?.status === 'responding') turn.reply.status = 'interrupted';
    }
  }
  save();
});

document.querySelector('#export-recovery')!.addEventListener('click', () => {
  downloadJson({ conversations: rows, drafts: Object.fromEntries(drafts) }, 'rivune-window-recovery.json');
});
document.querySelector('#reload-workspace')!.addEventListener('click', () => {
  openDialog('<h2 id="dialog-title">Reload saved chats?</h2><p>Changes saved by the other window will replace this window’s conversation state. Export this copy first if it contains messages you want to keep.</p><button id="confirm-reload">Reload saved chats</button>');
  document.querySelector('#confirm-reload')!.addEventListener('click', () => location.reload());
});
window.addEventListener('storage', event => { if (event.key === storageKey && event.newValue !== historyBaseline) document.querySelector<HTMLElement>('#history-conflict')!.hidden = false; });

function archiveChat(row: Conversation) {
  if (!historyIsCurrent()) return;
  const previous = row.archived; row.archived = !row.archived;
  if (!save()) { row.archived = previous; return; }
  closePopover(); if (row.archived && currentId === row.id) startNew(); else renderHistory(); notify(row.archived ? 'Chat archived.' : 'Chat restored.');
}
async function deleteChat(row: Conversation) {
  closePopover(); if (!await confirmDeleteConversation(row.prompt)) return;
  try {
    if (!historyIsCurrent()) return;
    const index = rows.indexOf(row); if (index < 0) return;
    rows.splice(index, 1);
    if (!save()) { rows.splice(index, 0, row); return; }
    activeSimulations.get(row.id)?.abort(); activeSimulations.delete(row.id);
    removeStoredDrafts([row.id]); attachmentDrafts.delete(row.id); readingPositions.forget(row.id);
    if (currentId === row.id) { currentId = null; textarea.value = drafts.get('new') || ''; startNew(); }
    else renderHistory();
    notify('Chat deleted from this device.');
  } catch { notify('Could not finish deleting this chat. Reload to check saved history.'); }
}
function conversationMenu(row: Conversation, anchor: HTMLElement) {
  const panel = openPopover(anchor, 'Conversation actions');
  const turns = row.messages || [row];
  if (turns.length > 1) {
    const jump = document.createElement('button'); jump.textContent = 'Jump to message…';
    jump.onclick = () => {
      const list = openPopover(anchor, 'Jump to message'); list.classList.add('message-outline');
      turns.forEach((turn, index) => {
        const item = document.createElement('button'); item.textContent = `${index + 1}. ${turn.prompt.replace(/\s+/g, ' ').slice(0, 110)}`;
        item.onclick = () => { closePopover(); if (currentId !== row.id) show(row); const target = conversation.querySelector<HTMLElement>(`[data-turn-index="${index}"]`); if (!target) return; conversation.scrollTo({top: conversation.scrollTop + target.getBoundingClientRect().top - conversation.getBoundingClientRect().top - 20, behavior: 'instant'}); target.focus({preventScroll:true}); updateJumpToLatest(); };
        list.append(item);
      });
    }; panel.append(jump);
  }
  for (const [label, action] of [['Export chat', () => { closePopover(); downloadConversation(row); }], [row.archived ? 'Restore chat' : 'Archive chat', () => archiveChat(row)], ['Delete chat…', () => { void deleteChat(row); }]] as [string, () => void][]) {
    const button = document.createElement('button'); button.textContent = label;
    if (label.startsWith('Delete')) button.className = 'destructive-action';
    button.onclick = action; panel.append(button);
  }
}
document.querySelector('#chat-actions')!.addEventListener('click', event => {
  const row = rows.find(item => item.id === currentId); if (row) conversationMenu(row, event.currentTarget as HTMLElement);
});

if (!currentId && selectedProjectId) document.querySelector('.breadcrumbs > span')!.textContent = getProjectName(selectedProjectId) || 'New conversation';

function tryCouncilExample() {
  startNew(); setRoute('auto'); simulationEnabled = true; chatScenario = 'streaming';
  document.querySelector('.simulation-toggle')!.textContent = 'Simulation · streaming';
  document.querySelector('.composer-card')!.classList.add('simulation-active');
  textarea.value = councilDemoPrompt; updateComposer(); send(councilDemo);
}
document.querySelector('#try-council-example')!.addEventListener('click', tryCouncilExample);
try { const size = storage.getItem('rivune.reading-size'); if (size && ['16', '17', '19', '21'].includes(size)) document.documentElement.style.setProperty('--reading-size', `${size}px`); } catch { /* Default reading size stays available. */ }

// Restore verified connection capability on launch without sending a model prompt.
if (localClaudeAvailable) {
checkingAccounts = true;
void platform.checkConnections().then(checks => {
  checkedAccounts = checks;
  claudeReady = checks.some(connection => connection.name === 'Claude' && connection.canChat === true);
  setRoute(route);
  const row = rows.find(item => item.id === currentId); if (row) renderConversation(row);
}).catch(() => { /* An unavailable local adapter remains disconnected. */ }).finally(() => {
  checkingAccounts = false;
  const results = document.querySelector('#connection-results');
  if (results) renderConnectionAccounts(results);
  const button = document.querySelector<HTMLButtonElement>('#check-connections');
  if (button) { button.disabled = false; button.textContent = 'Check again'; }
});
}
