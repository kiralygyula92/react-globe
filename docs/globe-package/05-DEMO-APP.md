# 05 — The demo application

The demo is one page: a full-viewport globe with a control panel down the right-hand side, wired
so that **every prop in the public API has a live control**. It doubles as the target of the
end-to-end suite, so several details below are load-bearing for tests, not decoration.

In the original this lived at `src/features/globe/playground/GlobePlayground.tsx` and was served
at the route `/__dev/globe`. In the standalone repo it is
`apps/demo/src/GlobePlayground.tsx`, served at `/`.

---

## 1. Layout

```
┌──────────────────────────────────────────┬─────────────────┐
│                                          │ Globe playground│
│                                          │ Every prop in…  │
│                                          ├─────────────────┤
│              <Globe />                   │ Camera & inter… │
│           (flex-1, relative)             │ Geography       │
│                                          │ Appearance      │
│                                          │ Pins            │
│                                          │ Connections     │
│                                          │ Render overrides│
│                                          │ Imperative hand.│
│                                          │ Events          │
└──────────────────────────────────────────┴─────────────────┘
       h-dvh, bg rgb(7,11,28), text white        w-80, scrollable
```

Root element:

```tsx
<div
  className="flex h-dvh w-full bg-[rgb(7,11,28)] text-white"
  style={{ '--globe-demo-bg': 'rgb(220,235,247)' } as CSSProperties}
>
  <div className="relative flex-1"><Globe … /></div>
  <aside className="h-full w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-black/40 p-4">…</aside>
</div>
```

**`--globe-demo-bg` is not decoration.** It exists so the `backgroundColor="var(--x)"` code path
has something to resolve against without the demo borrowing an app token name. An e2e test
selects that option and asserts the token's colour actually reaches the WebGL clear buffer.

The panel is `w-80` (20 rem), scrollable, with sections separated by a top border.

---

## 2. Strings

Every visible string lives in one `const T = { … } as const` object rather than inline in the JSX.

In the original this was because a repo guard scans for untranslated bare text in JSX and the
module has no i18n of its own. In the standalone repo the guard is gone, but keep the pattern:
it makes the panel's labels greppable and makes it obvious that every label is exactly the prop
name it controls.

```ts
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
} as const;
```

Two labels are exercised verbatim by e2e tests and must match: `'enableZoom'`,
`'5 000-pin stress set'` (note the thin space — it is a regular space in the source),
`'showCapitals'`, `'showCountryNames'`, `'showGraticule'`, `'showGraticuleLabels'`,
`'clusterComponent'`, `'controlsComponent'`, `'pinComponent'`, `'connectionComponent'`,
`'showClouds (realistic)'`, `'renderStyle'`, `'colorScheme'`, `'backgroundColor'`.

---

## 3. Fixture data

### 3.1 The eleven cities

```ts
type Payload = { title: string; subtitle: string; kind: string };

const CITIES: Pin<Payload>[] = [
  { id: 'london',     lat: 51.5074, lng:  -0.1278, data: { title: 'London',            subtitle: 'United Kingdom', kind: 'city' } },
  { id: 'sydney',     lat: -33.8688, lng: 151.2093, data: { title: 'Sydney',           subtitle: 'Australia',      kind: 'city' } },
  { id: 'gulf',       lat: 0,       lng:   0,      data: { title: 'Null Island',       subtitle: 'Gulf of Guinea', kind: 'buoy' } },
  { id: 'tokyo',      lat: 35.6762, lng: 139.6503, data: { title: 'Tokyo',             subtitle: 'Japan',          kind: 'city' } },
  { id: 'nyc',        lat: 40.7128, lng: -74.006,  data: { title: 'New York',          subtitle: 'United States',  kind: 'city' } },
  { id: 'rio',        lat: -22.9068, lng: -43.1729, data: { title: 'Rio de Janeiro',   subtitle: 'Brazil',         kind: 'city' } },
  { id: 'cape',       lat: -33.9249, lng:  18.4241, data: { title: 'Cape Town',        subtitle: 'South Africa',   kind: 'city' } },
  { id: 'reykjavik',  lat: 64.1466, lng: -21.9426, data: { title: 'Reykjavik',         subtitle: 'Iceland',        kind: 'city' } },
  { id: 'paris',      lat: 48.8566, lng:   2.3522, data: { title: 'Paris',             subtitle: 'France',         kind: 'city' } },
  { id: 'paris-orly', lat: 48.7262, lng:   2.3652, data: { title: 'Orly',              subtitle: 'Near Paris',     kind: 'airport' } },
  { id: 'paris-cdg',  lat: 49.0097, lng:   2.5479, data: { title: 'Charles de Gaulle', subtitle: 'Near Paris',     kind: 'airport' } },
];
```

