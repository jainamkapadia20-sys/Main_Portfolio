// The site's background, one fixed canvas behind every page.
// Today: the neural vortex (see vortex() below). It is full strength on the first screen and fades out completely
// as you scroll on to the projects, then stops drawing.
// The time-jump eras swap it for their own world: 2049 a drafting grid with construction lines being drawn; the
// Wangan a plain night ground under its own road canvas (fx/hyperspeed.ts).
import { program, fullscreenVS, loop } from './gl';
import { onTheme, palettes, rgb, type Theme } from '../lib/theme';
import { calm } from '../lib/motion';

const MAX_PIXELS = 2.0e6;   // cap the fill on big or dense screens


const FS = `
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform float uTime, uGain, uPx, uScroll;
uniform vec2 uPointer;        // the pointer, 0..1 across the screen, y up
uniform int uMode;            // 0 neural vortex (today), 1 Wangan (plain ground), 3 blueprint (2049)
uniform vec3 uPaper, uStar, uAccent;
uniform float uInk;           // 1 on light pages: strands are drawn as ink instead of added as light

const float TAU = 6.28318;
// thin anti-aliased line at distance d (in the same units as w)
float line(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + fwidth(d) * 1.5, abs(d)); }

// Neural vortex (the "Interactive Neural Vortex" background, its shader kept as written): fifteen rotated layers of
// sine waves fold into glowing neural filaments in purple and cyan. The pointer warps them where it hovers and the
// colours drift as the page scrolls. The original draws onto a see-through canvas at 95% opacity; that blend is
// done here, over the page's own ground.
vec2 rotate(vec2 uv, float th) { return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv; }

float neuro_shape(vec2 uv, float t, float p) {
  vec2 sine_acc = vec2(0.);
  vec2 res = vec2(0.);
  float scale = 8.;
  for (int j = 0; j < 15; j++) {
    uv = rotate(uv, 1.);
    sine_acc = rotate(sine_acc, 1.);
    vec2 layer = uv * scale + float(j) + sine_acc - t;
    sine_acc += sin(layer) + 2.4 * p;
    res += (.5 + .5 * cos(layer)) / scale;
    scale *= (1.2);
  }
  return res.x + res.y;
}

vec3 vortex() {
  vec2 uv = .5 * vUv;
  uv.x *= uRes.x / uRes.y;
  vec2 pointer = vUv - uPointer;
  pointer.x *= uRes.x / uRes.y;
  float p = clamp(length(pointer), 0., 1.);
  p = .5 * pow(1. - p, 2.);
  float t = uTime;
  vec3 color = vec3(0.);
  float noise = neuro_shape(uv, t, p);
  noise = 1.2 * pow(noise, 3.);
  noise += pow(noise, 10.);
  noise = max(.0, noise - .5);
  noise *= (1. - length(vUv - .5));
  color = vec3(0.5, 0.15, 0.65);
  color = mix(color, vec3(0.02, 0.7, 0.9), 0.32 + 0.16 * sin(2.0 * uScroll + 1.2));
  color += vec3(0.15, 0.0, 0.6) * sin(2.0 * uScroll + 1.5);
  color = color * noise;
  // the canvas's premultiplied colour over the page, at the original's 95% opacity
  float a = clamp(noise, 0.0, 1.0);
  return mix(uPaper, color + uPaper * (1.0 - a), 0.95);
}

vec3 today() { return mix(uPaper, vortex(), uGain); }

// 2049: a blueprint. A minor and major drafting grid, then construction lines drawn in: a circle, its centre
// lines and a dimensioned box, redrawing slowly.
vec3 blueprint(vec2 q) {
  vec2 p = gl_FragCoord.xy / uPx;                    // css pixels
  // distance to the nearest grid line, in css pixels
  vec2 dm = abs(mod(p + 12.0, 24.0) - 12.0), dM = abs(mod(p + 60.0, 120.0) - 60.0);
  float minor = max(line(dm.x, 1.0), line(dm.y, 1.0));
  float major = max(line(dM.x, 1.4), line(dM.y, 1.4));
  float draw = fract(uTime * 0.05);                  // how far the drawing has got, 0..1, looping every 20s
  float r = length(q - vec2(0.18, -0.02)), a = atan(q.y + 0.02, q.x - 0.18);
  float circle = line(r - 0.24, 0.0018) * step(fract((a + 3.1416) / TAU), draw * 1.6);
  float axes = (line(q.y + 0.02, 0.0012) * step(abs(q.x - 0.18), 0.3) + line(q.x - 0.18, 0.0012) * step(abs(q.y + 0.02), 0.3))
    * step(0.25, draw);
  vec2 b = abs(q - vec2(-0.32, 0.1)) - vec2(0.16, 0.1);
  float box = line(max(b.x, b.y), 0.0016) * step(0.4, draw);
  float dim = line(q.y - 0.24, 0.001) * step(abs(q.x + 0.32), 0.16) * step(0.55, draw);
  float v = minor * 0.07 + major * 0.16 + (circle + axes * 0.6 + box + dim * 0.8) * 0.5;
  return mix(uPaper, uStar, clamp(v * uGain, 0.0, 1.0));
}

void main() {
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  vec3 col;
  if (uMode == 1) col = uPaper;           // the Wangan's road is its own canvas
  else if (uMode == 3) col = blueprint(uv);
  else col = today();
  o = vec4(col, 1.0);
}`;

