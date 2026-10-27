// Glitter warp: a glittering starfield flown through at speed. Stars sit in layers of a grid seen in perspective;
// each layer rushes toward the camera, so stars stream out from the middle of the screen and stretch into short
// streaks as they pass. Every star twinkles on its own clock, and a few are the accent red.
// One fixed canvas behind the whole site: full strength on the first screen, then it eases down to a faint,
// slow drift as you scroll, so the page never cuts to black.
// It also does the jump to lightspeed (a `warp:jump` event, sent by the JK in the navbar): the starfield rises over
// the page, the stars stretch into long blue-white lines as it accelerates, a white flash, and out the other side.
// Each time-jump era swaps the stars for its own world: 1998 a night drive along a low horizon,
// 2049 a drafting grid with construction lines being drawn.
import { program, fullscreenVS, loop } from './gl';
import { onTheme, palettes, rgb, type Theme } from '../lib/theme';
import { calm } from '../lib/motion';

const MAX_PIXELS = 1.8e6;   // cap the fill on big or dense screens; soft streaks don't need more

const FS = `
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform float uTime, uGain, uJump, uFlash, uPx;
uniform int uMode;            // 0 stars, 1 night drive (1998), 3 blueprint (2049)
uniform vec3 uPaper, uStar, uAccent;

const float LAYERS = 6.0;
const float DENSITY = 20.0;     // stars per unit across a layer (higher = more spread out)
const float STAR = 0.10;        // star size

float hash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }

vec3 stars(vec2 uv) {
  float r = length(uv);
  vec2 dir = uv / max(r, 1e-4);
  float glow = 0.0, red = 0.0;
  float stretch = 1.0 + uJump * uJump * 70.0;                 // lightspeed: points become long lines
  for (float i = 0.0; i < LAYERS; i++) {
    float depth = fract(i / LAYERS + uTime * 0.12);          // 0 = far away, 1 = passing the camera
    float scale = mix(DENSITY, 0.6, depth);                  // far layers are dense and small
    float fade = smoothstep(0.0, 0.35, depth) * smoothstep(1.0, 0.85, depth);
    vec2 p = uv * scale + i * 17.13;
    vec2 id = floor(p), f = fract(p) - 0.5;
    float h = hash(id);
    vec2 star = vec2(hash(id + 1.7), hash(id + 9.1)) - 0.5;
    vec2 d = (f - star * 0.8) / scale;                     // back to screen units, so stars stay tiny up close
    // stretch along the line from the centre: the nearer the layer, the longer the streak
    float along = dot(d, dir), across = dot(d, vec2(-dir.y, dir.x));
    along /= 1.0 + depth * depth * 14.0 * smoothstep(0.0, 0.5, r) * stretch;
    float dist = length(vec2(along, across));
    float size = STAR * 0.012 * (0.4 + h * 0.6) * (0.5 + depth) * (1.0 + uJump * 0.6);
    float twinkle = mix(0.5 + 0.5 * sin(uTime * (2.0 + h * 5.0) + h * 40.0), 1.0, uJump);
    float s = smoothstep(size, size * 0.15, dist) * fade * twinkle * step(mix(0.55, 0.3, uJump), h);
    glow += s;
    red += s * step(0.93, hash(id + 3.3));                    // a few stars run hot
  }
  vec3 star = mix(uStar, uAccent, clamp(red / max(glow, 1e-4), 0.0, 1.0));
  star = mix(star, vec3(0.85, 0.92, 1.0), uJump);            // lightspeed runs blue-white
  vec3 col = mix(uPaper, star, clamp(glow * uGain, 0.0, 1.0));
  return col;
}

const float TAU = 6.28318;
// thin anti-aliased line at distance d (in the same units as w)
float line(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + fwidth(d) * 1.5, abs(d)); }

// 1998: a night drive. The horizon sits low, under the hero's buttons, so the text stands on a clear night sky and
// the road only fills the floor of the screen: a three-lane road swaying gently into the dark, dim lane dashes
// streaming past, far-off tail lights and oncoming headlights near the vanishing point, mountains against a warm
// sodium glow. Everything is kept dim and slow; it is a mood, not a game.
vec3 apex(vec2 q) {
  float h = -0.3;                                    // horizon, below the hero's content
  vec3 col = uPaper;
  if (q.y < h) {
    float z = 0.09 / (h - q.y);                      // distance down the road
    float travel = uTime * 5.0;
    float sway = sin((z + travel) * 0.045) * 0.9 - sin(travel * 0.045) * 0.9;   // the bend ahead, relative to us
    float x = q.x * z - sway;                        // across the road, in lane units (lanes are 1 wide)
    float fog = exp(-z * 0.12);
    float sharp = clamp(1.0 - fwidth(x) * 3.0, 0.0, 1.0);   // lines that shrink below a pixel fade out instead of smearing into a band
    float onRoad = 1.0 - smoothstep(1.55, 1.6, abs(x));
    col = mix(uPaper, uPaper * 1.5 + 0.01, onRoad * fog);
    float w = 0.05;
    float edges = line(abs(x) - 1.5, w) * onRoad;
    float dash = step(fract((z + travel) * 0.22), 0.45);
    float lanes = (line(x - 0.5, w) + line(x + 0.5, w)) * dash;
    col += (uStar * 0.2) * (edges + lanes) * fog * sharp;
    // cars as long-exposure streaks, only out near the horizon
    float lights = 0.0, heads = 0.0;
    for (int k = 0; k < 3; k++) {
      float lane = -1.0 + float(k);                  // -1 and 0 run away from you, +1 comes at you
      float runs = fract(z * 0.035 - uTime * (lane > 0.5 ? 0.6 : 0.18) + float(k) * 0.37);
      float car = smoothstep(0.0, 0.03, runs) * smoothstep(0.55, 0.3, runs);
      float pair = line(abs(x - lane) - 0.2, 0.05);
      if (lane > 0.5) heads += pair * car; else lights += pair * car;
    }
    float far = smoothstep(1.5, 5.0, z);
    col += (uAccent * 0.9 * lights + vec3(1.0, 0.95, 0.85) * 0.5 * heads) * fog * far * sharp;
    col += uAccent * 0.1 * exp((q.y - h) * 7.0);      // the sky's glow carries on over the road, so the horizon has no seam
  } else {
    float ridge = h + 0.03 + 0.025 * sin(q.x * 6.0 + 1.3) + 0.012 * sin(q.x * 17.0) + 0.006 * sin(q.x * 41.0);
    float glow = exp(-(q.y - h) * 7.0);
    col = mix(uPaper, uPaper + uAccent * 0.1, glow);
    col = mix(col, uPaper * 0.55, step(q.y, ridge));  // the mountains
    vec2 sp = q * 55.0; vec2 id = floor(sp);
    col += (hash(id) > 0.993 ? smoothstep(0.1, 0.0, length(fract(sp) - 0.5)) * 0.3 : 0.0) * smoothstep(ridge, ridge + 0.1, q.y);
  }
  return mix(uPaper, col, uGain);
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
  // the jump itself is always through stars, whatever era we leave from
  if (uMode == 1 && uJump < 0.001 && uFlash < 0.001) col = apex(uv);
  else if (uMode == 3 && uJump < 0.001 && uFlash < 0.001) col = blueprint(uv);
  else col = stars(uv);
  o = vec4(mix(col, vec3(1.0), uFlash), 1.0);
}`;

