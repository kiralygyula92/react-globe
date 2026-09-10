/**
 * Great-circle links drawn in WebGL, as screen-space lines.
 *
 * Each entry keeps a signature of every resolved value plus both endpoints, so a
 * new connection set reuses what is unchanged, rebuilds what changed, and drops
 * the rest.
 */

import { Group } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { PinConnection } from '../../types';
import { parseCssColor } from '../materials/cssColor';
import {
  DASH,
  FLOW_SPEED,
  connectionPath,
  resolveConnection,
  type ConnectionDefaults,
  type ConnectionEnds,
  type ResolvedConnection,
} from './connections';

export type DrawnConnection = { connection: PinConnection; ends: ConnectionEnds };

type Entry = {
  line: Line2;
  geometry: LineGeometry;
  material: LineMaterial;
  signature: string;
  animated: boolean;
};

export class ConnectionLayer {
  readonly group = new Group();
  private readonly entries = new Map<string, Entry>();
  private elapsed = 0;
  private width = 1;
  private height = 1;
  /** A custom renderer draws in SVG but still needs this clock to advance. */
  private customAnimated = false;

  constructor() {
    this.group.name = 'connections';
  }

  /** 0 -> 1, for a custom renderer's own flow. */
  get progress(): number {
    return (this.elapsed * FLOW_SPEED) % 1;
  }

  setConnections(drawn: readonly DrawnConnection[], defaults: ConnectionDefaults): void {
    const keep = new Set<string>();
    for (const { connection, ends } of drawn) {
      const resolved = resolveConnection(connection, defaults);
      const signature = JSON.stringify([resolved, ends.from.lat, ends.from.lng, ends.to.lat, ends.to.lng]);
      keep.add(connection.id);
      const existing = this.entries.get(connection.id);
      if (existing?.signature === signature) continue;
      if (existing) this.destroy(connection.id, existing);
      this.entries.set(connection.id, this.build(resolved, ends, signature));
    }
    for (const [id, entry] of this.entries) if (!keep.has(id)) this.destroy(id, entry);
  }

  setCustomAnimated(animated: boolean): void {
    this.customAnimated = animated;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setResolution(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const entry of this.entries.values()) entry.material.resolution.set(width, height);
  }

  /** Advances the flow of animated links; returns whether anything moved. */
  update(delta: number, reducedMotion: boolean): boolean {
    if (reducedMotion) return false;
    let moved = this.customAnimated;
    for (const entry of this.entries.values()) if (entry.animated) moved = true;
    if (!moved) return false;
    this.elapsed += delta;
    for (const entry of this.entries.values()) {
      if (entry.animated) entry.material.dashOffset = -this.elapsed * FLOW_SPEED;
    }
    return true;
  }

  dispose(): void {
    for (const [id, entry] of this.entries) this.destroy(id, entry);
    this.group.clear();
  }

  private build(resolved: ResolvedConnection, ends: ConnectionEnds, signature: string): Entry {
    const points = connectionPath(ends, resolved.type, resolved.archHeight);
    const positions: number[] = [];
    for (const p of points) positions.push(p.x, p.y, p.z);

    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    const { color, alpha } = parseCssColor(resolved.color);
    const dash = DASH[resolved.lineStyle];
    const material = new LineMaterial({
      color: color.getHex(),
      linewidth: resolved.width,
      worldUnits: false,
      transparent: true,
      opacity: 0.95 * alpha,
      depthWrite: false,
      toneMapped: false,
      dashed: dash !== null,
      dashSize: dash?.dashSize ?? 1,
      gapSize: dash?.gapSize ?? 0,
    });
    material.color.copy(color);
    material.resolution.set(this.width, this.height);

    const line = new Line2(geometry, material);
    // Dashes are measured along the line, so the distances have to exist first.
    if (dash) line.computeLineDistances();
    line.frustumCulled = false;
    line.raycast = () => undefined;
    this.group.add(line);

    return { line, geometry, material, signature, animated: resolved.animated };
  }

  private destroy(id: string, entry: Entry): void {
    this.group.remove(entry.line);
    entry.geometry.dispose();
    entry.material.dispose();
    this.entries.delete(id);
  }
}