**Paris, Orly and Charles de Gaulle are chosen deliberately**: they sit within a cluster radius of
each other, so an e2e test can assert that at least one cluster holds three or more members and
that it expands when the camera closes in. `gulf` at (0, 0) is the landmark for the projection
test. Keep all eleven.

### 3.2 The five links

Every link overrides something different, so the panel's global connection settings visibly apply
to some and are overruled on others:

```ts
const LINKS: PinConnection[] = [
  { id: 'l1', from: 'london', to: 'sydney', animated: true },
  { id: 'l2', from: 'nyc',    to: 'paris',     color: 'rgb(63, 224, 197)', lineStyle: 'dotted' },
  { id: 'l3', from: 'tokyo',  to: 'rio',       width: 3, archHeight: 1.1 },
  // Flat against the surface, whatever the globe-wide type says.
  { id: 'l4', from: 'cape',   to: 'reykjavik', type: 'line', lineStyle: 'dashed', color: 'rgb(169, 107, 255)' },
  { id: 'broken', from: 'london', to: 'atlantis', color: 'rgb(255, 93, 93)' },
];
```

**`broken` is intentional.** It references a pin id that does not exist. An e2e test asserts that
the module warns — naming both `broken` and `atlantis` — and that the other four links still draw.
Do not "fix" it.

`l1` is the only animated one, so it demonstrates the animated-solid-becomes-dashed rule.

### 3.3 The stress set

```ts
/** Deterministic spread, so the stress run is comparable between reloads. */
function stressPins(count: number): Pin<Payload>[] {
  const pins: Pin<Payload>[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const lat = Math.asin(y) * (180 / Math.PI);
    const lng = ((i * golden * (180 / Math.PI)) % 360) - 180;
    pins.push({ id: `s${i}`, lat, lng, data: { title: `Point ${i}`, subtitle: 'Stress set', kind: 'stress' } });
  }
  return pins;
}
```

A Fibonacci sphere: evenly spread, deterministic. Built once with
`useMemo(() => stressPins(5000), [])`. When the stress toggle is on, `connections` is set to `[]`
— five thousand pins and five arcs is the pin test, not the connection test.

---

## 4. Override demo components

Five, each toggled by a checkbox in the "Render overrides" section. Their shapes matter: the e2e
suite identifies them by class (`rotate-45`, a `<` label) precisely because they are visually
unlike the defaults.

```tsx
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
        {pin.lat.toFixed(3)}{', '}{pin.lng.toFixed(3)}
      </p>
    </div>
  );
}

function DiamondCluster({ count, onClick }: ClusterRenderProps<Payload>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto flex h-11 w-11 rotate-45 items-center justify-center border-2 border-white bg-[rgb(169,107,255)] text-white"
    >
      <span className="-rotate-45 text-xs font-bold">{count}</span>
    </button>
  );
}

function BarControls({ zoomIn, zoomOut, rotateLeft, rotateRight, camera }: GlobeControlsRenderProps) {
  const button = 'pointer-events-auto rounded bg-black/60 px-3 py-1 text-xs text-white hover:bg-black/80';
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2">
      <button type="button" className={button} onClick={rotateLeft}>{'<'}</button>
      <button type="button" className={button} onClick={() => zoomIn()}>{'+'}</button>
      <span className="rounded bg-black/60 px-2 py-1 font-mono text-[0.65rem] text-white">
        {camera.zoom.toFixed(2)}
      </span>
      <button type="button" className={button} onClick={() => zoomOut()}>{'-'}</button>
      <button type="button" className={button} onClick={rotateRight}>{'>'}</button>
    </div>
  );
}
```

