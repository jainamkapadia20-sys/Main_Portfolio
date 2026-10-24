// The few WebGL helpers every shader piece shares: compile, a full-screen triangle, DPR-aware resize,
// and a loop that sleeps while its canvas is off screen or the tab is hidden.

export function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, '#version 300 es\nprecision highp float;\n' + src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  const cache = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
    return cache.get(name)!;
  };
  return { p, u };
}

/** Vertex shader for a full-screen pass: draw with gl.drawArrays(gl.TRIANGLES, 0, 3), no buffers. */
export const fullscreenVS = `
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Keeps a canvas's backing store at its CSS size × DPR (capped). Returns the current size in device pixels. */
export function fit(canvas: HTMLCanvasElement, maxDpr = 2) {
  const dpr = Math.min(devicePixelRatio || 1, maxDpr);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return { w, h, dpr };
}

/** requestAnimationFrame loop with dt in seconds that runs only while `el` is on screen and the tab is visible. */
export function loop(el: Element, frame: (dt: number, t: number) => void, opts: { always?: boolean } = {}) {
  let raf = 0, last = 0, t = 0, visible = !!opts.always;
  const tick = (now: number) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now; t += dt;
    frame(dt, t);
    raf = requestAnimationFrame(tick);
  };
  const run = () => {
    const want = visible && !document.hidden;
    if (want && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    if (!want && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  if (!opts.always) new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }, { rootMargin: '120px' }).observe(el);
  document.addEventListener('visibilitychange', run);
  run();
  return { kick: run };
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** Frame-rate independent ease toward a target; `s` is roughly the time constant in seconds. */
export const approach = (cur: number, target: number, dt: number, s: number) => cur + (target - cur) * (1 - Math.exp(-dt / s));

/** The JK monogram's strokes (same geometry as public/monogram.svg and the nav mark), on a 120-unit square. */
export const MONOGRAM = ['M60 12V76a23 23 0 0 1-46 0', 'M60 66L100 12', 'M76 45L106 108'];

/** Draws the monogram into a square 2D canvas of `size` px, white on transparent. */
export function monogramCanvas(size: number, stroke = 15, blur = 0) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const s = size / 120;
  g.setTransform(s, 0, 0, s, 0, 0);
  g.strokeStyle = '#fff'; g.lineWidth = stroke; g.lineCap = 'butt';
  if (blur) g.filter = `blur(${blur}px)`;
  MONOGRAM.forEach((d) => g.stroke(new Path2D(d)));
  return c;
}
