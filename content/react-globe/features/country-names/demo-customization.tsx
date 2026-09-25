import type { CSSProperties } from 'react';
import { Globe } from '@kiralygyula92/react-globe';

/** Label colour is a theme token set on any ancestor; names appear only once the camera is close. */
const theme = { '--globe-color-label': 'rgb(253 224 71)', height: '100%' } as CSSProperties;

export default function CountryNamesCustomization() {
  return (
    <div style={theme}>
      <Globe showCountryNames countryNamesMinZoom={2.8} renderStyle="modern" defaultCamera={{ lat: 10, lng: -60, zoom: 2.6 }} showControls />
    </div>
  );
}
