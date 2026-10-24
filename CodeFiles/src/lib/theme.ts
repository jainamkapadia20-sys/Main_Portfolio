// The WebGL and canvas pieces need literal colours; these mirror the tokens in global.css.
export const palettes = {
  dark: { paper: '#0E0E0E', ink: '#F2F2F0', graphite: '#8C8C8A', surface: '#171717', accent: '#FF3B30' },
  light: { paper: '#F4F4F2', ink: '#0E0E0E', graphite: '#5E5E5C', surface: '#EAEAE7', accent: '#C81E17' },
};
export type Theme = keyof typeof palettes;

export const theme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
export const palette = () => palettes[theme()];

/** Calls `fn` now and again whenever the theme toggle flips html[data-theme]. */
export function onTheme(fn: (t: Theme) => void) {
  fn(theme());
  const mo = new MutationObserver(() => fn(theme()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

/** '#ff3b30' → [1, 0.23, 0.19] for shaders. */
export const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
