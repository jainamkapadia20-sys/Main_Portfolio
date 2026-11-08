// Live traffic over the rendered city. The frames (citydrive.ts) show the street without cars; these are the same cars
// (CC BY, credited on /credits), driven by the clock rather than the scroll and drawn through the frame's own camera,
// so the city keeps moving wherever the scroll stops. Lanes, speeds and spacing are the render's (city/drive.py,
// exported with the cars by city/webcars.py). Night: the lit street as the cars' surroundings, the nearest street lamps
// as lights, glowing lamps with their reflections on the wet road and their beams on it; day: the sun and its shadows.
// Cars far off are a light copy of themselves; everything fades into the render's haze.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type CarFacts = { length: number; head: string[]; tail: string[]; lamps: number[][]; rear: number[][] };
type Lane = { x: number; dir: number; v: number; slots: [string, number][] };
type SceneFacts = { cars: Record<string, CarFacts>; lamps: number[][]; sun: number[]; mist: Record<'Night' | 'Day', { start: number; depth: number }>; period: number; lanes: Lane[] };
/** The camera of the picture on screen: Blender metres and radians; fov is vertical, in degrees, over the frame's
 *  height, which is drawn `scale` css px per frame px. */
export type View = { x: number; y: number; z: number; yaw: number; pitch: number; fov: number; scale: number; frameH: number };
type Theme = 'night' | 'day';

// as render.py grades each theme: exposure (stops), the haze's colour and strength
const LOOK = {
  night: { exposure: 0.7, mist: new THREE.Color(0.020, 0.024, 0.034), mistK: 0.72 },
  day: { exposure: -0.35, mist: new THREE.Color(0.80, 0.81, 0.82), mistK: 0.8 },
};
const BEHIND = 40, AHEAD = 450;             // metres of road with traffic, behind and ahead of the camera
const coarse = matchMedia('(pointer: coarse)').matches;
const NEAR = coarse ? 45 : 60;              // closer than this, a car is drawn in full
const MAX_NEAR = 10, MAX_FAR = 40;          // instances per model
const MAX_LAMPS = 6;                        // street lamps lighting the cars at night
// Blender (x across, y along the road, z up) to three (x, y up, z toward the viewer)
const B = (out: THREE.Vector3, x: number, y: number, z: number) => out.set(x, z, -y);

const mistUniform = { value: 0 };
/** The render's haze, applied where Blender applies it: in the scene's light, before the view transform. */
function hazed<T extends THREE.Material>(m: T) {
  m.onBeforeCompile = (s) => {
    s.uniforms.mistK = mistUniform;
    s.fragmentShader = s.fragmentShader
      .replace('#include <fog_fragment>', '')
      .replace('#include <tonemapping_fragment>', `#ifdef USE_FOG
        float mistT = clamp((vFogDepth - fogNear) / (fogFar - fogNear), 0.0, 1.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, mistT * mistT * mistK);
      #endif
      #include <tonemapping_fragment>`)
      .replace('void main() {', 'uniform float mistK;\nvoid main() {');
  };
  m.customProgramCacheKey = () => 'hazed';
  return m;
}

/** One car model drawn many times: its full version as it came (each part with its own material and maps, one
 *  instanced draw per part, the lamps' materials lit), and a light far version in one draw. */
type Model = { key: string; facts: CarFacts; near: THREE.InstancedMesh[]; far: THREE.InstancedMesh; head: THREE.MeshStandardMaterial[]; tail: THREE.MeshStandardMaterial[]; nNear: number; nFar: number };

function instanced(g: THREE.BufferGeometry, m: THREE.Material, max: number) {
  const im = new THREE.InstancedMesh(g, m, max);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.count = 0; im.visible = false;
  return im;
}

