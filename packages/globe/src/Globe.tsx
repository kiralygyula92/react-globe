/**
 * The globe component. `GlobeCore` is the React half: props in, engine calls and
 * DOM overlays out; `Globe` wraps it in the error boundary.
 *
 * React owns what exists; the engine owns where it is. Overlay elements are React
 * children, but their transforms are written straight to the DOM every rendered
 * frame by the OverlayPositioner. Every callback handed to the engine reads
 * through refs, so the engine is constructed exactly once per mount.
 */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactElement,
  type Ref,
} from 'react';
import type {
  CameraPose,
  ClusterRenderProps,
  ConnectionPathPoint,
  GlobeControlsRenderProps,
  GlobeHandle,
  GlobeProps,
  LatLng,
  Pin,
  PinConnection,
  PinPopupPlacement,
  PinPopupRenderProps,
  ConnectionRenderProps,
  PinRenderProps,
  ScreenPoint,
} from './types';
import {
  DEFAULT_FLIGHT_MS,
  ROTATE_STEP_DEG,
  ZOOM_STEP,
  homePose,
  mergePose,
  posesMatch,
  resolveGlobeProps,
} from './defaults';
import { devWarn } from './env';
import { resolveAssets } from './assets';
import { GlobeEngine, type EngineCallbacks, type ProjectedPoint } from './core/GlobeEngine';
import { OverlayPositioner } from './core/OverlayPositioner';
import { graticuleLabels } from './core/layers/GraticuleLayer';
import {
  connectionPath,
  resolveConnection,
  type ConnectionDefaults,
  type ResolvedConnection,
} from './core/layers/connections';
import { useGlobeAssets, type AssetNeeds } from './hooks/useGlobeAssets';
import { useReducedMotion } from './hooks/useReducedMotion';
import { clusterProjectedPins, type ProjectedPin } from './utils/clustering';
import { fitBounds, latLngToVector3, vector3ToLatLng } from './utils/coordinates';
import { findCountryAt, type PreparedCountry } from './utils/geo';
import { CapitalMarker } from './components/CapitalMarker';
import { CountryLabel } from './components/CountryLabel';
import { CountryTooltip } from './components/CountryTooltip';
import { DefaultCluster } from './components/DefaultCluster';
import { DefaultConnection } from './components/DefaultConnection';
import { DefaultControls } from './components/DefaultControls';
import { DefaultPinPopup } from './components/DefaultPinPopup';
import { GlobeErrorBoundary } from './components/GlobeErrorBoundary';
import { GlobeFallback } from './components/GlobeFallback';
import { GraticuleLabel } from './components/GraticuleLabel';

/** How often overlay SETS are recomputed (20 Hz); positions are written every rendered frame. */
const OVERLAY_INTERVAL_MS = 50;
/** Screen distance within which a pointer counts as on a pin. */
const PIN_HIT_RADIUS = 18;
/** Pointer travel beyond this makes a press a drag. */
const CLICK_SLOP = 4;
/** Samples handed to a custom connection renderer. */
const CUSTOM_PATH_SAMPLES = 64;
/** Radius the popup and cluster overlays anchor at. */
const MARKER_RADIUS = 1.02;
/** A pin projecting above this line flips its popup underneath. */
const POPUP_FLIP_Y = 120;

const HIDDEN: CSSProperties = { visibility: 'hidden' };
const ANCHOR_CLASS = 'rg:absolute rg:left-0 rg:top-0 rg:will-change-transform';
const EMPTY_COUNTRIES: readonly PreparedCountry[] = Object.freeze([]);
const GRATICULE_LABELS = graticuleLabels();

type AnchorOptions = { collides?: boolean; priority?: number; alignToNormal?: boolean };
type AnchorSpec = { lat: number; lng: number; radius: number; collides: boolean; priority: number; alignToNormal: boolean };

type ClusterView<TData> = { id: string; pins: Pin<TData>[]; lat: number; lng: number; x: number; y: number };
type LoosePin<TData> = { pin: Pin<TData>; x: number; y: number };
type ResolvedLink<TData> = { connection: PinConnection; from: Pin<TData>; to: Pin<TData> };
type CustomPath<TData> = ResolvedLink<TData> & { resolved: ResolvedConnection; path: ConnectionPathPoint[] };

type OverlayState<TData> = {
  clusters: ClusterView<TData>[];
  loosePins: LoosePin<TData>[];
  paths: CustomPath<TData>[];
  progress: number;
};

const EMPTY_OVERLAY: OverlayState<never> = { clusters: [], loosePins: [], paths: [], progress: 0 };

type CoreProps<TData> = GlobeProps<TData> & { handleRef: Ref<GlobeHandle> | null };

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

const samePose = (a: Required<CameraPose>, b: Required<CameraPose>): boolean =>
  a.lat === b.lat && a.lng === b.lng && a.zoom === b.zoom && a.tilt === b.tilt;

