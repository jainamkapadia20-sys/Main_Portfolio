// The 3D car on a full-screen turntable, in plain three.js: drag to turn, pinch (or Ctrl/⌘ + scroll) to zoom,
// double-click to reset.
// The studio light comes from three's RoomEnvironment (no HDR download), a soft shadow sits under the wheels, and
// each model rises into place when it loads. Two builds of the model share the stage.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { calm } from '../lib/motion';

export function mountCar(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-model]')];
  const status = root.querySelector<HTMLElement>('[data-status]');
  const still = calm();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 6;
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.autoRotate = !still;
  controls.autoRotateSpeed = 0.35 * 2;
  controls.maxPolarAngle = Math.PI * 0.49;

  const draco = new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL.replace(/\/?$/, '/') + 'draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const cache = new Map<string, THREE.Object3D>();
  let model: THREE.Object3D | null = null, rise = 1, radius = 2, baseY = 0, home = { dist: 5, target: new THREE.Vector3() };

  function frame(obj: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    obj.position.sub(new THREE.Vector3(centre.x, box.min.y, centre.z));
    baseY = obj.position.y;
    radius = size.length() / 2;
    home.target.set(0, size.y * 0.42, 0);
    fitDistance();
    reset();
  }
  // far enough that the car fits the narrower of the two fields of view (portrait phones need the horizontal one)
  function fitDistance() {
    const v = THREE.MathUtils.degToRad(camera.fov);
    const h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    home.dist = (radius / Math.sin(Math.min(v, h) / 2)) * (camera.aspect < 1 ? 1.02 : 0.86);
    controls.minDistance = home.dist / 1.8;
    controls.maxDistance = home.dist / 0.8;
  }
  function reset() {
    const a = THREE.MathUtils.degToRad(-35), tilt = THREE.MathUtils.degToRad(8);
    camera.position.set(Math.sin(a) * Math.cos(tilt), Math.sin(tilt) + 0.08, Math.cos(a) * Math.cos(tilt)).multiplyScalar(home.dist).add(home.target);
    controls.target.copy(home.target);
    controls.update();
  }

  async function show(url: string) {
    status && (status.textContent = 'Loading the model');
    root.classList.add('is-loading');
    let obj = cache.get(url);
    if (!obj) {
      const gltf = await loader.loadAsync(url);
      obj = gltf.scene;
      obj.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      cache.set(url, obj);
    }
    if (model) scene.remove(model);
    model = obj;
    model.position.set(0, 0, 0);
    scene.add(model);
    frame(model);
    rise = still ? 1 : 0;
    root.classList.remove('is-loading');
    status && (status.textContent = '');
  }

  buttons.forEach((b) => b.addEventListener('click', () => {
    if (b.getAttribute('aria-pressed') === 'true') return;
    buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    show(b.dataset.model!).catch(() => status && (status.textContent = 'The model could not load.'));
  }));
  canvas.addEventListener('dblclick', reset);
  // the stage is a full screen, so a plain wheel keeps scrolling the page; pinch (or Ctrl/⌘ + wheel) zooms
  canvas.addEventListener('wheel', (e) => (controls.enableZoom = e.ctrlKey || e.metaKey), { capture: true, passive: true });
  controls.addEventListener('start', () => (controls.autoRotate = false));

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (model) { const was = camera.position.distanceTo(controls.target) / home.dist; fitDistance(); camera.position.sub(controls.target).setLength(home.dist * was).add(controls.target); }
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // render only while on screen
  let raf = 0, visible = false, t = 0, last = 0;
  const tick = (now: number) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now; t += dt;
    if (model) {
      rise = Math.min(1, rise + dt / 1.2);
      const e = 1 - Math.pow(1 - rise, 3);
      model.position.y = baseY + (1 - e) * -0.6 + (still ? 0 : Math.sin(t * 1.2) * 0.015);
      model.rotation.y = (1 - e) * -0.6;
    }
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(canvas);

  const first = buttons.find((b) => b.getAttribute('aria-pressed') === 'true') ?? buttons[0];
  show(first.dataset.model!).catch(() => status && (status.textContent = 'The model could not load.'));
}