function buildModel(key: string, facts: CarFacts, near: THREE.Object3D, far: THREE.Object3D): Model {
  const match = (m: THREE.Material, names: string[]) => names.some((n) => m.name.toLowerCase().includes(n.toLowerCase()));
  const head: THREE.MeshStandardMaterial[] = [], tail: THREE.MeshStandardMaterial[] = [];
  const lit = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  const nearMeshes: THREE.InstancedMesh[] = [];
  near.updateMatrixWorld(true);
  near.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    let m = mesh.material as THREE.MeshStandardMaterial;
    if (m.transparent && m.opacity > 0.99) m.transparent = false;   // marked see-through but fully opaque: solid
    // the lamps: their own material, made to glow (how much is set by day and night)
    const role = match(m, facts.head) ? 'head' : match(m, facts.tail) ? 'tail' : '';
    if (role) {
      if (!lit.has(m)) {
        const l = m.clone(); l.emissive.set(role === 'head' ? 0xfff2e2 : 0xff1a0c);
        (role === 'head' ? head : tail).push(l); lit.set(m, l);
      }
      m = lit.get(m)!;
    }
    const im = instanced(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld), hazed(m), MAX_NEAR);
    im.castShadow = !m.transparent;
    nearMeshes.push(im);
  });
  // the far copy: its parts in one draw, their colours on its vertices
  const fg: THREE.BufferGeometry[] = [];
  far.updateMatrixWorld(true);
  far.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) fg.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)); });
  const ready = fg.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(a)) n.deleteAttribute(a); return n; });
  const farMesh = instanced(mergeGeometries(ready, false)!, hazed(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.2 })), MAX_FAR);
  return { key, facts, near: nearMeshes, far: farMesh, head, tail, nNear: 0, nFar: 0 };
}

