import RotatingText from '../bits/RotatingText';
import { palettes, useTheme } from '@/lib/theme';

export default function Roles({ items }) {
  const theme = useTheme();
  return (
    <RotatingText texts={items} highlight highlightColor={palettes[theme].accent} splitBy="characters" staggerDuration={0.018}
      staggerFrom="last" rotationInterval={2400}
      initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-120%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }} mainClassName="roles" pauseOnHover />
  );
}
