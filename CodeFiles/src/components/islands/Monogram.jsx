import MetallicPaint from '../bits/MetallicPaint';
import { useTheme } from '@/lib/theme';

// The JK monogram poured in liquid metal; it tilts toward the pointer.
export default function Monogram({ src }) {
  const light = useTheme() === 'light';
  return <MetallicPaint imageSrc={src} color={light ? '#2a2a2a' : '#ffffff'} lightMode={light} scale={0.55} speed={0.7} mouseTilt={0.7} />;
}
