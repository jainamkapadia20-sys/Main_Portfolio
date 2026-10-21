# Build log: Jainam Kapadia portfolio

A running record of what was built, decided and checked, newest session at the bottom. Times are IST (UTC+5:30).

## Where things live

| What | Where |
|---|---|
| Brief | `PORTFOLIO_PROMPT.md` |
| Design references | `.claude/references/` (`_SYNTHESIS.md` first) |
| Car photos (plates blurred) and blueprint | `.claude/references/car/` |
| Concept mockups (Phase 1) | `.claude/concepts/` |
| 3D car model sources and renders | `.claude/models/` |
| Site code (Astro) | `CodeFiles/` |
| Scratch work (measurements, overlays) | `D:\claude-scratch\` (outside the repo) |

---

## Session 1 (14 and 18–19 Oct 2026)

- Connected the repo `jainamkapadia20-sys/Main_Portfolio` at `D:\Main Portfolio`. Git author set to that account only.
- Phase 0 (ingest) done. Decisions:
  - Stack: Astro + plain CSS, static output, cross-document View Transitions. Code in `CodeFiles/`.
  - Student, "Open to internships". Full name shown in the hero.
  - Home: one long page with a "false bottom" hero, then Work (4 small cards), then one small car card, then About/Skills, then Contact.
  - Dark and light themes. A "JK" monogram.
  - Accent: taillight red. Dark grey nods to Sonic Grey Pearl.
- Phase 1 (concept): three directions (A Drawing Sheet, B Instrument, C Editorial). Feedback: the car was too dominant, cards too big, not enough motion. Chosen: **mix of A and B**, styled after Enrico Deiana and lenis.dev. Mockup: `.claude/concepts/ab-home.html` (Lenis smooth scroll, reveals, letter rolls, odometer, copy-email).
- First 3D car attempt (lofted outline from the blueprint): rejected as blobby.

## Session 2 (19 Oct 2026)

### 03:20 Recovered context
- Session 1 ran from `CodeFiles/`, so its memory sat in a separate folder. Copied it into this project's memory so it loads either way.

### 03:25 Preview and feedback
- Live preview: `npx live-server@1.2.2 --port=5500` from `.claude/`, opened `concepts/ab-home.html`.
- Diagnosed the mockup's choppy scrolling: it writes a CSS variable on `:root` every frame (whole-page style recalculation), redraws a page-tall SVG line each frame, and reveals cards late (12% into view, 1.1 s). Fix scheduled with the motion work.
- New photos saved with plates blurred: `08-front-34-highway-hires.jpg`, `09-side-left-trees.jpg`, `10-side-right-dirt.jpg`, `11-front-34-hills.jpg`.

### 03:30–04:20 Car model rebuilt from scratch (stock first)
**Measuring**
- Mapped the Hum3D blueprint and the side photo onto a shared 300 px/m frame (front and rear wheel centres pinned to ±1.30 m).
- Spec used: length 4.44 m, width 1.695 m, height 1.495 m, wheelbase 2.60 m, 175/65 R15 tyres.
- The blueprint model sits about 4% lower than the Indian-spec car. Scaled its heights to the 1.495 m roof, after which its window line matches the owner's photo.
- From the photo, near-plane features: window line 0.99 → 1.09 m, door handles at 0.925 and 1.02 m, shoulder crease just below them, headlamp tail at x = 1.635 m, taillamp tip at x = −1.76 m, fuel flap 21 × 17 cm.

**New method** (`.claude/models/city_sdf.py`, `city_build.py`)
- The body is one implicit surface:
  - side, front and rear profiles from the blueprint;
  - plan-view sections of the nose and tail at eight heights;
  - a shoulder crease and a rising lower sweep line with a concave scoop below it;
  - a rocker step, the cabin's tumblehome and plan taper, crowned roof, bonnet and boot;
  - wheel-arch cuts.
- Meshed with surface nets, projected exactly onto the surface, then relaxed along it so edges stay straight.
- Details are separate parts fitted onto the skin from outlines traced in a chosen view: side glass and frame, B-pillar, quarter divider, mirror sail, chrome belt moulding, windscreen, cowl, rear window, all door/bonnet/boot/bumper gaps, fuel flap, side repeater, headlamps, chrome wing bar, H badge, fog lamps, taillamps, chrome garnish, reflectors, mirrors, handles, shark fin.
- Grille, lower intake, fog housings and the rear plate recess are cut with exact booleans, so their edges are clean.
- Wheels: revolved tyre and rim profiles with spokes, disc and caliper.

**Checking against the references**
- The side, front and rear silhouettes overlay the blueprint closely. The width came out 4 cm too wide once; traced to a negative extrapolation and fixed.
- Solved the camera of photo 08 from 9 known points (rms 14 px) and overlaid the render. Headlamps, grille, fog housings, mirror and left wheels line up.

**Problems hit and fixed**
- Black wheel-well tubes poked out under the car → replaced with dark faces inside the arches.
- Jagged window-line step → made continuous.
- Bulbous nose → plan-view sections per height, crisper edges.
- Headlamps spilling onto the bonnet → flatter bonnet with roll-off only at the edges, and the bonnet edge lowered onto the grille top.
- Ragged recess edges → moved from the implicit surface to boolean cutters.

**Machine note**
- The C: drive is 100% full (237 GB, 0 free), which is not caused by this work. Scratch work moved to `D:\claude-scratch\`.

### 04:20–04:50 Car model: owner's mods, web export
- **Lamps:** headlamps and taillamps wrap the corners, so they are now filled in a cylindrical "wrap" view. The earlier single-direction projection folded their outlines.
- **Stock lamps:** chrome reflector with a projector, red taillamps with a reverse lamp, chrome garnish.
- **Owner's car (photos 02–11):**
  - Mugen-style wing: plate uprights and a blade with upturned ends, placed from the side photo.
  - Five Y-spoke 17" wheels on 205/45 R17 tyres, red calipers.
  - Projector headlamps with LED U-guides and a lower LED strip.
  - Smoked Urus-style taillamps: twin red LED bars that fork at the corner (traced from photos 04/07).
  - Gloss black wing bar, red H badges.
  - Twin burnt-titanium tips, left side.
  - Blank plates.
  - Door sponsor stack and windshield banner. Decal textures come from `models/city_decals.py`: plain lettering, not brand artwork.
- **Other:** two bonnet creases, better mirrors, shark fin.
- **Web export:** decimation caused streaky shading and sawtooth creases, so the body now ships at 8 mm without it. Vertices sit exactly on the surface, so facet error is under 0.1 mm. GLBs: modified 1.43 MB, stock 1.37 MB (Draco).
- **Remaining model gaps** (listed for later): the front bumper is still softer than the real one; the rear bumper looks a little bulky; mirrors are simplified; no interior (dark tinted glass hides it).

### 04:50 Phase 1 closed
- Direction: A+B mix (memory `portfolio-decisions`).
- Mockup choppiness fixed: the scroll value is now written only on the three elements that use it, not `:root`; cards reveal earlier (−4% margin, 0.9 s).

### 04:55–05:15 Phases 2 and 3: design system + static skeleton (`CodeFiles/`)
**Plan:** `docs/superpowers/plans/2026-10-19-phase-2-3.md` (superpowers:writing-plans → executing-plans).

**Rulings** (decisions taken without asking, and what they cost if wrong):
- Worked on `main` with no worktree and no commits, because none were requested. Cost: the user commits when ready.
- Astro **6.4.8**, not 7.x: Astro 7 needs Node ≥ 22.22 and this machine has 22.19. Cost: a later upgrade, about one command.
- **Dark is the default theme** (latest Phase 1 decision), not the system setting. Cost: one CSS block swap.
- **StackCard not built:** sticky stacking was rejected in Phase 1 feedback.
- **/car is not in the nav**, per "forget about the garage idea".
- 3D viewer loads **on click only**, not automatically in view: smallest JS cost, and the brief allows click. Cost: one IntersectionObserver later.
- Work filter and slat scrubbing deferred to Phase 4 (as planned). The category list is static for now.

**Built**
- **Tokens** (`src/styles/global.css`): colour per theme, type scale with `clamp()`, 8 px spacing, motion durations and eases, z-index scale.
- **Contrast**, computed rather than assumed:

  | Text | Dark | Light |
  |---|---|---|
  | Ink | 15.3 | 17.2 |
  | Graphite | 6.2 | 5.4 |
  | Accent | 5.2 | 5.1 |
  | Accent on surface (worst case) | 4.8 | 4.7 |

- **Fonts:** self-hosted, 2 files:
  - Archivo variable, subset to Latin with wght 400–800 and wdth 62–100: 49 KB (was 90 KB).
  - Geist Mono 400: 10 KB.
- **Components** (`src/components/`): Chrome (four corners; phones get a top bar and a popover menu with no JS), Monogram, ThemeToggle, GridOverlay (G key), RollText, Pill, Counter (odometer columns), TickRuler, SpecSheet, Placeholder, MediaBlock, BigWord, Toast, Footer, ProjectCard (Enrico-style), ProjectSlat, ProjectTile.
- **Content collections** (`src/content.config.ts`): `projects` (4 placeholders) and `car` (city.md). Adding a project = copying one .md file.
- **Pages:**
  - `/` hero with false-bottom title block, cards, car card, about, contact.
  - `/work` with Index/Grid views (works without JS via `:target`).
  - `/work/[slug]` with hero morph target, spec sheet, sections, media blocks and next project.
  - `/about`, `/contact`, `/car` (poster LCP, click-to-load model-viewer, stock/modified switch, reset view, spec sheet, build list, photos), `/404`, `/system` (noindex).
  - `sitemap.xml`, `robots.txt`, an OG image, the favicon monogram, and cross-document view transitions in CSS.
- **3D viewer:** `@google/model-viewer` 4.3.1 + three 0.183.2, self-hosted Draco decoder in `public/draco/`. Its 295 KB gz loads only after the click.

**Verification (Playwright + Chrome)**
- **Screenshots:** 8 pages × 375 / 768 / 1280 / 1440. No horizontal overflow after fixing `/system`.
- **axe-core:** 0 violations on 9 pages × 2 themes × 2 widths. Fixed on the way: label-in-name on the theme button and the Instagram and "Let's talk" links; corner chrome not in a landmark; corner contrast over content.
- **Keyboard:**
  - The skip link comes first and jumps to `#main`.
  - Every link and button shows the focus outline.
  - G toggles the grid.
  - The phone menu opens with the keyboard and closes with Esc.
  - The theme persists with no flash.
  - Targets are at least 24 px (44 px on phones).
