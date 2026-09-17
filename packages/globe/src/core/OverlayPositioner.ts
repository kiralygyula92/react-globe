/**
 * Per-frame DOM placement for the overlays.
 *
 * Overlays are React's, but their positions are not: `transform` is written
 * straight to each node once per rendered frame, which keeps the globe off
 * React's render path entirely.
 */

import type { ProjectedPoint } from './GlobeEngine';

export type OverlayAnchor = {
  element: HTMLElement;
  lat: number;
  lng: number;
  /** Distance from the globe centre; markers sit a hair above the surface. */
  radius: number;
  /** Labels take part in collision resolution; markers do not. */
  collides: boolean;
  /** Lower wins when two labels overlap. */
  priority: number;
  /** Rotates the element so its axis follows the surface normal on screen. */
  alignToNormal: boolean;
  /** Last measured size, for the collision test. Written by the positioner only. */
  width?: number;
  height?: number;
};

export interface Projector {
  projectInto(lat: number, lng: number, radius: number, out: ProjectedPoint): ProjectedPoint;
}

type Box = { x0: number; y0: number; x1: number; y1: number };

/** How far along the normal the second point for `alignToNormal` is projected. */
const NORMAL_PROBE = 0.25;

const sortKey = (a: OverlayAnchor): number => (a.collides ? a.priority : -1);

export class OverlayPositioner {
  private readonly anchors = new Map<string, OverlayAnchor>();
  private readonly claimed: Box[] = [];
  private readonly projected: ProjectedPoint = { x: 0, y: 0, visible: false };
  private readonly normal: ProjectedPoint = { x: 0, y: 0, visible: false };
  private sorted: OverlayAnchor[] = [];
  private dirty = false;
  /** Set when the label sizes on file may be stale. */
  private measure = false;

  register(key: string, anchor: OverlayAnchor): void {
    this.anchors.set(key, anchor);
    this.dirty = true;
  }

  unregister(key: string): void {
    if (this.anchors.delete(key)) this.dirty = true;
  }

  get(key: string): OverlayAnchor | undefined {
    return this.anchors.get(key);
  }

  /** Call after mutating a registered anchor's priority or collides flag. */
  markDirty(): void {
    this.dirty = true;
  }

  clear(): void {
    this.anchors.clear();
    this.sorted = [];
    this.claimed.length = 0;
    this.measure = false;
  }

  update(projector: Projector): void {
    this.claimed.length = 0;
    if (this.dirty) {
      // Non-colliding anchors sort first (they never claim space); colliding ones
      // lowest-priority-number first, so an important name claims its space
      // before a minor one can overlap it.
      this.sorted = [...this.anchors.values()].sort((a, b) => sortKey(a) - sortKey(b));
      this.dirty = false;
      this.measure = true;
    }

    /**
     * Every measurement first, before a single style is written: a read after a write
     * forces the browser to lay the page out again, and a few hundred labels doing that
     * once each costs more than the frame they were being placed in. Label sizes only
     * change when the set or its text does, which is what `markDirty` says.
     */
    if (this.measure) {
      this.measure = false;
      for (const anchor of this.sorted) {
        if (!anchor.collides) continue;
        anchor.width = anchor.element.offsetWidth;
        anchor.height = anchor.element.offsetHeight;
      }
    }

    const p = this.projected;
    for (const anchor of this.sorted) {
      const style = anchor.element.style;
      projector.projectInto(anchor.lat, anchor.lng, anchor.radius, p);
      if (!p.visible) {
        style.visibility = 'hidden';
        continue;
      }

      if (anchor.collides) {
        const w = anchor.width ?? 0;
        const h = anchor.height ?? 0;
        // A zero-sized element has not been laid out yet: it never claims space and is
        // never rejected, and it is measured again on the next frame.
        if (w > 0 && h > 0) {
          const box = { x0: p.x - w / 2, y0: p.y - h / 2, x1: p.x + w / 2, y1: p.y + h / 2 };
          if (this.overlaps(box)) {
            style.visibility = 'hidden';
            continue;
          }
          this.claimed.push(box);
        } else {
          this.measure = true;
        }
      }

      let rotation = '';
      if (anchor.alignToNormal) {
        const n = projector.projectInto(anchor.lat, anchor.lng, anchor.radius + NORMAL_PROBE, this.normal);
        // The on-screen direction away from the globe, which is where a marker's head goes.
        const angle = Math.atan2(n.x - p.x, -(n.y - p.y));
        rotation = ` rotate(${angle.toFixed(3)}rad)`;
      }
      style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)${rotation}`;
      style.visibility = 'visible';
    }
  }

  private overlaps(box: Box): boolean {
    for (const other of this.claimed) {
      if (box.x0 < other.x1 && box.x1 > other.x0 && box.y0 < other.y1 && box.y1 > other.y0) return true;
    }
    return false;
  }
}
