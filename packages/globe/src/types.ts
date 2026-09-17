/**
 * Public types.
 *
 * These declarations are the source of the generated API reference: every public
 * member carries its description here, and every defaulted prop an `@default` that a
 * unit test holds equal to `GLOBE_DEFAULTS`.
 */

import type { ComponentType, MouseEvent as ReactMouseEvent } from 'react';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from './geojson';
import type { GlobeMessages } from './i18n';

/* ------------------------------------------------------------------ geometry */

/** A geographic coordinate in degrees. */
export type LatLng = {
  /** Latitude in degrees, positive north, from -90 to 90. */
  lat: number;
  /** Longitude in degrees, positive east, from -180 to 180. */
  lng: number;
};

/** A point in the container's coordinate space, origin at its top-left. */
export type ScreenPoint = {
  /** Pixels from the container's left edge. */
  x: number;
  /** Pixels from the container's top edge. */
  y: number;
};

/** A marker placed at a coordinate, carrying any payload you attach. */
export type Pin<TData = Record<string, unknown>> = LatLng & {
  /** Stable, unique identifier. Connections refer to pins by it. */
  id: string;
  /** Arbitrary consumer payload. Never cloned, never mutated, passed through as-is. */
  data?: TData;
};

/** How a connection's stroke is drawn. Applies to both arches and lines. */
export type ConnectionLineStyle = 'solid' | 'dashed' | 'dotted';

/** The shape of a connection: lifted off the surface (`arch`) or flat on it (`line`). Both follow the great circle. */
export type ConnectionType = 'arch' | 'line';

/**
 * A link between two pins. Every visual member is an override: leave it out and the
 * globe's matching `connection*` prop decides, so a set of links can share one look
 * while a few of them break ranks.
 */
export type PinConnection = {
  /** Stable, unique identifier. */
  id: string;
  /** `Pin.id` of the start point. An unknown id skips the connection with a development warning. */
  from: string;
  /** `Pin.id` of the end point. An unknown id skips the connection with a development warning. */
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
  /** Draws a flowing stroke. A solid link has no pattern to move, so it is drawn dashed. Stops under `prefers-reduced-motion`. */
  animated?: boolean;
  /** Arbitrary consumer payload, passed through to `connectionComponent`. */
  data?: Record<string, unknown>;
};

/** Where the camera looks from. Every member is optional wherever a pose is accepted. */
export type CameraPose = {
  /** Latitude the camera is centred over, in degrees. Clamped to ±85. */
  lat?: number;
  /** Longitude the camera is centred over, in degrees. */
  lng?: number;
  /** Distance from the globe centre in globe radii, clamped to [minZoom, maxZoom]. Smaller is closer. */
  zoom?: number;
  /** Degrees away from the surface normal at the centred point, clamped to 0–75. */
  tilt?: number;
};

/* ------------------------------------------------------------------- datasets */

/** Properties of one country in the countries dataset. */
export type CountryProperties = {
  /** Stable key, ISO A3 where the dataset has one, otherwise the name. */
  id: string;
  /** English name. */
  name: string;
  /** ISO 3166-1 alpha-2 code, or null where the dataset has none. */
  isoA2: string | null;
  /** ISO 3166-1 alpha-3 code, or null where the dataset has none. */
  isoA3: string | null;
  /** Dataset-provided label anchor latitude; null falls back to the computed centroid. */
  labelLat: number | null;
  /** Dataset-provided label anchor longitude; null falls back to the computed centroid. */
  labelLng: number | null;
  /** Lower sorts first when labels collide. */
  labelPriority: number;
  /** The name in other languages, keyed by language subtag ('de', 'ro'). `name` is used where a language is missing. */
  names?: Readonly<Record<string, string>>;
};

/** One country: a polygon or multipolygon feature with `CountryProperties`. */
export type CountryFeature = Feature<Polygon | MultiPolygon, CountryProperties>;

