const KINDS = { projects: 'Projects', orphanDrafts: 'Unmatched drafts', attachments: 'Attachments', preferences: 'Preferences', notices: 'Safety notices' };
const bytes = text => new TextEncoder().encode(text).length;
const fingerprintValid = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function validateArchiveInspection(value, fingerprint) {
  if (!fingerprintValid(fingerprint) || !value || value.schemaVersion !== 1 || value.fingerprint !== fingerprint
      || !Array.isArray(value.sections) || value.sections.length !== 5) throw Error('Invalid archive inspection');
  const seen = new Set();
  for (const section of value.sections) {
    if (!section || !Object.hasOwn(KINDS, section.kind) || seen.has(section.kind)
        || !Array.isArray(section.items) || section.items.length > 100
        || !Number.isSafeInteger(section.totalCount) || section.totalCount < section.items.length
        || typeof section.truncated !== 'boolean'
        || (section.totalCount > section.items.length && !section.truncated)) throw Error('Invalid archive section');
    seen.add(section.kind);
    const ids = new Set();
    for (const item of section.items) {
      if (!item || typeof item.id !== 'string' || !item.id || bytes(item.id) > 256 || ids.has(item.id)
          || typeof item.label !== 'string' || bytes(item.label) > 256
          || typeof item.detailText !== 'string' || bytes(item.detailText) > 4096) throw Error('Invalid archive item');
      ids.add(item.id);
    }
  }
  if (bytes(JSON.stringify(value)) > 128 * 1024) throw Error('Archive inspection too large');
  return value;
}

let instance = 0;
export function initializeArchiveInspector({ inspect }) {
  const id = `rivune-archive-inspector-${++instance}`;
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const dialog = element('dialog', undefined, 'rivune-archive-inspector');
  dialog.setAttribute('aria-labelledby', `${id}-title`);
  const style = element('link');
  style.rel = 'stylesheet'; style.href = new URL('./archive-inspector.css', import.meta.url).href;
  const header = element('div', undefined, 'archive-head');
  const title = element('h2', 'Preserved archive'); title.id = `${id}-title`; title.tabIndex = -1;
  const closeButton = element('button', 'Close'); closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close archive inspection');
  header.append(title, closeButton);
  const description = element('p', 'Read-only preserved data. Opening this view does not activate projects, file permissions, or AI work.');
  const status = element('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const content = element('div');
  const retry = element('button', 'Try again'); retry.type = 'button'; retry.hidden = true;
  dialog.append(style, header, description, status, content, retry); document.body.append(dialog);
  let revision = 0, fingerprint = null, returnFocus = null, timer = null, cancelLoad = null;
  function invalidate() {
    revision++;
    cancelLoad?.(Error('Inspection view closed or superseded')); cancelLoad = null;
    clearTimeout(timer); timer = null;
  }
  function close() { invalidate(); if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => {
    if (dialog.open) return; // A queued close from the previous session cannot erase a reopened view.
    invalidate(); content.replaceChildren(); status.textContent = ''; retry.hidden = true;
    const parent = [...document.querySelectorAll('dialog[open]')].at(-1);
    if (returnFocus?.isConnected && (!parent || parent.contains(returnFocus))) returnFocus.focus();
  });
  dialog.addEventListener('cancel', invalidate);
  closeButton.addEventListener('click', close);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const stops = [...dialog.querySelectorAll('button,summary')].filter(node => !node.disabled && node.getClientRects().length);
    const first = stops[0], last = stops.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  async function load() {
    invalidate(); const current = revision, expected = fingerprint;
    content.replaceChildren(); retry.hidden = true;
    status.textContent = 'Reading the verified archive…'; content.setAttribute('aria-busy', 'true');
    try {
      if (!fingerprintValid(expected) || typeof inspect !== 'function') throw Error('Inspection unavailable');
      const value = await Promise.race([Promise.resolve().then(() => inspect(expected)), new Promise((_, reject) => {
        cancelLoad = reject;
        timer = setTimeout(() => reject(Error('Inspection timed out')), 10000);
      })]);
      if (current !== revision || !dialog.open) return;
      const result = validateArchiveInspection(value, expected);
      for (const section of result.sections) {
        const group = element('details');
        const summary = element('summary', `${KINDS[section.kind]} · ${section.totalCount}`); group.append(summary);
        if (section.truncated) group.append(element('p', `Showing ${section.items.length} of ${section.totalCount} items. Some items or text are shortened by the preview limits. Export originals to recover the complete files.`, 'archive-limit'));
        if (!section.items.length) group.append(element('p', section.totalCount ? 'Items omitted because this preview reached its size limit.' : 'No items in this section.'));
        for (const item of section.items) {
          const article = element('article'); article.append(element('h3', item.label), element('pre', item.detailText)); group.append(article);
        }
        content.append(group);
      }
      status.textContent = 'Archive ready. Expand a section to inspect it.';
    } catch {
      if (current === revision && dialog.open) {
        content.replaceChildren(); status.textContent = 'We couldn’t inspect this archive. Your preserved originals were not changed. Try again or close this view.'; retry.hidden = false;
      }
    } finally {
      if (current === revision) { clearTimeout(timer); timer = null; cancelLoad = null; content.setAttribute('aria-busy', 'false'); }
    }
  }
  retry.addEventListener('click', () => void load());
  return Object.freeze({
    open(value, focusElement = document.activeElement) {
      fingerprint = value;
      if (!dialog.open) { returnFocus = focusElement; dialog.showModal(); }
      title.focus();
      return load();
    }, close,
  });
}
