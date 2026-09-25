import { Globe, type Pin, type PinRenderProps } from '@kiralygyula92/react-globe';

type Station = { name: string };

const pins: Pin<Station>[] = [
  { id: 'a', lat: 64.1466, lng: -21.9426, data: { name: 'Reykjavik' } },
  { id: 'b', lat: 59.3293, lng: 18.0686, data: { name: 'Stockholm' } },
  { id: 'c', lat: 60.1699, lng: 24.9384, data: { name: 'Helsinki' } },
];

function Diamond({ pin, hovered, scale }: PinRenderProps<Station>) {
  return (
    <span
      title={pin.data?.name}
      style={{
        display: 'block',
        width: 12,
        height: 12,
        transform: `translate(-50%, -50%) rotate(45deg) scale(${scale})`,
        background: hovered ? 'white' : 'rgb(169 107 255)',
        border: '2px solid white',
      }}
    />
  );
}

export default function PinsCustomMarker() {
  return (
    <div style={{ height: '100%' }}>
      <Globe<Station> pins={pins} pinComponent={Diamond} defaultCamera={{ lat: 60, lng: 5, zoom: 2.6 }} />
    </div>
  );
}
