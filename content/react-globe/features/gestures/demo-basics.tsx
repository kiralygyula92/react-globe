import { Globe } from 'react-globe';

export default function GesturesBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe defaultCamera={{ lat: 30, lng: -40, zoom: 2.4 }} />
    </div>
  );
}
