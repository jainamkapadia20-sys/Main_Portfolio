# Renders the drive, frame by frame, from city/out/city.blend.
#   blender -b out/city.blend -P render.py -- <night|day> <desktop|portrait> [--frames a:b[:step]] [--t 0,1.5]
#                                            [--scale 100] [--samples 64] [--out DIR]
#                                            [--size 1600x900] [--traffic 1]
# The traffic is left out: the website drives the cars live over these frames, so they keep moving wherever the
# scroll stops. --traffic 1 puts them in (reference renders for matching the live cars' look).
# For each frame it places the camera (drive.camera), our headlights, the traffic (drive.traffic) and each
# billboard's lamps (on as the car reaches it, with a short flicker), renders, and records where every billboard's
# face lands on screen, so the website can lay the posters over the faces and make them clickable.
import bpy, sys, os, json, math
sys.path.insert(0, 'D:/Main Portfolio/city')
import drive as D
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:]
theme, mode = argv[0], argv[1]
opt = dict(frames=None, t=None, scale='100', samples='64', size=None, traffic='0', out=None)
for k in range(2, len(argv), 2): opt[argv[k].lstrip('-')] = argv[k + 1]
night = theme == 'night'
opt['out'] = opt['out'] or f"D:/Main Portfolio/city/out/{theme}_{mode}"
traffic = opt['traffic'] == '1'
os.makedirs(opt['out'], exist_ok=True)

sc = bpy.context.scene; vl = bpy.context.view_layer
sc['night'] = vl['night'] = 1.0 if night else 0.0
sc.world = bpy.data.worlds['Night' if night else 'Day']
m = D.MODES[mode]
sc.render.resolution_x, sc.render.resolution_y = m['w'], m['h']
sc.render.resolution_percentage = int(opt['scale'])
if opt['size']: sc.render.resolution_x, sc.render.resolution_y = map(int, opt['size'].split('x'))
sc.eevee.taa_render_samples = int(opt['samples'])
sc.eevee.fast_gi_ray_count = 4                 # the bounce light without its speckle on night walls (costs ~2%)
sc.view_settings.exposure = 0.7 if night else -0.35

# lights for the time of day
E = dict(street=7000.0, carhead=160.0, ours=260.0, sun=3.4, moon=0.05) if night else dict(street=0.0, carhead=0.0, ours=0.0, sun=3.4, moon=0.0)
if night: E['sun'] = 0.0
STREET = []
for o in bpy.data.objects:
    if o.type != 'LIGHT': continue
    n = o.name
    o.hide_render = False
    if n.startswith('BL_'): o.data.use_shadow = False
    if n.startswith('SL_'): o.data.energy = E['street']; STREET.append(o)
    elif n.startswith('CH_'): o.data.energy = E['carhead']
    elif n.startswith('OH_'): o.data.energy = E['ours']
    elif n == 'Sun': o.data.energy = E['sun']
    elif n == 'Moon': o.data.energy = E['moon']; o.data.use_shadow = False   # at 0.05 its shadow shows nowhere, and costs 2.4 s a frame
    if o.data.energy == 0.0 and not n.startswith('BL_'): o.hide_render = True   # lights that are off cost nothing

# grading: distance haze from the mist pass (not on the sky), then a soft bloom on the lights
def compositor():
    ng = bpy.data.node_groups.get('Grade') or bpy.data.node_groups.new('Grade', 'CompositorNodeTree')
    ng.nodes.clear()
    if not any(i.item_type == 'SOCKET' and i.in_out == 'OUTPUT' for i in ng.interface.items_tree):
        ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = ng.nodes.new('CompositorNodeRLayers')
    out = ng.nodes.new('NodeGroupOutput')
    def mathn(op, a, b):
        n = ng.nodes.new('ShaderNodeMath'); n.operation = op
        for s, v in zip(n.inputs, (a, b)):
            if isinstance(v, bpy.types.NodeSocket): ng.links.new(v, s)
            else: s.default_value = v
        return n.outputs[0]
    mask = mathn('LESS_THAN', rl.outputs['Depth'], 3000.0)
    fac = mathn('MULTIPLY', mathn('MULTIPLY', rl.outputs['Mist'], mask), 0.72 if night else 0.8)
    mix = ng.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    ng.links.new(fac, mix.inputs['Factor'])
    ng.links.new(rl.outputs['Image'], [s for s in mix.inputs if s.identifier == 'A_Color'][0])
    [s for s in mix.inputs if s.identifier == 'B_Color'][0].default_value = (0.020, 0.024, 0.034, 1) if night else (0.80, 0.81, 0.82, 1)
    gl = ng.nodes.new('CompositorNodeGlare')
    gl.inputs['Type'].default_value = 'Bloom'
    gl.inputs['Threshold'].default_value = 0.85 if night else 1.4
    gl.inputs['Strength'].default_value = 0.42 if night else 0.12
    gl.inputs['Size'].default_value = 0.62
    ng.links.new([s for s in mix.outputs if s.identifier == 'Result_Color'][0], gl.inputs['Image'])
    ng.links.new(gl.outputs['Image'], out.inputs[0])
    sc.compositing_node_group = ng
    sc.render.use_compositing = True
compositor()

cam = sc.camera
faces = [bpy.data.objects[f'Board_{i}_face'] for i in range(D.N_BOARDS)]
face_bsdf = [bpy.data.materials[f'BoardFace_{i}'].node_tree.nodes['BSDF'] for i in range(D.N_BOARDS)]
face_lit = [bpy.data.materials[f'BoardFace_{i}'].node_tree.nodes['Lit'] for i in range(D.N_BOARDS)]
lamp_bsdf = [bpy.data.materials[f'BoardLamp_{i}'].node_tree.nodes['Principled BSDF'] for i in range(D.N_BOARDS)]
board_lights = [[o for o in bpy.data.objects if o.name.startswith(f'BL_{i}_')] for i in range(D.N_BOARDS)]
pools = {}
for o in bpy.data.objects:
    if o.name.startswith('TR_'):
        _, li, si, k = o.name.split('_'); pools.setdefault((int(li), int(si)), []).append((int(k), o))
