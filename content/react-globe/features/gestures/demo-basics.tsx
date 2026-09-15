import { Globe } from 'react-globe';

export default function GesturesBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe defaultCamera={{ lat: 30, lng: -40, zoom: 3.2 }} />
    </div>
  );
}
