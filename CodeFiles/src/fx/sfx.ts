// The jump to lightspeed, as sound: synthesised with the Web Audio API, so there is no file to load. Timed to the
// picture in warp.ts: a roar of filtered noise and an engine whine that climb together through the acceleration
// (0.15–1.35s), then a deep boom and a sharp crack on the white flash (≈1.4s), ringing out as you arrive.
// It only ever plays from a click, so browsers allow it.
let ctx: AudioContext | null = null;

export function playJump() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { return; }
  const a = ctx, t0 = a.currentTime + 0.02, PEAK = 1.4;
  const out = a.createDynamicsCompressor();
  const master = a.createGain();
  master.gain.value = 0.55;
  master.connect(out).connect(a.destination);

  // white noise, shared by the roar and the crack
  const noise = a.createBuffer(1, a.sampleRate * 3, a.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = (buf: AudioBuffer) => { const s = a.createBufferSource(); s.buffer = buf; return s; };

  // 1. the roar: noise through a band-pass that sweeps up as the stars stretch
  const roar = src(noise), bp = a.createBiquadFilter(), rg = a.createGain();
  bp.type = 'bandpass'; bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(180, t0);
  bp.frequency.exponentialRampToValueAtTime(3200, t0 + PEAK);
  rg.gain.setValueAtTime(0.0001, t0);
  rg.gain.exponentialRampToValueAtTime(0.5, t0 + PEAK - 0.05);
  rg.gain.exponentialRampToValueAtTime(0.0001, t0 + PEAK + 0.35);
  roar.connect(bp).connect(rg).connect(master);
  roar.start(t0); roar.stop(t0 + PEAK + 0.4);

  // 2. the whine: a detuned pair of saws gliding up an octave and more, softened by a low-pass
  const lp = a.createBiquadFilter(), wg = a.createGain();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t0); lp.frequency.exponentialRampToValueAtTime(2400, t0 + PEAK);
  wg.gain.setValueAtTime(0.0001, t0);
  wg.gain.exponentialRampToValueAtTime(0.09, t0 + PEAK - 0.1);
  wg.gain.exponentialRampToValueAtTime(0.0001, t0 + PEAK + 0.15);
  lp.connect(wg).connect(master);
  for (const detune of [-7, 7]) {
    const o = a.createOscillator();
    o.type = 'sawtooth'; o.detune.value = detune;
    o.frequency.setValueAtTime(70, t0);
    o.frequency.exponentialRampToValueAtTime(520, t0 + PEAK);
    o.connect(lp); o.start(t0); o.stop(t0 + PEAK + 0.2);
  }

  // 3. the jump itself: a sub boom falling away under a short bright crack
  const boom = a.createOscillator(), bg = a.createGain();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(110, t0 + PEAK);
  boom.frequency.exponentialRampToValueAtTime(28, t0 + PEAK + 0.9);
  bg.gain.setValueAtTime(0.0001, t0 + PEAK - 0.01);
  bg.gain.exponentialRampToValueAtTime(0.9, t0 + PEAK + 0.02);
  bg.gain.exponentialRampToValueAtTime(0.0001, t0 + PEAK + 1.1);
  boom.connect(bg).connect(master);
  boom.start(t0 + PEAK - 0.02); boom.stop(t0 + PEAK + 1.2);

  const crack = src(noise), hp = a.createBiquadFilter(), cg = a.createGain();
  hp.type = 'highpass'; hp.frequency.value = 2200;
  cg.gain.setValueAtTime(0.0001, t0 + PEAK - 0.01);
  cg.gain.exponentialRampToValueAtTime(0.45, t0 + PEAK + 0.01);
  cg.gain.exponentialRampToValueAtTime(0.0001, t0 + PEAK + 0.35);
  crack.connect(hp).connect(cg).connect(master);
  crack.start(t0 + PEAK - 0.02); crack.stop(t0 + PEAK + 0.4);
}
