let activePopover: HTMLElement | null = null;
let popoverAnchor: HTMLElement | null = null;
let disposePositioning: (() => void) | null = null;
let popoverSequence = 0;

const focusableSelector = 'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]';

function controlsIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(element =>
    element.tabIndex >= 0 && !element.matches(':disabled, [aria-disabled="true"]') &&
    !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden'
  );
}

export function closePopover(restore = false) {
  const panel = activePopover;
  const anchor = popoverAnchor;
  disposePositioning?.(); disposePositioning = null;
  activePopover = null; popoverAnchor = null;
  panel?.remove();
  anchor?.setAttribute('aria-expanded', 'false');
  if (panel && anchor?.getAttribute('aria-controls') === panel.id) anchor.removeAttribute('aria-controls');
  if (restore && anchor?.isConnected) anchor.focus({ preventScroll: true });
}

export function openPopover(anchor: HTMLElement, label: string) {
  closePopover();
  const panel = document.createElement('div');
  panel.className = 'anchored-popover';
  panel.id = `rivune-popover-${++popoverSequence}`;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', label);
  panel.tabIndex = -1;
  panel.style.position = 'fixed'; panel.style.boxSizing = 'border-box'; panel.style.minHeight = '0';
  document.body.append(panel);
  activePopover = panel; popoverAnchor = anchor;
  anchor.setAttribute('aria-expanded', 'true'); anchor.setAttribute('aria-controls', panel.id);

  let frame = 0;
  const position = () => {
    if (activePopover !== panel) return;
    if (!anchor.isConnected) { closePopover(); return; }
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? innerWidth;
    const viewportHeight = viewport?.height ?? innerHeight;
    const margin = 12;
    const gap = 8;
    const leftEdge = viewportLeft + margin;
    const rightEdge = viewportLeft + viewportWidth - margin;
    const topEdge = viewportTop + margin;
    const bottomEdge = viewportTop + viewportHeight - margin;
    const rect = anchor.getBoundingClientRect();
    panel.style.maxWidth = `${Math.max(0, viewportWidth - margin * 2)}px`;
    panel.style.maxHeight = `${Math.max(0, Math.min(440, viewportHeight - margin * 2))}px`;
    panel.style.bottom = 'auto';

    const above = Math.max(0, rect.top - gap - topEdge);
    const below = Math.max(0, bottomEdge - rect.bottom - gap);
    const preferredHeight = panel.getBoundingClientRect().height;
    const placeAbove = below < preferredHeight && above > below;
    const available = placeAbove ? above : below;
    // If neither side has a usable row, fit inside the viewport rather than
    // disappearing under an on-screen keyboard or the window edge.
    const overlayAnchor = available < 60;
    panel.style.maxHeight = `${Math.max(0, Math.min(440, overlayAnchor ? viewportHeight - margin * 2 : available))}px`;
    const size = panel.getBoundingClientRect();
    const left = Math.max(leftEdge, Math.min(rect.left, rightEdge - size.width));
    const preferredTop = overlayAnchor ? topEdge : placeAbove ? rect.top - gap - size.height : rect.bottom + gap;
    const top = Math.max(topEdge, Math.min(preferredTop, bottomEdge - size.height));
    panel.style.left = `${left}px`; panel.style.top = `${top}px`;
  };
  const schedulePosition = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; position(); });
  };
  const onScroll = (event: Event) => {
    if (!(event.target instanceof Node) || !panel.contains(event.target)) schedulePosition();
  };
  const resizeObserver = new ResizeObserver(schedulePosition);
  resizeObserver.observe(panel); resizeObserver.observe(anchor);
  const mutationObserver = new MutationObserver(schedulePosition);
  mutationObserver.observe(panel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['open', 'hidden', 'disabled'] });
  window.addEventListener('resize', schedulePosition);
  window.addEventListener('scroll', onScroll, true);
  window.visualViewport?.addEventListener('resize', schedulePosition);
  window.visualViewport?.addEventListener('scroll', schedulePosition);
  disposePositioning = () => {
    if (frame) cancelAnimationFrame(frame);
    resizeObserver.disconnect(); mutationObserver.disconnect();
    window.removeEventListener('resize', schedulePosition);
    window.removeEventListener('scroll', onScroll, true);
    window.visualViewport?.removeEventListener('resize', schedulePosition);
    window.visualViewport?.removeEventListener('scroll', schedulePosition);
  };
  position();
  panel.focus({ preventScroll: true });
  // Callers populate the returned panel synchronously; wait for those controls.
  queueMicrotask(() => {
    if (activePopover !== panel) return;
    position();
    if (document.activeElement === panel) {
      const controls = controlsIn(panel);
      const selected = controls.find(element => element.matches('[aria-checked="true"], [aria-selected="true"], [aria-pressed="true"]'));
      (selected ?? controls[0] ?? panel).focus({ preventScroll: true });
    }
  });
  return panel;
}

document.addEventListener('pointerdown', event => {
  if (activePopover && !activePopover.contains(event.target as Node) && !popoverAnchor?.contains(event.target as Node)) closePopover();
});

document.addEventListener('keydown', event => {
  const panel = activePopover;
  if (!panel || event.isComposing) return;
  if (event.key === 'Escape') {
    event.preventDefault(); event.stopPropagation(); closePopover(true); return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const controls = controlsIn(panel);
  const focused = document.activeElement;
  const index = controls.indexOf(focused as HTMLElement);
  if (event.key === 'Tab') {
    if (!controls.length) { event.preventDefault(); panel.focus(); return; }
    if (event.shiftKey && index <= 0) {
      event.preventDefault(); controls.at(-1)!.focus();
    } else if (!event.shiftKey && (index < 0 || index === controls.length - 1)) {
      event.preventDefault(); controls[0].focus();
    }
    return;
  }
  // Form fields, selects and disclosure summaries retain native keyboard keys.
  if (!controls.length || !controls.every(element => element.tagName === 'BUTTON') ||
      (focused !== panel && !controls.includes(focused as HTMLElement))) return;
  let next: number;
  if (event.key === 'ArrowDown') next = (index + 1) % controls.length;
  else if (event.key === 'ArrowUp') next = index <= 0 ? controls.length - 1 : index - 1;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = controls.length - 1;
  else return;
  event.preventDefault(); controls[next].focus();
});
