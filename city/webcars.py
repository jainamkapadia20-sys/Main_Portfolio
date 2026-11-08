# Exports what the website needs to drive the traffic live over the rendered frames (the frames have no cars):
#   blender -b --factory-startup out/city.blend -P webcars.py
#   - CodeFiles/public/drive/cars/<key>.glb: the same scaled, joined car as in the render (front +Y in Blender, so -Z on
#     the web; wheels on the ground) at full quality for computers: ~120k triangles, its own materials with all their
#     maps (colour, normal, roughness, metalness) at up to 1024 px, Draco-compressed
#   - <key>-lite.glb, for phones: ~40k triangles, colour maps only at up to 512 px
#   - <key>-far.glb, for distant traffic: ~2,500 triangles in one material, each face keeping its colour
#   - CodeFiles/public/drive/scene.json: per car its length and lamp materials and positions; the street lamps; the
#     sun; the haze; the lanes
# (envmap.py makes the street's light for the cars' reflections.)
import bpy, sys, json, os, re
import numpy as np
sys.path.insert(0, 'D:/Main Portfolio/city')
import drive as D

OUT = 'D:/Main Portfolio/CodeFiles/public/drive'
os.makedirs(f'{OUT}/cars', exist_ok=True)
HEAD = {'gt3rs': ['led_lights', 'headlight_1.001_0'], 'aventador': ['HdLightsLens', 'LightEmissiveWhite'], 'agera': ['Mat_Headlight'], 'city': ['CityHead'],
        'm4': ['front_light'], 'rwb': ['color_-1028735251', 'color_183']}
TAIL = {'gt3rs': ['brakelight', 'taillight_running'], 'aventador': ['GlassRedLights'], 'agera': ['Mat_RearLight', 'Mat_TaillightDetail'], 'city': ['CityTail'],
        'm4': ['rear_light'], 'rwb': ['color_16711680', 'color_16711690']}
LENGTH = {'gt3rs': 4.57, 'aventador': 4.94, 'agera': 4.29, 'city': 4.44, 'm4': 4.67, 'rwb': 4.30}
GLTF = dict(use_selection=True, export_format='GLB', export_image_format='WEBP', export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=7, export_apply=True, export_yup=True, export_materials='EXPORT',
            export_animations=False, export_lights=False, export_cameras=False)

