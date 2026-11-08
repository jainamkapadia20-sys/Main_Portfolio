# Builds the city for the projects drive and saves it to city/out/city.blend.
#   "D:/Blender/blender.exe" -b --factory-startup -P build.py
# A straight two-way boulevard (two lanes each way) through a city: pavements with tiled stone and kerbs, street
# lamps, trees, two crossroads with signals and zebra crossings, a bus shelter, shops with lit signs at street level,
# and buildings of four kinds (glass towers, plaster flats with balconies, brick, concrete) whose windows light up at
# night, then taller towers behind and a downtown skyline at the end of the road. One billboard per project stands on
# the pavement, alternating sides, turned toward the spot where the car stops for it. Real car models (CC BY 4.0, credited on
# the site's /credits page) make up the traffic. Everything that differs between day and night reads the scene property "night"
# (0 or 1), set by render.py, so one file renders both.
import bpy, math, os, random, sys
from mathutils import Vector, Matrix, Euler

HERE = 'D:/Main Portfolio/city'
sys.path.insert(0, HERE)
import drive as D

OUT = f'{HERE}/out'
CARS = 'D:/Main Portfolio/car3d'
rng = random.Random(20261107)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc['night'] = 1.0
vl = bpy.context.view_layer
vl['night'] = 1.0

# ---------- layout ----------
HALF = 2 * D.LANE                  # 7.0: the carriageway's half width (two lanes each way)
KERB_H = 0.15
FACADE = 14.5                      # building fronts stand this far from the centre line
Y0, Y1 = -160.0, 1500.0            # how far the road runs
CROSS = [73.0, 209.0]              # crossroads: centre y of each cross street
CROSS_HALF = 6.0                   # half width of a cross street's carriageway
CROSS_WALK = 4.0                   # its pavements

def in_cross(y, pad=0.0): return any(abs(y - c) < CROSS_HALF + pad for c in CROSS)

def near_board(y, s, before=22.0, after=5.0):
    """True where something on side s would stand between the car and a billboard on that side."""
    return any(D.side(i) == s and D.board_y(i) - before < y < D.board_y(i) + after for i in range(D.N_BOARDS))

# ---------- collections ----------
def collection(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent or sc.collection).children.link(c)
    return c

C_ROAD, C_BUILD, C_STREET, C_BOARDS, C_TRAFFIC, C_LIGHTS = (collection(n) for n in ('Road', 'Buildings', 'Street', 'Billboards', 'Traffic', 'Lights'))
C_CARSRC = collection('CarModels')

# ---------- node helpers ----------
class Nodes:
    def __init__(self, tree): self.t = tree; tree.nodes.clear()
    def n(self, kind, **kw):
        node = self.t.nodes.new(kind)
        for k, v in kw.items():
            if hasattr(node, k): setattr(node, k, v)
            else: self.set(node.inputs[k], v)
        return node
    def set(self, sock, v):
        if isinstance(v, bpy.types.NodeSocket): self.t.links.new(v, sock)
        else: sock.default_value = v
    def link(self, a, b): self.t.links.new(a, b)
    def math(self, op, a, b=0.0, c=0.0, clamp=False):
        node = self.t.nodes.new('ShaderNodeMath'); node.operation = op; node.use_clamp = clamp
        for s, v in zip(node.inputs, (a, b, c)): self.set(s, v)
        return node.outputs[0]
    def vmath(self, op, a, b=(0, 0, 0)):
        node = self.t.nodes.new('ShaderNodeVectorMath'); node.operation = op
        self.set(node.inputs[0], a); self.set(node.inputs[1], b)
        return node.outputs['Value'] if op in ('LENGTH', 'DOT_PRODUCT', 'DISTANCE') else node.outputs['Vector']
    def mix(self, fac, a, b, blend='MIX'):
        node = self.t.nodes.new('ShaderNodeMix'); node.data_type = 'RGBA'; node.blend_type = blend
        self.set(node.inputs['Factor'], fac)
        self.set([s for s in node.inputs if s.identifier == 'A_Color'][0], a)
        self.set([s for s in node.inputs if s.identifier == 'B_Color'][0], b)
        return [s for s in node.outputs if s.identifier == 'Result_Color'][0]
    def lerp(self, fac, a, b):   # floats
        node = self.t.nodes.new('ShaderNodeMix'); node.data_type = 'FLOAT'
        self.set(node.inputs['Factor'], fac)
        self.set([s for s in node.inputs if s.identifier == 'A_Float'][0], a)
        self.set([s for s in node.inputs if s.identifier == 'B_Float'][0], b)
        return [s for s in node.outputs if s.identifier == 'Result_Float'][0]
    def xyz(self, v):
        node = self.t.nodes.new('ShaderNodeSeparateXYZ'); self.set(node.inputs[0], v); return node.outputs
    def combine(self, x, y, z):
        node = self.t.nodes.new('ShaderNodeCombineXYZ')
        for s, v in zip(node.inputs, (x, y, z)): self.set(s, v)
        return node.outputs[0]
    def attr(self, name, kind='OBJECT'):
        node = self.t.nodes.new('ShaderNodeAttribute'); node.attribute_type = kind; node.attribute_name = name
        return node.outputs['Fac']
    def night(self): return self.attr('night', 'VIEW_LAYER')
    def noise(self, vec, scale, detail=2.0, rough=0.5):
        node = self.n('ShaderNodeTexNoise', Scale=scale, Detail=detail, Roughness=rough)
        self.set(node.inputs['Vector'], vec)
        return node.outputs['Fac']
    def white(self, vec, w=None):
        node = self.t.nodes.new('ShaderNodeTexWhiteNoise'); node.noise_dimensions = '4D' if w is not None else '3D'
        self.set(node.inputs['Vector'], vec)
        if w is not None: self.set(node.inputs['W'], w)
        return node.outputs['Value']
    def step(self, edge, x): return self.math('GREATER_THAN', x, edge)
    def bsdf(self, **kw):
        node = self.t.nodes.new('ShaderNodeBsdfPrincipled')
        for k, v in kw.items(): self.set(node.inputs[k], v)
        return node
    def out(self, shader, volume=None):
        o = self.t.nodes.new('ShaderNodeOutputMaterial'); self.link(shader.outputs[0] if hasattr(shader, 'outputs') else shader, o.inputs['Surface'])
        return o

