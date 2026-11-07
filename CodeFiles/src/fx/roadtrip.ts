// The projects as a night drive: the page's scroll drives a car down a long straight road, and each project stands
// beside it on a lit billboard, alternating sides. The car eases off at each billboard; as you reach one its lamps
// flicker on, its face brightens and the driver glances at it. Street lamps throw pools of light on the asphalt,
// headlights light the road ahead, the oncoming traffic and the cars ahead keep moving on their own, and a city sits
// on the horizon under the stars. Click a billboard to open its project.
// mountRoadTrip(stage, items, hooks) builds it in a canvas inside `stage` and returns { setProgress, dispose }.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type TripItem = { title: string; tag: string; sub: string; slug: string; img?: string };
type Hooks = { onFocus?: (i: number) => void; onOpen?: (i: number, rect: DOMRect) => void };

const GAP = 34;            // road between two billboards
const FIRST = 30;          // road before the first one
const BOARD_W = 7.2, BOARD_H = 4.5, BOARD_UP = 2.7;
const ROAD_W = 9;
const LAMP_GAP = 18;
const PAPER = 0x070708;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** A soft round glow, for lamps, headlights and the halo behind the boards. */
function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,.35)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, inner); r.addColorStop(0.25, mid); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Headlight throw on the road: bright near the car, fading as it widens into the distance. */
function beamTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d')!;
  const v = g.createLinearGradient(0, 512, 0, 0);
  v.addColorStop(0, 'rgba(255,248,230,.55)'); v.addColorStop(0.35, 'rgba(255,248,230,.18)'); v.addColorStop(1, 'rgba(255,248,230,0)');
  g.fillStyle = v; g.fillRect(0, 0, 256, 512);
  g.globalCompositeOperation = 'destination-in';
  const h = g.createLinearGradient(0, 0, 256, 0);
  h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.5, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = h; g.fillRect(0, 0, 256, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** The glow on the horizon behind the city. */
function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d')!, v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, 'rgba(7,7,8,0)'); v.addColorStop(0.55, 'rgba(52,56,72,.6)'); v.addColorStop(0.8, 'rgba(150,154,176,.6)'); v.addColorStop(1, 'rgba(7,7,8,0)');
  g.fillStyle = v; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const loadImage = (src?: string) => new Promise<HTMLImageElement | null>((done) => {
  if (!src) return done(null);
  const i = new Image(); i.decoding = 'async'; i.onload = () => done(i); i.onerror = () => done(null); i.src = src;
});

/** One billboard's face, as a printed poster: the project's picture (or an abstract placeholder) and a caption band. */
function posterTexture(it: TripItem, i: number, n: number, img: HTMLImageElement | null, aniso: number) {
  const W = 1600, H = 1000, BAND = 236, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue('--font-display').trim() || 'sans-serif';
  const weight = css.getPropertyValue('--display-weight').trim() || '400';
  const mono = css.getPropertyValue('--font-mono').trim() || 'monospace';
  const body = css.getPropertyValue('--font').trim() || 'sans-serif';
  const ih = H - BAND;
  if (img) {
    const s = Math.max(W / img.width, ih / img.height), w = img.width * s, h = img.height * s;
    g.drawImage(img, (W - w) / 2, (ih - h) / 2, w, h);
  } else {
    // a placeholder: brushed graphite with one bold silver shape, different for each project
    const bg = g.createLinearGradient(0, 0, W, ih); bg.addColorStop(0, '#2a2a31'); bg.addColorStop(1, '#0d0d10');
    g.fillStyle = bg; g.fillRect(0, 0, W, ih);
    for (let y = 0; y < ih; y += 3) { g.fillStyle = `rgba(255,255,255,${0.012 + Math.random() * 0.012})`; g.fillRect(0, y, W, 1); }
    const sh = g.createLinearGradient(W * 0.4, 0, W, ih); sh.addColorStop(0, '#e9e9ef'); sh.addColorStop(1, '#6e6e78');
    g.fillStyle = sh; g.beginPath();
    switch (i % 6) {
      case 0: g.arc(W * 0.7, ih * 0.5, ih * 0.3, 0, Math.PI * 2); break;
      case 1: g.roundRect(W * 0.46, ih * 0.3, W * 0.42, ih * 0.26, ih * 0.13); break;
      case 2: g.moveTo(W * 0.5, ih * 0.78); g.lineTo(W * 0.7, ih * 0.2); g.lineTo(W * 0.9, ih * 0.78); break;
      case 3: g.arc(W * 0.7, ih * 0.82, ih * 0.44, Math.PI, Math.PI * 2); break;
      case 4: g.roundRect(W * 0.56, ih * 0.16, W * 0.3, ih * 0.6, 40); break;
      default: g.arc(W * 0.7, ih * 0.5, ih * 0.3, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(W * 0.7, ih * 0.5);
    }
    g.fill();
    g.font = `500 34px ${mono}`; g.fillStyle = 'rgba(232,232,238,.6)'; g.textBaseline = 'top';
    g.fillText('COMING SOON', 72, 72);
  }
  // the caption band, like the strip along the foot of a real billboard
  g.fillStyle = '#0b0b0d'; g.fillRect(0, ih, W, BAND);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, ih, W, 2);
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#F5F5F7'; g.font = `${weight} 104px ${display}`;
  g.fillText(String(i + 1).padStart(2, '0'), 64, ih + 150);
  g.font = `600 64px ${body}`;
  g.fillText(it.title, 260, ih + 112, W - 260 - 380);
  g.font = `500 30px ${mono}`; g.fillStyle = 'rgba(232,232,238,.62)';
  g.fillText(`${it.tag.toUpperCase()} · ${it.sub.toUpperCase()}`, 262, ih + 170, W - 262 - 380);
  g.textAlign = 'right'; g.fillStyle = 'rgba(232,232,238,.5)';
  g.fillText(`${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, W - 64, ih + 112);
  g.fillStyle = '#F5F5F7'; g.fillText('OPEN PROJECT →', W - 64, ih + 170);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}

export function mountRoadTrip(stage: HTMLElement, items: TripItem[], hooks: Hooks = {}) {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch { return null; }
  renderer.setClearColor(PAPER, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  stage.prepend(canvas);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const n = items.length;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PAPER, 0.011);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);
  camera.rotation.order = 'YXZ';   // turn, then look up: a driver's head
  scene.add(new THREE.HemisphereLight(0x9aa0b4, 0x050506, 0.35));
  const moon = new THREE.DirectionalLight(0xcfd6ff, 0.35); moon.position.set(-30, 40, -60); scene.add(moon);

  const glow = glowTexture();
  const warm = glowTexture('rgba(255,236,200,1)', 'rgba(255,214,150,.3)');
  const red = glowTexture('rgba(255,70,80,1)', 'rgba(255,40,60,.35)');
  const disposables: { dispose(): void }[] = [glow, warm, red];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const additive = (map: THREE.Texture, color = 0xffffff, opacity = 1) =>
    keep(new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));

  // where the billboards stand, and where the car stops to look at each
  const narrow = () => camera.aspect < 0.85;
  const boardX = () => (narrow() ? 4.9 : 7.6);
  const boardZ = (i: number) => -(FIRST + i * GAP);
  const stopBack = () => (narrow() ? 19 : 12);   // how far short of a board the car stops
  const stopZ = (i: number) => boardZ(i) + stopBack();
  const END = boardZ(n - 1) - 260;

  // ROAD: asphalt, edge lines and centre dashes
  const roadLen = -END + 80;
  const road = new THREE.Mesh(keep(new THREE.PlaneGeometry(ROAD_W, roadLen)), keep(new THREE.MeshStandardMaterial({ color: 0x0e0e11, roughness: 0.92, metalness: 0 })));
  road.rotation.x = -Math.PI / 2; road.position.z = 40 - roadLen / 2; scene.add(road);
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(1400, roadLen + 600)), keep(new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 1 })));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, road.position.z); scene.add(ground);
  const lineMat = keep(new THREE.MeshBasicMaterial({ color: 0x8c8c96 }));
  for (const x of [-ROAD_W / 2 + 0.3, ROAD_W / 2 - 0.3]) {
    const edge = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.12, roadLen)), lineMat);
    edge.rotation.x = -Math.PI / 2; edge.position.set(x, 0.01, road.position.z); scene.add(edge);
  }
  const dashGeo = keep(new THREE.PlaneGeometry(0.14, 2.6));
  const dashCount = Math.ceil(roadLen / 7);
  const dashes = new THREE.InstancedMesh(dashGeo, keep(new THREE.MeshBasicMaterial({ color: 0xd8d8de })), dashCount);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), one = new THREE.Vector3(1, 1, 1);
  for (let k = 0; k < dashCount; k++) dashes.setMatrixAt(k, m4.compose(new THREE.Vector3(0, 0.012, 40 - k * 7), q, one));
  scene.add(dashes);

  // STREET LAMPS: poles, heads, a glow at each head and a pool of light on the road under it
  const lampCount = Math.ceil(roadLen / LAMP_GAP);
  const poleGeo = keep(new THREE.CylinderGeometry(0.07, 0.09, 7.2, 8));
  const poleMat = keep(new THREE.MeshStandardMaterial({ color: 0x1b1b20, roughness: 0.6, metalness: 0.6 }));
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);
  const arms = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1.6, 0.08, 0.12)), poleMat, lampCount);
  const pool = keep(new THREE.PlaneGeometry(7, 7));
  const lampGlowGeo = keep(new THREE.PlaneGeometry(1.6, 1.6));
  const lampGlowMat = additive(warm, 0xffe2b0, 0.9);
  const poolMat = additive(warm, 0xffd9a0, 0.16);
  // the road is wet: lights smear into long streaks on it
  const streakGeo = keep(new THREE.PlaneGeometry(0.7, 11));
  const streakMat = additive(warm, 0xffd2a0, 0.22);
  const lampGlows: THREE.Mesh[] = [];
  for (let k = 0; k < lampCount; k++) {
    const side = k % 2 ? 1 : -1, z = 30 - k * LAMP_GAP - (k % 2) * LAMP_GAP / 2, x = side * (ROAD_W / 2 + 1.1);
    poles.setMatrixAt(k, m4.compose(new THREE.Vector3(x, 3.6, z), new THREE.Quaternion(), one));
    arms.setMatrixAt(k, m4.compose(new THREE.Vector3(x - side * 0.7, 7.15, z), new THREE.Quaternion(), one));
    const g = new THREE.Mesh(lampGlowGeo, lampGlowMat); g.position.set(x - side * 1.35, 7.0, z); scene.add(g); lampGlows.push(g);
    const p = new THREE.Mesh(pool, poolMat); p.rotation.x = -Math.PI / 2; p.position.set(x - side * 2.2, 0.02, z); scene.add(p);
    const st = new THREE.Mesh(streakGeo, streakMat); st.rotation.x = -Math.PI / 2; st.position.set(x - side * 1.35, 0.03, z + 5.5); scene.add(st);
  }
  scene.add(poles, arms);

  // THE CITY on the horizon: dark blocks with a few lit windows, the sky glowing behind them, and stars
  const city = new THREE.Group(); scene.add(city);
  const blockGeo = keep(new THREE.BoxGeometry(1, 1, 1));
  const blocks = new THREE.InstancedMesh(blockGeo, keep(new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9 })), 160);
  const windows: number[] = [];
  for (let k = 0; k < 160; k++) {
    const side = k % 2 ? 1 : -1, x = side * rnd(28, 140), z = rnd(END + 60, -120), w = rnd(6, 16), h = rnd(8, 46), d = rnd(6, 16);
    blocks.setMatrixAt(k, m4.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)));
    for (let j = 0; j < 10; j++) if (Math.random() < 0.55) windows.push(x + rnd(-w / 2, w / 2), rnd(2, h - 1), z + d / 2 + 0.05);
  }
  city.add(blocks);
  const winGeo = keep(new THREE.BufferGeometry()); winGeo.setAttribute('position', new THREE.Float32BufferAttribute(windows, 3));
  city.add(new THREE.Points(winGeo, keep(new THREE.PointsMaterial({ color: 0xffe4b8, size: 0.35, transparent: true, opacity: 0.75 }))));
  const stars: number[] = [];
  for (let k = 0; k < 900; k++) { const a = rnd(0, Math.PI * 2), e = rnd(0.12, 1.3), r = 600; stars.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
  const starGeo = keep(new THREE.BufferGeometry()); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  const sky = new THREE.Group(); scene.add(sky);   // stars and the horizon glow travel with the car, so they stay put
  sky.add(new THREE.Points(starGeo, keep(new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false }))));
  const horizon = new THREE.Mesh(keep(new THREE.PlaneGeometry(1600, 180)), keep(new THREE.MeshBasicMaterial({ map: keep(skyTexture()), transparent: true, depthWrite: false, fog: false })));
  horizon.position.set(0, 40, -560); sky.add(horizon);

  // TRAFFIC: oncoming headlights in the left lane, taillights pulling away in the right
  type Car = { mesh: THREE.Group; z: number; v: number };
  const lightGeo = keep(new THREE.PlaneGeometry(0.9, 0.9));
  const bodyGeo = keep(new THREE.BoxGeometry(1.8, 0.8, 4.4));
  const cabinGeo = keep(new THREE.BoxGeometry(1.5, 0.55, 2.1));
  const bodyMat = keep(new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.35, metalness: 0.7 }));
  // either way the car's lit end faces the viewer (headlights coming, taillights going), so the body runs away from it
  const carPair = (tex: THREE.Texture, color: number, x: number) => {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, bodyMat); body.position.set(0, 0.62, -2.2); grp.add(body);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat); cabin.position.set(0, 1.4, -2.5); grp.add(cabin);
    for (const dx of [-0.66, 0.66]) {
      const s = new THREE.Mesh(lightGeo, additive(tex, color, 1)); s.position.set(dx, 0.66, 0.12); grp.add(s);
      const st = new THREE.Mesh(streakGeo, additive(tex, color, 0.3)); st.rotation.x = -Math.PI / 2; st.scale.set(0.6, 0.55, 1); st.position.set(dx, 0.03, 3.2); grp.add(st);
    }
    grp.position.x = x; scene.add(grp); return grp;
  };
  const oncoming: Car[] = Array.from({ length: 4 }, (_, k) => ({ mesh: carPair(glow, 0xf4f6ff, -ROAD_W / 4), z: -60 - k * 70, v: rnd(24, 32) }));
  const ahead: Car[] = Array.from({ length: 3 }, (_, k) => ({ mesh: carPair(red, 0xff3b48, ROAD_W / 4), z: -40 - k * 55, v: rnd(4, 8) }));

  // HEADLIGHTS: the beam on the road ahead rides with the car
  const beam = new THREE.Mesh(keep(new THREE.PlaneGeometry(9, 34)), additive(keep(beamTexture()), 0xffffff, 0.42));
  beam.rotation.x = -Math.PI / 2; scene.add(beam);

  // BILLBOARDS
  type Board = { group: THREE.Group; face: THREE.Mesh; faceMat: THREE.MeshBasicMaterial; halo: THREE.Mesh; cones: THREE.Mesh[]; lit: number; flick: number; side: number };
  const frameMat = keep(new THREE.MeshStandardMaterial({ color: 0x1d1d22, roughness: 0.35, metalness: 0.85 }));
  const legGeo = keep(new THREE.BoxGeometry(0.22, BOARD_UP + BOARD_H / 2, 0.22));
  const frameGeo = keep(new THREE.BoxGeometry(BOARD_W + 0.36, BOARD_H + 0.36, 0.3));
  const faceGeo = keep(new THREE.PlaneGeometry(BOARD_W, BOARD_H));
  const haloGeo = keep(new THREE.PlaneGeometry(BOARD_W * 2.1, BOARD_H * 2.3));
  const coneGeo = keep(new THREE.PlaneGeometry(2.8, 4.2));
  const coneTex = keep(beamTexture());
  const boards: Board[] = items.map((it, i) => {
    const side = i % 2 ? 1 : -1;
    const group = new THREE.Group();
    const faceMat = keep(new THREE.MeshBasicMaterial({ color: 0x555555, toneMapped: false }));
    const face = new THREE.Mesh(faceGeo, faceMat); face.position.set(0, BOARD_UP + BOARD_H / 2, 0.16); face.userData.i = i;
    const frame = new THREE.Mesh(frameGeo, frameMat); frame.position.set(0, BOARD_UP + BOARD_H / 2, 0);
    const halo = new THREE.Mesh(haloGeo, additive(glow, 0xdfe3ff, 0)); halo.position.set(0, BOARD_UP + BOARD_H / 2, -0.4);
    group.add(face, frame, halo);
    for (const lx of [-BOARD_W / 3, BOARD_W / 3]) {
      const leg = new THREE.Mesh(legGeo, frameMat); leg.position.set(lx, (BOARD_UP + BOARD_H / 2) / 2, -0.1); group.add(leg);
    }
    // two lamps on arms above the board, each throwing a cone of light down onto its face
    const cones: THREE.Mesh[] = [];
    for (const lx of [-BOARD_W / 4, BOARD_W / 4]) {
      const head = new THREE.Mesh(keep(new THREE.BoxGeometry(0.5, 0.16, 0.3)), frameMat); head.position.set(lx, BOARD_UP + BOARD_H + 0.75, 0.9); group.add(head);
      // the beam is brightest at the lamp: the texture is bright at its foot, so turn it upside down
      const cone = new THREE.Mesh(coneGeo, additive(coneTex, 0xfff1d6, 0)); cone.position.set(lx, BOARD_UP + BOARD_H - 1.2, 0.55); cone.rotation.set(-0.32, 0, Math.PI); group.add(cone); cones.push(cone);
    }
    group.position.set(side * boardX(), 0, boardZ(i));
    scene.add(group);
    return { group, face, faceMat, halo, cones, lit: 0, flick: 0, side };
  });
  // the posters are painted once the fonts and pictures are in
  document.fonts.ready.then(() => Promise.all(items.map((it) => loadImage(it.img)))).then((imgs) => {
    if (!alive) return;
    imgs.forEach((img, i) => { boards[i].faceMat.map = keep(posterTexture(items[i], i, n, img, aniso)); boards[i].faceMat.needsUpdate = true; });
    kick();
  });
  const aimBoards = () => boards.forEach((b, i) => {
    b.group.position.x = b.side * boardX();
    // each board turns to face the spot where the car stops for it
    b.group.rotation.y = Math.atan2(0 - b.group.position.x, stopZ(i) - boardZ(i));
  });

  // DRIVING: progress → where the car is. Stops at each board; between them it speeds up, then eases off again.
  const LEAD = 0.65;   // how much road (in boards) before the first stop and after the last
  const tAt = (p: number) => -LEAD + p * (n - 1 + LEAD * 2);
  const zAt = (t: number) => {
    const i = Math.floor(t), f = t - i;
    const slow = f - (Math.sin(f * Math.PI * 2) / (Math.PI * 2)) * 0.82;   // slows near each whole t, quickest between
    const za = stopZ(Math.max(0, Math.min(n - 1, i))), zb = stopZ(Math.max(0, Math.min(n - 1, i + 1)));
    if (t < 0) return stopZ(0) - t * GAP;                        // the run-up before the first board
    if (t >= n - 1) return stopZ(n - 1) - (t - (n - 1)) * GAP;   // and the road on after the last
    return mix(za, zb, slow);
  };
  let target = 0, shown = 0, last = 0, focus = -1, raf = 0, visible = false, alive = true, time = 0, prevZ = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = -1;

  // bloom: lamps, headlights and lit boards glow softly. Only on larger screens, where the GPU can spare it.
  let composer: EffectComposer | null = null, bloom: UnrealBloomPass | null = null;
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 700 ? 1.5 : 1.5));
    renderer.setSize(w, h, false);
    if (w >= 700 && !composer) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.85, 0.55, 0.82);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    camera.aspect = w / h; camera.fov = narrow() ? 68 : 55; camera.updateProjectionMatrix();
    aimBoards(); kick();
  };

  const frame = (now: number) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; time += dt;
    shown += (target - shown) * (1 - Math.pow(0.0009, dt));   // eased toward the scroll, frame-rate independent
    if (Math.abs(target - shown) < 1e-5) shown = target;
    const t = tAt(shown), z = zAt(t);
    const speed = Math.abs(z - prevZ) / Math.max(dt, 1e-3); prevZ = z;
    pointer.x += (pointer.tx - pointer.x) * 0.06; pointer.y += (pointer.ty - pointer.y) * 0.06;

    // the car: gentle sway, a lean into speed, and a glance toward the board it is reaching
    const near = Math.max(0, Math.min(n - 1, Math.round(t)));
    const reach = clamp(1 - Math.abs(t - near) * 1.6);
    // the angle that would face the board square on; on a phone the head turns all the way so it fills the screen,
    // on a wide screen only partly, keeping the road in view beside it
    const bx = boards[near] ? boards[near].group.position.x : 0;
    const face = Math.atan2(-bx, stopBack()), lift = Math.atan2(BOARD_UP + BOARD_H / 2 - 1.5, Math.hypot(bx, stopBack()));
    const glance = face * reach * (narrow() ? 0.95 : 0.5), look = lift * reach * (narrow() ? 0.9 : 0.35);
    camera.position.set(Math.sin(time * 0.6) * 0.12 + pointer.x * 0.5, 1.5 + Math.sin(time * 1.7) * 0.015 + pointer.y * 0.25, z);
    camera.rotation.set(-0.02 + look + pointer.y * 0.04, glance - pointer.x * 0.08, Math.sin(time * 0.6) * 0.004 - clamp(speed / 120, 0, 0.6) * 0.01);
    const fovBase = narrow() ? 68 : 55;
    camera.fov = mix(camera.fov, fovBase + clamp(speed / 30, 0, 1) * 6, 0.08); camera.updateProjectionMatrix();
    beam.position.set(camera.position.x, 0.02, z - 18);
    sky.position.set(0, 0, z);

    // the boards: the one being reached lights up (with a short neon flicker as it comes on); the rest stay dim
    boards.forEach((b, i) => {
      const want = i === near ? reach : 0;
      if (want > 0.5 && b.lit <= 0.5) b.flick = 0.42;
      b.lit += (want - b.lit) * 0.12;
      b.flick = Math.max(0, b.flick - dt);
      const flicker = b.flick > 0 ? (Math.sin(time * 90) > 0.2 ? 1 : 0.35) : 1;
      const k = Math.min(0.97, (0.3 + 0.67 * b.lit) * flicker * (hover === i ? 1.06 : 1));
      b.faceMat.color.setRGB(k, k * (0.97 + 0.03 * (1 - b.lit)), k * (0.9 + 0.1 * (1 - b.lit)));
      (b.halo.material as THREE.MeshBasicMaterial).opacity = 0.32 * b.lit * flicker;
      b.cones.forEach((c) => ((c.material as THREE.MeshBasicMaterial).opacity = 0.42 * b.lit * flicker));
    });
    if (near !== focus && reach > 0.5) { focus = near; hooks.onFocus?.(focus); }

    // traffic keeps moving whatever the reader does; cars that pass the camera go round again far ahead
    oncoming.forEach((c) => { c.z += c.v * dt; if (c.z > z + 6) c.z = z - rnd(180, 300); c.mesh.position.z = c.z; });
    ahead.forEach((c) => { c.z -= c.v * dt; if (c.z > z - 8) c.z = z - rnd(60, 220); if (c.z < z - 320) c.z = z - rnd(30, 80); c.mesh.position.z = c.z; });
    lampGlows.forEach((g) => g.lookAt(camera.position));

    if (composer) composer.render(); else renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };

  // pointer: look around a little, hover and click the boards
  const toNdc = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  const pick = () => { ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(boards.map((b) => b.face), false)[0]; return hit ? (hit.object.userData.i as number) : -1; };
  const onMove = (e: PointerEvent) => {
    toNdc(e);
    if (e.pointerType === 'mouse') { pointer.tx = ndc.x; pointer.ty = ndc.y; }
    hover = pick(); canvas.style.cursor = hover >= 0 ? 'pointer' : '';
  };
  const onClick = (e: MouseEvent) => {
    toNdc(e as PointerEvent);
    const i = pick();
    if (i >= 0) hooks.onOpen?.(i, rectOf(i));
  };
  const onLeave = () => { pointer.tx = 0; pointer.ty = 0; hover = -1; canvas.style.cursor = ''; };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('pointerleave', onLeave);

  /** The board's face on screen, so the project card can grow out of it. */
  const rectOf = (i: number) => {
    const b = boards[i], r = canvas.getBoundingClientRect();
    b.face.updateWorldMatrix(true, false);
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) =>
      new THREE.Vector3(sx * BOARD_W / 2, sy * BOARD_H / 2, 0).applyMatrix4(b.face.matrixWorld).project(camera));
    const xs = pts.map((p) => r.left + (p.x + 1) / 2 * r.width), ys = pts.map((p) => r.top + (1 - p.y) / 2 * r.height);
    return new DOMRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  };

  const ro = new ResizeObserver(resize); ro.observe(stage);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { last = 0; kick(); } });
  io.observe(stage);
  resize();
  shown = target; prevZ = zAt(tAt(shown));

  return {
    /** 0 → 1 along the drive. */
    setProgress(p: number) { target = clamp(p); kick(); },
    /** The progress at which the car stops at board i. */
    progressOf(i: number) { return (i + LEAD) / (n - 1 + LEAD * 2); },
    rectOf,
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('click', onClick); canvas.removeEventListener('pointerleave', onLeave);
      disposables.forEach((d) => d.dispose()); boards.forEach((b) => b.faceMat.map?.dispose()); composer?.dispose(); bloom?.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
