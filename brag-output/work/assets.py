# Cut the cluster into animatable layers. Coordinates are in the 2000x1000 frame space.
# Plates: whole frames with the dynamic bits (digits, needles, value arcs, signs, pills) painted out.
# Sprites: one element each, alpha = where the state differs from its plate (feathered), cropped to a box.
import cv2, numpy as np, json, os
L = 'layers/'; OUT = 'assets/'; os.makedirs(OUT, exist_ok=True)
rd = lambda n: cv2.imread(L + n + '.png', cv2.IMREAD_UNCHANGED)
LEFT, RIGHT, R = (333, 507), (1633, 507), 292

def circle(c, r0, r1):
    yy, xx = np.mgrid[0:1000, 0:2000]; d = np.hypot(xx - c[0], yy - c[1]); return (d >= r0) & (d <= r1)
def redmask(im, c):  # red value arc + needle inside a dial
    b, g, r = [im[:, :, i].astype(int) for i in range(3)]
    return ((r > 60) & (r > b + 12) & (r > g + 30) & circle(c, 90, 305)).astype(np.uint8)
def box(x0, y0, x1, y1):
    m = np.zeros((1000, 2000), np.uint8); m[y0:y1, x0:x1] = 1; return m
def bright(im, m):  # bright text pixels inside a box mask
    g = cv2.cvtColor(im[:, :, :3], cv2.COLOR_BGR2GRAY); return ((g > 110) & (m > 0)).astype(np.uint8)
def inpaint(im, m, r=9):
    m = cv2.dilate(m, np.ones((7, 7), np.uint8)) * 255
    out = im.copy(); out[:, :, :3] = cv2.inpaint(im[:, :, :3], m.astype(np.uint8), r, cv2.INPAINT_TELEA); return out
def save(name, im): cv2.imwrite(OUT + name + ('.png' if not name.endswith('.jpg') else ''), im)
meta = {}
def sprite(name, src, ref, x0, y0, x1, y1, thr=40, grow=7, keep=None):
    d = (np.abs(src[:, :, :3].astype(int) - ref[:, :, :3].astype(int)).sum(2) > thr).astype(np.uint8)
    d = cv2.morphologyEx(d, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    d = cv2.dilate(cv2.morphologyEx(d, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8)), np.ones((grow, grow), np.uint8))
    if keep is not None: d = d & keep
    a = cv2.GaussianBlur(d.astype(np.float32), (0, 0), 2.2)[y0:y1, x0:x1]
    cv2.imwrite(OUT + name + '.png', np.dstack([src[y0:y1, x0:x1, :3], (a * 255).astype(np.uint8)]))
    meta[name] = [x0, y0, x1 - x0, y1 - y0]

dash, traffic, bs, crash, nav = rd('dashboard'), rd('traffic'), rd('blindspot'), rd('crash'), rd('nav-highway')
pw, pa, bt, pd, pk = rd('proximity-warning'), rd('proximity-alert'), rd('blindspot-traffic'), rd('pedestrian'), rd('park-auto')

# --- highway plate: no digits, no value arcs/needles, no signs
m = redmask(dash, LEFT) | redmask(dash, RIGHT) | bright(dash, box(270, 440, 400, 565)) | bright(dash, box(1520, 445, 1750, 565)) | box(590, 160, 750, 372)
hw = inpaint(dash, m)
def patch(dst, src, x0, y0, x1, y1, f=12):  # copy a sign-free region from another state, feathered
    a = np.zeros((1000, 2000), np.float32); a[y0:y1, x0:x1] = 1; a = cv2.GaussianBlur(a, (0, 0), f)[..., None]
    dst[:, :, :3] = (src[:, :, :3] * a + dst[:, :, :3] * (1 - a)).astype(np.uint8)
patch(hw, bs, 575, 150, 770, 390); save('hw-plate', hw)
sprite('hw-sign', dash, hw, 585, 155, 760, 380)

# --- traffic plate: no digits, no value arc/needle, no signs
m = redmask(traffic, LEFT) | bright(traffic, box(270, 440, 400, 565)) | box(572, 160, 742, 356)
tr = inpaint(traffic, m); patch(tr, pk, 560, 150, 760, 370); save('tr-plate', tr)
sprite('tr-sign', traffic, tr, 585, 155, 750, 355)

