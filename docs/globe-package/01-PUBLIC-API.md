# 01 — Public API

This is the contract. `src/types.ts` and `src/index.ts` must match it exactly; everything else in
the package is private.

---

## 1. The barrel — `src/index.ts`

Exactly this, nothing more:

```ts
/** Globe feature barrel — the module's only public surface. */

export { Globe } from './Globe';
export { GlobeLazy } from './Globe.lazy';

export type {
  CameraPose,
  CapitalRecord,
  ClusterRenderProps,
  ConnectionPathPoint,
  ConnectionRenderProps,
  CountryCollection,
  CountryFeature,
  CountryProperties,
  GlobeAssets,
  GlobeControlsRenderProps,
  GlobeHandle,
  GlobeProps,
  LatLng,
  Pin,
  PinConnection,
  PinPopupPlacement,
  PinPopupRenderProps,
  PinRenderProps,
  ScreenPoint,
} from './types';
```

Note `RenderStyle`, `ConnectionType` and `ConnectionLineStyle` are **not** exported by the
original barrel even though they appear in prop types. Exporting them additionally is an
improvement and is safe; do it if you like, but do not remove any of the names above.

---

## 2. `src/types.ts` — complete

Reproduce this file verbatim. The doc comments are part of the contract because they are what a
consumer's editor shows.

