/** Every default the globe applies, in one place, plus the pose helpers built on them. */

import type { CameraPose, GlobeProps, LatLng, Pin, PinConnection, RenderStyle } from './types';
import { wrapLng } from './utils/coordinates';

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

  locale: 'en',
} as const;

export const DEFAULT_CAMERA: Required<CameraPose> = Object.freeze({
  lat: 20,
  lng: 0,
  zoom: 3.2,
  tilt: 0,
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

/* -------------------------------------------------------------- resolved props */

type DefaultedKey = keyof typeof GLOBE_DEFAULTS;

/**
 * The props with every defaulted member made required. The member types come
 * from `GlobeProps`, not from `GLOBE_DEFAULTS`: `as const` would otherwise narrow
 * `renderStyle` to the literal `'standard'`.
 */
export type ResolvedGlobeProps<TData> = Omit<
  GlobeProps<TData>,
  DefaultedKey | 'countryHighlightColor' | 'pins' | 'connections'
> &
  Required<Pick<GlobeProps<TData>, DefaultedKey>> & {
    /** Already resolved for the current render style. */
    countryHighlightColor: string;
    pins: readonly Pin<TData>[];
    connections: readonly PinConnection[];
  };

const EMPTY_PINS: readonly never[] = Object.freeze([]);
const EMPTY_CONNECTIONS: readonly PinConnection[] = Object.freeze([]);

export function highlightFor(
  style: RenderStyle,
  override: GlobeProps['countryHighlightColor'],
): string {
  if (typeof override === 'string') return override;
  return override?.[style] ?? HIGHLIGHT_BY_STYLE[style];
}

export function resolveGlobeProps<TData>(props: GlobeProps<TData>): ResolvedGlobeProps<TData> {
  const resolved: Record<string, unknown> = { ...GLOBE_DEFAULTS };
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) resolved[key] = value;
  }
  resolved.countryHighlightColor = highlightFor(resolved.renderStyle as RenderStyle, props.countryHighlightColor);
  // Shared frozen arrays, so an omitted prop keeps its identity between renders.
  resolved.pins = props.pins ?? EMPTY_PINS;
  resolved.connections = props.connections ?? EMPTY_CONNECTIONS;
  return resolved as ResolvedGlobeProps<TData>;
}

/* ----------------------------------------------------------------------- poses */

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function clampPose(pose: Required<CameraPose>, minZoom: number, maxZoom: number): Required<CameraPose> {
  return {
    lat: clamp(pose.lat, -LAT_CLAMP_DEG, LAT_CLAMP_DEG),
    lng: wrapLng(pose.lng),
    zoom: clamp(pose.zoom, minZoom, maxZoom),
    tilt: clamp(pose.tilt, TILT_MIN_DEG, TILT_MAX_DEG),
  };
}

/** Member-wise `patch.x ?? base.x`. */
export function mergePose(base: Required<CameraPose>, patch: CameraPose | undefined): Required<CameraPose> {
  return {
    lat: patch?.lat ?? base.lat,
    lng: patch?.lng ?? base.lng,
    zoom: patch?.zoom ?? base.zoom,
    tilt: patch?.tilt ?? base.tilt,
  };
}

/** `defaultCamera` over `defaultCenter` over the module default. */
export function homePose(
  defaultCamera: CameraPose | undefined,
  defaultCenter: LatLng | undefined,
): Required<CameraPose> {
  let pose: Required<CameraPose> = { ...DEFAULT_CAMERA };
  if (defaultCenter) pose = { ...pose, lat: defaultCenter.lat, lng: defaultCenter.lng };
  return mergePose(pose, defaultCamera);
}

export function posesMatch(a: Required<CameraPose>, b: Required<CameraPose>): boolean {
  return (
    Math.abs(a.lat - b.lat) < 0.01 &&
    Math.abs(wrapLng(a.lng - b.lng)) < 0.01 &&
    Math.abs(a.zoom - b.zoom) < 0.001 &&
    Math.abs(a.tilt - b.tilt) < 0.01
  );
}
