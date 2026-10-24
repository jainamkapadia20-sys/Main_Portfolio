// A draggable strip of work: throw it and it glides to a stop, the cards lean with the speed ("liquid") and settle
// upright. The wheel scrolls it sideways only on horizontal gestures, so the page keeps scrolling. Arrow keys step
// a card at a time. Clicking a card (not dragging it) opens it larger in a dialog.
import { approach } from './gl';
import { calm } from '../lib/motion';

export function mountStrip(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>('[data-track]')!;
  const cards = [...track.children] as HTMLElement[];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const still = calm();
  let x = 0, target = 0, vel = 0, lean = 0, dragging = false, startX = 0, startTarget = 0, moved = 0, lastX = 0, lastT = 0, raf = 0;
  const max = () => Math.max(0, track.scrollWidth - root.clientWidth);
  const clampT = (v: number) => Math.min(max(), Math.max(0, v));

  const render = () => {
    track.style.transform = `translate3d(${-x}px,0,0)`;
    cards.forEach((c) => (c.style.transform = still ? '' : `skewX(${lean}deg) scale(${1 - Math.min(0.06, Math.abs(lean) / 120)})`));
    if (count) {
      const mid = x + root.clientWidth / 2;
      const i = cards.findIndex((c) => c.offsetLeft + c.offsetWidth > mid);
      count.textContent = `${String((i < 0 ? cards.length - 1 : i) + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    }
  };
  const tick = () => {
    if (!dragging) { target = clampT(target + vel); vel *= 0.92; }
    const prev = x;
    x = still ? target : approach(x, target, 1 / 60, 0.08);
    lean = approach(lean, Math.max(-9, Math.min(9, (x - prev) * -0.35)), 1 / 60, 0.1);
    render();
    raf = Math.abs(x - target) > 0.2 || Math.abs(vel) > 0.1 || Math.abs(lean) > 0.02 || dragging ? requestAnimationFrame(tick) : 0;
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(tick); };

  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; moved = 0; startX = lastX = e.clientX; startTarget = target; lastT = performance.now(); vel = 0;
    go();
  });
  root.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    // capture only once it is a drag, so a plain click still reaches the card's button
    if (moved > 6 && !root.hasPointerCapture(e.pointerId)) { root.setPointerCapture(e.pointerId); root.classList.add('is-dragging'); }
    // past either end the strip resists like rubber
    let t = startTarget - dx;
    if (t < 0) t = t / 3; else if (t > max()) t = max() + (t - max()) / 3;
    target = t;
    const now = performance.now();
    vel = -(e.clientX - lastX) / Math.max(1, (now - lastT) / 16.7);
    lastX = e.clientX; lastT = now;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
    target = clampT(target);
    go();
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  root.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    target = clampT(target + e.deltaX); go();
  }, { passive: false });
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const step = (cards[0]?.offsetWidth ?? 300) + 16;
    target = clampT(target + (e.key === 'ArrowRight' ? step : -step)); go();
  });
  // a focused card scrolls into the strip's view
  cards.forEach((c) => c.addEventListener('focusin', () => {
    if (c.offsetLeft < x || c.offsetLeft + c.offsetWidth > x + root.clientWidth) { target = clampT(c.offsetLeft - 24); go(); }
  }));
  addEventListener('resize', () => { target = clampT(target); go(); });
  render();

  // the lightbox
  const dialog = root.querySelector<HTMLDialogElement>('dialog');
  if (!dialog) return;
  const big = dialog.querySelector<HTMLElement>('[data-big]')!;
  const cap = dialog.querySelector<HTMLElement>('[data-cap]')!;
  cards.forEach((c) => c.querySelector('button')?.addEventListener('click', () => {
    big.innerHTML = c.querySelector('[data-media]')!.innerHTML;
    cap.textContent = c.dataset.title ?? '';
    dialog.showModal();
  }));
  dialog.addEventListener('click', (e) => { if (e.target === dialog || (e.target as Element).closest('[data-close]')) dialog.close(); });
}