def material(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, Nodes(m.node_tree)

def obj_coords(N):
    tc = N.n('ShaderNodeTexCoord'); return tc.outputs['Object']

# ---------- materials ----------
def m_simple(name, color, rough=0.5, metal=0.0, emit=None, emit_night=0.0, emit_day=0.0, spec=0.5):
    m, N = material(name)
    kw = dict(**{'Base Color': (*color, 1), 'Roughness': rough, 'Metallic': metal, 'Specular IOR Level': spec})
    b = N.bsdf(**kw)
    if emit is not None:
        N.set(b.inputs['Emission Color'], (*emit, 1))
        N.set(b.inputs['Emission Strength'], N.lerp(N.night(), emit_day, emit_night))
    N.out(b)
    return m

def m_asphalt():
    m, N = material('Asphalt')
    p = obj_coords(N)
    night = N.night()
    big = N.noise(p, 0.35, 3.0)
    fine = N.noise(p, 45.0, 4.0, 0.6)
    tone = N.math('MULTIPLY_ADD', big, 0.5, 0.75)
    base_day = N.mix(fine, (0.085, 0.085, 0.088, 1), (0.12, 0.118, 0.115, 1))
    base_night = N.mix(fine, (0.030, 0.030, 0.032, 1), (0.048, 0.048, 0.05, 1))
    base = N.mix(night, base_day, base_night)
    base = N.mix(1.0, base, N.combine(tone, tone, tone), 'MULTIPLY')
    px, py, pz = N.xyz(p)
    lane_u = N.math('FRACT', N.math('DIVIDE', N.math('ADD', px, 7.0), 3.5))            # 0..1 across each lane
    track = N.math('MAXIMUM', N.math('SUBTRACT', 1.0, N.math('MULTIPLY', N.math('ABSOLUTE', N.math('SUBTRACT', lane_u, 0.27)), 9.0), clamp=True),
                   N.math('SUBTRACT', 1.0, N.math('MULTIPLY', N.math('ABSOLUTE', N.math('SUBTRACT', lane_u, 0.73)), 9.0), clamp=True))
    track = N.math('MULTIPLY', track, N.math('MULTIPLY_ADD', N.noise(p, 0.8, 2.0), 0.6, 0.4))
    base = N.mix(N.math('MULTIPLY', track, 0.45), base, (0.02, 0.02, 0.021, 1))
    # wet at night: low roughness, with puddles almost mirror-like; dusty and rough by day
    puddle = N.math('SMOOTH_MIN', 1.0, N.math('MULTIPLY', N.math('SUBTRACT', N.noise(p, 0.18, 2.0), 0.47), 9.0), 0.2)
    puddle = N.math('MAXIMUM', puddle, 0.0)
    rough_night = N.math('MULTIPLY_ADD', puddle, -0.13, 0.16)
    rough_night = N.math('SUBTRACT', rough_night, N.math('MULTIPLY', track, 0.08))
    rough = N.lerp(night, 0.86, rough_night)
    bump = N.n('ShaderNodeBump', Distance=0.02)
    N.set(bump.inputs['Strength'], N.lerp(night, 0.25, 0.05))   # water fills the grain at night: no sparkle
    N.set(bump.inputs['Height'], fine)
    b = N.bsdf(**{'Base Color': base, 'Roughness': rough, 'Normal': bump.outputs[0], 'Specular IOR Level': N.lerp(night, 0.5, 0.75)})
    N.out(b)
    return m

def m_paving():
    m, N = material('Paving')
    p = obj_coords(N)
    night = N.night()
    brick = N.n('ShaderNodeTexBrick', offset=0.5, squash=1.0, **{'Scale': 1.0, 'Mortar Size': 0.012, 'Brick Width': 0.6, 'Row Height': 0.6, 'Bias': 0.0})
    N.set(brick.inputs['Vector'], p)
    N.set(brick.inputs['Color1'], (0.30, 0.30, 0.29, 1)); N.set(brick.inputs['Color2'], (0.36, 0.355, 0.345, 1)); N.set(brick.inputs['Mortar'], (0.12, 0.12, 0.12, 1))
    dirt = N.noise(p, 1.2, 3.0)
    col = N.mix(N.math('MULTIPLY', dirt, 0.35), brick.outputs['Color'], (0.18, 0.18, 0.17, 1))
    col = N.mix(night, col, N.mix(1.0, col, (0.55, 0.55, 0.58, 1), 'MULTIPLY'))
    rough = N.lerp(night, 0.82, 0.3)
    bump = N.n('ShaderNodeBump', Strength=0.6, Distance=0.01)
    N.set(bump.inputs['Height'], brick.outputs['Fac'])
    N.out(N.bsdf(**{'Base Color': col, 'Roughness': rough, 'Normal': bump.outputs[0]}))
    return m

def m_facade(name, wall, bay, floor_h, mx, my0, my1, glass, lit_lo, lit_hi, cool=0.25, curtain=False, brick=False, ground=4.6, panels=False):
    """Walls with a grid of windows. Each window's light at night is random per building, floor and bay."""
    m, N = material(name)
    p = obj_coords(N)
    x, y, z = N.xyz(p)
    geo = N.n('ShaderNodeNewGeometry')
    nx, ny, nz = N.xyz(geo.outputs['Normal'])
    along_y = N.step(0.5, N.math('ABSOLUTE', nx))
    u = N.lerp(along_y, x, y)                         # the facade's own horizontal coordinate
    v = N.math('SUBTRACT', z, ground)
    cu = N.math('DIVIDE', u, bay); cv = N.math('DIVIDE', v, floor_h)
    fu = N.math('FRACT', cu); fv = N.math('FRACT', cv)
    inu = N.math('MULTIPLY', N.step(mx, fu), N.step(fu, 1 - mx))
    inv = N.math('MULTIPLY', N.step(my0, fv), N.step(fv, my1))
    h = N.attr('h')
    band = N.math('MULTIPLY', N.step(0.2, v), N.step(N.math('ADD', z, 1.4), h))
    side = N.math('SUBTRACT', 1.0, N.step(0.5, N.math('ABSOLUTE', nz)))
    win = N.math('MULTIPLY', N.math('MULTIPLY', inu, inv), N.math('MULTIPLY', band, side))
    # a window's identity: its bay, its floor, this building
    info = N.n('ShaderNodeObjectInfo')
    rnd = info.outputs['Random']
    group = 3.0 if curtain else 1.0
    cell = N.combine(N.math('FLOOR', N.math('DIVIDE', cu, group)), N.math('FLOOR', cv), N.math('MULTIPLY', rnd, 97.0))
    r1 = N.white(cell, 0.3); r2 = N.white(cell, 1.7); r3 = N.white(cell, 3.1)
    ratio = N.math('MULTIPLY_ADD', N.white(N.combine(rnd, 0.5, 0.5), 7.0), lit_hi - lit_lo, lit_lo)
    on = N.math('MULTIPLY', N.step(N.math('SUBTRACT', 1.0, ratio), r1), win)
    night = N.night()
    warm = (1.0, 0.58, 0.27, 1); coolc = (0.72, 0.84, 1.0, 1)
    lamp = N.mix(N.step(1 - cool, r2), warm, coolc)
    blinds = N.lerp(N.step(0.7, N.white(cell, 5.3)), 1.0, 0.3)            # some lit rooms are behind blinds
    ceiling = N.math('MULTIPLY_ADD', N.math('DIVIDE', N.math('SUBTRACT', fv, my0), my1 - my0), 0.7, 0.45)   # rooms are lit from above
    strength = N.math('MULTIPLY', N.math('MULTIPLY', N.math('MULTIPLY_ADD', r3, 0.9, 0.18), N.math('MULTIPLY', blinds, ceiling)), N.math('MULTIPLY', on, night))
    if curtain:   # a lit office floor spans three bays: vary each bay, so it reads as rooms, not one flat block
        bayc = N.combine(N.math('FLOOR', cu), N.math('FLOOR', cv), N.math('MULTIPLY', rnd, 97.0))
        strength = N.math('MULTIPLY', strength, N.math('MULTIPLY_ADD', N.white(bayc, 9.1), 0.65, 0.35))
    # by day a few windows still show a lamp, much weaker
    # walls: a base colour, weathered; glass: dark and reflective
    if brick:
        bt = N.n('ShaderNodeTexBrick', offset=0.5, **{'Scale': 1.0, 'Mortar Size': 0.008, 'Brick Width': 0.24, 'Row Height': 0.075})
        N.set(bt.inputs['Vector'], N.combine(u, v, 0.0))
        N.set(bt.inputs['Color1'], (*wall, 1)); N.set(bt.inputs['Color2'], (wall[0] * 0.78, wall[1] * 0.74, wall[2] * 0.72, 1)); N.set(bt.inputs['Mortar'], (0.33, 0.31, 0.28, 1))
        wallc = bt.outputs['Color']
    else:
        tint = N.white(N.combine(rnd, 0.1, 0.9), 2.0)
        wallc = N.mix(N.math('MULTIPLY', tint, 0.5), (*wall, 1), (wall[0] * 0.75, wall[1] * 0.78, wall[2] * 0.82, 1))
    # weathering: broad and soft (finer layers read as speckle from the street)
    weather = N.noise(p, 0.12, 1.0)
    wallc = N.mix(N.math('MULTIPLY', N.math('SUBTRACT', weather, 0.4), 0.3), wallc, (0.10, 0.10, 0.10, 1), 'MULTIPLY')
    if panels:   # precast panels: a fine joint at each floor and each bay
        joint = N.math('MAXIMUM', N.math('ADD', N.step(fv, 0.012), N.step(0.988, fv)), N.math('ADD', N.step(fu, 0.006), N.step(0.994, fu)))
        wallc = N.mix(N.math('MULTIPLY', joint, 0.55), wallc, (0.02, 0.02, 0.02, 1), 'MULTIPLY')
    # a mullion down the middle of each window (inside the window only)
    frame = N.math('MULTIPLY', N.math('MULTIPLY', N.step(0.485, fu), N.step(fu, 0.515)), win) if not curtain else N.math('MULTIPLY', N.step(0.0, fu), 0.0)
    glassc = (*glass, 1)
    base = N.mix(win, wallc, glassc)
    base = N.mix(frame, base, (0.05, 0.05, 0.05, 1))
    rough = N.lerp(win, 0.86 if not curtain else 0.4, 0.06)
    metal = N.lerp(win, 0.0 if not curtain else 0.7, 0.35 if curtain else 0.0)
    bump = N.n('ShaderNodeBump', Strength=0.9, Distance=0.06)
    N.set(bump.inputs['Height'], N.math('SUBTRACT', 1.0, win))
    b = N.bsdf(**{'Base Color': base, 'Roughness': rough, 'Metallic': metal, 'Normal': bump.outputs[0], 'Emission Color': lamp, 'Emission Strength': strength})
    N.out(b)
    return m

def m_shop():
    """Shopfronts: glass between dark mullions with a transom, the interior glowing at night; about a third are closed
    behind ribbed shutters."""
    m, N = material('ShopGlass')
    info = N.n('ShaderNodeObjectInfo')
    night = N.night()
    r = info.outputs['Random']
    col = N.mix(N.step(0.7, r), (1.0, 0.62, 0.32, 1), (0.85, 0.92, 1.0, 1))
    p = obj_coords(N)
    x, y, z = N.xyz(p)
    u = N.math('ADD', x, y)
    pane = N.math('FRACT', N.math('DIVIDE', u, 1.8))
    mull = N.math('ADD', N.step(pane, 0.04), N.step(0.96, pane))                       # vertical mullions
    mull = N.math('MAXIMUM', mull, N.math('MULTIPLY', N.step(2.95, z), N.step(z, 3.1)))  # the transom
    mull = N.math('MAXIMUM', mull, N.step(z, 0.35))                                     # the stall riser
    shut = N.step(0.5, N.white(N.combine(r, 0.3, 0.7), 1.0))                           # closed for the night
    rib = N.math('SINE', N.math('MULTIPLY', z, 70.0))
    grad = N.math('MULTIPLY_ADD', N.math('MINIMUM', N.math('DIVIDE', z, 3.6), 1.0), 0.5, 0.5)
    # by day the interior still shows faintly through the glass, so it reads as a shop window, not a mirror
    lit = N.math('MULTIPLY', N.math('MULTIPLY', N.math('SUBTRACT', 1.0, mull), N.math('SUBTRACT', 1.0, shut)), N.lerp(night, 0.12, 1.0))
    inside = N.math('MULTIPLY_ADD', N.noise(N.vmath('MULTIPLY', p, (0.7, 0.7, 0.25)), 1.0, 2.0), 1.2, -0.15)   # shelves, people, displays
    strength = N.math('MULTIPLY', N.math('MULTIPLY', N.math('MULTIPLY_ADD', r, 0.22, 0.07), N.math('MULTIPLY', grad, N.math('MAXIMUM', inside, 0.15))), lit)
    base = N.mix(mull, (0.012, 0.014, 0.016, 1), (0.03, 0.03, 0.032, 1))
    base = N.mix(shut, base, N.mix(N.math('MULTIPLY_ADD', rib, 0.5, 0.5), (0.16, 0.16, 0.17, 1), (0.24, 0.24, 0.25, 1)))
    rough = N.lerp(N.math('MAXIMUM', mull, shut), 0.04, 0.5)
    metal = N.lerp(shut, 0.0, 0.7)
    b = N.bsdf(**{'Base Color': base, 'Roughness': rough, 'Metallic': metal, 'Emission Color': col, 'Emission Strength': strength,
                  'Specular IOR Level': N.lerp(night, 0.28, 0.5)})
    N.out(b)
    return m

def m_sign():
    """Shop signs: a lightbox in the object's own colour; glowing at night, printed by day."""
    m, N = material('Sign')
    info = N.n('ShaderNodeObjectInfo')
    col = info.outputs['Color']
    night = N.night()
    b = N.bsdf(**{'Base Color': col, 'Roughness': 0.35, 'Emission Color': col, 'Emission Strength': N.lerp(night, 0.0, 1.3)})
    N.out(b)
    return m

def m_leaves():
    m, N = material('Leaves')
    p = obj_coords(N)
    v = N.noise(p, 3.0, 4.0)
    col = N.mix(v, (0.035, 0.065, 0.025, 1), (0.08, 0.12, 0.04, 1))
    night = N.night()
    col = N.mix(night, col, N.mix(1.0, col, (0.5, 0.55, 0.5, 1), 'MULTIPLY'))
    b = N.bsdf(**{'Base Color': col, 'Roughness': 0.65, 'Subsurface Weight': 0.0})
    tr = N.n('ShaderNodeBsdfTranslucent'); N.set(tr.inputs['Color'], col)
    mixs = N.n('ShaderNodeMixShader'); N.set(mixs.inputs[0], 0.3)
    N.link(b.outputs[0], mixs.inputs[1]); N.link(tr.outputs[0], mixs.inputs[2])
    N.out(mixs)
    bump = N.n('ShaderNodeBump', Strength=0.8, Distance=0.05); N.set(bump.inputs['Height'], N.noise(p, 9.0, 4.0))
    N.link(bump.outputs[0], b.inputs['Normal'])
    return m

def m_board_face(i):
    """A billboard's face: white. The poster is laid over it on the website (multiplied in), so the render keeps the
    light, the haze and anything in front, and the poster stays sharp and changeable. By day it is lit like any wall;
    at night its light is its own even glow, brightest under its three lamps (no noisy lighting under a poster)."""
    m, N = material(f'BoardFace_{i}')
    night = N.night()
    b = N.bsdf(**{'Base Color': (0.92, 0.92, 0.92, 1), 'Roughness': 1.0, 'Specular IOR Level': 0.0, 'Emission Color': (1.0, 0.98, 0.95, 1)})
    b.name = 'BSDF'
    b.inputs['Emission Strength'].default_value = 0.0   # set per frame by render.py
    p = obj_coords(N)
    x, y, z = N.xyz(p)
    W, H, UP = D.BOARD_W, D.BOARD_H, D.BOARD_UP - KERB_H
    up = N.math('DIVIDE', N.math('SUBTRACT', z, UP), H)                 # 0 at the bottom edge, 1 at the top
    pool = 0.0
    for lx in (-W / 3, 0.0, W / 3):                                      # a soft pool of light under each lamp
        dx = N.math('DIVIDE', N.math('SUBTRACT', x, lx), 1.7)
        dz = N.math('DIVIDE', N.math('SUBTRACT', up, 1.0), 0.75)
        d2 = N.math('ADD', N.math('MULTIPLY', dx, dx), N.math('MULTIPLY', dz, dz))
        pool = N.math('ADD', pool, N.math('EXPONENT', N.math('MULTIPLY', d2, -1.0)))
    shade = N.math('MULTIPLY_ADD', N.math('MINIMUM', pool, 1.25), 0.32, N.math('MULTIPLY_ADD', up, 0.18, 0.62))
    glow = N.n('ShaderNodeEmission'); N.set(glow.inputs['Color'], (1.0, 0.97, 0.92, 1))
    lit = N.n('ShaderNodeValue', name='Lit'); lit.outputs[0].default_value = 0.0        # set per frame by render.py
    N.set(glow.inputs['Strength'], N.math('MULTIPLY', shade, lit.outputs[0]))
    mx = N.n('ShaderNodeMixShader'); N.set(mx.inputs[0], night)
    N.link(b.outputs[0], mx.inputs[1]); N.link(glow.outputs[0], mx.inputs[2])
    N.out(mx)
    return m

M = {}
M['asphalt'] = m_asphalt()
M['paving'] = m_paving()
M['kerb'] = m_simple('Kerb', (0.19, 0.19, 0.19), 0.6)
M['ground'] = m_simple('Ground', (0.05, 0.05, 0.05), 0.9)
M['paint'] = m_simple('RoadPaint', (0.78, 0.78, 0.76), 0.45)
M['dark_metal'] = m_simple('DarkMetal', (0.035, 0.035, 0.04), 0.35, 0.6)
M['grey_metal'] = m_simple('GreyMetal', (0.30, 0.31, 0.33), 0.38, 0.85)
M['lamp_led'] = m_simple('LampLED', (0.05, 0.05, 0.05), 0.3, emit=(1.0, 0.84, 0.62), emit_night=60.0, emit_day=0.0)
M['shop'] = m_shop()
M['sign'] = m_sign()
M['leaves'] = m_leaves()
M['bark'] = m_simple('Bark', (0.05, 0.04, 0.03), 0.9)
M['glass'] = m_simple('ShelterGlass', (0.05, 0.06, 0.06), 0.05, 0.2)
M['signal_green'] = m_simple('SignalGreen', (0.02, 0.1, 0.06), 0.2, emit=(0.15, 1.0, 0.55), emit_night=25.0, emit_day=6.0)
M['signal_red'] = m_simple('SignalRed', (0.1, 0.02, 0.02), 0.2, emit=(1.0, 0.12, 0.06), emit_night=25.0, emit_day=6.0)
M['signal_off'] = m_simple('SignalOff', (0.02, 0.02, 0.02), 0.25)
M['aviation'] = m_simple('AviationLight', (0.1, 0.0, 0.0), 0.3, emit=(1.0, 0.05, 0.02), emit_night=40.0, emit_day=0.0)
M['concrete'] = m_simple('Concrete', (0.32, 0.31, 0.30), 0.85)
def m_car_shadow():
    m, N = material('CarShadow')
    p = obj_coords(N)
    x, y, z = N.xyz(p)
    d = N.vmath('LENGTH', N.combine(N.math('DIVIDE', x, 1.0), N.math('DIVIDE', y, 2.3), 0.0))
    a = N.math('MULTIPLY', N.math('POWER', N.math('SUBTRACT', 1.0, d, clamp=True), 1.4), 0.92)
    tr = N.n('ShaderNodeBsdfTransparent')
    b = N.bsdf(**{'Base Color': (0.0, 0.0, 0.0, 1), 'Roughness': 1.0})
    mx = N.n('ShaderNodeMixShader'); N.set(mx.inputs[0], a)
    N.link(tr.outputs[0], mx.inputs[1]); N.link(b.outputs[0], mx.inputs[2])
    N.out(mx)
    m.surface_render_method = 'BLENDED'
    return m
M['car_shadow'] = m_car_shadow()
M['roof'] = m_simple('Roof', (0.12, 0.12, 0.12), 0.9)
FACADES = {
    'glass': m_facade('FacadeGlass', (0.06, 0.065, 0.075), 1.6, 3.9, 0.035, 0.05, 0.95, (0.02, 0.028, 0.036), 0.10, 0.32, cool=0.75, curtain=True),
    'plaster': m_facade('FacadePlaster', (0.58, 0.55, 0.50), 3.0, 3.1, 0.22, 0.2, 0.82, (0.015, 0.017, 0.02), 0.12, 0.34, cool=0.2),
    'brick': m_facade('FacadeBrick', (0.30, 0.13, 0.08), 2.6, 3.4, 0.21, 0.18, 0.8, (0.015, 0.016, 0.018), 0.12, 0.34, cool=0.15, brick=True),
    'concrete': m_facade('FacadeConcrete', (0.40, 0.40, 0.39), 2.4, 3.4, 0.2, 0.22, 0.86, (0.016, 0.019, 0.022), 0.10, 0.28, cool=0.45, panels=True),
}

# ---------- mesh helpers ----------
def obj_from(name, verts, faces, coll, mat=None, loc=(0, 0, 0), smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.update()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); o.location = loc; coll.objects.link(o)
    if mat: me.materials.append(mat)
    return o

def box(name, x0, y0, z0, x1, y1, z1, coll, mat=None, local=False):
    """A box. local=True puts the origin at its (x0, y0, z0) corner, so object coordinates run in metres from 0."""
    if local:
        w, d, h = x1 - x0, y1 - y0, z1 - z0
        v = [(0, 0, 0), (w, 0, 0), (w, d, 0), (0, d, 0), (0, 0, h), (w, 0, h), (w, d, h), (0, d, h)]
        loc = (x0, y0, z0)
    else:
        v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        loc = (0, 0, 0)
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (3, 0, 4, 7), (1, 2, 6, 5)]
    return obj_from(name, v, f, coll, mat, loc)

