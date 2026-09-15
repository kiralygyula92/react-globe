import { useState } from 'react';
import { Globe, type CameraPose } from 'react-globe';

const PLACES: Record<string, CameraPose> = {
  Andes: { lat: -20, lng: -68, zoom: 1.8, tilt: 45 },
  Himalaya: { lat: 29, lng: 85, zoom: 1.8, tilt: 45 },
  Alps: { lat: 46.5, lng: 10, zoom: 1.6, tilt: 45 },
};

export default function CameraControlled() {
  const [place, setPlace] = useState('Alps');

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe camera={PLACES[place]} minZoom={1.3} maxZoom={3} />
      <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 6 }}>
        {Object.keys(PLACES).map((name) => (
          <button key={name} type="button" onClick={() => setPlace(name)} aria-pressed={name === place}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
