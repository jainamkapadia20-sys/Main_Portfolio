import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { calm } from '../lib/motion.js';

const root = document.documentElement;
root.classList.add('motion-ready');

// Smooth scrolling, tuned light: lerp .16 (Lenis defaults to .1, which trails the wheel) so the page settles in a
// few frames and never feels behind your hand. Touch keeps the phone's own scrolling. Anchors glide and respect
// scroll-margin. In Calm, the browser's own scrolling is left alone.
if (!calm()) {
  const lenis = new Lenis({ autoRaf: true, lerp: 0.16, anchors: true });
  // the page holds still while the opening room covers it
  const hold = () => (root.classList.contains('intro') ? lenis.stop() : lenis.start());
  hold();
  new MutationObserver(hold).observe(root, { attributes: true, attributeFilter: ['class'] });
}
// Entrances: each [data-reveal] rises in once as it arrives (CSS does the motion, see motion.css)
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  io.unobserve(e.target);
}), { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

// Looping clips play while on screen and pause off screen; in Calm, decorative loops hold their poster frame
document.querySelectorAll<HTMLVideoElement>('video[data-autoplay]').forEach((v) => {
  if (calm() && !v.controls) { v.removeAttribute('autoplay'); v.pause(); return; }
  let userPaused = false;
  v.addEventListener('pause', () => { if (v.dataset.auto !== '1') userPaused = true; v.dataset.auto = ''; });
  v.addEventListener('play', () => (userPaused = false));
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !userPaused) v.play().catch(() => {});
    else if (!e.isIntersecting && !v.paused) { v.dataset.auto = '1'; v.pause(); }
  }, { threshold: 0.2 }).observe(v);
});

// Theme switch: flips light/dark and remembers it
const themeBtn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const themeLabel = () => themeBtn?.setAttribute('aria-label', root.dataset.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
themeLabel();
themeBtn?.addEventListener('click', () => {
  // inside a time-jump era, the switch first brings you home to the base theme
  if (root.dataset.era) { delete root.dataset.era; try { sessionStorage.removeItem('era'); } catch {} return; }
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = root.dataset.theme === 'light' ? '#F4F4F2' : '#0E0E0E';
  themeLabel();
});

// Copy email. The links are real mailto links, so they still work without JS or a clipboard.
const toast = document.querySelector<HTMLElement>('[data-toast]');
document.querySelectorAll<HTMLElement>('[data-copy-email]').forEach((b) => b.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = b.dataset.copyEmail!;
  try { await navigator.clipboard.writeText(email); } catch { location.href = `mailto:${email}`; return; }
  if (!toast) return;
  toast.textContent = 'Email copied';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}));

// The phone menu covers the page, so close it when focus leaves it
const menu = document.getElementById('menu');
menu?.addEventListener('focusout', (e) => { if (!menu.contains(e.relatedTarget as Node)) menu.hidePopover(); });
