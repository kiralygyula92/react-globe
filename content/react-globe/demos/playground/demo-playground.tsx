/**
 * The playground: a globe with a live control for every prop in the public API, the
 * render-override examples and the imperative handle. It is also the page the end-to-end
 * suite drives, so control labels, `data-testid` attributes and `window.__globe` are
 * load-bearing.
 */

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DefaultConnection,
  GLOBE_LOCALES,
  Globe,
  type CameraPose,
  type ClusterRenderProps,
  type ConnectionLineStyle,
  type ConnectionType,
  type GlobeControlsRenderProps,
  type GlobeHandle,
  type GlobeLocale,
  type Pin,
  type PinConnection,
  type PinPopupRenderProps,
  type PinRenderProps,
  type RenderStyle,
} from 'react-globe';
import './playground.css';

declare global {
  interface Window {
    /** The mounted globe's handle, for the end-to-end suite. */
    __globe: GlobeHandle;
  }
}

/* ------------------------------------------------------------------ fixtures */

type Payload = { title: string; subtitle: string };

// Paris, Versailles and Saint-Denis sit within one cluster radius on purpose; (0, 0) is the
// projection landmark. The end-to-end suite relies on all eleven.
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

// Every link overrides something different. `broken` references a pin that does not exist,
// on purpose: the globe must warn and skip it, never throw.
const LINKS: PinConnection[] = [
  { id: 'l1', from: 'london', to: 'sydney', animated: true },
  { id: 'l2', from: 'nyc', to: 'paris', color: 'rgb(63, 224, 197)', lineStyle: 'dotted' },
  { id: 'l3', from: 'tokyo', to: 'rio', width: 3, archHeight: 1.1 },
  { id: 'l4', from: 'cape', to: 'reykjavik', type: 'line', lineStyle: 'dashed', color: 'rgb(169, 107, 255)' },
  { id: 'broken', from: 'london', to: 'atlantis', color: 'rgb(255, 93, 93)' },
];

/** A deterministic spread, so the stress run is comparable between reloads. */
function stressPins(count: number): Pin<Payload>[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * 2;
    return {
      id: `s${i}`,
      lat: Math.asin(y) * (180 / Math.PI),
      lng: ((i * golden * (180 / Math.PI)) % 360) - 180,
      data: { title: `Point ${i}`, subtitle: 'Stress set' },
    };
  });
}

/* ------------------------------------------------------------- override demos */

function SquarePin({ pin, hovered }: PinRenderProps<Payload>) {
  return <span className="pg-square-pin" data-testid="square-pin" data-hovered={hovered} title={pin.data?.title} />;
}

