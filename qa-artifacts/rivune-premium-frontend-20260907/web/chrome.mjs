const dialog = document.querySelector('#settings-dialog');
const opener = document.querySelector('#open-settings');
let returnFocus = opener;
function openSettings() {
  if (dialog.open) return;
  returnFocus = document.activeElement;
  dialog.showModal();
}
opener.addEventListener('click', openSettings);
document.querySelector('#close-settings').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus(); });
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const stops = [...dialog.querySelectorAll('button, input, a[href], [tabindex]')]
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
    openSettings();
  }
});
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
choices.forEach((button, index) => {
  button.addEventListener('click', () => selectProvider(button));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + choices.length) % choices.length;
    selectProvider(choices[next], true);
  });
});
const galaxy = document.querySelector('#galaxy-background');
const preferenceKey = 'rivune.appearance.galaxy.v1';
try { galaxy.checked = localStorage.getItem(preferenceKey) !== 'off'; } catch { /* Keep the approved default when storage is unavailable. */ }
function applyAppearance() { document.body.dataset.background = galaxy.checked ? 'galaxy' : 'plain'; }
applyAppearance();
galaxy.addEventListener('change', () => {
  applyAppearance();
  try { localStorage.setItem(preferenceKey, galaxy.checked ? 'on' : 'off'); } catch { /* The preference stays active for this window. */ }
});
const answer = document.querySelector('#answer');
const welcome = document.querySelector('#welcome');
function updateWelcome() { welcome.hidden = !answer.hidden; }
new MutationObserver(updateWelcome).observe(answer, { attributes: true, attributeFilter: ['hidden'] });
updateWelcome();
const status = document.querySelector('#connection-status');
const settingsStatus = document.querySelector('#settings-connection-status');
function updateSettingsStatus() {
  if (settingsStatus.textContent !== status.textContent) settingsStatus.textContent = status.textContent;
}
new MutationObserver(updateSettingsStatus).observe(status, { childList: true, characterData: true, subtree: true });
updateSettingsStatus();