pools = {key: [o for _, o in sorted(v)] for key, v in pools.items()}
for pool in pools.values():
    for o in pool: o.hide_render = not traffic   # with them hidden, their lamps cost nothing either
# at night the cars' shadows from the street lamps barely show (their contact shadow does) and nearly double the time
for o in bpy.data.objects:
    if o.name.startswith('CarBody_'): o.visible_shadow = not night
ours = bpy.data.objects['OurCar']
mirror = bpy.data.objects['RoadMirror']
mirror.hide_render = not night          # the dry road by day doesn't need it
OUR_BEAMS = [o for o in bpy.data.objects if o.name.startswith('OH_')]
CROSS = [float(o.name.split('_')[1]) for o in bpy.data.objects if o.name.startswith('CrossRoad_')]

def beams(y):
    """Crossroads have no street lamps, so there our beams light the road alone, and two narrow soft-edged cones left
    a dark gap between them. Through a crossroads they widen into one even pool (eased in and out over 5 m, where the
    lamps still light the road, and well clear of every stop)."""
    w = max([min(D.clamp((y - (c - 17.0)) / 5.0), D.clamp((c + 5.0 - y) / 5.0)) for c in CROSS] + [0.0])
    for o in OUR_BEAMS:
        o.data.spot_size = math.radians(75.0 + 25.0 * w); o.data.spot_blend = 1.0 - 0.5 * w

def board_light(i, t, k):
    L = D.lit(i, t)
    on_t = i - 0.3125                       # where the board passes half lit, coming toward it
    if night and on_t - 0.05 < t < on_t + 0.04 and (k * 7) % 5 < 2: L *= 0.2   # a neon flicker as it comes on
    return L

def place(t, k):
    c = D.camera(t, mode)
    cam.location = (c['x'], c['y'], c['z'])
    cam.rotation_euler = (math.pi / 2 + c['pitch'], c['roll'], -c['yaw'])
    cam.data.angle = math.radians(c['fov'])
    ours.location = (D.CAM_X, c['y'], 0.0)
    beams(c['y'])
    mirror.location.y = c['y'] + 150.0
    # only the lamps near the car cast shadows: dozens of shadowed lights overflow EEVEE's shadow pool
    for lo in STREET: lo.data.use_shadow = night and (c['y'] - 15.0 < lo.location.y < c['y'] + 75.0)
    for i in range(D.N_BOARDS):
        L = board_light(i, t, k)
        if night:
            face_lit[i].outputs[0].default_value = 0.16 + 1.9 * L
            lamp_bsdf[i].inputs['Emission Strength'].default_value = 10.0 * L   # the lamp heads: lit, not glaring
            for lo in board_lights[i]: lo.data.energy = 420.0 * L
        else:
            face_bsdf[i].inputs['Emission Strength'].default_value = 0.22
            lamp_bsdf[i].inputs['Emission Strength'].default_value = 0.0
            for lo in board_lights[i]: lo.data.energy = 0.0
    for li, lane in enumerate(D.LANES):
        for si, (model, off) in enumerate(lane['slots']):
            ys = D.traffic(lane, off, c['ts'], c['y']) if traffic else []
            pool = pools[(li, si)]
            if len(ys) > len(pool): print('WARN traffic pool short', li, si, len(ys), len(pool))
            for j, o in enumerate(pool):
                o.location = (lane['x'], ys[j] if j < len(ys) else -9999.0, 0.0)
    vl.update()
    return c

def corners():
    out = []
    for f in faces:
        mw = f.matrix_world
        pts = [world_to_camera_view(sc, cam, mw @ v.co) for v in f.data.vertices]
        out.append([[round(p.x, 5), round(1 - p.y, 5)] for p in pts] + [1 if all(p.z > 0.1 for p in pts) else 0])
    return out

n, ts = D.frames(mode)
jobs = []
if opt['t']:
    for t in [float(x) for x in opt['t'].split(',')]: jobs.append((f't{t:+.3f}', t, 0))
else:
    a, b, *st = [int(x) for x in (opt['frames'] or f'0:{n - 1}').split(':')]
    for k in range(a, min(b, n - 1) + 1, st[0] if st else 1): jobs.append((f'{k:04d}', ts[k], k))

# one line of facts per frame, written as it goes; frames already rendered are skipped, so a stopped run resumes
import time
log = f"{opt['out']}/meta.jsonl"
done = set()
if os.path.exists(log):
    for line in open(log):
        try: done.add(json.loads(line)['name'])
        except Exception: pass
t0 = time.time()
with open(log, 'a') as fh:
    for name, t, k in jobs:
        if name in done and os.path.exists(f"{opt['out']}/{name}.png"): continue
        c = place(t, k)
        sc.render.filepath = f"{opt['out']}/{name}.png"
        bpy.ops.render.render(write_still=True)
        fh.write(json.dumps(dict(name=name, k=k, t=round(t, 5), y=round(c['y'], 3), near=c['near'], reach=round(c['reach'], 4), boards=corners())) + chr(10)); fh.flush()
        print(f'FRAME {name} t={t:.3f} {time.time() - t0:.1f}s', flush=True)
print('RENDER OK', len(jobs), 'frames', round(time.time() - t0, 1), 's')
