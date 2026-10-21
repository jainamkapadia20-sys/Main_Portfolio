# Reference Synthesis

What the seven references mean for **Jainam Kapadia's portfolio**. Read this first, then the individual files when you need detail.

## The verdict in one line
Take **Studio Freight's structure and restraint** and **Aristide Benoist's project index and spec sheets**, add **Lusion's micro-craft**, and use a couple of CSS-only mechanics from **Gatzara**. Leave all heavy WebGL and game ideas behind.

## Weighting

| Ref | Priority | Use it for |
|---|---|---|
| 01 Studio Freight | must-match | Overall structure: four-corner mono chrome, a warm off-white page, serif + mono type contrast, a fixed-grid home, named easing/spacing tokens |
| 03 Aristide Benoist | must-match | Projects index (scrubbable slats), the slat-to-case morph, the lettered A/B/C/D spec sheet, the tick-ruler progress and the `04 / 30` counter |
| 02 Lusion | strong | Micro-details: per-letter rolling hover, pill buttons with a status dot, `+` crosshair marks, odometer digits, scroll-filled big words |
| 05 Lenis | strong (tech) | Decide whether smooth scroll is needed at all. Default: native scroll plus CSS scroll-driven animations |
| 04 Gatzara | inspiration | Sticky stacking project cards (pure CSS), grid-paper card backgrounds, `[01—04]` counters |
| 06 Enrico Deiana | inspiration | How a solo designer introduces themselves; title text overlapping the image |
| 07 Samsy | inspiration (cautionary) | What not to do. At most: a keycap shortcut hint and a tiny telemetry readout |

## Patterns that show up in several references, so they're safe bets
1. **Tiny labels anchoring the corners** (01, 03, 02). Logo top-left, nav top-right, meta and socials along the bottom. This is the "title block" of a technical drawing.
2. **Mono or uppercase micro-type against huge display type** (01, 02, 03, 04, 06).
3. **Numbered everything**: `01 / 12`, `[01—04]`, `04 / 30`, numbered filters (01, 03, 04). It reads as a spec sheet or parts catalogue.
4. **No accent colour, or exactly one** (01 none; 02 blue; 03 none). Colour comes from the work.
5. **Big rounded image cards** (02, 04, 06), versus sharp tiles (01, 03). **Our pick: sharp corners**, because they're more architectural.

## Techniques to borrow, and how to build them cheaply

| Technique | From | Native build |
|---|---|---|
| Four-corner fixed chrome | 01, 03 | `position: fixed` grid, mono 12–14px |
| Per-letter roll on hover | 02 | Split letters into `span`s with an `aria-hidden` duplicate; `translateY` with `transition-delay: calc(var(--i)*20ms)`; keep the real text for screen readers |
| Odometer number roll | 02, 03 | Digit column with `translateY` and `@property --n` or WAAPI; trigger with IntersectionObserver |
| Tick-ruler progress | 03 | Repeating-linear-gradient ticks plus a scroll-driven `scaleX` |
| `+` crosshair grid marks | 02 | Pseudo-elements at grid intersections; a CSS grid overlay toggle |
| Grid-paper backgrounds | 04 | Two `linear-gradient`s with a `background-size` equal to the grid unit |
| Slat index to case morph | 03 | View Transitions API (`view-transition-name: project-*`) |
| Sticky stacking cards | 04 | `position: sticky` with an incremental `top` offset |
| Scroll-filled big words | 02 | `animation-timeline: view()` on `clip-path` or `background-size` |
| Lettered spec sheet | 03 | A `<dl>` with `A/B/C/D` row markers in mono |
| Typewriter page title | 01 | CSS `steps()` on `width` with `ch` units (once only) |
| View toggle (Grid / List) | 01 | Radio inputs plus a CSS `:has()` layout switch |

## Conflicts between references, and how they're resolved
- **Dark (03, 06, 07) vs. light (01, 02):** pick **light, warm off-white** as the default (paper/blueprint) and use dark for inverted moments. The project view could flip theme like 03, which is optional.
- **Rounded (02, 04, 06) vs. sharp (01, 03):** **sharp**, with hairline borders.
- **Smooth scroll (01, 04, 05) vs. native:** **native first**; Lenis only if Phase 5 needs it (see 05).
- **Serif display (01, 06) vs. grotesk display (02, 04):** decide in Phase 1 by offering one direction of each. My lean: a **grotesk display + mono labels** for the HMI/engineering feel, with a serif as the alternative.

## Avoid list, combined
- Blocking loaders over 1s, full-page WebGL/WebGPU, virtual scroll, game navigation (02, 05, 07).
- Custom cursors that hide the system cursor, marquees, rotating circle text, laurels and emoji CTAs (04, 06).
- Text that exists only in canvas, or is split letter by letter without an accessible label (03, 02).
- Tracking-script bloat (01).
- Any text or code from 06 (injected spam found on the page).

## Car touches these references naturally support, kept subtle
- Odometer digit rolls (02) for counts and years.
- A tick-ruler / gauge progress indicator (03).
- The lettered spec sheet / data plate (03) for every project.
- A status-dot pill (02) as a warning-light style indicator.
- A tiny telemetry readout (07), only if it stays minimal.

Pick at most 2–3, as the master prompt says.
