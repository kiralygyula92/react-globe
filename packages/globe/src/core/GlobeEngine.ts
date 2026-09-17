/**
 * The three.js half of the globe: renderer, scene, camera model, layers and the
 * frame loop. Constructed once per mount with the container and a callbacks object.
 *
 * The loop runs every frame to advance input damping and animation, but
 * `renderer.render` — and the overlay pass behind `onFrame` — is skipped entirely
 * when nothing has changed. A globe nobody is touching costs nothing.
 */

import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { CameraPose, LatLng, ScreenPoint } from '../types';
import {
  AUTO_ROTATE_SPEED,
  DEFAULT_CAMERA,
  DEFAULT_FLIGHT_MS,
  GLOBE_DEFAULTS,
  clampPose,
  mergePose,
} from '../defaults';
import { DEG, latLngToVector3, vector3ToLatLng, wrapLng } from '../utils/coordinates';
import { PointerControls, type ControlHost, type ControlSettings } from './controls/PointerControls';
import { ConnectionLayer } from './layers/ConnectionLayer';
import { GraticuleLayer } from './layers/GraticuleLayer';
import { HighlightLayer } from './layers/HighlightLayer';
import { PinLayer } from './layers/PinLayer';
import { SurfaceLayer } from './layers/SurfaceLayer';
import { VectorLayer } from './layers/VectorLayer';

/**
 * Degrees, across the container's shorter side. A camera d radii out needs a half-angle
 * of at least asin(1/d) to see the whole planet; 50 degrees does it from 2.4 radii
 * without visible fisheye.
 */
const FOV = 50;
const NEAR = 0.01;
const FAR = 100;
/** Slightly inside the surface, so grazing points stay visible. */
const OCCLUSION_RADIUS = 0.9985;
const ROTATE_FLIGHT_MS = 320;
/**
 * How long to wait for a lost context before giving up on it. A GPU reset, a driver
 * update or a tab the system pushed out of memory usually restores within a moment,
 * and a globe that comes back on its own beats one that turns into an error message.
 */
const CONTEXT_RESTORE_GRACE_MS = 3000;

export type EngineCallbacks = {
  onCameraChange(pose: Required<CameraPose>): void;
  /** Called only on frames that actually render. */
  onFrame(): void;
  onPointerMove(local: ScreenPoint, event: PointerEvent): void;
  onPointerLeave(event: PointerEvent): void;
  onPointerDown(local: ScreenPoint, event: PointerEvent): void;
  onPointerUp(local: ScreenPoint, event: PointerEvent): void;
  onError(error: Error): void;
};

export type ProjectedPoint = { x: number; y: number; visible: boolean };

