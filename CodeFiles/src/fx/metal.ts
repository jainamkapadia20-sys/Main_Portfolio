// The JK monogram poured in liquid metal. The strokes are rasterised twice (sharp for the edge, blurred for a
// rounded height), the shader lights that height like polished chrome with slow-moving reflections, and the mark
// tilts toward the pointer. It dissolves in when the background's particle monogram bursts (`field:burst`), and a
// click on it sends the particles home to burst again.
import { program, fullscreenVS, fit, loop, approach, monogramCanvas } from './gl';
import { onTheme } from '../lib/theme';
import { calm } from '../lib/motion';

const FS = `
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;      // r: sharp mask, g: blurred height
uniform vec2 uRes;
uniform float uTime, uReveal, uLight;
uniform vec2 uTilt;
uniform vec3 uAccent;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  // keep the mark square inside whatever box it is given
  vec2 uv = vUv - 0.5;
  float aspect = uRes.x / uRes.y;
  if (aspect > 1.0) uv.x *= aspect; else uv.y /= aspect;
  uv += 0.5;
  uv.y = 1.0 - uv.y;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { o = vec4(0); return; }

  float mask = texture(uTex, uv).r;
  float e = 1.5 / 512.0;
  float h = texture(uTex, uv).g;
  float hx = texture(uTex, uv + vec2(e, 0)).g - texture(uTex, uv - vec2(e, 0)).g;
  float hy = texture(uTex, uv + vec2(0, e)).g - texture(uTex, uv - vec2(0, e)).g;
  vec3 n = normalize(vec3(-hx * 7.0 + uTilt.x * 0.6, hy * 7.0 - uTilt.y * 0.6, 1.0));

  // chrome: the reflection looks up into a banded studio sky that slowly rolls
  vec3 r = reflect(vec3(0, 0, -1), n);
  float flow = noise(uv * 3.0 + uTime * 0.12) * 1.4;
  float band = r.y * 2.2 + r.x * 0.8 + flow + uTime * 0.18;
  float sky = 0.5 + 0.5 * sin(band * 3.14159);
  sky = pow(sky, 2.2);
  float spec = pow(max(0.0, dot(n, normalize(vec3(-0.4 + uTilt.x, 0.5 - uTilt.y, 1.0)))), 40.0);
  vec3 dark = mix(vec3(0.07), vec3(0.62), uLight);
  vec3 bright = mix(vec3(0.97), vec3(0.08), uLight);
  vec3 col = mix(dark, bright, sky) + spec * (1.0 - uLight * 0.9);
  // the rim, where the surface turns away, catches the red
  float rim = pow(1.0 - n.z, 2.0) * smoothstep(0.0, 0.4, h);
  col = mix(col, uAccent, clamp(rim * 1.6, 0.0, 0.55));

  // dissolve in from the centre outward, with a red-hot edge
  float grain = noise(uv * 26.0) * 0.6 + length(uv - 0.5) * 0.9;
  float t = uReveal * 1.35;
  float shown = smoothstep(t - 0.04, t - 0.12, grain);
  float edge = smoothstep(t - 0.02, t - 0.08, grain) - shown;
  col = mix(col, uAccent * 1.2, clamp(edge * 2.0, 0.0, 1.0));
  float a = mask * max(shown, edge);
  o = vec4(col * a, a);
}`;

export function mountMetal(canvas: HTMLCanvasElement, opts: { reform?: boolean } = {}) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return;
  const still = calm();
  const { p, u } = program(gl, fullscreenVS, FS);

  // one texture: the crisp mask in red, a soft height in green
  const S = 512;
  const sharp = monogramCanvas(S).getContext('2d')!.getImageData(0, 0, S, S).data;
  const soft = monogramCanvas(S, 15, S / 70).getContext('2d')!.getImageData(0, 0, S, S).data;
  const px = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    const m = sharp[i * 4 + 3];
    px[i * 4] = m;
    px[i * 4 + 1] = Math.min(255, soft[i * 4 + 3] * (m / 255) * 1.15);
    px[i * 4 + 3] = 255;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let light = 0, accent = [1, 0.23, 0.19];
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let reveal = still ? 1 : 0, revealTarget = still ? 1 : 0, time = 0;
  if (!still) {
    addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      tilt.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.5)));
      tilt.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.5)));
    }, { passive: true });
    // the background monogram bursts and leaves this one behind; without a field (or if it is late), appear anyway
    document.addEventListener('field:burst', () => (revealTarget = 1));
    setTimeout(() => (revealTarget = 1), 2600);
    if (opts.reform) canvas.addEventListener('click', () => {
      revealTarget = 0;
      document.dispatchEvent(new CustomEvent('field:reform'));
    });
  }

  function draw(dt: number) {
    const { w, h } = fit(canvas, 2);
    time += dt;
    tilt.x = approach(tilt.x, tilt.tx, dt, 0.25);
    tilt.y = approach(tilt.y, tilt.ty, dt, 0.25);
    reveal = approach(reveal, revealTarget, dt, revealTarget ? 0.45 : 0.18);
    gl!.viewport(0, 0, w, h);
    gl!.useProgram(p);
    gl!.uniform1i(u('uTex'), 0);
    gl!.uniform2f(u('uRes'), w, h);
    gl!.uniform1f(u('uTime'), still ? 3 : time);
    gl!.uniform1f(u('uReveal'), reveal);
    gl!.uniform1f(u('uLight'), light);
    gl!.uniform2f(u('uTilt'), tilt.x, tilt.y);
    gl!.uniform3fv(u('uAccent'), accent);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  onTheme((t) => {
    light = t === 'light' ? 1 : 0;
    accent = t === 'light' ? [0.78, 0.12, 0.09] : [1, 0.23, 0.19];
    if (still) draw(0);
  });

  if (still) { draw(0); new ResizeObserver(() => draw(0)).observe(canvas); }
  else loop(canvas, draw);
}
