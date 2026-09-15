/**
 * The demo page: a full-viewport globe with a control panel down the right-hand
 * side, wired so that every prop in the public API has a live control. It is also
 * the target of the end-to-end suite, so several details are load-bearing.
 */

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DefaultConnection,
  Globe,
  type CameraPose,
  type ClusterRenderProps,
  type ConnectionLineStyle,
  type ConnectionType,
  type GlobeControlsRenderProps,
  type GlobeHandle,
  type Pin,
  type PinConnection,
  type PinPopupRenderProps,
  type PinRenderProps,
  type RenderStyle,
} from 'react-globe';

declare global {
  interface Window {
    __globe: GlobeHandle;
  }
}

/* ------------------------------------------------------------------ strings */

const T = {
  title: 'Globe playground',
  subtitle: 'Every prop in the public API, live.',
  camera: 'Camera & interaction',
  geography: 'Geography',
  appearance: 'Appearance',
  pins: 'Pins',
  connections: 'Connections',
  overrides: 'Render overrides',
  handle: 'Imperative handle',
  events: 'Events',

  enableZoom: 'enableZoom',
  enableRotation: 'enableRotation',
  enableTilt: 'enableTilt',
  showControls: 'showControls',
  minZoom: 'minZoom',
  maxZoom: 'maxZoom',

  showShorelines: 'showShorelines',
  showCountryBorders: 'showCountryBorders',
  showCountryNames: 'showCountryNames',
  showCapitals: 'showCapitals',
  capitalsMinZoom: 'capitalsMinZoom',
  countryNamesMinZoom: 'countryNamesMinZoom',
  highlightCountryOnHover: 'highlightCountryOnHover',
  showCountryNameOnHover: 'showCountryNameOnHover',
  showGraticule: 'showGraticule',
  showGraticuleLabels: 'showGraticuleLabels',

  renderStyle: 'renderStyle',
  colorScheme: 'colorScheme',
  showClouds: 'showClouds (realistic)',
  backgroundColor: 'backgroundColor',

  stress: '5 000-pin stress set',
  showPinPopup: 'showPinPopup',
  enablePinClustering: 'enablePinClustering',
  clusterZoomThreshold: 'clusterZoomThreshold',
  clusterRadiusPx: 'clusterRadiusPx',

  enableConnections: 'enableConnections',
  connectionType: 'connectionType',
  archHeight: 'archHeight',
  connectionLineStyle: 'connectionLineStyle',
  connectionWidth: 'connectionWidth',
  connectionColor: 'connectionColor',

  pinComponent: 'pinComponent',
  pinPopupComponent: 'pinPopupComponent',
  clusterComponent: 'clusterComponent',
  connectionComponent: 'connectionComponent',
  controlsComponent: 'controlsComponent',

  controlled: 'controlled camera prop',
  flyLondon: 'flyTo London',
  flySydney: 'flyTo Sydney',
  zoomIn: 'zoomIn()',
  zoomOut: 'zoomOut()',
  autoRotate: 'startAutoRotate()',
  stopRotate: 'stopAutoRotate()',
  reset: 'reset()',

  leave: 'Unmount: go to a blank page',
  credits:
    'Imagery: NASA Blue Marble, GEBCO and Earth Observatory. Vector data: Natural Earth. All public domain.',
} as const;

/* ------------------------------------------------------------------ fixtures */

type Payload = { title: string; subtitle: string };

// Paris, Versailles and Saint-Denis sit within a cluster radius of each other on
// purpose; (0, 0) is the projection landmark. Keep all eleven.
const CITIES: Pin<Payload>[] = [
  { id: 'london', lat: 51.5074, lng: -0.1278, data: { title: 'London', subtitle: 'United Kingdom' } },
  { id: 'sydney', lat: -33.8688, lng: 151.2093, data: { title: 'Sydney', subtitle: 'Australia' } },
  { id: 'gulf', lat: 0, lng: 0, data: { title: 'Null Island', subtitle: 'Gulf of Guinea' } },
  { id: 'tokyo', lat: 35.6762, lng: 139.6503, data: { title: 'Tokyo', subtitle: 'Japan' } },
  { id: 'nyc', lat: 40.7128, lng: -74.006, data: { title: 'New York', subtitle: 'United States' } },
  { id: 'rio', lat: -22.9068, lng: -43.1729, data: { title: 'Rio de Janeiro', subtitle: 'Brazil' } },
  { id: 'cape', lat: -33.9249, lng: 18.4241, data: { title: 'Cape Town', subtitle: 'South Africa' } },
  { id: 'reykjavik', lat: 64.1466, lng: -21.9426, data: { title: 'Reykjavik', subtitle: 'Iceland' } },
  { id: 'paris', lat: 48.8566, lng: 2.3522, data: { title: 'Paris', subtitle: 'France' } },
  { id: 'versailles', lat: 48.8049, lng: 2.1204, data: { title: 'Versailles', subtitle: 'France' } },
  { id: 'saint-denis', lat: 48.9362, lng: 2.3574, data: { title: 'Saint-Denis', subtitle: 'France' } },
];

