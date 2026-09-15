import type { CSSProperties } from 'react';
import { Globe } from 'react-globe';

const theme = {
  height: '100%',
  '--globe-color-accent': 'rgb(248 113 113)',
  '--globe-color-label': 'rgb(255 255 255)',
} as CSSProperties;

export default function CapitalsCustomization() {
  return (
    <div style={theme}>
      <Globe showCapitals capitalsMinZoom={3.2} locale="fr" defaultCamera={{ lat: 5, lng: 20, zoom: 3.2 }} showControls />
    </div>
  );
}
