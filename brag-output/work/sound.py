# Soundtrack + cluster sound design for film.html (40.5 s). A minor, 100 BPM bed; every UI event has its own
# sound in key, panned to where it happens on the cluster. Written as one mix: effects sit under the music.
import numpy as np, wave, sys
SR, DUR = 48000, 40.5
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
BEAT = .6

def env(n, a, d):
    e = np.ones(n); a = max(1, int(a * SR)); e[:a] = np.linspace(0, 1, a); e[a:] = np.exp(-np.arange(n - a) / (d * SR)); return e
def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y
def put(at, sig, g=1.0, pan=0.0):  # pan -1 left .. 1 right
    i = int(at * SR); j = min(N, i + len(sig)); s = sig[: j - i] * g
    L[i:j] += s * np.sqrt((1 - pan) / 2) * 1.414; R[i:j] += s * np.sqrt((1 + pan) / 2) * 1.414
def tone(f, dur, a=.005, d=None, harm=.25):
    n = int(dur * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + harm * np.sin(4 * np.pi * f * tt)) * env(n, a, d or dur / 4)
def noise(dur, fc, a=.01, d=.2): n = int(dur * SR); return lp(rng.standard_normal(n), fc) * env(n, a, d)
def sweep(dur, f0, f1, g=1):
    n = int(dur * SR); x = rng.standard_normal(n); out = np.empty(n); acc = 0.0
    fc = np.geomspace(f0, f1, n); a = np.exp(-2 * np.pi * fc / SR)
    for i in range(n): acc = (1 - a[i]) * x[i] + a[i] * acc; out[i] = acc
    return out * np.sin(np.linspace(0, np.pi, n)) ** 2 * g
def click(): n = int(.012 * SR); return np.diff(rng.standard_normal(n + 1)) * env(n, .0005, .002) * .5 + tone(2400, .012, .0005, .003) * .3

# ---------- music bed ----------
CH = [(0, [45, 52, 57, 60]), (4.2, [45, 48, 52, 57]), (8.6, [41, 45, 48, 53]), (13.0, [43, 47, 50, 55]), (17.6, [48, 52, 55, 60]),
      (20.4, [45, 48, 52, 57]), (25.6, [41, 45, 48, 53]), (28.6, [43, 47, 50, 55]), (33.8, [40, 44, 47, 52]), (36.6, [45, 52, 57, 59, 64])]
pad = np.zeros(N)
for k, (s0, notes) in enumerate(CH):
    e0 = CH[k + 1][0] if k + 1 < len(CH) else DUR
    i, j = int(s0 * SR), int(min(DUR, e0 + .5) * SR); tt = t[i:j]
    seg = sum(2 * ((tt * hz(m) * d) % 1) - 1 for m in notes for d in (.996, 1, 1.005)) / (len(notes) * 3)
    w = np.ones(j - i); r = int(.5 * SR); w[:r] = np.linspace(0, 1, r); w[-r:] = np.linspace(1, 0, r); pad[i:j] += seg * w
pad = lp(pad, 1100) * (.15 + .35 * np.clip((t - .5) / 3.5, 0, 1))
duck = 1 - .55 * ((t > 34.05) & (t < 36.4))
put(0, pad * duck, .9)
root = lambda s: [c for c in CH if c[0] <= s][-1][1][0] - 12
s = 4.2
while s < 37.8:   # sub pulse on 8ths
    if not (34.0 <= s < 34.6):
        n = int(.27 * SR); tt = np.arange(n) / SR; f = hz(root(s))
        put(s, (np.sin(2 * np.pi * f * tt) + .3 * np.sin(4 * np.pi * f * tt)) * env(n, .004, .11), .42 * (1 - .5 * (34 < s < 36.4)))
    s += BEAT / 2
s = 4.2
while s < 37.8:   # kick + offbeat hat
    n = int(.3 * SR); tt = np.arange(n) / SR
    put(s, np.sin(2 * np.pi * np.cumsum(46 + 80 * np.exp(-tt / .03)) / SR) * env(n, .002, .09), .45)
    put(s + BEAT / 2, np.diff(rng.standard_normal(int(.035 * SR) + 1)) * env(int(.035 * SR), .001, .01), .05, .25)
    s += BEAT

