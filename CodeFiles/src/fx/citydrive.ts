// The projects drive, played from frames rendered in Blender (D:/Main Portfolio/city): the page's scroll picks the
// frame, two neighbouring frames are blended for in-between positions, and each project's poster is laid over its
// billboard's face in perspective (a homography per frame from the face's corners, exported by the renderer). The
// poster is multiplied into the render, so it takes the face's light: dim on an unlit board at night, bright once
// its lamps come on, softened by distance haze. Posters are buttons: clicking one opens its project.
// Night frames for the dark theme, day frames for the light one; a portrait set for tall screens.
// The frames have no traffic: the cars are drawn live over them (traffic.ts) through the same camera, so they keep
// driving wherever the scroll stops. Smoothness: frames are decoded off the main thread a few at a time around the car
// (never while drawing); the two frames of a blend are lined up by the camera's turn between them, so a blend never
// shows a double image; and when the scroll rests near a billboard the car rolls onto its stop.
import { mountTraffic, type View } from './traffic';

export type DriveItem = { title: string; tag: string; sub: string; slug: string; href: string; img?: string };
type Cam = [x: number, y: number, z: number, yaw: number, pitch: number, fov: number];
type ModeData = { n: number; w: number; h: number; stops: number[]; boards: (number[] | null)[][]; cam: Cam[] };
type Manifest = { version: string; modes: Record<'desktop' | 'portrait', ModeData> };
type Hooks = { onFocus?: (i: number) => void; onProgress?: (loaded: number) => void; onReady?: () => void; onFail?: () => void; onOpen?: (i: number, rect: DOMRect) => void };
type Pic = ImageBitmap | HTMLImageElement;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
// frames are drawn this much larger than the stage, so a frame shifted to line up with its neighbour never shows its edge
const OVER = 1.03;

/** CSS matrix3d that maps a w × h element onto the quad tl, tr, br, bl (px). */
function quad(w: number, h: number, q: number[]) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${c},${f},0,1)`;
}

/** One billboard's poster: the project's picture (or a placeholder shape) and a caption band, 1600 × 1000. */
function poster(it: DriveItem, i: number, n: number, img: HTMLImageElement | null) {
  const W = 1600, H = 1000, BAND = 236, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue('--font-display').trim() || 'sans-serif';
  const weight = css.getPropertyValue('--display-weight').trim() || '400';
  const mono = css.getPropertyValue('--font-mono').trim() || 'monospace';
  const body = css.getPropertyValue('--font').trim() || 'sans-serif';
  const ih = H - BAND;
  if (img) {
    const s = Math.max(W / img.width, ih / img.height), w = img.width * s, h = img.height * s;
    g.drawImage(img, (W - w) / 2, (ih - h) / 2, w, h);
  } else {
    // a placeholder: brushed graphite with one bold silver shape, different for each project
    const bg = g.createLinearGradient(0, 0, W, ih); bg.addColorStop(0, '#2c2c33'); bg.addColorStop(1, '#101013');
    g.fillStyle = bg; g.fillRect(0, 0, W, ih);
    for (let y = 0; y < ih; y += 3) { g.fillStyle = `rgba(255,255,255,${0.012 + ((y * 7919) % 13) / 13 * 0.012})`; g.fillRect(0, y, W, 1); }
    const sh = g.createLinearGradient(W * 0.4, 0, W, ih); sh.addColorStop(0, '#ececf1'); sh.addColorStop(1, '#73737d');
    g.fillStyle = sh; g.beginPath();
    switch (i % 6) {
      case 0: g.arc(W * 0.7, ih * 0.5, ih * 0.3, 0, Math.PI * 2); break;
      case 1: g.roundRect(W * 0.46, ih * 0.3, W * 0.42, ih * 0.26, ih * 0.13); break;
      case 2: g.moveTo(W * 0.5, ih * 0.78); g.lineTo(W * 0.7, ih * 0.2); g.lineTo(W * 0.9, ih * 0.78); break;
      case 3: g.arc(W * 0.7, ih * 0.82, ih * 0.44, Math.PI, Math.PI * 2); break;
      case 4: g.roundRect(W * 0.56, ih * 0.16, W * 0.3, ih * 0.6, 40); break;
      default: g.arc(W * 0.7, ih * 0.5, ih * 0.3, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(W * 0.7, ih * 0.5);
    }
    g.fill();
    g.font = `500 34px ${mono}`; g.fillStyle = 'rgba(232,232,238,.62)'; g.textBaseline = 'top';
    g.fillText('COMING SOON', 72, 72);
  }
  // the caption band along the foot, like a real billboard's
  g.fillStyle = '#0b0b0d'; g.fillRect(0, ih, W, BAND);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, ih, W, 2);
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#F5F5F7'; g.font = `${weight} 104px ${display}`;
  g.fillText(String(i + 1).padStart(2, '0'), 64, ih + 150);
  g.font = `600 64px ${body}`;
  g.fillText(it.title, 260, ih + 112, W - 260 - 380);
  g.font = `500 30px ${mono}`; g.fillStyle = 'rgba(232,232,238,.62)';
  g.fillText(`${it.tag.toUpperCase()} · ${it.sub.toUpperCase()}`, 262, ih + 170, W - 262 - 380);
  g.textAlign = 'right'; g.fillStyle = 'rgba(232,232,238,.5)';
  g.fillText(`${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, W - 64, ih + 112);
  g.fillStyle = '#F5F5F7'; g.fillText('OPEN PROJECT →', W - 64, ih + 170);
  return c;
}

