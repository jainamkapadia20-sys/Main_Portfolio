// Spin shutter (after React Bits Pro's, rebuilt from scratch in WebGL): an orbit of project cards that spins open
// and pulls focus where you point. The cards ride a ring seen from a camera a little above it, and the whole ring
// is rolled onto a diagonal. Near cards are large and sharp; far ones small, out of focus and hazed into the page.
// Hovering a card pulls focus to it and eases the spin to a stop; dragging along the ring spins it with momentum
// (dragging across tilts the view, which springs back); clicking brings a card to the front and clicking it again
// opens the project. The caption under the orbit names the card in focus.
// Everything is drawn on the GPU, one quad per card: depth of field comes from the texture's mip chain (a few
// taps at a blurrier level, not a per-frame canvas blur), and rounded corners, haze and a soft contact shadow are
// worked out per pixel. The project links also live in the page as a plain list; this canvas is decoration.
import { program, loop, clamp } from './gl';
import { onTheme, palette, rgb } from '../lib/theme';
import { calm } from '../lib/motion';

export type ShutterItem = { title: string; subtitle: string; tag: string; href: string; src?: string };

const REPEAT = 2;            // the projects go round twice, so the ring is full (7 projects → 14 cards)
const ASPECT = 1.45;         // card width ÷ height
const SIZE = 0.38;           // card height, × ring radius
const CORNER = 14;           // corner radius in px at the front
const TILT = 14;             // camera height above the ring, degrees
const ROLL = 24;             // the ring's roll on the page, degrees: high on the left, low on the right
const DIST = 3.2;            // camera distance, × ring radius
const RPM = 1.2;             // spin speed, turns per minute
const APERTURE = 0.45;       // depth of field; 0 keeps every card sharp
const HAZE = 0.3;            // far cards fade toward the page
const SHADOW = 0.35;
const INTRO = 1.8;           // seconds to spin open from a single stack
const TAU = Math.PI * 2, rad = Math.PI / 180;

const VS = `
in vec2 aCorner;             // 0..1 quad corner
uniform vec2 uView, uCenter, uHalf;
uniform float uPad;
out vec2 vLocal;             // position relative to the card's centre, css px, y down
void main() {
  vec2 local = (aCorner * 2.0 - 1.0) * (uHalf + uPad);
  vLocal = local;
  vec2 px = uCenter + local;
  gl_Position = vec4(px / uView * 2.0 - 1.0, 0.0, 1.0) * vec4(1.0, -1.0, 1.0, 1.0);
}`;

const FS = `
in vec2 vLocal;
out vec4 o;
uniform sampler2D uTex;
uniform vec2 uHalf;
uniform float uRadius, uLod, uBlur, uHaze, uShadow, uScale;
uniform vec3 uPaper;
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  float d = box(vLocal, uHalf, uRadius);
  float card = clamp(0.5 - d, 0.0, 1.0);
  vec2 uv = (vLocal + uHalf) / (2.0 * uHalf);
  // out of focus: five taps from a blurrier mip level, spread by the blur radius
  vec2 b = vec2(uBlur) / (2.0 * uHalf);
  vec3 c = textureLod(uTex, uv, uLod).rgb * 0.36
         + (textureLod(uTex, uv + vec2(b.x, 0.0), uLod).rgb + textureLod(uTex, uv - vec2(b.x, 0.0), uLod).rgb
          + textureLod(uTex, uv + vec2(0.0, b.y), uLod).rgb + textureLod(uTex, uv - vec2(0.0, b.y), uLod).rgb) * 0.16;
  c = mix(c, uPaper, uHaze);
  // soft contact shadow under the card, a little lower than it
  float sd = box(vLocal - vec2(0.0, 10.0 * uScale), uHalf, uRadius);
  float shadow = uShadow * exp(-max(sd, 0.0) / (22.0 * uScale)) * (1.0 - card);
  o = vec4(c * card, card + shadow * (1.0 - card));
}`;

