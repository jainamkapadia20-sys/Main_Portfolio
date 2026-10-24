import { useEffect, useState } from 'react';

// WebGL islands need literal colours; these mirror the tokens in global.css.
export const palettes = {
  dark: { paper: '#0E0E0E', ink: '#F2F2F0', graphite: '#8C8C8A', surface: '#171717', accent: '#FF3B30' },
  light: { paper: '#F4F4F2', ink: '#0E0E0E', graphite: '#5E5E5C', surface: '#EAEAE7', accent: '#C81E17' },
};

const read = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

/** The current theme name, kept in sync with the toggle (html[data-theme]). */
export function useTheme() {
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    setTheme(read());
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
}
