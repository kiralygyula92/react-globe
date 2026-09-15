import { Globe } from 'react-globe';

export default function CapitalsBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe showCapitals defaultCamera={{ lat: 50, lng: 12, zoom: 2.5 }} />
    </div>
  );
}