```ts
/** Public types for the globe feature. */

import type { ComponentType, MouseEvent as ReactMouseEvent } from 'react';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

/* ------------------------------------------------------------------ geometry */

export type LatLng = { lat: number; lng: number };

/** A point in the container's coordinate space, origin at its top-left. */
export type ScreenPoint = { x: number; y: number };

export type Pin<TData = Record<string, unknown>> = LatLng & {
  id: string;
  /** Arbitrary consumer payload. Never cloned, never mutated, passed through as-is. */
  data?: TData;
};

/** How a connection's stroke is drawn. Applies to both arches and lines. */
export type ConnectionLineStyle = 'solid' | 'dashed' | 'dotted';

export type ConnectionType = 'arch' | 'line';

/**
 * Every visual member is an override: leave it out and the globe's matching
 * `connection*` prop decides, so a set of links can share one look while a few
 * of them break ranks.
 */
export type PinConnection = {
  id: string;
  /** Pin.id */
  from: string;
  /** Pin.id */
  to: string;
  /** Overrides `connectionType` for this link alone. */
  type?: ConnectionType;
  /** Overrides `archHeight`. Ignored when this link is drawn as a line. */
  archHeight?: number;
  /** Overrides `connectionLineStyle`. */
  lineStyle?: ConnectionLineStyle;
  /** Overrides `connectionColor`. */
  color?: string;
  /** Overrides `connectionWidth`. */
  width?: number;
  animated?: boolean;
  data?: Record<string, unknown>;
};

export type CameraPose = {
  /** Latitude the camera is centred over. */
  lat?: number;
  lng?: number;
  /** Distance from the globe centre in globe radii, clamped to [minZoom, maxZoom]. */
  zoom?: number;
  /** Degrees away from the surface normal at the centred point. */
  tilt?: number;
};

/* ------------------------------------------------------------------- datasets */

export type CountryProperties = {
  /** Stable key, ISO A3 where the dataset has one, otherwise the name. */
  id: string;
  name: string;
  isoA2: string | null;
  isoA3: string | null;
  /** Dataset-provided label anchor; null falls back to the computed centroid. */
  labelLat: number | null;
  labelLng: number | null;
  /** Lower sorts first when labels collide. */
  labelPriority: number;
};

export type CountryFeature = Feature<Polygon | MultiPolygon, CountryProperties>;

export type CountryCollection = FeatureCollection<Polygon | MultiPolygon, CountryProperties>;

export type CapitalRecord = {
  id: string;
  name: string;
  /** Country the capital belongs to, as named by the dataset. */
  country: string;
  /** ISO A2 of that country, where the dataset has one. */
  isoA2: string | null;
  lat: number;
  lng: number;
  /** Lower sorts first when labels collide. */
  labelPriority: number;
};

export type RenderStyle = 'standard' | 'realistic' | 'cartoon' | 'modern';

export type GlobeAssets = {
  dayTexture?: string;
  normalMap?: string;
  specularMap?: string;
  cloudsTexture?: string;
  countriesGeoJson?: string | FeatureCollection;
  capitalsDataset?: string | CapitalRecord[];
};

/* ------------------------------------------------------------- render overrides */

export interface PinRenderProps<TData = Record<string, unknown>> {
  pin: Pin<TData>;
  /** Projected position of the pin's surface point. */
  position: ScreenPoint;
  hovered: boolean;
  selected: boolean;
  /** True while the pin sits on the far side of the globe. */
  occluded: boolean;
  /** Suggested scale factor for zoom compensation; 1 at the default distance. */
  scale: number;
}

export type PinPopupPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface PinPopupRenderProps<TData = Record<string, unknown>> {
  pin: Pin<TData>;
  position: ScreenPoint;
  /** Where the popup was flipped to so it stays inside the canvas bounds. */
  placement: PinPopupPlacement;
  close: () => void;
}

export interface ClusterRenderProps<TData = Record<string, unknown>> {
  pins: Pin<TData>[];
  count: number;
  position: ScreenPoint;
  hovered: boolean;
  scale: number;
  onClick: (event: ReactMouseEvent<HTMLElement>) => void;
}

/** One sample of a projected connection path. */
export type ConnectionPathPoint = ScreenPoint & {
  /** False where the globe occludes this sample. */
  visible: boolean;
};

export interface ConnectionRenderProps<TData = Record<string, unknown>> {
  connection: PinConnection;
  from: Pin<TData>;
  to: Pin<TData>;
  /** The great-circle path, already projected and occlusion-tested. */
  path: ConnectionPathPoint[];
  /** 0 -> 1, advances while `connection.animated` is true. */
  progress: number;
  /** Resolved from the connection's override, else the globe's prop. */
  type: ConnectionType;
  lineStyle: ConnectionLineStyle;
  width: number;
  color: string;
}

export interface GlobeControlsRenderProps {
  rotateLeft: () => void;
  rotateRight: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Returns the camera to the pose the globe opened on. */
  reset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** False while the camera is already sitting at the home pose. */
  canReset: boolean;
  camera: Required<CameraPose>;
}

/* ---------------------------------------------------------------------- props */

export interface GlobeProps<TData = Record<string, unknown>> {
  /* ---- sizing ---- */
  width?: number | string;
  height?: number | string;
  className?: string;

  /* ---- camera / interaction ---- */
  enableZoom?: boolean;
  minZoom?: number;
  maxZoom?: number;
  enableRotation?: boolean;
  enableTilt?: boolean;
  camera?: CameraPose;
  defaultCamera?: CameraPose;
  /**
   * Where the globe opens, as a coordinate. A convenience over `defaultCamera`
   * for the common case of "point it at this place"; `defaultCamera` wins where
   * both name a latitude and longitude. Also the point `reset()` returns to.
   */
  defaultCenter?: LatLng;
  onCameraChange?: (pose: Required<CameraPose>) => void;
  showControls?: boolean;
  controlsComponent?: ComponentType<GlobeControlsRenderProps>;

  /* ---- geography rendering ---- */
  showShorelines?: boolean;
  showCountryBorders?: boolean;
  showCountryNames?: boolean;
  showCapitals?: boolean;
  capitalsMinZoom?: number;
  countryNamesMinZoom?: number;
  highlightCountryOnHover?: boolean;
  /**
   * The hover fill. A single colour applies to every style; an object sets it
   * per style, and any style left out keeps the module's default for it — no one
   * colour reads over both a physical map and a neon one.
   */
  countryHighlightColor?: string | Partial<Record<RenderStyle, string>>;
  /** Ignored when `showCountryNames` is true. */
  showCountryNameOnHover?: boolean;
  /** Meridians and parallels every 15 degrees, drawn on the sphere. */
  showGraticule?: boolean;
  /** Degree labels along the equator and the prime meridian. Needs `showGraticule`. */
  showGraticuleLabels?: boolean;
  onCountryHover?: (country: CountryFeature | null) => void;
  onCountryClick?: (country: CountryFeature) => void;

  /* ---- appearance ---- */
  renderStyle?: RenderStyle;
  colorScheme?: 'color' | 'grayscale';
  /** The drifting cloud shell. Only `'realistic'` has one to show. */
  showClouds?: boolean;
  assets?: GlobeAssets;
  /** Any CSS colour, `'transparent'`, or a `var(--token)` read off the container. */
  backgroundColor?: string;

  /* ---- pins ---- */
  pins?: Pin<TData>[];
  pinComponent?: ComponentType<PinRenderProps<TData>>;
  onPinHover?: (pin: Pin<TData> | null, event: PointerEvent) => void;
  onPinClick?: (pin: Pin<TData>, event: PointerEvent) => void;
  showPinPopup?: boolean;
  pinPopupComponent?: ComponentType<PinPopupRenderProps<TData>>;
  enablePinClustering?: boolean;
  clusterZoomThreshold?: number;
  clusterRadiusPx?: number;
  clusterComponent?: ComponentType<ClusterRenderProps<TData>>;
  onClusterClick?: (pins: Pin<TData>[]) => void;

  /* ---- connections ---- */
  enableConnections?: boolean;
  connections?: PinConnection[];
  /** The default shape. A connection's own `type` overrides it. */
  connectionType?: ConnectionType;
  /**
   * Peak lift of an arch above the surface, in globe radii, for an antipodal
   * pair; shorter hops scale down with distance. A connection's own
   * `archHeight` overrides it.
   */
  archHeight?: number;
  /** The default stroke pattern. A connection's own `lineStyle` overrides it. */
  connectionLineStyle?: ConnectionLineStyle;
  /** The default stroke width in pixels. A connection's own `width` overrides it. */
  connectionWidth?: number;
  /** The default stroke colour. A connection's own `color` overrides it. */
  connectionColor?: string;
  connectionComponent?: ComponentType<ConnectionRenderProps<TData>>;

  /* ---- lifecycle ---- */
  onReady?: (handle: GlobeHandle) => void;
  onError?: (error: Error) => void;
}

/* --------------------------------------------------------------------- handle */

export interface GlobeHandle {
  setCamera(pose: CameraPose, opts?: { animate?: boolean; durationMs?: number }): void;
  /** Returns the camera to the pose the globe opened on: centre, zoom and tilt. */
  reset(opts?: { animate?: boolean; durationMs?: number }): void;
  flyTo(target: LatLng, opts?: { zoom?: number; durationMs?: number }): void;
  zoomIn(step?: number): void;
  zoomOut(step?: number): void;
  startAutoRotate(speed?: number): void;
  stopAutoRotate(): void;
  getCamera(): Required<CameraPose>;
  latLngToScreen(point: LatLng): ScreenPoint | null;
  screenToLatLng(x: number, y: number): LatLng | null;
}
```

