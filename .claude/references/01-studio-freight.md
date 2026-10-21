---
id: 01-studio-freight
title: Studio Freight
url: https://studiofreight.com
captured: 2026-10-19
type: portfolio
priority: must-match
borrow: [grid, typography, navigation, layout, colour]
avoid: [heavy tracking scripts]
---

# Studio Freight

## Why it's here
This is the closest match to the "architectural grid" idea. It's a calm, paper-white page where the work itself is the decoration, framed by tiny mono labels in the four corners. Studio Freight also makes Lenis (ref 05).

## Stack (observed)
- Nuxt (Vue) with Lenis smooth scroll. No WebGL on the home page.
- Easing tokens on `:root` for the full Penner set (`--ease-out-expo: cubic-bezier(.19,1,.22,1)`, `--ease-out-quart`, and so on). **Borrow this idea:** named easing tokens.
- Spacing tokens: `--spacer-2/4/6/8/12/16/24/32/40/48/64/88/104/112/128/144/164/188/288`.
- Colour tokens with alpha steps: `--black-5` to `--black-95` and `--white-5` to `--white-95`.

## Layout & grid
- **Home is one fixed viewport with no scroll** (page height = viewport height). A 7×7 grid of equal landscape cells (about 16:10) fills the screen edge to edge with very small gutters (about 6px).
- Project thumbnails occupy *some* cells and leave others empty, so the empty cells form a shape around a centred headline.
- The headline sits in the empty middle: a single serif line, about 38px, centred.
- **Four-corner chrome**, all tiny mono text at about 14px:
  - top-left: logo mark
  - top-centre-left: breadcrumb `• Home`
  - top-right-centre: comma-separated nav `Work, Info, News, Aeon`
  - far right: `Contact`
  - bottom-left: `IG / LI`; bottom-centre: `Studio Freight`; bottom-right: `©2026 / Terms`
- Whitespace: extreme. The chrome is almost invisible, so the images do all the talking.

## Typography
- Display: **JJannon** (a classical serif), weight 400, around 38px on home and huge on the Work page.
- UI/labels: **Publico Text Mono**, 14px, line-height about 1.12, letter-spacing 0.01em. Capitalised, not uppercase.
- Hierarchy trick: an elegant serif headline against tiny monospace chrome. The contrast in *genre* (serif vs. mono) does the work, not size alone.

## Colour
- Background `#fefdfc` (a warm off-white, not pure white). Text `#000`. A dark grey `#1a1a1a` for inverted areas.
- No accent colour. All the colour comes from the project imagery.

## Motion & interaction

### Grid tile reveal (home)
- **Trigger:** load, and on a loop.
- **What moves:** thumbnails pop into grid cells one by one, then shuffle or cycle. Tiles appear and disappear in a staggered order.
- **Feel:** quick cuts or fades, about 200–400ms each, staggered so the grid feels alive.
- **Interruptible?** Yes. It's ambient.
- **Mobile:** fewer columns.
- **Reduced motion:** show a static grid.
- **Steal level:** the idea. A blueprint-cell grid that fills with project thumbnails around my name.

### Typewriter section title (Work page)
- **Trigger:** load.
- **What moves:** a giant serif word types out letter by letter with a blinking caret (`EXPE|` becomes `EXPERIENCE`), preceded by a small logo tile.
- **Feel:** a steady typing rhythm.
- **Steal level:** the idea, possibly for page titles. Use it sparingly.

### View toggle
- The Work page has `Grid / Slider / Zoom` view switches in mono text at the top centre. The same data appears in different layouts.
- There's a numbered category filter (`01 AI & Technology` … `08 Other`).
- **Steal level:** exact. A view switch and a numbered filter suit a blueprint index.

## Navigation & transitions
- Text-only nav. The current page is marked with a bullet `•`. Page changes are quick fades.
- The Work index uses mixed-size image tiles (masonry-like but grid-aligned) with mono captions underneath.
- The footer CTA is a huge stacked `WORK / WITH / US →`.

## Personality / car link
- The Work filter (`01 … 08`) reads like a parts catalogue, and the four-corner labels read like a title block on a technical drawing. Both fit the blueprint idea.

## What NOT to copy
- Analytics and tracking script bloat.
- Pure image-only tiles with no visible labels. Hover or focus must reveal the project name for accessibility.

## Notes
This is the best reference for **structure, chrome, type contrast and restraint**. Use it as the baseline. Everything else layers on top of it.
