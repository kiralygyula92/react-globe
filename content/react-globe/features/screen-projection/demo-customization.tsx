import { useEffect, useState } from 'react';
import { Globe, type GlobeHandle, type ScreenPoint } from 'react-globe';

const TARGET = { lat: 48.8584, lng: 2.2945 };

/** A plain HTML badge that follows a coordinate, hidden while the globe hides the point. */
export default function ScreenProjectionCustomization() {
  const [handle, setHandle] = useState<GlobeHandle>();
  const [point, setPoint] = useState<ScreenPoint | null>(null);

  useEffect(() => {
    if (!handle) return;
    let frame = 0;
    const follow = () => {
      setPoint(handle.latLngToScreen(TARGET));
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [handle]);

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Globe onReady={setHandle} defaultCamera={{ lat: 40, lng: 10, zoom: 2.2 }} />
      {point && (
        <span
          style={{
            position: 'absolute',
            left: point.x,
            top: point.y,
            transform: 'translate(-50%, -140%)',
            padding: '2px 8px',
            borderRadius: 4,
            background: 'rgb(250 204 21)',
            color: 'black',
            font: '600 12px system-ui, sans-serif',
            pointerEvents: 'none',
          }}
        >
          Paris
        </span>
      )}
    </div>
  );
}
