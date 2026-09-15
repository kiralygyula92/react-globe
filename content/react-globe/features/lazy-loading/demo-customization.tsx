import { useState } from 'react';
import { GlobeLazy } from 'react-globe';

/** Mount the globe only when the reader asks for it. */
export default function LazyLoadingCustomization() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      {open ? (
        <GlobeLazy showControls renderStyle="cartoon" />
      ) : (
        <button type="button" data-demo-activate onClick={() => setOpen(true)}>
          Show the globe
        </button>
      )}
    </div>
  );
}
