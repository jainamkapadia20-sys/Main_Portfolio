# Jainam Kapadia, portfolio

An Astro site. The pages are static HTML, and JavaScript adds only smooth scroll, reveals and a few small interactions. Content lives in Markdown files, so adding work never means editing code.

## Run it

You need Node 22.12 or newer.

```bash
cd CodeFiles
npm install        # first time only
npm run dev        # local site at http://localhost:4321, reloads as you edit
npm run build      # builds the finished site into dist/
npm run preview    # serves dist/ to check the build
```

If your C: drive is full, npm fails with "nospc". Point its cache at another drive first: `set npm_config_cache=D:\npm-cache`.

## Where things live

| What | Where |
|---|---|
| Name, email, socials, nav, status line | `src/site.ts` |
| Projects (one file each) | `src/content/projects/*.md` |
| Project images | `src/assets/projects/` |
| Car page text, specs, mods, photos | `src/content/car/city.md` |
| Car photos, poster, blueprint drawings | `src/assets/car/` |
| 3D models | `public/models/honda-city.glb` (modified), `public/models/honda-city-stock.glb` (stock) |
| Colours, type sizes, spacing | `src/styles/global.css` (the `:root` tokens at the top) |
| Animation | `src/styles/motion.css` and `src/scripts/motion.ts` |
| Pages | `src/pages/` (`index`, `work/`, `about`, `contact`, `car`, `404`, `system`) |
| Design system sheet (not linked anywhere) | `/system` |

## Add a project

1. Copy `src/content/projects/adaptive-cluster.md` and give the copy a new name, for example `dashboard-redesign.md`. The file name becomes the address (`/work/dashboard-redesign`).
2. Put its images in `src/assets/projects/` (a subfolder per project keeps things tidy).
3. Fill in the fields at the top:

```yaml
title: Dashboard Redesign
year: 2026
type: HMI concept               # short label shown in cards and the spec sheet
role: [UX research, UI]
tools: [Figma, ProtoPie]
duration: 6 weeks
summary: One sentence, at most 160 characters. Shown on cards and as the page description.
category: HMI                   # one of: HMI, UX/UI, Product, Visual (drives the Work filter)
cover: ../../assets/projects/dashboard-redesign/cover.jpg
coverAlt: Describe what the cover shows.
coverRatio: 4 / 3
featured: true                  # true = also shown on Home
order: 5                        # position in lists (lower comes first)
placeholder: false
blocks: []                      # pictures between the text, see below
```

4. Write the story under these headings: `## Overview`, `## Problem`, `## Process`, `## Solution`, `## Outcome`. The case study shows the result first: the cover under the title, then the `## Outcome` (or `## Result`) section and its blocks. Every other `## Heading` becomes a process chapter, listed in the sticky chapter rail. You can rename or add chapters freely.
5. Run `npm run dev` and open `/work`. If a field is missing or wrong, the terminal says exactly which one.

### Blocks: the pictures between sections

Each block says which section it follows (`after:`). Blocks without `after` go at the end.

```yaml
blocks:
  - { type: full, after: Solution, src: ../../assets/projects/dashboard-redesign/screen.png, alt: The main screen at night., ratio: 21 / 9, caption: Night mode. }
  - type: two
    after: Process
    items:
      - { src: ../../assets/projects/dashboard-redesign/sketch.jpg, alt: Early sketch., ratio: 4 / 3 }
      - { src: ../../assets/projects/dashboard-redesign/test.jpg, alt: Testing in the car., ratio: 4 / 3 }
  - { type: text-image, after: Solution, text: A detail worth a closer look., src: ../../assets/projects/dashboard-redesign/detail.png, alt: Close-up of the gauge., ratio: 4 / 5, flip: false }
  - { type: quote, after: Problem, text: "A line from a user interview.", cite: Driver, 34 }
  - { type: video, after: Outcome, src: /video/walkthrough.mp4, alt: Walkthrough of the prototype., ratio: 16 / 9 }
```

- Leave out `src` and the block shows a labelled grid-paper placeholder at that ratio, so you can lay a page out before the images exist.
- Every image with a `src` needs `alt` text; the build stops and says so if it is missing.
- Videos go in `public/video/` (MP4, H.264, ideally under 10 MB). Put the text in quotes if it contains a comma or a colon.

### Image sizes

Export at the ratio you set, about 2× the size shown. The site makes the smaller versions and modern formats on its own.

| Use | Ratio | Export size |
|---|---|---|
| Cover (cards, tiles) | 4 / 3 | 1600 × 1200 |
| Case hero (crops the cover) | 21 / 9 | keep the cover's subject centred |
| Full-width block | 21 / 9 or 16 / 9 | 2400 wide |
| Two-up and text-image | 4 / 3, 4 / 5, 1 / 1 | 1600 wide |

## Edit the car page

Everything is in `src/content/car/city.md`: specs (`engine`, `power`, `torque`, `transmission`, …), the list of mods, the photos and their alt text. The car page opens on `front-highway.jpg` and the Home garage section uses `rear-sunset.jpg` (both in `src/assets/car/`); swap the imports at the top of `src/pages/car.astro` and `src/pages/index.astro` to change them. The dials (power, torque, peak r/min) are set in those two files. To replace a 3D model, overwrite the `.glb` in `public/models/` with the same name. Keep it under 5 MB, Draco-compressed. The model's source scripts live in `.claude/models/` in the repo root.

## Change the look

- **Colours:** the tokens at the top of `src/styles/global.css` (`--paper`, `--ink`, `--graphite`, `--accent`), once for the dark theme (default) and once for light. Keep text contrast at 4.5:1 or more.
- **Type:** Archivo (variable) for text, a fixed "Archivo Display" cut for big headings, Geist Mono for labels. The files are in `public/fonts/`.
- **Motion:** `src/styles/motion.css`, plus `src/scripts/drive.ts` (one scroll loop that feeds the tachometer, speed readout, progress bar and showroom). Visitors who ask their device for reduced motion get a calmer site: fades only, no sliding, pinning or smooth scroll. Keep that when adding new animation.
- **Seeing the full motion on Windows:** if *Settings → Accessibility → Visual effects → Animation effects* is off, browsers report "reduced motion" and you see the calm version.
- **Grid:** press <kbd>G</kbd> on any page to see the 12-column grid.
- **Engine sound:** `src/scripts/engine.ts`. The revs, VTEC point (5.2), limiter (7.0) and every sound level are set there; the tachometer in `src/components/Tach.astro` drives it.
- **Car video:** `public/video/city-lake.mp4` with its poster `src/assets/car/lake-poster.jpg`. Keep videos as H.264 MP4 under about 8 MB, no sound, with plates blurred.

## Before publishing

1. `npm run build` passes.
2. Check the pages in Chrome, Safari and Firefox, on a phone and a desktop.
3. Run Lighthouse (Chrome DevTools, Mobile). The site scored 100 for Performance, Accessibility, Best Practices and SEO when it was handed over.
4. In `astro.config.mjs`, set `site` to the real domain (it drives canonical links, the sitemap and share images), and update `public/robots.txt`.

## Deploy

**GitHub Pages (live now):** every push to `main` runs `.github/workflows/pages.yml` (in the repo root). It builds `CodeFiles/`, prefixes links for the `/Main_Portfolio/` path (`scripts/rebase.mjs`) and publishes to https://jainamkapadia20-sys.github.io/Main_Portfolio/. Progress shows under the repo's **Actions** tab.

**Own domain later:** point the domain at GitHub Pages (or Vercel with Root Directory `CodeFiles`), then set `SITE` to the domain and remove `BASE` in the workflow, because the site will live at the root.
