// Concave carousel: a gallery wall that curves around the viewer. The panels hang on the inside of a drum, so the
// ones at the edges swing toward you and grow while the centre one sits furthest back. The wall drifts slowly;
// resting the pointer on it brakes the drift, dragging turns it (the point you hold stays under the pointer) and a
// flick carries on before it settles with a panel centred, like a dial with detents. Clicking a side panel turns
// the wall to it; clicking the centred one opens the project. The caption and the counter follow the centre.
// Everything moves with CSS 3D transforms (composited on the GPU), so the page never repaints for it.
import { loop, clamp } from './gl';
import { calm } from '../lib/motion';
import { onTheme, palette } from '../lib/theme';

export type CarouselItem = { title: string; subtitle: string; tag: string; href: string; src?: string };

const ASPECT = 1.25;      // panel width / height
const SIZE = 0.46;        // centred panel height, × the stage height
const CURVE = 0.72;       // 0 = a flat strip, 1 = a tight drum
const DISTANCE = 4;       // viewer distance from the wall, × panel height
const GAP = 16;           // px between panels at the centre
const DIM = 0.35;         // fade toward the left and right edges
const DRIFT = 0.16;       // panels per second
const INERTIA = 0.5;      // how far a flick carries
const REPEAT = 2;         // the projects go round the wall this many times, so it always looks full
const SHOW = 1.75;        // panels further round than this (radians) are hidden

