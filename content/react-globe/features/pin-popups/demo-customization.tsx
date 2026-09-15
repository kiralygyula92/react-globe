import { Globe, type Pin, type PinPopupRenderProps } from 'react-globe';

type Station = { name: string; country: string };

const pins: Pin<Station>[] = [
  { id: 'mauna-loa', lat: 19.536, lng: -155.576, data: { name: 'Mauna Loa', country: 'United States' } },
  { id: 'jungfraujoch', lat: 46.548, lng: 7.985, data: { name: 'Jungfraujoch', country: 'Switzerland' } },
  { id: 'cape-grim', lat: -40.683, lng: 144.689, data: { name: 'Cape Grim', country: 'Australia' } },
];

function StationCard({ pin, placement, close }: PinPopupRenderProps<Station>) {
  return (
    <article
      style={{
        pointerEvents: 'auto',
        minWidth: 180,
        padding: '10px 12px',
        borderRadius: 8,
        background: 'rgb(15 23 42)',
        color: 'white',
        border: '1px solid rgb(148 163 184 / 0.4)',
        font: '13px system-ui, sans-serif',
      }}
    >
      <strong>{pin.data?.name}</strong>
      <div style={{ opacity: 0.75 }}>{pin.data?.country}</div>
      <button type="button" onClick={close} style={{ marginTop: 8 }}>
        Close ({placement})
      </button>
    </article>
  );
}

export default function PopupsCustomization() {
  return (
    <div style={{ height: '100%' }}>
      <Globe<Station> pins={pins} showPinPopup pinPopupComponent={StationCard} defaultCenter={{ lat: 15, lng: 150 }} />
    </div>
  );
}
