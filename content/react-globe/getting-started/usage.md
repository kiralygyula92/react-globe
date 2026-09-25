---
description: Build a first globe with your own pins, popups, controls and a click handler.
---

## Prerequisites

React Globe installed with its stylesheet imported, as in [Installation](/react-globe/getting-started/installation/).

## Installation

No further packages are needed.

## Minimal working example

This component shows three offices as pins, opens a popup on hover, adds zoom and reset buttons, and
reports which office was clicked.

```tsx
import { useState } from 'react';
import { Globe, type Pin } from '@kiralygyula92/react-globe';
import '@kiralygyula92/react-globe/globe.css';

type Office = { title: string; subtitle: string };

const offices: Pin<Office>[] = [
  { id: 'berlin', lat: 52.52, lng: 13.405, data: { title: 'Berlin', subtitle: 'Engineering' } },
  { id: 'bogota', lat: 4.711, lng: -74.0721, data: { title: 'Bogotá', subtitle: 'Sales' } },
  { id: 'jakarta', lat: -6.2088, lng: 106.8456, data: { title: 'Jakarta', subtitle: 'Support' } },
];

export function OfficeMap() {
  const [selected, setSelected] = useState<string>('none');

  return (
    <section>
      <p>Selected office: {selected}</p>
      <div style={{ height: 480 }}>
        <Globe<Office>
          pins={offices}
          showPinPopup
          showControls
          highlightCountryOnHover
          onPinClick={(pin) => setSelected(pin.data?.title ?? pin.id)}
        />
      </div>
    </section>
  );
}
```

`offices` is defined outside the component, so its identity never changes between renders.

## Verification

You should see three pins. Hovering one shows its title and subtitle; clicking it updates the
"Selected office" text; the buttons in the bottom-right corner zoom and reset the view; countries
highlight under the pointer.

## Next steps

- [Pins](/react-globe/pins/) — events, typed payloads and custom markers.
- [Camera](/react-globe/camera/) — choose the opening view and drive the camera from state.
- [Connections](/react-globe/connections/) — link your pins with arches or lines.