# highway states
sprite('bs-warn', bs, dash, 840, 110, 1170, 440)
sprite('bs-lane', bs, dash, 420, 420, 980, 935, keep=box(420, 425, 980, 930))
sprite('crash-warn', crash, dash, 670, 120, 1320, 385)
sprite('crash-lead', crash, dash, 880, 370, 1090, 600)
# crash plate without its warning (the warning pops in as its own sprite); patch the triangle+text area by inpainting
cw = (np.abs(crash[:, :, :3].astype(int) - dash[:, :, :3].astype(int)).sum(2) > 40).astype(np.uint8) & box(670, 120, 1320, 385)
cw = cv2.dilate(cw, np.ones((9, 9), np.uint8))
# keep the red tint: inpaint only where the warning differs from its own surroundings (bright/red glyph pixels)
g = cv2.cvtColor(crash[:, :, :3], cv2.COLOR_BGR2GRAY); glyph = ((g > 150) | ((crash[:, :, 2] > 200) & (crash[:, :, 1] < 80))).astype(np.uint8) & box(670, 120, 1320, 385)
save('crash-full', inpaint(crash, cv2.dilate(glyph, np.ones((5, 5), np.uint8)), 11))
# exit card: an opaque rounded panel; its distance text is painted out (it counts down live)
cx0, cy0, cx1, cy1 = 555, 145, 1415, 440
card = nav[cy0:cy1, cx0:cx1].copy()
txt = bright(nav, box(745, 270, 885, 322))[cy0:cy1, cx0:cx1]
card[:, :, :3] = cv2.inpaint(card[:, :, :3], cv2.dilate(txt, np.ones((5, 5), np.uint8)) * 255, 7, cv2.INPAINT_TELEA)
a = np.zeros(card.shape[:2], np.uint8); cv2.rectangle(a, (0, 0), (cx1 - cx0 - 1, cy1 - cy0 - 1), 255, -1)
card[:, :, 3] = a; save('exit-card', card); meta['exit-card'] = [cx0, cy0, cx1 - cx0, cy1 - cy0]

# traffic states: ring per state (annulus), car ring per state, then the state's own elements
ring = circle(LEFT, 248, 312).astype(np.uint8)
ell = box(690, 590, 1310, 870)
for n, im in [('traffic', traffic), ('pw', pw), ('pa', pa), ('bt', bt), ('pd', pd)]:
    a = cv2.GaussianBlur(ring.astype(np.float32), (0, 0), 2)
    cv2.imwrite(OUT + f'ring-{n}.png', np.dstack([im[195:820, 21:646, :3], (a[195:820, 21:646] * 255).astype(np.uint8)]))
    meta[f'ring-{n}'] = [21, 195, 625, 625]
    if n != 'traffic': sprite(f'ell-{n}', im, traffic, 690, 590, 1310, 870, thr=50, keep=ell)
sprite('pw-car-ahead', pw, traffic, 800, 385, 990, 525)
sprite('pw-car-back', pw, traffic, 1245, 780, 1490, 935)
red = lambda im: ((im[:, :, 2].astype(int) > im[:, :, 0].astype(int) + 25)).astype(np.uint8)
sprite('pa-zone', pa, pw, 1080, 400, 1600, 935, keep=box(1120, 470, 1572, 935) & cv2.dilate(red(pa), np.ones((9, 9), np.uint8)))
sprite('pa-warn', pa, traffic, 880, 105, 1120, 335)
sprite('bt-lane', bt, traffic, 290, 420, 990, 935, keep=box(290, 470, 990, 935) & (1 - circle(LEFT, 0, 318).astype(np.uint8)))
sprite('bt-warn', bt, traffic, 840, 105, 1170, 440)
sprite('pd-zone', pd, traffic, 800, 335, 1260, 570, keep=box(800, 340, 1260, 570))
sprite('pd-warn', pd, traffic, 830, 105, 1170, 348)

# park: plate without the prompt and the bay; then those two as sprites
m = box(820, 205, 1160, 300) | (((pk[:, :, 1].astype(int) > 160) & (pk[:, :, 2] < 170)) & box(1090, 470, 1390, 760).astype(bool)).astype(np.uint8)
pkp = inpaint(pk, m, 11); save('pk-plate', pkp)
sprite('pk-prompt', pk, pkp, 815, 200, 1165, 305)
sprite('pk-bay', pk, pkp, 1090, 470, 1390, 765)
save('pk-manual', rd('park-manual') if os.path.exists(L + 'park-manual.png') else cv2.imread('../../../claude-scratch/hmi/hi/final/park-manual.png', cv2.IMREAD_UNCHANGED))

json.dump(meta, open(OUT + 'meta.json', 'w'), indent=1)
print('ok', len(meta))
