import { Globe, type Pin } from 'react-globe';

type City = { title: string; subtitle: string };

const pins: Pin<City>[] = [
  { id: 'lisbon', lat: 38.7223, lng: -9.1393, data: { title: 'Lisbon', subtitle: 'Portugal' } },
  { id: 'nairobi', lat: -1.2921, lng: 36.8219, data: { title: 'Nairobi', subtitle: 'Kenya' } },
  { id: 'lima', lat: -12.0464, lng: -77.0428, data: { title: 'Lima', subtitle: 'Peru' } },
  { id: 'seoul', lat: 37.5665, lng: 126.978, data: { title: 'Seoul', subtitle: 'South Korea' } },
];

export default function PinsBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe<City> pins={pins} showPinPopup defaultCenter={{ lat: 20, lng: 20 }} />
    </div>
  );
}
