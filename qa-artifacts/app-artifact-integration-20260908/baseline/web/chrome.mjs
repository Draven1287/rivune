import { initializeAppearanceControls } from './appearance-controls.mjs';
import { initializeOnboarding, createProviderDiscovery, bindProviderDiscovery } from './onboarding.mjs';
import { createHostAdapter, parseSnapshot } from './core.mjs';

const connectionHost = createHostAdapter(globalThis.__RIVUNE_DESKTOP_HOST__);
const providerDiscovery = createProviderDiscovery(connectionHost);
const savedConnections = new Map();
const connectionDrafts = new Map();
let connectionLoadRevision = 0;
let connectionSaveRevision = 0;
let connectionSelectionTouched = false;
let connectionHydrationReady = false;

const dialog = document.querySelector('#settings-dialog');
const opener = document.querySelector('#open-settings');
const tabButtons = [...document.querySelectorAll('[data-settings-tab]')];
let returnFocus = opener;
function selectTab(key, focus = false) {
  if (!tabButtons.some(button => button.dataset.settingsTab === key)) return;
  for (const button of tabButtons) {
    const active = button.dataset.settingsTab === key;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    if (active && focus) button.focus();
  }
  dialog.querySelector('.settings-content').scrollTop = 0;
  if (key === 'connections') void refreshConnectionDiscovery();
}
function openSettings(key) {
  if (typeof key === 'string') selectTab(key);
  if (dialog.open) return;
  returnFocus = document.activeElement;
  dialog.showModal();
  void loadConnections();
  if (document.querySelector('#settings-tab-connections').getAttribute('aria-selected') === 'true') void refreshConnectionDiscovery();
}
connectionHost?.onOpenSettings?.(() => openSettings());
opener.addEventListener('click', () => openSettings());
document.querySelector('#close-settings').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (!document.querySelector('dialog[open]') && returnFocus?.isConnected) returnFocus.focus();
});
function tabKeys(event, index) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabButtons.length - 1
    : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + tabButtons.length) % tabButtons.length;
  selectTab(tabButtons[next].dataset.settingsTab, true);
}
tabButtons.forEach((button, index) => {
  button.addEventListener('click', () => selectTab(button.dataset.settingsTab));
  button.addEventListener('keydown', event => tabKeys(event, index));
});
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const stops = [...dialog.querySelectorAll('button, input, textarea, select, summary, a[href], [tabindex]')]
    .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
  const first = stops[0], last = stops.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first?.focus();
  }
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === ',') {
    event.preventDefault();
    if (!document.querySelector('#onboarding-dialog').open) openSettings();
  }
});
const tabMedia = matchMedia('(max-width: 580px)');
function updateTabOrientation() {
  document.querySelector('.settings-tabs').setAttribute('aria-orientation', tabMedia.matches ? 'horizontal' : 'vertical');
}
tabMedia.addEventListener('change', updateTabOrientation);
updateTabOrientation();

