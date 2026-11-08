# Where every billboard's face lands on screen, for every frame of both layouts, without rendering anything.
#   blender -b --factory-startup out/city.blend -P corners.py      -> out/corners_<mode>.json
import bpy, sys, json
for mode in ('desktop', 'portrait'):
    sys.argv = [sys.argv[0], '--', 'night', mode, '--out', 'D:/Main Portfolio/city/out/prof']
    ns = {}
    exec(open('D:/Main Portfolio/city/render.py', encoding='utf-8').read().split('n, ts = D.frames(mode)')[0], ns)
    D, place, corners = ns['D'], ns['place'], ns['corners']
    n, ts = D.frames(mode)
    rows = []
    for k, t in enumerate(ts):
        place(t, k)
        rows.append(dict(k=k, t=round(t, 5), boards=corners()))
    open(f'D:/Main Portfolio/city/out/corners_{mode}.json', 'w').write(json.dumps(rows))
    print('CORNERS', mode, n)
