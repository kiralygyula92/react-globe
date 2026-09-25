import { useState } from 'react';
import { Globe } from '@kiralygyula92/react-globe';

/** Replace the globe with your own message, in your own words, when it cannot run. */
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
      <Globe key={attempt} assets={{ capitalsDataset: '/missing-capitals.json' }} showCapitals onError={() => setFailed(true)} />
    </div>
  );
}