### Generic component typing

React 19 makes `ref` a plain prop, which is what lets `<Globe<TData> ref={...} />` stay generic.
Both `Globe` and `GlobeLazy` are declared as a generic *function type* and cast, because a
`React.forwardRef` result cannot stay generic:

```ts
type GlobeComponent = <TData = Record<string, unknown>>(
  props: GlobeProps<TData> & { ref?: Ref<GlobeHandle> },
) => ReactElement;

export const Globe = (<TData,>({ ref, ...props }: GlobeProps<TData> & { ref?: Ref<GlobeHandle> }) => (
  <GlobeErrorBoundary onError={props.onError}>
    <GlobeCore<TData> {...props} handleRef={ref ?? null} />
  </GlobeErrorBoundary>
)) as GlobeComponent;
```

On React 18, wrap in `forwardRef` and accept the loss of the generic (`TData` defaults to
`Record<string, unknown>`), or keep the React 19 form and set the peer range to `>=19`.

---

## 3. `src/defaults.ts` — every default in one place

This file exists so the defaults can be unit-tested without standing up WebGL. Reproduce it.

```ts
export const HIGHLIGHT_BY_STYLE: Record<RenderStyle, string> = {
  standard: 'rgba(255, 181, 61, 0.45)',
  realistic: 'rgba(255, 214, 130, 0.4)',
  cartoon: 'rgba(255, 255, 255, 0.42)',
  modern: 'rgba(122, 236, 255, 0.34)',
};

export const GLOBE_DEFAULTS = {
  width: '100%',
  height: '100%',

  enableZoom: true,
  minZoom: 1.1,
  maxZoom: 4.0,
  enableRotation: true,
  enableTilt: true,
  showControls: false,

  showShorelines: true,
  showCountryBorders: true,
  showCountryNames: false,
  showCapitals: false,
  capitalsMinZoom: 2.5,
  countryNamesMinZoom: 0,
  highlightCountryOnHover: false,
  showCountryNameOnHover: false,
  showGraticule: false,
  showGraticuleLabels: false,

  renderStyle: 'standard',
  colorScheme: 'color',
  showClouds: true,
  backgroundColor: 'transparent',

  showPinPopup: false,
  enablePinClustering: true,
  clusterZoomThreshold: 2.0,
  clusterRadiusPx: 44,

  enableConnections: false,
  connectionType: 'arch',
  archHeight: 0.55,
  connectionLineStyle: 'solid',
  connectionWidth: 2,
  connectionColor: 'rgb(255, 181, 61)',
} as const;

export const DEFAULT_CAMERA: Required<CameraPose> = Object.freeze({
  lat: 20, lng: 0, zoom: 2.6, tilt: 0,
});

export const TILT_MIN_DEG = 0;
export const TILT_MAX_DEG = 75;
/** Orbit clamp. Stops short of the poles so the up-vector never flips. */
export const LAT_CLAMP_DEG = 85;
/** Multiplicative step for one press of zoom-in / zoom-out. */
export const ZOOM_STEP = 0.2;
/** Degrees of longitude per press of rotate-left / rotate-right. */
export const ROTATE_STEP_DEG = 24;
/** Default camera animation length, milliseconds. */
export const DEFAULT_FLIGHT_MS = 900;
/** Radians per second of auto-rotation at speed 1. */
export const AUTO_ROTATE_SPEED = 0.12;
```

