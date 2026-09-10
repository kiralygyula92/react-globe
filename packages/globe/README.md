# @yourscope/react-globe

A detailed, interactive 3D Earth for React, drawn with plain three.js.

- **One component, everything as props.** `<Globe />` with zero props renders a physical-map
  Earth with shorelines and country borders, left-drag orbit, right-drag tilt and wheel zoom.
- **Four render styles** — `standard` (cel-shaded physical map), `realistic` (satellite
  imagery, clouds, atmosphere), `cartoon` (printed atlas) and `modern` (neon) — three of them
  shaded per fragment, so nothing is baked at a fixed resolution.
- **5 000 pins at an interactive frame rate**, clustering, popups and great-circle connections.
- **Every visual element overridable** with your own React component.
- **Self-hosted assets.** Nothing is fetched from a third-party host at runtime.
- **A globe nobody is touching costs approximately nothing per frame.**

Peer dependencies: `react >= 19`, `react-dom >= 19`, `three >= 0.170`. Nothing else at runtime.

## Install

```bash
pnpm add @yourscope/react-globe three
pnpm add -D @types/three
```

Import the stylesheet once, at your app entry:

```tsx
import '@yourscope/react-globe/globe.css';
```

The stylesheet is compiled Tailwind with no preflight (your base styles are untouched) and every
utility prefixed `wg:`, so it cannot collide with your own Tailwind.

## Use

The component fills its container, **so the container must have a size**:

```tsx
import { Globe } from '@yourscope/react-globe';

export function Somewhere() {
  return (
    <div style={{ height: 500 }}>
      <Globe />
    </div>
  );
}
```

### Vite dev server

The package imports `three/examples/jsm/lines/*`. Pre-declare them so the dev server does not
re-optimise mid-session (which answers in-flight requests with a 504):

```ts
// vite.config.ts
optimizeDeps: {
  include: [
    'three',
    'three/examples/jsm/lines/Line2.js',
    'three/examples/jsm/lines/LineGeometry.js',
    'three/examples/jsm/lines/LineMaterial.js',
    'three/examples/jsm/lines/LineSegments2.js',
    'three/examples/jsm/lines/LineSegmentsGeometry.js',
  ],
}
```

### `Globe` or `GlobeLazy`

| Use | When |
|---|---|
| `Globe` | The screen always draws a globe, and you have already deferred the screen itself. |
| `GlobeLazy` | Same props, behind `React.lazy` + `Suspense` with a wordless placeholder. |

The barrel re-exports `Globe` statically, so a module that statically imports anything from the
package pulls `Globe` into its own chunk even if it only names `GlobeLazy`. To keep three.js out of
a chunk entirely, make your own import dynamic:

```tsx
const Stage = lazy(() => import('./Stage').then((m) => ({ default: m.Stage })));
```

## Props

Everything is optional. `TData` is whatever you hang off `Pin.data`; it is passed through untouched.

### Sizing

| Prop | Type | Default | Notes |
|---|---|---|---|
| `width` | `number \| string` | `'100%'` | Applied to the container's inline style. |
| `height` | `number \| string` | `'100%'` | |
| `className` | `string` | — | Appended to the container's classes. |

### Camera and interaction

| Prop | Type | Default | Notes |
|---|---|---|---|
| `enableZoom` | `boolean` | `true` | When `false` **no wheel listener is attached at all**, so the page behind scrolls normally. |
| `minZoom` | `number` | `1.1` | Closest allowed distance from the globe's centre, in radii. |
| `maxZoom` | `number` | `4.0` | Farthest allowed. |
| `enableRotation` | `boolean` | `true` | Left-drag orbit, with inertia on release. |
| `enableTilt` | `boolean` | `true` | Right-drag (or shift + left-drag) tilt, pivoting on the grabbed point. Clamped 0°–75°. |
| `camera` | `CameraPose` | — | Controlled: each change animates the camera there. |
| `defaultCamera` | `CameraPose` | `{ lat: 20, lng: 0, zoom: 2.6, tilt: 0 }` | Uncontrolled starting pose. Passing both warns in dev; `camera` wins. |
| `defaultCenter` | `LatLng` | — | Where the globe opens. `defaultCamera` wins wherever it names the same thing. |
| `onCameraChange` | `(pose) => void` | — | Fires on every pose change, including drags. |
| `showControls` | `boolean` | `false` | Rotate / zoom / reset buttons, keyboard reachable. |
| `controlsComponent` | `ComponentType<GlobeControlsRenderProps>` | built-in | Replaces those buttons entirely. |

