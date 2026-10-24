// The name as a type specimen, drawn on a canvas. It opens by ruling its own metric lines (ascender, cap height,
// x-height, baseline, descender) and inking each letter over its outline. Afterwards a lens follows the pointer:
// letters under it turn back into dashed outlines with their side bearings showing. Drag a letter and it springs
// home; tap one and it jumps. With no pointer, the lens drifts slowly across on its own. The real h1 text lives in
// the page; this canvas is decoration (aria-hidden).
import { fit, loop, approach, clamp } from './gl';
import { onTheme, palettes, type Theme } from '../lib/theme';
import { calm } from '../lib/motion';

type Glyph = { ch: string; x: number; w: number; ox: number; oy: number; vx: number; vy: number; lens: number; shown: number };

const FAMILY = 'Archivo';
const WEIGHT = 500;
const TRACK = -0.045;       // em
const INTRO = 1.5;          // seconds
const SPRING = 260, DAMP = 15;

export async function mountSpecimen(canvas: HTMLCanvasElement, text: string) {
  const g = canvas.getContext('2d')!;
  const still = calm();
  await document.fonts.load(`${WEIGHT} 100px ${FAMILY}`).catch(() => {});

  let ink = '', accent = '', graphite = '';
  onTheme((t: Theme) => { ({ ink, accent, graphite } = palettes[t]); });

  let glyphs: Glyph[] = [];
  let size = 100, base = 0, m = { asc: 0, cap: 0, xh: 0, desc: 0 }, left = 0, dpr = 1;
  const font = (px: number) => `${WEIGHT} ${px}px ${FAMILY}`;

  // fit the name to the canvas width (or its height, whichever binds first) and measure every letter
  function layout() {
    const r = fit(canvas, 2);
    dpr = r.dpr;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    g.font = font(100);
    const track = TRACK * 100;
    const wide = g.measureText(text).width + track * (text.length - 1);
    const am = g.measureText('d'), dm = g.measureText('p');
    const tall = (am.actualBoundingBoxAscent + dm.actualBoundingBoxDescent) / 100;
    size = Math.min((W * 0.995) / (wide / 100), (H * 0.96) / tall);
    g.font = font(size);
    m = {
      asc: g.measureText('d').actualBoundingBoxAscent,
      cap: g.measureText('H').actualBoundingBoxAscent,
      xh: g.measureText('x').actualBoundingBoxAscent,
      desc: g.measureText('p').actualBoundingBoxDescent,
    };
    base = H - (H - (m.asc + m.desc)) / 2 - m.desc;
    left = 0;
    const tr = TRACK * size;
    const prev = glyphs;
    glyphs = [...text].map((ch, i) => {
      const x = g.measureText(text.slice(0, i)).width + tr * i;
      const w = g.measureText(text.slice(0, i + 1)).width + tr * i - x;
      const p = prev[i];
      return { ch, x, w, ox: p?.ox ?? 0, oy: p?.oy ?? 0, vx: p?.vx ?? 0, vy: p?.vy ?? 0, lens: p?.lens ?? 0, shown: p?.shown ?? 0 };
    });
  }
  layout();
  new ResizeObserver(() => { layout(); if (still) draw(0); }).observe(canvas);

  // pointer: a lens, a drag, a tap
  const ptr = { x: 0, y: 0, inside: false, idle: 0 };
  let drag = -1, dragFrom = { x: 0, y: 0, ox: 0, oy: 0 }, moved = 0;
  const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const hit = (x: number, y: number) => glyphs.findIndex((gl) => x >= left + gl.x + gl.ox && x <= left + gl.x + gl.ox + gl.w && y >= base - m.asc + gl.oy - 8 && y <= base + m.desc + gl.oy + 8 && gl.ch !== ' ');
  if (!still) {
    canvas.addEventListener('pointermove', (e) => {
      Object.assign(ptr, local(e), { inside: true, idle: 0 });
      if (drag >= 0) {
        const gl = glyphs[drag];
        gl.ox = dragFrom.ox + ptr.x - dragFrom.x; gl.oy = dragFrom.oy + ptr.y - dragFrom.y;
        moved = Math.max(moved, Math.hypot(ptr.x - dragFrom.x, ptr.y - dragFrom.y));
      }
      canvas.style.cursor = drag >= 0 ? 'grabbing' : hit(ptr.x, ptr.y) >= 0 ? 'grab' : '';
    });
    canvas.addEventListener('pointerleave', () => { ptr.inside = false; });
    canvas.addEventListener('pointerdown', (e) => {
      const p = local(e);
      const i = hit(p.x, p.y);
      if (i < 0) return;
      // touch keeps the page scrolling: a tap kicks the letter, only mouse and pen drag it
      if (e.pointerType === 'touch') { glyphs[i].vy -= 900; return; }
      drag = i; moved = 0;
      dragFrom = { ...p, ox: glyphs[i].ox, oy: glyphs[i].oy };
      canvas.setPointerCapture(e.pointerId);
    });
    const release = () => {
      if (drag < 0) return;
      if (moved < 4) glyphs[drag].vy -= 900;   // a click, not a drag: the letter jumps
      drag = -1;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  }

  let clock = still ? INTRO + 1 : 0;
  let lensX = -1e4, lensY = 0, presence = 0;

  const dashed = (on: boolean) => g.setLineDash(on ? [4, 3] : []);
  const hline = (y: number, x0: number, x1: number) => { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); };

  function draw(dt: number) {
    const r = fit(canvas, 2);
    if (r.dpr !== dpr) layout();
    const W = canvas.clientWidth, H = canvas.clientHeight;
    clock += dt;
    const intro = clamp((clock - 0.15) / INTRO);
    const introducing = intro < 1;
    ptr.idle += dt;

    // the lens: the pointer while it is over the name, otherwise a slow drift across after a pause
    const sweep = !introducing && !ptr.inside && drag < 0 && ptr.idle > 1.5 && !still;
    const tx = ptr.inside || drag >= 0 ? ptr.x : sweep ? W * (0.5 + 0.48 * Math.sin(clock * 0.32)) : lensX;
    const ty = ptr.inside ? ptr.y : base - m.xh / 2;
    lensX = approach(lensX < -1e3 ? tx : lensX, tx, dt, 0.09);
    lensY = approach(lensY, ty, dt, 0.09);
    presence = approach(presence, introducing ? 0 : ptr.inside || drag >= 0 ? 1 : sweep ? 0.55 : 0, dt, 0.25);
    const reach = size * 0.9;

    g.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.font = font(size);
    g.textBaseline = 'alphabetic';
    g.lineWidth = 1;

    // metric lines: ruled left to right during the intro, then shown only around the lens
    const lines = [base - m.asc, base - m.cap, base - m.xh, base, base + m.desc];
    lines.forEach((y, k) => {
      const yy = Math.round(y) + 0.5;
      if (introducing) {
        const p = clamp(intro * 2.2 - k * 0.12);
        const fade = clamp((1 - intro) * 3);
        g.strokeStyle = k === 3 ? accent : graphite;
        g.globalAlpha = 0.9 * fade;
        dashed(k !== 3);
        hline(yy, 0, W * (1 - Math.pow(1 - p, 3)));
      } else if (presence > 0.01) {
        const grad = g.createLinearGradient(lensX - reach * 1.6, 0, lensX + reach * 1.6, 0);
        const c = k === 3 ? accent : graphite;
        grad.addColorStop(0, 'transparent'); grad.addColorStop(0.5, c); grad.addColorStop(1, 'transparent');
        g.strokeStyle = grad;
        g.globalAlpha = presence * 0.9;
        dashed(k !== 3);
        hline(yy, Math.max(0, lensX - reach * 1.6), Math.min(W, lensX + reach * 1.6));
      }
    });

    // letters
    glyphs.forEach((gl, i) => {
      if (gl.ch === ' ') return;
      // spring home unless held
      if (i !== drag) {
        gl.vx += (-SPRING * gl.ox - DAMP * gl.vx) * dt; gl.vy += (-SPRING * gl.oy - DAMP * gl.vy) * dt;
        gl.ox += gl.vx * dt; gl.oy += gl.vy * dt;
        if (Math.abs(gl.ox) + Math.abs(gl.oy) + Math.abs(gl.vx) + Math.abs(gl.vy) < 0.05) { gl.ox = gl.oy = gl.vx = gl.vy = 0; }
      }
      const cx = left + gl.x + gl.w / 2 + gl.ox;
      const near = clamp(1 - Math.abs(cx - lensX) / reach) * presence;
      gl.lens = approach(gl.lens, i === drag ? 1 : near * near * (3 - 2 * near), dt, 0.12);
      // intro: each letter is outlined, then inked, one after another
      const start = 0.25 + (i / glyphs.length) * 0.5;
      gl.shown = introducing ? clamp((intro - start) / 0.22) : 1;
      const outlineIn = introducing ? clamp((intro - start + 0.12) / 0.12) : 0;
      const x = left + gl.x + gl.ox, y = base + gl.oy;

      const fill = gl.shown * (1 - gl.lens * 0.88);
      if (fill > 0.001) { g.globalAlpha = fill; g.fillStyle = ink; g.fillText(gl.ch, x, y); }
      const line = Math.max(gl.lens, introducing ? outlineIn * (1 - gl.shown) : 0);
      if (line > 0.01) {
        g.globalAlpha = line; g.strokeStyle = accent; g.lineWidth = Math.max(1, size / 140);
        dashed(true); g.strokeText(gl.ch, x, y); g.lineWidth = 1;
        // side bearings and the specks where they cross the baseline and cap height
        if (gl.lens > 0.05) {
          g.globalAlpha = gl.lens * 0.7; g.strokeStyle = graphite;
          [x, x + gl.w].forEach((sx) => { g.beginPath(); g.moveTo(Math.round(sx) + 0.5, y - m.asc - 6); g.lineTo(Math.round(sx) + 0.5, y + m.desc + 6); g.stroke(); });
          g.globalAlpha = gl.lens; g.fillStyle = accent;
          [[x, y], [x + gl.w, y], [x, y - m.cap], [x + gl.w, y - m.cap]].forEach(([sx, sy]) => g.fillRect(sx - 2.5, sy - 2.5, 5, 5));
        }
      }
      // a held letter shows how far it has been pulled
      if (i === drag && (gl.ox || gl.oy)) {
        g.globalAlpha = 0.9; g.strokeStyle = accent; dashed(true);
        g.beginPath(); g.moveTo(left + gl.x + gl.w / 2, base - m.xh / 2); g.lineTo(cx, base - m.xh / 2 + gl.oy); g.stroke();
      }
    });
    g.globalAlpha = 1;
    dashed(false);
  }

  if (still) draw(0);
  else loop(canvas, draw);
  onTheme(() => still && draw(0));
}
