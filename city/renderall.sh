#!/usr/bin/env bash
# Renders every frame of both drives (wide screens and phones) by night and by day, without traffic (the website
# drives the cars live over the frames). Resumable: run it again to carry on.
cd "D:/Main Portfolio/city"
for job in "night desktop" "day desktop" "night portrait" "day portrait"; do
  set -- $job
  echo "=== $1 $2 $(date +%T)"
  "D:/Blender/blender.exe" -b --factory-startup out/city.blend -P render.py -- $1 $2 --samples 32 > "out/render_$1_$2.log" 2>&1
  grep "RENDER OK\|Traceback" "out/render_$1_$2.log" | tail -2
done
echo "=== all done $(date +%T)"