`zoom` is a **distance from the globe's centre**, so smaller is closer. Field of view is 50°, which
puts the whole planet in frame from about 2.4 radii outward. **Home** — the pose the globe opens on
and `reset()` returns to — is `defaultCamera` over `defaultCenter` over the module default.

### Geography

| Prop | Type | Default | Notes |
|---|---|---|---|
| `showShorelines` | `boolean` | `true` | Natural Earth 1:50m coastline. |
| `showCountryBorders` | `boolean` | `true` | Natural Earth 1:50m land boundaries. |
| `showCountryNames` | `boolean` | `false` | DOM labels with collision avoidance. |
| `showCapitals` | `boolean` | `false` | Capital markers plus names. |
| `capitalsMinZoom` | `number` | `2.5` | Capitals render only while `zoom <= capitalsMinZoom`; beyond it they are culled, not faded. |
| `countryNamesMinZoom` | `number` | `0` | Same rule, except `<= 0` means "no threshold". |
| `highlightCountryOnHover` | `boolean` | `false` | Fills the hovered country's polygon. |
| `countryHighlightColor` | `string \| Partial<Record<RenderStyle, string>>` | per style | A string applies to every style; an object sets them individually. |
| `showCountryNameOnHover` | `boolean` | `false` | Cursor tooltip. Ignored (with a dev warning) when `showCountryNames` is `true`. |
| `showGraticule` | `boolean` | `false` | Meridians and parallels every 15°. |
| `showGraticuleLabels` | `boolean` | `false` | Degree labels. Needs `showGraticule`. |
| `onCountryHover` | `(country \| null) => void` | — | Hit-tested geometrically (raycast → lat/lng → point-in-polygon). |
| `onCountryClick` | `(country) => void` | — | Only for a press that was not a drag (≤ 4 px of travel). |

### Appearance

| Prop | Type | Default | Notes |
|---|---|---|---|
| `renderStyle` | `'standard' \| 'realistic' \| 'cartoon' \| 'modern'` | `'standard'` | |
| `colorScheme` | `'color' \| 'grayscale'` | `'color'` | Grayscale is a shader change, so pins, labels and popups keep their colour. |
| `showClouds` | `boolean` | `true` | Only `'realistic'` has a cloud shell. |
| `assets` | `GlobeAssets` | bundled | Override any texture or dataset; anything left out uses the bundled file. |
| `backgroundColor` | `string` | `'transparent'` | Any CSS colour, or a `var(--token)` resolved against the container. |

### Pins

| Prop | Type | Default | Notes |
|---|---|---|---|
| `pins` | `Pin<TData>[]` | `[]` | Placed at exact lat/lng, occluded by the globe. |
| `pinComponent` | `ComponentType<PinRenderProps<TData>>` | built-in | Switches to DOM markers. |
| `onPinHover` | `(pin, event) => void` | — | Replaces the hover *reporting*; the marker still highlights. |
| `onPinClick` | `(pin, event) => void` | — | |
| `showPinPopup` | `boolean` | `false` | Popup anchored to the hovered pin, flipped to stay inside the canvas. |
| `pinPopupComponent` | `ComponentType<PinPopupRenderProps<TData>>` | built-in | |
| `enablePinClustering` | `boolean` | `true` | |
| `clusterZoomThreshold` | `number` | `2.0` | Cluster while `zoom > threshold`. |
| `clusterRadiusPx` | `number` | `44` | Screen-space merge radius. |
| `clusterComponent` | `ComponentType<ClusterRenderProps<TData>>` | built-in | |
| `onClusterClick` | `(pins) => void` | fly to fit | |

**The default marker is WebGL geometry; an override is DOM.** With no `pinComponent`, every pin is
one instance in an instanced mesh — one draw call however many pins. Passing `pinComponent`
switches to one DOM node per visible, unclustered pin: more flexible, far heavier.

The default popup reads `Pin.data` by convention: title from `title`, `name` or `label` (else the
pin id); subtitle from `subtitle`, `description` or `caption`.

### Connections