type Flight = {
  from: Required<CameraPose>;
  to: Required<CameraPose>;
  /** Shortest-path longitude change, so a flight never takes the long way round. */
  deltaLng: number;
  elapsed: number;
  duration: number;
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class GlobeEngine {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly surface: SurfaceLayer;
  readonly graticule = new GraticuleLayer();
  readonly vectors = new VectorLayer();
  readonly highlight = new HighlightLayer();
  readonly connections = new ConnectionLayer();
  readonly pins = new PinLayer();

  private readonly root = new Group();
  private readonly sun = new DirectionalLight(new Color('rgb(255, 248, 236)'), 2.4);
  private readonly ambient = new AmbientLight(new Color('rgb(150, 172, 205)'), 1.15);
  private readonly controls: PointerControls;
  private readonly canvas: HTMLCanvasElement;

  private pose: Required<CameraPose> = { ...DEFAULT_CAMERA };
  private zoomTarget = DEFAULT_CAMERA.zoom;
  private minZoom: number = GLOBE_DEFAULTS.minZoom;
  private maxZoom: number = GLOBE_DEFAULTS.maxZoom;
  private flight: Flight | null = null;
  private autoRotateSpeed = 0;
  private reducedMotion = false;

  private needsRender = true;
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private onScreen = true;
  private pageVisible = true;
  private contextLost = false;
  private contextTimer = 0;
  private disposed = false;
  private width = 1;
  private height = 1;
  private sized = false;

  private readonly resizeObserver: ResizeObserver | null = null;
  private readonly intersectionObserver: IntersectionObserver | null = null;

  private readonly scratchA = new Vector3();
  private readonly scratchB = new Vector3();
  private readonly scratchC = new Vector3();
  private readonly scratchWorld = new Vector3();
  private readonly scratchProjection: ProjectedPoint = { x: 0, y: 0, visible: false };
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly unitSphere = new Sphere(new Vector3(), 1);

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: EngineCallbacks,
  ) {
    // Throws where WebGL is unavailable; the component catches it.
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.canvas = this.renderer.domElement;
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.touchAction = 'none';
    container.appendChild(this.canvas);

    this.camera = new PerspectiveCamera(FOV, 1, NEAR, FAR);
    this.surface = new SurfaceLayer(this.renderer.capabilities.getMaxAnisotropy());

    this.root.add(
      this.surface.group,
      this.graticule.group,
      this.vectors.group,
      this.highlight.mesh,
      this.connections.group,
      this.pins.group,
    );
    this.scene.add(this.root, this.ambient, this.sun);

    this.controls = new PointerControls(this.canvas, this.createControlHost(), {
      enableZoom: GLOBE_DEFAULTS.enableZoom,
      enableRotation: GLOBE_DEFAULTS.enableRotation,
      enableTilt: GLOBE_DEFAULTS.enableTilt,
    });

    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.pageVisible = document.visibilityState !== 'hidden';

    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(container);
    }
    if (typeof IntersectionObserver === 'function') {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const last = entries[entries.length - 1];
          if (!last) return;
          this.onScreen = last.isIntersecting;
          this.syncRunning();
        },
        { threshold: 0 },
      );
      this.intersectionObserver.observe(container);
    }

    this.resize();
    this.applyPoseToCamera();
    this.syncRunning();
  }

  get element(): HTMLCanvasElement {
    return this.canvas;
  }

  /* ------------------------------------------------------------------ camera */

  getPose(): Required<CameraPose> {
    return { ...this.pose };
  }

  /** The public way for any layer mutation to ask for a redraw. */
  invalidate(): void {
    this.needsRender = true;
  }

  setCamera(pose: CameraPose, opts?: { animate?: boolean; durationMs?: number }): void {
    const target = clampPose(mergePose(this.pose, pose), this.minZoom, this.maxZoom);
    this.controls.cancelInertia();
    this.zoomTarget = target.zoom;
    if (opts?.animate !== false && !this.reducedMotion) {
      this.flight = {
        from: { ...this.pose },
        to: target,
        deltaLng: wrapLng(target.lng - this.pose.lng),
        elapsed: 0,
        duration: Math.max(1, opts?.durationMs ?? DEFAULT_FLIGHT_MS),
      };
      this.needsRender = true;
    } else {
      this.flight = null;
      this.setPoseInternal(target);
    }
  }

  flyTo(target: LatLng, opts?: { zoom?: number; durationMs?: number }): void {
    this.setCamera(
      { lat: target.lat, lng: target.lng, zoom: opts?.zoom ?? this.pose.zoom },
      { animate: true, durationMs: opts?.durationMs },
    );
  }

  nudgeZoom(factor: number): void {
    this.flight = null;
    this.zoomTarget = clamp(this.zoomTarget * factor, this.minZoom, this.maxZoom);
    this.needsRender = true;
  }

  rotateBy(degrees: number): void {
    this.setCamera({ lng: this.pose.lng + degrees }, { animate: true, durationMs: ROTATE_FLIGHT_MS });
  }

  startAutoRotate(speed = 1): void {
    this.autoRotateSpeed = speed;
  }

  stopAutoRotate(): void {
    this.autoRotateSpeed = 0;
  }

  setClamps(minZoom: number, maxZoom: number): void {
    this.minZoom = Math.min(minZoom, maxZoom);
    this.maxZoom = Math.max(minZoom, maxZoom);
    this.setPoseInternal(this.pose);
    this.zoomTarget = clamp(this.zoomTarget, this.minZoom, this.maxZoom);
  }

  setControlSettings(settings: ControlSettings): void {
    this.controls.setSettings(settings);
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /**
   * three's colour parser does not understand `var(--x)`; it warns and paints
   * white. So a token is resolved against the container first — the only place
   * the module touches a design token, and it arrives through the DOM.
   */
  setBackground(color: string): void {
    this.needsRender = true;
    const resolved = this.resolveColor(color);
    if (resolved === 'transparent') {
      this.renderer.setClearColor(0x000000, 0);
      this.scene.background = null;
    } else {
      const parsed = new Color(resolved);
      this.renderer.setClearColor(parsed, 1);
      this.scene.background = parsed;
    }
  }

  /* ------------------------------------------------------------- projection */

  projectInto(lat: number, lng: number, radius: number, out: ProjectedPoint): ProjectedPoint {
    return this.projectVectorInto(latLngToVector3(lat, lng, radius, this.scratchWorld), out);
  }

  projectVectorInto(world: Vector3, out: ProjectedPoint): ProjectedPoint {
    const occluded = this.isOccluded(world);
    const projected = this.scratchB.copy(world).project(this.camera);
    out.x = (projected.x * 0.5 + 0.5) * this.width;
    out.y = (-projected.y * 0.5 + 0.5) * this.height;
    out.visible = !occluded && projected.z < 1;
    return out;
  }

  /** Null when the globe hides the point. */
  latLngToScreen(point: LatLng): ScreenPoint | null {
    const p = this.projectInto(point.lat, point.lng, 1, this.scratchProjection);
    return p.visible ? { x: p.x, y: p.y } : null;
  }

  /** Null when the ray misses the globe. */
  screenToLatLng(x: number, y: number): LatLng | null {
    this.ndc.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.ray.intersectSphere(this.unitSphere, this.scratchC);
    return hit ? vector3ToLatLng(hit) : null;
  }

  /* ---------------------------------------------------------------- teardown */

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.rafId);

    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    clearTimeout(this.contextTimer);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.controls.dispose();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();

    this.surface.dispose();
    this.graticule.dispose();
    this.vectors.dispose();
    this.highlight.dispose();
    this.connections.dispose();
    this.pins.dispose();
    this.scene.clear();
    this.root.clear();

    this.renderer.dispose();
    // Without this the browser keeps the context until GC, and a handful of route
    // changes is enough to hit the per-page context limit.
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  /* --------------------------------------------------------------- internals */

  private createControlHost(): ControlHost {
    return {
      getPose: () => this.getPose(),
      applyPose: (pose) => this.setPoseInternal(pose),
      swingPose: (from, to) => this.swingPose(from, to),
      getZoomTarget: () => this.zoomTarget,
      setZoomTarget: (zoom) => {
        this.zoomTarget = clamp(zoom, this.minZoom, this.maxZoom);
        this.needsRender = true;
      },
      getSize: () => ({ width: this.width, height: this.height }),
      latLngToScreen: (point) => this.latLngToScreen(point),
      screenToLatLng: (x, y) => this.screenToLatLng(x, y),
      isFlying: () => this.flight !== null,
      onInteractionStart: () => {
        this.flight = null;
      },
    };
  }

  private setPoseInternal(pose: Required<CameraPose>): void {
    const clamped = clampPose(pose, this.minZoom, this.maxZoom);
    const changed =
      clamped.lat !== this.pose.lat ||
      clamped.lng !== this.pose.lng ||
      clamped.zoom !== this.pose.zoom ||
      clamped.tilt !== this.pose.tilt;
    this.pose = clamped;
    if (changed) {
      this.needsRender = true;
      this.applyPoseToCamera();
      this.callbacks.onCameraChange(this.getPose());
    }
  }

  /**
   * lat/lng name the surface point the view is centred on; zoom is the distance
   * from the centre; tilt swings the camera about the centred point so it stays
   * put while the horizon rises. The latitude clamp keeps `up x dir` defined.
   */
  private applyPoseToCamera(): void {
    const dir = latLngToVector3(this.pose.lat, this.pose.lng, 1, this.scratchA);
    const east = this.scratchB.set(0, 1, 0).cross(dir).normalize();
    const north = this.scratchC.copy(dir).cross(east).normalize();

    const tilt = this.pose.tilt * DEG;
    const camDir = dir.clone().applyAxisAngle(east, tilt);
    const up = north.clone().applyAxisAngle(east, tilt);

    this.camera.position.copy(camDir).multiplyScalar(this.pose.zoom);
    this.camera.up.copy(up);
    this.camera.lookAt(dir);
    this.camera.updateMatrixWorld();

    // A key light just off the camera axis: enough shading to read as a sphere,
    // without a dead black hemisphere in the middle of a UI.
    this.sun.position.copy(this.camera.position).applyAxisAngle(up, 0.45).multiplyScalar(1.2);
    this.sun.position.addScaledVector(up, 0.35 * this.pose.zoom);
  }

  /**
   * Rotating the camera by Q moves a fixed world point to where its inverse sat,
   * so taking Q from `from` to `to` brings `to` to where `from` is now.
   */
  private swingPose(from: LatLng, to: LatLng): void {
    const a = latLngToVector3(from.lat, from.lng, 1).normalize();
    const b = latLngToVector3(to.lat, to.lng, 1).normalize();
    if (a.distanceToSquared(b) < 1e-12) return;
    const swing = new Quaternion().setFromUnitVectors(a, b);
    const centre = latLngToVector3(this.pose.lat, this.pose.lng, 1).applyQuaternion(swing);
    const next = vector3ToLatLng(centre);
    this.setPoseInternal({ ...this.pose, lat: next.lat, lng: next.lng });
  }

  /**
   * A segment-to-centre test rather than a dot product, so it also works for
   * lifted geometry: an arch is hidden only where its own sightline dips inside
   * the sphere.
   */
  private isOccluded(world: Vector3): boolean {
    const toCamera = this.scratchC.copy(this.camera.position).sub(world);
    const lengthSq = toCamera.lengthSq();
    if (lengthSq < 1e-9) return false;
    const t = clamp(-world.dot(toCamera) / lengthSq, 0, 1);
    const closestSq =
      (world.x + toCamera.x * t) ** 2 + (world.y + toCamera.y * t) ** 2 + (world.z + toCamera.z * t) ** 2;
    return closestSq < OCCLUSION_RADIUS * OCCLUSION_RADIUS;
  }

  private resolveColor(color: string): string {
    const token = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/.exec(color.trim());
    if (!token) return color;
    const value = getComputedStyle(this.container).getPropertyValue(token[1]).trim();
    return value || token[2]?.trim() || 'transparent';
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    if (this.sized && width === this.width && height === this.height) return;
    this.sized = true;
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    // three.js fixes the vertical angle; widen it in a portrait container so the planet
    // fits the narrow side there too.
    this.camera.fov =
      width >= height ? FOV : (2 * Math.atan(Math.tan((FOV * Math.PI) / 360) / this.camera.aspect) * 180) / Math.PI;
    this.camera.updateProjectionMatrix();
    // The canvas CSS size is already 100 %.
    this.renderer.setSize(width, height, false);
    // Screen-space line widths are resolution-relative.
    const ratio = this.renderer.getPixelRatio();
    this.vectors.setResolution(width * ratio, height * ratio);
    this.graticule.setResolution(width * ratio, height * ratio);
    this.connections.setResolution(width * ratio, height * ratio);
    this.needsRender = true;
  };

  private syncRunning(): void {
    const shouldRun = !this.disposed && !this.contextLost && this.onScreen && this.pageVisible;
    if (shouldRun && !this.running) {
      this.running = true;
      this.lastTime = 0;
      this.needsRender = true;
      this.rafId = requestAnimationFrame(this.tick);
    } else if (!shouldRun && this.running) {
      this.running = false;
      cancelAnimationFrame(this.rafId);
    }
  }

  private advanceFlight(delta: number): void {
    const flight = this.flight;
    if (!flight) return;
    flight.elapsed += delta * 1000;
    const t = Math.min(1, flight.elapsed / flight.duration);
    const eased = easeInOut(t);
    const { from, to } = flight;
    this.setPoseInternal({
      lat: from.lat + (to.lat - from.lat) * eased,
      lng: wrapLng(from.lng + flight.deltaLng * eased),
      zoom: from.zoom + (to.zoom - from.zoom) * eased,
      tilt: from.tilt + (to.tilt - from.tilt) * eased,
    });
    if (t >= 1) this.flight = null;
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    // Clamped so a backgrounded tab returning does not jump the animation.
    const delta = this.lastTime === 0 ? 0.016 : Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    try {
      this.advanceFlight(delta);
      this.controls.update(delta);

      if (this.autoRotateSpeed !== 0 && !this.reducedMotion && !this.flight) {
        const step = (this.autoRotateSpeed * AUTO_ROTATE_SPEED * 180 * delta) / Math.PI;
        this.setPoseInternal({ ...this.pose, lng: wrapLng(this.pose.lng + step) });
      }

      if (this.surface.update(delta, this.reducedMotion)) this.needsRender = true;
      if (this.connections.update(delta, this.reducedMotion)) this.needsRender = true;
      this.pins.setZoom(this.pose.zoom);
      if (this.surface.setZoom(this.pose.zoom)) this.needsRender = true;

      // A globe nobody is touching should cost nothing.
      if (!this.needsRender) return;
      this.needsRender = false;

      this.callbacks.onFrame();
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      this.running = false;
      cancelAnimationFrame(this.rafId);
      this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  /* ------------------------------------------------------------------ events */

  private local(event: PointerEvent): ScreenPoint {
    const rect = this.canvas.getBoundingClientRect();
    const sx = rect.width > 0 ? this.width / rect.width : 1;
    const sy = rect.height > 0 ? this.height / rect.height : 1;
    return { x: (event.clientX - rect.left) * sx, y: (event.clientY - rect.top) * sy };
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.callbacks.onPointerMove(this.local(event), event);
  };

  private readonly onPointerLeave = (event: PointerEvent): void => {
    this.callbacks.onPointerLeave(event);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.callbacks.onPointerDown(this.local(event), event);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.callbacks.onPointerUp(this.local(event), event);
  };

  /** Asking for the context back, and pausing until it arrives. */
  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.syncRunning();
    clearTimeout(this.contextTimer);
    this.contextTimer = setTimeout(() => {
      this.contextTimer = 0;
      if (this.contextLost && !this.disposed) this.callbacks.onError(new Error('[globe] the WebGL context was lost'));
    }, CONTEXT_RESTORE_GRACE_MS) as unknown as number;
  };

  /** three re-uploads what the GPU dropped on its own; the loop just has to start again. */
  private readonly onContextRestored = (): void => {
    clearTimeout(this.contextTimer);
    this.contextTimer = 0;
    this.contextLost = false;
    this.needsRender = true;
    this.syncRunning();
  };

  private readonly onVisibilityChange = (): void => {
    this.pageVisible = document.visibilityState !== 'hidden';
    this.syncRunning();
  };
}
