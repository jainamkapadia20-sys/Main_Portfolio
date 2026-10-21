import Lenis from 'lenis';
import { onDrive } from './drive';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
root.classList.add('motion-ready');

// Smooth scroll only when the visitor allows motion; reduced motion keeps native scrolling
if (!reduce) (window as any).lenis = new Lenis({ autoRaf: true, lerp: 0.1 });

// Progress bar, ambient light drift and the speed readout all ride the shared scroll loop
const bar = document.querySelector<HTMLElement>('.progress');
const ambient = document.querySelector<HTMLElement>('.ambient');
const kmh = document.querySelector<HTMLElement>('[data-kmh]');
const hud = document.querySelector<HTMLElement>('.hud');
const bars = [...document.querySelectorAll<HTMLElement>('.hud .bars i')];
let shown = -1, sleep = 0;
onDrive(({ speed, progress }) => {
  bar?.style.setProperty('--p', progress.toFixed(4));
  if (!reduce) ambient?.style.setProperty('--sp', progress.toFixed(3));
  // the readout wakes while the page moves and fades out a moment after it stops, so it never sits over text
  if (speed > 0.02) { hud?.classList.add('live'); clearTimeout(sleep); sleep = window.setTimeout(() => hud?.classList.remove('live'), 1400); }
  const k = Math.round(speed * 240);
  if (k !== shown && kmh) {
    shown = k; kmh.textContent = String(k).padStart(3, '0');
    const lit = Math.round(speed * bars.length);
    bars.forEach((b, i) => b.classList.toggle('on', i < lit));
  }
});

// Split display headings into masked words (the words rise in; ref 02-lusion, 03-aristide-benoist). The text
// stays real text with its spaces, so it reads normally.
document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
  const words = (el.textContent ?? '').trim().split(/\s+/);
  el.innerHTML = words.map((w, i) => `<span class="w"><span style="--wi:${i}">${w.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`)}</span></span>`).join(' ');
  el.classList.add('split');
});

// Mono labels decode like an HMI readout when they arrive (ref 02-lusion). A hidden copy carries the real text.
const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>-+#';
document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
  const text = el.textContent ?? '';
  el.innerHTML = `<span class="sr-only">${text}</span><span aria-hidden="true" data-scr>${text}</span>`;
});
function scramble(el: HTMLElement) {
  const out = el.querySelector<HTMLElement>('[data-scr]'); if (!out || reduce) return;
  const text = el.querySelector('.sr-only')!.textContent ?? '';
  const start = performance.now(), dur = 520 + text.length * 18;
  const frame = (now: number) => {
    const p = Math.min(1, (now - start) / dur), done = Math.floor(p * text.length);
    out.textContent = [...text].map((c, i) => (i < done || c === ' ' ? c : glyphs[(Math.random() * glyphs.length) | 0])).join('');
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Reveal on scroll, both ways: an element animates in as it arrives and back out when it leaves through the
// bottom (scrolling back up), then in again on the way down. Leaving through the top keeps it shown.
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  const el = e.target as HTMLElement;
  if (e.isIntersecting) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (el.matches('[data-counter]')) roll(el);
    if (el.matches('[data-scramble]')) scramble(el);
  } else if (e.boundingClientRect.top > 0) el.classList.remove('in');
}), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal], [data-split], [data-scramble], .sheet, [data-counter], [data-gauge]').forEach((el) => io.observe(el));

// Looping clips play while on screen and pause off screen; a clip the visitor paused stays paused
document.querySelectorAll<HTMLVideoElement>('video[data-autoplay]').forEach((v) => {
  let userPaused = false;
  v.addEventListener('pause', () => { if (v.dataset.auto !== '1') userPaused = true; v.dataset.auto = ''; });
  v.addEventListener('play', () => (userPaused = false));
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !userPaused) v.play().catch(() => {});
    else if (!e.isIntersecting && !v.paused) { v.dataset.auto = '1'; v.pause(); }
  }, { threshold: 0.2 }).observe(v);
});

// Magnetic pills: buttons lean toward the pointer and spring back (fine pointers, motion allowed)
if (!reduce && matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll<HTMLElement>('.pill').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px`);
      b.style.setProperty('--my', `${((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1)}px`);
    });
    b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
  });
}

// Odometer: wind the reels back to zero, then let them roll up to their value
function roll(counter: HTMLElement) {
  if (reduce) return;
  const cols = [...counter.querySelectorAll<HTMLElement>('.col')];
  const target = cols.map((c) => c.style.getPropertyValue('--n'));
  cols.forEach((c) => { c.style.transition = 'none'; c.style.setProperty('--n', '0'); });
  void counter.offsetHeight;
  cols.forEach((c, i) => { c.style.transition = ''; c.style.setProperty('--n', target[i]); });
}
