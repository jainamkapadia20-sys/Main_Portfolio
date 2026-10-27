// The site's background, one fixed canvas behind every page.
// Today: glowing ridges in deep wine reds, like folded silk catching the light (after React Bits' Glowing Ridges,
// rebuilt by eye). Twelve layers of the same folds, each churning its own fine fibres, stack into one shimmering
// film. It is full strength on the first screen and fades out completely as you scroll on to the projects, then
// stops drawing.
// The time-jump eras swap it for their own world: 2049 a drafting grid with construction lines being drawn; the
// Wangan a plain night ground under its own road canvas (fx/hyperspeed.ts).
import { program, fullscreenVS, loop } from './gl';
import { onTheme, palettes, rgb, type Theme } from '../lib/theme';
import { calm } from '../lib/motion';

const MAX_PIXELS = 1.4e6;   // cap the fill on big or dense screens; soft light doesn't need more


const FS = `
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform float uTime, uGain, uPx;
uniform int uMode;            // 0 ridges (today), 1 Wangan (plain ground), 3 blueprint (2049)
uniform vec3 uPaper, uStar, uAccent;
uniform float uInk;           // 1 on light pages: strands are drawn as ink instead of added as light

const float TAU = 6.28318;
// thin anti-aliased line at distance d (in the same units as w)
float line(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + fwidth(d) * 1.5, abs(d)); }

// Glowing ridges (after React Bits' Glowing Ridges, rebuilt by eye): thin contour lines of a slowly rolling field,
// folded by a few octaves of flowing noise, stacked as twelve slightly offset layers in three colours, so where they
// overlap they read as iridescent film. A soft tone curve, then a touch of grain riding on the light.
const float LAYERS = 12.0;
const float ZOOM = 1.1;
const float DENSITY = 11.0;     // scale of the flow inside the ridges
const float TURB = 0.6;         // how hard the flow folds them
const float FREQ = 1.0;         // ridges across the frame
const float PHASE = 2.0;
const float FLOW = 0.1;         // colours drifting along the ridges
const float CHURN = 1.0;        // fine detail churning
const float SWIRL = 16.0;
const float EXPOSURE = 0.25;
const float GAIN = 2.0;
const float CYCLE = 0.4;        // palette steps per layer
const float GRAIN = 0.25;
const float OPACITY = 0.75;
// deep wine reds: a hot red core, crimson, and wine in the shadows
const vec3 COL_A = vec3(0.95, 0.12, 0.17), COL_B = vec3(0.62, 0.04, 0.13), COL_C = vec3(0.32, 0.02, 0.09);

float hash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
vec3 tri(float k) {             // A -> B -> C -> A
  k = fract(k) * 3.0;
  return k < 1.0 ? mix(COL_A, COL_B, k) : k < 2.0 ? mix(COL_B, COL_C, k - 1.0) : mix(COL_C, COL_A, k - 2.0);
}

vec3 ridges(vec2 q) {
  float t = uTime;
  vec2 p = q * ZOOM;
  // a slow swirl folds the whole sheet
  p += vec2(sin(p.y * 1.7 + t * FLOW * 1.3), cos(p.x * 1.3 - t * FLOW * 1.1)) * 0.05 * TURB;
  vec3 acc = vec3(0.0);
  for (float i = 0.0; i < LAYERS; i++) {
    // each layer churns its own fine fibres, so the stack shimmers instead of banding
    vec2 v = p;
    float s = 1.0;
    for (int j = 0; j < 3; j++) {
      v += sin(v.yx * DENSITY * s + vec2(t * CHURN * 0.6 + i * 0.7 + float(j) * 1.3, -t * CHURN * 0.45 + i * 0.4)) * (0.006 * TURB / s);
      s *= 2.1;
    }
    // Each ridge is a fold: it drops steeply from the top, turns at a bright tip, and hooks briefly back up. The folds
    // are one shape repeated sideways, their tips along a line that rises gently to the right. For any point, the
    // two arms give which fold it lies on (c), and the ridges sit where c is a whole number.
    float y = v.y + 0.34 - 0.16 * v.x;                    // height above the tips' line, low under the hero's copy
    float h = abs(y);                                     // below the line the fold curls back under, briefly
    float lean = v.x + 0.55 * h;                          // arms sweep left as they rise
    float spread = sqrt(h / 4.5);
    float drift = t * FLOW * 0.9 + i * 0.012 + PHASE * 0.1;
    float cl = (lean + spread) / 0.32 * FREQ - drift;     // the long arm, rising up and to the left
    float cr = (v.x + 0.08 * h - spread) / 0.32 * FREQ - drift;   // the short hook, curling up to the right
    float rl = abs(sin(3.14159 * cl)), rr = abs(sin(3.14159 * cr));
    float below = exp(min(y, 0.0) * 40.0);                // and fades out, so the tips round off softly
    float wl = exp(-h * 1.6) * below, wr = exp(-h * 9.0) * below * 0.45;
    vec3 tint = tri(i * CYCLE / 3.0 + t * FLOW * 0.15);
    acc += tint * ((0.012 / (rl + 0.012)) * wl + (0.012 / (rr + 0.012)) * wr);
    acc += COL_C * (0.004 / (rl + 0.4)) * wl;                     // a faint haze between the ridges
  }
  // strongest through the middle of the frame, falling away to the edges
  float fall = smoothstep(1.3, 0.1, length((q - vec2(0.1, -0.05)) * vec2(0.7, 1.0)));
  vec3 col = (vec3(1.0) - exp(-acc * EXPOSURE * 3.6 * fall)) * GAIN * 0.6;
  col += (hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * GRAIN * 0.5 * dot(col, vec3(0.33));
  return max(col, 0.0) * OPACITY;
}

vec3 today(vec2 q) {
  vec3 light = ridges(q);
  if (uInk > 0.5) return mix(uPaper, uPaper * (1.0 - light), clamp(uGain, 0.0, 1.0));
  return uPaper + light * uGain;
}

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
  else col = today(uv);
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

  function draw(dt: number) {
    // the opening covers the whole screen: nothing to draw under it
    if (root.classList.contains('intro')) return;
    // the ridges fade out completely over the first screen; the eras' worlds settle to a whisper instead
    const k = Math.min(1, scrollY / (innerHeight * 0.85));
    const target = 1 - k * k * (3 - 2 * k) * (mode === 0 ? 1 : 0.78);
    gain += (target - gain) * Math.min(1, dt * 5);
    // nothing moves once the ridges have faded out, or on the Wangan's plain ground: skip the work
    const idle = (mode === 0 && gain < 0.004) || mode === 1;
    if (idle && drawn === mode) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1, Math.sqrt(MAX_PIXELS / Math.max(1, cw * ch)));   // soft light: 1x is plenty
    const w = Math.max(1, Math.round(cw * dpr)), h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    time += dt;
    gl!.viewport(0, 0, w, h);
    gl!.uniform2f(u('uRes'), w, h);
    gl!.uniform1f(u('uTime'), time);
    gl!.uniform1f(u('uGain'), idle ? 0 : gain);
    gl!.uniform1i(u('uMode'), mode);
    gl!.uniform1f(u('uPx'), dpr);
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