function FatPopup({ pin }: PinPopupRenderProps<Payload>) {
  return (
    <div className="pg-popup" data-testid="fat-popup">
      <p style={{ fontWeight: 700 }}>{pin.data?.title}</p>
      <p style={{ opacity: 0.7 }}>{pin.data?.subtitle}</p>
      <p style={{ marginTop: 8, opacity: 0.6, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
        {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}
      </p>
    </div>
  );
}

function DiamondCluster({ count, onClick, messages }: ClusterRenderProps<Payload>) {
  return (
    <button type="button" className="pg-cluster" data-testid="diamond-cluster" aria-label={messages.cluster(count)} onClick={onClick}>
      <span>{count}</span>
    </button>
  );
}

function BarControls({ zoomIn, zoomOut, rotateLeft, rotateRight, camera }: GlobeControlsRenderProps) {
  return (
    <div className="pg-bar">
      <button type="button" onClick={rotateLeft}>
        {'<'}
      </button>
      <button type="button" onClick={() => zoomIn()}>
        {'+'}
      </button>
      <span>{camera.zoom.toFixed(2)}</span>
      <button type="button" onClick={() => zoomOut()}>
        {'-'}
      </button>
      <button type="button" onClick={rotateRight}>
        {'>'}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ panel primitives */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pg-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** Wraps its control in a <label>: the end-to-end helpers find controls by it. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="pg-row">
      <span>{label}</span>
      {children}
    </label>
  );
}

const Toggle = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => (
  <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
);

const Num = ({ value, onChange, step = 0.1 }: { value: number; onChange: (value: number) => void; step?: number }) => (
  <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
);

function Pick<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

const Action = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" className="pg-button" onClick={onClick}>
    {label}
  </button>
);

/* ---------------------------------------------------------------------- page */

const RENDER_STYLES = ['standard', 'realistic', 'cartoon', 'modern'] as const satisfies readonly RenderStyle[];
const COLOR_SCHEMES = ['color', 'grayscale'] as const;
const BACKGROUNDS = ['transparent', 'rgb(7,11,28)', 'rgb(240,244,250)', 'var(--globe-demo-bg)'] as const;
const CONNECTION_TYPES = ['arch', 'line'] as const satisfies readonly ConnectionType[];
const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const satisfies readonly ConnectionLineStyle[];
const CONNECTION_COLORS = ['rgb(255, 181, 61)', 'rgb(63, 224, 197)', 'rgb(255, 255, 255)'] as const;

export default function Playground() {
  const globe = useRef<GlobeHandle>(null);
  const [mounted, setMounted] = useState(true);

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
  const [locale, setLocale] = useState<GlobeLocale>('en');

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
    <div className="pg" style={{ '--globe-demo-bg': 'rgb(220,235,247)' } as CSSProperties}>
      <div className="pg-stage">
        {mounted ? (
          <Globe<Payload>
            ref={globe}
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
            locale={locale}
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
              window.__globe = handle;
            }}
            onError={(error) => note(`onError: ${error.message}`)}
          />
        ) : (
          <div className="pg-unmounted">The globe is unmounted.</div>
        )}
      </div>

      <aside className="pg-panel" aria-label="Playground controls">
        <h2>Globe playground</h2>
        <p>Every prop in the public API, live.</p>

        <Section title="Camera & interaction">
          <Row label="enableZoom">
            <Toggle value={enableZoom} onChange={setEnableZoom} />
          </Row>
          <Row label="enableRotation">
            <Toggle value={enableRotation} onChange={setEnableRotation} />
          </Row>
          <Row label="enableTilt">
            <Toggle value={enableTilt} onChange={setEnableTilt} />
          </Row>
          <Row label="showControls">
            <Toggle value={showControls} onChange={setShowControls} />
          </Row>
          <Row label="minZoom">
            <Num value={minZoom} onChange={setMinZoom} />
          </Row>
          <Row label="maxZoom">
            <Num value={maxZoom} onChange={setMaxZoom} />
          </Row>
        </Section>

        <Section title="Geography">
          <Row label="showShorelines">
            <Toggle value={showShorelines} onChange={setShowShorelines} />
          </Row>
          <Row label="showCountryBorders">
            <Toggle value={showCountryBorders} onChange={setShowCountryBorders} />
          </Row>
          <Row label="showCountryNames">
            <Toggle value={showCountryNames} onChange={setShowCountryNames} />
          </Row>
          <Row label="countryNamesMinZoom">
            <Num value={countryNamesMinZoom} onChange={setCountryNamesMinZoom} />
          </Row>
          <Row label="showCapitals">
            <Toggle value={showCapitals} onChange={setShowCapitals} />
          </Row>
          <Row label="capitalsMinZoom">
            <Num value={capitalsMinZoom} onChange={setCapitalsMinZoom} />
          </Row>
          <Row label="highlightCountryOnHover">
            <Toggle value={highlightCountryOnHover} onChange={setHighlightCountryOnHover} />
          </Row>
          <Row label="showCountryNameOnHover">
            <Toggle value={showCountryNameOnHover} onChange={setShowCountryNameOnHover} />
          </Row>
          <Row label="showGraticule">
            <Toggle value={showGraticule} onChange={setShowGraticule} />
          </Row>
          <Row label="showGraticuleLabels">
            <Toggle value={showGraticuleLabels} onChange={setShowGraticuleLabels} />
          </Row>
        </Section>

        <Section title="Appearance">
          <Row label="renderStyle">
            <Pick value={renderStyle} options={RENDER_STYLES} onChange={setRenderStyle} />
          </Row>
          <Row label="colorScheme">
            <Pick value={colorScheme} options={COLOR_SCHEMES} onChange={setColorScheme} />
          </Row>
          <Row label="showClouds (realistic)">
            <Toggle value={showClouds} onChange={setShowClouds} />
          </Row>
          <Row label="backgroundColor">
            <Pick value={backgroundColor} options={BACKGROUNDS} onChange={setBackgroundColor} />
          </Row>
        </Section>

        <Section title="Localization">
          <Row label="locale">
            <Pick value={locale} options={GLOBE_LOCALES} onChange={setLocale} />
          </Row>
        </Section>

        <Section title="Pins">
          <Row label="5 000-pin stress set">
            <Toggle value={stress} onChange={setStress} />
          </Row>
          <Row label="showPinPopup">
            <Toggle value={showPinPopup} onChange={setShowPinPopup} />
          </Row>
          <Row label="enablePinClustering">
            <Toggle value={enablePinClustering} onChange={setEnablePinClustering} />
          </Row>
          <Row label="clusterZoomThreshold">
            <Num value={clusterZoomThreshold} onChange={setClusterZoomThreshold} />
          </Row>
          <Row label="clusterRadiusPx">
            <Num value={clusterRadiusPx} onChange={setClusterRadiusPx} step={2} />
          </Row>
        </Section>

        <Section title="Connections">
          <Row label="enableConnections">
            <Toggle value={enableConnections} onChange={setEnableConnections} />
          </Row>
          <Row label="connectionType">
            <Pick value={connectionType} options={CONNECTION_TYPES} onChange={setConnectionType} />
          </Row>
          <Row label="archHeight">
            <Num value={archHeight} onChange={setArchHeight} />
          </Row>
          <Row label="connectionLineStyle">
            <Pick value={connectionLineStyle} options={LINE_STYLES} onChange={setConnectionLineStyle} />
          </Row>
          <Row label="connectionWidth">
            <Num value={connectionWidth} onChange={setConnectionWidth} step={0.5} />
          </Row>
          <Row label="connectionColor">
            <Pick value={connectionColor} options={CONNECTION_COLORS} onChange={setConnectionColor} />
          </Row>
        </Section>

        <Section title="Render overrides">
          <Row label="pinComponent">
            <Toggle value={useSquarePin} onChange={setUseSquarePin} />
          </Row>
          <Row label="pinPopupComponent">
            <Toggle value={useFatPopup} onChange={setUseFatPopup} />
          </Row>
          <Row label="clusterComponent">
            <Toggle value={useDiamond} onChange={setUseDiamond} />
          </Row>
          <Row label="connectionComponent">
            <Toggle value={useSvgConnections} onChange={setUseSvgConnections} />
          </Row>
          <Row label="controlsComponent">
            <Toggle value={useBarControls} onChange={setUseBarControls} />
          </Row>
        </Section>

        <Section title="Imperative handle">
          <div className="pg-actions">
            <Action label="flyTo London" onClick={() => globe.current?.flyTo({ lat: 51.5074, lng: -0.1278 }, { zoom: 1.6 })} />
            <Action label="flyTo Sydney" onClick={() => globe.current?.flyTo({ lat: -33.8688, lng: 151.2093 }, { zoom: 1.6 })} />
            <Action label="zoomIn()" onClick={() => globe.current?.zoomIn()} />
            <Action label="zoomOut()" onClick={() => globe.current?.zoomOut()} />
            <Action label="startAutoRotate()" onClick={() => globe.current?.startAutoRotate(1)} />
            <Action label="stopAutoRotate()" onClick={() => globe.current?.stopAutoRotate()} />
            <Action label="reset()" onClick={() => globe.current?.reset()} />
            <Action
              label="controlled camera prop"
              onClick={() => setControlledCamera((prev) => (prev ? undefined : { lat: 35.6762, lng: 139.6503, zoom: 2, tilt: 35 }))}
            />
          </div>
        </Section>

        <Section title="Lifecycle">
          <div className="pg-actions">
            <Action label={mounted ? 'Unmount the globe' : 'Mount the globe'} onClick={() => setMounted((m) => !m)} />
          </div>
        </Section>

        <Section title="Events">
          <ul className="pg-log" aria-live="polite">
            {log.map((line, i) => (
              <li key={`${i}:${line}`}>{line}</li>
            ))}
          </ul>
        </Section>
      </aside>
    </div>
  );
}