export function mountShutter(root: HTMLElement, items: ShutterItem[]) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const capTitle = root.querySelector<HTMLElement>('[data-cap-title]')!;
  const capSub = root.querySelector<HTMLElement>('[data-cap-sub]')!;
  const capLink = root.querySelector<HTMLAnchorElement>('[data-cap-link]')!;
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return;
  const still = calm();
  const N = items.length * REPEAT, STEP = TAU / N;
  const { p, u } = program(gl, VS, FS);
  gl.useProgram(p);
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, 'aCorner');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform1i(u('uTex'), 0);

  // one mipmapped texture per project: its cover, or a drawn placeholder in the era's colours
  const textures = items.map(() => gl.createTexture()!);
  const upload = (i: number, img: TexImageSource) => {
    gl.bindTexture(gl.TEXTURE_2D, textures[i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  // state
  let rot = 0, spin = 1, open = still ? 1 : 0, introAt = -1, paused = false;
  let tiltKick = 0, tiltVel = 0, fling = 0;
  let target: number | null = null;
  const ptr = { x: 0, y: 0, on: false };
  let drag: { x: number; y: number; rot: number; moved: number } | null = null;
  let focusZ = 1, focusItem = -1, hovered = -1;
  let cards: { i: number; x: number; y: number; w: number; h: number; z: number }[] = [];
  let K = 1, cx = 0, cy = 0, W = 1, H = 1, dpr = 1;
  let paper: [number, number, number] = [0, 0, 0];

  // a point on the ring at angle a → screen (unit radius), its perspective scale and depth (+1 = nearest)
  function project(a: number, tilt: number) {
    const x = Math.sin(a), z = Math.cos(a);
    const yw = z * Math.sin(tilt), zw = z * Math.cos(tilt);
    const s = DIST / (DIST - zw);
    const px = x * s, py = yw * s, r = ROLL * rad;
    return { x: px * Math.cos(r) - py * Math.sin(r), y: px * Math.sin(r) + py * Math.cos(r), s, z: zw };
  }
  // fit the whole ring, cards included, inside the canvas
  function layout() {
    W = canvas.clientWidth; H = canvas.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
    let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
    for (let a = 0; a < TAU; a += TAU / 90) {
      const q = project(a, TILT * rad), hh = (SIZE * q.s) / 2, hw = hh * ASPECT;
      x0 = Math.min(x0, q.x - hw); x1 = Math.max(x1, q.x + hw); y0 = Math.min(y0, q.y - hh); y1 = Math.max(y1, q.y + hh);
    }
    K = Math.min((W * 0.94) / (x1 - x0), (H * 0.92) / (y1 - y0));
    cx = W / 2 - ((x0 + x1) / 2) * K; cy = H / 2 - ((y0 + y1) / 2) * K;
  }
  layout();
  new ResizeObserver(() => { layout(); if (still) draw(0); }).observe(canvas);

  onTheme(() => {
    paper = rgb(palette().paper);
    items.forEach((it, i) => { if (!it.src) upload(i, cardArt(it, i)); });
    if (still) draw(0);
  });
  items.forEach((it, i) => { if (!it.src) return; const im = new Image(); im.onload = () => upload(i, im); im.src = it.src; });

  const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const hit = (x: number, y: number) => {
    for (let k = cards.length - 1; k >= 0; k--) { const c = cards[k]; if (Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2) return c.i; }
    return -1;
  };
  const frontCard = () => { let best = 0, bz = -9; cards.forEach((c) => { if (c.z > bz) { bz = c.z; best = c.i; } }); return best; };
  const show = (i: number) => {                       // bring card i to the front by the shortest turn
    let t = -i * STEP;
    t += Math.round((rot - t) / TAU) * TAU;
    if (still) { rot = t; draw(0); } else target = t;
  };
  const open_ = (i: number) => { location.href = items[i % items.length].href; };

  canvas.addEventListener('pointermove', (e) => {
    Object.assign(ptr, local(e), { on: true });
    if (drag) {
      const dx = ptr.x - drag.x;
      rot = drag.rot + dx / K;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, ptr.y - drag.y));
      tiltKick = clamp((drag.y - ptr.y) / (K * 1.2), -1, 1) * 14;
    }
    canvas.style.cursor = drag ? 'grabbing' : hit(ptr.x, ptr.y) >= 0 ? 'pointer' : 'grab';
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { ptr.on = false; hovered = -1; });
  let lastX = 0, lastT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    const q = local(e);
    drag = { x: q.x, y: q.y, rot, moved: 0 };
    lastX = q.x; lastT = performance.now(); fling = 0; target = null;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const q = local(e), now = performance.now(), dt = Math.max(1, now - lastT) / 1000;
    fling = (q.x - lastX) / K / dt;
    lastX = q.x; lastT = now;
  }, { passive: true });
  canvas.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const tap = drag.moved < 6;
    drag = null;
    if (performance.now() - lastT > 80) fling = 0;
    if (!tap) return;
    fling = 0;
    const q = local(e), i = hit(q.x, q.y);
    if (i < 0) return;
    if (i === frontCard() && target === null) open_(i);   // already in front: open it
    else show(i);
  });
  // a sideways trackpad swipe turns the ring; vertical scrolling stays with the page
  canvas.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    show((frontCard() + (e.deltaX > 0 ? 1 : N - 1)) % N);
  }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    const f = frontCard();
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { show((f + 1) % N); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { show((f + N - 1) % N); e.preventDefault(); }
    else if (e.key === 'Enter') open_(f);
    else if (e.key === ' ') { paused = !paused; e.preventDefault(); }
  });

  if (!still) new IntersectionObserver(([e], io) => { if (e.isIntersecting) { introAt = 0; io.disconnect(); } }).observe(canvas);

  function draw(dt: number) {
    // motion: the intro opens the ring, then it spins; hover, a drag, a pending turn or pause ease it to a stop
    if (introAt >= 0) { introAt += dt; const t = clamp(introAt / INTRO); open = 1 - Math.pow(1 - t, 3); if (t >= 1) introAt = -1; }
    const holding = (ptr.on && hovered >= 0) || !!drag || target !== null || paused || still;
    spin += ((holding ? 0 : 1) - spin) * (1 - Math.exp(-dt / 0.45));
    if (!drag) {
      if (target !== null) { rot += (target - rot) * (1 - Math.exp(-dt / 0.22)); if (Math.abs(target - rot) < 1e-3) { rot = target; target = null; } }
      else { rot += fling * dt - ((RPM * TAU) / 60) * spin * dt; fling *= Math.exp(-dt / 0.5); }
      tiltVel += (-120 * tiltKick - 14 * tiltVel) * dt; tiltKick += tiltVel * dt;   // a vertical drag's tilt springs back
    }
    const tilt = (TILT + tiltKick) * rad;

    cards = [];
    for (let i = 0; i < N; i++) {
      const q = project(rot + i * STEP * open, tilt);
      const h = SIZE * q.s * K;
      cards.push({ i, x: cx + q.x * K, y: cy + q.y * K, w: h * ASPECT, h, z: q.z });
    }
    cards.sort((a, b) => a.z - b.z);

    // focus: the card under the pointer, else the one in front; the focal plane eases to it
    hovered = ptr.on && !drag ? hit(ptr.x, ptr.y) : -1;
    const f = hovered >= 0 ? hovered : frontCard();
    const fz = cards.find((c) => c.i === f)!.z;
    focusZ = dt ? focusZ + (fz - focusZ) * (1 - Math.exp(-dt / 0.15)) : fz;
    const item = f % items.length;
    if (item !== focusItem) { focusItem = item; caption(items[item]); }

    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.uniform2f(u('uView'), W, H);
    gl!.uniform3fv(u('uPaper'), paper);
    const scale = K / 300, nearZ = Math.cos(tilt), front = SIZE * (DIST / (DIST - nearZ)) * K;
    for (const c of cards) {
      const blur = APERTURE * 14 * Math.abs(c.z - focusZ) * scale;                 // css px
      const lod = Math.log2(1 + (blur * 1100) / Math.max(1, c.w * dpr) * 1.2);    // texture is ~900 px wide
      gl!.bindTexture(gl!.TEXTURE_2D, textures[c.i % items.length]);
      gl!.uniform2f(u('uCenter'), c.x, c.y);
      gl!.uniform2f(u('uHalf'), c.w / 2, c.h / 2);
      gl!.uniform1f(u('uPad'), 40 * scale);
      gl!.uniform1f(u('uRadius'), (CORNER * c.h) / front);
      gl!.uniform1f(u('uLod'), Math.min(lod, 6));
      gl!.uniform1f(u('uBlur'), blur);
      gl!.uniform1f(u('uHaze'), HAZE * clamp((nearZ - c.z) / (2 * nearZ)) * 1.6);
      gl!.uniform1f(u('uShadow'), SHADOW);
      gl!.uniform1f(u('uScale'), c.h / front);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    }
  }

  // the caption under the orbit cross-fades to the project in focus
  function caption(it: ShutterItem) {
    root.classList.add('cap-out');
    setTimeout(() => {
      capTitle.textContent = it.title; capSub.textContent = it.subtitle; capLink.href = it.href;
      root.classList.remove('cap-out');
    }, still ? 0 : 160);
  }

  if (still) draw(0);
  else loop(canvas, draw);
}

