---
id: 03-aristide-benoist
title: Aristide Benoist (design by Jon Way Studio)
url: https://aristidebenoist.com
captured: 2026-10-19
type: portfolio
priority: must-match
borrow: [layout, motion, typography, navigation, transitions]
avoid: [WebGL-only image rendering, text hidden from readers]
---

# Aristide Benoist

## Why it's here
This is the best reference for a **project index as an interaction**. The projects are vertical slats you scrub through, and each one opens into a full case view. It also has a lettered spec-sheet format (A/B/C/D) that maps directly onto our project data plates.

## Stack (observed)
- Custom vanilla JS (a single `d.js`) with 2 canvases. Images are rendered in WebGL for distortion effects. No framework.
- Fonts: **jws** (a custom condensed display, weight 700) and **TNY** (a tiny text face). The UI text is 11–12px.

## Layout & grid
- A dark home screen (`#141414`-ish) with a centred horizontal row of **~10–13 tall, narrow image slats** (about 1:3 ratio) with small gaps, offset to the right of centre.
- Corner chrome:
  - top-left: condensed logo `ARISTIDE`
  - top-right: `ABOUT`
  - bottom-left: `INDEPENDENT DEVELOPER / AVAILABLE …`
  - bottom-right: `EMAIL / INSTAGRAM / TWITTER`, stacked
- **Top centre: a tick-mark scrubber**, about 30 thin vertical ticks like a ruler, showing your position. It reads as a measurement scale. **Very blueprint.**
- Whitespace: huge. Content only appears in the middle band.

## Typography
- Display: an ultra-condensed bold uppercase face, used at giant sizes in project view.
- UI: 11–12px uppercase, generous letter-spacing, tiny everywhere.
- **Project metadata is lettered:**
  ```
  A  COMPLETED   FEBRUARY 2022
  B  TYPE        PROMOTIONAL
  C  ROLE        FULLSTACK DEV & MOTION
  D  CLIENT      MGM STUDIOS
  ```
  This is a spec sheet with row letters, like a drawing's title block.
- Counters use the format `04 / 30` and `01 30`.

## Colour
- The home and index are dark (`#141414`), with images desaturated to greyscale.
- Project view **inverts to light grey** (`#e5e5e3`-ish) with black type.
- There's no accent. Colour only appears in project images.

## Motion & interaction

### Slat scrub (index)
- **Trigger:** wheel/drag scrolls the slats horizontally. Hovering one slat brightens it (greyscale to full tone) while the others stay dim.
- **Feel:** smooth inertia, with eased lerp following the input.
- **Mobile:** swipe.
- **Reduced motion:** a static list.
- **Steal level:** the idea. A strip of narrow cover crops that you scrub, which is a great "Projects" index.

### Slat to full project expand
- **Trigger:** click a slat.
- **What moves:** the slat widens into a large landscape image in the centre while the background flips dark to light. The project's name splits into **giant condensed letters that flank the image** (e.g. `J M | image | M`). Neighbouring projects peek in at the edges, cropped.
- **Feel:** about 800ms, ease-in-out-expo, with all pieces choreographed together.
- **Interruptible?** Scrolling returns you to the slat index.
- **Steal level:** exact feel. Use the **View Transitions API**: give the slat `view-transition-name: project-{slug}` and morph it into the hero image.

### Tick scrubber
- The active tick grows or brightens. The `04 [▭] 30` counter shows the current and total project.
- **Steal level:** exact. This is a ruler-style progress indicator.

## Navigation & transitions
- `ABOUT` opens an overlay containing:
  - a bio paragraph in caps
  - links with `↗` arrows
  - a **client list from A to Z**
  - **awards as counts** (`30 SITE OF THE DAY`, `27 DEVELOPER AWARD`), with numbers that roll
- A big `EXPLORE` link, centred under the project.

## Personality / car link
- The tick ruler reads like an instrument gauge, and the lettered spec rows read like a vehicle data plate.

## What NOT to copy
- Text rendered only in canvas or split into one span per letter. Real text must stay in the DOM so screen readers can read it.
- 11px body text. Our labels are at least 12px and body text at least 16px.

## Notes
Use this for **the Projects index, the project-open transition, the spec-sheet format, and ruler-style progress**.
