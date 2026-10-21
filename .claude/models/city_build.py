# 2016 Honda City (4th gen, GM6), built from scratch: implicit body (city_sdf.py) + revolved wheels + projected details.
# Run: blender -b -P city_build.py -- <stock|mod> <out_dir> <render_dir> [res_mm] [views]
# Axes: +X forward, +Y car's left, +Z up, metres.
import bpy, bmesh, math, sys, os
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import city_sdf as S

args = sys.argv[sys.argv.index('--') + 1:]
MODE = args[0]; OUT, RENDERS = (os.path.abspath(a) for a in args[1:3])
RES = float(args[3]) / 1000 if len(args) > 3 else .006
VIEWS = args[4].split(',') if len(args) > 4 else ['front34', 'rear34', 'side', 'front', 'rear', 'top']
MOD = MODE == 'mod'
os.makedirs(OUT, exist_ok=True); os.makedirs(RENDERS, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c]


def mat(name, color, metal=0., rough=.5, coat=0., emit=None, strength=0., alpha=1.):
    m = bpy.data.materials.new(name)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(color), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if coat: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = .03
    if emit: b.inputs['Emission Color'].default_value = (*lin(emit), 1); b.inputs['Emission Strength'].default_value = strength
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    return m


PAINT = mat('Sonic Grey Pearl', '#8C949B', metal=.6, rough=.32, coat=1)
TYRE = mat('Tyre', '#151515', rough=.88)
RIM = mat('Alloy silver', '#D3D6D9', metal=.85, rough=.3)
DISC = mat('Brake disc', '#6A6A6A', metal=1, rough=.4)
CALIPER = mat('Caliper', '#B3141B' if MOD else '#2B2B2B', rough=.4)
WELL = mat('Wheel well', '#070707', rough=.95)

parts = []


def add_mesh(name, V, Q, m, smooth=True):
    me = bpy.data.meshes.new(name)
    V = np.asarray(V, np.float32); Q = np.asarray(Q, np.int32)
    me.vertices.add(len(V)); me.vertices.foreach_set('co', V.ravel())
    me.loops.add(Q.size); me.loops.foreach_set('vertex_index', Q.ravel())
    me.polygons.add(len(Q)); me.polygons.foreach_set('loop_start', np.arange(0, Q.size, Q.shape[1], dtype=np.int32))
    me.update(calc_edges=True); me.validate()
    if smooth: me.shade_smooth()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    me.materials.append(m); parts.append(o)
    return o


# --- body ---
V, Q = S.surface_nets(S.F, (-2.32, -.92, .0), (2.32, .92, 1.56), RES)
body = add_mesh('Body', V, Q, PAINT)
body.data.materials.append(WELL)
C = V[Q].mean(1)   # face centres: the arch cavities (inside the arch radius, inboard of the skin) go black
in_arch = np.zeros(len(Q), bool)
for ax, ra in zip(S.AXLES, S.ARCH_R):
    in_arch |= (np.hypot(C[:, 0] - ax, C[:, 2] - S.WHEEL_Z) < ra + .012) & (np.abs(C[:, 1]) < .835)
body.data.polygons.foreach_set('material_index', in_arch.astype(np.int32))
print('body', len(V), 'verts')

# --- details laid onto the body: outlines picked in a view, splined, filled and ray-cast onto the skin ---
from mathutils import geometry
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
BVH = BVHTree.FromPolygons(V.tolist(), Q.tolist())
GLASS = mat('Glass tinted', '#0B0F12', rough=.04, coat=1)
TRIM = mat('Gloss black', '#0A0A0A', rough=.18, coat=1)
MATTE = mat('Matte black', '#101010', rough=.6)
CHROME = mat('Chrome', '#E6E8EA', metal=1, rough=.06)
HOUSING = mat('Lamp housing', '#2A2D30', metal=.8, rough=.25, coat=1)
REFLECT = mat('Lamp reflector', '#D9DDE0', metal=1, rough=.12, coat=1)
TAIL_RED = mat('Taillamp red', '#7A0508', rough=.08, coat=1, emit='#7A0000', strength=.4)
CLEAR = mat('Lamp clear', '#CDD3D8', metal=.9, rough=.08, coat=1)
PLATE = mat('Plate', '#EDEDED', rough=.5)
AMBER = mat('Repeater', '#D97A10', rough=.1, coat=1)
SMOKE = mat('Smoked lens', '#160A0B', rough=.05, coat=1)
LED_R = mat('LED red', '#FF2414', emit='#FF2414', strength=9)
LED_W = mat('LED white', '#FFFFFF', emit='#EAF2FF', strength=7)
TITANIUM = mat('Burnt titanium', '#77708C', metal=1, rough=.18)
BADGE_RED = mat('Badge red', '#9C0F12', metal=.6, rough=.15, coat=1)