### Functions this file exports

| Function | Behaviour |
|---|---|
| `resolveGlobeProps(props)` | Spreads `GLOBE_DEFAULTS`, then overwrites with every prop whose value is **not `undefined`**. Then resolves `countryHighlightColor` via `highlightFor`, and substitutes shared frozen empty arrays for absent `pins` / `connections` so identity is stable between renders. |
| `highlightFor(style, override)` | A `string` override wins outright. An object is read at `override[style]`, falling back per style to `HIGHLIGHT_BY_STYLE[style]`. `undefined` falls back to the table. |
| `clampPose(pose, minZoom, maxZoom)` | `lat` clamped to ±85, `lng` wrapped into `[-180, 180)`, `zoom` clamped to `[minZoom, maxZoom]`, `tilt` clamped to `[0, 75]`. |
| `homePose(defaultCamera, defaultCenter)` | Start from `DEFAULT_CAMERA`; if `defaultCenter` is present overwrite `lat`/`lng` with it; then merge `defaultCamera` over the result, ignoring undefined members. So `defaultCamera` wins wherever it says anything. |
| `mergePose(base, patch)` | Member-wise `patch.x ?? base.x`. |
| `posesMatch(a, b)` | True when `|Δlat| < 0.01`, wrapped `|Δlng| < 0.01`, `|Δzoom| < 0.001`, `|Δtilt| < 0.01`. Used for `canReset`. |

`ResolvedGlobeProps<TData>` is the props type with every defaulted key made `Required`, plus
`countryHighlightColor: string` (already resolved for the current style) and readonly `pins` /
`connections`. Take the *types* of the defaulted members from `GlobeProps`, **not** from
`GLOBE_DEFAULTS` — `as const` would otherwise narrow `renderStyle` to the literal `'standard'`
and comparing it to `'cartoon'` becomes a type error rather than a question.

---

## 4. Prop reference

Everything is optional. `TData` is whatever you hang off `Pin.data`; it is passed through
untouched.

### 4.1 Sizing

| Prop | Type | Default | Notes |
|---|---|---|---|
| `width` | `number \| string` | `'100%'` | Applied to the container element's inline style. |
| `height` | `number \| string` | `'100%'` | |
| `className` | `string` | — | Appended to the container's classes. |

The component fills its container, so the container must have a size.

### 4.2 Camera and interaction

