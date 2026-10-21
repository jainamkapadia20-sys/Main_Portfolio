---
id: 05-lenis
title: Lenis (darkroom.engineering)
url: https://lenis.dev
captured: 2026-10-19
type: interaction
priority: strong
borrow: [motion]
avoid: [blackletter branding, 37k-px scroll length, WebGL background]
---

# Lenis

## Why it's here
Lenis is the **smooth-scroll library** used by most of these references (Studio Freight and Gatzara use it). This file is about whether, and how, we should use it.

## What it is
- A small open-source library that smooths wheel and trackpad scroll while keeping **native scrolling**: no transform hacks, the scrollbar still works, and accessibility is preserved.
- Its main benefit is that scroll-linked animations run in sync with the scroll position (no jitter between the DOM and WebGL).
- Setup is one call: `new Lenis()` plus a `requestAnimationFrame` loop (or autoRaf).
- Bundle: small, but it is still JS on every page.
- **Check the current API in context7 before using it.**

## The site itself (observed)
- Next.js. Very long page (about 37,000px) with pinned sections, a WebGL particle/hand scene, a salmon-pink accent (about `#ff98a2`) on black, and a blackletter logo.
- Fonts: Panchang (wide display, uppercase), Anton (condensed), Roboto.
- Sections: "WHY SMOOTH SCROLL?" in big condensed caps on the left, with feature blocks on the right that scroll past. Then a showcase grid.

## Motion & interaction

### Smooth scroll
- **Feel:** heavy, buttery inertia, with lerp about 0.1.
- **Mobile:** touch stays native, which is the default and correct.
- **Reduced motion:** **turn Lenis off** when `prefers-reduced-motion: reduce` is set.
- **Steal level:** decide in Phase 1. Ponytail rule: only add it if CSS scroll-driven animations aren't enough. Native `animation-timeline: scroll()/view()` already runs on the compositor and stays in sync without Lenis.

## Personality / car link
- The "weight" of scroll is like suspension tuning, which is a subtle nod. Tune it light: we want a precise feel, not floaty.

## What NOT to copy
- The visual design (blackletter, particles, pink). It doesn't fit our direction.
- Extremely long pinned scroll sequences.

## Notes
**Recommendation:** start with native scroll plus CSS scroll-driven animations. Add Lenis only if the motion pass (Phase 5) feels jittery, and only then (check that it's under 5 KB gzipped).