def bsdf_of(m):
    return next((n for n in m.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None) if m and m.use_nodes else None

def tris_of(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)

def copy_of(o, name):
    c = o.copy(); c.data = o.data.copy(); c.name = name
    bpy.context.scene.collection.objects.link(c)
    for coll in list(c.users_collection):
        if coll != bpy.context.scene.collection: coll.objects.unlink(c)
    c.location = (0, 0, 0)
    return c

def select(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o

def decimate(o, target):
    n = tris_of(o)
    if n <= target: return
    dm = o.modifiers.new('Decimate', 'DECIMATE'); dm.ratio = target / n; dm.use_collapse_triangulate = True
    select(o); bpy.ops.object.modifier_apply(modifier=dm.name)

def prepare(o, key, maps, px):
    """Readies a car's materials for the web. maps=False keeps only colour maps; px caps every image's size (scaling
    also loads each image, so every one can be written out)."""
    for slot in o.material_slots:
        m = slot.material; b = bsdf_of(m)
        if not b: continue
        nt = m.node_tree
        for l in list(b.inputs['Emission Strength'].links): nt.links.remove(l)   # the lamps are switched on the web
        # the 964 came with its colours only in its materials' names (color_<0xAARRGGBB as an int>): the import left
        # them black, so they are read back from the names
        named = re.fullmatch(r'color_(-?\d+)(\.\d+)?', m.name)
        if named and not b.inputs['Base Color'].links:
            v = int(named.group(1)) & 0xFFFFFFFF
            lin = lambda c: (c / 255) / 12.92 if c <= 10 else ((c / 255 + 0.055) / 1.055) ** 2.4
            b.inputs['Base Color'].default_value = (lin((v >> 16) & 255), lin((v >> 8) & 255), lin(v & 255), 1.0)
        if not maps:
            for name in ('Normal', 'Roughness', 'Metallic', 'Coat Normal', 'Specular Tint'):
                if not b.inputs[name].links: continue
                for l in list(b.inputs[name].links): nt.links.remove(l)
                # with its map gone, the value left behind is often 0 or 1 (a mirror): give it a plausible one
                if name == 'Roughness': b.inputs[name].default_value = 0.45
                if name == 'Metallic': b.inputs[name].default_value = 0.0
        for n in nt.nodes:
            if n.bl_idname != 'ShaderNodeTexImage': continue
            img = n.image
            if not img or 0 in tuple(img.size):   # unreadable: drop it rather than point the file at nothing
                for out in n.outputs:
                    for l in list(out.links): nt.links.remove(l)
                continue
            cap = 1024 if max(img.size) >= 2048 else px
            k = min(1.0, cap / max(img.size))
            img.scale(max(1, round(img.size[0] * k)), max(1, round(img.size[1] * k)))
            if img.depth != 32:
                # as plain 8-bit RGBA: the exporter can't combine a greyscale map into its metal/rough image
                w, h = img.size; buf = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(buf)
                new = bpy.data.images.new(img.name + '_rgba', w, h, alpha=True)
                new.colorspace_settings.name = img.colorspace_settings.name
                new.pixels.foreach_set(buf); n.image = new
    # plain materials that look the same become one, so each is one draw on the web
    seen = {}
    for slot in o.material_slots:
        m = slot.material; b = bsdf_of(m)
        if not b or any(l for i in b.inputs for l in i.links): continue
        if any(s.lower() in m.name.lower() for s in HEAD[key] + TAIL[key]): continue
        sig = (tuple(round(v, 2) for v in b.inputs['Base Color'].default_value[:3]), round(b.inputs['Roughness'].default_value, 1),
               round(b.inputs['Metallic'].default_value, 1), round(b.inputs['Alpha'].default_value, 1), round(b.inputs['Transmission Weight'].default_value, 1))
        if sig in seen: slot.material = seen[sig]
        else: seen[sig] = m
    select(o); bpy.ops.object.material_slot_remove_unused()

def export(o, path, **kw):
    select(o); bpy.ops.export_scene.gltf(filepath=path, **{**GLTF, **kw})
    return round(os.path.getsize(path) / 1e6, 2)

for o in [o for o in bpy.data.objects if o.name.startswith('CarBody_')]:
    key = o.name.split('_', 1)[1]
    full = copy_of(o, f'web_{key}')
    decimate(full, 120000); prepare(full, key, maps=True, px=1024)
    print('CAR', key, tris_of(full), 'tris,', len(full.material_slots), 'materials,', export(full, f'{OUT}/cars/{key}.glb'), 'MB', flush=True)
    lite = copy_of(full, f'lite_{key}')
    decimate(lite, 40000); prepare(lite, key, maps=False, px=512)
    print('LITE', key, tris_of(lite), 'tris,', export(lite, f'{OUT}/cars/{key}-lite.glb'), 'MB', flush=True)
    # the far copy: one material, each face keeping its colour (a texture's average)
    far = copy_of(lite, f'far_{key}')
    def colour(m):
        b = bsdf_of(m)
        if not b: return (0.5, 0.5, 0.5)
        for l in b.inputs['Base Color'].links:
            n = l.from_node
            if n.bl_idname == 'ShaderNodeTexImage' and n.image and n.image.size[0]:
                px = np.empty(len(n.image.pixels), np.float32); n.image.pixels.foreach_get(px)
                return tuple(px.reshape(-1, 4)[:, :3].mean(axis=0))
        return tuple(b.inputs['Base Color'].default_value[:3])
    cols = [colour(s.material) for s in far.material_slots] or [(0.5, 0.5, 0.5)]
    me = far.data
    attr = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for p in me.polygons:
        r, g, b_ = cols[min(p.material_index, len(cols) - 1)]
        for li in p.loop_indices: attr.data[li].color = (r, g, b_, 1.0)
    me.color_attributes.active_color = attr
    me.materials.clear()
    fm = bpy.data.materials.new(f'far_{key}'); fm.use_nodes = True
    fb = bsdf_of(fm); vc = fm.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
    fm.node_tree.links.new(vc.outputs['Color'], fb.inputs['Base Color'])
    fb.inputs['Roughness'].default_value = 0.35; fb.inputs['Metallic'].default_value = 0.2
    me.materials.append(fm)
    decimate(far, 2500)
    print('FAR', key, tris_of(far), 'tris,', export(far, f'{OUT}/cars/{key}-far.glb', export_vertex_color='ACTIVE'), 'MB', flush=True)

# the scene's facts for the web, in Blender's metres (x across, y along the road, z up)
cars = {k: dict(length=LENGTH[k], head=HEAD[k], tail=TAIL[k], lamps=[[sx * 0.62, LENGTH[k] / 2 - 0.15, 0.68] for sx in (-1, 1)],
                rear=[[sx * 0.6, -LENGTH[k] / 2 + 0.12, 0.78] for sx in (-1, 1)]) for k in HEAD}
lamps = sorted([[round(v, 2) for v in o.matrix_world.translation] for o in bpy.data.objects if o.name.startswith('SL_')], key=lambda p: p[1])
sun = bpy.data.objects['Sun'].matrix_world.to_3x3() @ __import__('mathutils').Vector((0, 0, -1))   # the way the sunlight travels
worlds = {w.name: dict(start=w.mist_settings.start, depth=w.mist_settings.depth) for w in bpy.data.worlds if w.name in ('Night', 'Day')}
json.dump(dict(cars=cars, lamps=lamps, sun=[round(v, 4) for v in sun], mist=worlds, period=D.TRAFFIC_PERIOD,
               lanes=[dict(x=l['x'], dir=l['dir'], v=l['v'], slots=l['slots']) for l in D.LANES]),
          open(f'{OUT}/scene.json', 'w'), separators=(',', ':'))
print('SCENE OK', len(lamps), 'lamps')
