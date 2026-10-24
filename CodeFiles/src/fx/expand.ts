// Scroll-expand: a framed clip pinned in the middle of the screen grows until it fills the whole viewport, edge to
// edge, then its title arrives. The section is taller than the screen; progress through it drives --p (0..1),
// and the CSS turns --p into size, radius and zoom. In Calm mode it simply sits open.
import { calm } from '../lib/motion';

export function mountExpand(root: HTMLElement) {
  if (calm()) { root.style.setProperty('--p', '1'); root.classList.add('is-open'); return; }
  let raf = 0;
  const update = () => {
    raf = 0;
    const r = root.getBoundingClientRect();
    const run = r.height - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / (run * 0.7)));
    root.style.setProperty('--p', p.toFixed(4));
    root.classList.toggle('is-open', p > 0.82);
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  update();
}
