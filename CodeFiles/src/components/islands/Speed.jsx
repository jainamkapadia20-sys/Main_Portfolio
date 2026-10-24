import Hyperspeed from '../bits/Hyperspeed';
import { palettes, useTheme } from '@/lib/theme';

// A night road in the site's two colours: red taillights ahead, white headlights coming the other way. Hold to boost.
export default function Speed() {
  const theme = useTheme();
  const p = palettes[theme];
  const light = theme === 'light';
  return (
    <Hyperspeed theme={theme} curve="winding" speed={0.8} density={34} dust={60} glow={0.5} reflections={0.4} lanes={3}
      tailColors={[p.accent, '#a3150f', '#ff6a5f']} headColors={light ? ['#2a2a2a', '#555555'] : ['#ffffff', '#d9d9d6']}
      poleColors={[p.graphite]} roadColor={light ? '#e6e6e2' : '#0a0a0a'} lineColor={light ? '#c9c9c4' : '#262626'} />
  );
}