const choices = [...document.querySelectorAll('[data-provider]')];
function selectProvider(button, focus = false) {
  for (const choice of choices) {
    const selected = choice === button;
    choice.setAttribute('aria-checked', String(selected));
    choice.tabIndex = selected ? 0 : -1;
  }
  document.querySelector('#provider-kind').value = button.dataset.provider;
  document.querySelector('#provider-path').placeholder = `/absolute/path/to/${button.dataset.provider}`;
  if (focus) button.focus();
}
function connectionValues() {
  return { executablePath: document.querySelector('#provider-path').value,
    model: document.querySelector('#provider-model').value };
}
function describeConnection(kind) {
  const saved = savedConnections.has(kind);
  document.querySelector('#connection-editor-status').textContent = `${kind === 'claude' ? 'Claude' : 'Codex'} · ${saved ? 'Saved connection' : 'New connection'}. Changes apply only when you choose Save & use connection.`;
  document.querySelector('#connect-provider').disabled = !connectionHost?.configureProvider || !connectionHydrationReady || !document.querySelector('#provider-path').value.trim();
}
function populateConnection(kind) {
  const value = { ...savedConnections.get(kind), ...connectionDrafts.get(kind) };
  document.querySelector('#provider-path').value = value?.executablePath ?? '';
  document.querySelector('#provider-model').value = value?.model ?? '';
  describeConnection(kind);
}
function rememberConnectionEdits(event) {
  const kind = document.querySelector('#provider-kind').value;
  const draft = { ...connectionDrafts.get(kind) };
  if (event?.target?.id === 'provider-model') draft.model = document.querySelector('#provider-model').value;
  else draft.executablePath = document.querySelector('#provider-path').value;
  connectionDrafts.set(kind, draft);
  describeConnection(kind);
}
function changeProvider(button, focus = false) {
  // Switching is not editing: an unhydrated blank form must not shadow saved data.
  connectionSelectionTouched = true;
  selectProvider(button, focus);
  populateConnection(button.dataset.provider);
}
function chooseDetectedProvider(provider) {
  changeProvider(choices.find(button => button.dataset.provider === provider.kind));
  document.querySelector('#provider-path').value = provider.executablePath;
  rememberConnectionEdits();
  document.querySelector('#connection-editor-status').textContent = `${provider.displayName} installation selected. Save & use connection will configure it; a working response is a separate check.`;
  if (!connectionHydrationReady) document.querySelector('#connection-editor-status').textContent = `${provider.displayName} installation selected. Reading saved options before enabling Save & use connection…`;
  document.querySelector('#connect-provider').focus();
}
async function loadConnections() {
  if (!connectionHost) return;
  const revision = ++connectionLoadRevision;
  const savedAtStart = connectionSaveRevision;
  try {
    const snapshot = parseSnapshot(await connectionHost.getSnapshot());
    if (revision !== connectionLoadRevision || savedAtStart !== connectionSaveRevision) return;
    savedConnections.clear();
    for (const provider of Array.isArray(snapshot.providers) ? snapshot.providers : []) {
      if (!['codex', 'claude'].includes(provider.kind) || provider.id !== `${provider.kind}:local`
          || typeof provider.executablePath !== 'string' || provider.executablePath.length > 4096
          || (provider.model != null && (typeof provider.model !== 'string' || provider.model.length > 256))) continue;
      savedConnections.set(provider.kind, provider);
    }
    connectionHydrationReady = true;
    const selected = [...savedConnections.values()].find(provider => provider.id === snapshot.selectedProviderID);
    const untouchedSelection = !connectionSelectionTouched && connectionDrafts.size === 0;
    const kind = untouchedSelection && selected ? selected.kind : document.querySelector('#provider-kind').value;
    selectProvider(choices.find(button => button.dataset.provider === kind));
    // Always hydrate the cache, but a dirty form wins for its own provider only.
    populateConnection(kind);
    if (untouchedSelection && snapshot.selectedProviderID && !selected) {
      document.querySelector('#connection-editor-status').textContent = 'The selected saved connection cannot be edited by this local-CLI form. Saving here configures and selects a separate local connection.';
    }
  } catch {
    if (revision === connectionLoadRevision) {
      document.querySelector('#connection-editor-status').textContent = 'Saved connections could not be read. Your entries have been kept; no connection was changed.';
    }
  }
}
for (const input of [document.querySelector('#provider-path'), document.querySelector('#provider-model')]) {
  input.addEventListener('input', rememberConnectionEdits);
}
globalThis.addEventListener('rivune:provider-configured', event => {
  const provider = event.detail;
  if (!provider || !['codex', 'claude'].includes(provider.kind) || provider.id !== `${provider.kind}:local`
      || typeof provider.executablePath !== 'string') return;
  savedConnections.set(provider.kind, provider);
  const current = connectionValues();
  if (document.querySelector('#provider-kind').value === provider.kind
      && current.executablePath.trim() === provider.executablePath
      && (current.model.trim() || null) === (provider.model ?? null)) {
    connectionDrafts.delete(provider.kind);
    describeConnection(provider.kind);
  }
  connectionSaveRevision++;
  void loadConnections();
});
function attachRadioKeys(buttons, select) {
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(button));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
      select(buttons[next], true);
    });
  });
}
attachRadioKeys(choices, changeProvider);
document.querySelector('#edit-provider-options').addEventListener('click', () => {
  selectTab('connections');
  document.querySelector('#provider-advanced').open = true;
  void loadConnections();
  document.querySelector('#provider-model').focus();
});

