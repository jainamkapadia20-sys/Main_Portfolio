# Turns the renders into the website's frames and manifest.
#   python encode.py            (after render.py has run for each theme and mode)
# Frames: CodeFiles/public/drive/<night|day>-<desktop|portrait>/NNNN.webp (wide frames scaled to 1600 × 900).
# Manifest: CodeFiles/public/drive/manifest.json — per mode, the frame count, size, the frame of each stop, and per
# frame where each billboard's face lands on screen (top-left, top-right, bottom-right, bottom-left, as 0..1) and the
# camera (x, y, z in metres, turn and tilt in radians, field of view in degrees): the player lines neighbouring frames
# up with it as it blends them, and draws the live traffic through it. The version also covers the traffic's files
# (webcars.py, envmap.py), so none is ever served from an old cache.
# Also writes CodeFiles/src/data/drive.json (the manifest's version), which the page imports so a new render is
# never served from an old cache.
import glob, hashlib, json, os, sys
from concurrent.futures import ProcessPoolExecutor
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drive as D

SRC = 'D:/Main Portfolio/city/out'
SITE = 'D:/Main Portfolio/CodeFiles'
DST = f'{SITE}/public/drive'
SIZE = {'desktop': (1600, 900), 'portrait': (900, 1600)}
QUALITY = 80
PARTIAL = '--partial' in sys.argv

def encode(job):
    src, dst, size = job
    try:
        im = Image.open(src).convert('RGB')
    except OSError:          # a frame still being written by the renderer (only possible with --partial)
        return 0
    if im.size != size: im = im.resize(size, Image.LANCZOS)
    im.save(dst, 'WEBP', quality=QUALITY, method=6)
    return os.path.getsize(dst)

def main():
    manifest = dict(modes={})
    digest = hashlib.sha1()
    jobs = []
    for mode in ('desktop', 'portrait'):
        n, _ = D.frames(mode)
        rows = {r['k']: r for r in json.load(open(f'{SRC}/corners_{mode}.json'))}   # from corners.py
        if len(rows) != n: raise SystemExit(f'{mode}: corners for {len(rows)} of {n} frames; run corners.py')
        boards = []
        for k in range(n):
            frame = []
            for b in rows[k]['boards']:
                if not b[4]: frame.append(None); continue
                bl, br, tr, tl = b[:4]                            # the face's own vertex order
                frame.append([round(v, 4) for p in (tl, tr, br, bl) for v in p])
            boards.append(frame)
        w, h = SIZE[mode]
        _, ts = D.frames(mode)
        cam = [[round(c['x'], 4), round(c['y'], 4), round(c['z'], 4), round(c['yaw'], 5), round(c['pitch'], 5), round(c['fov'], 3)] for c in (D.camera(t, mode) for t in ts)]
        manifest['modes'][mode] = dict(n=n, w=w, h=h, stops=[D.stop_frame(i, mode) for i in range(D.N_BOARDS)], boards=boards, cam=cam)
        for theme in ('night', 'day'):
            out = f'{DST}/{theme}-{mode}'
            os.makedirs(out, exist_ok=True)
            for k in range(n):
                src = f'{SRC}/{theme}_{mode}/{k:04d}.png'
                if not os.path.exists(src):
                    if PARTIAL: continue          # a preview while rendering: the player skips missing frames
                    raise SystemExit(f'missing {src}')
                jobs.append((src, f'{out}/{k:04d}.webp', (w, h)))
    with ProcessPoolExecutor() as ex:
        sizes = list(ex.map(encode, jobs, chunksize=8))
    for (src, dst, _), size in zip(jobs, sizes):
        if size: digest.update(open(dst, 'rb').read())
    total = {}
    for (src, dst, _), size in zip(jobs, sizes):
        key = os.path.basename(os.path.dirname(dst)); total[key] = total.get(key, 0) + size
    for f in sorted(glob.glob(f'{DST}/cars/*.glb') + glob.glob(f'{DST}/env-*.hdr') + [f'{DST}/scene.json']):
        if os.path.exists(f): digest.update(open(f, 'rb').read())
    body = json.dumps(manifest, separators=(',', ':'))
    digest.update(body.encode())
    version = digest.hexdigest()[:10]
    manifest['version'] = version
    open(f'{DST}/manifest.json', 'w').write(json.dumps(manifest, separators=(',', ':')))
    os.makedirs(f'{SITE}/src/data', exist_ok=True)
    open(f'{SITE}/src/data/drive.json', 'w').write(json.dumps(dict(version=version), indent=1) + '\n')
    for k, v in total.items(): print(f'{k}: {v / 1e6:.1f} MB')
    print('ENCODE OK', version, f'manifest {os.path.getsize(f"{DST}/manifest.json") / 1e3:.0f} KB')

if __name__ == '__main__':
    main()
