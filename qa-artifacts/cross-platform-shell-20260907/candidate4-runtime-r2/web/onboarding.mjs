import { createHostAdapter, parseSnapshot } from './core.mjs';

export function createProviderDiscovery(host, timeoutMs = 10000) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error('Invalid discovery deadline');
  const available = typeof host?.discoverProviders === 'function';
  let cached = null;
  let pending = null;
  async function scan({ refresh = false } = {}) {
    if (!available) return { state: 'unavailable', providers: [] };
    if (pending) return pending;
    if (cached && !refresh) return cached;
    cached = null;
    pending = (async () => {
      let timer;
      let rows;
      try {
        rows = await Promise.race([host.discoverProviders(), new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Discovery timed out')), timeoutMs);
        })]);
      } finally { clearTimeout(timer); }
      if (!Array.isArray(rows) || rows.length > 32) throw new Error('Invalid discovery result');
      const ids = new Set();
      const providers = rows.map(row => {
        if (!row || typeof row.id !== 'string' || !row.id || row.id.length > 256 || ids.has(row.id)
            || !['codex', 'claude'].includes(row.kind) || typeof row.executablePath !== 'string'
            || row.executablePath.length > 4096 || typeof row.installed !== 'boolean'
            || (row.installed && !row.executablePath)
            || !['authenticated', 'not-authenticated', 'unknown'].includes(row.authentication)
            || typeof row.tested !== 'boolean') throw new Error('Invalid discovery result');
        ids.add(row.id);
        return Object.freeze({ id: row.id, kind: row.kind,
          displayName: row.kind === 'codex' ? 'Codex' : 'Claude', executablePath: row.executablePath,
          installed: row.installed, authentication: row.authentication, tested: row.tested });
      });
      cached = Object.freeze({ state: 'ready', providers: Object.freeze(providers) });
      return cached;
    })();
    try { return await pending; } finally { pending = null; }
  }
  return Object.freeze({ available, scan });
}

export function discoveryStatus(provider) {
  if (!provider.installed) return 'Not installed';
  const auth = provider.authentication === 'authenticated' ? 'Signed in'
    : provider.authentication === 'not-authenticated' ? 'Sign-in required' : 'Sign-in not checked';
  return `Installed · ${auth} · ${provider.tested ? 'Response tested' : 'Response not tested'}`;
}

export function bindProviderDiscovery({ discovery, list, status, button, onChoose }) {
  let revision = 0;
  async function refresh(force = false) {
    const current = ++revision;
    button.disabled = true;
    list.replaceChildren();
    status.textContent = 'Checking local AI installations…';
    try {
      const result = await discovery.scan({ refresh: force });
      if (current !== revision) return;
      list.replaceChildren();
      if (result.state === 'unavailable') {
        status.textContent = 'Automatic discovery is unavailable in this host. Use Advanced connection setup for an installed CLI.';
        return;
      }
      const installed = result.providers.filter(provider => provider.installed);
      status.textContent = installed.length ? 'Choose an installation to configure. No AI prompt was sent.'
        : 'No supported CLI installation was found. Install Codex or Claude through its own setup, sign in there, then check again. Advanced setup can use an installation in another location.';
      for (const provider of result.providers) {
        const card = document.createElement('div'); card.className = 'detected-provider';
        const info = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = provider.displayName;
        const detail = document.createElement('small'); detail.textContent = discoveryStatus(provider);
        info.append(name, detail); card.append(info);
        if (provider.installed) {
          const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'secondary';
          choose.textContent = `Set up ${provider.displayName}`;
          choose.addEventListener('click', () => onChoose(provider)); card.append(choose);
        }
        list.append(card);
      }
    } catch {
      if (current === revision) {
        list.replaceChildren();
        status.textContent = 'The installation check could not finish. Try again or use Advanced setup. No connection was changed.';
      }
    } finally { if (current === revision) button.disabled = !discovery.available; }
  }
  button.addEventListener('click', () => void refresh(true));
  return refresh;
}

