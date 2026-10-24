// A night road in the site's two colours, drawn in perspective on a 2D canvas: red taillights pulling away ahead,
// white headlights coming the other way, lane dashes and lamp posts rushing past on a gently winding road.
// Press and hold to speed up. In Calm mode one still frame is drawn.
import { fit, loop, approach } from './gl';
import { onTheme, palettes, type Theme } from '../lib/theme';
import { calm } from '../lib/motion';

type Light = { lane: number; z: number; v: number; len: number; tone: number };

export function mountRoad(canvas: HTMLCanvasElement) {
  const g = canvas.getContext('2d')!;
  const still = calm();
  let t: Theme = 'dark';

  const FAR = 260, LANES = 3, LANE_W = 3.4;
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const tails: Light[] = Array.from({ length: 34 }, () => ({ lane: (Math.random() * LANES) | 0, z: rnd(10, FAR), v: rnd(6, 14), len: rnd(5, 12), tone: Math.random() }));
  const heads: Light[] = Array.from({ length: 22 }, () => ({ lane: (Math.random() * LANES) | 0, z: rnd(5, FAR), v: rnd(28, 44), len: rnd(6, 14), tone: Math.random() }));
  const dust = Array.from({ length: 60 }, () => ({ x: rnd(-30, 30), y: rnd(0.2, 8), z: rnd(2, FAR) }));
  let speed = 1, boost = 0, travel = 0, time = 0;
  canvas.addEventListener('pointerdown', () => (boost = 1));
  addEventListener('pointerup', () => (boost = 0));
  canvas.addEventListener('pointerleave', () => (boost = 0));

  function draw(dt: number) {
    const { dpr } = fit(canvas, 1.75);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const c = palettes[t];
    const light = t === 'light';
    time += dt;
    speed = approach(speed, 1 + boost * 2.6, dt, 0.5);
    travel += dt * 22 * speed;
    const horizon = H * 0.42, f = H * 0.9, camH = 1.6;
    // the road bends: the centre line's x offset grows with distance
    const bend = (z: number) => Math.sin(time * 0.18 + z * 0.012) * z * z * 0.00022;
    const P = (x: number, y: number, z: number) => [W / 2 + ((x - bend(z)) / z) * f, horizon + ((camH - y) / z) * f] as const;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = c.paper; g.fillRect(0, 0, W, H);
    // a faint glow at the horizon
    const sky = g.createRadialGradient(W / 2, horizon, 0, W / 2, horizon, W * 0.6);
    sky.addColorStop(0, light ? 'rgba(200,30,23,.10)' : 'rgba(255,59,48,.16)'); sky.addColorStop(1, 'transparent');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    // road surface: slices from far to near
    const half = (LANES * LANE_W) / 2;
    for (let z = FAR; z > 1.5; z *= 0.94) {
      const z2 = z * 0.94;
      const [a1, y1] = P(-half - 6, 0, z), [b1] = P(half + 6, 0, z);
      const [a2, y2] = P(-half - 6, 0, z2), [b2] = P(half + 6, 0, z2);
      g.fillStyle = light ? '#E6E6E2' : '#0A0A0A';
      g.beginPath(); g.moveTo(a1, y1); g.lineTo(b1, y1); g.lineTo(b2, y2); g.lineTo(a2, y2); g.fill();
    }
    // lane dashes, moving toward the viewer
    g.strokeStyle = light ? '#C9C9C4' : '#2A2A2A';
    for (let l = 0; l <= LANES; l++) {
      const x = -half + l * LANE_W;
      const solid = l === 0 || l === LANES;
      for (let z = 3 + ((-travel) % 6 + 6) % 6; z < FAR; z += solid ? 1.5 : 6) {
        const [xa, ya] = P(x, 0, z), [xb, yb] = P(x, 0, z + (solid ? 1.5 : 3));
        g.lineWidth = Math.min(5, Math.max(0.5, (0.12 / z) * f));
        g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke();
      }
    }
    // lamp posts on both verges
    for (let z = ((-travel * 0.5) % 18 + 18) % 18 + 4; z < FAR; z += 18) {
      for (const side of [-1, 1]) {
        const [xa, ya] = P(side * (half + 4), 0, z), [xb, yb] = P(side * (half + 4), 6, z);
        g.strokeStyle = c.graphite; g.globalAlpha = Math.min(1, 40 / z) * 0.7;
        g.lineWidth = Math.min(5, Math.max(0.5, (0.18 / z) * f));
        g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke();
      }
    }
    g.globalAlpha = 1;

    // the traffic: streaks, brighter and thicker as they come close
    g.globalCompositeOperation = light ? 'source-over' : 'lighter';
    g.lineCap = 'round';
    const streak = (l: Light, color: string, side: number) => {
      // oncoming traffic keeps to the left lane, ours fills the two on the right
      const x = side < 0 ? -half + LANE_W / 2 : -half + LANE_W * (1 + (l.lane % 2)) + LANE_W / 2;
      for (const off of [-0.55, 0.55]) {
        const [xa, ya] = P(x + off, 0.7, l.z), [xb, yb] = P(x + off, 0.7, l.z + l.len * (0.6 + speed * 0.4));
        g.strokeStyle = color; g.globalAlpha = Math.min(1, 70 / l.z);
        g.lineWidth = Math.min(7, Math.max(0.6, (0.32 / l.z) * f));
        g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke();
      }
    };
    tails.forEach((l) => {
      l.z += (l.v - 10) * dt * speed * 0.6 + dt * 4;
      if (l.z > FAR) l.z = rnd(10, 16); if (l.z < 10) l.z = FAR;
      streak(l, l.tone > 0.7 ? '#ff6a5f' : l.tone > 0.35 ? c.accent : '#a3150f', 1);
    });
    heads.forEach((l) => {
      l.z -= l.v * dt * speed;
      if (l.z < 5) l.z = FAR;
      streak(l, light ? (l.tone > 0.5 ? '#2a2a2a' : '#555') : (l.tone > 0.5 ? '#ffffff' : '#d9d9d6'), -1);
    });
    // dust in the beams
    g.globalAlpha = 0.5; g.fillStyle = light ? c.graphite : c.ink;
    dust.forEach((d) => {
      d.z -= dt * 20 * speed; if (d.z < 2) d.z = FAR;
      const [x, y] = P(d.x, d.y, d.z);
      const s = Math.max(0.4, (0.05 / d.z) * f);
      g.fillRect(x, y, s, s);
    });
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  onTheme((x) => { t = x; if (still) draw(0); });
  if (still) { draw(0); new ResizeObserver(() => draw(0)).observe(canvas); }
  else loop(canvas, draw);
}
