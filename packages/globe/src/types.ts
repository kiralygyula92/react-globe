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
