import { useEffect, useRef, useState } from 'react';
import ElasticSlider from '../bits/ElasticSlider';

// "On repeat": a Spotify embed that loads only when asked (no third-party requests before that), with an elastic
// scrubber wired to it through Spotify's iFrame API. The embed stays visible, as Spotify's terms require.
const fmt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function Music({ uri, label }) {
  const host = useRef(null);
  const ctrl = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [scrub, setScrub] = useState(null);   // while dragging, the slider shows the drag, not the playhead

  useEffect(() => {
    if (!loaded) return;
    const ready = (api) => api.createController(host.current, { uri, width: '100%', height: 152 }, (c) => {
      ctrl.current = c;
      c.addListener('playback_update', (e) => { setPos(e.data.position); setDur(e.data.duration); });
    });
    if (window.SpotifyIframeApi) return ready(window.SpotifyIframeApi);
    window.onSpotifyIframeApiReady = (api) => { window.SpotifyIframeApi = api; ready(api); };
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    document.body.appendChild(s);
  }, [loaded, uri]);

  return (
    <div className="music">
      {loaded ? <div className="music-embed"><div ref={host} /></div> : (
        <button type="button" className="music-load btn" onClick={() => setLoaded(true)}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" fill="currentColor" /></svg>
          Load the playlist
        </button>
      )}
      {loaded && <ElasticSlider value={scrub ?? (dur ? (pos / dur) * 100 : 0)} maxValue={100} disabled={!dur} ariaLabel={`Scrub ${label}`}
        onChange={setScrub} onChangeEnd={(v) => { ctrl.current?.seek(((v / 100) * dur) / 1000); setScrub(null); }}
        leftIcon={<span className="music-time">{fmt(pos)}</span>} rightIcon={<span className="music-time">{fmt(dur)}</span>}
        thickness={6} activeThickness={12} thumbColor="var(--ink)" rangeColor="var(--accent)" valuePosition="none" restOpacity={1} />}
    </div>
  );
}