VIEW = {   # look direction, horizontal axis, vertical axis
    'side': (Vector((0, -1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1))),    # car's left side: (x, z)
    'front': (Vector((-1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))),   # (y, z)
    'rear': (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))),     # (y, z)
    'top': (Vector((0, 0, -1)), Vector((1, 0, 0)), Vector((0, 1, 0))),    # (x, y)
}


def oblique(d):
    d = Vector(d).normalized(); u = Vector((0, 0, 1)).cross(d).normalized()
    return d, u, d.cross(u)


def cast(view, a, b):
    if view[0] == 'cyl':   # wrap-around view for corner parts: a = arc length around a vertical axis, b = z
        _, xc, yc, R = view; t = a / R
        loc, n, _, _ = BVH.ray_cast(Vector((xc, yc, b)), Vector((math.cos(t), math.sin(t), 0)), 3)
        return loc, n
    d, u, v = VIEW[view] if isinstance(view, str) else view
    loc, n, _, _ = BVH.ray_cast(u * a + v * b - d * 4, d, 8)
    return loc, n


def to_view(view, loc):
    """3D point -> 2D coordinates of `view` (inverse of cast)."""
    if view[0] == 'cyl':
        _, xc, yc, R = view
        return R * math.atan2(loc.y - yc, loc.x - xc), loc.z
    d, u, v = VIEW[view] if isinstance(view, str) else view
    return loc.dot(u), loc.dot(v)


