import FlexCarousel from '../bits/FlexCarousel';

// Sketches, wireframes and side work in a draggable strip; click a piece to open it larger.
export default function Ideas({ items }) {
  return <FlexCarousel items={items} preset="liquid" cardHeight={0.62} gap={16} radius={14} fit="natural" captions captureWheel={false} focusOnClick />;
}