const loadImage = (src: string) => new Promise<HTMLImageElement | null>((done) => {
  const i = new Image(); i.decoding = 'async'; i.onload = () => done(i); i.onerror = () => done(null); i.src = src;
});

const saveData = !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
// how much decoded picture to hold (a decoded wide frame is about 6 MB): more on machines with memory to spare
const BUDGET = (() => {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (mem) return (mem >= 8 ? 200 : mem >= 4 ? 120 : 64) * 1e6;
  return (matchMedia('(pointer: coarse)').matches ? 80 : 160) * 1e6;
})();

/** One theme and screen shape's frames. The files download coarse to fine (the stops first, then every 16th, 8th,
 *  ...) and are kept compressed; only the frames around the car are decoded, off the main thread, nearest first. */
class Frames {
  blobs: (Blob | null)[];
  pics: (Pic | null)[];
  held = new Set<number>(); decoding = new Set<number>();
  loaded = 0; failed = 0; active = 0; queue: number[] = []; stopped = false; center = 0; reach: number;
  constructor(public key: string, public mode: 'desktop' | 'portrait', public url: (k: number) => string, public n: number, stops: number[], w: number, h: number, public onChange: (k: number, decoded: boolean) => void) {
    this.blobs = new Array(n).fill(null); this.pics = new Array(n).fill(null);
    this.reach = Math.max(4, Math.floor(BUDGET / (w * h * 4) / 2));
    const seen = new Set<number>(), order: number[] = [];
    const add = (k: number) => { if (k >= 0 && k < n && !seen.has(k)) { seen.add(k); order.push(k); } };
    add(0); stops.forEach(add);
    // on a data-saver connection, every fourth frame (the blend between frames covers the gaps)
    for (const step of saveData ? [16, 8, 4] : [16, 8, 4, 2, 1]) for (let k = 0; k < n; k += step) add(k);
    this.queue = order;
  }
  start(parallel = 6) { for (let p = 0; p < parallel; p++) this.next(); }
  priority(k: number) {
    // whatever is near the current frame jumps the queue, so a jump to a far stop fills in quickly
    const near = this.queue.filter((q) => Math.abs(q - k) <= 8);
    if (near.length) this.queue = near.concat(this.queue.filter((q) => Math.abs(q - k) > 8));
  }
  next() {
    if (this.stopped) return;
    const k = this.queue.shift();
    if (k === undefined) return;
    this.active++;
    fetch(this.url(k)).then((r) => (r.ok ? r.blob() : null)).catch(() => null).then((b) => {
      this.active--;
      if (b) { this.blobs[k] = b; this.loaded++; } else this.failed++;
      this.onChange(k, false);
      this.next();
      if (b && Math.abs(k - this.center) <= this.reach) this.decode();
    });
  }
  /** Keep the frames around k decoded. */
  focus(k: number) { if (k !== this.center) { this.center = k; this.decode(); } }
  decode() {
    const c = this.center, R = this.reach;
    for (const k of this.held) if (Math.abs(k - c) > R + 2) this.drop(k);
    // nearest first, ahead of the car before behind it; three at a time
    for (let d = 0; d <= R && this.decoding.size < 3; d++) {
      for (const k of d ? [c + d, c - d] : [c]) {
        if (k < 0 || k >= this.n || this.pics[k] || this.decoding.has(k) || !this.blobs[k] || this.decoding.size >= 3) continue;
        this.decodeOne(k);
      }
    }
  }
  async decodeOne(k: number) {
    this.decoding.add(k);
    let pic: Pic | null = null;
    try {
      if (typeof createImageBitmap === 'function') pic = await createImageBitmap(this.blobs[k]!);
      else {
        const u = URL.createObjectURL(this.blobs[k]!), img = new Image(); img.src = u;
        await img.decode(); URL.revokeObjectURL(u); pic = img;
      }
    } catch { pic = null; }
    this.decoding.delete(k);
    if (pic && !this.stopped && Math.abs(k - this.center) <= this.reach + 2) { this.pics[k] = pic; this.held.add(k); this.onChange(k, true); }
    else if (pic && 'close' in pic) pic.close();
    if (!this.stopped) this.decode();
  }
  drop(k: number) {
    const p = this.pics[k];
    if (p && 'close' in p) p.close();
    this.pics[k] = null; this.held.delete(k);
  }
  /** Let go of every decoded frame (the set is off screen); the compressed files stay for a quick return. */
  release() { for (const k of [...this.held]) this.drop(k); }
  /** The decoded frame nearest to k, or -1. */
  nearest(k: number) {
    for (let d = 0; d <= this.reach + 2; d++) {
      if (k - d >= 0 && this.pics[k - d]) return k - d;
      if (k + d < this.n && this.pics[k + d]) return k + d;
    }
    return -1;
  }
}

