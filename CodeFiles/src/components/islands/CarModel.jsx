import { useState } from 'react';
import ModelViewer from '../bits/ModelViewer';

// The 3D car on a turntable: drag to turn, scroll or pinch to zoom, double-click to reset. Two builds of the model.
export default function CarModel({ versions }) {
  const [v, setV] = useState(0);
  return (
    <div className="car-model">
      <ModelViewer key={versions[v].url} url={versions[v].url} width="100%" height="100%" environment="city" environmentIntensity={0.9}
        autoRotate autoRotateSpeed={0.35} zoom minZoom={0.8} maxZoom={1.8} hoverTilt={0.1} float={0.15} shadow shadowOpacity={0.5}
        intro="rise" startAngle={-35} tilt={8} fit={0.86} />
      <div className="car-switch" role="group" aria-label="Version of the model">
        {versions.map((x, i) => (
          <button key={x.label} type="button" aria-pressed={i === v} onClick={() => setV(i)}>{x.label}</button>
        ))}
      </div>
    </div>
  );
}
