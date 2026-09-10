/**
 * Drag, wheel and pinch. Talks to the engine through `ControlHost` rather than
 * holding a reference to it.
 *
 * Left-drag orbits with inertia; right-drag (or shift + left-drag) tilts,
 * pivoting on the grabbed point; the wheel and a pinch zoom.
 */

import type { CameraPose, LatLng, ScreenPoint } from '../../types';
import { LAT_CLAMP_DEG, TILT_MAX_DEG, TILT_MIN_DEG } from '../../defaults';
import { RAD, greatCircleAngle, wrapLng } from '../../utils/coordinates';

/** Fraction of drag velocity surviving each second. */
const INERTIA_DECAY = 0.02;
/** Degrees per second below which the glide is over. */
const INERTIA_CUTOFF = 0.6;
/** Fraction of remaining zoom distance NOT covered per second. */
const ZOOM_DAMPING = 0.00001;
/** One notch (100 px) moves the camera ~12 %. */
const WHEEL_SCALE = 0.0012;
/** Degrees of tilt per pixel of right-drag. */
const TILT_PER_PIXEL = 0.22;
/** How far the centre may travel over one tilt drag. */
const MAX_TILT_DRIFT_DEG = 22;
const ANCHOR_ITERATIONS = 4;
/** A release this long after the last move carries no glide. */
const RELEASE_STILL_MS = 80;

export type ControlSettings = {
  enableZoom: boolean;
  enableRotation: boolean;
  enableTilt: boolean;
};

export interface ControlHost {
  getPose(): Required<CameraPose>;
  applyPose(pose: Required<CameraPose>): void;
  /** Turns the camera so the coordinate under `from` lands where `to` is. */
  swingPose(from: LatLng, to: LatLng): void;
  getZoomTarget(): number;
  setZoomTarget(zoom: number): void;
  getSize(): { width: number; height: number };
  latLngToScreen(point: LatLng): ScreenPoint | null;
  screenToLatLng(x: number, y: number): LatLng | null;
  isFlying(): boolean;
  onInteractionStart(): void;
}

type Mode = 'none' | 'rotate' | 'tilt' | 'pinch';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const clampLat = (lat: number): number => clamp(lat, -LAT_CLAMP_DEG, LAT_CLAMP_DEG);
/** Haversine, in degrees. */
const arcBetween = (a: LatLng, b: LatLng): number => greatCircleAngle(a, b) * RAD;

export class PointerControls {
  private mode: Mode = 'none';
  private dragPointer = -1;
  private lastX = 0;
  private lastY = 0;
  private lastMoveTime = 0;
  /** CSS pixels per screen pixel, for a container someone has scaled with a transform. */
  private pixelScale = 1;
  private velocityLat = 0;
  private velocityLng = 0;

  private tiltPivot: LatLng | null = null;
  private tiltAnchor: ScreenPoint | null = null;
  private tiltOrigin: LatLng | null = null;
  private anchorSpent = false;

  private readonly touches = new Map<number, ScreenPoint>();
  private pinchDistance = 0;
  private windowListening = false;
  private wheelAttached = false;

  constructor(
    private readonly element: HTMLElement,
    private readonly host: ControlHost,
    private settings: ControlSettings,
  ) {
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('contextmenu', this.onContextMenu);
    this.syncWheelListener();
  }

  setSettings(settings: ControlSettings): void {
    this.settings = settings;
    if ((this.mode === 'rotate' && !settings.enableRotation) || (this.mode === 'tilt' && !settings.enableTilt)) {
      this.endDrag();
    }
    this.syncWheelListener();
  }

  /** Zeroes the glide, so a programmatic camera move is not fought by the user's last flick. */
  cancelInertia(): void {
    this.velocityLat = 0;
    this.velocityLng = 0;
  }