| Prop | Type | Default | Notes |
|---|---|---|---|
| `enableZoom` | `boolean` | `true` | When `false` **no wheel listener is attached at all**, so the page behind scrolls normally. |
| `minZoom` | `number` | `1.1` | Closest allowed distance from the globe's centre, in radii. |
| `maxZoom` | `number` | `4.0` | Farthest allowed. |
| `enableRotation` | `boolean` | `true` | Left-drag orbit, with inertia on release. |
| `enableTilt` | `boolean` | `true` | Right-drag (or shift + left-drag) tilt, pivoting on the grabbed point. Clamped 0°–75°. |
| `camera` | `CameraPose` | — | Controlled: each change animates the camera there. |
| `defaultCamera` | `CameraPose` | `{ lat: 20, lng: 0, zoom: 2.6, tilt: 0 }` | Uncontrolled starting pose. Passing both warns in dev; `camera` wins. |
| `defaultCenter` | `LatLng` | — | Where the globe opens, as a plain coordinate. `defaultCamera` wins wherever it names the same thing. |
| `onCameraChange` | `(pose: Required<CameraPose>) => void` | — | Fires on every pose change, including drags. |
| `showControls` | `boolean` | `false` | HTML rotate / zoom / reset buttons, keyboard reachable. |
| `controlsComponent` | `ComponentType<GlobeControlsRenderProps>` | built-in | Replaces those buttons entirely. |

`zoom` is a **distance from the globe's centre**, so smaller is closer. Field of view is 50°,
which puts the whole planet in frame from about 2.4 radii outward.

**Home** — the pose the globe opens on and `reset()` returns to — is `defaultCamera` over
`defaultCenter` over the module default.

### 4.3 Geography

| Prop | Type | Default | Notes |
|---|---|---|---|
| `showShorelines` | `boolean` | `true` | Natural Earth 1:50m coastline, drawn as lines on the sphere. |
| `showCountryBorders` | `boolean` | `true` | Natural Earth 1:50m land boundaries. |
| `showCountryNames` | `boolean` | `false` | DOM labels at each country's label point, with collision avoidance. |
| `showCapitals` | `boolean` | `false` | Capital markers plus names. |
| `capitalsMinZoom` | `number` | `2.5` | Capitals render only while `zoom <= capitalsMinZoom`; beyond it they are **culled, not faded**. |
| `countryNamesMinZoom` | `number` | `0` | Same rule, except that `<= 0` means "no threshold" — which is what makes the default "always". |
| `highlightCountryOnHover` | `boolean` | `false` | Fills the hovered country's polygon on the surface. |
| `countryHighlightColor` | `string \| Partial<Record<RenderStyle, string>>` | per style | See `HIGHLIGHT_BY_STYLE`. `rgb()`, `rgba()` and named colours all understood. |
| `showCountryNameOnHover` | `boolean` | `false` | Cursor tooltip. **Ignored when `showCountryNames` is `true`**, with a dev warning. |
| `showGraticule` | `boolean` | `false` | Meridians and parallels every 15°, equator and prime meridian drawn stronger. |
| `showGraticuleLabels` | `boolean` | `false` | Degree labels along the equator and prime meridian. Needs `showGraticule`. |
| `onCountryHover` | `(country: CountryFeature \| null) => void` | — | Hit-tested geometrically. |
| `onCountryClick` | `(country: CountryFeature) => void` | — | Only fires on a press that was not a drag (pointer travel ≤ 4 px). |

`countryHighlightColor` is the one default that follows another prop. One colour cannot serve
all four styles, so each has its own; pass a string to use it everywhere, or an object to set
them individually.

### 4.4 Appearance

| Prop | Type | Default | Notes |
|---|---|---|---|
| `renderStyle` | `'standard' \| 'realistic' \| 'cartoon' \| 'modern'` | `'standard'` | See `03-RENDER-STYLES.md`. |
| `colorScheme` | `'color' \| 'grayscale'` | `'color'` | Grayscale is a shader change, so pins, labels and popups keep their colour. |
| `showClouds` | `boolean` | `true` | Only `'realistic'` has a cloud shell to show. |
| `assets` | `GlobeAssets` | bundled | Override any texture or dataset; anything left out falls back to the bundled file. |
| `backgroundColor` | `string` | `'transparent'` | Any CSS colour, or a `var(--token)` resolved against the container before it reaches WebGL. |

