// The site's background: one fixed, full-screen field of ink and red particles behind every page.
// Each page opens with the JK monogram built from the particles; it bursts apart into shards and dust that settle
// into a slow drift. The pointer parts the field and warms it red, a click on empty space sends a shockwave through
// it, and scrolling moves the layers at different speeds. In Calm mode it holds still: no burst, no drift.
import { program, fit, loop, approach, monogramCanvas } from './gl';
import { onTheme, palettes, rgb, type Theme } from '../lib/theme';
import { calm } from '../lib/motion';

const VS = `
in vec2 aHome;      // place in the monogram, -1..1
in vec3 aField;     // place in the field: x, y in -1.15..1.15, z = depth 0..1
in vec4 aSeed;      // x, y: random; z: 1 = shard; w: 1 = red
uniform vec2 uRes;            // CSS px
uniform float uDpr, uTime, uBurst, uGather, uIntro, uScroll, uSize, uAlpha;
uniform vec3 uAnchor;         // monogram centre (px) and size (px)
uniform vec3 uMouse;          // px, and how present the pointer is
uniform vec3 uShock[4];       // px, start time
uniform vec3 uInk, uAccent;
out vec4 vColor;
out float vKind;
out float vAngle;

void main() {
  float z = aField.z;
  // the field: slow drift, layers sliding at different speeds as the page scrolls, wrapped so it never runs out
  vec2 w = aField.xy + 0.035 * vec2(sin(uTime * (0.05 + 0.07 * aSeed.x) + aSeed.y * 6.283), cos(uTime * (0.04 + 0.06 * aSeed.y) + aSeed.x * 6.283));
  w.y += uScroll * (0.18 + z * 0.55);
  w.y = mod(w.y + 1.15, 2.3) - 1.15;
  vec2 field = vec2((w.x * 0.5 + 0.5) * uRes.x, (0.5 - w.y * 0.5) * uRes.y);

  // the monogram, assembling from a loose cloud during the intro
  vec2 jitter = (aSeed.xy - 0.5) * uAnchor.z * 0.9 * (1.0 - uIntro);
  vec2 home = uAnchor.xy + aHome * uAnchor.z * 0.5 + jitter;

  // the burst: inner pieces go first, each flies out on an arc away from the centre and lands in the field
  float d = clamp((uBurst - aSeed.x * 0.22) / (1.25 + aSeed.y * 0.6), 0.0, 1.0);
  float e = 1.0 - pow(1.0 - d, 4.0);
  vec2 away = normalize(home - uAnchor.xy + vec2(0.001, 0.0));
  vec2 pos = mix(home, field, e) + away * sin(e * 3.14159) * uRes.y * (0.12 + 0.3 * aSeed.y) * (0.6 + z);
  pos = mix(pos, home, uGather);

  // pointer: the field parts around it and warms toward red
  vec2 dm = pos - uMouse.xy;
  float near = uMouse.z * smoothstep(170.0, 0.0, length(dm)) * e;
  pos += normalize(dm + 0.001) * near * 34.0 * (0.4 + z);
  float glow = near;

  // shockwaves from clicks: a ring that pushes outward and fades
  for (int i = 0; i < 4; i++) {
    float age = uTime - uShock[i].z;
    if (age <= 0.0 || age > 2.4) continue;
    vec2 ds = pos - uShock[i].xy;
    float ring = exp(-pow((length(ds) - age * 820.0) / 90.0, 2.0)) * exp(-age * 1.5);
    pos += normalize(ds + 0.001) * ring * 70.0 * (0.5 + z);
    glow += ring;
  }
  glow = min(glow, 1.0);

  float settled = mix(1.0, 0.45 + 0.55 * z, e);  // in the monogram every piece is solid; in the field, depth fades it
  vec3 base = mix(uInk, uAccent, aSeed.w);
  vColor = vec4(mix(base, uAccent, glow * 0.85), min(1.0, uAlpha * settled * uIntro + glow * 0.45));
  vKind = aSeed.z;
  vAngle = aSeed.x * 6.283 + uTime * (aSeed.y - 0.5) * 1.2 + e * 9.0 * (aSeed.y - 0.5);
  float size = uSize * mix(0.95, 0.45 + z * 1.05, e) * (1.0 + glow * 1.1) * (aSeed.z > 0.5 ? 2.1 : 1.0);
  gl_PointSize = size * uDpr;
  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
}`;

const FS = `
in vec4 vColor;
in float vKind;
in float vAngle;
out vec4 o;
float tri(vec2 p) {
  const float k = 1.7320508;
  p.x = abs(p.x) - 1.0; p.y = p.y + 1.0 / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0, 0.0);
  return -length(p) * sign(p.y);
}
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float a;
  if (vKind > 0.5) {
    float c = cos(vAngle), s = sin(vAngle);
    p = mat2(c, -s, s, c) * p;
    p.y *= 1.7;                                   // a thin sliver, not an emoji triangle
    a = 1.0 - smoothstep(-0.06, 0.06, tri(p * 1.15));
  } else {
    a = smoothstep(1.0, 0.55, length(p));
  }
  o = vec4(vColor.rgb, 1.0) * vColor.a * a;
}`;

