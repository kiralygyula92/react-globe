import { useRef, useState } from 'react';
import { Globe, type GlobeHandle } from '@kiralygyula92/react-globe';

/** Spin while nobody is interacting; stop on hover and resume on leave. */
export default function AutoRotateCustomization() {
  const globe = useRef<GlobeHandle>(null);
  const [speed, setSpeed] = useState(2);

  const spin = (value = speed) => globe.current?.startAutoRotate(value);

  return (
    <div
      style={{ height: '100%', position: 'relative' }}
      onPointerEnter={() => globe.current?.stopAutoRotate()}
      onPointerLeave={() => spin()}
    >
      <Globe ref={globe} renderStyle="realistic" onReady={(handle) => handle.startAutoRotate(speed)} />
      <label style={{ position: 'absolute', left: 12, top: 12, color: 'white', font: '13px system-ui, sans-serif' }}>
        Speed{' '}
        <input
          type="range"
          min={0.5}
          max={6}
          step={0.5}
          value={speed}
          onChange={(e) => {
            setSpeed(Number(e.target.value));
            spin(Number(e.target.value));
          }}
        />
      </label>
    </div>
  );
}
