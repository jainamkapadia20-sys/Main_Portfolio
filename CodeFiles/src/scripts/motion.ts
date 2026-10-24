import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { calm } from '../lib/motion.js';

gsap.registerPlugin(ScrollTrigger);
const root = document.documentElement;
root.classList.add('motion-ready');

// Smooth scroll in full motion only, driven by GSAP's ticker so ScrollTrigger (AnimatedContent, the stage) stays in step
if (!calm()) {
  const lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  (window as any).lenis = lenis;
  // in-page anchors (Contact) glide instead of jumping
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href')!);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target as HTMLElement, { offset: -24 });
  }));
}
// islands hydrate after load and change heights; re-measure once they have
addEventListener('load', () => setTimeout(() => ScrollTrigger.refresh(), 600));

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
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = root.dataset.theme === 'light' ? '#F4F4F2' : '#0E0E0E';
  themeLabel();
});

// Motion switch: Full or Calm. The WebGL pieces read it when they start, so the page reloads after the thumb lands.
const motionBtn = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
if (motionBtn) {
  motionBtn.setAttribute('aria-checked', String(!calm()));
  motionBtn.addEventListener('click', () => {
    const full = motionBtn.getAttribute('aria-checked') !== 'true';
    motionBtn.classList.add('is-init');
    motionBtn.setAttribute('aria-checked', String(full));
    try { localStorage.setItem('motion', full ? 'full' : 'calm'); } catch {}
    setTimeout(() => location.reload(), 380);
  });
}

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