/** Soft lights that always face the camera (lamps' glow, their reflections on the wet road), added onto the picture. */
function glowLayer(max: number) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const at = (n: string, size: number) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * size), size); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(n, a); return a; };
  const pos = at('offset', 3), size = at('size', 2), tint = at('tint', 3);
  const mat = new THREE.ShaderMaterial({
    uniforms: { mistNear: { value: 40 }, mistFar: { value: 690 }, mistK: mistUniform },
    vertexShader: `attribute vec3 offset; attribute vec2 size; attribute vec3 tint;
      uniform float mistNear, mistFar, mistK; varying vec2 vUv; varying vec3 vTint;
      void main() {
        vec4 mv = viewMatrix * vec4(offset, 1.0);
        mv.xyz *= 1.0 - 0.5 / max(1.0, length(mv.xyz));   // half a metre toward the camera, clear of its own car's body
        float t = clamp((-mv.z - mistNear) / (mistFar - mistNear), 0.0, 1.0);
        vTint = tint * (1.0 - t * t * mistK);
        mv.xy += position.xy * size;
        vUv = position.xy + 0.5;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vTint;
      void main() {
        vec2 d = (vUv - 0.5) * 2.0; float r = dot(d, d);
        float a = exp(-r * 5.0) + 0.35 * exp(-r * 1.4);
        gl_FragColor = vec4(vTint * a * (1.0 - smoothstep(0.85, 1.0, r)), 0.0);
      }`,
    transparent: true, depthWrite: false,   // depth-tested: a car in front hides another's glow
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 10;
  let n = 0;
  return {
    mesh, mat,
    reset() { n = 0; },
    push(p: THREE.Vector3, w: number, h: number, r: number, g: number, b: number) {
      if (n >= max) return;
      pos.setXYZ(n, p.x, p.y, p.z); size.setXY(n, w, h); tint.setXYZ(n, r, g, b); n++;
    },
    commit() { geo.instanceCount = n; pos.needsUpdate = size.needsUpdate = tint.needsUpdate = true; },
  };
}

/** Flat marks on the road under and in front of the cars: a soft contact shadow, and at night the headlights' beam. */
function groundLayer(max: number, kind: 'shadow' | 'beam') {
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { strength: { value: kind === 'beam' ? 0.3 : 1 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: kind === 'shadow'
      ? `uniform float strength; varying vec2 vUv; void main() { vec2 d = (vUv - 0.5) * 2.0; float a = (1.0 - smoothstep(0.35, 1.0, length(d * vec2(1.0, 1.05)))) * strength; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }`
      : `uniform float strength; varying vec2 vUv; void main() { float v = vUv.y; float w = abs(vUv.x - 0.5) * 2.0;
          float a = smoothstep(0.0, 0.12, v) * (1.0 - v) * (1.0 - smoothstep(0.25 + 0.75 * v, 0.3 + 0.8 * v, w)) * strength;
          gl_FragColor = vec4(vec3(1.0, 0.93, 0.82) * a, 0.0); }`,
    transparent: true, depthWrite: false,   // depth-tested: the cars stand over these marks, never under them
    ...(kind === 'beam'
      ? { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }
      : {}),
  });
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; mesh.renderOrder = kind === 'shadow' ? -1 : 5;
  return mesh;
}

export function mountTraffic(host: HTMLElement, opt: { base: string; version: string; onReady?: () => void }) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  } catch { return null; }   // no WebGL: the city without its traffic
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.shadowMap.enabled = !coarse;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'drive-traffic'; canvas.setAttribute('aria-hidden', 'true');
  host.after(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 1500);
  camera.rotation.order = 'YXZ';
  const sun = new THREE.DirectionalLight(0xfff5e6, 3.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.42, depthWrite: false }));
  catcher.receiveShadow = true; catcher.renderOrder = -2; scene.add(catcher);
  const lamps = Array.from({ length: MAX_LAMPS }, () => { const l = new THREE.PointLight(0xffdcae, 0, 38, 2); scene.add(l); return l; });
  const glow = glowLayer(1400);
  const shadows = groundLayer(200, 'shadow');
  const beams = groundLayer(200, 'beam');
  scene.add(glow.mesh, shadows, beams);

  let facts: SceneFacts | null = null, models: Model[] = [], byKey = new Map<string, Model>(), theme: Theme = 'night', ready = false, alive = true;
  const env: Partial<Record<Theme, THREE.Texture>> = {};
  const pmrem = new THREE.PMREMGenerator(renderer);
  const v = `?v=${opt.version}`;
  const hdr = new HDRLoader();
  const loadEnv = (t: Theme) => env[t]
    ? Promise.resolve(env[t]!)
    : hdr.loadAsync(`${opt.base}env-${t}.hdr${v}`).then((tex) => { const e = pmrem.fromEquirectangular(tex).texture; tex.dispose(); env[t] = e; return e; });

  const applyTheme = () => {
    const L = LOOK[theme], night = theme === 'night';
    renderer.toneMappingExposure = 2 ** L.exposure;
    mistUniform.value = L.mistK;
    if (facts) {
      const m = facts.mist[night ? 'Night' : 'Day'];
      scene.fog = new THREE.Fog(L.mist, m.start, m.start + m.depth);
      glow.mat.uniforms.mistNear.value = m.start; glow.mat.uniforms.mistFar.value = m.start + m.depth;
    }
    sun.visible = !night; catcher.visible = !night && renderer.shadowMap.enabled;
    lamps.forEach((l) => (l.visible = night));
    beams.visible = night;
    (shadows.material as THREE.ShaderMaterial).uniforms.strength.value = night ? 0.7 : 0.45;
    for (const md of models) {
      for (const m of md.head) m.emissiveIntensity = night ? 14 : 0.4;
      for (const m of md.tail) m.emissiveIntensity = night ? 6 : 0.4;
    }
    scene.environmentIntensity = night ? 0.3 : 1.25;   // at night the street's light reaches the cars dimly
    loadEnv(theme).then((e) => { if (alive && theme === (night ? 'night' : 'day')) scene.environment = e; }).catch(() => {});
  };

  // everything the traffic needs, after the frames have had their start
  const gltf = new GLTFLoader();
  const draco = new DRACOLoader(); draco.setDecoderPath(opt.base.replace(/drive\/$/, 'draco/'));
  gltf.setDRACOLoader(draco);
  fetch(`${opt.base}scene.json${v}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then(async (f: SceneFacts) => {
    facts = f;
    const s = new THREE.Vector3(f.sun[0], f.sun[2], -f.sun[1]).normalize();   // the way the light travels
    sun.userData.dir = s;
    const keys = Object.keys(f.cars);
    // a car that fails to load is left out; the rest still drive
    // computers get the cars in full; phones a lighter copy (fewer triangles, colour maps only)
    const loaded = await Promise.all(keys.map((k) => Promise.all([gltf.loadAsync(`${opt.base}cars/${k}${coarse ? '-lite' : ''}.glb${v}`), gltf.loadAsync(`${opt.base}cars/${k}-far.glb${v}`)])
      .then(([n, fr]) => buildModel(k, f.cars[k], n.scene, fr.scene)).catch((e) => { console.warn(`City drive: no ${k}`, e); return null; })));
    if (!alive) return;
    models = loaded.filter((md): md is Model => !!md);
    byKey = new Map(models.map((md) => [md.key, md]));
    // textures stay sharp seen at a slant (a car's flank, its wheels)
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    for (const md of models) for (const im of md.near) for (const t of Object.values(im.material as THREE.MeshStandardMaterial)) if ((t as THREE.Texture)?.isTexture) (t as THREE.Texture).anisotropy = aniso;
    if (!models.length) throw new Error('no cars');
    for (const md of models) scene.add(...md.near, md.far);
    applyTheme();
    ready = true; opt.onReady?.();
  }).catch((e) => console.warn('City drive: no live traffic', e));   // the city still shows

  let w = 1, h = 1;
  const t0 = performance.now();
  // scratch values, reused every frame (no garbage while the traffic runs)
  const straight = new THREE.Quaternion(), turned = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const one = new THREE.Vector3(1, 1, 1), m4 = new THREE.Matrix4(), mx = new THREE.Matrix4(), p = new THREE.Vector3(), at = new THREE.Vector3();
  const sc = new THREE.Vector3(), c = new THREE.Vector3();
  const frustum = new THREE.Frustum(), sphere = new THREE.Sphere(new THREE.Vector3(), 3.2);

  return {
    canvas,
    get ready() { return ready; },
    setTheme(t: Theme) { if (t !== theme) { theme = t; applyTheme(); } },
    setSize(cssW: number, cssH: number, dpr: number) {
      w = cssW; h = cssH;
      renderer.setPixelRatio(Math.min(dpr, coarse ? 1.5 : 2));
      renderer.setSize(cssW, cssH, false);
    },
    /** Draws the traffic as it is now, seen from `view`. */
    render(view: View, now = performance.now()) {
      if (!ready || !facts) return;
      // the camera: the frame's, with the canvas's own share of the frame's field of view
      B(camera.position, view.x, view.y, view.z);
      camera.rotation.set(view.pitch, -view.yaw, 0);
      const half = Math.tan((view.fov * Math.PI) / 360) * h / (view.scale * view.frameH);
      camera.fov = (2 * Math.atan(half) * 180) / Math.PI; camera.aspect = w / h;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

      const night = theme === 'night', ts = (now - t0) / 1000;
      for (const md of models) { md.nNear = 0; md.nFar = 0; }
      glow.reset(); let ns = 0, nb = 0;
      for (const lane of facts.lanes) {
        const P = lane.v * facts.period;
        for (const [key, off] of lane.slots) {
          const md = byKey.get(key);
          if (!md) continue;
          const base = off + lane.dir * lane.v * ts;
          for (let k = Math.ceil((view.y - BEHIND - base) / P); base + k * P <= view.y + AHEAD; k++) {
            const y = base + k * P;
            B(at, lane.x, y, 0);
            sphere.center.copy(at).setY(0.7);
            if (!frustum.intersectsSphere(sphere)) continue;
            const d = at.distanceTo(camera.position);
            const q = lane.dir < 0 ? turned : straight;
            m4.compose(at, q, one);
            if (d < NEAR && md.nNear < MAX_NEAR) { for (const im of md.near) im.setMatrixAt(md.nNear, m4); md.nNear++; }
            else if (md.nFar < MAX_FAR) { md.far.setMatrixAt(md.nFar, m4); md.nFar++; }
            else continue;
            // a soft shadow under it
            if (ns < 200) shadows.setMatrixAt(ns++, mx.compose(at, q, sc.set(2.3, 1, md.facts.length + 0.5)));
            if (!night) continue;
            // its lamps: a glow, a streak on the wet road beneath, and the headlights' beam ahead. Headlights glow
            // toward the camera only when the car comes at it, tail lights when it drives away; close up, a glow
            // shrinks (a lamp's halo doesn't grow past the car)
            const s = lane.dir, ahead = (s * (view.y - y)) / Math.max(1, Math.hypot(view.x - lane.x, view.y - y));
            const near = Math.min(1, Math.max(0.3, d / 30));
            const fh = Math.min(1, Math.max(0, ahead / 0.6)), ft = Math.min(1, Math.max(0, -ahead / 0.6));
            if (fh > 0) for (const [lx, ly, lz] of md.facts.lamps) {
              glow.push(B(p, lane.x + s * lx, y + s * ly, lz), 1.0 * near, 1.0 * near, 1.2 * fh, 1.1 * fh, 0.95 * fh);
              if (d > 25) glow.push(p.setY(-lz * 0.7), 0.3, 1.2, 0.1 * fh, 0.09 * fh, 0.075 * fh);   // a faint reflection on the wet road
            }
            if (ft > 0) for (const [lx, ly, lz] of md.facts.rear) {
              glow.push(B(p, lane.x + s * lx, y + s * ly, lz), 1.35 * near, 1.35 * near, 1.5 * ft, 0.1 * ft, 0.05 * ft);
            }
            if (nb < 200 && d < 90) beams.setMatrixAt(nb++, mx.compose(B(p, lane.x, y + s * (md.facts.length / 2 + 9), 0.02), q, sc.set(5.5, 1, 18)));
          }
        }
      }
      for (const md of models) {
        for (const im of md.near) { im.count = md.nNear; im.visible = md.nNear > 0; im.instanceMatrix.needsUpdate = true; }
        md.far.count = md.nFar; md.far.visible = md.nFar > 0; md.far.instanceMatrix.needsUpdate = true;
      }
      shadows.count = ns; shadows.instanceMatrix.needsUpdate = true;
      beams.count = nb; beams.instanceMatrix.needsUpdate = true;
      glow.commit();
      if (night) {
        // the street lamps nearest ahead light the cars as they pass under them
        let i = 0;
        for (const [lx, ly, lz] of facts.lamps) {
          if (ly < view.y - 12 || i >= MAX_LAMPS) continue;
          B(lamps[i].position, lx, ly, lz); lamps[i].intensity = 600; i++;
        }
        for (; i < MAX_LAMPS; i++) lamps[i].intensity = 0;
      } else {
        // the sun's shadows, in a box that follows the camera's view of the road
        B(c, view.x, view.y + 30, 0);
        const dir = sun.userData.dir as THREE.Vector3;
        sun.position.copy(c).addScaledVector(dir, -120); sun.target.position.copy(c);
        catcher.position.set(c.x, 0.01, c.z);
      }
      renderer.render(scene, camera);
    },
    dispose() {
      alive = false;
      renderer.dispose(); pmrem.dispose(); draco.dispose();
      Object.values(env).forEach((e) => e?.dispose());
      canvas.remove();
    },
  };
}