def plane(name, x0, y0, x1, y1, z, coll, mat=None):
    return obj_from(name, [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], [(0, 1, 2, 3)], coll, mat)

def cylinder(name, r0, r1, h, loc, coll, mat=None, seg=16, rot=None):
    v, f = [], []
    for k in range(seg):
        a = 2 * math.pi * k / seg
        v.append((r0 * math.cos(a), r0 * math.sin(a), 0)); v.append((r1 * math.cos(a), r1 * math.sin(a), h))
    for k in range(seg):
        a, b = 2 * k, 2 * ((k + 1) % seg)
        f.append((a, b, b + 1, a + 1))
    f.append(tuple(2 * k for k in reversed(range(seg)))); f.append(tuple(2 * k + 1 for k in range(seg)))
    o = obj_from(name, v, f, coll, mat, loc, smooth=True)
    if rot: o.rotation_euler = rot
    return o

# ---------- road ----------
plane('Road', -HALF, Y0, HALF, Y1, 0.0, C_ROAD, M['asphalt'])
plane('Ground', -2000, Y0 - 400, 2000, Y1 + 2000, -0.03, C_ROAD, M['ground'])
for c in CROSS:
    plane(f'CrossRoad_{c}', -400, c - CROSS_HALF, 400, c + CROSS_HALF, -0.002, C_ROAD, M['asphalt'])