const themeButtons = [...document.querySelectorAll('[data-theme]')];
const galaxy = document.querySelector('#galaxy-background');
const motion = document.querySelector('#background-motion');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scene = document.querySelector('#orbit-scene');
const members = [...scene.querySelectorAll('.orbit-member')];
let theme = 'galaxy';
let themePersistence = 'default';
let motionSaveFailed = false;
try {
  const saved = localStorage.getItem('rivune.appearance.theme.v1');
  theme = ['galaxy', 'orbit', 'plain'].includes(saved) ? saved
    : localStorage.getItem('rivune.appearance.galaxy.v1') === 'off' ? 'plain' : 'galaxy';
  if (['galaxy', 'orbit', 'plain'].includes(saved) || theme === 'plain') themePersistence = 'saved';
  motion.checked = localStorage.getItem('rivune.appearance.motion.v1') !== 'off';
} catch { /* Appearance remains available for this window. */ }
let frame = null;
let previousTime = null;
let elapsed = 0;
function drawOrbit() {
  const radius = scene.clientWidth * 0.34;
  for (const [index, node] of members.entries()) {
    const angle = elapsed / 42000 * Math.PI * 2 + index * Math.PI * 2 / members.length;
    const depth = Math.sin(angle);
    node.style.transform = `translate(${Math.cos(angle) * radius}px, ${depth * radius}px) scale(${0.82 + (depth + 1) * 0.16})`;
    node.style.zIndex = String(2 + Math.round((depth + 1) * 3));
    node.style.opacity = String(0.66 + (depth + 1) * 0.16);
  }
}
function animate(time) {
  if (previousTime !== null) elapsed += Math.min(time - previousTime, 100);
  previousTime = time;
  drawOrbit();
  frame = requestAnimationFrame(animate);
}
function applyMotion() {
  const active = motion.checked && !reducedMotion.matches && !document.hidden;
  document.body.dataset.motion = active ? 'on' : 'off';
  motion.disabled = reducedMotion.matches;
  document.querySelector('#motion-help').textContent = reducedMotion.matches
    ? 'Your system’s Reduce Motion setting is on. The background stays still.'
    : `A slow Galaxy panorama or a full-circle Orbit. Pauses when hidden.${motionSaveFailed ? ' This motion preference could not be saved and lasts only in this window.' : ''}`;
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  previousTime = null;
  drawOrbit();
  if (active && theme === 'orbit' && !document.querySelector('#welcome').hidden) frame = requestAnimationFrame(animate);
}
function applyTheme() {
  document.body.dataset.background = theme;
  galaxy.checked = theme === 'galaxy';
  for (const button of themeButtons) {
    const selected = button.dataset.theme === theme;
    button.setAttribute('aria-checked', String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  const description = theme === 'orbit'
    ? 'A larger lead with three smaller companions moving through a full 360° orbit.'
    : theme === 'plain' ? 'A calm graphite workspace.' : 'A slow view across the Milky Way.';
  const persistence = themePersistence === 'saved' ? 'Saved on this device.'
    : themePersistence === 'window' ? 'This choice could not be saved and lasts only in this window.' : 'Default appearance.';
  document.querySelector('#appearance-description').textContent = `${description} ${persistence}`;
  applyMotion();
}
function saveTheme(button, focus = false) {
  theme = button.dataset.theme;
  try {
    localStorage.setItem('rivune.appearance.theme.v1', theme);
    themePersistence = 'saved';
  } catch { themePersistence = 'window'; }
  try {
    localStorage.setItem('rivune.appearance.galaxy.v1', theme === 'galaxy' ? 'on' : 'off');
  } catch { /* The primary theme key above owns the persistence disclosure. */ }
  applyTheme();
  if (focus) button.focus();
}
attachRadioKeys(themeButtons, saveTheme);
// Compatibility for the pre-category appearance control, without a second visible selector.
galaxy.addEventListener('change', () => saveTheme(themeButtons.find(button => button.dataset.theme === (galaxy.checked ? 'galaxy' : 'plain'))));
motion.addEventListener('change', () => {
  try { localStorage.setItem('rivune.appearance.motion.v1', motion.checked ? 'on' : 'off'); motionSaveFailed = false; }
  catch { motionSaveFailed = true; }
  applyMotion();
});
reducedMotion.addEventListener('change', applyMotion);
document.addEventListener('visibilitychange', applyMotion);
window.addEventListener('resize', drawOrbit);
new MutationObserver(applyMotion).observe(document.querySelector('#welcome'), {attributes:true, attributeFilter:['hidden']});
window.addEventListener('pagehide', () => { if (frame !== null) cancelAnimationFrame(frame); });
applyTheme();
initializeAppearanceControls({container: document.querySelector('#settings-panel-appearance .settings-section')});

const status = document.querySelector('#connection-status');
const settingsStatus = document.querySelector('#settings-connection-status');
function updateSettingsStatus() {
  if (settingsStatus.textContent !== status.textContent) settingsStatus.textContent = status.textContent;
}
new MutationObserver(updateSettingsStatus).observe(status, { childList: true, characterData: true, subtree: true });
updateSettingsStatus();
const refreshConnectionDiscovery = bindProviderDiscovery({ discovery: providerDiscovery,
  list: document.querySelector('#discovered-providers'), status: document.querySelector('#discovery-status'),
  button: document.querySelector('#refresh-discovery'), onChoose: chooseDetectedProvider });
document.querySelector('#connect-provider').disabled = true;
initializeOnboarding({ openSettings, discovery: providerDiscovery, onChooseProvider: chooseDetectedProvider });
