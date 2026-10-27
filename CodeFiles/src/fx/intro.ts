// The opening: a typographic room (after tejj.in's loader, rebuilt from scratch). The screen becomes the mouth of a
// rectangular tunnel; floor, ceiling and both walls are each lined with seven strips running away into the
// distance, and the name slides along every strip, nearest row first, holds, then slides on out. Type near the
// camera is ink and warms to the accent as it recedes, so the red gathers at the vanishing point.
// Afterwards the whole layer fades away over the finished page underneath.
import { program } from './gl';
import { palettes, rgb, theme } from '../lib/theme';

const PHRASE = 'STEP INTO MY MIND ';   // tejj.in's line, made mine
const ROWS = 7;
const ENTRY = 1200, STAGGER = 430, HOLD = 700, EXIT = 1100;   // ms
export const INTRO_MS = STAGGER * (ROWS - 1) + ENTRY + HOLD + EXIT;
const FOV = Math.PI / 3;                  // 60°, vertical
// The room's mouth keeps one shape on every screen (landscape 1214 × 596, turned for portrait), with strips 163 deep.
// The phrase is set exactly as long as the floor plus one wall, so the floor and ceiling always read "STEP INTO MY"
// and the side walls carry on with "MIND", whatever the viewport.
const REF_W = 1214, REF_H = 596, REF_S = 163;
const ASPECT = (REF_W + REF_H) / REF_S;    // phrase length ÷ letter height

const VS = `
in vec3 aPos;
in vec2 aUv;
in vec3 aStrip;              // x: row (0 = nearest), y: how much of the phrase one strip shows, z: where it starts
uniform mat4 uProj;
uniform float uSlide[${ROWS}];
out vec2 vUv;
out float vDepth;
void main() {
  int row = int(aStrip.x + 0.5);
  vUv = vec2(aUv.x * aStrip.y + aStrip.z + uSlide[row], aUv.y);
  vDepth = -aPos.z;
  gl_Position = uProj * vec4(aPos, 1.0);
}`;

const FS = `
in vec2 vUv;
in float vDepth;
out vec4 o;
uniform sampler2D uTex;
uniform vec3 uInk, uAccent;
uniform float uCam, uFar;
void main() {
  // outside the phrase's span the strip is empty: that is what lets the text slide in from nothing
  float inside = step(0.0, vUv.x) * step(vUv.x, 1.0);
  float a = texture(uTex, vUv).a * inside;
  float depth = clamp((vDepth - uCam) / uFar, 0.0, 1.0);
  vec3 ink = mix(uInk, uAccent, smoothstep(0.1, 0.9, depth) * 0.92);
  o = vec4(ink * a, a);
}`;

// cubic-bezier(.87, 0, .13, 1): a hard ease-in-out, slow off the mark and into the stop
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const s = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  const d = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * a + 6 * (1 - t) * t * (b - a) + 3 * t * t * (1 - b);
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) { const k = d(t, x1, x2); if (Math.abs(k) < 1e-6) break; t = Math.min(1, Math.max(0, t - (s(t, x1, x2) - x) / k)); }
    return s(t, y1, y2);
  };
}
const ease = bezier(0.87, 0, 0.13, 1);
const clamp = (v: number) => Math.min(1, Math.max(0, v));

// the phrase, drawn once into a wide strip of texture
async function phraseTexture(gl: WebGL2RenderingContext) {
  // broad heavy capitals, like tejj's: the name's face in the current era (Syne ExtraBold today, Archivo Expanded on the Wangan,
  // Big Shoulders Stencil in 2049)
  const css = getComputedStyle(document.documentElement);
  const font = css.getPropertyValue('--font-display').trim() || '"Syne", sans-serif';
  const weight = css.getPropertyValue('--display-weight').trim() || '800';
  await document.fonts.load(`${weight} 100px ${font}`).catch(() => {});
  const h = 192, c = document.createElement('canvas'), g = c.getContext('2d')!;
  const w = Math.round(h * ASPECT);
  c.width = w; c.height = h;
  // stretch the letters wide until the phrase spans exactly the room's floor and one wall (tejj's face is an
  // extended gothic; widening a heavy grotesque gets the same tight, broad capitals)
  g.font = `${weight} ${h * 0.78}px ${font}`;
  const sx = w / g.measureText(PHRASE).width;
  g.setTransform(sx, 0, 0, 1, 0, 0);
  g.fillStyle = '#fff'; g.textBaseline = 'middle';
  g.fillText(PHRASE, 0, h * 0.55);
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
}