export function initializeOnboarding({ openSettings, discovery, onChooseProvider }) {
  const dialog = document.querySelector('#onboarding-dialog');
  const title = document.querySelector('#onboarding-title');
  const next = document.querySelector('#onboarding-next');
  const back = document.querySelector('#onboarding-back');
  const intro = document.querySelector('#onboarding-intro');
  const connect = document.querySelector('#onboarding-connect');
  const status = document.querySelector('#onboarding-saved-status');
  const host = createHostAdapter(globalThis.__RIVUNE_DESKTOP_HOST__);
  const key = 'rivune.onboarding.introduction.v1';
  let step = 0;
  let returnFocus = null;
  let checkRevision = 0;
  let userOpened = false;
  const refreshDiscovery = bindProviderDiscovery({ discovery,
    list: document.querySelector('#onboarding-providers'), status: document.querySelector('#onboarding-host-status'),
    button: document.querySelector('#onboarding-check'), onChoose: provider => {
      closeGuide(); openSettings('connections'); onChooseProvider(provider);
    } });
  function rememberIntroduction() {
    try { localStorage.setItem(key, 'seen'); } catch { /* Guide can be reopened without storage. */ }
  }
  async function checkConfiguredConnections() {
    const revision = ++checkRevision;
    if (!host) {
      status.textContent = 'The desktop connection service is unavailable in this window.';
      return;
    }
    status.textContent = 'Reading saved connection settings…';
    try {
      const snapshot = parseSnapshot(await host.getSnapshot());
      if (revision !== checkRevision || !dialog.open || step !== 1) return;
      const providers = Array.isArray(snapshot.providers) ? snapshot.providers : [];
      status.textContent = providers.length
        ? `${providers.length} saved connection${providers.length === 1 ? '' : 's'} found in this workspace. This does not verify installation, sign-in, or a working response.`
        : 'No connection is saved in this workspace yet.';
    } catch {
      if (revision === checkRevision) status.textContent = 'Saved connection settings could not be read. You can still open Connections and try again.';
    }
  }
  function showStep(value) {
    step = value;
    intro.hidden = value !== 0;
    connect.hidden = value !== 1;
    back.hidden = value === 0;
    document.querySelector('#onboarding-step').textContent = value === 0 ? '1 of 2 · Meet your workspace' : '2 of 2 · Connect your AI';
    title.textContent = value === 0 ? 'A little space. More possibilities.' : 'Bring your AI along.';
    next.textContent = value === 0 ? 'Continue →' : 'Open Connections →';
    title.focus();
    if (value === 1) { void checkConfiguredConnections(); void refreshDiscovery(); }
  }
  function openGuide() {
    userOpened = true;
    returnFocus = document.activeElement;
    document.querySelector('#settings-dialog').close();
    if (!dialog.open) dialog.showModal();
    showStep(0);
  }
  function closeGuide() { rememberIntroduction(); dialog.close(); }
  document.querySelector('#welcome-setup').addEventListener('click', openGuide);
  document.querySelector('#restart-setup').addEventListener('click', openGuide);
  document.querySelector('#close-onboarding').addEventListener('click', closeGuide);
  document.querySelector('#onboarding-later').addEventListener('click', closeGuide);
  back.addEventListener('click', () => showStep(0));
  next.addEventListener('click', () => {
    if (step === 0) { showStep(1); return; }
    closeGuide();
    openSettings('connections');
  });
  dialog.addEventListener('cancel', rememberIntroduction);
  dialog.addEventListener('close', () => {
    checkRevision++;
    if (!document.querySelector('dialog[open]') && returnFocus?.isConnected) {
      const target = returnFocus.closest('#settings-dialog') ? document.querySelector('#open-settings') : returnFocus;
      target.focus();
    }
  });
  // Only auto-open on a confirmed empty native workspace. The plain browser never
  // pretends to detect providers, and existing conversations are not interrupted.
  async function firstLaunch() {
    if (!globalThis.__TAURI__ || !host) return;
    try {
      if (localStorage.getItem(key) === 'seen') return;
      const snapshot = parseSnapshot(await host.getSnapshot());
      const empty = snapshot.runs.length === 0 && snapshot.conversations.every(c => c.id === 'welcome' && !c.draft);
      if (empty && !snapshot.providers?.length && !userOpened && !document.querySelector('dialog[open]')
          && !document.querySelector('#prompt').value && document.activeElement === document.body) openGuide();
    } catch { /* Do not interrupt the workspace or fabricate discovery after a host failure. */ }
  }
  void firstLaunch();
}
