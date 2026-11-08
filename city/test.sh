#!/usr/bin/env bash
# Rebuilds the city and renders test stills for night and day: test.sh [scale] [samples] [t-list] [mode]
cd "D:/Main Portfolio/city"
SCALE=${1:-50}; SAMPLES=${2:-32}; TS=${3:--0.625,0,0.5,1,3}; MODE=${4:-desktop}
"D:/Blender/blender.exe" -b --factory-startup -P build.py > out/build.log 2>&1
grep -q "BUILD OK" out/build.log || { grep -A12 Traceback out/build.log | head -30; exit 1; }
for th in night day; do
  rm -f "D:/Main Portfolio/city/out/test_${th}_$MODE/meta.jsonl"
  "D:/Blender/blender.exe" -b --factory-startup out/city.blend -P render.py -- $th $MODE --t "$TS" --scale $SCALE --samples $SAMPLES --out "D:/Main Portfolio/city/out/test_${th}_$MODE" > out/test_$th.log 2>&1
  grep -q "RENDER OK" out/test_$th.log || { grep -A12 Traceback out/test_$th.log | head -30; exit 1; }
  grep "FRAME" out/test_$th.log | tail -2
done
python - "$TS" "$MODE" <<'PY'
import sys
from PIL import Image
ts = [float(x) for x in sys.argv[1].split(',')]; mode = sys.argv[2]
for th in ('night', 'day'):
    ims = [Image.open(f'D:/Main Portfolio/city/out/test_{th}_{mode}/t{t:+.3f}.png') for t in ts]
    w, h = ims[0].size; cols = 2 if w > h else 4
    rows = (len(ims) + cols - 1) // cols
    c = Image.new('RGB', (w * cols + 6 * (cols - 1), h * rows + 6 * (rows - 1)), (255, 0, 255))
    for k, i in enumerate(ims): c.paste(i, ((k % cols) * (w + 6), (k // cols) * (h + 6)))
    c.save(f'D:/Main Portfolio/city/out/test_{th}_{mode}_sheet.png')
print('sheets ok')
PY
