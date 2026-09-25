import type { CSSProperties } from 'react';
import { Globe } from '@kiralygyula92/react-globe';

const theme = { height: '100%', '--globe-color-label': 'rgb(125 211 252)' } as CSSProperties;

export default function GraticuleCustomization() {
  return (
    <div style={theme}>
      <Globe renderStyle="modern" showGraticule showGraticuleLabels showCountryBorders={false} locale="de" defaultCamera={{ lat: 20, lng: 60, zoom: 3.2 }} />
    </div>
  );
}
