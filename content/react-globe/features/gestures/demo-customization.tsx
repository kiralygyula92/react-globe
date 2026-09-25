import { useState } from 'react';
import { Globe } from '@kiralygyula92/react-globe';

export default function GesturesCustomization() {
  const [zoom, setZoom] = useState(true);
  const [rotation, setRotation] = useState(true);
  const [tilt, setTilt] = useState(false);

  const toggle = (label: string, value: boolean, set: (v: boolean) => void) => (
    <label>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} /> {label}
    </label>
  );

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe enableZoom={zoom} enableRotation={rotation} enableTilt={tilt} minZoom={1.8} maxZoom={3} />
      <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 12, color: 'white', font: '13px system-ui, sans-serif' }}>
        {toggle('Zoom', zoom, setZoom)}
        {toggle('Rotate', rotation, setRotation)}
        {toggle('Tilt', tilt, setTilt)}
      </div>
    </div>
  );
}