def segments(y_a, y_b, pad):
    """The stretches of [y_a, y_b] that are not crossroads."""
    cuts = sorted((c - CROSS_HALF - pad, c + CROSS_HALF + pad) for c in CROSS)
    out, y = [], y_a
    for a, b in cuts:
        if b <= y_a or a >= y_b: continue
        if a > y: out.append((y, a))
        y = max(y, b)
    if y < y_b: out.append((y, y_b))
    return out

# pavements and kerbs, either side, broken by the cross streets
for s in (-1, 1):
    for a, b in segments(Y0, Y1, 0.0):
        x0, x1 = sorted((s * HALF, s * (HALF + 0.25)))
        box(f'Kerb_{s}_{int(a)}', x0, a, 0, x1, b, KERB_H, C_ROAD, M['kerb'])
        x0, x1 = sorted((s * (HALF + 0.25), s * 60.0))
        box(f'Pavement_{s}_{int(a)}', x0, a, 0, x1, b, KERB_H - 0.002, C_ROAD, M['paving'], local=True)
    for c in CROSS:
        for e in (-1, 1):   # the cross street's own kerbs and pavements, out to the side
            y0_, y1_ = sorted((c + e * CROSS_HALF, c + e * (CROSS_HALF + 0.25)))
            x0, x1 = sorted((s * HALF, s * 400.0))
            box(f'XKerb_{s}_{c}_{e}', x0, y0_, 0, x1, y1_, KERB_H, C_ROAD, M['kerb'])

# road markings: centre double line, dashed lane lines, edge lines; zebra crossings and stop lines at crossroads
def strip(name, x0, y0, x1, y1):
    return plane(name, x0, y0, x1, y1, 0.004, C_ROAD, M['paint'])
for a, b in segments(Y0, Y1, 5.0):
    for x in (-0.18, 0.06):
        strip(f'Centre_{x}_{int(a)}', x, a, x + 0.12, b)
    for s in (-1, 1):
        strip(f'Edge_{s}_{int(a)}', s * (HALF - 0.35) - 0.07, a, s * (HALF - 0.35) + 0.07, b)
        y = a + 1.0
        while y + 3.0 < b:
            strip(f'Dash_{s}_{int(y)}', s * D.LANE - 0.06, y, s * D.LANE + 0.06, y + 3.0)
            y += 9.0
for c in CROSS:
    for e in (-1, 1):
        y_in = c + e * (CROSS_HALF + 0.6)
        y_out = c + e * (CROSS_HALF + 3.6)
        ya, yb = sorted((y_in, y_out))
        x = -HALF + 0.3
        while x < HALF - 0.6:
            strip(f'Zebra_{c}_{e}_{x:.1f}', x, ya, x + 0.55, yb)
            x += 1.1
        # stop line for the lanes heading into the crossing on this side
        xs0, xs1 = (0.1, HALF) if e < 0 else (-HALF, -0.1)
        ys = c + e * (CROSS_HALF + 4.4)
        strip(f'Stop_{c}_{e}', xs0, ys - 0.25, xs1, ys + 0.25)