def catmull(P, closed=True, step=.005):
    """Catmull-Rom through the points; repeat a point to make a sharp corner."""
    P = np.asarray(P, float); n = len(P); out = []
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = (P[(i + k) % n] if closed else P[min(max(i + k, 0), n - 1)] for k in (-1, 0, 1, 2))
        k = max(1, int(np.linalg.norm(p2 - p1) / step))
        for t in np.arange(k) / k:
            out.append(.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    if not closed: out.append(P[-1])
    out = np.array(out)
    keep = np.r_[True, np.linalg.norm(np.diff(out, axis=0), axis=1) > 1e-5]
    return out[keep]


def inside(pts, poly):
    x, y = pts[:, :1], pts[:, 1:]
    a, b = poly, np.roll(poly, -1, 0)
    c = ((a[:, 1] > y) != (b[:, 1] > y)) & (x < (b[:, 0] - a[:, 0]) * (y - a[:, 1]) / (b[:, 1] - a[:, 1] + 1e-12) + a[:, 0])
    return c.sum(1) % 2 == 1


def offset_poly(poly, d):
    """Move a closed outline inward by d (positive) along its averaged normals."""
    t = np.roll(poly, -1, 0) - np.roll(poly, 1, 0); t /= np.linalg.norm(t, axis=1)[:, None] + 1e-12
    n = np.stack([-t[:, 1], t[:, 0]], 1)
    area = np.sum(poly[:, 0] * np.roll(poly[:, 1], -1) - np.roll(poly[:, 0], -1) * poly[:, 1])
    return poly + n * d * (1 if area > 0 else -1)


def tri_fill(poly, step):
    lo, hi = poly.min(0), poly.max(0)
    g = np.stack(np.meshgrid(np.arange(lo[0] + step / 2, hi[0], step), np.arange(lo[1] + step / 2, hi[1], step)), -1).reshape(-1, 2)
    g = g[inside(g, poly)] if len(g) else g
    if len(g):
        kd = KDTree(len(poly))
        for i, p in enumerate(poly): kd.insert((p[0], p[1], 0), i)
        kd.balance()
        g = np.array([p for p in g if kd.find((p[0], p[1], 0))[2] > step * .45]).reshape(-1, 2)
    pts = np.concatenate([poly, g])
    vs, _, fs, *_ = geometry.delaunay_2d_cdt([Vector(p) for p in pts], [(i, (i + 1) % len(poly)) for i in range(len(poly))], [], 0, 1e-7)
    vs = np.array([tuple(v) for v in vs]); fs = np.array([f for f in fs if len(f) == 3])
    return vs, fs[inside(vs[fs].mean(1), poly)]


def lay(name, view, poly, m, off=.002, step=.012, mirror=True, solid=0.):
    """Fill a 2D outline in `view` and lay it on the body, `off` metres proud. Returns the object(s)."""
    vs, fs = tri_fill(poly, step)
    P = np.zeros((len(vs), 3)); N = np.zeros((len(vs), 3)); ok = np.ones(len(vs), bool)
    for i, (a, b) in enumerate(vs):
        loc, n = cast(view, a, b)
        if loc is None: ok[i] = False; continue
        P[i] = loc + n * off; N[i] = n
    fs = fs[ok[fs].all(1)]
    tn = np.cross(P[fs[:, 1]] - P[fs[:, 0]], P[fs[:, 2]] - P[fs[:, 0]])
    flip = (tn * N[fs].sum(1)).sum(1) < 0
    fs[flip] = fs[flip][:, ::-1]
    objs = [add_mesh(name, P, fs, m)]
    if mirror:
        objs.append(add_mesh(name + '.R', P * (1, -1, 1), fs[:, ::-1], m))
    if solid:
        for o in objs:
            s = o.modifiers.new('solid', 'SOLIDIFY'); s.thickness = solid; s.offset = -1
    return objs


def patch(name, view, ctrl, m, **kw):
    return lay(name, view, catmull(ctrl), m, **kw)


def anchor(view, a, b):
    """Surface point picked in a view; walks down a few mm if the pick floats just above the skin."""
    loc, _ = cast(view, a, b)
    for k in range(1, 7):
        if loc is not None: break
        loc, _ = cast(view, a, b - .005 * k)
    assert loc is not None, (view, a, b)
    return loc


def wrap(name, ctrl, view, m, **kw):
    """Outline from mixed-view picks [(view, a, b)], filled in `view` (usually a 'cyl' wrap view)."""
    P = np.array([to_view(view, anchor(*c)) for c in ctrl])
    P[:, 0] = np.unwrap(P[:, 0] / view[3]) * view[3] if view[0] == 'cyl' else P[:, 0]
    return lay(name, view, catmull(P), m, **kw)


def patch3(name, ctrl, d, m, **kw):
    """Outline given as mixed-view points [(view, a, b)], laid along oblique direction d."""
    ov = oblique(d); dd, u, v = ov
    pts = []
    for view, a, b in ctrl:
        loc, _ = cast(view, a, b)
        for k in range(1, 7):          # point floats just above the skin: walk it down a few mm
            if loc is not None: break
            loc, _ = cast(view, a, b - .005 * k)
            if loc is not None: print('note:', name, view, a, b, 'lowered', .005 * k)
        assert loc is not None, (name, view, a, b)
        pts.append((loc.dot(u), loc.dot(v)))
    return lay(name, ov, catmull(pts), m, **kw)


def strip(name, view, ctrl, m, width=.003, off=.0015, mirror=True, closed=False):
    """A thin band following the surface: panel gaps, mouldings."""
    P2 = catmull(ctrl, closed); L = []
    for a, b in P2:
        loc, n = cast(view, a, b)
        if loc is not None: L.append((loc, n))
    verts, faces = [], []
    for i, (loc, n) in enumerate(L):
        t = (L[min(i + 1, len(L) - 1)][0] - L[max(i - 1, 0)][0]).normalized()
        s = n.cross(t).normalized() * width / 2
        verts += [loc + n * off + s, loc + n * off - s]
        if i: faces.append((2 * i - 2, 2 * i - 1, 2 * i + 1, 2 * i))
    if closed: faces.append((2 * len(L) - 2, 2 * len(L) - 1, 1, 0))
    V2 = np.array([tuple(v) for v in verts]); F2 = np.array(faces)
    objs = [add_mesh(name, V2, F2, m)]
    if mirror: objs.append(add_mesh(name + '.R', V2 * (1, -1, 1), F2[:, ::-1], m))
    return objs


def rect(a0, a1, b0, b1, step=.005):
    """Sharp-cornered rectangle outline, densified so it follows the skin."""
    n = lambda L: max(2, int(L / step))
    e = [np.linspace((a0, b0), (a1, b0), n(a1 - a0), endpoint=False), np.linspace((a1, b0), (a1, b1), n(b1 - b0), endpoint=False),
         np.linspace((a1, b1), (a0, b1), n(a1 - a0), endpoint=False), np.linspace((a0, b1), (a0, b0), n(b1 - b0), endpoint=False)]
    return np.concatenate(e)


def sym(half):
    """Closed outline symmetric about y = 0 from its y >= 0 half, listed from the top centre clockwise."""
    return [(-a, b) for a, b in reversed(half) if a > 0] + list(half)


def blob(name, loc, size, m, rot=(0, 0, 0), segs=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=segs // 2, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(m); o.data.shade_smooth(); parts.append(o)
    return o


def pocket(name, view, poly, depth, m):
    """Recess: a cutter whose floor follows the skin `depth` behind it, subtracted with an exact boolean.
    The cut walls take the cutter's material."""
    d, u, v = VIEW[view] if isinstance(view, str) else view
    poly = catmull(poly, step=.008)
    vs, fs = tri_fill(poly, .02)
    back, front = [], []
    for a, b in vs:
        loc, _ = cast(view, a, b)
        p = u * a + v * b
        back.append((loc if loc is not None else p + d * 3.9) + d * depth)
        front.append(p - d * 4)
    nb, n = len(poly), len(vs)
    P = np.array([tuple(p) for p in back + front])
    faces = [tuple(f) for f in fs] + [tuple(int(i) + n for i in f[::-1]) for f in fs]
    faces += [(i, (i + 1) % nb, (i + 1) % nb + n, i + n) for i in range(nb)]
    me = bpy.data.meshes.new(name); me.from_pydata(P.tolist(), [], faces); me.validate()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    me.materials.append(m)
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    mod = body.modifiers.new(name, 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = o
    mod.solver = 'EXACT'; mod.material_mode = 'TRANSFER'
    return o


def mirror_y(poly):
    return [(-a, b) for a, b in reversed(poly)]


FOG = [(.33, .372), (.40, .443), (.70, .438), (.733, .37), (.718, .302), (.322, .302)]
cutters = [pocket('Grille', 'front', sym([(0, .711), (.368, .699), (.368, .627), (.23, .547), (0, .547)]), .035, MATTE),
           pocket('Lower intake', 'front', sym([(0, .368), (.298, .368), (.333, .227), (0, .227)]), .045, MATTE),
           pocket('Fog housing', 'front', FOG, .03, MATTE), pocket('Fog housing.R', 'front', mirror_y(FOG), .03, MATTE),
           pocket('Plate recess', 'rear', sym([(0, .905), (.29, .905), (.27, .755), (0, .755)]), .015, PAINT)]
bpy.context.view_layer.objects.active = body
for o in bpy.context.selected_objects: o.select_set(False)
body.select_set(True)
for mod in list(body.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
for o in cutters: bpy.data.objects.remove(o)
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
BVH = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
print('pockets cut', len(body.data.polygons), 'faces')

def slab(name, prof, y0, y1, m, bevel=.004):
    """Polygon in the xz-plane extruded between y0 and y1."""
    bm = bmesh.new()
    a = [bm.verts.new((x, y0, z)) for x, z in prof]; b = [bm.verts.new((x, y1, z)) for x, z in prof]
    bm.faces.new(a); bm.faces.new(b[::-1])
    for i in range(len(a)):
        j = (i + 1) % len(a); bm.faces.new((a[i], b[i], b[j], a[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o); me.materials.append(m)
    if bevel:
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 3
    me.shade_smooth(); parts.append(o)
    return o


# glass and pillars (side view, owner's photo)
DLO = [(.985, .983), (.985, .983), (.65, .993), (0.0, 1.026), (-.5, 1.057), (-.97, 1.094), (-1.20, 1.15), (-1.40, 1.205), (-1.40, 1.205),
       (-1.30, 1.27), (-1.15, 1.345), (-1.0, 1.388), (-.6, 1.436), (-.2, 1.446), (.1, 1.432), (.3, 1.362), (.5, 1.258), (.7, 1.132), (.88, 1.03)]
dlo = catmull(DLO)
lay('Window frame', 'side', dlo, TRIM, off=.0025, step=.007)
lay('Side glass', 'side', offset_poly(dlo, .014), GLASS, off=.0035, step=.007)
patch('B-pillar', 'side', [(-.195, 1.03), (-.30, 1.035), (-.29, 1.448), (-.185, 1.446)], TRIM, off=.0035)
patch('Quarter divider', 'side', [(-.905, 1.09), (-.935, 1.092), (-.95, 1.39), (-.92, 1.392)], TRIM, off=.0035)
patch('Mirror sail', 'side', [(.985, .983), (.84, .99), (.86, 1.07)], TRIM, off=.0035)
strip('Belt moulding', 'side', [(.86, .993), (.65, .9965), (0.0, 1.029), (-.5, 1.06), (-.97, 1.097)], CHROME, width=.008, off=.003)
# windshield and backlight (front / rear views, blueprint)
patch('Windshield', 'front', sym([(0, 1.398), (.45, 1.395), (.578, 1.384), (.64, 1.25), (.69, 1.12), (.70, 1.045), (.55, 1.04), (0, 1.038)]),
      GLASS, off=.002, mirror=False)
patch('Cowl', 'front', sym([(0, 1.038), (.69, 1.043), (.72, 1.02), (0, 1.008)]), MATTE, off=.0015, mirror=False)
patch('Backlight', 'rear', sym([(0, 1.432), (.50, 1.428), (.56, 1.33), (.61, 1.205), (.40, 1.200), (0, 1.199)]), GLASS, off=.002, mirror=False)

# panel gaps
GAP = MATTE
strip('Gap front door', 'side', [(.885, .985), (.915, .88), (.925, .65), (.92, .42), (.90, .335)], GAP)
strip('Gap B-pillar', 'side', [(-.215, 1.03), (-.21, .60), (-.20, .32)], GAP)
strip('Gap rear door', 'side', [(-1.267, 1.10), (-1.24, 1.0), (-1.167, .893), (-1.0, .66), (-.86, .45), (-.80, .375), (-.72, .31)], GAP)
strip('Gap front bumper', 'side', [(1.76, .74), (1.66, .65), (1.585, .585)], GAP)
strip('Gap rear bumper', 'side', [(-1.84, .915), (-1.72, .76), (-1.635, .63)], GAP)
strip('Gap hood', 'top', [(1.09, .705), (1.35, .735), (1.60, .755), (1.70, .745)], GAP)
strip('Gap boot', 'top', [(-1.64, .60), (-1.85, .65), (-2.05, .64), (-2.13, .58)], GAP)
strip('Fuel lid', 'side', [(-1.345, 1.04), (-1.36, 1.115), (-1.445, 1.122), (-1.535, 1.115), (-1.55, 1.04), (-1.535, .963), (-1.445, .956), (-1.36, .963)],
      GAP, mirror=False, closed=True)
patch('Side repeater', 'side', [(1.065, .79), (1.03, .80), (.995, .79), (1.03, .78)], AMBER, off=.003)

# front: headlamps wrap the corner, so they are filled in a cylindrical view around an axis behind them
HV = ('cyl', 1.72, .33, .45)
HEAD = [('front', .375, .628), ('front', .55, .633), ('front', .70, .652), ('side', 1.89, .694), ('side', 1.73, .756), ('side', 1.635, .812),
        ('side', 1.635, .812), ('side', 1.75, .802), ('side', 1.88, .79), ('front', .72, .785), ('front', .55, .757), ('front', .45, .735), ('front', .375, .705)]
wrap('Headlamp', HEAD, HV, HOUSING if MOD else REFLECT, off=.003, step=.006)


def disc(name, view, at, r, m, off, n=20):
    c = np.array(to_view(view, anchor(*at)))
    lay(name, view, c + r * np.stack([np.cos(np.linspace(0, 2 * math.pi, n, endpoint=False)), np.sin(np.linspace(0, 2 * math.pi, n, endpoint=False))], 1), m, off=off, step=.006)


def line(name, view, picks, m, **kw):
    P = np.array([to_view(view, anchor(*p)) for p in picks])
    if view[0] == 'cyl': P[:, 0] = np.unwrap(P[:, 0] / view[3]) * view[3]
    strip(name, view, P, m, **kw)


if MOD:   # owner's projector units: two chrome-ringed projectors, LED U-guides and a lower LED strip
    for i, (y, z) in enumerate(((.505, .703), (.635, .717))):
        disc(f'Projector ring {i}', HV, ('front', y, z), .036, CHROME, .004)
        disc(f'Projector lens {i}', HV, ('front', y, z), .025, GLASS, .006)
        line(f'LED guide {i}', HV, [('front', y - .042, z + .012), ('front', y - .03, z - .03), ('front', y + .03, z - .03), ('front', y + .042, z + .012)], LED_W, width=.006, off=.005)
    line('LED strip', HV, [('front', .39, .64), ('front', .55, .645), ('front', .70, .665), ('side', 1.85, .705), ('side', 1.73, .765)], LED_W, width=.007, off=.005)
else:     # stock: chrome reflector with a projector bowl and a dark visor along the top
    disc('Projector', HV, ('front', .60, .705), .034, HOUSING, .005)

BAR = sym([(0, .683), (.20, .688), (.36, .695), (.36, .645), (.20, .62), (0, .605)])
patch('Wing bar', 'front', BAR, TRIM if MOD else CHROME, off=.022, mirror=False, solid=.014)
patch('H badge', 'front', sym([(0, .688), (.04, .686), (.05, .67), (.045, .615), (0, .606)]), BADGE_RED if MOD else CHROME, off=.032, mirror=False, solid=.006)
if not MOD:
    lay('Fog lamp', 'front', catmull([(.62 + .045 * math.cos(a), .383 + .045 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 12, endpoint=False)]), CLEAR, off=.004)

# rear: taillamps wrap the corner too
TV = ('cyl', -1.78, .40, .45)
TAIL = [('rear', .25, .946), ('rear', .35, .857), ('rear', .55, .861), ('rear', .70, .868), ('side', -2.10, .921), ('side', -1.95, .918),
        ('side', -1.83, .93), ('side', -1.76, .995), ('side', -1.76, .995), ('side', -1.85, 1.006), ('side', -2.0, 1.013), ('side', -2.12, 1.02),
        ('rear', .68, 1.035), ('rear', .575, 1.046), ('rear', .41, 1.0)]
wrap('Taillamp', TAIL, TV, SMOKE if MOD else TAIL_RED, off=.003, step=.006)
line('Lamp split', 'rear', [('rear', .465, 1.012), ('rear', .47, .86)], MATTE, width=.004, off=.004)
if MOD:   # Urus-style: twin LED bars across both halves, forking at the outer end
    for zz, tip in ((.958, (.705, .995)), (.932, (.715, .884))):
        line('LED bar inner', 'rear', [('rear', .28, zz), ('rear', .455, zz)], LED_R, width=.011, off=.005)
        line('LED bar outer', TV, [('rear', .48, zz), ('rear', .63, zz), ('rear', tip[0], tip[1])], LED_R, width=.011, off=.005)
else:
    line('Reverse lamp', 'rear', [('rear', .29, .93), ('rear', .40, .925)], CLEAR, width=.03, off=.004)
    patch('Garnish', 'rear', sym([(0, .985), (.27, .975), (.25, .955), (0, .962)]), CHROME, off=.003, mirror=False, solid=.004)
patch('Reflector', 'rear', [(.60, .372), (.70, .37), (.70, .405), (.60, .408)], TAIL_RED, off=.002)
strip('Gap boot lid', 'rear', [(.255, .94), (.29, .86), (.31, .74), (.20, .715), (0, .712)], MATTE)
# mirrors, handles, antenna
for s_ in (1, -1):
    blob('Mirror', (.80, s_ * .895, 1.055), (.085, .125, .072), PAINT, rot=(0, math.radians(-4), s_ * math.radians(-10)))
    blob('Mirror glass', (.735, s_ * .90, 1.055), (.012, .11, .058), GLASS, rot=(0, 0, s_ * math.radians(-10)))
    blob('Mirror base', (.86, s_ * .80, 1.0), (.07, .05, .03), TRIM)
    for x, z in ((-.042, .925), (-1.067, 1.02)):
        loc, n = cast('side', x, z)
        blob('Handle', loc * Vector((1, s_, 1)) + Vector((0, s_ * .012, 0)), (.062, .016, .017), CHROME if not MOD else PAINT)
loc, _ = cast('top', -1.08, 0)
fin = slab('Shark fin', [(-.98, -.01), (-1.17, -.01), (-1.15, .02), (-1.06, .055), (-1.00, .045)], -.024, .024, TRIM, bevel=.008)
fin.location = (0, 0, loc.z)


def decal(name, view, a0, a1, b0, b1, img, off=.0025):
    """Image laid on the skin over a view rectangle, UV-mapped to the rectangle."""
    m = bpy.data.materials.new(name)
    bsdf = m.node_tree.nodes['Principled BSDF']; tex = m.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'decals', img))
    m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color']); m.node_tree.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    bsdf.inputs['Roughness'].default_value = .45
    vs, fs = tri_fill(np.array([(a0, b0), (a1, b0), (a1, b1), (a0, b1)]), .01)
    P = []
    for a, b in vs:
        loc, n = cast(view, a, b); P.append(tuple(loc + n * off))
    o = add_mesh(name, np.array(P), fs, m)
    uv = o.data.uv_layers.new(name='UV')
    li = np.zeros(len(o.data.loops), np.int32); o.data.loops.foreach_get('vertex_index', li)
    UV = np.stack([(vs[:, 0] - a0) / (a1 - a0), (vs[:, 1] - b0) / (b1 - b0)], 1)[li]
    if view == 'side': UV[:, 0] = 1 - UV[:, 0]          # side view runs front -> back, image reads left -> right
    uv.data.foreach_set('uv', UV.ravel().astype(np.float32))
    return o


if MOD:
    # Mugen-style wing: two plate uprights on the boot lid, blade with upturned ends (photos 02, 04, 06, 09)
    for s_ in (1, -1):
        zb = cast('top', -1.86, s_ * .42)[0].z - .01
        slab('Wing upright', [(-1.78, zb), (-2.00, zb), (-2.08, 1.365), (-1.93, 1.365)], s_ * .42 - .011, s_ * .42 + .011, PAINT)
        slab('Wing endplate', [(-1.89, 1.365), (-2.16, 1.365), (-2.165, 1.445), (-1.99, 1.425)], s_ * .62 - .007, s_ * .62 + .007, PAINT)
    slab('Wing blade', [(-1.88, 1.378), (-1.92, 1.392), (-2.01, 1.397), (-2.11, 1.40), (-2.145, 1.416), (-2.155, 1.402), (-2.07, 1.379), (-1.94, 1.370)],
         -.62, .62, PAINT, bevel=.003)
    # twin burnt-titanium tips, left side under the bumper (photos 02, 06, 07)
    for y in (.40, .485):
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=.04, depth=.16, location=(-2.13, y, .285), rotation=(0, math.radians(92), 0))
        t = bpy.context.active_object; t.name = 'Exhaust tip'; t.data.materials.append(TITANIUM); t.data.shade_smooth()
        sol = t.modifiers.new('wall', 'SOLIDIFY'); sol.thickness = .003; parts.append(t)
    # blank plates (the real ones are blurred in every photo)
    lay('Front plate', 'front', rect(-.25, .25, .405, .525), PLATE, off=.006, mirror=False, solid=.004)
    lay('Rear plate', 'rear', rect(-.25, .25, .77, .89), PLATE, off=.004, mirror=False, solid=.004)
    decal('Windshield banner', 'front', -.46, .46, 1.325, 1.39, 'windshield_banner.png', off=.004)

# --- wheels: revolved profiles around the axle (local Y = axle, +Y = outer face) ---
def revolve(name, prof, m, steps=72):
    bm = bmesh.new()
    vs = [bm.verts.new((r, w, 0)) for r, w in prof]
    es = [bm.edges.new((a, b)) for a, b in zip(vs, vs[1:])]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 1, 0), angle=2 * math.pi, steps=steps, use_merge=True)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.shade_smooth()
    o = bpy.data.objects.new(name, me); me.materials.append(m)
    return o


def box_mesh(name, size, m):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); me.materials.append(m)
    return o


