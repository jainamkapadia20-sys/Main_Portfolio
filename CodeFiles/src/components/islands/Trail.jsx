import { useEffect, useState } from 'react';
import ImageTrail from '../bits/ImageTrail';
import { calm } from '@/lib/motion';

// Car photos that follow the pointer across the panel and fade behind it. In Calm mode they sit still in a grid.
export default function Trail({ items, alts }) {
  const [still, setStill] = useState(false);
  useEffect(() => setStill(calm()), []);
  if (still) return <div className="trail-grid">{items.map((src, i) => <img key={src} src={src} alt={alts[i]} loading="lazy" />)}</div>;
  return <ImageTrail items={items} size={220} aspectRatio={0.75} radius={14} threshold={90} lifetime={0.5} rotation={6} sizeVariance={0.2} alignToMotion={false} />;
}
