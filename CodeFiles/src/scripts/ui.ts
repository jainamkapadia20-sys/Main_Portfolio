// Small shared helpers for the static components' live states.

/** Update a Counter (rendered by Counter.astro) to show `current / total`. */
export function setCounter(el: HTMLElement, current: number, total: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const set = (which: string, n: number) =>
    el.querySelectorAll<HTMLElement>(`[data-odo="${which}"] .col`).forEach((c, i) => c.style.setProperty('--n', pad(n)[i]));
  set('current', current); set('total', total);
  el.setAttribute('aria-label', `${el.dataset.label}: ${current} of ${total}`);
}

/** Move a TickRuler's cursor (0 to 1). */
export function setRuler(el: HTMLElement, value: number) {
  el.querySelector<HTMLElement>('.cursor')?.style.setProperty('--v', String(Math.min(1, Math.max(0, value))));
  el.setAttribute('aria-label', `${el.dataset.label ?? 'Progress'}: ${Math.round(value * 100)}%`);
}
