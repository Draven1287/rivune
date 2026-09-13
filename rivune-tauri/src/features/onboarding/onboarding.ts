import { storage } from '../../services/storage/index.js';
/** First-run orientation. Account and provider status are never fabricated. */
const completionKey = 'rivune.onboarding.v1';
let active: HTMLDialogElement | null = null;

export function launchOnboarding(force = false): void {
  if (active) { active.focus(); return; }
  if (!force) {
    try { if (storage.getItem(completionKey) === 'complete') return; }
    catch { /* A session-only workspace can still open. */ }
  }
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const overlay = document.createElement('dialog');
  overlay.className = 'onboarding';
  overlay.setAttribute('aria-labelledby', 'onboarding-title');
  document.body.append(overlay);
  active = overlay;
  let step = 0;
  let connectAfter = false;
  const titles = ['Welcome to Rivune', 'Your workspace, your account', 'Choose how you work', 'Bring your AIs', 'Make yourself at home'];
  function finish(): void {
    let saved = true;
    try { storage.setItem(completionKey, 'complete'); } catch { saved = false; }
    overlay.close();
    overlay.remove();
    active = null;
    previousFocus?.focus();
    if (!saved) window.dispatchEvent(new CustomEvent('rivune:onboarding-storage-unavailable'));
    if (connectAfter) window.dispatchEvent(new CustomEvent('rivune:open-connections'));
  }
  function render(): void {
    const content = [
      `<p>A little space for your next idea.</p><div class="onboarding-progress" role="status">Local workspace initialized</div><p class="onboarding-note">AI connections are checked separately when you open connection setup.</p>`,
      `<p>Keep your conversations and connected AIs together.</p><div class="onboarding-options"><button disabled>Continue with Google</button><button disabled>Continue with Apple</button><button disabled>Continue with email</button></div><p class="onboarding-note">Account sign-in is not available in this preview. Continue with a local workspace; nothing is synced to an account.</p>`,
      `<div class="onboarding-options"><article><h3>Single AI</h3><p>Work with one connected AI, with its model and available controls in the composer.</p></article><article><h3>Constellation Engine</h3><p>Your AIs work together. Council brings perspectives together; Swarm coordinates building and review.</p></article></div><p class="onboarding-note">Team execution is still being integrated. Simulations are labeled.</p>`,
      `<div class="onboarding-options"><article><h3>CLI accounts</h3><p>Connect supported tools using their account sign-in. Availability and usage limits depend on your provider.</p></article><article><h3>Optional APIs</h3><p>Bring an API key when you choose. For this preview, Developer simulation lets you test without real keys or paid calls.</p></article></div><label class="onboarding-note"><input type="checkbox" id="onboarding-connect" ${connectAfter ? 'checked' : ''}> Open connection setup when I enter the workspace</label>`,
      `<p>Your message goes at the bottom. Pick your AI, add files, and use the controls available for that connection.</p><p class="onboarding-note">Find connections and preferences in Settings. You can reopen this guide any time.</p>`
    ];
    overlay.innerHTML = `<div class="onboarding-content"><img class="onboarding-logo" src="/rivune-floating-silver.png" alt="Rivune" width="88" height="88"><div class="onboarding-steps" aria-label="Setup progress">${step + 1} of ${titles.length}</div><h2 id="onboarding-title" tabindex="-1">${titles[step]}</h2>${content[step]}<div class="onboarding-actions">${step > 0 ? '<button type="button" data-onboarding-back>Back</button>' : ''}<button type="button" class="onboarding-next" data-onboarding-next>${step === titles.length - 1 ? 'Enter workspace' : step === 1 ? 'Continue locally' : 'Continue'}</button></div></div>`;
    overlay.querySelector('[data-onboarding-back]')?.addEventListener('click', () => { step--; render(); });
    overlay.querySelector('[data-onboarding-next]')?.addEventListener('click', () => { if (step === titles.length - 1) finish(); else { step++; render(); } });
    overlay.querySelector<HTMLInputElement>('#onboarding-connect')?.addEventListener('change', (event) => { connectAfter = (event.target as HTMLInputElement).checked; });
    if (overlay.open) overlay.querySelector<HTMLElement>('#onboarding-title')?.focus();
  }
  // Esc closes orientation without marking onboarding complete.
  overlay.addEventListener('cancel', () => { active = null; overlay.remove(); previousFocus?.focus(); });
  render();
  overlay.showModal();
  overlay.querySelector<HTMLElement>('#onboarding-title')?.focus();
}
