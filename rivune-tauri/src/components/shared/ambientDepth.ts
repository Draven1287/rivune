// Pointer-driven depth uses existing artwork, never a continuous render loop.
const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let frame = 0;
let pointerX = 0;
let pointerY = 0;
function available() {
  return ['observatory', 'network'].includes(root.dataset.backdrop || '') && root.dataset.environment !== 'focused'
    && root.dataset.motion !== 'off' && !document.hidden && !reducedMotion.matches;
}
document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !available()) return;
  if (document.activeElement instanceof HTMLTextAreaElement && document.activeElement.value.trim()) return;
  pointerX = event.clientX / innerWidth - .5;
  pointerY = event.clientY / innerHeight - .5;
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!available()) return;
    const amount = root.dataset.motion === 'normal' ? 24 : 12;
    root.style.setProperty('--depth-x', `${pointerX * amount}px`);
    root.style.setProperty('--depth-y', `${pointerY * amount}px`);
    root.style.setProperty('--mark-y', `${pointerX * -8}deg`);
    root.style.setProperty('--mark-x', `${pointerY * 5}deg`);
  });
}, { passive: true });
