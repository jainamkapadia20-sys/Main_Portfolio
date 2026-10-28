// The page's scrolling, shared: one Lenis instance (null under Calm, where the browser scrolls on its own) and a
// way for a page to add stops that the scroll locks onto.
import Lenis from 'lenis';
import Snap from 'lenis/snap';
import 'lenis/dist/lenis.css';
import { calm } from './motion';

type Wheel = { deltaX: number; deltaY: number; event: Event };
// a page that steps beat by beat takes the wheel over through this (see addStops); otherwise Lenis scrolls as usual
let gate: ((d: Wheel) => boolean) | null = null;

// lerp .16: Lenis defaults to .1, which trails the wheel; this settles in a few frames and never feels behind the hand.
// Touch keeps the phone's own scrolling. Anchors glide and respect scroll-margin.
export const lenis = calm() ? null : new Lenis({ autoRaf: true, lerp: 0.16, anchors: true, virtualScroll: (d) => (gate ? gate(d) : true) });

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Stops for the scroll to lock onto. `points` returns page offsets in px; it is re-read on resize.
 * `step`: each wheel gesture glides to the next stop in its direction and holds there (a story told beat by beat).
 *   The tail of a trackpad swipe is ignored until it dies down, so one swipe is one beat. Past the last stop the
 *   wheel scrolls freely. Touch and keys scroll as normal.
 * `proximity`: sections click into place when a scroll comes to rest near the start of one.
 */
export function addStops(type: 'step' | 'proximity', points: () => number[]) {
  if (!lenis) return;
  let stops: number[] = [];
  let removers: (() => void)[] = [];
  const snap = type === 'proximity' ? new Snap(lenis, { type, duration: 0.9, easing: easeOutQuart, debounce: 160, distanceThreshold: '45%' }) : null;
  const place = () => {
    stops = [...new Set(points().map((y) => Math.max(0, Math.round(y))))].sort((a, b) => a - b);
    if (snap) { removers.forEach((r) => r()); removers = stops.map((y) => snap.add(y)); }
  };
  place();
  addEventListener('resize', place);
  document.fonts.ready.then(place);
  addEventListener('load', place);
  if (type !== 'step') return;

  let busy = false, lastInput = 0;
  gate = ({ deltaY, deltaX }) => {
    const now = performance.now();
    const quiet = now - lastInput > 220;   // a fresh gesture, not the tail of the last one
    lastInput = now;
    const dy = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : 0;
    if (!dy) return true;
    const y = lenis.scroll;
    const last = stops[stops.length - 1];
    // beyond the last stop (the footer) the page scrolls freely, and going back up re-enters the story at its end
    if (y > last + 2 && (dy > 0 || y - last > innerHeight)) return true;
    if (busy || !quiet) return false;
    const target = dy > 0 ? stops.find((s) => s > y + 2) : [...stops].reverse().find((s) => s < y - 2);
    if (target === undefined) return true;
    busy = true;
    lenis.scrollTo(target, { duration: Math.min(1.2, 0.7 + Math.abs(target - y) / 2400), easing: easeInOutCubic, onComplete: () => { busy = false; } });
    return false;
  };
}
