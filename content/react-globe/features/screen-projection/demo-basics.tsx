import { useState } from 'react';
import { Globe, type GlobeHandle, type LatLng } from 'react-globe';

export default function ScreenProjectionBasics() {
  const [handle, setHandle] = useState<GlobeHandle>();
  const [under, setUnder] = useState<LatLng | null>(null);

  return (
    <div
      style={{ height: '100%', position: 'relative' }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setUnder(handle?.screenToLatLng(event.clientX - rect.left, event.clientY - rect.top) ?? null);
      }}
    >
      <Globe onReady={setHandle} />
      <output style={{ position: 'absolute', left: 12, top: 12, color: 'white', font: '12px ui-monospace, monospace' }}>
        {under ? `${under.lat.toFixed(2)}°, ${under.lng.toFixed(2)}°` : 'Move the pointer over the globe'}
      </output>
    </div>
  );
}