R_TYRE = S.WHEEL_Z
if MOD:   # 205/45 R17 on the owner's 17" wheels
    TYRE_P = [(.214, -.092), (.236, -.101), (.272, -.103), (.296, -.097), (.303, -.08), (.306, -.05), (R_TYRE, 0),
              (.306, .05), (.303, .08), (.296, .097), (.272, .103), (.236, .101), (.214, .092)]
    RIM_P = [(.198, -.088), (.202, .064), (.216, .070), (.218, .082), (.209, .088), (.201, .078)]
else:     # 175/65 R15
    TYRE_P = [(.192, -.078), (.22, -.086), (.262, -.088), (.290, -.084), (.300, -.073), (.304, -.05), (R_TYRE, 0),
              (.304, .05), (.300, .073), (.290, .084), (.262, .088), (.22, .086), (.192, .078)]
    RIM_P = [(.172, -.075), (.176, .060), (.196, .066), (.198, .075), (.190, .080), (.182, .072)]


def bar(objs, p0, p1, w, depth, y):
    """Spoke as a box from p0 to p1 in the wheel plane (x, z), outer face at y."""
    d = (p1[0] - p0[0], p1[1] - p0[1]); L = math.hypot(*d)
    b = box_mesh('Spoke', (L + w * .5, depth, w), RIM)
    b.location = ((p0[0] + p1[0]) / 2, y, (p0[1] + p1[1]) / 2); b.rotation_euler = (0, -math.atan2(d[1], d[0]), 0)
    objs.append(b)