export function mountCityDrive(stage: HTMLElement, items: DriveItem[], opt: { base: string; manifest: string; hooks: Hooks }) {
  const { base, hooks } = opt;
  const canvas = document.createElement('canvas');
  canvas.className = 'drive-canvas'; canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);
  const g = canvas.getContext('2d', { alpha: false })!;
  const layer = document.createElement('div'); layer.className = 'drive-posters';
  canvas.after(layer);
  const n = items.length;
  const buttons = items.map((it, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'drive-poster'; b.setAttribute('aria-label', `Open ${it.title}`);
    b.appendChild(poster(it, i, n, null));
    const ring = document.createElement('span'); ring.className = 'drive-ring'; ring.setAttribute('aria-hidden', 'true');
    layer.append(b, ring);
    b.addEventListener('click', () => hooks.onOpen?.(i, b.getBoundingClientRect()));
    return { b, ring, canvas: b.firstChild as HTMLCanvasElement, t: '', on: false };
  });
  // the posters' real pictures, once the fonts and covers are in
  document.fonts.ready.then(() => Promise.all(items.map((it) => (it.img ? loadImage(it.img) : Promise.resolve(null))))).then((imgs) => {
    imgs.forEach((img, i) => { if (img) { const c = poster(items[i], i, n, img); buttons[i].b.replaceChild(c, buttons[i].canvas); buttons[i].canvas = c; } });
    dirty = true; kick();
  });

  let man: Manifest | null = null;
  let mode: 'desktop' | 'portrait' = 'desktop';
  let theme: 'night' | 'day' = 'night';
  let frames: Frames | null = null;          // the set we want (this theme and screen shape)
  let display: Frames | null = null;         // the set on screen: the old one stays until the new one has frames here
  const sets = new Map<string, Frames>();
  let target = 0, shown = 0, raf = 0, dirty = true, alive = true, wanted = false, focus = -1, ready = false, lastInput = 0, lastT = 0;
  let cssW = 1, cssH = 1, dpr = 1, onScreen = false, view: View | null = null;
  let traffic: ReturnType<typeof mountTraffic> = null;

  const pickMode = () => (stage.clientWidth / Math.max(1, stage.clientHeight) < 0.85 ? 'portrait' : 'desktop');
  const setFor = (th: string, md: string) => {
    const key = `${th}-${md}`;
    let s = sets.get(key);
    if (!s && man) {
      const m = man.modes[md as 'desktop'];
      s = new Frames(key, md as 'desktop', (k) => `${base}${key}/${String(k).padStart(4, '0')}.webp?v=${man!.version}`, m.n, m.stops, m.w, m.h, (k, decoded) => {
        if (!decoded && s === frames) {
          hooks.onProgress?.(s.loaded / s.n);
          if (s.failed > 12 && s.loaded === 0) {
            // this set can't be had: stay with the one on screen if there is one, otherwise give up on the drive
            s.stopped = true;
            if (display && display !== s) { frames = display; mode = display.mode; } else hooks.onFail?.();
          }
        }
        // a frame just decoded near the car may change the picture (or let the wanted set take over): draw again
        if (decoded && (s === frames || s === display) && Math.abs(k - clamp(shown) * (s.n - 1)) <= 8) { dirty = true; kick(); }
      });
      sets.set(key, s);
    }
    return s!;
  };
  const choose = () => {
    if (!man) return;
    const md = pickMode();
    const next = setFor(theme, md);
    if (frames === next) return;
    if (frames && frames !== display) { frames.stopped = true; frames.release(); }
    mode = md; frames = next; frames.stopped = false;
    if (wanted && !frames.active) frames.start();
    dirty = true; kick();
  };

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cssW = stage.clientWidth; cssH = stage.clientHeight;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    traffic?.setSize(cssW, cssH, dpr);
    if (man && pickMode() !== mode) choose();
    dirty = true; kick();
  };

  const draw = () => {
    if (!man || !frames) return false;
    // hand over to the wanted set once it has a frame close to where we are
    if (display !== frames) {
      const mf = man.modes[frames.mode], k = Math.round(clamp(shown) * (mf.n - 1));
      frames.focus(k);
      const j = frames.nearest(k);
      if (j >= 0 && (Math.abs(j - k) <= 8 || !display)) {
        if (display) { display.stopped = true; display.release(); }
        display = frames;
        traffic?.setTheme(theme);   // the cars change with the picture, not before it
      }
    }
    if (!display) return false;
    const set = display;
    const m = man.modes[set.mode];
    const f = clamp(shown) * (m.n - 1);
    set.focus(Math.round(f));
    let a = Math.floor(f), b = Math.min(m.n - 1, a + 1), w = f - a;
    // blend the two frames around f; if they aren't decoded yet, the nearest one that is, on its own
    if (!set.pics[a] || (w > 0.002 && !set.pics[b])) {
      const k = set.nearest(Math.round(f));
      if (k < 0) return false;   // nothing near is decoded yet: keep what's on screen
      a = b = k; w = 0;
    }
    // place each frame so it lines up with the in-between camera: the turn, tilt and zoom between the two frames,
    // as a shift and scale of each (true for the camera's turn, which is most of what changes between frames)
    const S = Math.max(cssW / m.w, cssH / m.h) * OVER;
    const cam = m.cam;
    const place = (k: number) => {
      let s = S, ux = 0, uy = 0;
      if (a !== b) {
        const [, , , ya, pa, fa] = cam[a], [, , , yb, pb, fb] = cam[b], [, , , yk, pk, fk] = cam[k];
        const fw = fa + (fb - fa) * w, Fk = m.h / 2 / Math.tan((fk * Math.PI) / 360);
        s = S * Math.tan((fk * Math.PI) / 360) / Math.tan((fw * Math.PI) / 360);
        ux = Fk * Math.tan(ya + (yb - ya) * w - yk);
        uy = -Fk * Math.tan(pa + (pb - pa) * w - pk);
      }
      const x = clamp(cssW / 2 - (m.w / 2 + ux) * s, cssW - m.w * s, 0), y = clamp(cssH / 2 - (m.h / 2 + uy) * s, cssH - m.h * s, 0);
      return { x, y, s };
    };
    const pa = place(a), pb = place(b);
    // the in-between camera, for the live traffic
    const ca = cam[a], cb = cam[b], l = (i: number) => ca[i] + (cb[i] - ca[i]) * w;
    view = { x: l(0), y: l(1), z: l(2), yaw: l(3), pitch: l(4), fov: l(5), scale: S, frameH: m.h };
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.drawImage(set.pics[a]!, pa.x, pa.y, m.w * pa.s, m.h * pa.s);
    if (b !== a && w > 0.002) { g.globalAlpha = w; g.drawImage(set.pics[b]!, pb.x, pb.y, m.w * pb.s, m.h * pb.s); }
    if (!ready) { ready = true; hooks.onReady?.(); }
    // the posters: each face's corners from both frames, placed as their frames are, blended, grown a touch to cover
    // the face's edge
    const ra = m.boards[a], rb = m.boards[b];
    for (let i = 0; i < n; i++) {
      const qa = ra[i], qb = rb[i], btn = buttons[i];
      let px: number[] | null = null;
      if (qa && qb) px = qa.map((v, j) => (j % 2 ? (pa.y + v * m.h * pa.s) * (1 - w) + (pb.y + qb[j] * m.h * pb.s) * w : (pa.x + v * m.w * pa.s) * (1 - w) + (pb.x + qb[j] * m.w * pb.s) * w));
      else if (qa || qb) { const q = (w < 0.5 ? qa : qb) || qa || qb!, p = q === qa ? pa : pb; px = q.map((v, j) => (j % 2 ? p.y + v * m.h * p.s : p.x + v * m.w * p.s)); }
      let show = false;
      if (px) {
        const cx = (px[0] + px[2] + px[4] + px[6]) / 4, cy = (px[1] + px[3] + px[5] + px[7]) / 4;
        px = px.map((v, j) => (j % 2 ? cy + (v - cy) * 1.008 : cx + (v - cx) * 1.008));
        const area = Math.abs((px[2] - px[0]) * (px[7] - px[1]));
        show = area > 900 && px.some((v, j) => (j % 2 ? v > 0 && v < cssH : v > 0 && v < cssW));
      }
      // only touch the page when something changed: a style write per poster per frame adds up on a phone
      if (show !== btn.on) {
        btn.on = show;
        btn.b.style.visibility = btn.ring.style.visibility = show ? 'visible' : 'hidden';
        btn.b.tabIndex = show ? 0 : -1;
      }
      if (show) {
        const t = quad(800, 500, px!);
        if (t !== btn.t) { btn.t = t; btn.b.style.transform = btn.ring.style.transform = t; }
      }
    }
    // which project the car is at: the nearest stop
    let near = 0, best = Infinity;
    m.stops.forEach((st, i) => { const d = Math.abs(st - f); if (d < best) { best = d; near = i; } });
    if (near !== focus) { focus = near; hooks.onFocus?.(near); }
    return true;
  };

  const frame = (now: number) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.1, lastT ? (now - lastT) / 1000 : 1 / 60);
    lastT = now;
    const m = man ? man.modes[(display || frames)?.mode ?? mode] : null;
    const idle = performance.now() - lastInput > 160;
    let goal = target;
    if (m) {
      const last = m.n - 1, tf = target * last;
      let best = Infinity, stop = 0;
      m.stops.forEach((st, i) => { const d = Math.abs(st - tf); if (d < best) { best = d; stop = i; } });
      const reach = Math.max(4, Math.round((m.stops[1] - m.stops[0]) * 0.16));   // how near a stop counts as at it
      // at rest: near a billboard the car rolls onto its stop; anywhere else it settles on a whole frame, so a still
      // image never shows two frames blended
      if (idle) goal = (best <= reach ? m.stops[stop] : Math.round(tf)) / last;
    }
    const before = shown;
    shown += (goal - shown) * (1 - Math.exp(-dt / 0.085));   // eases toward the scroll at the same pace at any refresh rate
    if (Math.abs(goal - shown) < 2e-5) shown = goal;
    if (shown !== before || dirty) dirty = !draw();
    // the traffic moves on its own clock: drawn every frame while the drive is on screen, in step with the picture
    if (view && traffic && onScreen) traffic.render(view, now);
    if (shown !== goal || performance.now() - lastInput < 220 || (onScreen && traffic?.ready)) raf = requestAnimationFrame(frame);
    else lastT = 0;
  };
  const kick = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };

  const ro = new ResizeObserver(resize); ro.observe(stage);
  // the traffic: its WebGL and its cars only once the drive is near, like the frames
  const startTraffic = () => {
    if (traffic || !man || !wanted) return;
    traffic = mountTraffic(canvas, { base, version: man.version, onReady: () => { traffic?.canvas.classList.add('on'); kick(); } });
    traffic?.setTheme(display?.key.startsWith('day') ? 'day' : 'night');
    traffic?.setSize(cssW, cssH, dpr);
  };
  // start loading when the drive is near, not on page load
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || wanted) return;
    wanted = true; frames?.start(); startTraffic();
  }, { rootMargin: '150% 0px' });
  io.observe(stage);
  // the traffic only runs while the drive is on screen
  const seen = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) kick(); });
  seen.observe(stage);

  fetch(opt.manifest).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((m: Manifest) => {
    man = m;
    resize(); choose();   // choose() starts the downloads if the drive is already near
    startTraffic();
  }).catch(() => hooks.onFail?.());

  return {
    /** 0 → 1 along the drive. */
    setProgress(p: number) {
      target = clamp(p); lastInput = performance.now();
      if (frames && man) frames.priority(Math.round(target * (man.modes[mode].n - 1)));
      kick();
    },
    /** The progress at which the car is at stop i. */
    progressOf(i: number) { if (!man) return i / Math.max(1, n - 1); const m = man.modes[mode]; return m.stops[i] / (m.n - 1); },
    setTheme(th: 'night' | 'day') { if (th !== theme) { theme = th; choose(); } },
    rectOf(i: number) { return buttons[i].b.getBoundingClientRect(); },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); seen.disconnect();
      sets.forEach((s) => { s.stopped = true; s.release(); });
      traffic?.dispose();
      canvas.remove(); layer.remove();
    },
  };
}
