# Original soundtrack for the Adaptive Cluster video: A minor, 100 BPM, cut points match the storyboard.
# Pad + sub pulse + soft kick/hats, with UI chimes, a blind-spot two-tone and a braking impact in the same key.
import numpy as np, wave, sys

SR, DUR = 48000, 23.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
BEAT = 0.6

def env(n, a, d):  # attack/decay envelope in samples
    e = np.ones(n); a = max(1, int(a * SR)); e[:a] = np.linspace(0, 1, a)
    e[a:] = np.exp(-np.arange(n - a) / (d * SR)); return e
def onepole(x, fc):  # gentle low-pass
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y
def saw(f, tt): return 2 * ((tt * f) % 1) - 1
def add(buf, start, sig, gain=1.0):
    i = int(start * SR); j = min(len(buf), i + len(sig)); buf[i:j] += sig[: j - i] * gain
def reverb(x, secs=1.6, wet=.25):
    ir = rng.standard_normal(int(secs * SR)) * np.exp(-np.arange(int(secs * SR)) / (0.35 * SR))
    n = len(x) + len(ir); F = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[: len(x)]
    return x + wet * y / np.max(np.abs(ir)) * 0.02

# chord plan (MIDI): matches scenes
CHORDS = [(0, [45, 48, 52, 57]), (6.6, [41, 45, 48, 53]), (9.1, [48, 52, 55, 60]), (11.9, [43, 47, 50, 55]),
          (15.5, [45, 48, 52, 57]), (17.6, [41, 45, 48, 52]), (19.6, [45, 52, 57, 59, 64])]
pad = np.zeros(N)
for k, (s, notes) in enumerate(CHORDS):
    e_ = CHORDS[k + 1][0] if k + 1 < len(CHORDS) else DUR
    i, j = int(s * SR), int(min(DUR, e_ + .4) * SR); tt = t[i:j]
    seg = sum(saw(hz(m) * d, tt) for m in notes for d in (0.997, 1.0, 1.004)) / (len(notes) * 3)
    w = np.ones(j - i); r = int(.4 * SR); w[:r] = np.linspace(0, 1, r); w[-r:] = np.linspace(1, 0, r)
    pad[i:j] += seg * w
pad = onepole(pad, 900) * np.clip(t / 3.0, 0, 1) * .5

# sub pulse on 8ths from the reveal to the outro, root of the current chord
bass = np.zeros(N)
root = lambda s: [c for c in CHORDS if c[0] <= s][-1][1][0] - 12
s = 3.4
while s < 19.6:
    if not (17.6 <= s < 17.9):
        n = int(.28 * SR); tt = np.arange(n) / SR; f = hz(root(s))
        add(bass, s, (np.sin(2 * np.pi * f * tt) + .25 * np.sin(4 * np.pi * f * tt)) * env(n, .005, .12), .55)
    s += BEAT / 2

# kick on beats, offbeat hats, from the walk-through to the outro
drums = np.zeros(N)
s = 6.6
while s < 19.6:
    n = int(.3 * SR); tt = np.arange(n) / SR
    add(drums, s, np.sin(2 * np.pi * np.cumsum(45 + 75 * np.exp(-tt / .03)) / SR) * env(n, .002, .09), .5)
    hat = np.diff(rng.standard_normal(int(.04 * SR) + 1)) * env(int(.04 * SR), .001, .012)
    add(drums, s + BEAT / 2, hat, .07)
    s += BEAT

# effects, in key
fx = np.zeros(N)
def tone(at, m, dur=.7, g=.16):
    n = int(dur * SR); tt = np.arange(n) / SR; f = hz(m)
    add(fx, at, (np.sin(2 * np.pi * f * tt) + .3 * np.sin(4 * np.pi * f * tt)) * env(n, .01, dur / 4), g)
n = int(.9 * SR); sweep = onepole(rng.standard_normal(n), 2500) * np.sin(np.linspace(0, np.pi, n)) ** 2
add(fx, 2.95, sweep, .18)                                                             # whoosh into the reveal
for at, m in [(6.6, 81), (9.1, 76), (11.9, 81), (13.0, 79), (14.1, 76), (15.5, 81)]: tone(at, m)   # state chimes
tone(9.35, 76, .2, .12); tone(9.6, 72, .3, .12)                                       # blind-spot two-tone
n = int(1.4 * SR); tt = np.arange(n) / SR                                             # braking impact
add(fx, 17.6, np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt / .05)) / SR) * env(n, .003, .35) + onepole(rng.standard_normal(n), 900) * env(n, .002, .12) * .6, .8)
for k, m in enumerate([69, 72, 76, 81]): tone(19.8 + k * .15, m, 1.2, .1)              # outro arpeggio

mix = reverb(pad, wet=.4) + bass + drums + reverb(fx, wet=.6)
fade = np.clip((DUR - t) / 1.8, 0, 1) * np.clip(t / .3, 0, 1)
mix = np.tanh(mix * fade * 1.4)
mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))
pan = 0.15 * np.sin(2 * np.pi * t / 7)                                                # slow width on the bed
L, R = mix * (1 - pan), mix * (1 + pan)
data = (np.stack([L, R], 1) / np.max(np.abs([L, R])) * 10 ** (-1 / 20) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print('ok', DUR)