def wheel_parts():
    """One wheel at the origin, outer face +Y. Returns objects to be joined."""
    objs = [revolve('Tyre', TYRE_P, TYRE), revolve('Rim', RIM_P, RIM)]
    rd = .145 if MOD else .135
    objs.append(revolve('Disc', [(.06, -.03), (rd, -.03), (rd, -.008), (.06, -.008)], DISC, 48))
    objs.append(revolve('Hub', [(.0, .066), (.045, .066), (.058, .06), (.058, .04)], RIM, 48))
    P = lambda r, a: (r * math.cos(a), r * math.sin(a))
    if MOD:   # five Y-spokes: a trunk that forks near the lip
        for i in range(5):
            a = math.radians(90 + i * 72)
            bar(objs, P(.055, a), P(.115, a), .03, .026, .058)
            for f in (-1, 1):
                bar(objs, P(.105, a), P(.205, a + f * math.radians(13)), .019, .022, .062)
    else:     # stock: eight twin spokes
        for i in range(8):
            for f in (-1, 1):
                a = math.radians(i * 45) + f * math.radians(5.5)
                bar(objs, P(.055, a), P(.185, a), .017, .024, .056)
    cal = box_mesh('Caliper', (.055, .04, .095), CALIPER); cal.location = (-.115, -.008, .07); cal.rotation_euler = (0, math.radians(30), 0)
    objs.append(cal)
    return objs


