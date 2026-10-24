import Particles from '../bits/Particles';
import MetallicPaint from '../bits/MetallicPaint';
import GlowCursor from '../bits/GlowCursor';
import { palettes, useTheme } from '@/lib/theme';

// The hero's stage: a slow particle field in ink and red, with the JK monogram poured in liquid metal at its centre.
export default function HeroStage({ monogram }) {
  const theme = useTheme();
  const p = palettes[theme];
  const light = theme === 'light';
  return (
    <div className="hero-stage-fx">
      <Particles particleCount={260} particleSpread={11} speed={0.06} particleColors={[p.ink, p.ink, p.accent]} particleBaseSize={90}
        sizeRandomness={1} alphaParticles glow={0.35} twinkle={0.25} hoverEffect="parallax" lightMode={light} className="hero-particles" />
      {/* the glow trail lives only on this stage: a full-page cursor layer made every page lag */}
      <div className="hero-glow" aria-hidden="true"><GlowCursor color={p.accent} theme={theme} intensity={1.2} glow={1} hotspot={0.8} trailWidth={3} quality="low" maxDevicePixelRatio={1} /></div>
      <div className="hero-mono">
        <MetallicPaint imageSrc={monogram} color={light ? '#2a2a2a' : '#ffffff'} lightMode={light} scale={0.62} speed={0.8} mouseTilt={0.6} />
      </div>
    </div>
  );
}