// Four walls × ROWS strips. Each wall is the floor turned about the view axis: 0 = floor, π = ceiling (upside
// down, as if read from the floor), ±π/2 = the side walls. Positions are in CSS px; the screen sits at z = 0.
function geometry(vw: number, vh: number) {
  // fit the room's mouth inside the viewport at its fixed shape
  const land = vw >= vh, rw = land ? REF_W : REF_H, rh = land ? REF_H : REF_W;
  let W: number, H: number, s: number;
  if (rh / rw > vh / vw) { H = vh; s = H * REF_S / rh; W = s * rw / REF_S; }
  else { W = vw; s = W * REF_S / rw; H = s * rh / REF_S; }
  const aspect = ASPECT;
  const pos: number[] = [], uv: number[] = [], strip: number[] = [], idx: number[] = [];
  const walls: [number, number, number][] = [[0, W / 2, H / 2], [Math.PI, W / 2, H / 2], [-Math.PI / 2, H / 2, W / 2], [Math.PI / 2, H / 2, W / 2]];
  const floorSpan = W / s / aspect;
  for (const [ang, half, dist] of walls) {
    const c = Math.cos(ang), sn = Math.sin(ang);
    const span = (2 * half) / s / aspect;      // the share of the phrase one strip can show at true letter shape
    const start = ang === 0 || ang === Math.PI ? 0 : floorSpan;   // the side walls pick the phrase up where the floor leaves off
    for (let r = 0; r < ROWS; r++) {
      const z0 = -r * s, z1 = -(r + 1) * s;
      // near edge (z0) is the letters' foot, far edge (z1) their top, so the type stands up as you look in
      const corners = [[-half, z1, 0, 0], [half, z1, 1, 0], [-half, z0, 0, 1], [half, z0, 1, 1]];
      const base = pos.length / 3;
      for (const [x, z, u, v] of corners) {
        const y = -dist;
        pos.push(x * c - y * sn, x * sn + y * c, z);
        uv.push(u, v);
        strip.push(r, span, start);
      }
      idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), strip: new Float32Array(strip), idx: new Uint16Array(idx) };
}

function perspective(aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(FOV / 2), m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
  return m;
}

/** Plays the room on `canvas` and resolves when it has finished (or straight away if WebGL is missing). */
export async function playIntro(canvas: HTMLCanvasElement, signal: { skipped: boolean }) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return;
  const { p, u } = program(gl, VS, FS);
  gl.useProgram(p);
  await phraseTexture(gl);

  const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 1.25);   // crisp enough for moving type
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
  const cam = H / 2 / Math.tan(FOV / 2);       // the screen rectangle exactly fills the view at z = 0
  const geo = geometry(W, H);
  const buf = (data: Float32Array, name: string, size: number) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };
  gl.bindVertexArray(gl.createVertexArray());
  // shift the world so the camera sits at the origin looking down -z
  const shifted = geo.pos.map((v, i) => (i % 3 === 2 ? v - cam : v));
  buf(shifted, 'aPos', 3); buf(geo.uv, 'aUv', 2); buf(geo.strip, 'aStrip', 3);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);

  const pal = palettes[theme()];
  gl.uniformMatrix4fv(u('uProj'), false, perspective(W / H, 1, 20000));
  gl.uniform3fv(u('uInk'), rgb(pal.ink));
  gl.uniform3fv(u('uAccent'), rgb(pal.accent));
  gl.uniform1f(u('uCam'), cam);
  gl.uniform1f(u('uFar'), cam * 1.75);
  gl.uniform1i(u('uTex'), 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const slide = new Float32Array(ROWS);
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const frame = (now: number) => {
      const t = now - t0;
      for (let r = 0; r < ROWS; r++) {
        const inAt = r * STAGGER, outAt = inAt + ENTRY + HOLD;
        // 1 → 0 slides the phrase in from the far end of the strip; 0 → -1 carries it on out
        slide[r] = 1 - ease(clamp((t - inAt) / ENTRY)) - ease(clamp((t - outAt) / EXIT));
      }
      gl.uniform1fv(u('uSlide[0]'), slide);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0);
      if (t >= INTRO_MS || signal.skipped) done();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
