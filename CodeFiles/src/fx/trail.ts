// Photos that follow the pointer: every so many pixels of travel the next photo drops in at the pointer, tilted a
// little, and fades away behind it. Built from a pool of <img> elements already in the page.
import { calm } from '../lib/motion';

export function mountTrail(root: HTMLElement) {
  const pool = [...root.querySelectorAll<HTMLImageElement>('[data-trail-img]')];
  if (calm() || !pool.length) return;
  // fetch the photos as the panel approaches, so the first ones are ready when the pointer arrives
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { pool.forEach((i) => (i.loading = 'eager')); io.disconnect(); } }, { rootMargin: '800px' }).observe(root);
  let next = 0, z = 1, lx = 0, ly = 0, first = true;
  const THRESHOLD = 90;
  const drop = (x: number, y: number) => {
    const img = pool[next];
    next = (next + 1) % pool.length;
    const s = 0.85 + Math.random() * 0.35, r = (Math.random() - 0.5) * 12;
    img.style.zIndex = String(++z);
    img.style.left = `${x}px`; img.style.top = `${y}px`;
    img.getAnimations().forEach((a) => a.cancel());
    img.animate([
      { opacity: 0, transform: `translate(-50%,-50%) scale(${s * 0.6}) rotate(${r * 2}deg)` },
      { opacity: 1, transform: `translate(-50%,-50%) scale(${s}) rotate(${r}deg)`, offset: 0.18 },
      { opacity: 1, transform: `translate(-50%,-50%) scale(${s}) rotate(${r}deg)`, offset: 0.6 },
      { opacity: 0, transform: `translate(-50%,-50%) scale(${s * 0.85}) rotate(${r}deg)` },
    ], { duration: 1500, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
  };
  root.addEventListener('pointermove', (e) => {
    const b = root.getBoundingClientRect();
    const x = e.clientX - b.left, y = e.clientY - b.top;
    if (first) { lx = x; ly = y; first = false; drop(x, y); return; }
    if (Math.hypot(x - lx, y - ly) < THRESHOLD) return;
    lx = x; ly = y;
    drop(x, y);
    root.classList.add('is-live');
  });
  root.addEventListener('pointerleave', () => (first = true));
}
