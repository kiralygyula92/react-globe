import { useState } from 'react';
import { Globe, type GlobeHandle, type Pin } from '@kiralygyula92/react-globe';

const pins: Pin<{ name: string }>[] = [
  { id: 'quito', lat: -0.1807, lng: -78.4678, data: { name: 'Quito' } },
  { id: 'kampala', lat: 0.3476, lng: 32.5825, data: { name: 'Kampala' } },
  { id: 'pontianak', lat: -0.0263, lng: 109.3425, data: { name: 'Pontianak' } },
];

/** The handle also arrives through onReady — handy when a ref is awkward to thread through. */
export default function CameraApiCustomization() {
  const [handle, setHandle] = useState<GlobeHandle>();

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe
        pins={pins}
        onReady={setHandle}
        onPinClick={(pin) => handle?.setCamera({ lat: pin.lat, lng: pin.lng, zoom: 1.5, tilt: 40 }, { durationMs: 1400 })}
        showControls
      />
      <p style={{ position: 'absolute', left: 12, top: 12, margin: 0, color: 'white', font: '13px system-ui, sans-serif' }}>
        Click a pin on the equator
      </p>
    </div>
  );
}
