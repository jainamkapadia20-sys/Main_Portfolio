// The site's background, one fixed canvas behind every page.
// Today: a ribbon of fine glowing wires drifting and twisting across the dark (after React Bits' Interference
// Ribbons, drawn from scratch). Each pixel works out which of the ribbon's strands is nearest, so 64 strands cost
// the same as one; where the ribbon turns edge-on the strands crowd into bright knots. It is full strength on the
// first screen and fades out completely as you scroll on to the projects, then stops drawing.
// The time-jump eras swap it for their own world: 2049 a drafting grid with construction lines being drawn; the
// Wangan a plain night ground under its own road canvas (fx/hyperspeed.ts).
import { program, fullscreenVS, loop } from './gl';
import { onTheme, palettes, rgb, type Theme } from '../lib/theme';
import { calm } from '../lib/motion';

const MAX_PIXELS = 1.4e6;   // cap the fill on big or dense screens; soft light doesn't need more

// the ribbon's two colours per theme (the strands cycle between them); light pages get ink strands, not light
const RIBBON: Partial<Record<Theme, [string, string]>> = { dark: ['#6B3CFF', '#D46BFF'], light: ['#5B2BE0', '#B44BE0'] };

const FS = `
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform float uTime, uGain, uPx;
uniform int uMode;            // 0 ribbon (today), 1 Wangan (plain ground), 3 blueprint (2049)
uniform vec3 uPaper, uStar, uAccent, uRibA, uRibB;
uniform float uInk;           // 1 on light pages: strands are drawn as ink instead of added as light

const float TAU = 6.28318;
// thin anti-aliased line at distance d (in the same units as w)
float line(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + fwidth(d) * 1.5, abs(d)); }

const float WIRES = 64.0;
const float WIDTH = 1.6;       // strand width facing the viewer, css px
const float HALF = 0.12;       // half the ribbon's width, in screen heights
const float ANGLE = 0.22;      // how steeply it runs across the frame (radians, ~13 degrees), low enough to stay under the copy on wide screens

vec3 ribbon(vec2 q) {
  float t = uTime;
  // run along the ribbon's own axis, lower left to upper right; it crosses the middle low, under the hero's copy
  float ca = cos(ANGLE), sa = sin(ANGLE);
  vec2 p = vec2(ca * q.x + sa * q.y, -sa * q.x + ca * q.y) + vec2(0.0, 0.32);
  float x = p.x;
  float mid = 0.07 * sin(x * 1.6 + t * 0.35) + 0.04 * sin(x * 3.1 - t * 0.27 + 1.7);   // the centre line swings
  float turn = x * 2.6 + t * 0.25;                                                      // it rolls over along its length
  float c = cos(turn), s = sin(turn);
  float halfW = HALF * (0.85 + 0.15 * sin(x * 0.9 - t * 0.2));
  float span = max(abs(c), 0.02) * halfW;                                                // how wide it looks here
  float across = (p.y - mid) / span;                                                     // -1..1 inside the ribbon
  float k = clamp(floor((across * 0.5 + 0.5) * (WIRES - 1.0) + 0.5), 0.0, WIRES - 1.0);  // nearest strand
  float w = k / (WIRES - 1.0) * 2.0 - 1.0;
  float px = uPx / uRes.y;                                                               // one css px, in screen heights
  float d = (p.y - mid - w * span) / px;                                                 // distance to that strand, px
  float gap = 2.0 * span / (WIRES - 1.0) / px;                                           // strand spacing, px
  float crisp = clamp(1.0 - (abs(d) - WIDTH * 0.5), 0.0, 1.0);
  float dense = WIDTH / max(gap, 0.05);                                                  // edge-on: strands pile into a knot
  float lit = mix(min(dense, 6.0), crisp, smoothstep(1.2, 3.0, gap));
  lit *= smoothstep(1.0 + 1.5 / WIRES, 1.0, abs(across));
  float depth = w * s * sign(c);                                                         // the far side fades and thins
  lit *= mix(1.0, 0.35, smoothstep(-0.2, 1.0, depth));
  lit *= 0.75 + 0.25 * mod(k, 2.0);                                                      // neighbours never read as one band
  lit *= 0.65 + 0.35 * sin(x * 4.0 - t * 0.9 + w * 1.5);                                 // light drifts along the strands
  vec3 col = mix(uRibA, uRibB, 0.5 + 0.5 * sin((w * 2.2 + t * 0.04) * 3.14159));
  float haze = exp(-abs(p.y - mid) / (halfW * 0.9)) * 0.22;                             // soft glow around the whole ribbon
  if (uInk > 0.5) return mix(uPaper, col * 0.8, clamp((lit * 0.8 + haze) * uGain, 0.0, 1.0));
  vec3 light = col * (lit * 0.9 + haze);
  return uPaper + (vec3(1.0) - exp(-light * 1.6)) * uGain;                               // soft tone curve: knots glow, never clip
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
  else col = ribbon(uv);
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
    // the ribbon fades out completely over the first screen; the eras' worlds settle to a whisper instead
    const k = Math.min(1, scrollY / (innerHeight * 0.85));
    const target = 1 - k * k * (3 - 2 * k) * (mode === 0 ? 1 : 0.78);
    gain += (target - gain) * Math.min(1, dt * 5);
    // nothing moves once the ribbon has faded out, or on the Wangan's plain ground: skip the work
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
    const [a, b] = RIBBON[t] ?? RIBBON.dark!;
    gl.uniform3fv(u('uPaper'), rgb(c.paper));
    gl.uniform3fv(u('uStar'), rgb(c.ink));
    gl.uniform3fv(u('uAccent'), rgb(c.accent));
    gl.uniform3fv(u('uRibA'), rgb(a));
    gl.uniform3fv(u('uRibB'), rgb(b));
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