/** Points inside the monogram, -1..1 with y down, from its rasterised strokes. */
function monogramPoints(n: number) {
  const size = 160;
  const g = monogramCanvas(size).getContext('2d')!;
  const data = g.getImageData(0, 0, size, size).data;
  const inside: number[] = [];
  for (let i = 0; i < size * size; i++) if (data[i * 4 + 3] > 140) inside.push(i);
  const out = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) {
    const i = inside[(Math.random() * inside.length) | 0];
    out[k * 2] = ((i % size) + Math.random()) / size * 2 - 1;
    out[k * 2 + 1] = (Math.floor(i / size) + Math.random()) / size * 2 - 1;
  }
  return out;
}

export function mountField(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return; }
  const still = calm();
  const { p, u } = program(gl, VS, FS);
  gl.useProgram(p);

  const n = Math.round(Math.min(2600, Math.max(900, (innerWidth * innerHeight) / 820)));
  const home = monogramPoints(n);
  const field = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    field.set([(Math.random() * 2 - 1) * 1.15, (Math.random() * 2 - 1) * 1.15, Math.pow(Math.random(), 1.6)], i * 3);
    seed.set([Math.random(), Math.random(), Math.random() < 0.16 ? 1 : 0, Math.random() < 0.14 ? 1 : 0], i * 4);
  }
  const attr = (name: string, data: Float32Array, size: number) => {
    const loc = gl.getAttribLocation(p, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  gl.bindVertexArray(gl.createVertexArray());
  attr('aHome', home, 2);
  attr('aField', field, 3);
  attr('aSeed', seed, 4);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let alpha = 0.6;

  // where the monogram forms: the page's anchor (the hero mark on Home) or the middle of the screen
  const anchorEl = document.querySelector<HTMLElement>('[data-field-anchor]');
  const anchor = () => {
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      if (r.width > 0) return [r.left + r.width / 2, r.top + r.height / 2, Math.min(r.width, r.height)];
    }
    return [innerWidth / 2, innerHeight / 2, Math.min(innerWidth, innerHeight) * 0.3];
  };

  const mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, want: 0 };
  const shocks = new Float32Array(12).fill(-100);
  let shockIdx = 0;
  let time = 0;
  let burstAt = anchorEl ? 1.15 : 0.7;   // seconds after start
  let gather = 0, gathering = false, announced = -1;

  if (!still) {
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.want = 1;
      if (mouse.x < -1e3) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    }, { passive: true });
    document.addEventListener('pointerleave', () => (mouse.want = 0));
    // a click on empty space (not on a control, a field or a piece with its own pointer behaviour)
    addEventListener('pointerdown', (e) => {
      if ((e.target as Element).closest('a, button, input, textarea, select, label, video, summary, dialog, [data-own-pointer]')) return;
      shocks.set([e.clientX, e.clientY, time], shockIdx * 3);
      shockIdx = (shockIdx + 1) % 4;
    }, { passive: true });
    // the hero mark can ask for the monogram again: the pieces fly home, then burst once more
    document.addEventListener('field:reform', () => { if (!gathering && time > burstAt + 1) gathering = true; });
  }

  function draw(dt: number) {
    const { w, h, dpr } = fit(canvas, 1.75);
    gl!.viewport(0, 0, w, h);
    time += dt;
    mouse.x = approach(mouse.x, mouse.tx, dt, 0.08);
    mouse.y = approach(mouse.y, mouse.ty, dt, 0.08);
    mouse.on = approach(mouse.on, mouse.want, dt, 0.25);
    if (gathering) {
      gather = approach(gather, 1, dt, 0.28);
      if (gather > 0.985) { gathering = false; gather = 0; burstAt = time + 0.35; }
    }
    const [ax, ay, as] = anchor();
    gl!.useProgram(p);
    gl!.uniform2f(u('uRes'), canvas.clientWidth, canvas.clientHeight);
    gl!.uniform1f(u('uDpr'), dpr);
    gl!.uniform1f(u('uTime'), still ? 40 : time);
    gl!.uniform1f(u('uBurst'), still ? 9 : time - burstAt);
    gl!.uniform1f(u('uGather'), gather);
    gl!.uniform1f(u('uIntro'), still ? 1 : Math.min(1, time / 0.7));
    gl!.uniform1f(u('uScroll'), scrollY / innerHeight);
    gl!.uniform1f(u('uSize'), Math.max(2.8, Math.min(4, as / 100)));
    gl!.uniform1f(u('uAlpha'), alpha);
    gl!.uniform3f(u('uAnchor'), ax, ay, as);
    gl!.uniform3f(u('uMouse'), mouse.x, mouse.y, mouse.on);
    gl!.uniform3fv(u('uShock'), shocks);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.POINTS, 0, n);
    if (!still && time >= burstAt && burstAt !== announced) { announced = burstAt; document.dispatchEvent(new CustomEvent('field:burst')); }
  }

  onTheme((t: Theme) => {
    const c = palettes[t];
    gl.useProgram(p);
    gl.uniform3fv(u('uInk'), rgb(c.ink));
    gl.uniform3fv(u('uAccent'), rgb(c.accent));
    alpha = t === 'light' ? 0.55 : 0.78;
    if (still) draw(0);
  });

  if (still) {
    draw(0);
    addEventListener('resize', () => draw(0));
    addEventListener('scroll', () => draw(0), { passive: true });
    document.dispatchEvent(new CustomEvent('field:burst'));
  } else {
    loop(canvas, draw, { always: true });
  }
}