function sphericalMean(points: readonly LatLng[]): LatLng {
  const sum = latLngToVector3(0, 0, 0);
  const scratch = latLngToVector3(0, 0);
  for (const p of points) sum.add(latLngToVector3(p.lat, p.lng, 1, scratch));
  return sum.lengthSq() < 1e-12 ? { lat: points[0].lat, lng: points[0].lng } : vector3ToLatLng(sum);
}

function GlobeCore<TData>(props: CoreProps<TData>): ReactElement {
  const p = resolveGlobeProps<TData>(props);
  const propsRef = useRef(p);
  propsRef.current = p;

  const reducedMotion = useReducedMotion();

  /* ------------------------------------------------------------- home pose */

  const dc = props.defaultCamera;
  const center = props.defaultCenter;
  const home = useMemo(
    () => homePose(dc, center),
    // Members, not identities, so an inline object does not move home each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dc?.lat, dc?.lng, dc?.zoom, dc?.tilt, center?.lat, center?.lng],
  );
  const homeRef = useRef(home);
  homeRef.current = home;

  /* ----------------------------------------------------------------- state */

  const [engineReady, setEngineReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pose, setPose] = useState<Required<CameraPose>>(() => mergePose(home, props.camera));
  const [overlay, setOverlay] = useState<OverlayState<TData>>(EMPTY_OVERLAY);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<PreparedCountry | null>(null);
  const [popupPlacement, setPopupPlacement] = useState<PinPopupPlacement>('top');
  const [popupHold, setPopupHold] = useState<string | null>(null);

  /* ------------------------------------------------------------------ refs */

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GlobeEngine | null>(null);
  const positionerRef = useRef<OverlayPositioner | null>(null);
  if (!positionerRef.current) positionerRef.current = new OverlayPositioner();
  const positioner = positionerRef.current;

  const projectedPinsRef = useRef<ProjectedPin<TData>[]>([]);
  const projectedSourceRef = useRef<readonly Pin<TData>[] | null>(null);
  const hiddenRef = useRef<Uint8Array>(new Uint8Array(0));
  const lastOverlayRef = useRef(0);
  const trailingRef = useRef(0);
  const overlaySignatureRef = useRef('');
  const pathsVersionRef = useRef(0);
  const pointerRef = useRef<ScreenPoint | null>(null);
  const pressRef = useRef<ScreenPoint | null>(null);
  const draggedRef = useRef(false);
  const hoveredPinRef = useRef<string | null>(null);
  const selectedPinRef = useRef<string | null>(null);
  const popupHoldRef = useRef<string | null>(null);
  const placementRef = useRef<PinPopupPlacement>('top');
  const hoveredCountryRef = useRef<PreparedCountry | null>(null);
  const countriesRef = useRef<readonly PreparedCountry[] | null>(null);
  const readyRef = useRef(false);
  const scratchProjection = useRef<ProjectedPoint>({ x: 0, y: 0, visible: false }).current;

  popupHoldRef.current = popupHold;

  /* ---------------------------------------------------------------- errors */

  const reportError = useCallback((error: Error) => {
    propsRef.current.onError?.(error);
    devWarn(error.message);
    setFailed(true);
  }, []);

  /* ---------------------------------------------------------------- assets */

  const a = props.assets;
  const sources = useMemo(
    () => resolveAssets(a),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a?.dayTexture, a?.normalMap, a?.specularMap, a?.cloudsTexture, a?.countriesGeoJson, a?.capitalsDataset],
  );

  const wantsCountryData =
    p.showCountryNames ||
    p.highlightCountryOnHover ||
    p.showCountryNameOnHover ||
    // Every flat style paints from the polygons.
    p.renderStyle !== 'realistic' ||
    props.onCountryHover !== undefined ||
    props.onCountryClick !== undefined;

  const needs = useMemo<AssetNeeds>(
    () => ({
      countries: wantsCountryData,
      coastline: p.showShorelines,
      borders: p.showCountryBorders,
      capitals: p.showCapitals,
      elevation: p.renderStyle !== 'realistic',
      textures: p.renderStyle === 'realistic',
    }),
    [wantsCountryData, p.showShorelines, p.showCountryBorders, p.showCapitals, p.renderStyle],
  );

  const assets = useGlobeAssets(sources, needs, reportError);
  countriesRef.current = assets.countries;

  /* ----------------------------------------------------------- connections */

  const pinIndex = useMemo(() => {
    const index = new Map<string, number>();
    p.pins.forEach((pin, i) => index.set(pin.id, i));
    return index;
  }, [p.pins]);

  const connectionDefaults = useMemo<ConnectionDefaults>(
    () => ({
      type: p.connectionType,
      archHeight: p.archHeight,
      lineStyle: p.connectionLineStyle,
      width: p.connectionWidth,
      color: p.connectionColor,
    }),
    [p.connectionType, p.archHeight, p.connectionLineStyle, p.connectionWidth, p.connectionColor],
  );

  const links = useMemo(() => {
    const resolved: ResolvedLink<TData>[] = [];
    const problems: string[] = [];
    for (const connection of p.connections) {
      const fromIndex = pinIndex.get(connection.from);
      const toIndex = pinIndex.get(connection.to);
      if (fromIndex === undefined || toIndex === undefined) {
        const missing = [fromIndex === undefined ? connection.from : null, toIndex === undefined ? connection.to : null]
          .filter((id): id is string => id !== null)
          .map((id) => `"${id}"`)
          .join(', ');
        problems.push(`[globe] connection "${connection.id}" references unknown pin id(s): ${missing}. Skipping it.`);
        continue;
      }
      resolved.push({ connection, from: p.pins[fromIndex], to: p.pins[toIndex] });
    }
    return { resolved, problems };
  }, [p.connections, p.pins, pinIndex]);

  const linksRef = useRef(links.resolved);
  linksRef.current = links.resolved;
  const defaultsRef = useRef(connectionDefaults);
  defaultsRef.current = connectionDefaults;

  /* -------------------------------------------------------------- overlays */

  const pinAt = (x: number, y: number): { pin: Pin<TData>; index: number } | null => {
    let best: { pin: Pin<TData>; index: number } | null = null;
    let bestDistance = PIN_HIT_RADIUS ** 2;
    const hidden = hiddenRef.current;
    for (const entry of projectedPinsRef.current) {
      if (!entry.visible || hidden[entry.index]) continue;
      const d = (entry.x - x) ** 2 + (entry.y - y) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = { pin: entry.pin, index: entry.index };
      }
    }
    return best;
  };

  /** Geometric, never colour picking: raycast to the sphere, then point-in-polygon. */
  const countryAt = (engine: GlobeEngine, x: number, y: number): PreparedCountry | null => {
    const countries = countriesRef.current;
    if (!countries) return null;
    const point = engine.screenToLatLng(x, y);
    return point ? findCountryAt(countries, point.lat, point.lng) : null;
  };

  const recomputeOverlays = (engine: GlobeEngine): void => {
    const current = propsRef.current;
    const pins = current.pins;
    const cameraPose = engine.getPose();

    // 1. Project every pin once; everything below reads these numbers.
    if (projectedSourceRef.current !== pins) {
      projectedSourceRef.current = pins;
      projectedPinsRef.current = pins.map((pin, index) => ({ pin, index, x: 0, y: 0, visible: false }));
    }
    const projected = projectedPinsRef.current;
    for (const entry of projected) {
      engine.projectInto(entry.pin.lat, entry.pin.lng, 1, scratchProjection);
      entry.x = scratchProjection.x;
      entry.y = scratchProjection.y;
      entry.visible = scratchProjection.visible;
    }

    // 2-3. Cluster while the camera is farther than the threshold.
    if (hiddenRef.current.length !== pins.length) hiddenRef.current = new Uint8Array(pins.length);
    const hidden = hiddenRef.current;
    hidden.fill(0);
    const clusters: ClusterView<TData>[] = [];
    if (current.enablePinClustering && cameraPose.zoom > current.clusterZoomThreshold) {
      for (const cluster of clusterProjectedPins(projected, current.clusterRadiusPx)) {
        if (cluster.pins.length < 2) continue;
        for (const i of cluster.indices) hidden[i] = 1;
        const centre = sphericalMean(cluster.pins);
        clusters.push({ id: cluster.id, pins: cluster.pins, lat: centre.lat, lng: centre.lng, x: cluster.x, y: cluster.y });
      }
    }
    if (engine.pins.setHiddenIndices(hidden)) engine.invalidate();

    // 4. DOM pins only exist for an override; the built-in marker is instanced geometry.
    const loosePins: LoosePin<TData>[] = current.pinComponent
      ? projected.filter((e) => e.visible && !hidden[e.index]).map((e) => ({ pin: e.pin, x: e.x, y: e.y }))
      : [];

    // 5. A custom connection renderer receives projected, occlusion-tested paths.
    let paths: CustomPath<TData>[] = [];
    let progress = 0;
    if (current.enableConnections && current.connectionComponent) {
      progress = engine.connections.progress;
      paths = linksRef.current.map((link) => {
        const resolved = resolveConnection(link.connection, defaultsRef.current);
        const points = connectionPath({ from: link.from, to: link.to }, resolved.type, resolved.archHeight, CUSTOM_PATH_SAMPLES);
        const path = points.map((v) => {
          engine.projectVectorInto(v, scratchProjection);
          return { x: scratchProjection.x, y: scratchProjection.y, visible: scratchProjection.visible };
        });
        return { ...link, resolved, path };
      });
    }

    // The popup flips underneath when its pin is near the top of the canvas.
    const popupId = hoveredPinRef.current ?? popupHoldRef.current;
    if (popupId !== null) {
      const index = pinIndexRef.current.get(popupId);
      const entry = index === undefined ? undefined : projected[index];
      const placement: PinPopupPlacement = entry && entry.y < POPUP_FLIP_Y ? 'bottom' : 'top';
      if (placement !== placementRef.current) {
        placementRef.current = placement;
        setPopupPlacement(placement);
      }
    }

    // 6. Only set state when the set actually changed.
    const signature =
      clusters.map((c) => c.id).join(',') +
      '|' +
      loosePins.map((l) => l.pin.id).join(',') +
      (paths.length > 0
        ? `|${pathsVersionRef.current}:${cameraPose.lat},${cameraPose.lng},${cameraPose.zoom},${cameraPose.tilt}:${progress.toFixed(4)}:${engine.element.width}x${engine.element.height}`
        : '');
    if (signature !== overlaySignatureRef.current) {
      overlaySignatureRef.current = signature;
      setOverlay({ clusters, loosePins, paths, progress });
    }
  };

  const pinIndexRef = useRef(pinIndex);
  pinIndexRef.current = pinIndex;

  /* ------------------------------------------------------ engine callbacks */

  const handlers = {
    onCameraChange(next: Required<CameraPose>): void {
      setPose((prev) => (samePose(prev, next) ? prev : next));
      propsRef.current.onCameraChange?.(next);
    },

    onFrame(): void {
      const engine = engineRef.current;
      if (!engine) return;
      positioner.update(engine);

      const now = performance.now();
      const since = now - lastOverlayRef.current;
      if (since >= OVERLAY_INTERVAL_MS) {
        lastOverlayRef.current = now;
        if (trailingRef.current) {
          clearTimeout(trailingRef.current);
          trailingRef.current = 0;
        }
        recomputeOverlays(engine);
      } else if (!trailingRef.current) {
        // The last frame of a movement must not leave the sets stale.
        trailingRef.current = window.setTimeout(() => {
          trailingRef.current = 0;
          const live = engineRef.current;
          if (!live) return;
          lastOverlayRef.current = performance.now();
          recomputeOverlays(live);
        }, OVERLAY_INTERVAL_MS - since);
      }
    },

    onPointerDown(local: ScreenPoint): void {
      pressRef.current = local;
      draggedRef.current = false;
    },

    onPointerMove(local: ScreenPoint, event: PointerEvent): void {
      const engine = engineRef.current;
      if (!engine) return;
      const current = propsRef.current;
      pointerRef.current = local;

      if (event.buttons !== 0) {
        const press = pressRef.current;
        if (press && Math.hypot(local.x - press.x, local.y - press.y) > CLICK_SLOP) draggedRef.current = true;
        if (draggedRef.current) return;
      }

      const hit = pinAt(local.x, local.y);
      const pinId = hit?.pin.id ?? null;
      if (pinId !== hoveredPinRef.current) {
        hoveredPinRef.current = pinId;
        setHoveredPinId(pinId);
        engine.pins.setHovered(hit?.index ?? -1);
        engine.element.style.cursor = hit ? 'pointer' : '';
        engine.invalidate();
        current.onPinHover?.(hit?.pin ?? null, event);
      }

      // No raycast and no polygon walk when nobody is listening.
      const wantsCountry =
        current.highlightCountryOnHover || current.showCountryNameOnHover || current.onCountryHover !== undefined;
      if (!wantsCountry) return;

      // A pin under the cursor owns the hover; the country beneath it does not.
      const country = hit ? null : countryAt(engine, local.x, local.y);
      if (country !== hoveredCountryRef.current) {
        hoveredCountryRef.current = country;
        setHoveredCountry(country);
        if (current.highlightCountryOnHover) {
          engine.highlight.show(country);
          engine.invalidate();
        }
        current.onCountryHover?.(country?.feature ?? null);
      }
      placeTooltip();
    },

    onPointerLeave(event: PointerEvent): void {
      const engine = engineRef.current;
      const current = propsRef.current;
      pointerRef.current = null;
      if (hoveredPinRef.current !== null) {
        hoveredPinRef.current = null;
        setHoveredPinId(null);
        engine?.pins.setHovered(-1);
        if (engine) engine.element.style.cursor = '';
        current.onPinHover?.(null, event);
      }
      if (hoveredCountryRef.current !== null) {
        hoveredCountryRef.current = null;
        setHoveredCountry(null);
        engine?.highlight.show(null);
        current.onCountryHover?.(null);
      }
      engine?.invalidate();
    },

    onPointerUp(local: ScreenPoint, event: PointerEvent): void {
      const engine = engineRef.current;
      if (!engine || draggedRef.current || event.button !== 0) return;
      const current = propsRef.current;
      const hit = pinAt(local.x, local.y);
      if (hit) {
        const next = selectedPinRef.current === hit.pin.id ? null : hit.pin.id;
        selectedPinRef.current = next;
        setSelectedPinId(next);
        engine.pins.setSelected(next === null ? -1 : hit.index);
        engine.invalidate();
        current.onPinClick?.(hit.pin, event);
        return;
      }
      if (selectedPinRef.current !== null) {
        selectedPinRef.current = null;
        setSelectedPinId(null);
        engine.pins.setSelected(-1);
        engine.invalidate();
      }
      if (current.onCountryClick) {
        const country = countryAt(engine, local.x, local.y);
        if (country) current.onCountryClick(country.feature);
      }
    },
  };

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  /** Clamped so the tooltip cannot spill out of the canvas at an edge. */
  const placeTooltip = (): void => {
    const tip = tooltipRef.current;
    const pointer = pointerRef.current;
    const container = containerRef.current;
    if (!tip || !pointer || !container) return;
    const x = clamp(pointer.x + 14, 8, container.clientWidth - 8);
    const y = clamp(pointer.y + 16, 8, container.clientHeight - 8);
    tip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    tip.style.visibility = 'visible';
  };

  const tooltipElementRef = useCallback((element: HTMLDivElement | null) => {
    tooltipRef.current = element;
    if (element) placeTooltip();
    // placeTooltip reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------------------- lifecycle */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const callbacks: EngineCallbacks = {
      onCameraChange: (next) => handlersRef.current.onCameraChange(next),
      onFrame: () => handlersRef.current.onFrame(),
      onPointerMove: (local, event) => handlersRef.current.onPointerMove(local, event),
      onPointerLeave: (event) => handlersRef.current.onPointerLeave(event),
      onPointerDown: (local) => handlersRef.current.onPointerDown(local),
      onPointerUp: (local, event) => handlersRef.current.onPointerUp(local, event),
      onError: (error) => reportError(error),
    };

    let engine: GlobeEngine;
    try {
      engine = new GlobeEngine(container, callbacks);
    } catch (error) {
      reportError(error instanceof Error ? error : new Error('[globe] WebGL is unavailable'));
      return;
    }
    engineRef.current = engine;
    const controlled = propsRef.current.camera;
    engine.setCamera(controlled ? mergePose(homeRef.current, controlled) : homeRef.current, { animate: false });
    setEngineReady(true);

    return () => {
      engineRef.current = null;
      setEngineReady(false);
      if (trailingRef.current) clearTimeout(trailingRef.current);
      trailingRef.current = 0;
      overlaySignatureRef.current = '';
      projectedSourceRef.current = null;
      hoveredPinRef.current = null;
      hoveredCountryRef.current = null;
      positioner.clear();
      engine.dispose();
    };
    // Once per mount, deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A lost context or a dataset that would not load retires the engine.
  useEffect(() => {
    if (!failed) return;
    const engine = engineRef.current;
    engineRef.current = null;
    engine?.dispose();
  }, [failed]);

  // Every commit may have mounted overlay elements that need positioning.
  useEffect(() => {
    engineRef.current?.invalidate();
  });

  /* ---------------------------------------------------------------- handle */

  const handle = useMemo<GlobeHandle>(
    () => ({
      setCamera: (target, opts) => engineRef.current?.setCamera(target, opts),
      reset: (opts) =>
        engineRef.current?.setCamera(homeRef.current, {
          animate: opts?.animate ?? true,
          durationMs: opts?.durationMs ?? DEFAULT_FLIGHT_MS,
        }),
      flyTo: (target, opts) => engineRef.current?.flyTo(target, opts),
      zoomIn: (step = ZOOM_STEP) => engineRef.current?.nudgeZoom(1 - step),
      zoomOut: (step = ZOOM_STEP) => engineRef.current?.nudgeZoom(1 + step),
      startAutoRotate: (speed) => engineRef.current?.startAutoRotate(speed),
      stopAutoRotate: () => engineRef.current?.stopAutoRotate(),
      getCamera: () => engineRef.current?.getPose() ?? { ...homeRef.current },
      latLngToScreen: (point) => engineRef.current?.latLngToScreen(point) ?? null,
      screenToLatLng: (x, y) => engineRef.current?.screenToLatLng(x, y) ?? null,
    }),
    [],
  );

  useImperativeHandle(props.handleRef, () => handle, [handle]);

  useEffect(() => {
    if (!engineReady || readyRef.current) return;
    readyRef.current = true;
    propsRef.current.onReady?.(handle);
  }, [engineReady, handle]);

  /* ------------------------------------------------------ dev-time warnings */

  const bothCameras = props.camera !== undefined && props.defaultCamera !== undefined;
  useEffect(() => {
    if (bothCameras) {
      devWarn('[globe] `camera` and `defaultCamera` were both passed; `camera` wins and `defaultCamera` is ignored.');
    }
  }, [bothCameras]);

  useEffect(() => {
    if (p.showCountryNames && p.showCountryNameOnHover) {
      devWarn('[globe] `showCountryNameOnHover` is ignored while `showCountryNames` is true.');
    }
  }, [p.showCountryNames, p.showCountryNameOnHover]);

  useEffect(() => {
    if (!p.enableConnections) return;
    for (const problem of links.problems) devWarn(problem);
  }, [links.problems, p.enableConnections]);

  /* ------------------------------------------------------- prop sync effects */

  const grayscale = p.colorScheme === 'grayscale';

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setClamps(p.minZoom, p.maxZoom);
    engine.invalidate();
  }, [engineReady, p.minZoom, p.maxZoom]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setControlSettings({ enableZoom: p.enableZoom, enableRotation: p.enableRotation, enableTilt: p.enableTilt });
    engine.invalidate();
  }, [engineReady, p.enableZoom, p.enableRotation, p.enableTilt]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setBackground(p.backgroundColor);
    engine.invalidate();
  }, [engineReady, p.backgroundColor]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setReducedMotion(reducedMotion);
    engine.invalidate();
  }, [engineReady, reducedMotion]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.surface.own(assets.day, assets.normal, assets.specular, assets.clouds);
    engine.surface.setStyle(
      { renderStyle: p.renderStyle, grayscale, showClouds: p.showClouds },
      {
        day: assets.day,
        normal: assets.normal,
        specular: assets.specular,
        clouds: assets.clouds,
        elevation: assets.elevation,
        cover: assets.cover,
      },
      assets.countries ?? EMPTY_COUNTRIES,
    );
    engine.invalidate();
  }, [
    engineReady,
    p.renderStyle,
    grayscale,
    p.showClouds,
    assets.day,
    assets.normal,
    assets.specular,
    assets.clouds,
    assets.elevation,
    assets.cover,
    assets.countries,
  ]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.vectors.setShorelines(assets.coastline);
    engine.invalidate();
  }, [engineReady, assets.coastline]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.vectors.setBorders(assets.borders);
    engine.invalidate();
  }, [engineReady, assets.borders]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.vectors.setVisibility(p.showShorelines, p.showCountryBorders);
    engine.invalidate();
  }, [engineReady, p.showShorelines, p.showCountryBorders, assets.coastline, assets.borders]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.vectors.setStyle(p.renderStyle, grayscale);
    engine.invalidate();
  }, [engineReady, p.renderStyle, grayscale, assets.coastline, assets.borders]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.graticule.setVisible(p.showGraticule);
    engine.graticule.setStyle(p.renderStyle, grayscale);
    engine.invalidate();
  }, [engineReady, p.showGraticule, p.renderStyle, grayscale]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.highlight.setColor(p.countryHighlightColor);
    engine.invalidate();
  }, [engineReady, p.countryHighlightColor]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.highlight.show(p.highlightCountryOnHover ? hoveredCountryRef.current : null);
    engine.invalidate();
  }, [engineReady, p.highlightCountryOnHover]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.pins.setPins(p.pins);
    engine.pins.setVisible(p.pinComponent === undefined);
    engine.pins.setZoom(engine.getPose().zoom);
    hiddenRef.current = new Uint8Array(p.pins.length);
    hoveredPinRef.current = null;
    selectedPinRef.current = null;
    setHoveredPinId(null);
    setSelectedPinId(null);
    // Recompute the overlay sets on the next frame rather than up to 50 ms later.
    lastOverlayRef.current = 0;
    engine.invalidate();
  }, [engineReady, p.pins, p.pinComponent]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    // The built-in renderer draws in WebGL; an override draws its own SVG.
    const custom = p.connectionComponent !== undefined;
    const drawn =
      p.enableConnections && !custom
        ? links.resolved.map((link) => ({ connection: link.connection, ends: { from: link.from, to: link.to } }))
        : [];
    engine.connections.setConnections(drawn, connectionDefaults);
    engine.connections.setVisible(p.enableConnections);
    engine.connections.setCustomAnimated(
      p.enableConnections && custom && links.resolved.some((link) => link.connection.animated === true),
    );
    pathsVersionRef.current += 1;
    lastOverlayRef.current = 0;
    engine.invalidate();
  }, [engineReady, links, p.enableConnections, p.connectionComponent, connectionDefaults]);

  const controlled = props.camera;
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !controlled) return;
    engine.setCamera(controlled, { animate: true });
    // Both a member change and an identity change animate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady, controlled?.lat, controlled?.lng, controlled?.zoom, controlled?.tilt, controlled]);

  /* ---------------------------------------------------------- overlay anchors */

  const specsRef = useRef(new Map<string, AnchorSpec>());
  const refCallbacks = useRef(new Map<string, (element: HTMLElement | null) => void>());

  /**
   * A stable ref callback per key that registers the element with the positioner.
   * Calling it again with new coordinates updates the live anchor in place.
   */
  const anchorRef = useCallback(
    (key: string, lat: number, lng: number, radius: number, options: AnchorOptions = {}) => {
      const spec: AnchorSpec = {
        lat,
        lng,
        radius,
        collides: options.collides ?? false,
        priority: options.priority ?? 0,
        alignToNormal: options.alignToNormal ?? false,
      };
      specsRef.current.set(key, spec);
      const live = positioner.get(key);
      if (live) {
        if (live.priority !== spec.priority || live.collides !== spec.collides) positioner.markDirty();
        Object.assign(live, spec);
      }
      let callback = refCallbacks.current.get(key);
      if (!callback) {
        callback = (element: HTMLElement | null) => {
          if (element) {
            const latest = specsRef.current.get(key) ?? spec;
            positioner.register(key, { element, ...latest });
          } else {
            positioner.unregister(key);
            refCallbacks.current.delete(key);
            specsRef.current.delete(key);
          }
        };
        refCallbacks.current.set(key, callback);
      }
      return callback;
    },
    [positioner],
  );

  /* ---------------------------------------------------------------- render */

  const countries = assets.countries;
  const gridLabelsActive = p.showGraticule && p.showGraticuleLabels;
  const labelsActive =
    p.showCountryNames && countries !== null && (p.countryNamesMinZoom <= 0 || pose.zoom <= p.countryNamesMinZoom);
  const capitalsActive = p.showCapitals && assets.capitals !== null && pose.zoom <= p.capitalsMinZoom;
  const markerScale = Math.min(1.6, Math.max(0.55, pose.zoom / 2.6));

  const gridLabels = useMemo(
    () =>
      gridLabelsActive
        ? GRATICULE_LABELS.map((label) => (
            <div
              key={`grid:${label.key}`}
              ref={anchorRef(`grid:${label.key}`, label.lat, label.lng, 1.004, { collides: true, priority: 900 })}
              className={ANCHOR_CLASS}
              style={HIDDEN}
            >
              <GraticuleLabel text={label.text} />
            </div>
          ))
        : null,
    [gridLabelsActive, anchorRef],
  );

  const countryLabels = useMemo(
    () =>
      labelsActive && countries
        ? countries.map((country) => (
            <div
              key={`country:${country.id}`}
              ref={anchorRef(`country:${country.id}`, country.labelPoint.lat, country.labelPoint.lng, 1.01, {
                collides: true,
                priority: country.labelPriority,
              })}
              className={ANCHOR_CLASS}
              style={HIDDEN}
            >
              <CountryLabel name={country.name} />
            </div>
          ))
        : null,
    [labelsActive, countries, anchorRef],
  );

  const capitals = assets.capitals;
  const capitalMarkers = useMemo(
    () =>
      capitalsActive && capitals
        ? capitals.map((capital) => (
            <div
              key={`capital:${capital.id}`}
              ref={anchorRef(`capital:${capital.id}`, capital.lat, capital.lng, 1.008, {
                collides: true,
                priority: 100 + capital.labelPriority,
              })}
              className={ANCHOR_CLASS}
              style={HIDDEN}
            >
              <CapitalMarker name={capital.name} />
            </div>
          ))
        : null,
    [capitalsActive, capitals, anchorRef],
  );

  const PinComponent = p.pinComponent as ComponentType<PinRenderProps<TData>> | undefined;
  const ClusterComponent = (p.clusterComponent ?? DefaultCluster) as ComponentType<ClusterRenderProps<TData>>;
  const PopupComponent = (p.pinPopupComponent ?? DefaultPinPopup) as ComponentType<PinPopupRenderProps<TData>>;
  const ConnectionComponent = p.connectionComponent as ComponentType<ConnectionRenderProps<TData>> | undefined;
  const Controls = (p.controlsComponent ?? DefaultControls) as ComponentType<GlobeControlsRenderProps>;

  const onClusterClick = (cluster: ClusterView<TData>): void => {
    const current = propsRef.current;
    if (current.onClusterClick) {
      current.onClusterClick(cluster.pins);
      return;
    }
    engineRef.current?.setCamera(fitBounds(cluster.pins, current.minZoom, current.maxZoom), { animate: true });
  };

  const popupPinId = p.showPinPopup ? (hoveredPinId ?? popupHold) : null;
  const popupIndex = popupPinId === null ? undefined : pinIndex.get(popupPinId);
  const popupPin = popupIndex === undefined ? null : p.pins[popupIndex];
  const popupEntry = popupIndex === undefined ? undefined : projectedPinsRef.current[popupIndex];
  const closePopup = (): void => {
    setPopupHold(null);
    hoveredPinRef.current = null;
    setHoveredPinId(null);
    engineRef.current?.pins.setHovered(-1);
    engineRef.current?.invalidate();
  };

  const controlsProps: GlobeControlsRenderProps = {
    rotateLeft: () => engineRef.current?.rotateBy(ROTATE_STEP_DEG),
    rotateRight: () => engineRef.current?.rotateBy(-ROTATE_STEP_DEG),
    zoomIn: () => handle.zoomIn(),
    zoomOut: () => handle.zoomOut(),
    reset: () => handle.reset(),
    canZoomIn: pose.zoom > p.minZoom + 1e-3,
    canZoomOut: pose.zoom < p.maxZoom - 1e-3,
    canReset: !posesMatch(pose, home),
    camera: pose,
  };

  const showTooltip = p.showCountryNameOnHover && !p.showCountryNames && hoveredCountry !== null;

  if (failed) {
    return (
      <div className={`rg:relative ${p.className ?? ''}`} style={{ width: p.width, height: p.height }}>
        <GlobeFallback />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-globe-root="true"
      className={`rg:relative rg:isolate rg:overflow-hidden ${p.className ?? ''}`}
      style={{
        width: p.width,
        height: p.height,
        background: p.backgroundColor === 'transparent' ? undefined : p.backgroundColor,
      }}
    >
      {/* The canvas is appended here by the engine. */}
      <div className="rg:pointer-events-none rg:absolute rg:inset-0 rg:isolate">
        {ConnectionComponent && overlay.paths.length > 0 && (
          <svg className="rg:absolute rg:inset-0 rg:h-full rg:w-full rg:overflow-visible" aria-hidden="true">
            {overlay.paths.map((entry) => (
              <ConnectionComponent
                key={entry.connection.id}
                connection={entry.connection}
                from={entry.from}
                to={entry.to}
                path={entry.path}
                progress={overlay.progress}
                type={entry.resolved.type}
                lineStyle={entry.resolved.lineStyle}
                width={entry.resolved.width}
                color={entry.resolved.color}
              />
            ))}
          </svg>
        )}

        {gridLabels}
        {countryLabels}
        {capitalMarkers}

        {PinComponent &&
          overlay.loosePins.map(({ pin, x, y }) => (
            <div
              key={`pin:${pin.id}`}
              ref={anchorRef(`pin:${pin.id}`, pin.lat, pin.lng, 1.001, { alignToNormal: true })}
              className={ANCHOR_CLASS}
              style={HIDDEN}
            >
              <PinComponent
                pin={pin}
                position={{ x, y }}
                hovered={hoveredPinId === pin.id}
                selected={selectedPinId === pin.id}
                occluded={false}
                scale={markerScale}
              />
            </div>
          ))}

        {overlay.clusters.map((cluster) => (
          <div
            key={`cluster:${cluster.id}`}
            ref={anchorRef(`cluster:${cluster.id}`, cluster.lat, cluster.lng, MARKER_RADIUS)}
            className={ANCHOR_CLASS}
            style={HIDDEN}
            onPointerEnter={() => setHoveredClusterId(cluster.id)}
            onPointerLeave={() => setHoveredClusterId((id) => (id === cluster.id ? null : id))}
          >
            <ClusterComponent
              pins={cluster.pins}
              count={cluster.pins.length}
              position={{ x: cluster.x, y: cluster.y }}
              hovered={hoveredClusterId === cluster.id}
              scale={markerScale}
              onClick={() => onClusterClick(cluster)}
            />
          </div>
        ))}

        {popupPin && (
          <div
            key={`popup:${popupPin.id}`}
            ref={anchorRef(`popup:${popupPin.id}`, popupPin.lat, popupPin.lng, MARKER_RADIUS)}
            className={ANCHOR_CLASS}
            style={HIDDEN}
            onPointerEnter={() => setPopupHold(popupPin.id)}
            onPointerLeave={() => setPopupHold(null)}
          >
            <div
              className={
                popupPlacement === 'bottom'
                  ? 'rg:translate-y-2 rg:-translate-x-1/2'
                  : 'rg:-translate-y-[calc(100%+0.5rem)] rg:-translate-x-1/2'
              }
            >
              <PopupComponent
                pin={popupPin}
                position={{ x: popupEntry?.x ?? 0, y: popupEntry?.y ?? 0 }}
                placement={popupPlacement}
                close={closePopup}
              />
            </div>
          </div>
        )}

        {showTooltip && <CountryTooltip name={hoveredCountry.name} elementRef={tooltipElementRef} />}

        {p.showControls && <Controls {...controlsProps} />}
      </div>
      <span className="rg:sr-only" role="status" aria-live="polite">
        {hoveredCountry?.name ?? ''}
      </span>
    </div>
  );
}

type GlobeComponent = <TData = Record<string, unknown>>(
  props: GlobeProps<TData> & { ref?: Ref<GlobeHandle> },
) => ReactElement;

/**
 * An interactive 3D Earth. Everything is a prop; `<Globe />` with none renders a
 * physical-map Earth with shorelines and borders. The container must have a size.
 */
export const Globe = (<TData,>({ ref, ...props }: GlobeProps<TData> & { ref?: Ref<GlobeHandle> }) => (
  <GlobeErrorBoundary onError={props.onError}>
    <GlobeCore<TData> {...props} handleRef={ref ?? null} />
  </GlobeErrorBoundary>
)) as GlobeComponent;
