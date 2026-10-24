import ScrollExpand from '../bits/ScrollExpand';
import { calm } from '@/lib/motion';

// The featured project opens up as you scroll: a framed clip grows to fill the page width, then its title arrives.
export default function Featured({ src, poster, title, summary, href }) {
  return (
    <ScrollExpand mediaType="video" src={src} poster={poster} alt="" useWindowScroll enabled={!calm()}
      startWidth={46} startHeight={52} startRadius={20} endRadius={20} mediaZoom={1.2} scrollDistance={1} holdDistance={0.5}
      overlayScrim={0.5} className="featured-expand">
      <div className="featured-copy">
        <h3 className="featured-title">{title}</h3>
        <p className="featured-sum">{summary}</p>
        <a className="btn primary" href={href}>Open the case study</a>
      </div>
    </ScrollExpand>
  );
}