TRACK_F, TRACK_R = 1.475, 1.465
for ax, track in zip(S.AXLES, (TRACK_F, TRACK_R)):
    for side in (1, -1):
        objs = wheel_parts()
        for o in objs:
            scene.collection.objects.link(o)
            o.location = Vector(o.location) * Vector((1, side, 1)) + Vector((ax, side * track / 2, R_TYRE))
            if side < 0: o.scale = (1, -1, 1)   # mirror across XZ; rotations about Y commute with it
        bpy.context.view_layer.objects.active = objs[0]
        for o in bpy.context.selected_objects: o.select_set(False)
        for o in objs: o.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        bpy.ops.object.join(); w = bpy.context.active_object; w.name = 'Wheel'
        parts.append(w)

# --- export (optional CITY_DECIMATE ratio; renders below show exactly what ships) ---
if os.environ.get('CITY_DECIMATE'):
    dec = body.modifiers.new('web', 'DECIMATE'); dec.ratio = float(os.environ['CITY_DECIMATE'])
for o in bpy.context.selected_objects: o.select_set(False)
for o in parts: o.select_set(True)
name = 'honda-city' if MOD else 'honda-city-stock'
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_selection=True,
                          export_apply=True, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('GLB', os.path.getsize(os.path.join(OUT, name + '.glb')) // 1024, 'KB')

# --- renders: studio light; ortho views share the 300 px/m mapping used by the reference grids ---
world = bpy.data.worlds.new('World'); scene.world = world
nt = world.node_tree; bg = nt.nodes['Background']
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); ramp = nt.nodes.new('ShaderNodeValToRGB')
nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], ramp.inputs[0]); nt.links.new(ramp.outputs[0], bg.inputs[0])
ramp.color_ramp.elements[0].position = .48; ramp.color_ramp.elements[0].color = (*lin('#2A2C2F'), 1)
ramp.color_ramp.elements[1].position = .62; ramp.color_ramp.elements[1].color = (*lin('#D8DCE0'), 1)
bg.inputs[1].default_value = 1.0
for loc, energy, size in (((0, 0, 6), 1500, 6), ((5, 6, 3), 900, 4), ((-6, -5, 3), 600, 4)):
    l = bpy.data.lights.new('Area', 'AREA'); l.energy = energy; l.size = size
    lo = bpy.data.objects.new('Area', l); lo.location = loc; scene.collection.objects.link(lo)
    lo.rotation_euler = (Vector((0, 0, .6)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
floor = bpy.data.meshes.new('Floor'); fo = bpy.data.objects.new('Floor', floor); scene.collection.objects.link(fo)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=20); bm.to_mesh(floor); bm.free()
floor.materials.append(mat('Floor', '#202225', rough=.7)); fo.is_shadow_catcher = False

cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); scene.collection.objects.link(cam); scene.camera = cam
scene.render.engine = 'BLENDER_EEVEE'
try: scene.eevee.use_raytracing = True
except Exception: pass
scene.eevee.taa_render_samples = 48
scene.view_settings.view_transform = 'AgX'