- **Lighthouse (mobile), all 100 / 100 / 100 / 100:**

  | Page | LCP | CLS |
  |---|---|---|
  | Home | 1.05 s | 0.017 |
  | Work | 0.9 s | 0 |
  | Case study | 1.21 s | 0 |
  | Car | 1.50 s | 0 |

  The car page started at 1.9–2.7 s. Fixed by: gallery `sizes`, `content-visibility` on the photo section (photos no longer compete with the poster), inlined CSS, and the font subset.
- **JS on first load:** about 1 KB inline per page; `/car` adds 1.6 KB gz.
- **Bug found and fixed:** the home page lost its "current page" mark and its canonical became `/index`, because `build.format: 'file'` serves `/index.html`.
- **Build note:** npm and npx write logs to the full C: drive, so builds run as `node node_modules/astro/bin/astro.mjs build` with `npm_config_cache` on D:.

### 05:15–05:25 Phase 3 review and fixes
Fresh-context review (pr-review-toolkit code-reviewer): 1 critical and 12 important findings. All 13 fixed and verified in the browser:
1. **Copy-email without JS:** it is now a real `mailto:` link; JS copies to the clipboard on top.
2. **`featured` field:** now controls which projects appear on Home.
3. **Phone grid:** CSS specificity broke the 4-column layout of the "Selected work" header.
4. **/car download failure:** a failed viewer download is caught and the button re-enabled.
5. **/car retry:** a retry replaces the failed viewer instead of stacking a second one.
6. **/car status:** the status line is now announced (`role="status"`).
7. **/car focus:** focus moves to the version switch after loading.
8. **Phone menu:** it closes when focus leaves it (it covers the page).
9. **robots.txt:** the `Disallow: /system` line is removed, so crawlers can see the page's noindex.
10. **Browser-bar colour:** one `theme-color` value that follows the theme.
11. **Long titles:** display type wraps (`overflow-wrap: break-word`).
12. **/system transitions:** cards there no longer duplicate morph names.
13. **Alt text:** the schema rejects a real image without alt text. Checked by making the build fail on a test project, then pass once it was removed.

