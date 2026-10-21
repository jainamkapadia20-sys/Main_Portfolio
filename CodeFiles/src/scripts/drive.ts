// One animation-frame loop shared by everything that reacts to scrolling: a smoothed speed (0..1, rises fast and
// settles slowly, like a needle), the scroll position and the page progress. Works with Lenis or native scroll.
export type Drive = { speed: number; y: number; progress: number };
const subs = new Set<(d: Drive) => void>();
export const state: Drive = { speed: 0, y: scrollY, progress: 0 };   // latest values, for loops that run on their own
const root = document.documentElement;
let last = scrollY, speed = 0, idle = 0;
function frame() {
  const y = scrollY, max = root.scrollHeight - innerHeight;
  const v = Math.min(1, Math.abs(y - last) / 70); last = y;
  speed += (v - speed) * (v > speed ? 0.3 : 0.05);
  if (speed < 0.001) speed = 0;
  // skip work while nothing changes, but keep looping so the next scroll is picked up on its first frame
  idle = v === 0 && speed === 0 ? idle + 1 : 0;
  state.speed = speed; state.y = y; state.progress = max > 0 ? Math.min(1, y / max) : 0;
  if (idle < 3) subs.forEach((f) => f(state));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
export const onDrive = (f: (d: Drive) => void) => { subs.add(f); f({ speed, y: scrollY, progress: 0 }); };
