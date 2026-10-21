"""2016 Honda City (GM6) body as an implicit surface, meshed with surface nets. Pure numpy, imported by city_build.py.

Axes: +X forward, +Y car's left, +Z up, metres. Spec: length 4.44, width 1.695, height 1.495, wheelbase 2.60.
Profiles come from the Hum3D blueprint (side/front/rear views, heights scaled to the spec roof) and the owner's
side photos (belt, crease and handle heights). F(x, y, z) < 0 is inside the body.
"""
import numpy as np


def pchip(pts):
    """Monotone cubic through (x, y) points; linear beyond the ends."""
    xs, ys = (np.asarray(v, float) for v in zip(*sorted(pts)))
    h = np.diff(xs); d = np.diff(ys) / h
    m = np.zeros_like(ys); m[0], m[-1] = d[0], d[-1]
    for i in range(1, len(xs) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])

    def f(x):
        x = np.asarray(x, float); xc = np.clip(x, xs[0], xs[-1])
        i = np.clip(np.searchsorted(xs, xc) - 1, 0, len(xs) - 2)
        t = (xc - xs[i]) / h[i]
        y = ((1 + 2 * t) * (1 - t) ** 2 * ys[i] + t * (1 - t) ** 2 * h[i] * m[i]
             + t * t * (3 - 2 * t) * ys[i + 1] + t * t * (t - 1) * h[i] * m[i + 1])
        y = np.where(x < xs[0], ys[0] + m[0] * (x - xs[0]), y)
        return np.where(x > xs[-1], ys[-1] + m[-1] * (x - xs[-1]), y)
    return f


def S(x):
    """Blueprint x -> spec x: the blueprint is 4.39 m long at a 2.60 m wheelbase, so stretch only the overhangs."""
    if x > 1.3: return x + .025 * (x - 1.3) / .884
    if x < -1.3: return x - .026 * (-1.3 - x) / .905
    return x


AXLES = (1.30, -1.30)
WHEEL_Z = .305                       # 175/65 R15: 0.608 m tyre

# Centreline top: hood, windshield, roof, backlight, boot lid (blueprint x, z)
TOP = [(2.040, .712), (2.010, .738), (1.94, .782), (1.84, .822), (1.75, .853), (1.67, .882), (1.55, .914),
       (1.43, .945), (1.32, .975), (1.19, 1.008), (1.06, 1.045), (.92, 1.104), (.81, 1.163), (.68, 1.228),
       (.555, 1.290), (.42, 1.350), (.30, 1.395), (.18, 1.428), (.03, 1.452), (-.15, 1.474), (-.40, 1.495),
       (-.65, 1.487), (-.85, 1.468), (-1.00, 1.440), (-1.10, 1.407), (-1.25, 1.350), (-1.40, 1.290),
       (-1.52, 1.240), (-1.62, 1.205), (-1.72, 1.183), (-1.85, 1.152), (-2.00, 1.127), (-2.12, 1.110), (-2.18, 1.102)]
# Lowest edge of the body seen from the side (bumper undersides, sills)
BOT = [(2.22, .40), (2.12, .235), (2.0, .225), (1.85, .215), (1.6, .21), (-1.55, .21), (-1.62, .25),
       (-1.85, .27), (-1.96, .29), (-2.05, .33), (-2.14, .37), (-2.22, .45)]