// Every link overrides something different. `broken` references a pin that does
// not exist, on purpose: the globe must warn and skip it, never throw.
const LINKS: PinConnection[] = [
  { id: 'l1', from: 'london', to: 'sydney', animated: true },
  { id: 'l2', from: 'nyc', to: 'paris', color: 'rgb(63, 224, 197)', lineStyle: 'dotted' },
  { id: 'l3', from: 'tokyo', to: 'rio', width: 3, archHeight: 1.1 },
  // Flat against the surface, whatever the globe-wide type says.
  { id: 'l4', from: 'cape', to: 'reykjavik', type: 'line', lineStyle: 'dashed', color: 'rgb(169, 107, 255)' },
  { id: 'broken', from: 'london', to: 'atlantis', color: 'rgb(255, 93, 93)' },
];

/** Deterministic spread, so the stress run is comparable between reloads. */
function stressPins(count: number): Pin<Payload>[] {
  const pins: Pin<Payload>[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const lat = Math.asin(y) * (180 / Math.PI);
    const lng = ((i * golden * (180 / Math.PI)) % 360) - 180;
    pins.push({ id: `s${i}`, lat, lng, data: { title: `Point ${i}`, subtitle: 'Stress set' } });
  }
  return pins;
}

/* ------------------------------------------------------------- override demos */

/** A rotated square, unlike the round default cluster / teardrop default pin. */
function SquarePin({ pin, hovered }: PinRenderProps<Payload>) {
  return (
    <span
      className={`block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border ${
        hovered ? 'border-white bg-[rgb(63,224,197)]' : 'border-white/70 bg-[rgb(169,107,255)]'
      }`}
      title={pin.data?.title}
    />
  );
}

function FatPopup({ pin }: PinPopupRenderProps<Payload>) {
  return (
    <div className="pointer-events-auto w-56 rounded-lg border-2 border-[rgb(63,224,197)] bg-[rgb(11,16,38)] p-3 text-white shadow-xl">
      <p className="m-0 text-sm font-bold">{pin.data?.title}</p>
      <p className="m-0 text-xs opacity-70">{pin.data?.subtitle}</p>
      <p className="m-0 mt-2 font-mono text-[0.65rem] opacity-60">
        {pin.lat.toFixed(3)}
        {', '}
        {pin.lng.toFixed(3)}
      </p>
    </div>
  );
}

function DiamondCluster({ count, onClick }: ClusterRenderProps<Payload>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center border-2 border-white bg-[rgb(169,107,255)] text-white"
    >
      <span className="-rotate-45 text-xs font-bold">{count}</span>
    </button>
  );
}

function BarControls({ zoomIn, zoomOut, rotateLeft, rotateRight, camera }: GlobeControlsRenderProps) {
  const button = 'pointer-events-auto rounded bg-black/60 px-3 py-1 text-xs text-white hover:bg-black/80';
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2">
      <button type="button" className={button} onClick={rotateLeft}>
        {'<'}
      </button>
      <button type="button" className={button} onClick={() => zoomIn()}>
        {'+'}
      </button>
      <span className="rounded bg-black/60 px-2 py-1 font-mono text-[0.65rem] text-white">{camera.zoom.toFixed(2)}</span>
      <button type="button" className={button} onClick={() => zoomOut()}>
        {'-'}
      </button>
      <button type="button" className={button} onClick={rotateRight}>
        {'>'}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ panel primitives */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 border-t border-white/10 pt-3">
      <h2 className="m-0 mb-1 text-[0.65rem] font-semibold uppercase tracking-wider opacity-60">{title}</h2>
      {children}
    </section>
  );
}

/** Wraps its control in a <label>: the end-to-end helpers find controls by it. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 font-mono text-[0.7rem]">
      <span className="opacity-70">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />;
}

function Num({ value, onChange, step = 0.1 }: { value: number; onChange: (value: number) => void; step?: number }) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 rounded border border-white/20 bg-black/30 px-1 text-right"
    />
  );
}

function Pick<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded border border-white/20 bg-black/30 px-1"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-white/20 px-2 py-1 font-mono text-[0.65rem] hover:bg-white/10"
    >
      {label}
    </button>
  );
}

/* ---------------------------------------------------------------------- page */