/** A GeoJSON FeatureCollection of countries. */
export type CountryCollection = FeatureCollection<Polygon | MultiPolygon, CountryProperties>;

/** One capital city in the capitals dataset. */
export type CapitalRecord = {
  /** Stable, unique identifier. */
  id: string;
  /** English name. */
  name: string;
  /** Country the capital belongs to, as named by the dataset. */
  country: string;
  /** ISO A2 of that country, where the dataset has one. */
  isoA2: string | null;
  /** Latitude in degrees. */
  lat: number;
  /** Longitude in degrees. */
  lng: number;
  /** Lower sorts first when labels collide. */
  labelPriority: number;
  /** The name in other languages, keyed by language subtag ('de', 'ro'). `name` is used where a language is missing. */
  names?: Readonly<Record<string, string>>;
};

/** The four ways the globe can be drawn. */
export type RenderStyle = 'standard' | 'realistic' | 'cartoon' | 'modern';

/**
 * Replacements for bundled textures and datasets. Anything left out uses the bundled
 * file. Coastlines, borders, elevation and land cover are not replaceable.
 */
export type GlobeAssets = {
  /** URL of the equirectangular day imagery used by the `realistic` style. */
  dayTexture?: string;
  /** URL of the tangent-space normal map used by the `realistic` style. */
  normalMap?: string;
  /** URL of the specular (water) mask used by the `realistic` style. */
  specularMap?: string;
  /** URL of the cloud layer used by the `realistic` style. */
  cloudsTexture?: string;
  /** URL of, or the parsed, countries FeatureCollection. Raw Natural Earth property names are accepted. */
  countriesGeoJson?: string | FeatureCollection;
  /** URL of, or the parsed, capitals array. */
  capitalsDataset?: string | CapitalRecord[];
};

/* ------------------------------------------------------------- render overrides */

/** Props passed to `pinComponent`. Its wrapper is already positioned and rotated to the surface normal. */
export interface PinRenderProps<TData = Record<string, unknown>> {
  /** The pin being drawn. */
  pin: Pin<TData>;
  /** Projected position of the pin's surface point. */
  position: ScreenPoint;
  /** True while the pointer is over this pin. */
  hovered: boolean;
  /** True after this pin was clicked; a second click, a click elsewhere on the globe, or new `pins` clear it. */
  selected: boolean;
  /** Always false: a custom pin is rendered only while it is on the visible side of the globe and not clustered. */
  occluded: boolean;
  /** Suggested scale factor for zoom compensation; 1 at the default distance. */
  scale: number;
}

/** The side of its pin a popup was placed on. */
export type PinPopupPlacement = 'top' | 'bottom' | 'left' | 'right';

/** Props passed to `pinPopupComponent`. */
export interface PinPopupRenderProps<TData = Record<string, unknown>> {
  /** The pin the popup belongs to. */
  pin: Pin<TData>;
  /** Projected position of the pin. */
  position: ScreenPoint;
  /** Where the popup was flipped to so it stays inside the canvas bounds. */
  placement: PinPopupPlacement;
  /** Closes the popup. */
  close: () => void;
}

/** Props passed to `clusterComponent`. */
export interface ClusterRenderProps<TData = Record<string, unknown>> {
  /** The pins merged into this marker. */
  pins: Pin<TData>[];
  /** Number of pins merged into this marker. */
  count: number;
  /** Projected position of the cluster's centre. */
  position: ScreenPoint;
  /** True while the pointer is over this cluster. */
  hovered: boolean;
  /** Suggested scale factor for zoom compensation; 1 at the default distance. */
  scale: number;
  /** Runs the globe's cluster action: `onClusterClick`, or a flight that fits the pins. */
  onClick: (event: ReactMouseEvent<HTMLElement>) => void;
  /** The globe's resolved UI strings, for the marker's accessible name. */
  messages: GlobeMessages;
}

/** One sample of a projected connection path. */
export type ConnectionPathPoint = ScreenPoint & {
  /** False where the globe occludes this sample. */
  visible: boolean;
};