| Prop | Type | Default | Notes |
|---|---|---|---|
| `enableConnections` | `boolean` | `false` | |
| `connections` | `PinConnection[]` | `[]` | Resolved by `Pin.id`; an unknown id is skipped with a dev warning, never thrown. |
| `connectionType` | `'arch' \| 'line'` | `'arch'` | Both follow the great circle. |
| `archHeight` | `number` | `0.55` | Peak lift in globe radii, for an antipodal pair. |
| `connectionLineStyle` | `'solid' \| 'dashed' \| 'dotted'` | `'solid'` | |
| `connectionWidth` | `number` | `2` | Pixels, constant across zoom. |
| `connectionColor` | `string` | `'rgb(255, 181, 61)'` | |
| `connectionComponent` | `ComponentType<ConnectionRenderProps<TData>>` | built-in (WebGL) | Receives the projected, occlusion-tested path and draws SVG. |

A connection's own `type`, `archHeight`, `lineStyle`, `color` and `width` override the matching
prop. Set `animated: true` for a flowing stroke — a solid link has no pattern to move, so an
animated solid one is drawn dashed. `prefers-reduced-motion` stops the flow. The package's own SVG
renderer is exported as `DefaultConnection` and is itself a valid `connectionComponent`.

### Lifecycle

| Prop | Notes |
|---|---|
| `onReady(handle)` | Fires once, after the engine exists. |
| `onError(error)` | WebGL unavailable, a lost context, a dataset that would not load, or a render error. The globe shows a wordless fallback and never takes the host screen down. |

## `GlobeHandle`

Attach a `ref`, or take the handle from `onReady`. Its identity is stable for the life of the mount.

```ts
interface GlobeHandle {
  setCamera(pose: CameraPose, opts?: { animate?: boolean; durationMs?: number }): void;
  reset(opts?: { animate?: boolean; durationMs?: number }): void;   // back to home
  flyTo(target: LatLng, opts?: { zoom?: number; durationMs?: number }): void;
  zoomIn(step?: number): void;               // a fraction, default 0.2
  zoomOut(step?: number): void;
  startAutoRotate(speed?: number): void;     // speed 1 is ~7 deg/s
  stopAutoRotate(): void;
  getCamera(): Required<CameraPose>;
  latLngToScreen(point: LatLng): ScreenPoint | null;   // null when the globe hides it
  screenToLatLng(x: number, y: number): LatLng | null; // null when the ray misses
}
```

Both projection methods work in the container's coordinate space, origin top-left.

## Render overrides

```tsx
// pinComponent — the wrapper is already positioned and rotated to the surface normal.
function SquarePin({ pin, hovered, scale }: PinRenderProps<MyData>) {
  return (
    <span
      style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      className={hovered ? 'block h-3 w-3 bg-white' : 'block h-3 w-3 bg-purple-500'}
      title={pin.data?.title}
    />
  );
}

// pinPopupComponent — arbitrary React, including your own app components.
function MyPopup({ pin, placement, close }: PinPopupRenderProps<MyData>) {
  return <article onClick={close}>{pin.data?.title} ({placement})</article>;
}

// clusterComponent — `count` is the number of pins merged into this marker.
function MyCluster({ count, onClick }: ClusterRenderProps<MyData>) {
  return <button type="button" onClick={onClick}>{count}</button>;
}

// connectionComponent — rendered inside an <svg> that covers the canvas.
// `type`, `lineStyle`, `width` and `color` arrive already resolved.
function MyArc({ path, color, width, lineStyle }: ConnectionRenderProps<MyData>) {
  const d = path.filter((p) => p.visible).map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  return <path d={d} stroke={color} strokeWidth={width} fill="none"
               strokeDasharray={lineStyle === 'dashed' ? '7 5' : undefined} />;
}

// controlsComponent — position it yourself; the container is the positioning context.
function MyControls({ zoomIn, zoomOut, reset, canZoomIn, canReset, camera }: GlobeControlsRenderProps) {
  return (
    <div className="pointer-events-none absolute right-3 top-3">
      <button type="button" className="pointer-events-auto" onClick={() => zoomIn()} disabled={!canZoomIn}>+</button>
      <button type="button" className="pointer-events-auto" onClick={() => zoomOut()}>-</button>
      <button type="button" className="pointer-events-auto" onClick={reset} disabled={!canReset}>home</button>
      <span>{camera.zoom.toFixed(2)}</span>
    </div>
  );
}
```

The overlay layer is `pointer-events: none` so drags reach the canvas; anything interactive must
opt back in with `pointer-events: auto`.

## Theming

Components read design tokens through CSS custom properties, each with a literal fallback, so they
render correctly with none defined. Set any of these on an ancestor to theme the globe without
overriding components:

| Token | Fallback | Used by |
|---|---|---|
| `--globe-paper-000` | `rgb(255 255 255)` | capital marker ring, cluster border |
| `--globe-paper-100` | `rgb(247 251 253)` | country label, capital name, graticule label, control icon |
| `--globe-aurora-500` | `rgb(63 224 197)` | capital dot, focus ring |
| `--globe-marigold-500` | `rgb(255 181 61)` | cluster fill |
| `--globe-marigold-200` | `rgb(255 226 172)` | cluster hover fill |
| `--globe-ink-900` | `rgb(17 37 58)` | cluster text |
| `--globe-space-800` | `rgb(11 16 38)` | country tooltip background |
| `--globe-surface-card` | `rgb(255 255 255)` / `rgb(15 18 38 / 0.72)` | popup background / control background |
| `--globe-surface-sunken` | `rgb(35 42 78 / 0.9)` | control hover |
| `--globe-text-primary` | `rgb(17 37 58)` | popup title |
| `--globe-text-secondary` | `rgb(60 90 114)` | popup subtitle |
| `--globe-border-strong` | `rgb(0 0 0 / 0.12)` / `rgb(255 255 255 / 0.3)` | popup border / control border |
| `--globe-r-sm` / `--globe-r-md` | `0.375rem` / `0.625rem` | tooltip, popup radii |
| `--globe-shadow-md` / `--globe-shadow-lg` | soft drop shadows | cluster, tooltip, popup |

## Assets

Every texture and dataset ships in `dist/assets/` (about 9 MB) and resolves relative to the module
with `new URL('./assets/…', import.meta.url)`, which Vite, webpack 5, Rollup and native ESM all
understand. If your bundler does not copy the files, copy `node_modules/@yourscope/react-globe/dist/assets`
somewhere you serve and point the `assets` prop at them:

```tsx
<Globe assets={{ dayTexture: '/my/earth.jpg', countriesGeoJson: myFeatureCollection }} />
```

`countriesGeoJson` and `capitalsDataset` accept a URL or the parsed data. A raw Natural Earth file
works: `NAME`, `ADMIN`, `ISO_A3` and `ADM0_A3` are accepted as fallbacks.

### Licences and credits

| File | Source | Licence |
|---|---|---|
| `countries-50m.geojson`, `coastline-50m.geojson`, `borders-50m.geojson`, `capitals-50m.json` | [Natural Earth](https://www.naturalearthdata.com/) 1:50m | Public domain |
| `earth-day-8192.jpg`, `earth-day-2048.jpg` | [Solar System Scope](https://www.solarsystemscope.com/textures/), Blue Marble derivative | **CC BY 4.0 — © Solar System Scope** |
| `earth-topology.png` | [three-globe](https://github.com/vasturiano/three-globe) example imagery | MIT |
| `earth-clouds-2048.jpg` | NASA Earth Observatory cloud composite | Public domain, credit NASA |
| `earth-normal-2048.jpg`, `earth-specular-2048.jpg` | three.js example textures (NASA-derived) | MIT |

**The CC BY 4.0 attribution to Solar System Scope is a legal obligation.** If you ship the
default day texture, credit Solar System Scope in your app.

## Performance contract

- One `requestAnimationFrame` loop, stopped outright when the canvas leaves the viewport or the tab
  is hidden.
- The loop draws only when something changed. An untouched globe skips `renderer.render` and the
  overlay pass entirely; cloud drift steps at 10 Hz. With auto-rotate off it costs almost nothing.
- Unmount disposes every geometry, material and texture, drops every listener, cancels the loop and
  forces the WebGL context loss. Twenty mount/unmount cycles leak nothing.
- Decoded images and parsed datasets are cached per URL for the life of the page. Datasets load on
  demand — with every geography layer off and the realistic style, no vectors are fetched.
- Overlay positions are written straight to the DOM every frame; overlay sets are recomputed at
  20 Hz. Nothing that changes every frame goes through React state.
- Clustering is a uniform screen-space grid: O(n), under 8 ms for 5 000 pins.
- The default pin is one instanced mesh — one draw call regardless of count.
- Triangulating the world for the flat styles' land mesh costs ~270 ms, runs on an idle callback,
  is shared between every globe on the page, and only happens once a camera is closer than 2.4 radii
  (or always, for `cartoon`).

## Accessibility

The hovered country is announced through a visually hidden `role="status"` region. The built-in
controls are real buttons with `aria-label`s and focus-visible outlines. Every animation the module
runs — flights, auto-rotate, cloud drift, connection flow — stops under `prefers-reduced-motion`.