  update(deltaSeconds: number): void {
    const host = this.host;

    // Inertia glide after a rotate drag.
    if (
      this.mode === 'none' &&
      (Math.abs(this.velocityLat) > INERTIA_CUTOFF || Math.abs(this.velocityLng) > INERTIA_CUTOFF)
    ) {
      const pose = host.getPose();
      const decay = Math.pow(INERTIA_DECAY, deltaSeconds);
      host.applyPose({
        ...pose,
        lat: clampLat(pose.lat + this.velocityLat * deltaSeconds),
        lng: wrapLng(pose.lng + this.velocityLng * deltaSeconds),
      });
      this.velocityLat *= decay;
      this.velocityLng *= decay;
    }

    // Exponential ease of the actual zoom towards the target. A flight animates
    // zoom itself, so the two never fight.
    if (host.isFlying()) return;
    const target = host.getZoomTarget();
    const pose = host.getPose();
    const current = pose.zoom;
    if (Math.abs(target - current) > 0.0005) {
      const t = 1 - Math.pow(ZOOM_DAMPING, deltaSeconds);
      host.applyPose({ ...pose, zoom: current + (target - current) * t });
    } else if (target !== current) {
      // Snap the last sliver, so it settles exactly.
      host.applyPose({ ...pose, zoom: target });
    }
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('contextmenu', this.onContextMenu);
    if (this.wheelAttached) this.element.removeEventListener('wheel', this.onWheel);
    this.wheelAttached = false;
    this.listenWindow(false);
    this.touches.clear();
  }

  /* ------------------------------------------------------------------ listeners */

  /**
   * Leaving the wheel listener off is the mechanism by which a page scrolls
   * normally under a globe with zooming disabled: nothing is attached to swallow
   * the event. Not an early return inside the handler.
   */
  private syncWheelListener(): void {
    if (this.settings.enableZoom && !this.wheelAttached) {
      this.element.addEventListener('wheel', this.onWheel, { passive: false });
      this.wheelAttached = true;
    } else if (!this.settings.enableZoom && this.wheelAttached) {
      this.element.removeEventListener('wheel', this.onWheel);
      this.wheelAttached = false;
    }
  }

