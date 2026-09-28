import { useState } from 'react';
import { Globe, type CountryCollection } from '@kiralygyula92/react-globe';

/**
 * A TopoJSON file passed where GeoJSON belongs, a common mix-up with world-atlas data. The globe
 * cannot use it and reports why through onError.
 */
const topology: unknown = { type: 'Topology', objects: { countries: {} }, arcs: [] };

export default function ErrorHandlingBasics() {
  const [error, setError] = useState<string>();

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe assets={{ countriesGeoJson: topology as CountryCollection }} onError={(e) => setError(e.message)} />
      <output role="status" style={{ position: 'absolute', left: 12, top: 12, right: 12, color: 'rgb(254 202 202)', font: '13px system-ui, sans-serif' }}>
        {error ?? 'Loading…'}
      </output>
    </div>
  );
}