The fifth override is **`DefaultConnection` itself**, imported from the package's internals. That
is the point: the package's own SVG connection renderer *is* a valid `connectionComponent`, and
toggling it switches the links from WebGL to SVG with no visual change to speak of. In the
standalone package, either export `DefaultConnection` publicly or have the demo import it by deep
path — exporting it is cleaner and is a small, safe addition to the API.

---

## 5. Panel primitives

Four tiny components, no library:

```tsx
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 font-mono text-[0.7rem]">
      <span className="opacity-70">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ value, onChange }) {
  return <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />;
}

function Num({ value, onChange, step = 0.1 }) {
  return (
    <input type="number" step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 rounded border border-white/20 bg-black/30 px-1 text-right" />
  );
}

function Pick<T extends string>({ value, options, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}
      className="rounded border border-white/20 bg-black/30 px-1">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
```

Plus `Section({ title, children })` — an `<h2>` in uppercase tracking-wider over a top border —
and `Action({ label, onClick })`, a small bordered button.

**`Row` wraps its control in a `<label>`.** That is what makes the e2e helpers work:

```ts
page.locator('label', { hasText: 'enableZoom' }).first().locator('input[type=checkbox]')
page.selectOption('label:has-text("renderStyle") select', 'cartoon')
```

Keep the `<label>` wrapper and the label text equal to the prop name.

---

## 6. State

One `useState` per control. The full list, with initial values — note that several **differ from
the prop defaults**, because the demo should open showing something interesting:

| State | Initial | Prop default |
|---|---|---|
| `enableZoom` | `true` | true |
| `enableRotation` | `true` | true |
| `enableTilt` | `true` | true |
| `showControls` | **`true`** | false |
| `minZoom` | `1.1` | 1.1 |
| `maxZoom` | `4` | 4 |
| `showShorelines` | `true` | true |
| `showCountryBorders` | `true` | true |
| `showCountryNames` | `false` | false |
| `showCapitals` | `false` | false |
| `capitalsMinZoom` | `2.5` | 2.5 |
| `countryNamesMinZoom` | `0` | 0 |
| `highlightCountryOnHover` | **`true`** | false |
| `showCountryNameOnHover` | **`true`** | false |
| `renderStyle` | `'standard'` | standard |
| `colorScheme` | `'color'` | color |
| `showClouds` | `true` | true |
| `showGraticule` | `false` | false |
| `showGraticuleLabels` | **`true`** | false |
| `backgroundColor` | `'transparent'` | transparent |
| `showPinPopup` | **`true`** | false |
| `enablePinClustering` | `true` | true |
| `clusterZoomThreshold` | `2` | 2 |
| `clusterRadiusPx` | `44` | 44 |
| `stress` | `false` | — |
| `enableConnections` | **`true`** | false |
| `connectionType` | `'arch'` | arch |
| `archHeight` | `0.55` | 0.55 |
| `connectionLineStyle` | `'solid'` | solid |
| `connectionWidth` | `2` | 2 |
| `connectionColor` | `'rgb(255, 181, 61)'` | same |
| `useSquarePin` / `useFatPopup` / `useDiamond` / `useSvgConnections` / `useBarControls` | `false` | — |
| `controlledCamera` | `undefined` | — |
| `log` | `[]` | — |

`showGraticuleLabels` starts `true` while `showGraticule` starts `false` on purpose: turning the
grid on immediately shows its labels, which is what the graticule e2e test walks through.

The event log:

```ts
const [log, setLog] = useState<string[]>([]);
const note = (line: string) => setLog((prev) => [line, ...prev].slice(0, 8));
```

Newest first, capped at eight.

---

## 7. The `<Globe>` call

Every prop, wired:

```tsx
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
    (window as unknown as { __globe?: GlobeHandle }).__globe = handle;
  }}
  onError={(error) => note(`onError: ${error.message}`)}
/>
```

Three things to note:

1. **`defaultCenter={{ lat: 25, lng: 8 }}` with `defaultCamera={{ zoom: 2.8, tilt: 0 }}`** — the
   two combined demonstrate the merge rule: the centre comes from `defaultCenter`, the distance
   from `defaultCamera`. An e2e test asserts the globe opens at lat 25, lng 8.