  /** Only for the duration of a gesture, so a pointer leaving the canvas keeps steering. */
  private listenWindow(on: boolean): void {
    if (on === this.windowListening) return;
    this.windowListening = on;
    if (on) {
      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);
    } else {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('pointercancel', this.onPointerUp);
    }
  }

  /** Suppressed on the canvas only, and only while tilting is on. */
  private readonly onContextMenu = (event: MouseEvent): void => {
    if (this.settings.enableTilt) event.preventDefault();
  };

  private readonly onWheel = (event: WheelEvent): void => {
    // Only ever claimed when zooming is on.
    event.preventDefault();
    this.host.onInteractionStart();
    // Line mode reports lines; turn them into pixels.
    const step = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    this.host.setZoomTarget(this.host.getZoomTarget() * Math.exp(step * WHEEL_SCALE));
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touches.size === 2) {
        this.endDrag();
        this.mode = 'pinch';
        this.pinchDistance = this.touchDistance();
        this.cancelInertia();
        this.host.onInteractionStart();
        this.listenWindow(true);
        return;
      }
      if (this.touches.size > 2) return;
    }

    let mode: Mode = 'none';
    if ((event.button === 2 || (event.button === 0 && event.shiftKey)) && this.settings.enableTilt) mode = 'tilt';
    else if (event.button === 0 && this.settings.enableRotation) mode = 'rotate';
    if (mode === 'none') return;

    event.preventDefault();
    this.host.onInteractionStart();
    this.cancelInertia();

    const rect = this.element.getBoundingClientRect();
    const size = this.host.getSize();
    this.pixelScale = rect.width > 0 ? size.width / rect.width : 1;

    this.mode = mode;
    this.dragPointer = event.pointerId;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.lastMoveTime = performance.now();

    if (mode === 'tilt') {
      const local = {
        x: (event.clientX - rect.left) * this.pixelScale,
        y: (event.clientY - rect.top) * this.pixelScale,
      };
      const pose = this.host.getPose();
      this.tiltPivot = this.host.screenToLatLng(local.x, local.y);
      this.tiltAnchor = local;
      this.tiltOrigin = { lat: pose.lat, lng: pose.lng };
      // Grabbing empty space leaves nothing to pin.
      this.anchorSpent = this.tiltPivot === null;
    }

    this.listenWindow(true);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' && this.touches.has(event.pointerId)) {
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.mode === 'pinch') {
        if (this.touches.size >= 2 && this.settings.enableZoom) {
          const distance = this.touchDistance();
          if (distance > 0 && this.pinchDistance > 0) {
            this.host.setZoomTarget(this.host.getZoomTarget() * (this.pinchDistance / distance));
          }
          this.pinchDistance = distance;
        }
        return;
      }
    }

    if (event.pointerId !== this.dragPointer) return;
    const dx = (event.clientX - this.lastX) * this.pixelScale;
    const dy = (event.clientY - this.lastY) * this.pixelScale;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.lastMoveTime = performance.now();

    if (this.mode === 'rotate') this.rotateBy(dx, dy);
    else if (this.mode === 'tilt') this.tiltBy(dy);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      this.touches.delete(event.pointerId);
      if (this.mode === 'pinch' && this.touches.size < 2) {
        this.mode = 'none';
        this.cancelInertia();
      }
    }
    if (event.pointerId === this.dragPointer) {
      // A pointer held still before release carries no glide.
      if (performance.now() - this.lastMoveTime > RELEASE_STILL_MS) this.cancelInertia();
      this.endDrag();
    }
    if (this.mode === 'none' && this.touches.size === 0) this.listenWindow(false);
  };

  /* ------------------------------------------------------------------- gestures */

  private endDrag(): void {
    if (this.mode === 'rotate' || this.mode === 'tilt') this.mode = 'none';
    this.dragPointer = -1;
    this.tiltPivot = null;
    this.tiltAnchor = null;
    this.tiltOrigin = null;
    this.anchorSpent = false;
  }

  private touchDistance(): number {
    const [a, b] = [...this.touches.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  /** Degrees of arc one pixel covers at the current distance. */
  private degreesPerPixel(): number {
    const { height } = this.host.getSize();
    const zoom = this.host.getPose().zoom;
    const capHalfAngle = Math.acos(Math.min(1, 1 / Math.max(zoom, 1.0001)));
    return (2 * capHalfAngle * RAD) / Math.max(height, 1);
  }

  private rotateBy(dx: number, dy: number): void {
    const pose = this.host.getPose();
    const k = this.degreesPerPixel();
    // Dragging right carries the surface right, which means looking further west.
    const deltaLng = -dx * k;
    const deltaLat = dy * k;
    this.velocityLng = deltaLng * 60;
    this.velocityLat = deltaLat * 60;
    this.host.applyPose({ ...pose, lat: clampLat(pose.lat + deltaLat), lng: wrapLng(pose.lng + deltaLng) });
  }

  private tiltBy(dy: number): void {
    const pose = this.host.getPose();
    const tilt = clamp(pose.tilt + dy * TILT_PER_PIXEL, TILT_MIN_DEG, TILT_MAX_DEG);
    this.host.applyPose({ ...pose, tilt });
    this.reanchor();
  }

  /**
   * Keeps the grabbed coordinate under the cursor while the camera tilts, solved
   * as the rotation it actually is. Pinning a point while tilting requires the
   * centre to travel, and the demand runs away past ~28 degrees, so the drift is
   * capped: inside the cap the anchor is exact; beyond it the anchor gives out and
   * the tilt carries on alone.
   */
  private reanchor(): void {
    const pivot = this.tiltPivot;
    const anchor = this.tiltAnchor;
    const origin = this.tiltOrigin;
    if (!pivot || !anchor || !origin || this.anchorSpent) return;

    for (let i = 0; i < ANCHOR_ITERATIONS; i++) {
      const projected = this.host.latLngToScreen(pivot);
      if (projected && Math.abs(projected.x - anchor.x) < 0.5 && Math.abs(projected.y - anchor.y) < 0.5) return;

      const under = this.host.screenToLatLng(anchor.x, anchor.y);
      if (!under) {
        this.anchorSpent = true;
        return;
      }

      const before = this.host.getPose();
      this.host.swingPose(under, pivot);

      // Past the cap the anchor is asking for more than it is worth.
      if (arcBetween(origin, this.host.getPose()) > MAX_TILT_DRIFT_DEG) {
        this.host.applyPose(before);
        this.anchorSpent = true;
        return;
      }
    }
  }
}
