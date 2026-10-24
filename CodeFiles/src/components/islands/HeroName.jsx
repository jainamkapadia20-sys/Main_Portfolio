import TechText from '../bits/TechText';
import { palettes, useTheme } from '@/lib/theme';

// The name as a type specimen: hover a letter to see its guides, drag it, it springs back. The h1 text lives in the page.
export default function HeroName({ text }) {
  const theme = useTheme();
  return (
    <TechText text={text} fontFamily="Archivo" fontWeight={500} fontSize={220} letterSpacing={-0.045} align="left"
      color={palettes[theme].ink} accentColor={palettes[theme].accent} intro="metrics" introDuration={1.4} specks={10} guides labels={false} />
  );
}
