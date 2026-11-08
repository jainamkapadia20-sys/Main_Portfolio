# The street all round, by night and by day, for the live cars' reflections and light on the website:
#   blender -b --factory-startup out/city.blend -P envmap.py -- <night|day>   -> CodeFiles/public/drive/env-<theme>.hdr
# Cycles, an equirectangular camera at car height in the middle of the drive, looking along +x (the web's +x, the
# centre of a three.js equirect), with the scene lit exactly as render.py lights that frame.
import bpy, sys, math
theme = sys.argv[sys.argv.index('--') + 1]
sys.argv = [sys.argv[0], '--', theme, 'desktop', '--out', 'D:/Main Portfolio/city/out/prof']
ns = {}
exec(open('D:/Main Portfolio/city/render.py', encoding='utf-8').read().split('n, ts = D.frames(mode)')[0], ns)
D, place = ns['D'], ns['place']
sc = bpy.context.scene
place(3.0, D.stop_frame(3, 'desktop'))
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'CUDA'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception as e: print('CPU', e)
sc.cycles.samples = 96; sc.cycles.use_denoising = True
cam = sc.camera
cam.data.type = 'PANO'; cam.data.panorama_type = 'EQUIRECTANGULAR'
cam.location = (D.CAM_X, D.stop_y(3, 'desktop') + 6.0, 1.0)
cam.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1024, 512, 100
sc.render.use_compositing = False
sc.render.image_settings.file_format = 'HDR'
sc.render.filepath = f'D:/Main Portfolio/CodeFiles/public/drive/env-{theme}.hdr'
bpy.ops.render.render(write_still=True)
print('ENV OK', theme)