// A placeholder cover for a project with no image yet: a dark card in the era's colours with one bold shape, the
// project's number, category and title, so a visitor sees what the slot is for.
function cardArt(it: ShutterItem, i: number) {
  const Wd = 900, Ht = Math.round(900 / ASPECT), c = document.createElement('canvas');
  c.width = Wd; c.height = Ht;
  const g = c.getContext('2d')!;
  const { paper, accent } = palette();
  const bg = g.createLinearGradient(0, 0, Wd, Ht);
  bg.addColorStop(0, mixHex(paper, accent, [0.16, 0.05, 0.22, 0.03, 0.12, 0.08, 0.18][i % 7]));
  bg.addColorStop(1, paper);
  g.fillStyle = bg; g.fillRect(0, 0, Wd, Ht);
  const red = g.createLinearGradient(0, Ht, Wd, 0);
  red.addColorStop(0, mixHex(accent, '#000000', 0.25)); red.addColorStop(1, mixHex(accent, '#ffffff', 0.25));
  g.fillStyle = red; g.strokeStyle = red; g.globalAlpha = 0.92;
  g.beginPath();
  switch (i % 7) {
    case 0: g.arc(Wd * 0.68, Ht * 0.42, Ht * 0.25, 0, TAU); g.fill(); break;                                      // sun
    case 1: g.roundRect(Wd * 0.22, Ht * 0.26, Wd * 0.56, Ht * 0.28, Ht * 0.14); g.fill(); break;                // display pill
    case 2: g.moveTo(Wd * 0.2, Ht * 0.64); g.lineTo(Wd * 0.55, Ht * 0.14); g.lineTo(Wd * 0.86, Ht * 0.64); g.fill(); break; // peak
    case 3: g.arc(Wd * 0.5, Ht * 0.66, Ht * 0.42, Math.PI, TAU); g.fill(); break;                               // arch
    case 4: g.moveTo(Wd * 0.1, Ht * 0.5); g.bezierCurveTo(Wd * 0.35, Ht * 0.1, Wd * 0.6, Ht * 0.85, Wd * 0.92, Ht * 0.3);
      g.lineWidth = Ht * 0.08; g.lineCap = 'round'; g.stroke(); break;                                          // wave
    case 5: g.arc(Wd * 0.62, Ht * 0.42, Ht * 0.24, Math.PI * 0.8, Math.PI * 2.2); g.lineWidth = Ht * 0.07; g.stroke(); break; // gauge
    default: g.rect(Wd * 0.58, Ht * 0.16, Ht * 0.34, Ht * 0.34); g.fill(); g.beginPath(); g.arc(Wd * 0.48, Ht * 0.48, Ht * 0.16, 0, TAU); g.fill(); // marks
  }
  g.globalAlpha = 1;
  const shade = g.createLinearGradient(0, Ht * 0.45, 0, Ht);
  shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = shade; g.fillRect(0, 0, Wd, Ht);
  const font = getComputedStyle(document.documentElement).getPropertyValue('--font');
  g.fillStyle = '#F2F2F0';
  g.font = `600 ${Ht * 0.055}px ${font}`;
  g.fillText(String(i + 1).padStart(2, '0'), Wd * 0.05, Ht * 0.12);
  g.textAlign = 'right'; g.globalAlpha = 0.7;
  g.fillText(it.tag.toUpperCase(), Wd * 0.95, Ht * 0.12);
  g.textAlign = 'left'; g.globalAlpha = 1;
  g.font = `700 ${Ht * 0.095}px ${font}`;
  g.fillText(it.title, Wd * 0.05, Ht * 0.82);
  g.font = `500 ${Ht * 0.048}px ${font}`; g.globalAlpha = 0.65;
  g.fillText('Coming soon', Wd * 0.05, Ht * 0.92);
  return c;
}

// '#rrggbb' blended toward another, t = 0 → a, 1 → b
function mixHex(a: string, b: string, t: number) {
  const q = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const A = q(a), B = q(b);
  return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(',')})`;
}
