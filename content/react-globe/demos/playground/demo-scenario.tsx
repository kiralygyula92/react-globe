import { useMemo, useRef, useState } from 'react';
import { Globe, localizedName, type CountryFeature, type GlobeHandle, type Pin, type PinConnection, type RenderStyle } from 'react-globe';

type Hub = { title: string; subtitle: string };

const hubs: Pin<Hub>[] = [
  { id: 'lisbon', lat: 38.7223, lng: -9.1393, data: { title: 'Lisbon', subtitle: 'Portugal' } },
  { id: 'accra', lat: 5.6037, lng: -0.187, data: { title: 'Accra', subtitle: 'Ghana' } },
  { id: 'sao-paulo', lat: -23.5505, lng: -46.6333, data: { title: 'São Paulo', subtitle: 'Brazil' } },
  { id: 'singapore', lat: 1.3521, lng: 103.8198, data: { title: 'Singapore', subtitle: 'Singapore' } },
  { id: 'vancouver', lat: 49.2827, lng: -123.1207, data: { title: 'Vancouver', subtitle: 'Canada' } },
  { id: 'porto', lat: 41.1579, lng: -8.6291, data: { title: 'Porto', subtitle: 'Portugal' } },
];

const links: PinConnection[] = [
  { id: 'l-a', from: 'lisbon', to: 'accra', animated: true },
  { id: 'l-s', from: 'lisbon', to: 'sao-paulo' },
  { id: 'a-sg', from: 'accra', to: 'singapore', lineStyle: 'dotted' },
  { id: 's-v', from: 'sao-paulo', to: 'vancouver', color: 'rgb(244 114 182)' },
];

const STYLES: RenderStyle[] = ['standard', 'realistic', 'cartoon', 'modern'];

/** Pins, clustering, popups, connections, country hover, controls and the camera API on one globe. */
export default function PlaygroundScenario() {
  const globe = useRef<GlobeHandle>(null);
  const [style, setStyle] = useState<RenderStyle>('standard');
  const [locale, setLocale] = useState('en');
  const [country, setCountry] = useState<CountryFeature | null>(null);
  const [selected, setSelected] = useState<Hub>();
  const connections = useMemo(() => links, []);

  return (
    <div style={{ height: '100%', position: 'relative', font: '13px system-ui, sans-serif' }}>
      <Globe<Hub>
        ref={globe}
        renderStyle={style}
        locale={locale}
        pins={hubs}
        showPinPopup
        connections={connections}
        enableConnections
        highlightCountryOnHover
        showControls
        onCountryHover={setCountry}
        onPinClick={(pin) => {
          setSelected(pin.data);
          globe.current?.flyTo(pin, { zoom: 1.7 });
        }}
        defaultCamera={{ lat: 15, lng: -20, zoom: 2.8 }}
      />
      <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select aria-label="Render style" value={style} onChange={(e) => setStyle(e.target.value as RenderStyle)}>
          {STYLES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Locale" value={locale} onChange={(e) => setLocale(e.target.value)}>
          {['en', 'ro', 'de', 'es', 'fr', 'hu'].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <button type="button" onClick={() => globe.current?.startAutoRotate()}>
          Spin
        </button>
        <button type="button" onClick={() => globe.current?.stopAutoRotate()}>
          Stop
        </button>
      </div>
      <output style={{ position: 'absolute', left: 12, bottom: 12, color: 'white' }}>
        {selected ? `Selected ${selected.title}` : country ? localizedName(country.properties, locale) : 'Hover a country, click a pin'}
      </output>
    </div>
  );
}
