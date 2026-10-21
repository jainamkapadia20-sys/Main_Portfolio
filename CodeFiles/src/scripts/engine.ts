// The hero engine: rev physics for the tachometer and a synthesised tuned, turbocharged 4-cylinder. Firing note
// with a half-order lope, a harder i-VTEC cam above 5,200 r/min, turbo whistle and spool air, a blow-off valve
// on lift-off, overrun pops and a bouncing rev limiter. No samples: everything is Web Audio, built on the first
// press (browsers only allow sound after a visitor's own gesture). Units are x1000 r/min.
export const IDLE = 0.85, VTEC = 5.2, LIMIT = 7.0;
export const engine = { rpm: IDLE, boost: 0, throttle: false, active: false, vtec: false, cut: 0 };

type Nodes = {
  master: GainNode; out: AudioNode; pre: GainNode; lp: BiquadFilterNode; o1: OscillatorNode; o2: OscillatorNode; o3: OscillatorNode; g3: GainNode;
  bp: BiquadFilterNode; rasp: GainNode; whistle: OscillatorNode; gWhistle: GainNode; gAir: GainNode;
};
let ctx: AudioContext | undefined, n: Nodes | undefined, noiseBuf: AudioBuffer | undefined;
let quietFor = 0, lastThrottle = false;
let muted = (() => { try { return localStorage.getItem('engine-sound') === 'off'; } catch { return false; } })();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('engine-sound', m ? 'off' : 'on'); } catch {}
  if (n && ctx) n.master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
}
function shaperCurve(k: number) {
  const c = new Float32Array(1024);
  for (let i = 0; i < c.length; i++) { const x = (i / 511.5) - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
  return c;
}

function build() {
  const c = (ctx = new AudioContext());
  const gain = (v: number) => { const g = c.createGain(); g.gain.value = v; return g; };
  const osc = (type: OscillatorType) => { const o = c.createOscillator(); o.type = type; return o; };
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5;
  const master = gain(0); master.connect(comp).connect(c.destination);

  // engine body: firing frequency (sawtooth), half-order lope (square), 2nd order (sawtooth, the cam's scream)
  const o1 = osc('sawtooth'), o2 = osc('square'), o3 = osc('sawtooth');
  const g1 = gain(0.5), g2 = gain(0.16), g3 = gain(0.05), pre = gain(1);
  const shaper = c.createWaveShaper(); shaper.curve = shaperCurve(9); shaper.oversample = '4x';
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 5;
  o1.connect(g1).connect(pre); o2.connect(g2).connect(pre); o3.connect(g3).connect(pre);
  pre.connect(shaper).connect(lp).connect(master);

  // intake and exhaust rasp: noise through a band-pass that tracks the revs
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
  const rasp = gain(0), n1 = noise(c); n1.connect(bp).connect(rasp).connect(master);

  // turbo: whistle that climbs with boost, plus spool air
  const whistle = osc('sine'); const gWhistle = gain(0); whistle.connect(gWhistle).connect(master);
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
  const gAir = gain(0), n2 = noise(c); n2.connect(hp).connect(gAir).connect(master);

  [o1, o2, o3, whistle, n1, n2].forEach((o) => o.start());
  n = { master, out: comp, pre, lp, o1, o2, o3, g3, bp, rasp, whistle, gWhistle, gAir };
}

// one-shot sounds
function burst(freqs: [number, number], dur: number, level: number, type: BiquadFilterType, q = 1.2) {
  if (!ctx || !n || muted) return;
  const t = ctx.currentTime, s = noise(ctx), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freqs[0], t); f.frequency.exponentialRampToValueAtTime(freqs[1], t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(n.out);
  s.start(t); s.stop(t + dur + 0.05);
}
const blowOff = (boost: number) => burst([4200, 900], 0.45, 0.18 * boost, 'bandpass', 0.9);
const pop = () => burst([1100, 300], 0.07 + Math.random() * 0.05, 0.25 + Math.random() * 0.2, 'lowpass', 2);

export function press(on: boolean) {
  engine.throttle = on;
  if (on) {
    engine.active = true; quietFor = 0;
    if (!ctx) { try { build(); } catch { /* no Web Audio: the needle still revs */ } }
    ctx?.resume();
  }
}

// physics + sound, called once per frame by the tachometer while the engine is active
export function step(dt: number) {
  const e = engine;
  if (e.cut > 0) e.cut -= dt;
  const on = e.throttle && e.cut <= 0;
  if (on) e.rpm += (7.6 - e.rpm * 0.55 + (e.rpm > VTEC ? 1.8 : 0)) * dt;            // free-revving pull, stronger on the VTEC cam
  else e.rpm -= (2.6 + e.rpm * 0.3) * dt;                                                // engine braking back to idle
  if (e.rpm >= LIMIT) { e.rpm = LIMIT - 0.28; e.cut = 0.075; pop(); }                     // limiter: fuel cut, bounce, crackle
  if (e.rpm < IDLE) e.rpm = IDLE + Math.sin(performance.now() / 70) * 0.012;
  e.vtec = e.rpm > VTEC;
  const target = e.throttle && e.rpm > 2.4 ? Math.min(1, (e.rpm - 2.4) / 3) : 0;   // spool holds through limiter cuts
  e.boost += (target - e.boost) * Math.min(1, dt * (target > e.boost ? 1.8 : 6));
  if (lastThrottle && !e.throttle && e.boost > 0.3) blowOff(e.boost);
  if (!e.throttle && e.rpm > 3 && Math.random() < dt * 7) pop();                         // overrun pops on lift-off
  lastThrottle = e.throttle;

  // go quiet a moment after settling back to idle
  quietFor = !e.throttle && e.rpm < IDLE + 0.05 ? quietFor + dt : 0;
  if (quietFor > 2.2) { e.active = false; ctx?.suspend(); }

  if (!ctx || !n) return;
  const t = ctx.currentTime, k = 0.02;
  const f = (e.rpm * 1000) / 30;                                                          // 4-stroke 4-cylinder firing frequency
  n.o1.frequency.setTargetAtTime(f, t, k); n.o2.frequency.setTargetAtTime(f / 2, t, k); n.o3.frequency.setTargetAtTime(f * 2, t, k);
  n.g3.gain.setTargetAtTime(e.vtec ? 0.42 : 0.05 + e.rpm * 0.02, t, 0.04);
  n.pre.gain.setTargetAtTime(0.55 + (on ? 1.3 : 0.2) + (e.vtec ? 0.7 : 0), t, 0.04);
  n.lp.frequency.setTargetAtTime(260 + e.rpm * 240 + (on ? 700 : 0) + (e.vtec ? 2400 : 0), t, 0.05);
  n.bp.frequency.setTargetAtTime(f * 3, t, k); n.rasp.gain.setTargetAtTime(on ? 0.11 : 0.03, t, 0.05);
  n.whistle.frequency.setTargetAtTime(1700 + e.boost * 5600, t, 0.08);
  n.gWhistle.gain.setTargetAtTime(e.boost * e.boost * 0.03, t, 0.08);
  n.gAir.gain.setTargetAtTime(on ? e.boost * 0.045 : 0, t, 0.06);
  const level = muted || !e.active ? 0 : (0.16 + (on ? 0.12 : 0) + e.rpm * 0.012) * (e.cut > 0 ? 0.12 : 1);
  n.master.gain.setTargetAtTime(level, t, e.cut > 0 ? 0.005 : 0.03);
}
