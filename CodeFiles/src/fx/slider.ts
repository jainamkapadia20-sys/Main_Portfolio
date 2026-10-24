// An elastic scrubber: drag past either end and the track stretches like a band, then snaps back on release.
// It is a real slider for assistive tech and keyboards (role=slider, arrows, Home/End).
export type SliderApi = { set: (v: number) => void; disable: (off: boolean) => void };

export function mountSlider(el: HTMLElement, onInput: (v: number) => void, onCommit: (v: number) => void): SliderApi {
  const track = el.querySelector<HTMLElement>('[data-track]')!;
  let value = 0, dragging = false, disabled = true;
  const paint = (v: number, stretch = 0, side: 'left' | 'right' = 'right') => {
    el.style.setProperty('--v', String(v / 100));
    track.style.transformOrigin = side === 'right' ? 'left center' : 'right center';
    track.style.transform = stretch ? `scaleX(${1 + stretch})` : '';
    el.setAttribute('aria-valuenow', String(Math.round(v)));
  };
  const fromX = (cx: number) => {
    const r = track.getBoundingClientRect();
    const raw = (cx - r.left) / r.width;
    const over = raw > 1 ? raw - 1 : raw < 0 ? -raw : 0;
    // rubber band: the overshoot is damped and capped
    paint(Math.min(100, Math.max(0, raw * 100)), Math.min(0.12, Math.sqrt(over) * 0.12), raw < 0 ? 'left' : 'right');
    return Math.min(100, Math.max(0, raw * 100));
  };
  el.addEventListener('pointerdown', (e) => {
    if (disabled) return;
    dragging = true; el.classList.add('is-active');
    el.setPointerCapture(e.pointerId);
    value = fromX(e.clientX); onInput(value);
  });
  el.addEventListener('pointermove', (e) => { if (dragging) { value = fromX(e.clientX); onInput(value); } });
  const up = () => {
    if (!dragging) return;
    dragging = false; el.classList.remove('is-active');
    paint(value); onCommit(value);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('keydown', (e) => {
    if (disabled) return;
    const step = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 }[e.key];
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? 100 : step !== undefined ? Math.min(100, Math.max(0, value + step)) : null;
    if (to === null) return;
    e.preventDefault();
    value = to; paint(value); onCommit(value);
  });
  return {
    set: (v) => { if (!dragging) { value = v; paint(v); } },
    disable: (off) => { disabled = off; el.setAttribute('aria-disabled', String(off)); el.tabIndex = off ? -1 : 0; },
  };
}