# Lower-body half-width by height (front/rear view envelope)
WLOW = [(.12, .76), (.21, .80), (.26, .825), (.33, .840), (.45, .8465), (.60, .8475), (.75, .845), (.90, .840), (1.2, .83)]
# Shoulder crease (headlamp -> just under the door handles -> taillamp) and window line, from the side photo
SHOULDER = [(2.10, .780), (1.6, .805), (.8, .850), (0.0, .900), (-1.05, .985), (-1.75, 1.025), (-2.25, 1.04)]
BELT = [(1.30, .955), (.90, .975), (.65, .99), (0.0, 1.025), (-.93, 1.09), (-1.40, 1.115), (-2.25, 1.125)]
# Lower sweep: a sharp line rising from the front door to the taillamp with a concave scoop below it
SWEEP = [(.95, .625), (.6, .695), (-.2, .825), (-1.0, .915), (-1.6, .965)]
SWEEP_DEPTH = [(1.10, 0.), (.85, .011), (-1.2, .011), (-1.75, 0.)]
# Rocker step between the arches
ROCKER = [(1.0, .305), (-1.0, .33)]
# Top-surface crown: drop at the crown width, and its exponent (high = flat middle rolling off at the edges)
CROWN = [(2.1, .055), (1.25, .07), (1.05, .06), (.85, .068), (.3, .060), (0.0, .045), (-.9, .045), (-1.1, .060), (-1.6, .058), (-1.8, .045), (-2.2, .040)]
CROWN_W = [(2.1, .80), (1.2, .80), (1.05, .77), (.75, .64), (.3, .60), (0.0, .58), (-.9, .58), (-1.1, .61), (-1.6, .72), (-1.8, .80), (-2.2, .80)]
CROWN_P = [(2.1, 3.5), (1.2, 3.5), (.9, 2.2), (-1.7, 2.2), (-2.0, 3.0)]
# Plan view of nose and tail: at each height, how far the outline sits behind the centreline tip at |y| = PLAN_Y
PLAN_Y = [0, .2, .4, .55, .65, .72, .78, .82, .845]
NOSE = [  # z, centreline x (blueprint, stretched below), recession at PLAN_Y
    (.18, 2.04, [0, .012, .042, .080, .115, .16, .22, .30, .42]),
    (.30, 2.152, [0, .010, .038, .070, .100, .14, .195, .265, .37]),
    (.42, 2.176, [0, .010, .038, .070, .100, .14, .195, .265, .37]),
    (.52, 2.172, [0, .011, .041, .075, .108, .15, .205, .275, .38]),
    (.60, 2.125, [0, .012, .047, .085, .125, .17, .235, .31, .42]),
    (.68, 2.092, [0, .016, .055, .100, .155, .21, .285, .37, .49]),
    (.76, 2.010, [0, .022, .068, .125, .190, .255, .335, .42, .53]),
    (.86, 1.90, [0, .027, .085, .150, .225, .30, .38, .46, .57])]
TAIL = [
    (.22, -1.80, [0, .01, .04, .08, .12, .165, .22, .29, .38]),
    (.30, -2.02, [0, .01, .04, .08, .12, .165, .22, .29, .38]),
    (.40, -2.175, [0, .01, .04, .08, .12, .165, .22, .29, .38]),
    (.55, -2.205, [0, .01, .04, .08, .12, .165, .22, .29, .38]),
    (.70, -2.195, [0, .012, .042, .085, .13, .175, .235, .31, .41]),
    (.80, -2.155, [0, .014, .046, .09, .14, .19, .255, .34, .45]),
    (.92, -2.135, [0, .015, .05, .095, .145, .20, .27, .36, .48]),
    (1.02, -2.165, [0, .015, .05, .095, .145, .20, .27, .36, .48]),
    (1.12, -2.18, [0, .015, .05, .095, .145, .20, .27, .36, .48])]
# Greenhouse plan taper: A- and C-pillars draw in toward the windshield and backlight
GH_PLAN = [(1.2, .93), (.6, .975), (.2, 1.0), (-.9, 1.0), (-1.3, .965), (-1.7, .93)]

ZT = pchip([(S(x), z) for x, z in TOP]); ZB = pchip([(S(x), z) for x, z in BOT])
WL = pchip(WLOW); ZSH = pchip(SHOULDER); ZBELT = pchip(BELT)
ZSW = pchip(SWEEP); SWD = pchip(SWEEP_DEPTH); ZRK = pchip(ROCKER); GHP = pchip(GH_PLAN)
CR = pchip(CROWN); CRW = pchip(CROWN_W)

W_BELT = .765         # half-width at the window line
TUMBLE = .445         # greenhouse tumblehome, tan(24 deg)


def smax(a, b, k):
    """Smooth maximum (rounded intersection) with blend width k."""
    h = np.maximum(k - abs(a - b), 0) / k
    return np.maximum(a, b) + h * h * k * .25


def round_isect(a, b, r):
    """Intersection of two half-spaces with a circular fillet of radius r (2D rounded corner)."""
    qa, qb = a + r, b + r
    return np.sqrt(np.maximum(qa, 0) ** 2 + np.maximum(qb, 0) ** 2) + np.minimum(np.maximum(qa, qb), 0) - r