/** Props passed to `connectionComponent`, rendered inside an `<svg>` that covers the canvas. */
export interface ConnectionRenderProps<TData = Record<string, unknown>> {
  /** The connection being drawn. */
  connection: PinConnection;
  /** The resolved start pin. */
  from: Pin<TData>;
  /** The resolved end pin. */
  to: Pin<TData>;
  /** The great-circle path, already projected and occlusion-tested. */
  path: ConnectionPathPoint[];
  /** 0 -> 1, advances while `connection.animated` is true. */
  progress: number;
  /** Resolved from the connection's override, else the globe's prop. */
  type: ConnectionType;
  /** Resolved from the connection's override, else the globe's prop. */
  lineStyle: ConnectionLineStyle;
  /** Stroke width in pixels, resolved from the connection's override, else the globe's prop. */
  width: number;
  /** Stroke colour, resolved from the connection's override, else the globe's prop. */
  color: string;
}

/** Props passed to `controlsComponent`. Position it yourself; the container is the positioning context. */
export interface GlobeControlsRenderProps {
  /** Rotates the globe one step to the left. */
  rotateLeft: () => void;
  /** Rotates the globe one step to the right. */
  rotateRight: () => void;
  /** Moves the camera one step closer. */
  zoomIn: () => void;
  /** Moves the camera one step away. */
  zoomOut: () => void;
  /** Returns the camera to the pose the globe opened on. */
  reset: () => void;
  /** False once the camera is at `minZoom`. */
  canZoomIn: boolean;
  /** False once the camera is at `maxZoom`. */
  canZoomOut: boolean;
  /** False while the camera is already sitting at the home pose. */
  canReset: boolean;
  /** The current camera pose. */
  camera: Required<CameraPose>;
  /** The globe's resolved UI strings, for the buttons' accessible names. */
  messages: GlobeMessages;
}

/* ---------------------------------------------------------------------- props */

/** Props of `Globe` and `GlobeLazy`. Every prop is optional. */
export interface GlobeProps<TData = Record<string, unknown>> {
  /* ---- sizing ---- */
  /**
   * Container width, applied to its inline style.
   * @default '100%'
   */
  width?: number | string;
  /**
   * Container height, applied to its inline style. The container must end up with a size.
   * @default '100%'
   */
  height?: number | string;
  /** Appended to the container's classes. */
  className?: string;

  /* ---- camera / interaction ---- */
  /**
   * Wheel and pinch zoom. When false no wheel listener is attached at all, so the page behind scrolls normally.
   * @default true
   */
  enableZoom?: boolean;
  /**
   * Closest allowed distance from the globe's centre, in globe radii.
   * @default 1.1
   */
  minZoom?: number;
  /**
   * Farthest allowed distance from the globe's centre, in globe radii.
   * @default 4
   */
  maxZoom?: number;
  /**
   * Left-drag orbit, with inertia on release.
   * @default true
   */
  enableRotation?: boolean;
  /**
   * Right-drag (or shift + left-drag) tilt, pivoting on the grabbed point.
   * @default true
   */
  enableTilt?: boolean;
  /** Controlled camera: each change animates the camera there. Wins over `defaultCamera`. */
  camera?: CameraPose;
  /** Uncontrolled starting pose, and the pose `reset()` returns to. Unset members fall back to `{ lat: 20, lng: 0, zoom: 3.2, tilt: 0 }`. */
  defaultCamera?: CameraPose;
  /**
   * Where the globe opens, as a coordinate. A convenience over `defaultCamera`
   * for the common case of "point it at this place"; `defaultCamera` wins where
   * both name a latitude and longitude. Also the point `reset()` returns to.
   */
  defaultCenter?: LatLng;
  /** Fires on every pose change, including drags. */
  onCameraChange?: (pose: Required<CameraPose>) => void;
  /**
   * Built-in rotate, zoom and reset buttons.
   * @default false
   */
  showControls?: boolean;
  /** Replaces the built-in buttons entirely. */
  controlsComponent?: ComponentType<GlobeControlsRenderProps>;

