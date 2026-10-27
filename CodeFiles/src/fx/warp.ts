// The site's background, one fixed canvas behind every page.
// Today: a curved horizon of square voxels rolling like a calm sea (see voxels() below). It is full strength on the
// first screen and fades out completely as you scroll on to the projects, then stops drawing.
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
uniform int uMode;            // 0 voxel sea (today), 1 Wangan (plain ground), 3 blueprint (2049)
uniform vec3 uPaper, uStar, uAccent;
uniform float uInk;           // 1 on light pages: strands are drawn as ink instead of added as light

const float TAU = 6.28318;
// thin anti-aliased line at distance d (in the same units as w)
float line(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + fwidth(d) * 1.5, abs(d)); }

// Voxel arc (after React Bits' Voxel Arc, rebuilt by eye): a sea of small rounded square voxels lying on rolling
// waves, seen from above, its horizon curving away at the sides like a planet's limb. Crests catch the light in
// red, troughs fall to deep red, far rows soften into a glowing band along the horizon, and a wine haze
// rises behind it. Each pixel marches its ray onto the waves, then draws the voxel grid where it lands.
const vec3 VOX = vec3(1.0, 0.004, 0.0);          // #FF0100: troughs and distance
const vec3 VOX_HI = vec3(0.941, 0.0, 0.082);     // #F00015: crests and the horizon light
const float HORIZON = 0.56;                      // from the top of the frame
const float CURVE = 0.5;                         // how much the horizon bends away at the sides
const float SIZE = 0.55;                         // a voxel, as a share of the grid spacing
const float ROUND = 0.2;                         // its corner rounding
const float SPACING = 0.07;                      // grid spacing on the sea, in world units
const float GRAIN = 0.25;

float hash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }

// the swell rolls in toward the viewer; smaller crossing waves ride on it
float waves(vec2 p, float t) {
  return 0.34 * sin(p.y * 1.15 + p.x * 0.3 + t * 1.6)
       + 0.24 * sin(p.y * 0.85 - p.x * 0.7 + t * 1.25 + 1.3)
       + 0.13 * sin(p.x * 1.4 + p.y * 0.45 - t * 0.9 + 2.1)
       + 0.05 * sin(p.x * 3.4 + p.y * 2.9 - t * 2.4);
}
const float BEND = 0.002 * CURVE / 0.5;
float sea(vec3 p, float t) { return waves(p.xz, t) - BEND * (p.x * p.x + p.z * p.z); }   // the planet's curve

