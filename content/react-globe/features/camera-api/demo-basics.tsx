import { useRef } from 'react';
import { Globe, type GlobeHandle } from 'react-globe';

export default function CameraApiBasics() {
  const globe = useRef<GlobeHandle>(null);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe ref={globe} />
      <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => globe.current?.flyTo({ lat: -33.87, lng: 151.21 }, { zoom: 1.6 })}>
          Fly to Sydney
        </button>
        <button type="button" onClick={() => globe.current?.flyTo({ lat: 64.15, lng: -21.94 }, { zoom: 1.8 })}>
          Fly to Reykjavik
        </button>
        <button type="button" onClick={() => globe.current?.zoomOut()}>
          Zoom out
        </button>
        <button type="button" onClick={() => globe.current?.reset()}>
          Reset
        </button>
      </div>
    </div>
  );
}
