import { useMemo, useState } from 'react';
import { Globe, type ClusterRenderProps, type Pin } from '@kiralygyula92/react-globe';

function band(count: number): Pin[] {
  return Array.from({ length: count }, (_, i) => ({ id: `b${i}`, lat: 12 * Math.sin(i), lng: (i * 360) / count - 180 }));
}

function Bubble({ count, hovered, scale, onClick, messages }: ClusterRenderProps) {
  const size = 24 + Math.min(24, count);
  return (
    <button
      type="button"
      aria-label={messages.cluster(count)}
      onClick={onClick}
      style={{
        pointerEvents: 'auto',
        width: size,
        height: size,
        transform: `translate(-50%, -50%) scale(${scale})`,
        borderRadius: '50%',
        border: '2px solid white',
        background: hovered ? 'rgb(52 211 153)' : 'rgb(16 185 129)',
        color: 'white',
        font: '600 12px system-ui, sans-serif',
        cursor: 'pointer',
      }}
    >
      {count}
    </button>
  );
}

export default function ClusteringCustomization() {
  const pins = useMemo(() => band(120), []);
  const [last, setLast] = useState<number>();
  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe
        pins={pins}
        clusterRadiusPx={60}
        clusterZoomThreshold={1.5}
        clusterComponent={Bubble}
        onClusterClick={(clustered) => setLast(clustered.length)}
      />
      <output style={{ position: 'absolute', left: 12, top: 12, color: 'white', font: '12px system-ui, sans-serif' }}>
        {last === undefined ? 'Click a cluster' : `Clicked a cluster of ${last}`}
      </output>
    </div>
  );
}