vec3 voxels(vec2 q) {
  float t = uTime * 0.5;
  float yh = 0.5 - HORIZON;
  // the sky: dark overhead, a wine haze rising from the middle of the horizon
  vec3 sky = uPaper + VOX * 0.22 * exp(-max(q.y - yh, 0.0) * 4.0) * exp(-q.x * q.x * 0.7);
  // and a thin arc of light hugging the far edge, bending down at the sides with the planet's curve
  float limb = q.y - yh + 0.16 * q.x * q.x;
  sky += VOX_HI * 0.32 * exp(-abs(limb) * 26.0) * exp(-q.x * q.x * 0.5);
  // the curve drops the true horizon below eye level; aim up by as much so it sits at HORIZON in the frame
  vec3 ro = vec3(0.0, 3.0, 0.0), rd = normalize(vec3(q.x, q.y - yh - sqrt(12.0 * BEND) * 1.25, 1.25));
  if (rd.y > 0.0) return sky;
  // march down the ray until it dips under the waves, then home in on the surface
  float d = 0.4, prev = d;
  bool hit = false;
  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * d;
    float above = p.y - sea(p, t);
    if (above < 0.0) { hit = true; break; }
    prev = d;
    d += max(above * 0.6, 0.03 * d);
    if (d > 120.0) break;
  }
  if (!hit) return sky;   // (only rays that clear every crest)
  float lo = prev, hi = d;
  for (int i = 0; i < 5; i++) { float m = (lo + hi) * 0.5; vec3 p = ro + rd * m; if (p.y - sea(p, t) < 0.0) hi = m; else lo = m; }
  d = hi;
  vec3 p = ro + rd * d;
  // light: tops facing up and away catch it, so the crests glow and the faces toward us stay dark
  float e = 0.05, h = waves(p.xz, t);
  vec3 n = normalize(vec3(waves(p.xz - vec2(e, 0.0), t) - waves(p.xz + vec2(e, 0.0), t), 2.0 * e,
                          waves(p.xz - vec2(0.0, e), t) - waves(p.xz + vec2(0.0, e), t)));
  float lit = pow(clamp(dot(n, normalize(vec3(0.0, 1.0, 0.6))), 0.0, 1.0), 6.0);
  float crest = smoothstep(-0.4, 0.6, h);
  vec3 col = mix(VOX * 0.4, VOX_HI, clamp(lit * lit * (0.4 + 1.1 * crest), 0.0, 1.0));
  col *= 0.8 + 2.0 * lit * crest + 0.5 * lit;
  col += vec3(1.0, 0.75, 0.75) * 0.35 * pow(lit * crest, 3.0);   // the brightest crests bloom toward white
  // the voxel: a rounded square in its grid cell; once cells shrink under a pixel they blur into an even glow
  vec2 cell = p.xz / SPACING;
  vec2 local = fract(cell) - 0.5;
  float fw = length(fwidth(cell));
  float half_ = SIZE * 0.5, r = ROUND * half_;
  float sd = length(max(abs(local) - (half_ - r), 0.0)) - r;
  float dot_ = 1.0 - smoothstep(-fw * 0.5, fw * 0.5, sd);
  float mask = mix(dot_, SIZE * SIZE * 1.6, smoothstep(0.3, 0.9, fw));
  vec3 field = mix(uPaper, col, mask);
  // distance: far rows fade into the horizon's glow
  float far = 1.0 - exp(-d * 0.028);
  vec3 glow = mix(VOX, VOX_HI, 0.6);
  field = mix(field, glow * (0.55 + 0.6 * crest), far * 0.85);
  field = mix(field, sky, smoothstep(22.0, 60.0, d));           // the farthest rows melt into the sky's glow
  field += VOX_HI * 0.3 * far * far * far;                                // the arc of light right along the horizon
  field += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * GRAIN * 0.12 * mask;
  return field;
}

vec3 today(vec2 q) { return mix(uPaper, voxels(q), uGain); }

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
  let quality = 1, slow = 0;   // resolution scale, eased down on a machine that can't keep up

  function draw(dt: number) {
    // the opening covers the whole screen: nothing to draw under it
    if (root.classList.contains('intro')) return;
    // the sea fades out completely over the first screen; the eras' worlds settle to a whisper instead
    const k = Math.min(1, scrollY / (innerHeight * 0.85));
    const target = 1 - k * k * (3 - 2 * k) * (mode === 0 ? 1 : 0.78);
    gain += (target - gain) * Math.min(1, dt * 5);
    // nothing moves once the sea has faded out, or on the Wangan's plain ground: skip the work
    const idle = (mode === 0 && gain < 0.004) || mode === 1;
    if (idle && drawn === mode) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    // under ~45 fps for a moment, render a little smaller; back up again once there's headroom
    slow += ((dt > 1 / 45 ? 1 : 0) - slow) * 0.05;
    if (slow > 0.6 && quality > 0.6) { quality = Math.max(0.6, quality - 0.1); slow = 0; }
    else if (slow < 0.02 && dt < 1 / 70 && quality < 1) quality = Math.min(1, quality + 0.002);
    const dpr = Math.min(devicePixelRatio || 1, 1, Math.sqrt(MAX_PIXELS / Math.max(1, cw * ch))) * quality;
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