# ---------- ignition ----------
put(.2, sweep(1.2, 200, 3000, .5), .5)                                    # the light line
n = int(1.6 * SR); tt = np.arange(n) / SR
put(1.0, np.sin(2 * np.pi * np.cumsum(40 + 50 * np.exp(-tt / .08)) / SR) * env(n, .002, .4), .9)   # power-on thump
for k, m in enumerate([69, 76, 81, 88]): put(1.05 + k * .07, tone(hz(m), 1.4, .01, .5), .09, -.3 + k * .2)   # start-up chime
put(1.6, sweep(1.8, 300, 5000, .6), .35)                                   # needle sweep up and back
# ---------- highway ----------
put(5.6, tone(hz(81), .25, .002, .06), .12, -.35)                          # sign pop
put(8.85, sweep(.7, 3000, 400, .6), .3); put(9.0, tone(hz(76), .5, .005, .15), .12)   # exit card in
def ticks(a, b, hz_, pan):
    k = 0
    while a + k / hz_ < b:
        put(a + k / hz_, click(), .5, pan); put(a + k / hz_ + .55 / hz_, click(), .32, pan); k += 1
ticks(10.8, 12.9, 1.6, .85)                                                # right indicator
put(12.9, sweep(.5, 500, 4000, .5), .25)                                   # card away
ticks(13.3, 17.4, 1.6, -.85)                                               # left indicator
put(14.3, tone(hz(76), .22, .003, .08), .2, -.2); put(14.55, tone(hz(72), .3, .003, .1), .2, -.2)   # blind-spot two-tone
# ---------- traffic ----------
n = int(1.2 * SR); put(17.9, sweep(1.2, 600, 6000, .7), .35, 0)            # scan
put(18.6, tone(hz(79), .25, .002, .06), .1, -.35)
k = 0
while 21.4 + k * .5 < 23.0: put(21.4 + k * .5, tone(1320, .08, .002, .03, 0), .08, .1); k += 1   # slow proximity beeps
k = 0
while 23.0 + k * .17 < 25.2: put(23.0 + k * .17, tone(1480, .07, .002, .025, 0), .09, .3); k += 1   # fast
put(23.4, tone(hz(81), .3, .003, .1), .14); put(23.62, tone(hz(77), .4, .003, .12), .14)
for k in range(3): put(26.3 + k * .16, tone(hz(84), .12, .002, .05, 0), .12)   # pedestrian triple
# ---------- park ----------
put(28.6, sweep(.8, 2000, 300, .5), .25)
put(29.4, tone(hz(76), .3, .003, .08), .1); put(30.3, click(), .9); put(30.32, tone(hz(81), .5, .004, .15), .12)   # tap OK
put(31.35, sweep(.7, 400, 5000, .6), .3, .4)                               # slide to cameras
gap = .45; s = 31.8
while s < 33.5: put(s, tone(1250, .06, .002, .02, 0), .09, -.2); s += gap; gap = max(.08, gap * .82)
# ---------- emergency ----------
n = int(1.8 * SR); tt = np.arange(n) / SR
put(34.05, np.sin(2 * np.pi * np.cumsum(34 + 70 * np.exp(-tt / .06)) / SR) * env(n, .002, .45) + noise(1.8, 1200, .002, .15) * .7, 1.0)
s = 34.15
while s < 36.3: put(s, tone(hz(88), .16, .002, .06, .15) + tone(hz(84), .16, .002, .06, .15), .1); s += .32   # alarm
# ---------- outro ----------
for k, m in enumerate([57, 64, 69, 72, 76, 81]): put(37.9 + k * .12, tone(hz(m), 2.2, .02, .9), .06, -.4 + k * .16)

mix = np.stack([L, R], 1)
fade = (np.clip((DUR - t) / 2.0, 0, 1) * np.clip(t / .2, 0, 1))[:, None]
mix = np.tanh(mix * fade * 1.3); mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok')
