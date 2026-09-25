import { useState } from 'react';
import { Globe } from '@kiralygyula92/react-globe';

/** A countries URL that does not exist: the globe reports the failure through onError. */
export default function ErrorHandlingBasics() {
  const [error, setError] = useState<string>();

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe assets={{ countriesGeoJson: '/does-not-exist.geojson' }} onError={(e) => setError(e.message)} />
      <output role="status" style={{ position: 'absolute', left: 12, top: 12, right: 12, color: 'rgb(254 202 202)', font: '13px system-ui, sans-serif' }}>
        {error ?? 'Loading…'}
      </output>
    </div>
  );
}