export function mountWarp(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl) { canvas.remove(); return; }
  const still = calm();
  const root = document.documentElement;
  const { p, u } = program(gl, fullscreenVS, FS);
  gl.useProgram(p);
  let time = 3, gain = 1, mode = 0, drawn = -1;
  let quality = 1, slow = 0;   // resolution scale, eased down on a machine that can't keep up
  // the pointer, eased toward where it is (as the original does: a fifth of the way each frame)
  const ptr = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
  addEventListener('pointermove', (e) => { ptr.tx = e.clientX; ptr.ty = e.clientY; }, { passive: true });
  addEventListener('touchmove', (e) => { if (e.touches[0]) { ptr.tx = e.touches[0].clientX; ptr.ty = e.touches[0].clientY; } }, { passive: true });

  function draw(dt: number) {
    // the opening covers the whole screen: nothing to draw under it
    if (root.classList.contains('intro')) return;
    // the vortex fades out completely over the first screen; the eras' worlds settle to a whisper instead
    const k = Math.min(1, scrollY / (innerHeight * 0.85));
    const target = 1 - k * k * (3 - 2 * k) * (mode === 0 ? 1 : 0.78);
    gain += (target - gain) * Math.min(1, dt * 5);
    // nothing moves once the vortex has faded out, or on the Wangan's plain ground: skip the work
    const idle = (mode === 0 && gain < 0.004) || mode === 1;
    if (idle && drawn === mode) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    // under ~45 fps for a moment, render a little smaller; back up again once there's headroom
    slow += ((dt > 1 / 45 ? 1 : 0) - slow) * 0.05;
    if (slow > 0.6 && quality > 0.6) { quality = Math.max(0.6, quality - 0.1); slow = 0; }
    else if (slow < 0.02 && dt < 1 / 70 && quality < 1) quality = Math.min(1, quality + 0.002);
    const dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / Math.max(1, cw * ch))) * quality;
    const w = Math.max(1, Math.round(cw * dpr)), h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    time += dt;
    gl!.viewport(0, 0, w, h);
    gl!.uniform2f(u('uRes'), w, h);
    gl!.uniform1f(u('uTime'), time);
    gl!.uniform1f(u('uGain'), idle ? 0 : gain);
    gl!.uniform1i(u('uMode'), mode);
    gl!.uniform1f(u('uPx'), dpr);
    ptr.x += (ptr.tx - ptr.x) * 0.2; ptr.y += (ptr.ty - ptr.y) * 0.2;
    gl!.uniform2f(u('uPointer'), ptr.x / innerWidth, 1 - ptr.y / innerHeight);
    gl!.uniform1f(u('uScroll'), scrollY / (2 * innerHeight));
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    drawn = idle ? mode : -1;
  }

  onTheme((t: Theme) => {
    const c = palettes[t];
    gl.uniform3fv(u('uPaper'), rgb(c.paper));
    gl.uniform3fv(u('uStar'), rgb(c.ink));
    gl.uniform3fv(u('uAccent'), rgb(c.accent));
    gl.uniform1f(u('uInk'), t === 'light' ? 1 : 0);
    mode = ({ apex: 1, blueprint: 3 } as Record<string, number>)[t] ?? 0;
    drawn = -1;
    if (still) draw(0.016);
  });

  if (still) {
    draw(0.016);
    addEventListener('resize', () => { drawn = -1; draw(0.016); });
    addEventListener('scroll', () => draw(0.016), { passive: true });
  } else loop(canvas, draw, { always: true });
}