# ---------- buildings ----------
STYLES = ['glass', 'plaster', 'brick', 'concrete']
def building(name, side, ya, yb, depth, height, style, coll=C_BUILD, x_front=FACADE, shops=True):
    """A building whose road-facing front is at |x| = x_front, from y = ya to yb, `depth` deep, `height` tall."""
    if side > 0: x0, x1 = x_front, x_front + depth
    else: x0, x1 = -x_front - depth, -x_front
    b = box(name, x0, ya, 0, x1, yb, height, coll, FACADES[style], local=True)
    b['h'] = height
    # a parapet or cornice at the top
    lip = 0.35 if style != 'glass' else 0.15
    box(name + '_top', x0 - lip, ya - lip, height, x1 + lip, yb + lip, height + (0.6 if style != 'glass' else 0.25), coll, M['dark_metal'] if style == 'glass' else M['concrete'])
    floor_h = {'glass': 3.9, 'plaster': 3.1, 'brick': 3.4, 'concrete': 3.3}[style]
    floors = int((height - 4.6) // floor_h)
    if style == 'glass' and floors > 2:
        # a slab edge every floor, standing a little proud of the glass: it catches the light as the car moves
        slab = box(name + '_slabs', x0 - 0.12, ya - 0.12, 4.6, x1 + 0.12, yb + 0.12, 4.75, coll, M['dark_metal'])
        mod = slab.modifiers.new('floors', 'ARRAY'); mod.use_relative_offset = False; mod.use_constant_offset = True
        mod.constant_offset_displace = (0, 0, floor_h); mod.count = floors
    if style == 'plaster' and floors > 2:
        # balconies on the road side, every other bay
        bay = 3.0; front = x0 if side > 0 else x1
        bx0, bx1 = (front - 1.3, front) if side > 0 else (front, front + 1.3)
        bal = box(name + '_balc', bx0, ya + 1.0, 4.6 + floor_h, bx1, ya + 1.0 + bay * 0.85, 4.6 + floor_h + 0.16, coll, M['concrete'])
        rail = box(name + '_rail', bx0 if side > 0 else bx1 - 0.06, ya + 1.0, 4.6 + floor_h + 0.16, (bx0 + 0.06) if side > 0 else bx1, ya + 1.0 + bay * 0.85, 4.6 + floor_h + 1.15, coll, M['glass'])
        for o in (bal, rail):
            a1 = o.modifiers.new('bays', 'ARRAY'); a1.use_relative_offset = False; a1.use_constant_offset = True
            a1.constant_offset_displace = (0, bay * 2, 0); a1.count = max(1, int((yb - ya - 2.0) // (bay * 2)))
            a2 = o.modifiers.new('floors', 'ARRAY'); a2.use_relative_offset = False; a2.use_constant_offset = True
            a2.constant_offset_displace = (0, 0, floor_h); a2.count = max(1, floors - 1)
    # rooftop clutter
    for k in range(rng.randint(1, 4)):
        w, d_, h_ = rng.uniform(1.5, 4), rng.uniform(1.5, 4), rng.uniform(1.0, 3.0)
        cx, cy = rng.uniform(x0 + 2, x1 - 2 - w), rng.uniform(ya + 2, yb - 2 - d_)
        box(f'{name}_roof{k}', cx, cy, height, cx + w, cy + d_, height + h_, coll, M['roof'])
    if height > 70:
        cx, cy = (x0 + x1) / 2, (ya + yb) / 2
        cylinder(f'{name}_mast', 0.25, 0.08, 12, (cx, cy, height), coll, M['grey_metal'], seg=8)
        bl = cylinder(f'{name}_beacon', 0.4, 0.4, 0.4, (cx, cy, height + 12), coll, M['aviation'], seg=8)
    if shops and x_front == FACADE:
        front = x0 if side > 0 else x1
        sx0, sx1 = sorted((front, front - side * 0.3))
        shop = box(name + '_shop', sx0, ya + 0.7, KERB_H, sx1, yb - 0.7, 4.1, coll, M['shop'], local=True)
        cx0, cx1 = sorted((front, front - side * 1.6))
        box(name + '_canopy', cx0, ya + 0.4, 4.15, cx1, yb - 0.4, 4.3, coll, M['dark_metal'])
        span = (yb - ya) * rng.uniform(0.25, 0.5)
        mid = (ya + yb) / 2
        gx0, gx1 = sorted((front - side * 0.32, front - side * 0.5))
        sign = box(name + '_sign', gx0, mid - span / 2, 4.45, gx1, mid + span / 2, 5.25, coll, M['sign'])
        sign.color = rng.choice([(1.0, 0.9, 0.75, 1), (0.85, 0.92, 1.0, 1), (1.0, 0.7, 0.35, 1), (0.9, 0.25, 0.2, 1), (0.25, 0.75, 0.75, 1), (0.95, 0.95, 0.95, 1), (0.6, 0.6, 0.62, 1)])
    return b

def row(side, y_from, y_to, x_front, h_range, styles, depth=(16, 28), gap=(0.0, 3.0), width=(14, 34), shops=True, tag='B'):
    y = y_from
    k = 0
    while y < y_to:
        w = rng.uniform(*width)
        ya, yb = y, min(y + w, y_to)
        if yb - ya > 6 and not any(c - CROSS_HALF - CROSS_WALK - 0.5 < yb and ya < c + CROSS_HALF + CROSS_WALK + 0.5 for c in CROSS):
            style = rng.choice(styles)
            lo, hi = h_range
            if style == 'glass': lo, hi = max(lo, 40), hi * 1.5
            if style == 'brick': hi = min(hi, 30)
            building(f'{tag}_{side}_{k}', side, ya, yb, rng.uniform(*depth), round(rng.uniform(lo, hi), 1), style, x_front=x_front, shops=shops)
            k += 1
        y = yb + rng.uniform(*gap)

for s in (-1, 1):
    row(s, -150, 900, FACADE, (14, 46), STYLES)                                   # the street's own front row
    row(s, -150, 1100, FACADE + 34, (30, 90), STYLES, depth=(20, 34), width=(20, 40), shops=False, tag='R2')   # behind it
    row(s, 300, 1400, FACADE + 80, (60, 150), ['glass', 'concrete', 'glass'], depth=(25, 40), width=(24, 44), shops=False, tag='R3')
# downtown: a cluster of towers where the road ends up, so the drive has a skyline to head toward
for k in range(26):
    x = rng.uniform(-160, 160)
    if abs(x) < 20: x += 40 * (1 if x >= 0 else -1)
    y = rng.uniform(1000, 1450)
    w, d_ = rng.uniform(22, 44), rng.uniform(22, 44)
    h = rng.uniform(90, 260)
    style = rng.choice(['glass', 'glass', 'concrete'])
    b = box(f'Downtown_{k}', x - w / 2, y - d_ / 2, 0, x + w / 2, y + d_ / 2, h, C_BUILD, FACADES[style], local=True)
    b['h'] = h
    if h > 120:
        cylinder(f'Downtown_{k}_mast', 0.4, 0.1, 18, (x, y, h), C_BUILD, M['grey_metal'], seg=8)
        cylinder(f'Downtown_{k}_beacon', 0.6, 0.6, 0.6, (x, y, h + 18), C_BUILD, M['aviation'], seg=8)
# the cross streets are lined too, beyond the main street's two rows, so a glance down one at a stop shows a street
# rather than open ground (a separate random stream, so the rest of the city stays exactly as it was)
xr = random.Random(73209)
for c in CROSS:
    for s in (-1, 1):
        for e in (-1, 1):
            x = 86.0 + xr.uniform(0, 6)
            while x < 420:
                w, d_, h = xr.uniform(18, 40), xr.uniform(18, 32), round(xr.uniform(18, 75), 1)
                y_front = c + e * (CROSS_HALF + CROSS_WALK + 1.0)
                y0_, y1_ = sorted((y_front, y_front + e * d_))
                x0, x1 = sorted((s * x, s * (x + w)))
                b = box(f'XRow_{int(c)}_{s}_{e}_{int(x)}', x0, y0_, 0, x1, y1_, h, C_BUILD, FACADES[xr.choice(STYLES)], local=True)
                b['h'] = h
                x += w + xr.uniform(1.5, 5)

# ---------- street lamps ----------
def lamp(name, s, y):
    xp = s * (HALF + 0.75)
    cylinder(f'{name}_pole', 0.13, 0.08, 8.9, (xp, y, KERB_H), C_STREET, M['grey_metal'], seg=12)
    arm_len = 2.6
    arm = cylinder(f'{name}_arm', 0.06, 0.05, arm_len, (xp, y, 8.85), C_STREET, M['grey_metal'], seg=8, rot=(0, -s * math.radians(80), 0))
    hx = xp - s * arm_len * math.sin(math.radians(80))
    hz = 8.85 + arm_len * math.cos(math.radians(80))
    head = box(f'{name}_head', hx - 0.5, y - 0.18, hz - 0.12, hx + 0.5, y + 0.18, hz + 0.02, C_STREET, M['grey_metal'])
    plane(f'{name}_led', hx - 0.42, y - 0.13, hx + 0.42, y + 0.13, hz - 0.125, C_STREET, M['lamp_led'])
    ld = bpy.data.lights.new(f'{name}_L', 'SPOT')
    ld.spot_size = math.radians(125); ld.spot_blend = 0.55; ld.color = (1.0, 0.86, 0.68); ld.shadow_soft_size = 0.4
    ld.use_shadow = True
    lo = bpy.data.objects.new(f'SL_{name}', ld); lo.location = (hx, y, hz - 0.2); lo.rotation_euler = (0, s * math.radians(12), 0)   # tipped toward the middle of the road
    C_LIGHTS.objects.link(lo)
    return lo

LAMPS = []
for s in (-1, 1):
    y = -120.0 + (0 if s < 0 else 15.0)
    while y < 760:
        if not in_cross(y, 5.0) and not near_board(y, s):
            LAMPS.append(lamp(f'Lamp_{s}_{int(y)}', s, y))
        y += 25.0

# ---------- trees ----------
def tree_mesh(k):
    """A tree: a trunk and a canopy of a few lumpy blobs, displaced by noise."""
    parts = []
    trunk = cylinder(f'TreeTrunk_{k}', 0.16, 0.1, 3.4, (0, 0, 0), C_STREET, M['bark'], seg=10)
    parts.append(trunk)
    tex = bpy.data.textures.new(f'TreeNoise_{k}', 'CLOUDS'); tex.noise_scale = 0.32; tex.noise_depth = 3
    for j in range(rng.randint(9, 13)):
        a = rng.uniform(0, 6.28); r_ = rng.uniform(0.0, 1.3)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=rng.uniform(0.7, 1.2), location=(r_ * math.cos(a), r_ * math.sin(a), rng.uniform(3.4, 6.2)))
        blob = bpy.context.object
        blob.users_collection[0].objects.unlink(blob); C_STREET.objects.link(blob)
        dm = blob.modifiers.new('lumps', 'DISPLACE'); dm.texture = tex; dm.strength = 0.75
        blob.data.materials.append(M['leaves'])
        for p in blob.data.polygons: p.use_smooth = True
        parts.append(blob)
    # bake into one mesh so it can be instanced cheaply
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        if o.modifiers:
            bpy.ops.object.modifier_apply(modifier=o.modifiers[0].name)
    bpy.context.view_layer.objects.active = trunk
    bpy.ops.object.join()
    trunk.name = f'TreeSrc_{k}'
    return trunk

TREES_SRC = [tree_mesh(k) for k in range(4)]
for o in TREES_SRC: o.location = (0, 0, -100)   # sources live out of sight; the street uses linked copies
for s in (-1, 1):
    y = -110.0 + (7.5 if s > 0 else 0)
    while y < 640:
        if not in_cross(y, 6.0) and not near_board(y, s, before=26.0, after=7.0):
            src = rng.choice(TREES_SRC)
            t = bpy.data.objects.new(f'Tree_{s}_{int(y)}', src.data); C_STREET.objects.link(t)
            t.location = (s * (HALF + 2.4), y, KERB_H); t.rotation_euler = (0, 0, rng.uniform(0, 6.28)); sc_ = rng.uniform(0.85, 1.15); t.scale = (sc_, sc_, sc_)
            box(f'TreePit_{s}_{int(y)}', s * (HALF + 2.4) - 0.7, y - 0.7, KERB_H - 0.001, s * (HALF + 2.4) + 0.7, y + 0.7, KERB_H + 0.004, C_STREET, M['ground'])
        y += 15.0

# ---------- crossroads: signals ----------
def signal(name, x, y, facing, arm_to_x, colour_mat, coll=C_STREET):
    """A signal pole with a mast arm reaching over the lanes, its heads facing `facing` (+1 = toward +y)."""
    cylinder(f'{name}_pole', 0.14, 0.11, 6.4, (x, y, KERB_H), coll, M['dark_metal'], seg=12)
    x0, x1 = sorted((x, arm_to_x))
    box(f'{name}_arm', x0, y - 0.07, 6.1, x1, y + 0.07, 6.28, coll, M['dark_metal'])
    for hx in (arm_to_x + (1 if arm_to_x < x else -1) * 0.6, (x + arm_to_x) / 2):
        box(f'{name}_head_{hx:.1f}', hx - 0.2, y - 0.16, 5.0, hx + 0.2, y + 0.16, 6.05, coll, M['dark_metal'])
        for k, mat in enumerate((M['signal_off'], M['signal_off'], colour_mat) if colour_mat is M['signal_green'] else (colour_mat, M['signal_off'], M['signal_off'])):
            z = 5.82 - k * 0.32
            cylinder(f'{name}_lens_{hx:.1f}_{k}', 0.12, 0.12, 0.04, (hx, y + facing * 0.17, z), coll, mat, seg=12, rot=(math.radians(90), 0, 0))
for c in CROSS:
    signal(f'Sig_{c}_ours', HALF + 1.0, c + CROSS_HALF + 1.0, -1, 0.6, M['signal_green'])      # far side, facing us: green
    signal(f'Sig_{c}_oncoming', -HALF - 1.0, c - CROSS_HALF - 1.0, 1, -0.6, M['signal_green'])

# ---------- a bus shelter with its own ad lightbox ----------
def shelter(y, s):
    xin, xout = s * (HALF + 3.0), s * (HALF + 4.6)
    xa, xb = sorted((xin, xout))
    box(f'Shelter_{y}_roof', xa - 0.1, y - 3.2, 2.6, xb + 0.1, y + 3.2, 2.72, C_STREET, M['dark_metal'])
    ba, bb = sorted((xout, xout - s * 0.05))
    box(f'Shelter_{y}_back', ba, y - 3.0, KERB_H, bb, y + 3.0, 2.6, C_STREET, M['glass'])
    box(f'Shelter_{y}_ad', xa, y + 3.0, KERB_H + 0.2, xb, y + 3.15, 2.3, C_STREET, M['sign']).color = (1.0, 0.97, 0.92, 1)
    na, nb = sorted((xout - s * 0.2, xout - s * 0.65))
    box(f'Shelter_{y}_bench', na, y - 2.0, 0.5, nb, y + 2.0, 0.6, C_STREET, M['grey_metal'])
shelter(112.0, 1)
shelter(260.0, -1)

# ---------- billboards ----------
BOARDS = []
for i in range(D.N_BOARDS):
    bx, by = D.board_x(i), D.board_y(i)
    root = bpy.data.objects.new(f'Board_{i}', None); C_BOARDS.objects.link(root)
    root.location = (bx, by, KERB_H); root.rotation_euler = (0, 0, D.board_yaw(i))
    W, H, UP = D.BOARD_W, D.BOARD_H, D.BOARD_UP - KERB_H
    def child(o):
        o.parent = root; return o
    child(cylinder(f'Board_{i}_column', 0.36, 0.3, UP - 0.1, (0, 0.7, 0), C_BOARDS, M['dark_metal'], seg=20))
    child(box(f'Board_{i}_beam', -W / 2 + 0.4, 0.4, UP - 0.55, W / 2 - 0.4, 1.0, UP - 0.15, C_BOARDS, M['dark_metal']))
    child(box(f'Board_{i}_frame', -W / 2 - 0.2, 0.0, UP - 0.2, W / 2 + 0.2, 0.42, UP + H + 0.2, C_BOARDS, M['dark_metal']))
    child(box(f'Board_{i}_walk', -W / 2, -0.95, UP - 0.42, W / 2, 0.0, UP - 0.34, C_BOARDS, M['grey_metal']))
    face = obj_from(f'Board_{i}_face', [(-W / 2, -0.012, UP), (W / 2, -0.012, UP), (W / 2, -0.012, UP + H), (-W / 2, -0.012, UP + H)], [(0, 1, 2, 3)], C_BOARDS, m_board_face(i))
    child(face)
    lamp_mat = m_simple(f'BoardLamp_{i}', (0.05, 0.05, 0.05), 0.3)
    bs = lamp_mat.node_tree.nodes['Principled BSDF']
    bs.inputs['Emission Color'].default_value = (1.0, 0.95, 0.85, 1); bs.inputs['Emission Strength'].default_value = 0.0   # set per frame
    lights = []
    for k, lx in enumerate((-W / 3, 0.0, W / 3)):
        child(box(f'Board_{i}_arm{k}', lx - 0.04, -1.25, UP + H + 0.15, lx + 0.04, 0.3, UP + H + 0.25, C_BOARDS, M['dark_metal']))
        hd = child(box(f'Board_{i}_lamp{k}', lx - 0.28, -1.45, UP + H + 0.02, lx + 0.28, -1.1, UP + H + 0.2, C_BOARDS, lamp_mat))
        ld = bpy.data.lights.new(f'Board_{i}_L{k}', 'SPOT'); ld.spot_size = math.radians(95); ld.spot_blend = 0.7; ld.color = (1.0, 0.95, 0.86)
        ld.use_shadow = False; ld.shadow_soft_size = 0.2
        lo = bpy.data.objects.new(f'BL_{i}_{k}', ld); C_LIGHTS.objects.link(lo); lo.parent = root
        lo.location = (lx, -1.3, UP + H); lo.rotation_euler = (math.radians(30), 0, 0)   # tipped back to wash down the face
        lights.append(lo)
    BOARDS.append(root)

# ---------- cars ----------
CAR_FILES = {
    'gt3rs': ('porsche_gt3_rs', 4.57),
    'aventador': ('lamborghini_aventador_svj_sdc__free', 4.94),
    'agera': ('koenigsegg_agera_rs', 4.29),
    'city': ('honda_city_2017', 4.44),
    'm4': ('bmw_m4_f82_razor_2014__www.vecarz.com', 4.67),
    'rwb': ('porsche_964_rwb_race_car', 4.30),
}
HEAD = {'gt3rs': ['led_lights', 'headlight_1.001_0'], 'aventador': ['HdLightsLens', 'LightEmissiveWhite'], 'agera': ['Mat_Headlight'], 'city': [],
        'm4': ['front_light'], 'rwb': ['color_-1028735251', 'color_183']}   # the 964's parts are named by colour: these sit at its headlamps
TAIL = {'gt3rs': ['brakelight', 'taillight_running'], 'aventador': ['GlassRedLights'], 'agera': ['Mat_RearLight', 'Mat_TaillightDetail'], 'city': [],
        'm4': ['rear_light'], 'rwb': ['color_16711680', 'color_16711690']}
DECIMATE = {'rwb': 0.25}   # 1.4M faces as shipped; a quarter is plenty at traffic distance
PAINT = {'aventador': (['CARROSSERIE'], (0.78, 0.79, 0.8))}   # the purple Lambo, repainted pearl white to suit the site

def emissive(mat, color, night, day):
    """Turns a car material into a lamp that follows day and night."""
    nt = mat.node_tree
    b = next((n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    if not b: return
    a = nt.nodes.new('ShaderNodeAttribute'); a.attribute_type = 'VIEW_LAYER'; a.attribute_name = 'night'
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'FLOAT'
    nt.links.new(a.outputs['Fac'], mx.inputs['Factor'])
    [s for s in mx.inputs if s.identifier == 'A_Float'][0].default_value = day
    [s for s in mx.inputs if s.identifier == 'B_Float'][0].default_value = night
    for l in list(b.inputs['Emission Color'].links): nt.links.remove(l)
    b.inputs['Emission Color'].default_value = (*color, 1)
    nt.links.new([s for s in mx.outputs if s.identifier == 'Result_Float'][0], b.inputs['Emission Strength'])

def load_car(key):
    fname, length = CAR_FILES[key]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f'{CARS}/{fname}.glb')
    new = [o for o in bpy.data.objects if o not in before]
    for o in [o for o in new if o.name.lower().startswith(('shadow', 'hemi'))]:
        new.remove(o); bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in new if o.type == 'MESH' for c in o.bound_box]
    mn = Vector([min(p[k] for p in pts) for k in range(3)]); mx = Vector([max(p[k] for p in pts) for k in range(3)])
    size = mx - mn
    long_axis = 0 if size.x > size.y else 1
    # the front: where the headlights are (or, for the City, its 'frontLamp' parts)
    def centroid(match):
        acc, n = Vector(), 0
        for o in new:
            if o.type != 'MESH': continue
            for p in o.data.polygons:
                m = o.material_slots[p.material_index].material if o.material_slots else None
                name = (m.name if m else '') + ' ' + o.name
                if any(s.lower() in name.lower() for s in match):
                    acc += o.matrix_world @ p.center; n += 1
        return acc / n if n else None
    fc = centroid(HEAD[key] or ['frontLamp']); rc = centroid(TAIL[key] or ['rearLamp'])
    centre = (mn + mx) / 2
    fwd = 1 if (fc[long_axis] - rc[long_axis]) > 0 else -1
    k = length / size[long_axis]
    # one empty holds the whole car: scaled to its real length, its front turned to +y, wheels on the ground
    root = bpy.data.objects.new(f'CarRoot_{key}', None); bpy.context.scene.collection.objects.link(root)
    for o in new:
        if o.parent is None: o.parent = root
    rot = 0.0
    if long_axis == 0: rot = math.pi / 2 if fwd > 0 else -math.pi / 2
    elif fwd < 0: rot = math.pi
    root.matrix_world = Matrix.Rotation(rot, 4, 'Z') @ Matrix.Scale(k, 4) @ Matrix.Translation(Vector((-centre.x, -centre.y, -mn.z)))
    bpy.context.view_layer.update()
    # lamps that follow day and night, and paint
    for o in new:
        for slot in getattr(o, 'material_slots', []):
            m = slot.material
            if not m or not m.use_nodes: continue
            if any(s.lower() in m.name.lower() for s in HEAD[key]): emissive(m, (1.0, 0.95, 0.88), 30.0, 4.0)
            if any(s.lower() in m.name.lower() for s in TAIL[key]): emissive(m, (1.0, 0.04, 0.03), 18.0, 2.0)
            if key in PAINT and m.name in PAINT[key][0]:
                b = next((n for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
                if b: b.inputs['Base Color'].default_value = (*PAINT[key][1], 1)
    if key == 'city':   # the City's lamps share a texture atlas with its trim: give the lamp parts their own lit materials
        head = m_simple('CityHead', (0.9, 0.9, 0.9), 0.2); emissive(head, (1.0, 0.95, 0.88), 30.0, 4.0)
        tail = m_simple('CityTail', (0.5, 0.0, 0.0), 0.2); emissive(tail, (1.0, 0.04, 0.03), 18.0, 2.0)
        for o in new:
            if o.type != 'MESH': continue
            if o.name.startswith('frontLamp_Lamp'):
                o.data = o.data.copy()
                for s in o.material_slots: s.material = head
            if o.name.startswith('rearLamp_Lamp'):
                o.data = o.data.copy()
                for s in o.material_slots: s.material = tail
    # one mesh for the whole car: hundreds of separate parts per copy made every frame slow
    meshes = [o for o in new if o.type == 'MESH']
    others = [o.name for o in new if o.type != 'MESH'] + [root.name]
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    body.name = f'CarBody_{key}'
    if key in DECIMATE:
        dm = body.modifiers.new('Decimate', 'DECIMATE'); dm.ratio = DECIMATE[key]
        bpy.ops.object.modifier_apply(modifier=dm.name)
    for name in others:
        if name in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
    # gather into its own collection, for instancing
    coll = bpy.data.collections.new(f'Car_{key}'); C_CARSRC.children.link(coll)
    for c in list(body.users_collection): c.objects.unlink(body)
    coll.objects.link(body)
    # a soft contact shadow under the car, so it sits on the road
    hl, hw = length / 2 - 0.1, 1.0      # no wider or longer than the car, so it never shows without the car
    obj_from(f'CarShadow_{key}', [(-hw, -hl, 0.012), (hw, -hl, 0.012), (hw, hl, 0.012), (-hw, hl, 0.012)], [(0, 1, 2, 3)], coll, M['car_shadow'])
    # headlight beams, part of the car so every copy carries them
    front_y = length / 2
    for sx in (-1, 1):
        ld = bpy.data.lights.new(f'CarHead_{key}_{sx}', 'SPOT'); ld.spot_size = math.radians(55); ld.spot_blend = 0.6
        ld.color = (1.0, 0.95, 0.88); ld.use_shadow = False
        lo = bpy.data.objects.new(f'CH_{key}_{sx}', ld); coll.objects.link(lo)
        lo.location = (sx * 0.62, front_y - 0.15, 0.68); lo.rotation_euler = (math.radians(86), 0, 0)
    return coll, dict(size=[round(v * k, 2) for v in size], fwd=fwd, axis=long_axis, scale=round(k, 4))

CARINFO = {}
CARCOLL = {}
for key in CAR_FILES:
    CARCOLL[key], CARINFO[key] = load_car(key)
# the source cars sit out of the render; the street uses instances of them
for lc in vl.layer_collection.children['CarModels'].children: lc.exclude = True

# traffic: a pool of instances per lane and slot, placed frame by frame by render.py
for li, lane in enumerate(D.LANES):
    P = lane['v'] * D.TRAFFIC_PERIOD
    count = int(math.ceil(760 / P)) + 2
    for si, (model, off) in enumerate(lane['slots']):
        for k in range(count):
            e = bpy.data.objects.new(f'TR_{li}_{si}_{k}', None); C_TRAFFIC.objects.link(e)
            e.instance_type = 'COLLECTION'; e.instance_collection = CARCOLL[model]
            e.location = (lane['x'], -9999, 0)
            if lane['dir'] < 0: e.rotation_euler = (0, 0, math.pi)

# ---------- our car: headlights on the road ahead ----------
ours = bpy.data.objects.new('OurCar', None); C_LIGHTS.objects.link(ours)
for sx in (-1, 1):
    ld = bpy.data.lights.new(f'OurHead_{sx}', 'SPOT'); ld.spot_size = math.radians(75); ld.spot_blend = 1.0; ld.color = (1.0, 0.96, 0.9); ld.use_shadow = True; ld.shadow_soft_size = 0.1
    lo = bpy.data.objects.new(f'OH_{sx}', ld); C_LIGHTS.objects.link(lo); lo.parent = ours
    lo.location = (sx * 0.7, 1.2, 0.7); lo.rotation_euler = (math.radians(80), 0, 0)

pp = bpy.data.lightprobes.new('RoadMirror', 'PLANE')
probe = bpy.data.objects.new('RoadMirror', pp); C_LIGHTS.objects.link(probe)
probe.location = (0, 120, 0.001); probe.scale = (16.0, 160.0, 1.0)
try: pp.influence_distance = 0.4
except Exception: pass

# ---------- sun and moon ----------
sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN')); C_LIGHTS.objects.link(sun)
sun.data.angle = math.radians(1.2); sun.data.color = (1.0, 0.96, 0.9)
sun.rotation_euler = Euler((math.radians(62), 0, math.radians(-32)), 'XYZ')   # shining from behind and to the left, 28° up
moon = bpy.data.objects.new('Moon', bpy.data.lights.new('Moon', 'SUN')); C_LIGHTS.objects.link(moon)
moon.data.angle = math.radians(0.5); moon.data.color = (0.6, 0.7, 1.0)
moon.rotation_euler = Euler((math.radians(55), 0, math.radians(150)), 'XYZ')

# ---------- worlds ----------
def world_night():
    w = bpy.data.worlds.new('Night'); w.use_nodes = True; N = Nodes(w.node_tree)
    tc = N.n('ShaderNodeTexCoord'); d = tc.outputs['Generated']
    x, y, z = N.xyz(d)
    up = N.math('MAXIMUM', z, 0.0)
    g = N.math('POWER', up, 0.42)
    sky = N.mix(g, (0.088, 0.072, 0.062, 1), (0.006, 0.009, 0.022, 1))   # warm city glow low down, deep navy above
    vor = N.n('ShaderNodeTexVoronoi', **{'Scale': 260.0}); N.set(vor.inputs['Vector'], d)
    star = N.math('SUBTRACT', 1.0, N.math('MULTIPLY', vor.outputs['Distance'], 22.0), clamp=True)
    star = N.math('POWER', star, 6.0)
    bright = N.math('MULTIPLY', N.white(vor.outputs['Position']), N.step(0.12, z))
    star = N.math('MULTIPLY', N.math('MULTIPLY', star, bright), 1.6)
    col = N.mix(1.0, sky, N.combine(star, star, star), 'ADD')
    bg = N.n('ShaderNodeBackground', Strength=1.0); N.set(bg.inputs['Color'], col)
    o = N.n('ShaderNodeOutputWorld'); N.link(bg.outputs[0], o.inputs['Surface'])
    # no world volume: EEVEE treats it as infinite, so it swallowed the whole sky and its light (haze is the mist pass)
    w.mist_settings.start = 40; w.mist_settings.depth = 650; w.mist_settings.falloff = 'QUADRATIC'
    return w

def world_day():
    w = bpy.data.worlds.new('Day'); w.use_nodes = True; N = Nodes(w.node_tree)
    sky = N.n('ShaderNodeTexSky'); sky.sky_type = 'MULTIPLE_SCATTERING'
    sky.sun_elevation = math.radians(28); sky.sun_rotation = math.radians(-148 + 90); sky.sun_disc = False
    try: sky.aerosol_density = 3.0
    except Exception: pass
    hz = N.mix(0.45, sky.outputs['Color'], (0.78, 0.80, 0.82, 1))   # a hazy, pale morning
    bg = N.n('ShaderNodeBackground', Strength=0.55); N.set(bg.inputs['Color'], hz)
    o = N.n('ShaderNodeOutputWorld'); N.link(bg.outputs[0], o.inputs['Surface'])
    w.mist_settings.start = 25; w.mist_settings.depth = 520; w.mist_settings.falloff = 'QUADRATIC'
    return w

for w in (world_night(), world_day()):
    w.use_fake_user = True                          # both kept in the file; render.py picks one
    w.sun_threshold = 1e6; w.use_sun_shadow = False # no sun pulled out of the sky (the Sun lamp is the sun): ~5 s a frame saved
sc.world = bpy.data.worlds['Night']

# ---------- camera ----------
cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.sensor_fit = 'VERTICAL'; cam.data.lens_unit = 'FOV'; cam.data.clip_start = 0.1; cam.data.clip_end = 4000

# ---------- render settings ----------
sc.render.engine = 'BLENDER_EEVEE'
ee = sc.eevee
ee.taa_render_samples = 64
ee.use_raytracing = True
ee.ray_tracing_method = 'SCREEN'
ee.use_fast_gi = True
ee.use_shadows = True
ee.shadow_ray_count = 1; ee.shadow_step_count = 6
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
vl.use_pass_mist = True; vl.use_pass_z = True
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'; sc.render.image_settings.color_depth = '8'

# a report for the renderer and for checking
import json
info = dict(cars=CARINFO, lamps=len(LAMPS), objects=len(bpy.data.objects), boards=[b.name for b in BOARDS])
open(f'{OUT}/build.json', 'w').write(json.dumps(info, indent=1))
bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/city.blend', compress=True)
print('BUILD OK', json.dumps(info))