export function mountCarousel(root: HTMLElement, items: CarouselItem[]) {
  const stage = root.querySelector<HTMLElement>('[data-cc-stage]')!;
  const wall = root.querySelector<HTMLElement>('[data-cc-wall]')!;
  const capTitle = root.querySelector<HTMLElement>('[data-cap-title]')!;
  const capSub = root.querySelector<HTMLElement>('[data-cap-sub]')!;
  const capLink = root.querySelector<HTMLAnchorElement>('[data-cap-link]')!;
  const count = root.querySelector<HTMLElement>('[data-cc-count]')!;
  const still = calm();
  const N = items.length * REPEAT;

  // build the panels: the project's cover, or a drawn placeholder card, plus a faint reflection on the floor
  let art = items.map((it, i) => it.src ?? cardArt(it, i).toDataURL('image/webp', 0.9));
  const panels = Array.from({ length: N }, (_, i) => {
    const it = items[i % items.length];
    const el = document.createElement('a');
    el.className = 'cc-panel';
    el.href = it.href;
    el.tabIndex = -1;                       // the stage takes keyboard focus; the panels are for pointers
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<img src="${art[i % items.length]}" alt="" draggable="false"><img class="cc-ref" src="${art[i % items.length]}" alt="" draggable="false"><span class="cc-dim"></span><span class="bt"></span>`;
    wall.append(el);
    return { el, dim: el.querySelector<HTMLElement>('.cc-dim')! };
  });

  let W = 0, H = 0, R = 1, step = 1;
  function layout() {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    H = Math.min(sh * SIZE, (sw * 0.62) / ASPECT);
    W = H * ASPECT;
    step = CURVE * (Math.PI / 4);          // angle between neighbours
    R = (W + GAP) / step;                  // drum radius that keeps the gap at the centre
    stage.style.perspective = `${DISTANCE * H}px`;
    wall.style.width = `${W}px`; wall.style.height = `${H}px`;
    root.style.setProperty('--cc-r', `${Math.max(6, (14 * H) / 300)}px`);
  }
  layout();
  new ResizeObserver(() => { layout(); place(); }).observe(stage);

  // pos is the panel index at the centre (fractional while turning)
  let pos = 0, target: number | null = null, vel = 0, brake = 1, paused = still;
  let drag: { x: number; pos: number; moved: number; lastX: number; lastT: number } | null = null;
  let hover = false, current = -1;

  const wrap = (d: number) => ((d % N) + N * 1.5) % N - N / 2;   // shortest signed distance round the wall
  const centred = () => ((Math.round(pos) % N) + N) % N;
  const goTo = (i: number) => { target = pos + wrap(i - pos); };

  function place() {
    for (let i = 0; i < N; i++) {
      const a = wrap(i - pos) * step;
      const p = panels[i];
      if (Math.abs(a) > SHOW) { p.el.style.visibility = 'hidden'; continue; }
      p.el.style.visibility = '';
      // hang the panel R behind the drum's axis, swing it round the axis, then bring the axis forward by R
      p.el.style.transform = `translateZ(${R}px) rotateY(${-a}rad) translateZ(${-R}px)`;
      p.dim.style.opacity = String(clamp((Math.abs(a) / SHOW) * DIM * 1.6, 0, 0.85));
    }
    const c = centred(), item = c % items.length;
    if (c !== current) { current = c; caption(item); }
  }

  function draw(dt: number) {
    if (!drag) {
      if (target !== null) {
        pos += (target - pos) * (1 - Math.exp(-dt / 0.16));
        if (Math.abs(target - pos) < 1e-3) { pos = target; target = null; }
      } else if (Math.abs(vel) > 0.02) {
        // a flick: coast, then settle on the nearest detent
        pos += vel * dt; vel *= Math.exp(-dt / (0.25 + INERTIA * 0.5));
        if (Math.abs(vel) < 0.4) { target = Math.round(pos); vel = 0; }
      } else {
        brake += ((hover || paused ? 0 : 1) - brake) * (1 - Math.exp(-dt / 0.35));
        pos += DRIFT * brake * dt;
      }
    }
    place();
  }

  // pointer: drag to turn, flick to coast, click a side panel to turn to it, click the centre one to open it
  stage.addEventListener('pointerenter', () => (hover = true));
  stage.addEventListener('pointerleave', () => (hover = false));
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, pos, moved: 0, lastX: e.clientX, lastT: performance.now() };
    target = null; vel = 0;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - drag.x;
    pos = drag.pos - dx / (W + GAP);
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    const dt = Math.max(8, now - drag.lastT) / 1000;
    vel = -((e.clientX - drag.lastX) / (W + GAP)) / dt;
    drag.lastX = e.clientX; drag.lastT = now;
    if (still) place();
  });
  stage.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const tap = drag.moved < 6;
    if (performance.now() - drag.lastT > 90) vel = 0;
    drag = null;
    if (tap) {
      vel = 0;
      const el = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest('.cc-panel');
      const i = panels.findIndex((p) => p.el === el);
      if (i >= 0 && i === centred() && target === null) location.href = items[i % items.length].href;
      else if (i >= 0) goTo(i);
      else target = Math.round(pos);
    } else if (Math.abs(vel) < 0.4) target = Math.round(pos);
    if (still && target !== null) { pos = target; target = null; vel = 0; place(); }
  });
  stage.addEventListener('pointercancel', () => { drag = null; target = Math.round(pos); });
  // panel links only open through the click logic above, never on the press that ends a drag
  wall.addEventListener('click', (e) => e.preventDefault());
  // a sideways trackpad swipe turns the wall; vertical scrolling stays with the page
  stage.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    target = Math.round((target ?? pos) + Math.sign(e.deltaX));
  }, { passive: false });

  // keyboard and buttons
  const turn = (d: number) => {
    target = Math.round(target ?? pos) + d;
    if (still) { pos = target; target = null; place(); }
  };
  root.querySelector('[data-cc-prev]')!.addEventListener('click', () => turn(-1));
  root.querySelector('[data-cc-next]')!.addEventListener('click', () => turn(1));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { turn(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { turn(-1); e.preventDefault(); }
    else if (e.key === 'Enter') location.href = items[centred() % items.length].href;
    else if (e.key === ' ') { paused = !paused; e.preventDefault(); }
  });

  function caption(i: number) {
    const it = items[i];
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    root.classList.add('cap-out');
    setTimeout(() => {
      capTitle.textContent = it.title; capSub.textContent = it.subtitle; capLink.href = it.href;
      root.classList.remove('cap-out');
    }, still ? 0 : 150);
  }

  // placeholder panels are drawn in the era's colours, so redraw them after a time jump
  onTheme(() => {
    art = items.map((it, i) => it.src ?? cardArt(it, i).toDataURL('image/webp', 0.9));
    panels.forEach((p, i) => p.el.querySelectorAll('img').forEach((im) => (im.src = art[i % items.length])));
  });

  place();
  if (!still) loop(stage, draw);
}

// A placeholder cover drawn for a project with no image yet: dark card, an abstract shape in the accent reds,
// the project's number, title and category, so a visitor sees what the slot is for.
function cardArt(it: CarouselItem, i: number) {
  const Wd = 800, Ht = 640, c = document.createElement('canvas');
  c.width = Wd; c.height = Ht;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, Wd, Ht);
  const { paper, accent } = palette();   // drawn in the current era's colours
  bg.addColorStop(0, mixHex(paper, accent, [0.16, 0.05, 0.22, 0.03, 0.12][i % 5]));
  bg.addColorStop(1, paper);
  g.fillStyle = bg; g.fillRect(0, 0, Wd, Ht);
  // one bold shape per slot, so the panels read as different pieces of work
  const red = g.createLinearGradient(0, Ht, Wd, 0);
  red.addColorStop(0, mixHex(accent, '#000000', 0.25)); red.addColorStop(1, mixHex(accent, '#ffffff', 0.25));
  g.fillStyle = red; g.strokeStyle = red;
  g.globalAlpha = 0.92;
  g.beginPath();
  switch (i % 5) {
    case 0: g.arc(Wd * 0.66, Ht * 0.4, Ht * 0.26, 0, Math.PI * 2); g.fill(); break;                             // sun
    case 1: g.roundRect(Wd * 0.2, Ht * 0.24, Wd * 0.6, Ht * 0.3, Ht * 0.15); g.fill(); break;                  // display pill
    case 2: g.moveTo(Wd * 0.18, Ht * 0.64); g.lineTo(Wd * 0.55, Ht * 0.14); g.lineTo(Wd * 0.88, Ht * 0.64); g.fill(); break; // peak
    case 3: g.arc(Wd * 0.5, Ht * 0.64, Ht * 0.42, Math.PI, Math.PI * 2); g.fill(); break;                      // arch
    default: g.moveTo(Wd * 0.1, Ht * 0.5); g.bezierCurveTo(Wd * 0.35, Ht * 0.1, Wd * 0.6, Ht * 0.85, Wd * 0.92, Ht * 0.3);
      g.lineWidth = Ht * 0.09; g.lineCap = 'round'; g.stroke();                                                // wave
  }
  g.globalAlpha = 1;
  // fade the bottom so the type reads
  const shade = g.createLinearGradient(0, Ht * 0.45, 0, Ht);
  shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = shade; g.fillRect(0, 0, Wd, Ht);
  const font = getComputedStyle(document.documentElement).getPropertyValue('--font');   // the era's own face
  g.fillStyle = '#F2F2F0';
  g.font = `600 ${Ht * 0.05}px ${font}`;
  g.fillText(String(i + 1).padStart(2, '0'), Wd * 0.06, Ht * 0.11);
  g.textAlign = 'right'; g.globalAlpha = 0.7;
  g.fillText(it.tag.toUpperCase(), Wd * 0.94, Ht * 0.11);
  g.textAlign = 'left'; g.globalAlpha = 1;
  g.font = `700 ${Ht * 0.085}px ${font}`;
  g.fillText(it.title, Wd * 0.06, Ht * 0.82);
  g.font = `500 ${Ht * 0.042}px ${font}`; g.globalAlpha = 0.65;
  g.fillText('Coming soon', Wd * 0.06, Ht * 0.92);
  return c;
}

// '#rrggbb' blended toward another, t = 0 → a, 1 → b
function mixHex(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

