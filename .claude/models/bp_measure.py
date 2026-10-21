# Measure the 4th-gen City from the Hum3D blueprint views -> profiles.json (metres)
from PIL import Image
import json, colorsys
im = Image.open('D:/Main Portfolio/.claude/references/car/blueprint-hum3d.png').convert('RGB')
px = im.load()

def car(x, y):
    r, g, b = px[x, y]
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    return (b - r > 22 and b > g) or v < .42 or (r - b > 40 and r > 120)   # blue paint, black/glass/tyre, red lamp

def glass(x, y):
    r, g, b = px[x, y]; return max(r, g, b) < 95 and abs(r - b) < 25

def extents(box, axis):
    x0, y0, x1, y1 = box; out = {}
    if axis == 'col':
        for x in range(x0, x1):
            ys = [y for y in range(y0, y1) if car(x, y)]
            if len(ys) > 3: out[x] = (min(ys), max(ys))
    else:
        for y in range(y0, y1):
            xs = [x for x in range(x0, x1) if car(x, y)]
            if len(xs) > 3: out[y] = (min(xs), max(xs))
    return out

# --- side view (front of car on the left) ---
SIDE = (88, 205, 392, 307)
cols = extents(SIDE, 'col')
xs = sorted(cols); xf, xr = xs[0], xs[-1]
ground = max(b for _, b in cols.values())
L = 4.44; m = L / (xr - xf)                                  # metres per pixel
print('side px length', xr - xf, 'm/px', round(m, 5), 'height m', round((ground - min(t for t, _ in cols.values())) * m, 3))
# wheels: columns whose bottom touches the ground
touch = [x for x in xs if cols[x][1] >= ground - 1]
groups = []; 
for x in touch:
    if groups and x - groups[-1][-1] <= 2: groups[-1].append(x)
    else: groups.append([x])
groups = [g for g in groups if len(g) > 5]
wc = [(g[0] + g[-1]) / 2 for g in groups]
print('wheel contact groups', [(g[0], g[-1]) for g in groups], 'wheelbase m', round((wc[-1] - wc[0]) * m, 3))

# body bottom ignores wheels: interpolate over tyre spans (radius 0.31 m)
rpx = .31 / m
def in_wheel(x): return any(abs(x - c) < rpx * 1.15 for c in wc)
side = []
for x in xs:
    top, bot = cols[x]
    X = (xf - x) * m + L / 2          # +X forward: front (left in image) = +L/2
    side.append({'x': round(X, 4), 'top': round((ground - top) * m, 4), 'bot': None if in_wheel(x) else round((ground - bot) * m, 4)})
# fill wheel spans with a straight rocker line between neighbours
known = [(s['x'], s['bot']) for s in side if s['bot'] is not None]
for s in side:
    if s['bot'] is None:
        a = max((k for k in known if k[0] > s['x']), key=lambda k: -k[0], default=None)
        b = min((k for k in known if k[0] < s['x']), key=lambda k: -k[0], default=None)
        lo = [k for k in known if k[0] > s['x']]; hi = [k for k in known if k[0] < s['x']]
        p = min(lo, key=lambda k: k[0]); q = max(hi, key=lambda k: k[0])
        t = (s['x'] - q[0]) / (p[0] - q[0]); s['bot'] = round(q[1] + t * (p[1] - q[1]), 4)
# side glass band per column (DLO): dark pixels in the upper half
dlo = []
for x in xs:
    top, bot = cols[x]; mid = (top + bot) // 2
    g = [y for y in range(top, mid) if glass(x, y)]
    if len(g) > 2: dlo.append({'x': round((xf - x) * m + L / 2, 4), 'top': round((ground - min(g)) * m, 4), 'bot': round((ground - max(g)) * m, 4)})
wheels = [round((xf - c) * m + L / 2, 4) for c in wc]

# --- front view: half-width per height (mirrors and tyres removed) ---
FRONT = (468, 208, 612, 312)
rows = extents(FRONT, 'row')
fy = sorted(rows); fground = fy[-1]
widths = {y: rows[y][1] - rows[y][0] for y in fy}
mf = m  # blueprints share one scale
front = [{'z': round((fground - y) * mf, 4), 'hw': round(min(widths[y] * mf, 1.695) / 2, 4)} for y in fy]
print('front m/px', round(mf, 5), 'height m', round((fground - fy[0]) * mf, 3))
json.dump({'side': side, 'dlo': dlo, 'wheels': wheels, 'front': front, 'L': L}, open('profiles.json', 'w'), indent=0)
print('stations', len(side), 'dlo', len(dlo), 'wheels x', wheels)
