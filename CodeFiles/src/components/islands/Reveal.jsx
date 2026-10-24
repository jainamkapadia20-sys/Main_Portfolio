import AnimatedContent from '../bits/AnimatedContent';

// Scroll entrance for a case-study step: a short blurred rise, once.
export default function Reveal({ children }) {
  return <AnimatedContent distance={40} duration={0.9} ease="expo.out" blur={6} threshold={0.15} once>{children}</AnimatedContent>;
}