  /* ---- geography rendering ---- */
  /**
   * Natural Earth 1:50m coastlines.
   * @default true
   */
  showShorelines?: boolean;
  /**
   * Natural Earth 1:50m land boundaries.
   * @default true
   */
  showCountryBorders?: boolean;
  /**
   * Country names as DOM labels, with collision avoidance.
   * @default false
   */
  showCountryNames?: boolean;
  /**
   * Capital markers with their names.
   * @default false
   */
  showCapitals?: boolean;
  /**
   * Capitals render only while `zoom <= capitalsMinZoom`; beyond it they are culled, not faded.
   * @default 2.5
   */
  capitalsMinZoom?: number;
  /**
   * Country names render only while `zoom <= countryNamesMinZoom`; 0 or less means no threshold.
   * @default 0
   */
  countryNamesMinZoom?: number;
  /**
   * Fills the hovered country's polygon.
   * @default false
   */
  highlightCountryOnHover?: boolean;
  /**
   * The hover fill. A single colour applies to every style; an object sets it
   * per style, and any style left out keeps the module's default for it — no one
   * colour reads over both a physical map and a neon one.
   */
  countryHighlightColor?: string | Partial<Record<RenderStyle, string>>;
  /**
   * A tooltip naming the country under the cursor. Ignored when `showCountryNames` is true.
   * @default false
   */
  showCountryNameOnHover?: boolean;
  /**
   * Meridians and parallels every 15 degrees, drawn on the sphere.
   * @default false
   */
  showGraticule?: boolean;
  /**
   * Degree labels along the equator and the prime meridian. Needs `showGraticule`.
   * @default false
   */
  showGraticuleLabels?: boolean;
  /** Fires when the hovered country changes; null when the pointer leaves every country. */
  onCountryHover?: (country: CountryFeature | null) => void;
  /** Fires for a press that was not a drag (4 px of travel or less) on a country. */
  onCountryClick?: (country: CountryFeature) => void;

  /* ---- appearance ---- */
  /**
   * How the globe is drawn.
   * @default 'standard'
   */
  renderStyle?: RenderStyle;
  /**
   * `grayscale` desaturates the globe in its shaders; pins, labels and popups keep their colour.
   * @default 'color'
   */
  colorScheme?: 'color' | 'grayscale';
  /**
   * The drifting cloud shell. Only `'realistic'` has one to show.
   * @default true
   */
  showClouds?: boolean;
  /** Replacements for bundled textures and datasets. */
  assets?: GlobeAssets;
  /**
   * Any CSS colour, `'transparent'`, or a `var(--token)` read off the container.
   * @default 'transparent'
   */
  backgroundColor?: string;

  /* ---- pins ---- */
  /** Markers placed at exact coordinates and hidden behind the globe. */
  pins?: Pin<TData>[];
  /** Draws each visible, unclustered pin as your own DOM element instead of the built-in WebGL marker. */
  pinComponent?: ComponentType<PinRenderProps<TData>>;
  /** Fires when the hovered pin changes; null when the pointer leaves every pin. */
  onPinHover?: (pin: Pin<TData> | null, event: PointerEvent) => void;
  /** Fires for a press that was not a drag on a pin; the click also toggles the pin's `selected` state. */
  onPinClick?: (pin: Pin<TData>, event: PointerEvent) => void;
  /**
   * A popup anchored to the hovered pin, flipped to stay inside the canvas.
   * @default false
   */
  showPinPopup?: boolean;
  /** Replaces the built-in popup. */
  pinPopupComponent?: ComponentType<PinPopupRenderProps<TData>>;
  /**
   * Merges pins that crowd together on screen.
   * @default true
   */
  enablePinClustering?: boolean;
  /**
   * Pins cluster while the camera is farther than this distance.
   * @default 2
   */
  clusterZoomThreshold?: number;
  /**
   * Screen-space merge radius, in pixels.
   * @default 44
   */
  clusterRadiusPx?: number;
  /** Replaces the built-in cluster marker. */
  clusterComponent?: ComponentType<ClusterRenderProps<TData>>;
  /** Replaces the default cluster action, a flight that fits the cluster's pins. */
  onClusterClick?: (pins: Pin<TData>[]) => void;