**After fixes:**
- axe is clean.
- Lighthouse home 100×4 (LCP 1.08 s); car 100×4 (LCP 1.50 s, CLS 0).
- Build: 11 pages.

**Deferred minors:**
- model-viewer 4.3.1 logs debug messages to the console when it loads (library noise).
- Host check: with `build.format: 'file'`, confirm the host serves `/work` from `work.html` next to the `work/` folder. Vercel (planned) does.

## Status at end of Phase 3

**Done:**
- Phase 1, closed.
- Phase 2: design system + `/system`.
- Phase 3: every page static, with checks.
- Car model v2: stock + modified, web-ready GLBs.

**Next:**
- Phase 4: Work index scrubbing and filter, case-study block system, image pipeline with real images.
- Phase 5: motion pass, including Lenis and GSAP where justified, with reduced-motion fallbacks.
- Phase 6: audit.
- Phase 7: handover README; deploy only on request.
- Car model: front bumper sculpting, rear bumper shape, real mirror geometry.

**Needs Jainam:**
- LinkedIn URL.
- Car engine, gearbox and variant.
- Whether the door decals stay (they're in some photos, not others).
- A domain.
- Whether to commit and push.

## Session 2, continued: Phases 4–7 (19 Oct, 16:40 onwards)
Jainam's answers:
- LinkedIn: added.
- Engine: researched as the **L15A**, 1.5 L SOHC 16-valve i-VTEC, 119 PS at 6,600 rpm, 145 Nm at 4,600 rpm. Gearbox is 5-speed manual or CVT, still to confirm.
- **No door decals:** removed from the model and the decal script. The car was rebuilt (GLB 1.42 MB) with a new poster.
- **Don't push:** nothing committed or pushed.

Asked to install and use:
- `ui-ux-pro-max` and `design-motion-principles` (on every project).
- The `transitions.dev` skills.

All were reviewed before install: local scripts and docs only, no network or shell calls. Installed in `~/.claude/skills/` and noted in `~/.claude/CLAUDE.md` and memory. ui-ux-pro-max's design-system query matched our direction (Swiss minimalism, Archivo). Its blue accent and ClientRouter suggestions were not taken, because the brief fixes red and native cross-document transitions.

### Phase 4: work system (done)
- **Cover art:** designed SVG covers for the 4 placeholder projects (cluster gauge, voice waveform, driver app, brand grid) replace the grey X boxes.
- **Case blocks:** `blocks[]` in frontmatter (`full`, `two`, `text-image`, `quote`, `video`). Each block names the section it follows (`after: Process`). The body is split at its `##` headings and rendered with `@astrojs/markdown-remark` (pinned 7.2.0, already shipped with Astro). The schema requires alt text for any real image in a block.
- **Work index:**
  - Numbered filter; counter and tick ruler follow the active slat.
  - The strip scrubs by wheel (only while it can still move), mouse drag (never misfires a click), ←/→, and ←/→ buttons (the single-pointer alternative to dragging that WCAG 2.2 requires).
  - Without JS: everything shows and the Grid view still works.
- **Case pages:** ←/→ go to the previous/next project, with a keycap hint; `rel=prev/next`.
- **Car page:** a Drawings section with side, front and plan SVG elevations. Outlines are traced from the model's orthographic renders and inner lines come from the model's own definitions, with red dimension lines (4440 / 2600 / 1495 / 1695).
- **Verified (Playwright):**
  - →→ gives 3/4 and 67%.
  - Filter "Visual" gives 1/1.
  - Step buttons work.
  - At 375 the strip scrolls and the page has no overflow.
  - Case-page ← → navigate.
  - Build: 11 pages.

### Phase 5: motion (done)
Skills: design-motion-principles (Create mode; weighting Jakub primary, Jhey secondary, Emil for frequent/keyboard interactions) and transitions.dev (token scale, toast recipe, spinning-counter idea, texts-reveal).
- **Lenis** 1.3.26 smooth scroll. Pinned to the August release rather than 1.3.27 (4 days old). Never started for reduced motion; anchors stay native so the skip link keeps moving focus; the 3D stage and an overflowing slat strip opt out of wheel smoothing.
- **Hero** (the one orchestrated moment): the name rises out of word masks (1.1 s, 90 ms stagger), then role, bio and title block lift in with a blur (transitions.dev texts reveal).
- **Reveals:** an IntersectionObserver adds `.in` once.
  - Text: opacity + 16 px rise + 4 px blur, 700 ms.
  - Media: clip-path wipe with the image settling from 1.08.
  - Hidden only when JS runs; a 2.5 s safety net shows everything if the motion script never loads.
- **Scroll-linked** (CSS scroll timelines, Chromium; static elsewhere): top progress hairline (Lenis fallback), hero name drift, card inner parallax, About statement and "Let's talk" / next-project fill, footer ruler cursor following page progress.
- **Micro-interactions:**
  - Letter roll on nav, footer and social links (350 ms, 12 ms stagger).
  - Pill press 0.97.
  - Card image 1.035 on hover.
  - Odometer reels roll in when seen and on filter changes.
  - The ruler cursor glides, and moves on transform rather than `left`.
  - Toast rises in more slowly than it leaves.
  - Phone menu enters with `@starting-style` and staggered links.
  - Blueprints draw in (outline, details, then dimensions).
  - Cross-document page transitions: the old page fades, the new one rises, project images morph and the chrome stays put.
- **Reduced motion:** verified in Playwright. 0 hidden elements, Lenis off, everything static.
- **JS on first load:** 5.8 KB gz (Lenis + runtime), plus about 1 KB inline.
- **Lighthouse after motion:** home 100 (LCP 1.22 s), car 100 (1.67 s), case 100 (1.41 s), about 100 (1.21 s).
  - Work dropped to 90 (CLS 0.196) because JS-only controls were unhidden late. They now show through the `.js` class set before first paint, so they never shift the layout: CLS 0, perf 100, LCP 1.55–1.76 s.

### Phase 6: audit (paused ~17:15 at Jainam's request, resumed and done)
- **Cross-browser** (Playwright: Chrome, Firefox, WebKit × 375/768/1280/1440 × 8 pages): no overflow, no console errors; phone menu and theme toggle work; reveals all fire. The /work and /system "hidden" hits were the intentionally dimmed slats and the hidden Grid view.
- **WebKit (Playwright's Windows build) garbled the variable-width display type**, even with the original font file. Fixes:
  - Display type now uses a static instance, "Archivo Display" (wdth 62, wght 800, 10.6 KB, preloaded).
  - The two 80–85% statements now use normal width.
  - WebKit renders correctly now.
- **Lighthouse, after the fixes:**
  - Mobile: 100/100/100/100 everywhere except car at 99 (LCP 1.81 s).
  - Desktop: all 100 (LCP ≤ 0.79 s).
  - `/system` SEO 69 is expected: it is noindex on purpose.
- **axe after the font change:** 0 violations (9 pages × dark/light × 375/1280). The first run flagged contrast on text caught mid-fade; rerun after the transitions settle, it was clean.
- **Screen-reader spot check** (accessibility tree via Playwright role queries). Fixed:
  - The red "•" beside the current nav link and active filter was being read aloud. It now uses CSS alt text (`content: "• " / ""`), with the plain form kept as a fallback.
  - Missing spaces between visually separate spans ("concept2026", "Let'stalk") are fixed in the cards, tiles, the car card and the contact heading.
- **Fresh code review of Phases 4–5.** It found 6 issues; all are fixed and checked in Chrome against the built site:
  1. The page couldn't scroll while the pointer was over an overflowing work strip. Lenis's `overscroll-behavior: contain` trapped vertical wheel. Now the strip's wheel handler stops its scrub events reaching Lenis, and the hand-off attribute is gone. Check: 16 slats; the wheel scrubbed to the end (2746/2746), then the page scrolled (y 614).
  2. The ← / → step buttons moved focus into the strip, so a second Enter opened a project. Only arrow keys move focus now. Check: focus stays on the button.
  3. After a drag released outside the strip, the next keyboard Enter on a slat was swallowed. Now only real mouse clicks (`detail > 0`) are blocked after a drag. Check: Enter navigates.
  4. Case blocks without `after` rendered twice when the body opens with text before any `##` heading. The intro section no longer collects blocks. This is a one-line guard, traced in code but not run: no current project has an intro paragraph.
  5. The car page's whole stage turned off smooth scroll before the model loaded, causing a hitch. The attribute now sits on the live `model-viewer` only.
  6. Work slats skipped their clip-path wipe and flashed full colour before greying. The grey and dim now apply to the image inside the slat, not the frame. Check: the frame transitions `clip-path`; the image starts `grayscale(1)`.
- **Below the reviewer's bar, not fixed:**
  - `## ` inside a fenced code block in a project body would split a section.
  - Relative images inside the Markdown body won't resolve; use `blocks` for images, as the README says.

### Phase 7: handover (done)
- `CodeFiles/README.md` covers:
  - running and building;
  - where everything lives;
  - adding a project (fields, blocks with `after`, placeholders, alt text, image sizes);
  - editing the car page;
  - changing colours, type and motion;
  - the pre-publish checklist;
  - Vercel deploy settings.
- Nothing committed or pushed, as asked.

## Status at end of Phase 7
- **Done:** Phases 0–7. Built, audited (Lighthouse, axe, three browsers, reduced motion, screen reader), reviewed twice, and documented.
- **Needed from Jainam:**
  - Design feedback. You've said you don't like the look yet; that's the next round.
  - The car model discussion.
  - Gearbox (5MT or CVT) and the variant, for the car spec sheet.
  - The real domain (`site` in `astro.config.mjs`).
  - Real project content and images to replace the 4 placeholders.
  - When to commit and push.

## Session 3 (20 Oct 2026): redesign after Jainam's first review

**Feedback, in short:**
- The site was static, bland and lifeless, and the name appeared three times on one screen.
- The status/discipline title block was pointless.
- Project cards were plain and scattered.
- Case studies should lead with the result, then the process, with scroll animation and a progress bar.
- The car section was unbalanced, used a weak render, and the 3D viewer filled the screen.
- Use the references (richardmattka.com/work/ozworld, aristidebenoist.com/jacques-marie-mage) properly.

**Root cause of "zero animation":**
- Windows *Animation effects* is off on Jainam's PC, so Chrome reports `prefers-reduced-motion: reduce`.
- The old build switched off every animation, smooth scroll and the progress bar in that mode.
- Policy now: reduced motion means calm, not frozen. Fades, dial fills, the progress bar and the speed readout stay; sliding, pinning, parallax and Lenis go.

**Studied live** (Playwright, scrolling captures):
- Aristide: framed media, a giant title overlapping the frame, an A–D spec line, balance in one viewport.
- Mattka: result first, then stats, then frames inside corner brackets; ambient glow.

**Skills used:**
- ui-ux-pro-max design-system search. Took its "scroll-triggered storytelling + progress indicator" pattern; rejected its brutalist style and blue palette.
- design-motion-principles in Create mode, weighted Jakub, then Jhey, then Emil for frequent interactions.

**Built:**
- **Palette "dusk drive",** taken from the sunset photo of the car: night asphalt #0B0D12, taillight red, dusk apricot #FFB38A, Sonic Grey Pearl #7D8FAD. A fixed ambient glow drifts with scroll, plus film grain.
- **Type:**
  - Display type is now title-case variable Archivo (wdth 72, wght 800). The static uppercase cut is removed.
  - The name appears once on Home.
  - The chrome is the monogram only.
  - The fixed bottom corners are removed.
- **Shared scroll loop:** `drive.ts`, one rAF loop giving smoothed speed and progress.
- **Hero:**
  - Tachometer (`Tach.astro`), 0–8 ×1000 r/min, with the red band from 6.6 (L15A peak power).
  - Cluster start-up sweep on load, then idle at 850 with flutter. The needle follows scroll speed.
  - The name's letters drive in (blur, compressed width, then full width), lean with scroll speed, and widen and warm near the pointer.
- **Speed readout HUD:** km/h plus a segmented rev bar. It appears only while scrolling.
- **Showroom:** selected work pinned on Home. Vertical scroll drives framed panels sideways; the nearest panel comes into focus, with counter and ruler. Phones and reduced motion get a plain list or swipe row.
- **Garage section:** the real sunset photo with parallax, dials for 119 PS / 145 Nm / 6.6k r/min, mod chips.
- **Work index:** Aristide-style list. Big names on the left; a sticky framed preview on the right wipes to the hovered project, with its A–D spec, counter and ruler. The old slat strip and grid views are removed, along with their components.
- **Case study:**
  - Result first: the title overlapping a contained frame, an A–E spec line and the summary, then "The result" (the Outcome section).
  - Then "How I got there": process chapters beside a sticky chapter rail whose line fills as you read.
- **Car page:**
  - The real highway photo leads, framed. Dials plus spec sheet, the build list.
  - The 3D model sits in a contained studio frame next to its notes, showing the side drawing until "View in 3D" is clicked.
  - Better 3D look: AgX tone mapping, neutral environment, softer shadows, glossier pearl paint.
  - The WebGL check moved to the click (it cost 760 ms TBT on load).

**Checks:**
- axe: 0 violations (7 pages × dark/light × 375/1280).
- Cross-browser (Chromium/Firefox/WebKit × 4 widths): no overflow, no errors.
- Lighthouse mobile: Home, Work and the case study 100/100/100/100; car 99/100/100/100 (LCP 1.8 s).

**Still open:**
- The 3D model's geometry (the separate rebuild discussion).
- Real project content.
- Gearbox and variant.
- Domain.

### Session 3, round 2 (20 Oct): reversible motion, engine, video
- **Home order:** hero, showroom, About, car, contact.
- **Reveals run both ways:** an element animates out when it leaves through the bottom (scrolling back up) and in again on the way down. The exit is quicker than the entrance. Counters, dials, blueprints, word reveals and labels all replay.
- **Engine** (`scripts/engine.ts`): rev physics plus a Web Audio synth of a tuned turbocharged four-cylinder.
  - Firing note with a half-order lope.
  - i-VTEC crossover at 5,200 r/min: second-order scream, brighter filter.
  - Turbo whistle and spool air, blow-off valve on lift-off, overrun pops.
  - 7,000 r/min limiter bounce.
  - Hold the gauge or "Hold to rev" (or Space/Enter); sound toggle remembered.
  - The tach shows a VTEC lamp, boost readout and flashing shift light; the hero glows red and the name shakes with revs.
  - Recorded output checked: −15 dB mean, −3 dB peak, harmonics track the revs.
- **Video** (`public/video/city-lake.mp4`, 1600×900, 30 fps, 7.2 MB, 19 s):
  - Opening walk-through trimmed.
  - Plate tracked and blurred on every frame (OpenCV template matching; 1,151 frames, 0 low-confidence).
  - Replaces the portrait photo in the car section. Plays muted only on screen, with a Pause button. Reduced motion starts it paused.
  - The poster is attached only near the viewport; on load it had pushed home LCP from 1.7 s to 2.8 s.
- **Added from the references:**
  - Masked word reveals on display headings (Lusion/Aristide).
  - Labels that decode like an HMI readout (Lusion).
  - Magnetic pills.
  - The hero name pulls apart as you scroll away (scrubbed, reverses).
  - Page transitions where the new page wipes up over the old one, with project images morphing.
  - Gallery parallax on the car page.
- **Checks:**
  - axe 0 violations.
  - Chromium, Firefox and WebKit at 4 widths: no problems.
  - Lighthouse mobile: home 99–100 (LCP 1.7 s), case 100, car 99.

### Session 3, round 3 (20 Oct): first real project, Adaptive Cluster
- **Analysed the Miro board** "SIP Mentorship" (public, view-only) through Playwright: an accessibility-outline text dump plus zoomed captures.
  - Covered the research question and Q1–Q4 clusters, the two-mode design brief, scenario flowcharts, the frontend/backend mapping for 5 features, tabletop toy-car prototyping, wireframes and revised variations.
  - Left out: the hobbies/fashion/food/values clusters (a different exercise), the Gemini-generated images and a process diagram that may be a template.
- **Figma** needs sign-in, so the 12 screens were cropped from Jainam's screenshot (about 220 px each). They are stand-ins until the 2× exports arrive (`src/assets/projects/adaptive-cluster/screens/`, same names).
- **New `cluster` block type** (schema + `ClusterPlayer.astro`):
  - One framed screen at a time with Highway/Traffic tabs and a step list.
  - Each step pairs what the sensors do with what the screen shows.
  - Auto-advances every 3.6 s while on screen, with a progress bar; pauses on hover/focus; Play/Pause button.
  - Reduced motion: no autoplay, opacity-only fades.
- **`adaptive-cluster.md`** replaces the "EV Cluster Concept" placeholder.
  - Result first: Outcome text plus the player.
  - Then chapters: Research (with quote "Important alerts get buried."), Two modes, Sensor to screen (mapping image), Prototyping (tabletop image), Layouts (sketches).
  - Duration is set to "To confirm".
- **brag:** plugin installed (`brag@brag` 0.4.0). On Opus 5.5 it hands off to brag-slim.
  - `brag-output/`: `brag-plan.md`, `brag.mp4` (23 s, 1920×1080, 30 fps, 4.2 MB), `brag.jpg` (poster baked in as frame 0), `share-copy.txt`.
  - The video was drawn in the browser as a pure function of time and captured frame by frame.
  - Soundtrack is original, synthesised in Python (A minor, 100 BPM). The bundled tracks' licence is unverified.
  - Re-render for the final once the hi-res screens exist: replace `brag-output/work/screens/*.png`, then run `node frames.mjs` (in `D:\claude-scratch\tools`) and the ffmpeg line in the log.

### Session 3, round 4 (20 Oct): sharp screens, a real promo film, redrawn wireframes
- **Figma (now shared as view-only):** all 12 frames captured at native resolution (2000×1000) in a visible Chrome.
  - Panned, then zoomed in closed-loop to 50% at 2× device pixels.
  - Each frame located by template match against Jainam's thumbnails; Figma's UI hidden by script.
  - Corners made transparent. Replaced the soft crops on the site.
- **Promo film rebuilt** (`brag-output/brag.mp4`, 40.5 s, 1080p30; web copy `public/video/adaptive-cluster.mp4`, 5.2 MB, now on the case study).
  - The cluster is built live from Jainam's own layers: frames registered (ECC), then cut into plates with digits, needles, value arcs and signs painted out, plus 26 element sprites.
  - Animated in code on top: start-up needle sweep, counting digits, value arcs, light streaks along the lane lines (vanishing point 984,319), signs popping, exit card dropping in and counting 2.4 → 0.6 km, indicator blinks, amber lane wiping in, warnings popping, scan-line switch to traffic mode, cars approaching, ring green → amber → red, red zone, pedestrian, Confirm/OK tap and bay fill, slide to the parking cameras, red emergency pulse with camera shake.
  - Camera moves in 3D with a reflection; lower thirds 01–08.
  - Original sound design in sync: start-up chime, panned indicator ticks, proximity beeps speeding up, parking sensor beeps, braking impact and alarm, over a 100 BPM A-minor bed.
  - Runs 40 s instead of brag's usual 15–25, so every feature gets a readable beat.
- **Wireframes:** Jainam's four revised layouts redrawn as clean hand-drawn vectors (rough.js + Kalam), keeping his layout, labels and values. Now in the Layouts chapter as two two-ups (`wireframe-a…d.png`).

### Session 3, round 5 (21 Oct): first commit and GitHub Pages
- GitHub Pages deploy: `.github/workflows/pages.yml` builds `CodeFiles/` with `SITE`/`BASE=/Main_Portfolio`; `scripts/rebase.mjs` prefixes the hand-written root links (nav, project links, fonts, videos, models, srcsets) and fails the build if any are left.
- Base-aware spots: `astro.config.mjs` (site/base from env), Chrome current-page match, sitemap, the Draco decoder path.
- Checked locally under `/Main_Portfolio/`: 6 pages, nav, a project, the 3D model; 0 failed requests.
- `.gitignore` keeps render scratch out (frame dumps, intermediate layers, WAVs, Blender backups, tool screenshots).
- Pushed as jainamkapadia20-sys (never the -sudo account).