### 4.5 Pins

| Prop | Type | Default | Notes |
|---|---|---|---|
| `pins` | `Pin<TData>[]` | `[]` | Placed at exact lat/lng, occluded by the globe. |
| `pinComponent` | `ComponentType<PinRenderProps<TData>>` | built-in | Switches to DOM markers — see below. |
| `onPinHover` | `(pin, event) => void` | — | Replaces the default hover *reporting*; the marker still highlights. |
| `onPinClick` | `(pin, event) => void` | — | |
| `showPinPopup` | `boolean` | `false` | Popup anchored to the hovered pin, flipped to stay inside the canvas. |
| `pinPopupComponent` | `ComponentType<PinPopupRenderProps<TData>>` | built-in | |
| `enablePinClustering` | `boolean` | `true` | |
| `clusterZoomThreshold` | `number` | `2.0` | Cluster while the camera is **farther** than this (`zoom > threshold`). |
| `clusterRadiusPx` | `number` | `44` | Screen-space merge radius. |
| `clusterComponent` | `ComponentType<ClusterRenderProps<TData>>` | built-in | The head carries the member count. |
| `onClusterClick` | `(pins: Pin<TData>[]) => void` | fly to fit | Default flies the camera to frame the cluster's members via `fitBounds`. |

**The default marker is WebGL geometry; an override is DOM.** With no `pinComponent`, every pin
is one instance in an instanced mesh — one draw call no matter how many pins, which is what makes
five thousand viable. Passing `pinComponent` switches to one DOM node per visible, unclustered
pin: far more flexible, far heavier. Keep counts modest there.

The default popup reads `Pin.data` by convention: title from `title`, then `name`, then `label`,
falling back to the pin's id; subtitle from `subtitle`, then `description`, then `caption`.

### 4.6 Connections

| Prop | Type | Default | Notes |
|---|---|---|---|
| `enableConnections` | `boolean` | `false` | |
| `connections` | `PinConnection[]` | `[]` | Resolved by `Pin.id`; an unknown id is **skipped with a dev warning, never thrown**. |
| `connectionType` | `'arch' \| 'line'` | `'arch'` | Both follow the great circle. |
| `archHeight` | `number` | `0.55` | Peak lift above the surface, in globe radii, for an antipodal pair. |
| `connectionLineStyle` | `'solid' \| 'dashed' \| 'dotted'` | `'solid'` | |
| `connectionWidth` | `number` | `2` | Stroke width in pixels, constant across zoom. |
| `connectionColor` | `string` | `'rgb(255, 181, 61)'` | |
| `connectionComponent` | `ComponentType<ConnectionRenderProps<TData>>` | built-in (WebGL) | An override receives the projected, occlusion-tested path and draws SVG. |

**Every connection can overrule any of these on its own.** The mapping:

| Member of `PinConnection` | Overrides |
|---|---|
| `type` | `connectionType` |
| `archHeight` | `archHeight` — ignored when the link is a line |
| `lineStyle` | `connectionLineStyle` |
| `color` | `connectionColor` |
| `width` | `connectionWidth` |

Set `animated: true` for a flowing stroke. **A solid link has no pattern to move, so an animated
solid one is drawn dashed**; any other style animates as it is. `prefers-reduced-motion` stops
the flow.

### 4.7 Lifecycle

| Prop | Type | Notes |
|---|---|---|
| `onReady` | `(handle: GlobeHandle) => void` | Fires **once**, after the engine exists. |
| `onError` | `(error: Error) => void` | WebGL unavailable, a lost context, a dataset that would not load, or a render error caught by the boundary. |

---

## 5. `GlobeHandle`

Attach a `ref`, or take the handle from `onReady`. The handle object identity is stable for the
life of the mount.

```ts
interface GlobeHandle {
  setCamera(pose: CameraPose, opts?: { animate?: boolean; durationMs?: number }): void;
  reset(opts?: { animate?: boolean; durationMs?: number }): void;   // back to home
  flyTo(target: LatLng, opts?: { zoom?: number; durationMs?: number }): void;
  zoomIn(step?: number): void;               // step is a fraction, default 0.2
  zoomOut(step?: number): void;
  startAutoRotate(speed?: number): void;     // speed 1 is ~7 deg/s
  stopAutoRotate(): void;
  getCamera(): Required<CameraPose>;
  latLngToScreen(point: LatLng): ScreenPoint | null;   // null when the globe hides it
  screenToLatLng(x: number, y: number): LatLng | null; // null when the ray misses the globe
}
```

