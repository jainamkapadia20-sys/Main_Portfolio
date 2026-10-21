---
id: 07-samsy
title: Samsy (SMSY-Gen02)
url: https://samsy.ninja
captured: 2026-10-19
type: interaction
priority: inspiration
borrow: []
avoid: [game-world navigation, WebGPU dependency, heavy load]
---

# Samsy

## Why it's here
This is the extreme end: a **portfolio as a playable 3D game world**. It's included as an example of what **not** to build for a professional design portfolio, plus one or two small ideas.

## Stack (observed)
- Custom Three.js running on the **WebGPU** engine, a single canvas, and one JS bundle. The page height equals the viewport; there's no document scroll.
- It shows a debug readout: `Connected: 1, Engine: WebGPU, Frame: 65 ms, 8 FPS`, improving to 23 FPS on my machine.
- Font: Forma DJR Display.

## Experience
- The site opens on a `/tutorial` route: a dark, neon-red lit 3D room with a character. On-screen key prompts (`↑ ← ↓ →`, then `W A S D`, `SPACE`) teach you to move. There's a `SKIP` pill.
- Neon signage and sci-fi panels line the walls.
- Navigation is done by walking a character around.

## Motion & interaction

### On-screen key prompts
- Glowing keycap UI that lights up as you press each key.
- **Steal level:** the idea, possibly as a tiny keyboard-shortcut hint (e.g. `← →` to move between projects) in our HMI style.

### Telemetry/debug readout
- A live `FPS / frame ms` line in the corner.
- **Steal level:** the idea. A small mono "telemetry" readout (e.g. scroll %, section number) fits the HMI/instrument flavour if it's kept tiny.

## What NOT to copy
- Everything structural. Game navigation, WebGPU, slow frame rates, no readable text for screen readers, and nothing that works without JS.
- This is exactly the "3D garage" direction we parked.

## Notes
This is a cautionary reference. It confirms the decision to keep the portfolio **professional, readable and fast**. At most, borrow the keycap hint and the telemetry readout as micro-details.