const smooth = (a: number, b: number, t: number) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

export function mountWarp(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl) { canvas.remove(); return; }
  const still = calm();
  const root = document.documentElement;
  const { p, u } = program(gl, fullscreenVS, FS);
  gl.useProgram(p);
  let time = 3, speed = 1, gain = 1;
  let jumpAt = -1, jumpPeak: (() => void) | null = null;   // seconds into a jump, -1 when not jumping
  let mode = 0, px = 1;

  function draw(dt: number) {
    // the opening covers the whole screen: nothing to draw under it
    if (root.classList.contains('intro')) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(MAX_PIXELS / Math.max(1, cw * ch)));
    const w = Math.max(1, Math.round(cw * dpr)), h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    px = dpr;

    // past the first screen the warp slows to a drift and dims to a whisper
    const k = Math.min(1, scrollY / (innerHeight * 0.9));
    const ease = k * k * (3 - 2 * k);
    speed += (1 - ease * 0.85 - speed) * Math.min(1, dt * 4);
    gain += (1 - ease * 0.78 - gain) * Math.min(1, dt * 4);

    // the jump: accelerate and stretch (0.15–1.35s), flash white (1.25–1.45s), arrive, then settle (to 2.1s)
    let J = 0, flash = 0;
    if (jumpAt >= 0) {
      jumpAt += dt;
      const t = jumpAt;
      J = Math.pow(smooth(0.15, 1.35, t), 2.2) * (1 - smooth(1.5, 1.7, t));
      flash = smooth(1.25, 1.45, t) * (1 - smooth(1.6, 2.1, t));
      if (t >= 1.45 && jumpPeak) { const f = jumpPeak; jumpPeak = null; f(); }
      if (t >= 1.9 && canvas.classList.contains('jump-on')) canvas.classList.remove('jump-on');
      if (t >= 2.4) { jumpAt = -1; canvas.classList.remove('jump'); }
    }
    time += dt * speed * (1 + J * J * 30);

    gl!.viewport(0, 0, w, h);
    gl!.uniform2f(u('uRes'), w, h);
    gl!.uniform1f(u('uTime'), time);
    gl!.uniform1f(u('uGain'), jumpAt >= 0 ? Math.max(gain, 1) : gain);
    gl!.uniform1f(u('uJump'), J);
    gl!.uniform1f(u('uFlash'), flash);
    gl!.uniform1i(u('uMode'), mode);
    gl!.uniform1f(u('uPx'), px);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  onTheme((t: Theme) => {
    const c = palettes[t];
    gl.uniform3fv(u('uPaper'), rgb(c.paper));
    gl.uniform3fv(u('uStar'), rgb(c.ink));
    gl.uniform3fv(u('uAccent'), rgb(c.accent));
    mode = ({ apex: 1, blueprint: 3 } as Record<string, number>)[t] ?? 0;
    if (still) draw(0);
  });

  // `peak` runs at the white flash: that's when the page underneath can change (navigate or scroll home)
  document.addEventListener('warp:jump', (e) => {
    if (still || jumpAt >= 0) { (e as CustomEvent).detail?.peak?.(); return; }
    jumpPeak = (e as CustomEvent).detail?.peak ?? null;
    jumpAt = 0;
    canvas.classList.add('jump');
    requestAnimationFrame(() => canvas.classList.add('jump-on'));
  });

  if (still) { draw(0); addEventListener('resize', () => draw(0)); }
  else loop(canvas, draw, { always: true });
}
