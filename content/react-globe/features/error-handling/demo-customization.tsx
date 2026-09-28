import { useState } from 'react';
import { Globe, type CountryCollection } from '@kiralygyula92/react-globe';

/** Stands in for a download that came back wrong: TopoJSON where GeoJSON belongs. */
const brokenDownload: unknown = { type: 'Topology', objects: { countries: {} }, arcs: [] };

/**
 * Replace the globe with your own message, in your own words, when it cannot run. The first
 * attempt fails; "Try again" mounts a fresh globe with the bundled data, as a retry after a
 * passing network problem would.
 */
export default function ErrorHandlingCustomization() {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (failed) {
    return (
      <div role="alert" style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'white', font: '14px system-ui, sans-serif', textAlign: 'center' }}>
        <div>
          <p>The map could not load.</p>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((a) => a + 1);
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%' }}>
      <Globe
        key={attempt}
        assets={attempt === 0 ? { countriesGeoJson: brokenDownload as CountryCollection } : undefined}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