const RENDER_STYLES = ['standard', 'realistic', 'cartoon', 'modern'] as const satisfies readonly RenderStyle[];
const COLOR_SCHEMES = ['color', 'grayscale'] as const;
const BACKGROUNDS = ['transparent', 'rgb(7,11,28)', 'rgb(240,244,250)', 'var(--globe-demo-bg)'] as const;
const CONNECTION_TYPES = ['arch', 'line'] as const satisfies readonly ConnectionType[];
const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const satisfies readonly ConnectionLineStyle[];
const CONNECTION_COLORS = ['rgb(255, 181, 61)', 'rgb(63, 224, 197)', 'rgb(255, 255, 255)'] as const;

export function GlobePlayground() {
  const globe = useRef<GlobeHandle>(null);

  const [enableZoom, setEnableZoom] = useState(true);
  const [enableRotation, setEnableRotation] = useState(true);
  const [enableTilt, setEnableTilt] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [minZoom, setMinZoom] = useState(1.1);
  const [maxZoom, setMaxZoom] = useState(4);

  const [showShorelines, setShowShorelines] = useState(true);
  const [showCountryBorders, setShowCountryBorders] = useState(true);
  const [showCountryNames, setShowCountryNames] = useState(false);
  const [showCapitals, setShowCapitals] = useState(false);
  const [capitalsMinZoom, setCapitalsMinZoom] = useState(2.5);
  const [countryNamesMinZoom, setCountryNamesMinZoom] = useState(0);
  const [highlightCountryOnHover, setHighlightCountryOnHover] = useState(true);
  const [showCountryNameOnHover, setShowCountryNameOnHover] = useState(true);
  const [showGraticule, setShowGraticule] = useState(false);
  const [showGraticuleLabels, setShowGraticuleLabels] = useState(true);

  const [renderStyle, setRenderStyle] = useState<RenderStyle>('standard');
  const [colorScheme, setColorScheme] = useState<'color' | 'grayscale'>('color');
  const [showClouds, setShowClouds] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('transparent');

  const [stress, setStress] = useState(false);
  const [showPinPopup, setShowPinPopup] = useState(true);
  const [enablePinClustering, setEnablePinClustering] = useState(true);
  const [clusterZoomThreshold, setClusterZoomThreshold] = useState(2);
  const [clusterRadiusPx, setClusterRadiusPx] = useState(44);

  const [enableConnections, setEnableConnections] = useState(true);
  const [connectionType, setConnectionType] = useState<ConnectionType>('arch');
  const [archHeight, setArchHeight] = useState(0.55);
  const [connectionLineStyle, setConnectionLineStyle] = useState<ConnectionLineStyle>('solid');
  const [connectionWidth, setConnectionWidth] = useState(2);
  const [connectionColor, setConnectionColor] = useState<string>('rgb(255, 181, 61)');

  const [useSquarePin, setUseSquarePin] = useState(false);
  const [useFatPopup, setUseFatPopup] = useState(false);
  const [useDiamond, setUseDiamond] = useState(false);
  const [useSvgConnections, setUseSvgConnections] = useState(false);
  const [useBarControls, setUseBarControls] = useState(false);

  const [controlledCamera, setControlledCamera] = useState<CameraPose | undefined>(undefined);

  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((prev) => [line, ...prev].slice(0, 8));

  const stressSet = useMemo(() => stressPins(5000), []);

  return (
    <div
      className="flex h-dvh w-full bg-[rgb(7,11,28)] text-white"
      style={{ '--globe-demo-bg': 'rgb(220,235,247)' } as CSSProperties}
    >
      <div className="relative flex-1">
        <Globe<Payload>
          ref={globe}
          className="h-full w-full"
          enableZoom={enableZoom}
          enableRotation={enableRotation}
          enableTilt={enableTilt}
          minZoom={minZoom}
          maxZoom={maxZoom}
          showControls={showControls}
          controlsComponent={useBarControls ? BarControls : undefined}
          camera={controlledCamera}
          defaultCenter={{ lat: 25, lng: 8 }}
          defaultCamera={controlledCamera ? undefined : { zoom: 2.8, tilt: 0 }}
          showShorelines={showShorelines}
          showCountryBorders={showCountryBorders}
          showCountryNames={showCountryNames}
          showCapitals={showCapitals}
          capitalsMinZoom={capitalsMinZoom}
          countryNamesMinZoom={countryNamesMinZoom}
          highlightCountryOnHover={highlightCountryOnHover}
          showCountryNameOnHover={showCountryNameOnHover}
          showGraticule={showGraticule}
          showGraticuleLabels={showGraticuleLabels}
          onCountryClick={(country) => note(`country click: ${country.properties.name}`)}
          renderStyle={renderStyle}
          colorScheme={colorScheme}
          showClouds={showClouds}
          backgroundColor={backgroundColor}
          pins={stress ? stressSet : CITIES}
          pinComponent={useSquarePin ? SquarePin : undefined}
          pinPopupComponent={useFatPopup ? FatPopup : undefined}
          clusterComponent={useDiamond ? DiamondCluster : undefined}
          showPinPopup={showPinPopup}
          enablePinClustering={enablePinClustering}
          clusterZoomThreshold={clusterZoomThreshold}
          clusterRadiusPx={clusterRadiusPx}
          onPinClick={(pin) => note(`pin click: ${pin.data?.title ?? pin.id}`)}
          enableConnections={enableConnections}
          connections={stress ? [] : LINKS}
          connectionType={connectionType}
          archHeight={archHeight}
          connectionLineStyle={connectionLineStyle}
          connectionWidth={connectionWidth}
          connectionColor={connectionColor}
          connectionComponent={useSvgConnections ? DefaultConnection : undefined}
          onReady={(handle) => {
            note('onReady');
            // A handle on the window is what the end-to-end tests drive the camera
            // through. Demo-only: the module itself exposes nothing global.
            window.__globe = handle;
          }}
          onError={(error) => note(`onError: ${error.message}`)}
        />
      </div>

      <aside className="h-full w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-black/40 p-4">
        <h1 className="m-0 text-base font-semibold">{T.title}</h1>
        <p className="m-0 mt-0.5 text-xs opacity-60">{T.subtitle}</p>

        <Section title={T.camera}>
          <Row label={T.enableZoom}>
            <Toggle value={enableZoom} onChange={setEnableZoom} />
          </Row>
          <Row label={T.enableRotation}>
            <Toggle value={enableRotation} onChange={setEnableRotation} />
          </Row>
          <Row label={T.enableTilt}>
            <Toggle value={enableTilt} onChange={setEnableTilt} />
          </Row>
          <Row label={T.showControls}>
            <Toggle value={showControls} onChange={setShowControls} />
          </Row>
          <Row label={T.minZoom}>
            <Num value={minZoom} onChange={setMinZoom} />
          </Row>
          <Row label={T.maxZoom}>
            <Num value={maxZoom} onChange={setMaxZoom} />
          </Row>
        </Section>

        <Section title={T.geography}>
          <Row label={T.showShorelines}>
            <Toggle value={showShorelines} onChange={setShowShorelines} />
          </Row>
          <Row label={T.showCountryBorders}>
            <Toggle value={showCountryBorders} onChange={setShowCountryBorders} />
          </Row>
          <Row label={T.showCountryNames}>
            <Toggle value={showCountryNames} onChange={setShowCountryNames} />
          </Row>
          <Row label={T.countryNamesMinZoom}>
            <Num value={countryNamesMinZoom} onChange={setCountryNamesMinZoom} />
          </Row>
          <Row label={T.showCapitals}>
            <Toggle value={showCapitals} onChange={setShowCapitals} />
          </Row>
          <Row label={T.capitalsMinZoom}>
            <Num value={capitalsMinZoom} onChange={setCapitalsMinZoom} />
          </Row>
          <Row label={T.highlightCountryOnHover}>
            <Toggle value={highlightCountryOnHover} onChange={setHighlightCountryOnHover} />
          </Row>
          <Row label={T.showCountryNameOnHover}>
            <Toggle value={showCountryNameOnHover} onChange={setShowCountryNameOnHover} />
          </Row>
          <Row label={T.showGraticule}>
            <Toggle value={showGraticule} onChange={setShowGraticule} />
          </Row>
          <Row label={T.showGraticuleLabels}>
            <Toggle value={showGraticuleLabels} onChange={setShowGraticuleLabels} />
          </Row>
        </Section>

        <Section title={T.appearance}>
          <Row label={T.renderStyle}>
            <Pick value={renderStyle} options={RENDER_STYLES} onChange={setRenderStyle} />
          </Row>
          <Row label={T.colorScheme}>
            <Pick value={colorScheme} options={COLOR_SCHEMES} onChange={setColorScheme} />
          </Row>
          <Row label={T.showClouds}>
            <Toggle value={showClouds} onChange={setShowClouds} />
          </Row>
          <Row label={T.backgroundColor}>
            <Pick value={backgroundColor} options={BACKGROUNDS} onChange={setBackgroundColor} />
          </Row>
        </Section>

        <Section title={T.pins}>
          <Row label={T.stress}>
            <Toggle value={stress} onChange={setStress} />
          </Row>
          <Row label={T.showPinPopup}>
            <Toggle value={showPinPopup} onChange={setShowPinPopup} />
          </Row>
          <Row label={T.enablePinClustering}>
            <Toggle value={enablePinClustering} onChange={setEnablePinClustering} />
          </Row>
          <Row label={T.clusterZoomThreshold}>
            <Num value={clusterZoomThreshold} onChange={setClusterZoomThreshold} />
          </Row>
          <Row label={T.clusterRadiusPx}>
            <Num value={clusterRadiusPx} onChange={setClusterRadiusPx} step={2} />
          </Row>
        </Section>

        <Section title={T.connections}>
          <Row label={T.enableConnections}>
            <Toggle value={enableConnections} onChange={setEnableConnections} />
          </Row>
          <Row label={T.connectionType}>
            <Pick value={connectionType} options={CONNECTION_TYPES} onChange={setConnectionType} />
          </Row>
          <Row label={T.archHeight}>
            <Num value={archHeight} onChange={setArchHeight} />
          </Row>
          <Row label={T.connectionLineStyle}>
            <Pick value={connectionLineStyle} options={LINE_STYLES} onChange={setConnectionLineStyle} />
          </Row>
          <Row label={T.connectionWidth}>
            <Num value={connectionWidth} onChange={setConnectionWidth} step={0.5} />
          </Row>
          <Row label={T.connectionColor}>
            <Pick value={connectionColor} options={CONNECTION_COLORS} onChange={setConnectionColor} />
          </Row>
        </Section>

        <Section title={T.overrides}>
          <Row label={T.pinComponent}>
            <Toggle value={useSquarePin} onChange={setUseSquarePin} />
          </Row>
          <Row label={T.pinPopupComponent}>
            <Toggle value={useFatPopup} onChange={setUseFatPopup} />
          </Row>
          <Row label={T.clusterComponent}>
            <Toggle value={useDiamond} onChange={setUseDiamond} />
          </Row>
          <Row label={T.connectionComponent}>
            <Toggle value={useSvgConnections} onChange={setUseSvgConnections} />
          </Row>
          <Row label={T.controlsComponent}>
            <Toggle value={useBarControls} onChange={setUseBarControls} />
          </Row>
        </Section>

        <Section title={T.handle}>
          <div className="grid grid-cols-2 gap-1">
            <Action label={T.flyLondon} onClick={() => globe.current?.flyTo({ lat: 51.5074, lng: -0.1278 }, { zoom: 1.6 })} />
            <Action label={T.flySydney} onClick={() => globe.current?.flyTo({ lat: -33.8688, lng: 151.2093 }, { zoom: 1.6 })} />
            <Action label={T.zoomIn} onClick={() => globe.current?.zoomIn()} />
            <Action label={T.zoomOut} onClick={() => globe.current?.zoomOut()} />
            <Action label={T.autoRotate} onClick={() => globe.current?.startAutoRotate(1)} />
            <Action label={T.stopRotate} onClick={() => globe.current?.stopAutoRotate()} />
            <Action label={T.reset} onClick={() => globe.current?.reset()} />
            <Action
              label={T.controlled}
              onClick={() =>
                setControlledCamera((prev) => (prev ? undefined : { lat: 35.6762, lng: 139.6503, zoom: 2, tilt: 35 }))
              }
            />
          </div>
        </Section>

        <Section title={T.events}>
          <ul className="m-0 list-none p-0 font-mono text-[0.65rem] opacity-80">
            {log.map((line, i) => (
              <li key={`${i}:${line}`}>{line}</li>
            ))}
          </ul>
        </Section>

        <div className="mt-4 border-t border-white/10 pt-3">
          <a data-route href="/blank" className="font-mono text-[0.65rem] underline opacity-70 hover:opacity-100">
            {T.leave}
          </a>
          <p className="m-0 mt-2 text-[0.6rem] leading-snug opacity-50">{T.credits}</p>
        </div>
      </aside>
    </div>
  );
}
