# The city drive

The home page's projects section is a drive through a city built in Blender: the scroll picks a pre-rendered frame,
and each project's poster is laid onto its billboard in the browser (`CodeFiles/src/fx/citydrive.ts`). The frames
have no traffic: the same cars drive live over them in the browser (`CodeFiles/src/fx/traffic.ts`), through each
frame's own camera and on the same lanes, so the city keeps moving wherever the scroll stops. This folder builds and
renders that city and exports what the live traffic needs.

| File | What it does |
|---|---|
| `drive.py` | The layout and timing shared by everything: where the billboards stand, where the car stops, how the camera turns to each board, the frame counts, and the traffic lanes (they repeat every 8 s). |
| `build.py` | Builds the whole city and saves `out/city.blend`: road, pavements, crossroads, lamps, trees, buildings (windows light up at night), billboards, and the cars from `../car3d`. Day and night live in one file: materials read the scene property `night`. |
| `render.py` | Renders frames, without traffic: `blender -b --factory-startup out/city.blend -P render.py -- <night\|day> <desktop\|portrait> [--frames a:b] [--t 0,1.5] [--scale 50] [--samples 32] [--traffic 1]`. Resumable: it skips frames already done. `--traffic 1` puts the cars in, for reference renders to match the live cars against. |
| `renderall.sh` | Renders all four drives (night and day, wide screens and phones). About 1.5 hours on a GTX 1650 Ti. |
| `webcars.py` | Exports the cars for the browser (`CodeFiles/public/drive/cars/`: full quality for computers, a lite copy for phones, a far copy for distant traffic) and `scene.json` (lanes, lamps, sun, haze). |
| `envmap.py` | Renders the street all round by night and by day (`env-<theme>.hdr`): the live cars' reflections and light. |
| `corners.py` | Where every billboard face lands on screen in every frame, without rendering: `out/corners_<mode>.json`. |
| `encode.py` | Turns the renders into WebP frames in `CodeFiles/public/drive/` and writes the manifest the page reads: each frame's billboard corners and camera (the player lines neighbouring frames up with it, and draws the live traffic through it) (`--partial` for a preview while rendering). |
| `test.sh` | Rebuilds and renders a few test stills by day and night, with a contact sheet. |

## After changing the city

```bash
"D:/Blender/blender.exe" -b --factory-startup -P build.py
bash renderall.sh
"D:/Blender/blender.exe" -b --factory-startup out/city.blend -P corners.py
"D:/Blender/blender.exe" -b --factory-startup out/city.blend -P webcars.py
"D:/Blender/blender.exe" -b --factory-startup out/city.blend -P envmap.py -- night
"D:/Blender/blender.exe" -b --factory-startup out/city.blend -P envmap.py -- day
python encode.py
```

Then build and deploy the site as usual. The manifest carries a version, so browsers never mix old and new frames.

## Adding or removing a project

`drive.py`'s `N_BOARDS` must match the number of projects (seven now). With a different count the city needs a
rebuild and a full render. Changing a project's title or cover needs nothing here: the posters are drawn in the
browser.

## Cars

The traffic uses the six models in `../car3d`, all licensed CC BY 4.0 and credited on the site's /credits page. Only add
models with a licence that allows commercial use, and credit them there.
