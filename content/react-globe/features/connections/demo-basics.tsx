import { Globe, type Pin, type PinConnection } from 'react-globe';

const pins: Pin[] = [
  { id: 'dublin', lat: 53.3498, lng: -6.2603 },
  { id: 'toronto', lat: 43.6532, lng: -79.3832 },
  { id: 'cairo', lat: 30.0444, lng: 31.2357 },
  { id: 'mumbai', lat: 19.076, lng: 72.8777 },
];

const connections: PinConnection[] = [
  { id: 'dublin-toronto', from: 'dublin', to: 'toronto' },
  { id: 'dublin-cairo', from: 'dublin', to: 'cairo', animated: true },
  { id: 'cairo-mumbai', from: 'cairo', to: 'mumbai', type: 'line', lineStyle: 'dashed' },
];

export default function ConnectionsBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe pins={pins} connections={connections} enableConnections defaultCenter={{ lat: 35, lng: 10 }} />
    </div>
  );
}
