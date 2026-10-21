---
id: 02-lusion
title: Lusion
url: https://lusion.co
captured: 2026-10-19
type: portfolio
priority: strong
borrow: [motion, typography, navigation, layout]
avoid: [long blocking loader, full-page WebGL, virtual scroll]
---

# Lusion

## Why it's here
This is the benchmark for premium motion and polish: per-letter rolling text, a pill nav, crosshair grid marks, and a 3D ribbon threading through the page. Take the **micro-details**, not the WebGL weight.

## Stack (observed)
- Astro (with `_astro/hoisted` bundles) and Three.js, using 3 canvases. A custom virtual scroll (the document height equals the viewport, and scroll is simulated).
- Fonts: **Aeonik** (400/500), **IBM Plex Mono**, and a custom **LusionMono**.

## Layout & grid
- A header row: logo top-left, a 3-line intro statement in the centre, and pill buttons on the right (`—` sound toggle, `LET'S TALK •`, `MENU ••`).
- Below that sits a big rounded-corner hero panel (radius about 16px) holding the WebGL scene, inset from the page edges.
- **Crosshair `+` marks** sit at column intersections along a horizontal line under the hero, with `SCROLL TO EXPLORE` centred. These are registration marks, which is pure blueprint.
- Sections: a huge 2-line headline ("Bold Ideas, / Brought to Life"), then a small paragraph and a pill CTA in the right column, and an image card in the left column.

## Typography
- Aeonik at 36–96px+ for headlines, weight 400, tight leading of about 1.1.
- Labels: 14px uppercase, weight 500.
- Big words like `PLAY REEL` are set huge and pale, and fill in on scroll.

## Colour
- Background: a very light cool lavender-grey (about `#f0f1fa`). Text near-black.
- Accent: **electric/ultramarine blue** (about `#2a3cff`), used on the 3D ribbon, image duotones, and dark pill buttons.
- Images are often duotone (blue + white).

## Motion & interaction

### Loader
- A progress bar fills, then morphs into the "L" logo mark. A 3-digit counter `000 → 100` in the bottom-left rolls digit by digit like an odometer.
- **Feel:** slow. It took over 15s here, which is too long.
- **Steal level:** the idea of the **rolling odometer digits only**. Never a blocking loader.

### Per-letter roll on hover
- Each letter of nav and project titles is duplicated in a vertical stack (the DOM shows each letter repeated 2–4×). On hover the stack translates on Y, so the letters roll to a duplicate with a slight stagger per letter.
- **Feel:** about 400ms, ease-out-expo, with a stagger of about 20ms per letter.
- **Mobile:** none.
- **Reduced motion:** a colour change only.
- **Steal level:** exact. This is cheap with CSS `translateY` plus `transition-delay: calc(var(--i) * 20ms)`.

### Pill buttons with a dot
- Rounded pills with a small dot `•` that animates on hover (it grows, or slides to an arrow).
- **Steal level:** the idea. An HMI-style status dot.

### 3D ribbon
- A blue tube winds through sections and around content as you scroll.
- **Steal level:** the idea only. An **SVG path drawn with `stroke-dashoffset` on scroll** gets 80% of the feel at about 0 KB.

### Scroll-filled big words
- Huge pale words fill with solid colour as you scroll.
- **Steal level:** exact. Use CSS `animation-timeline: view()` on `background-size` or `clip-path`.

## Navigation & transitions
- `MENU` opens a full overlay with large rolling-letter links (HOME, ABOUT US, PROJECTS, CONTACT) and a newsletter field.
- The footer is very large with a `CONTINUE TO SCROLL` prompt that leads into the next page (an infinite page chain).

## Personality / car link
- The odometer loader counter, and the crosshair registration marks.

## What NOT to copy
- Long blocking load, full-viewport WebGL, and virtual scroll. These break native scroll and accessibility, and hurt our budgets.
- Sound on by default.

## Notes
Take the **craft details**: rolling letters, pills, `+` marks, odometer digits and scroll-filled type. Leave the engine behind.