  /* ---- connections ---- */
  /**
   * Draws `connections`.
   * @default false
   */
  enableConnections?: boolean;
  /** Links between pins, resolved by `Pin.id`. */
  connections?: PinConnection[];
  /**
   * The default shape. A connection's own `type` overrides it.
   * @default 'arch'
   */
  connectionType?: ConnectionType;
  /**
   * Peak lift of an arch above the surface, in globe radii, for an antipodal
   * pair; shorter hops scale down with distance. A connection's own
   * `archHeight` overrides it.
   * @default 0.55
   */
  archHeight?: number;
  /**
   * The default stroke pattern. A connection's own `lineStyle` overrides it.
   * @default 'solid'
   */
  connectionLineStyle?: ConnectionLineStyle;
  /**
   * The default stroke width in pixels, constant across zoom. A connection's own `width` overrides it.
   * @default 2
   */
  connectionWidth?: number;
  /**
   * The default stroke colour. A connection's own `color` overrides it.
   * @default 'rgb(255, 181, 61)'
   */
  connectionColor?: string;
  /** Draws connections as your own SVG instead of the built-in WebGL lines. `DefaultConnection` is a valid value. */
  connectionComponent?: ComponentType<ConnectionRenderProps<TData>>;

  /* ---- localisation ---- */
  /**
   * Language for the built-in UI strings and for country and capital names, as a
   * BCP 47 tag ('de', 'de-AT'). Built-in: 'en', 'ro', 'de', 'es', 'fr', 'hu'. Any
   * other language still picks place names from a dataset that carries them, with
   * English UI strings unless `messages` supplies every one.
   * @default 'en'
   */
  locale?: string;
  /** Replaces any built-in UI string for the current locale. */
  messages?: Partial<GlobeMessages>;

  /* ---- lifecycle ---- */
  /** Fires once, after the engine exists, with the imperative handle. */
  onReady?: (handle: GlobeHandle) => void;
  /** Fires when WebGL is unavailable, the context is lost, a dataset fails to load, or rendering throws. The globe shows a wordless fallback. */
  onError?: (error: Error) => void;
}

/* --------------------------------------------------------------------- handle */

/** Imperative control of a mounted globe, from a `ref` or `onReady`. Its identity is stable for the life of the mount. */
export interface GlobeHandle {
  /** Moves the camera to a pose; members left out keep their current value. Animated unless `animate: false` or reduced motion is on. */
  setCamera(pose: CameraPose, opts?: { animate?: boolean; durationMs?: number }): void;
  /** Returns the camera to the pose the globe opened on: centre, zoom and tilt. */
  reset(opts?: { animate?: boolean; durationMs?: number }): void;
  /** Flies the camera to centre a coordinate, optionally at a new zoom. */
  flyTo(target: LatLng, opts?: { zoom?: number; durationMs?: number }): void;
  /** Moves the camera closer by a fraction of the current distance (default 0.2). */
  zoomIn(step?: number): void;
  /** Moves the camera away by a fraction of the current distance (default 0.2). */
  zoomOut(step?: number): void;
  /** Spins the globe until stopped. Speed 1 is about 7 degrees per second. Paused under reduced motion. */
  startAutoRotate(speed?: number): void;
  /** Stops auto-rotation. */
  stopAutoRotate(): void;
  /** The current camera pose. */
  getCamera(): Required<CameraPose>;
  /** Projects a coordinate into the container; null when the globe hides it. */
  latLngToScreen(point: LatLng): ScreenPoint | null;
  /** The coordinate under a container point; null when the ray misses the globe. */
  screenToLatLng(x: number, y: number): LatLng | null;
}
