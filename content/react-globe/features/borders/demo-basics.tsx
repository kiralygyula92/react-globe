import { useState } from 'react';
import { Globe } from 'react-globe';

export default function BordersBasics() {
  const [shorelines, setShorelines] = useState(true);
  const [borders, setBorders] = useState(true);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe showShorelines={shorelines} showCountryBorders={borders} defaultCamera={{ lat: 48, lng: 15, zoom: 2.6 }} />
      <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 12, color: 'white', font: '13px system-ui, sans-serif' }}>
        <label>
          <input type="checkbox" checked={shorelines} onChange={(e) => setShorelines(e.target.checked)} /> Shorelines
        </label>
        <label>
          <input type="checkbox" checked={borders} onChange={(e) => setBorders(e.target.checked)} /> Country borders
        </label>
      </div>
    </div>
  );
}