Implementation notes:

- `zoomIn(step)` calls `engine.nudgeZoom(1 - step)`; `zoomOut(step)` calls `nudgeZoom(1 + step)`.
  Default step is `ZOOM_STEP = 0.2`.
- `reset()` defaults to `animate: true` and `durationMs: DEFAULT_FLIGHT_MS` (900).
- `setCamera` with `animate: false` (or under `prefers-reduced-motion`) jumps immediately.
- Both projection methods work in the **container's** coordinate space, origin top-left.
- Every method must be null-safe against an engine that has not been created or has been
  disposed: `engineRef.current?.…`, with `getCamera()` falling back to a copy of the home pose.

---

## 6. Render overrides — worked examples

These belong in the README and are all exercised by the demo page.

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
// `type`, `lineStyle`, `width` and `color` arrive already resolved, so an override
// never has to re-apply the fallback rules itself.
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

Note the `pointer-events` discipline: the overlay layer is `pointer-events-none` so drags reach
the canvas; anything interactive must opt back in with `pointer-events-auto`.

---

## 7. Two prop semantics that need stating

**`capitalsMinZoom` / `countryNamesMinZoom`.** Both are "render only at or below this camera
distance", i.e. `zoom <= n`. But `countryNamesMinZoom` defaults to `0`, and `zoom <= 0` is never
true — so `0` (and anything below it) is treated as "no threshold". That is what makes its
default mean "always, when enabled".

**`onPinHover` "replaces the default hover behaviour".** It replaces the *reporting*, not the
visual state: the marker still highlights, because a pin that stops responding to the cursor
reads as broken.

---

## 8. Dev-time warnings

Gated behind a build-time DEV flag (see `07-PACKAGING.md` for how to express this without
`import.meta.env`). All three are `console.warn`, never throws.

| Condition | Message |
|---|---|
| Both `camera` and `defaultCamera` passed | `` `[globe] `camera` and `defaultCamera` were both passed; `camera` wins and `defaultCamera` is ignored.` `` |
| `showCountryNames && showCountryNameOnHover` | `` `[globe] `showCountryNameOnHover` is ignored while `showCountryNames` is true.` `` |
| A connection references an unknown pin id | `` `[globe] connection "<id>" references unknown pin id(s): <ids>. Skipping it.` `` |

The third must name **both** the connection id and the missing pin id(s) — an e2e test asserts on
both substrings.

---

## 9. `Globe` vs `GlobeLazy`

| Use | When |
|---|---|
| `Globe` | The screen always draws a globe, and you have already deferred the screen itself. |
| `GlobeLazy` | Same props, wrapped in `React.lazy` + `Suspense`, with a wordless placeholder while it loads. |

**Caveat to document, because it is measured rather than assumed:** the barrel re-exports `Globe`
**statically**, so a module that statically imports anything from the package pulls `Globe.tsx`
into its own chunk even if it only names `GlobeLazy`. To keep three.js out of a chunk entirely,
the consumer must make their own import dynamic:

```tsx
const Stage = lazy(() => import('./Stage').then((m) => ({ default: m.Stage })));
```

`Globe.lazy.tsx` in full:

```tsx
type AnyGlobeProps = GlobeProps<Record<string, unknown>> & { ref?: Ref<GlobeHandle> };

const LoadedGlobe = lazy(async () => {
  const module = await import('./Globe');
  return { default: module.Globe as ComponentType<AnyGlobeProps> };
});

type GlobeLazyComponent = <TData = Record<string, unknown>>(
  props: GlobeProps<TData> & { ref?: Ref<GlobeHandle> },
) => ReactElement;

export const GlobeLazy = ((props: AnyGlobeProps) => (
  <Suspense fallback={<GlobeFallback />}>
    <LoadedGlobe {...props} />
  </Suspense>
)) as GlobeLazyComponent;
```