2. **`defaultCamera` is dropped to `undefined` while `controlledCamera` is set**, so the demo does
   not trip its own dev warning about passing both.
3. **`window.__globe`** is how the entire e2e suite drives the camera. It is demo-only; the
   package exposes nothing global. Declare it:

```ts
declare global {
  interface Window { __globe: GlobeHandle }
}
```

---

## 8. The panel, section by section

### Camera & interaction
`enableZoom`, `enableRotation`, `enableTilt`, `showControls` (toggles); `minZoom`, `maxZoom`
(numbers, step 0.1).

### Geography
`showShorelines`, `showCountryBorders`, `showCountryNames` (toggles); `countryNamesMinZoom`
(number); `showCapitals` (toggle); `capitalsMinZoom` (number); `highlightCountryOnHover`,
`showCountryNameOnHover`, `showGraticule`, `showGraticuleLabels` (toggles).

Order matters a little: each `*MinZoom` sits directly under the toggle it qualifies.

### Appearance
- `renderStyle` — select over `['standard', 'realistic', 'cartoon', 'modern']`
- `colorScheme` — select over `['color', 'grayscale']`
- `showClouds (realistic)` — toggle
- `backgroundColor` — select over
  `['transparent', 'rgb(7,11,28)', 'rgb(240,244,250)', 'var(--globe-demo-bg)']`

The fourth background option is the design-token path. Keep it.

### Pins
`5 000-pin stress set`, `showPinPopup`, `enablePinClustering` (toggles);
`clusterZoomThreshold` (number, step 0.1); `clusterRadiusPx` (number, **step 2**).

### Connections
`enableConnections` (toggle); `connectionType` select `['arch', 'line']`; `archHeight` (number);
`connectionLineStyle` select `['solid', 'dashed', 'dotted']`; `connectionWidth` (number,
**step 0.5**); `connectionColor` select
`['rgb(255, 181, 61)', 'rgb(63, 224, 197)', 'rgb(255, 255, 255)']`.

### Render overrides
Five toggles: `pinComponent`, `pinPopupComponent`, `clusterComponent`, `connectionComponent`,
`controlsComponent`.

### Imperative handle
A `grid grid-cols-2 gap-1` of eight `Action` buttons:

```tsx
<Action label={T.flyLondon} onClick={() => globe.current?.flyTo({ lat: 51.5074, lng: -0.1278 }, { zoom: 1.6 })} />
<Action label={T.flySydney} onClick={() => globe.current?.flyTo({ lat: -33.8688, lng: 151.2093 }, { zoom: 1.6 })} />
<Action label={T.zoomIn}    onClick={() => globe.current?.zoomIn()} />
<Action label={T.zoomOut}   onClick={() => globe.current?.zoomOut()} />
<Action label={T.autoRotate} onClick={() => globe.current?.startAutoRotate(1)} />
<Action label={T.stopRotate} onClick={() => globe.current?.stopAutoRotate()} />
<Action label={T.reset}     onClick={() => globe.current?.reset()} />
<Action
  label={T.controlled}
  onClick={() => setControlledCamera((prev) => prev ? undefined : { lat: 35.6762, lng: 139.6503, zoom: 2, tilt: 35 })}
/>
```

The last one toggles between controlled and uncontrolled mode, which is the only way to
demonstrate the `camera` prop.

### Events
An unstyled `<ul>` of the last eight log lines in monospace, showing `onReady`, pin clicks,
country clicks and errors.

---

## 9. Demo entry point

```tsx
// apps/demo/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';           // @import "tailwindcss";
import { GlobePlayground } from './GlobePlayground';

createRoot(document.getElementById('root')!).render(
  <StrictMode><GlobePlayground /></StrictMode>,
);
```

**Verify the demo under `StrictMode`.** Double-invoked effects are exactly what catches a globe
that creates two WebGL contexts or leaks a listener — the original ran under StrictMode for that
reason.

If you add routing later so the demo can navigate away and back (the mount/unmount leak test needs
somewhere to navigate *to*), a second trivial route is enough.