def shoot(tag, loc, target, ortho=0., res=(1400, 820), transparent=False, lens=50):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO' if ortho else 'PERSP'
    if ortho: cam.data.ortho_scale = ortho
    else: cam.data.lens = lens
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.film_transparent = transparent; fo.hide_render = transparent
    scene.render.filepath = os.path.join(RENDERS, f'{MODE}_{tag}.png')
    bpy.ops.render.render(write_still=True)


SHOTS = {
    'front34': lambda: shoot('front34', (5.6, 4.6, 1.45), (0, 0, .62)),
    'rear34': lambda: shoot('rear34', (-5.6, 4.6, 1.6), (0, 0, .7)),
    # 300 px/m: x in [-2.5, 2.5], z in [-0.05, 1.70]
    'side': lambda: shoot('side', (0, 12, .825), (0, 0, .825), ortho=5.0, res=(1500, 525), transparent=True),
    # y in [-1.0, 1.0], z in [-0.05, 1.70]
    'front': lambda: shoot('front', (12, 0, .825), (0, 0, .825), ortho=2.0, res=(600, 525), transparent=True),
    'rear': lambda: shoot('rear', (-12, 0, .825), (0, 0, .825), ortho=2.0, res=(600, 525), transparent=True),
    'top': lambda: shoot('top', (0, 0, 12), (0, 0, 0), ortho=5.0, res=(1500, 600), transparent=True),
    'poster': lambda: shoot('poster', (5.2, 4.3, 1.55), (-.05, 0, .62), res=(1600, 1000), transparent=True, lens=42),
    'nose': lambda: shoot('nose', (3.9, 2.3, .95), (1.85, .35, .55), lens=55),
    'tail': lambda: shoot('tail', (-3.9, 2.3, 1.05), (-1.9, .35, .75), lens=55),
    'frontp': lambda: shoot('frontp', (7, 0, .9), (0, 0, .62), lens=70),
    'rearp': lambda: shoot('rearp', (-7, 0, 1.0), (0, 0, .7), lens=70),
    # owner's photo 08 (front-left three-quarter, low) and 07 (rear-left three-quarter)
    'photo08': lambda: shoot('photo08', (4.6, 3.3, .75), (.9, .25, .62), lens=35),
}
def shoot_matched(tag, c):
    """Camera solved from a reference photo (scratch tooling passes these in via CITY_CAMS)."""
    loc, tgt, up = Vector(c['loc']), Vector(c['target']), Vector(c['up'])
    f = (tgt - loc).normalized(); r = f.cross(up).normalized(); u = r.cross(f)
    from mathutils import Matrix
    cam.matrix_world = Matrix(((r.x, u.x, -f.x, loc.x), (r.y, u.y, -f.y, loc.y), (r.z, u.z, -f.z, loc.z), (0, 0, 0, 1)))
    cam.data.type = 'PERSP'; cam.data.lens = c['lens_mm']; cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36
    scene.render.resolution_x, scene.render.resolution_y = c['res']
    scene.render.film_transparent = True; fo.hide_render = True
    scene.render.filepath = os.path.join(RENDERS, f'{MODE}_{tag}.png')
    bpy.ops.render.render(write_still=True)


import json
CAMS = json.load(open(os.environ['CITY_CAMS'])) if os.environ.get('CITY_CAMS') else {}
for v in VIEWS:
    SHOTS[v]() if v in SHOTS else shoot_matched(v, CAMS[v])
print('DONE')
