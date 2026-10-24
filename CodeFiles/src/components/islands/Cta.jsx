import StarBorder from '../bits/StarBorder';
import { palettes, useTheme } from '@/lib/theme';

// The primary action: a red pill with a star of light that laps its border on hover and pulses on press.
export default function Cta({ href, children, tone = 'accent' }) {
  const theme = useTheme();
  const p = palettes[theme];
  const accent = tone === 'accent';
  return (
    <StarBorder as="a" href={href} radius={999} theme={theme} hover="lap" clickPulse thickness={1.5} glow={0.5}
      color={accent ? p.paper : p.accent} backgroundColor={accent ? 'var(--accent)' : 'var(--surface-2)'}
      textColor={accent ? 'var(--on-accent)' : 'var(--ink)'} borderColor="transparent" className="cta">
      {children}
    </StarBorder>
  );
}
