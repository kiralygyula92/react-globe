import { useMemo } from 'react';
import { Globe, type Pin } from '@kiralygyula92/react-globe';

/** 400 points on a deterministic spiral, so the clusters look the same on every load. */
function spiral(count: number): Pin[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * 2;
    return { id: `p${i}`, lat: (Math.asin(y) * 180) / Math.PI, lng: (((i * golden * 180) / Math.PI) % 360) - 180 };
  });
}

export default function ClusteringBasics() {
  const pins = useMemo(() => spiral(400), []);
  return (
    <div style={{ height: '100%' }}>
      <Globe pins={pins} defaultCamera={{ zoom: 3 }} showControls />
    </div>
  );
}
