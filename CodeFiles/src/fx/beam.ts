// The close of every page: a red beam falls from the top of a full-screen stage and lands on the contact box.
// Where it hits, light runs along the box's edge; around it hangs a little fog and dust drifting up through the
// light. The beam leans gently toward the pointer. In Calm mode one frame is drawn.
import { program, fullscreenVS, fit, loop, approach } from './gl';
import { onTheme, palettes, rgb } from '../lib/theme';
import { calm } from '../lib/motion';

const FS = `
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;           // device px
uniform vec4 uBox;           // left, top, right (device px, from the top-left), dpr
uniform float uTime, uSway, uLight;
uniform vec3 uAccent;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  float dpr = uBox.w;
  vec2 px = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  float hitY = uBox.y;
  float cx = (uBox.x + uBox.z) * 0.5;
  // the beam leans: its top follows the pointer a little, its foot stays on the box
  float k = clamp(px.y / max(hitY, 1.0), 0.0, 1.0);
  float bx = cx + uSway * (1.0 - k) * uRes.x * 0.08;
  float dx = abs(px.x - bx);
  float above = step(px.y, hitY);
  float flicker = 0.85 + 0.15 * noise(vec2(px.y * 0.01 / dpr - uTime * 3.0, uTime));
  float core = exp(-dx / (1.1 * dpr)) * above;
  float glow = exp(-dx / ((10.0 + 30.0 * k) * dpr)) * above * 0.55 * flicker;
  float haze = exp(-dx / (140.0 * dpr)) * above * 0.18 * smoothstep(0.0, 1.0, k);

  // impact: a bright bloom and a line of light running out along the box's top edge
  float dy = abs(px.y - hitY);
  float spread = (uBox.z - uBox.x) * 0.5;
  float bloom = exp(-length(vec2(px.x - cx, (px.y - hitY) * 1.6)) / (60.0 * dpr));
  float edge = exp(-dy / (1.4 * dpr)) * exp(-abs(px.x - cx) / (spread * 0.45)) * step(uBox.x, px.x) * step(px.x, uBox.z);
  float edgeGlow = exp(-dy / (14.0 * dpr)) * exp(-abs(px.x - cx) / (spread * 0.35)) * 0.5 * step(px.y, hitY + 2.0 * dpr);

  // fog and dust rising through the light
  float fog = noise(px / (220.0 * dpr) + vec2(0.0, uTime * 0.06)) * exp(-dx / (260.0 * dpr)) * above * 0.22;
  vec2 q = (px + vec2(0.0, uTime * 40.0 * dpr)) / (12.0 * dpr);
  vec2 cell = floor(q);
  vec2 at = vec2(hash(cell + 7.0), hash(cell + 13.0)) * 0.6 + 0.2;     // each mote sits somewhere in its cell
  float mote = smoothstep(0.16, 0.0, length(fract(q) - at));           // a round point, not a block
  float spark = step(0.97, hash(cell)) * mote * exp(-dx / (90.0 * dpr)) * above * (0.5 + 0.5 * sin(uTime * 4.0 + hash(cell + 3.0) * 6.28));

  // on paper the soft parts would read as grey smoke, so they thin out in the light theme
  float soft = 1.0 - uLight * 0.85;
  haze *= soft; fog *= soft; glow *= 1.0 - uLight * 0.4;
  vec3 hot = mix(vec3(1.0, 0.92, 0.9), uAccent, uLight * 0.6);
  vec3 col = hot * (core + edge * 0.8 + bloom * 0.6) + uAccent * (glow + haze + bloom * 0.6 + edgeGlow + fog + spark);
  float a = core * 0.95 + glow + haze + bloom * 0.9 + edge + edgeGlow + fog + spark * 0.7;
  vec3 tint = min(col / max(a, 1e-4), vec3(1.0));   // the colour of the light here, whatever its strength
  a = clamp(a, 0.0, 1.0);
  o = vec4(tint * a, a);
}`;

export function mountBeam(canvas: HTMLCanvasElement, box: HTMLElement) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return;
  const still = calm();
  const { p, u } = program(gl, fullscreenVS, FS);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  let accent = rgb(palettes.dark.accent), light = 0, sway = 0, swayT = 0, time = 0;
  if (!still) addEventListener('pointermove', (e) => (swayT = (e.clientX / innerWidth - 0.5) * 2), { passive: true });

  function draw(dt: number) {
    const { w, h, dpr } = fit(canvas, 1.5);
    time += dt;
    sway = approach(sway, swayT, dt, 0.6);
    const c = canvas.getBoundingClientRect(), b = box.getBoundingClientRect();
    gl!.viewport(0, 0, w, h);
    gl!.useProgram(p);
    gl!.uniform2f(u('uRes'), w, h);
    gl!.uniform4f(u('uBox'), (b.left - c.left) * dpr, (b.top - c.top) * dpr, (b.right - c.left) * dpr, dpr);
    gl!.uniform1f(u('uTime'), still ? 2 : time);
    gl!.uniform1f(u('uSway'), sway);
    gl!.uniform1f(u('uLight'), light);
    gl!.uniform3fv(u('uAccent'), accent);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }
  onTheme((t) => { accent = rgb(palettes[t].accent); light = t === 'light' ? 1 : 0; if (still) draw(0); });
  if (still) { draw(0); new ResizeObserver(() => draw(0)).observe(canvas); }
  else loop(canvas, draw);
}