def smoothstep(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


GH_TAPER = pchip([(1.2, .20), (.6, .14), (.2, .06), (0.0, 0.0), (-.8, 0.0), (-1.1, .08), (-1.5, .18)])


def width(x, z):
    """Body half-width at (x, z): lower body, crease, shelf up to the belt, then the tumbling greenhouse."""
    zsh, zb = ZSH(x), ZBELT(x)
    wsh = WL(zsh)
    shelf = wsh - (z - zsh) * (wsh - W_BELT) / np.maximum(zb - zsh, .02)
    gh = W_BELT - (z - zb) * (TUMBLE + GH_TAPER(x))
    k = smoothstep(zsh - .012, zsh + .012, z)                    # crisp but alias-free crease
    w = np.where(z <= zb, WL(z) * (1 - k) + shelf * k, np.minimum(shelf, gh))
    # concave scoop under the sweep line; full depth just below the line
    t = (ZSW(x) - z) / .17
    w = w - np.maximum(SWD(x), 0) * smoothstep(-.15, 0, t) * (1 - smoothstep(0, 1, t)) ** 1.3
    # rocker step between the arches
    inner = 1 - smoothstep(.90, .97, abs(x))
    return w - .011 * inner * (1 - smoothstep(ZRK(x) - .008, ZRK(x) + .008, z))


class Plan:
    """Nose or tail outline in plan view, varying smoothly with height (Catmull-Rom across the sections)."""
    def __init__(self, table, sign):
        self.zs = np.array([t[0] for t in table])
        self.curves = [pchip(list(zip(PLAN_Y, [S(cx) - sign * r for r in rec]))) for _, cx, rec in table]

    def __call__(self, ay, z):
        shape = np.broadcast(ay, z).shape
        X = np.stack([np.broadcast_to(c(ay), shape) for c in self.curves])
        K = len(self.zs); zc = np.broadcast_to(z, shape)
        i = np.clip(np.searchsorted(self.zs, zc) - 1, 0, K - 2)
        t = np.clip((zc - self.zs[i]) / (self.zs[i + 1] - self.zs[i]), 0, 1)
        g = lambda k: np.take_along_axis(X, np.clip(i + k, 0, K - 1)[None], 0)[0]
        p0, p1, p2, p3 = g(-1), g(0), g(1), g(2)
        return .5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3)

    def dist(self, x, ay, z, sign):
        e = 1e-3
        xp = self(ay, z); slope = (self(ay + e, z) - xp) / e
        return sign * (x - xp) / np.sqrt(1 + slope * slope)


NOSE_P, TAIL_P = Plan(NOSE, 1), Plan(TAIL, -1)
HOOD_CREASE = ((1.12, .44), (1.97, .31))
CP = pchip(CROWN_P)


