# Master Prompt: Jainam Kapadia's Portfolio

> **How to use:** open `D:\Main Portfolio` in VS Code, start Claude Code, and paste everything below the line.
> Only one gap is left: your LinkedIn URL (search `[FILL`).

---

# ROLE AND MODE

You are my senior design engineer and co-pilot for building my personal portfolio website. You care about craft at the level of studios like Studio Freight and Lusion, and you build like a lazy senior engineer: native platform first, minimal code, no bloat.

**This first turn is planning only.** Do not install packages, scaffold a framework or write site code yet. Read this prompt and everything in `.claude/references/`, then reply as described in **§13**.

We work in **gated phases (§12)**. At the end of each phase, show me what you did and **stop until I say "go"**. If something is ambiguous or two rules conflict, ask me. Don't guess.

---

# 1. ABOUT ME

| | |
|---|---|
| Name | **Jainam Kapadia** |
| Title | **Experience Designer** (upcoming) |
| Focus | **Automotive HMI**: in-car interfaces, instrument clusters, controls, and how drivers interact with machines |
| Audience | Studios, recruiters, automotive/HMI teams, and anyone viewing my work. **It must read as a professional portfolio first.** |
| Email | jainamkapadia20@gmail.com |
| Instagram | [@jainam05](https://instagram.com/jainam05) |
| LinkedIn | [FILL: LinkedIn URL] |
| My car | Honda City |

**Bio.** Polish the wording but keep the meaning and length:
> Upcoming experience designer working where people meet machines. I'm drawn to automotive HMI: the screens, controls and split-second moments that make a car feel intuitive at speed. Car enthusiast first, designer always.

---

# 2. GOAL AND PRIORITIES

1. **The projects come first.** The site exists to present my work clearly and beautifully.
2. **The website itself is part of the portfolio.** Its craft (layout, type, motion, detail) shows what I can do as an experience designer.
3. **Personality is a quiet undertone.** It comes through in quality and a few small details. Cars are **not** the theme. A visitor who doesn't care about cars shouldn't notice one; a car person should smile at one or two details.

**Scope right now: structure, design system and visuals only.** I am **not** adding real projects yet. Build everything around **placeholder content** so I can add real projects later by adding files, without touching code (see §7).

**The site must look and feel like the reference studio sites (Studio Freight, Aristide Benoist, Lusion's details): a professional, editorial, grid-based website. It is NOT a 3D or interactive "experience" site.** No WebGL scenes, no game navigation, no 3D on any page except the single car model on the Garage page.

**Parked, don't build:** any 3D garage or game-like experience. The **Garage hobby page with a 3D model of my car (§5.3) IS in scope**: build the page and the 3D viewer now, with a placeholder model until my scan is ready.

---

# 3. DESIGN DIRECTION: "Architectural Grid, Quietly Alive"

The site should feel like a **technical drawing sheet brought to life**: precise, calm and confident. Rigid structure with fluid, physical micro-interactions inside it.

## 3.1 Structure (decided)
- **Visible architecture:** a 12-column grid (4 on mobile) with **hairline rules** (1px, low contrast). Optional `+` **crosshair marks** at key intersections, and small **coordinate or section labels** in mono (e.g. `01`, `A–D`). The grid is felt, not shouted.
- **Four-corner chrome** (from `01-studio-freight`, `03-aristide-benoist`): fixed tiny mono labels like a drawing's title block:
  - top-left: name or monogram
  - top-right: nav
  - bottom-left: socials
  - bottom-centre: current section or page
  - bottom-right: year / location / availability
- **Massive whitespace.** Content sits deliberately in the grid. Nothing floats without a reason.
- **Sharp corners** everywhere (radius 0). Hairline borders instead of shadows.
- **Light theme by default:** warm off-white paper with near-black ink. Dark is used only for deliberate inverted moments (e.g. footer, the Garage hero, or optionally the project view flipping theme like `03`).

## 3.2 Typography (shortlist, final pick in Phase 1)
- **Two families maximum:** a **display/text grotesk** and a **mono** for labels, metadata, numbers and chrome.
- **Hierarchy trick:** huge display type (clamp up to about 12–16vw) against tiny mono labels (12–13px uppercase, tracked +4–8%).
- **Free/OFL candidates:**
  - Grotesk: *Inter Display / Inter Tight, Geist, Space Grotesk, Instrument Sans, Neue Montreal (free for personal use)*
  - Mono: *Geist Mono, JetBrains Mono, IBM Plex Mono, Space Mono*
- In Phase 1, offer one serif-display alternative (in the spirit of `01-studio-freight`) as a contrast option.
- Body text is at least 16px and labels at least 12px. Real text stays in the DOM.

## 3.3 Colour: simple and strict
Keep the palette **simple**: near-monochrome, plus **one** accent.
```
--paper:     #F5F4F0   /* warm off-white page */
--ink:       #0E0E0E   /* text */
--graphite:  #6B6B6B   /* secondary text (check ≥ 4.5:1 on paper) */
--rule:      #0E0E0E1A /* hairlines, ~10% ink */
--inverse:   #111111   /* dark sections (paper-coloured text on top) */
--accent:    ONE colour: focus rings, active state, one primary CTA per page
```
- **Ratio:** about 90% paper and ink, about 9% graphite and rules, about **1% accent**. If the accent appears more than a couple of times on screen, it's overused.
- **Accent candidates:** a **signal/redline orange-red** (a subtle tachometer nod) or an HMI **cyan**. Show both in Phase 1; I'll pick one.
- **No gradients, no shadows, no extra colours** in the UI. All other colour comes from project images and car photos.
- Every text/background pair must meet WCAG AA contrast. Check it, don't assume.

## 3.4 Design principles (apply everywhere, and check each phase against them)
- **Hierarchy:** every screen has one clear first read (usually the big type or the hero image), then a second (mono labels), then a third (body). If everything is loud, nothing is.
- **Alignment:** everything snaps to the 12-column grid and a single baseline spacing unit (e.g. 8px). No eyeballed positions.
- **Proximity:** related things sit close together, and unrelated things are separated by generous whitespace. Space is used to group, not borders.
- **Repetition / consistency:** the same component, spacing and type style everywhere for the same job. The Garage page uses the same system as Work.
- **Contrast:** created with size (huge vs. tiny), weight and genre (grotesk vs. mono), not with extra colours.
- **Balance:** asymmetric but balanced layouts, in the spirit of the Swiss grid. Whitespace is an active element.
- **Simplicity (Dieter Rams, "less, but better"):** remove anything that doesn't help the work or the visitor. Every animation has a purpose: feedback, orientation or delight at a key moment.
- **Gestalt:** use closure (implied grid lines), continuity (the ruler and progress lines) and similarity (consistent labels) so the structure reads without needing to be drawn.
- **Usability first** (Nielsen's heuristics): visible state (where am I, the current page `•`, counters), consistency, user control (motion can be skipped, nothing traps scroll), error prevention (clear links and states) and recognition over recall (labels on everything).
- **Accessibility is a principle, not a checklist item:** see the budgets in §9.

In Phase 1 and Phase 6, add a short **principles check** to the summary: for each principle, one line on how the design meets it, or what needs fixing.

## 3.5 Motion personality
- **Quick and precise, not floaty:** 150–400ms for UI and up to about 800ms for page or hero transitions.
- **Easing tokens** (from `01-studio-freight`): `--ease-out-expo: cubic-bezier(.19,1,.22,1)`, `--ease-out-quart: cubic-bezier(.165,.84,.44,1)`, `--ease-in-out-expo: cubic-bezier(1,0,0,1)`.
- **Physical:** small overshoot or spring on press. Interruptible. Never blocks reading.
- **Restraint:** at most **one signature animation per section**, plus micro-interactions.

---

# 4. REFERENCES: YOUR KNOWLEDGE BASE

Read **`.claude/references/_SYNTHESIS.md` first**, then each file:

| File | Priority | Take |
|---|---|---|
| `01-studio-freight.md` | **must-match** | Structure, four-corner chrome, off-white page, type-genre contrast, grid-filled home, easing/spacing tokens, the numbered filter and view toggle |
| `03-aristide-benoist.md` | **must-match** | Projects index as scrubbable **slats**, the slat-to-case **morph**, the **lettered A/B/C/D spec sheet**, **tick-ruler progress**, the `04 / 30` counter |
| `02-lusion.md` | strong | **Per-letter roll on hover**, **pill + status-dot buttons**, `+` crosshair marks, **odometer digit roll**, **scroll-filled big words** |
| `05-lenis.md` | strong (tech) | Smooth scroll is **optional**: native scroll first |
| `04-gatzara.md` | inspiration | **Sticky stacking project cards** (pure CSS), **grid-paper backgrounds**, `[01—04]` counters |
| `06-enrico-deiana.md` | inspiration | How a solo designer introduces themselves; title text overlapping the image. ⚠️ The site contains injected spam, so use it as a visual reference only |
| `07-samsy.md` | cautionary | What **not** to build. At most a keycap shortcut hint and a tiny telemetry readout |

**Rules:**
- **Recreate mechanics and feel. Never copy code, copy or assets.**
- When a must-match reference conflicts with anything except §9's budgets, it wins.
- Cite the reference in plans and code comments, e.g. `/* ref: 03-aristide-benoist#slat-expand */`.
- If I add new reference files later, update `_SYNTHESIS.md` in Phase 0.

---

# 5. SITE MAP AND PAGE SPECS

Navigation (top-right chrome): `Work, Garage, About, Contact`, comma-separated mono text like `01`. Mark the current page with `•`. **Skills** lives inside About, with an anchor link.

## 5.1 Home `/`
- **Hero:** my name huge, the title `Experience Designer — Automotive HMI` in mono, and the one-line statement from my bio.
- **Option A** (from `01`): a fixed-viewport grid of placeholder project tiles filling cells around my name, with a staggered reveal.
- **Option B:** the name over the grid, followed by **sticky stacking featured-project cards** (from `04`).
- Offer both in Phase 1.
- Below the hero:
  - a short "Selected work" entry
  - a one-paragraph about teaser
  - a contact CTA

## 5.2 Work `/work` and the project template `/work/[slug]`
- **Index:** a **view toggle** `Index / Grid` (from `01`):
  - **Index view:** the **slat strip** (from `03`). Narrow vertical cover crops that you scrub horizontally (wheel, drag, arrow keys). Hover or focus brightens one slat; the rest are desaturated.
  - **Grid view:** sharp tiles with mono captions.
  - Both show a numbered category filter (`01 HMI`, `02 UX/UI`, `03 Product`, `04 Visual`) and a `04 / 12` counter with a **tick ruler** (from `03`).
- **Opening a project:** the slat or tile **morphs into the case hero** using the **View Transitions API** (from `03`).
- **Case study page:**
  - Hero image, with a giant title set in the grid (optionally overlapping the image, from `06`)
  - **Spec sheet / data plate** (from `03`), a `<dl>` in mono:
    ```
    A  YEAR      2026
    B  TYPE      HMI CONCEPT
    C  ROLE      UX RESEARCH, UI, PROTOTYPING
    D  TOOLS     FIGMA, PROTOPIE, BLENDER
    E  DURATION  8 WEEKS
    ```
  - Sections: Overview → Problem → Process → Solution → Outcome, using a flexible block system (full-bleed image, 2-up, text plus image, quote, video)
  - Next-project link at the end, with a scroll-filled big title (from `02`)

## 5.3 Garage `/garage`: my hobby page
This is a **separate section of the site about me outside work**: my car, a **Honda City**, the car projects I do on it, and my experiences as a car enthusiast. It's a real page in the main nav (`Work, Garage, About, Contact`), but the home page never pushes it. It uses the **same design system**, so it feels like the same building, just a different room.

Page structure, top to bottom:

1. **3D car hero (the centrepiece of this page)**
   - An interactive **3D model of my car** in a clean, studio-lit viewer: drag to orbit, scroll or pinch to zoom (clamped), a slow auto-rotate that stops on interaction, and a `Reset view` pill. A flat neutral backdrop with a faint grid floor and hairline blueprint dimension lines around the model is a subtle architectural touch.
   - Viewer tech: use **`<model-viewer>`** (a web component, lazy-loaded only on this page) unless context7 docs show a lighter or better option. **Never** load it on other pages.
   - Load the model **only when the hero is in view, or when I click "Load 3D"** on slow connections. Show a static poster image first (`poster` attribute) so LCP stays fast.
   - **Now:** use a lightweight placeholder `.glb` (any CC0 car model, or a simple block-out) and mark it `placeholder: true`.
   - **Later:** I'll drop in my phone scan (Polycam or KIRI Engine), compressed (Draco/Meshopt, target ≤ 5 MB) as `public/models/honda-city.glb`. Swapping the model must mean replacing one file.
   - **Optional hotspots:** 3–5 labelled points on the model (e.g. wheels, intake, cabin) that open a small spec-sheet card. Data comes from a content file.
   - **Fallback:** if WebGL is unavailable or reduced motion is on, show static photos with no auto-rotate.
2. **Spec sheet / data plate:** the same lettered `SpecSheet` component as projects (A MAKE · B MODEL · C YEAR · D ENGINE · E MODS …).
3. **Blueprint elevations:** side, top and front views of the car as **SVG line drawings** (placeholder outlines now), drawn in on scroll with `stroke-dashoffset`.
4. **Car projects / build log:** mods and work done on the car, as a dated timeline. Each entry has before/after photos and a short note.
5. **Stories:** drives, meets and events, as cards with a photo, date and short write-up.
6. **Gallery:** my own car photos, in a grid-aligned layout.

All content here comes from content files (§7) with `placeholder: true` for now.

## 5.4 About `/about` (includes Skills)
- Bio, my approach (3 short principles), and my interests, including automotive HMI.
- **Skills:** grouped into Research, UX/UI, HMI, Prototyping and 3D/Visual. Present them as a **clean spec table or instrument-cluster-style readout**: labels plus tools, **no progress bars or percentages**.
- Optional: a timeline (education and experience) and a downloadable CV slot.

## 5.5 Contact `/contact` (plus the footer on every page)
- A giant stacked CTA (e.g. `LET'S / TALK →`, from `01`), my email with click-to-copy (show a "Copied" toast), Instagram and LinkedIn.
- The footer repeats the contact details and has a back-to-top link with a tick-ruler progress indicator.

## 5.6 Other
- A `/404` page in the same language (e.g. a "wrong turn" line, the one place a tiny car joke is allowed).
- A `/system` page: the living design-system sheet (Phase 2). It must not be linked in the nav.

---

# 6. COMPONENT INVENTORY (build once, reuse everywhere)

| Component | Notes |
|---|---|
| `Chrome` | Fixed four-corner labels; adapts on mobile into a top bar plus a menu |
| `GridOverlay` | Toggle with the `G` key: shows the columns and `+` marks |
| `RollText` | Per-letter roll on hover (ref 02). Must keep an accessible label |
| `Pill` | Button/link with a status dot (ref 02). The dot is the HMI "warning light" |
| `Counter` | `01 / 12` with odometer digit roll (ref 02, 03) |
| `TickRuler` | Ruler-style progress (ref 03); drives scroll and project position |
| `SpecSheet` | Lettered `<dl>` data plate (ref 03), used by projects and the Garage |
| `ProjectSlat`, `ProjectTile` | Index items, sharing a `view-transition-name` |
| `StackCard` | Sticky stacking card (ref 04) |
| `MediaBlock` | Image/video blocks for case studies (responsive, lazy, aspect-ratio boxes) |
| `BigWord` | Scroll-filled display text (ref 02) |
| `Toast` | For copy-email |
| `Placeholder` | Grey blueprint-style image with grid-paper texture (ref 04) and a mono label showing its size and ratio |

---

# 7. CONTENT MODEL (placeholders now, real content later)

- Use **content collections** (or the stack's equivalent), with one Markdown/MDX file per item and validated frontmatter:
  - `projects/*.md`: `title, slug, year, type, role[], tools[], duration, summary, cover, gallery[], category, featured, order, placeholder`
  - `garage/car.md`: `make, model, year, engine, specs{}, model3d, poster, hotspots[{label, position, text}], placeholder`
  - `garage/log/*.md`: `date, title, summary, before, after, placeholder`
  - `garage/stories/*.md`: `date, title, excerpt, cover, placeholder`
  - `garage/gallery/`: image files only
- Create **4 placeholder projects** with realistic but obviously fake content (e.g. "EV Cluster Concept", "Infotainment Voice Flow", "Ride-Share Driver App", "Brand System 01"). Mark each `placeholder: true` and use `Placeholder` images at the real aspect ratios.
- Create placeholder Garage content the same way.
- **Adding a real project must mean copying one file, filling in its fields and dropping in its images. No code changes.**

---

# 8. CAR DETAILS: AT MOST 2–3, AND SUBTLE

Choose **2–3** in Phase 1, keep them minimal, and never use car icons or graphics outside `/garage`:
- **Odometer digit roll** on counters (ref 02)
- **Tick-ruler / gauge** progress (ref 03)
- **Spec sheet as a data plate** (ref 03)
- **Status-dot pill**, like a warning light (ref 02)
- A **redline accent**: the single accent colour used at the "peak" moments
- A tiny **telemetry readout** in the chrome (e.g. `SEC 02 · 34%`) (ref 07). Optional, and only if it stays tasteful.

**Banned unless I ask:** ignition intros, gear-stick nav, engine sounds, tyre marks, cursor trails, and car silhouettes on non-Garage pages.

---

# 9. TECH STACK AND NON-NEGOTIABLE BUDGETS

## 9.1 Stack: you have full freedom
**You may use any language, framework or tooling** (Astro, Next.js, SvelteKit, Eleventy, plain HTML/CSS/JS, or anything else) if it best delivers the design in §3 and passes the budgets in §9.2. Pick what makes the site look and move best while staying fast, accessible and easy for me to update (§7). Justify your choice in one paragraph in your first reply.

My suggestion as a starting point, not a requirement:
- **Astro**: static output, zero JS by default, islands only where interaction needs them. Content collections for §7.
- **Plain CSS:** custom properties as tokens, `@layer`, native nesting, container queries, `:has()`. **No Tailwind** unless you can show it's simpler.
- **Motion, native first:** CSS transitions and keyframes, **scroll-driven animations** (`animation-timeline: scroll()/view()`), the **View Transitions API** (Astro's `<ClientRouter />` or native cross-document), the **Web Animations API**, and `IntersectionObserver`.
- **Libraries only by exception:** Lenis (only if native scroll feels wrong in Phase 5), or GSAP for one complex timeline. Each library needs a written justification and its gzipped size.
- **No Three.js/WebGL anywhere except the Garage 3D viewer** (`<model-viewer>`, lazy-loaded on `/garage` only). The JS budget below applies to every other page; on the Garage page, the viewer loads after first paint.
- Images via Astro's `<Image />` / `<Picture />` (AVIF/WebP, `srcset`).
- Self-hosted fonts, subset, with `font-display: swap`.
- **Hosting:** Vercel (free) unless you see a reason otherwise. **Deploy only when I say so.**

## 9.2 Budgets (every phase must pass these)

| Area | Budget |
|---|---|
| Lighthouse (mobile) | ≥ 95 in Performance, Accessibility, Best Practices and SEO |
| Core Web Vitals | LCP < 1.8s · CLS < 0.05 · INP < 200ms |
| JavaScript | ≤ 40 KB gzipped on initial load (most pages close to 0) |
| Fonts | ≤ 2 families, ≤ 4 files on first load |
| Motion | Animate only `transform`, `opacity` and `clip-path`; no scroll-jacking; no scroll listeners doing layout reads |
| Reduced motion | **Every** animation has a `prefers-reduced-motion` fallback (instant or a fade). The site is fully usable with motion off |
| Accessibility | WCAG 2.2 AA: keyboard reachable, visible focus (use the accent), skip link, semantic landmarks, alt text, contrast ≥ 4.5:1, nothing conveyed only by motion |
| Progressive enhancement | All content readable without JS |
| Loaders | No blocking loader over 1s. Ideally none |

---

# 10. PLUGINS: HOW TO USE THEM TOGETHER

These are installed; use them deliberately:

| Plugin | When | What it's for |
|---|---|---|
| **superpowers** | Start and end of every phase | `brainstorming` before creative decisions; `writing-plans` before touching files; `verification-before-completion` before claiming anything works |
| **frontend-design** (skill, from example-skills) | Every visual decision | Make everything distinctive and intentional, not template defaults. Commit to this direction |
| **context7** (MCP) | Before using **any** library or framework API | Pull the current docs for Astro, the View Transitions API, scroll-driven animation support, etc. Never write an API from memory |
| **ponytail full** | Always | The smallest complete change: native first, no unrequested abstraction, no dependency for a few lines |
| **pr-review-toolkit** / `/code-review` | End of each phase | Review the code and fix real issues before showing me |
| **playwright** / built-in browser | Phase 3 onward | Screenshots at 375, 768, 1280 and 1440px; keyboard-only run-through; reduced-motion check |

**When they conflict:**
- **ponytail decides *how*** (fewest dependencies, native APIs). **frontend-design decides *what it looks like*.** Never trade away visual quality to save lines, and never add a library for looks a native approach can achieve.
- Plans are **short checklists**, one screen per phase. No essays.

---

# 11. QUALITY RULES

- **Mobile is a first-class design**, not an afterthought:
  - the chrome collapses into a top bar plus a full-screen menu
  - the slat index becomes a swipeable strip
  - sticky stacking cards still work
  - touch targets are at least 44px
- Hover effects always have a **focus-visible equivalent**.
- Keyboard: `←`/`→` move between projects in the index and on case pages; `G` toggles the grid overlay; `Esc` closes overlays. Show a small keycap hint (ref 07), styled in mono.
- Split-letter effects keep the real text accessible (`aria-label` on the parent, `aria-hidden` on the letter spans).
- No layout shift: every media item has reserved space through its aspect ratio.
- Meta: title and description for each page, Open Graph image (generated from the design system), favicon (monogram), sitemap and robots.

---

# 12. PHASES: STOP AFTER EACH ONE AND WAIT FOR "go"

0. **Ingest** *(no code)*: read everything, confirm or update `_SYNTHESIS.md`, list any gaps, and ask me **up to 10 sharp questions**.
1. **Concept** *(superpowers: brainstorming)*: present **2–3 directions**. Each has a mood paragraph, type pairing, palette with accent, grid spec, home option (A/B), its 2–3 car details and its one signature interaction. Include quick static mockups, as HTML in a scratch folder or an artifact. **I pick one.**
2. **Design system** *(writing-plans)*: tokens (colour, type scale with clamp, spacing on the grid unit, rules, motion durations and easings, z-index), the grid overlay and every §6 component in a static state, all on the `/system` page.
3. **Skeleton:** Astro setup, layouts, chrome, nav, routing, view transitions, and a static version of **every page** in §5 with the placeholder content from §7. **No motion yet.** Run Lighthouse and keyboard checks.
4. **Work and the project template:** slat and grid index, filter, counter, ruler, the case-study block system, spec sheet and image pipeline.
5. **Motion pass:** one section at a time, with the signature interactions and micro-interactions. Each comes with its reduced-motion fallback and is checked in the browser.
6. **Audit:** Lighthouse (mobile and desktop), accessibility (axe plus a keyboard and screen-reader spot check), cross-browser (Chrome, Safari, Firefox, iOS and Android widths), plus `/code-review`. Fix everything.
7. **Handover:** a `README.md` explaining how to add a real project, a Garage log entry and a story (which file to copy, the fields, image sizes and ratios, where files go). Deploy only on my word.

**Later, not now:** real projects, the scanned 3D car model, and any parked 3D ideas.

---

# 13. YOUR FIRST REPLY (this turn only)

1. **My direction in your own words**, in 5 sentences maximum, so I can check you've understood it.
2. **The stack:** confirm or challenge §9 with reasons, and flag anything in this prompt you'd push back on.
3. **References:** a 3–5 line takeaway, and confirmation that you've read `_SYNTHESIS.md` and all 7 files.
4. **Up to 10 questions** that would change the design if answered.
5. Then **stop** and wait for my "go" to start Phase 1.
