---
id: 04-gatzara
title: GATZARA Studio
url: https://gatzara.studio
captured: 2026-10-19
type: portfolio
priority: inspiration
borrow: [layout, typography]
avoid: [loud full-red background, circular rotating text, marquee overload]
---

# GATZARA Studio

## Why it's here
Bold and loud. It's here mostly for **one mechanic, stacked sticky project cards**, and for its **grid-paper card backgrounds**. Its overall tone is far louder than mine.

## Stack (observed)
- **Framer** (generator `Framer f8e97a5`) with Lenis smooth scroll. No canvas.
- Fonts: **Roko Bold** (big headlines), **Parafina Bold** (the display serif in the logo), **Aeonik Fono** (a mono-ish label face, 14px uppercase, letter-spacing 0.05em) and Inter.

## Layout & grid
- A top ticker marquee: `GATZARA IS NOW ON INSTAGRAM — FOLLOW OUR JOURNEY ✱` scrolls endlessly.
- Header row: two small uppercase blocks on the left (`SHARPEN YOUR BRAND / CREATIVE DIGITAL EDGE`), the nav centre-left (`WORK / BLOG`), the logo in the centre, `ABOUT / STUDIO`, and a `TALK TO US` pill on the right.
- A hero with a giant circular text path (`BRIDGING THE GAP BETWEEN DIGITAL & BRAND DESIGN`) rotating around the centre, a bold statement in the middle, and a browser-frame mockup below.
- An awards row with laurel badges.
- A services list in a numbered table (`Web design [UX, UI] … [01]`).

## Typography
- Roko Bold at about 48–120px. A very tight, chunky grotesk.
- Labels: Aeonik Fono, 14px uppercase, letter-spacing 0.05em. Body paragraphs in uppercase mono are a strong *texture* move.
- Giant cropped letters (`RA`) used as graphic blocks.

## Colour
- Full-bleed **signal red** (about `#ff2a12`) with black text. Project cards switch to white, lime and so on.

## Motion & interaction

### Stacked sticky project cards
- **Trigger:** scroll.
- **What moves:** each project is a full-width rounded card (`position: sticky; top: …`). The next card slides up and stacks over the previous one, with a slight offset so the edges of earlier cards peek above.
- **Labels:**
  - a counter `[01—04]` and `HIGHLIGHTS` top-right
  - a short uppercase description on the left
  - hashtags on the right (`#ECOM, #CAMPAIGN`)
  - a giant brand name top-left
- **Feel:** physical and satisfying, like sheets of paper stacking.
- **Mobile:** works the same.
- **Reduced motion:** it's just sticky, so it's already fine.
- **Steal level:** exact. Pure CSS `position: sticky` with zero JS. Could be the home "Featured projects" section.

### Grid-paper card backgrounds
- The project cards have a faint square grid texture behind the product image, like engineering paper.
- **Steal level:** exact. Use a CSS `background-image: linear-gradient` grid. This is perfect for the blueprint feel.

### Circular rotating text, word swap, marquee
- **Steal level:** avoid. They're too loud and too common.

## Navigation & transitions
- Standard Framer page transitions (fades).

## What NOT to copy
- The red background, laurels, rotating circle text and ticker. All of these are wrong for a calm architectural tone.

## Notes
Take **sticky stacking cards**, **grid-paper backgrounds**, **bracketed counters `[01—04]`** and **uppercase mono paragraphs as texture**. Ignore the rest.
