import { Globe, type Pin } from 'react-globe';

type Peak = { name: string; description: string };

const pins: Pin<Peak>[] = [
  { id: 'everest', lat: 27.9881, lng: 86.925, data: { name: 'Everest', description: '8,849 m · Nepal / China' } },
  { id: 'aconcagua', lat: -32.6532, lng: -70.0109, data: { name: 'Aconcagua', description: '6,961 m · Argentina' } },
  { id: 'kilimanjaro', lat: -3.0674, lng: 37.3556, data: { name: 'Kilimanjaro', description: '5,895 m · Tanzania' } },
];

export default function PopupsBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe<Peak> pins={pins} showPinPopup defaultCenter={{ lat: 10, lng: 30 }} />
    </div>
  );
}
