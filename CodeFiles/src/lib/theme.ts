// The WebGL and canvas pieces need literal colours; these mirror the tokens in global.css.
// dark/light are the base site (the sun/moon switch). The others are eras you time-jump into by clicking the JK:
// each is its own world (palette here; fonts, textures and shapes in global.css; background in fx/warp.ts).
// Every load starts in the base theme.
export const palettes = {
  dark: { paper: '#0A0910', ink: '#F4F1FA', graphite: '#8F8A9E', surface: '#15131C', accent: '#A970FF' },
  light: { paper: '#F4F4F2', ink: '#0E0E0E', graphite: '#5E5E5C', surface: '#EAEAE7', accent: '#6D28D9' },
  apex: { paper: '#07080B', ink: '#F4F5F7', graphite: '#9AA0AA', surface: '#111318', accent: '#FF2340' },
  blueprint: { paper: '#0B3A8C', ink: '#EAF2FF', graphite: '#A9C1EA', surface: '#0E4499', accent: '#FFCC33' },
};
export type Theme = keyof typeof palettes;

/** The time-jump cycle, in order. `dark` is home: the present day. */
export const eras = [
  { id: 'dark', year: '2026', name: 'Hyperdrive' },
  { id: 'blueprint', year: '2049', name: 'Blueprint' },
  { id: 'apex', year: '1999', name: 'Wangan' },
] as const;

export const theme = (): Theme => {
  const e = document.documentElement.dataset.era;
  if (e && e in palettes) return e as Theme;
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
};
export const palette = () => palettes[theme()];

/** Calls `fn` now and again whenever the theme switch or a time jump changes the palette. */
export function onTheme(fn: (t: Theme) => void) {
  fn(theme());
  const mo = new MutationObserver(() => fn(theme()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-era'] });
  return () => mo.disconnect();
}

/** '#ff3b30' → [1, 0.23, 0.19] for shaders. */
export const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