def F(x, y, z):
    ay = abs(y)
    zt = ZT(x) - CR(x) * (ay / CRW(x)) ** CP(x)
    # two creases on the bonnet, running from near the windshield toward the grille corners (photo 08)
    (x0, y0), (x1, y1) = HOOD_CREASE
    t = np.clip(((x - x0) * (x1 - x0) + (ay - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2), 0, 1)
    zt = zt + .006 * np.maximum(0, 1 - np.hypot(x - x0 - t * (x1 - x0), ay - y0 - t * (y1 - y0)) / .07) ** 2
    e = 1e-3; slope = (ZT(x + e) - ZT(x - e)) / (2 * e)
    d_top = (z - zt) / np.sqrt(1 + slope * slope)
    d_bot = ZB(x) - z
    d_side = ay - width(x, z)
    nose = round_isect(d_side, NOSE_P.dist(x, ay, z, 1), .025) if np.any(x > 0) else None
    tail = round_isect(d_side, TAIL_P.dist(x, ay, z, -1), .025) if np.any(x <= 0) else None
    plan = tail if nose is None else nose if tail is None else np.where(x > 0, nose, tail)
    d = smax(smax(plan, d_top, .016), d_bot, .015)
    for xa, ra in zip(AXLES, ARCH_R):                 # wheel arches: cylinder cut from the outer body
        arch = np.maximum(np.sqrt((x - xa) ** 2 + (z - WHEEL_Z) ** 2) - ra, .42 - ay)
        d = np.maximum(d, -arch)
    return d


ARCH_R = (.358, .362)


def surface_nets(f, lo, hi, h, chunk=16, relax=4):
    """Quad mesh of f = 0 on a grid of spacing h; vertices are then projected onto the surface."""
    lo, hi = np.asarray(lo, float), np.asarray(hi, float)
    nx, ny, nz = (np.ceil((hi - lo) / h).astype(int) + 1)
    xs, ys, zs = (lo[i] + h * np.arange(n) for i, n in enumerate((nx, ny, nz)))
    Y, Z = np.meshgrid(ys, zs, indexing='ij')
    G = np.empty((nx, ny, nz), np.float32)
    for i in range(0, nx, chunk):
        G[i:i + chunk] = f(xs[i:i + chunk, None, None], Y[None], Z[None])
    s = G < 0
    cnt = np.zeros((nx - 1, ny - 1, nz - 1), np.uint8)
    C = [(a, b, c) for c in (0, 1) for b in (0, 1) for a in (0, 1)]
    for a, b, c in C:
        cnt += s[a:nx - 1 + a, b:ny - 1 + b, c:nz - 1 + c]
    cells = np.argwhere((cnt > 0) & (cnt < 8)); del cnt
    ci, cj, ck = cells.T
    acc = np.zeros((len(cells), 3)); n = np.zeros(len(cells))
    for p in range(8):
        for q in range(p + 1, 8):
            if sum(abs(C[p][k] - C[q][k]) for k in range(3)) != 1: continue
            fa = G[ci + C[p][0], cj + C[p][1], ck + C[p][2]].astype(float)
            fb = G[ci + C[q][0], cj + C[q][1], ck + C[q][2]].astype(float)
            m = (fa < 0) != (fb < 0)
            t = fa[m] / (fa[m] - fb[m])
            acc[m] += np.asarray(C[p]) + t[:, None] * (np.asarray(C[q]) - np.asarray(C[p]))
            n[m] += 1
    V = lo + (cells + acc / n[:, None]) * h
    ids = (ci * (ny - 1) + cj) * (nz - 1) + ck            # sorted: argwhere is C-ordered
    look = lambda i, j, k: np.searchsorted(ids, (i * (ny - 1) + j) * (nz - 1) + k)
    quads = []
    for axis in range(3):
        sl0 = [slice(None)] * 3; sl1 = [slice(None)] * 3
        sl0[axis] = slice(0, -1); sl1[axis] = slice(1, None)
        inside = s[tuple(sl0)]; ch = inside != s[tuple(sl1)]
        e = np.argwhere(ch); ins = inside[ch]
        o = [k for k in range(3) if k != axis]
        ok = np.all([(e[:, k] >= 1) & (e[:, k] <= (nx, ny, nz)[k] - 2) for k in o], axis=0)
        e, ins = e[ok], ins[ok]
        i, j, k = e.T
        if axis == 0: ring = [(i, j - 1, k - 1), (i, j, k - 1), (i, j, k), (i, j - 1, k)]
        elif axis == 1: ring = [(i - 1, j, k - 1), (i - 1, j, k), (i, j, k), (i, j, k - 1)]
        else: ring = [(i - 1, j - 1, k), (i, j - 1, k), (i, j, k), (i - 1, j, k)]
        Q = np.stack([look(*r) for r in ring], 1)
        Q[~ins] = Q[~ins][:, ::-1]                          # outward normals
        quads.append(Q)
    Q = np.concatenate(quads)

    def project(V, steps):
        for _ in range(steps):                               # Newton steps onto f = 0
            e = 1e-4
            fv = f(*V.T)
            g = np.stack([(f(*(V + d).T) - fv) / e for d in np.eye(3) * e], 1)
            V = V - np.clip(fv / np.maximum((g * g).sum(1), 1e-9), -h, h)[:, None] * g
        return V

    V = project(V, 4)
    # Relax along the surface: even out the vertex spacing so sharp edges come out straight, not stair-stepped
    E = np.concatenate([Q[:, [0, 1]], Q[:, [1, 2]], Q[:, [2, 3]], Q[:, [3, 0]]])
    deg = np.bincount(E[:, 0], minlength=len(V)) + np.bincount(E[:, 1], minlength=len(V))
    for _ in range(relax):
        acc = np.zeros_like(V)
        np.add.at(acc, E[:, 0], V[E[:, 1]]); np.add.at(acc, E[:, 1], V[E[:, 0]])
        V = project(V + .5 * (acc / np.maximum(deg, 1)[:, None] - V), 2)
    return V, Q


if __name__ == '__main__':
    import time
    t = time.time()
    V, Q = surface_nets(F, (-2.32, -.92, .0), (2.32, .92, 1.56), .012)
    print('verts', len(V), 'quads', len(Q), round(time.time() - t, 1), 's')
    print('bbox', V.min(0).round(3), V.max(0).round(3))
