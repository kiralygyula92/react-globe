/**
 * Screen-space pin clustering on a uniform grid.
 *
 * Each pin only ever compares against the nine cells around it, so this is O(n)
 * with a small constant rather than O(n^2) — which is what keeps 5 000 pins
 * inside a frame budget.
 */

import type { Pin } from '../types';

export type ProjectedPin<TData> = {
  pin: Pin<TData>;
  /** Index into the pins array the projection was built from. */
  index: number;
  x: number;
  y: number;
  visible: boolean;
};

export type PinCluster<TData> = {
  /** Smallest member id, plus the count; a lone pin keeps its own id. */
  id: string;
  pins: Pin<TData>[];
  indices: number[];
  /** Mean of the members' screen positions. */
  x: number;
  y: number;
};

/** Screen coordinates stay well inside +-32 000 px, so this packs without collision. */
const cellKey = (cx: number, cy: number): number => (cx + 32768) * 65536 + (cy + 32768);

export function clusterProjectedPins<TData>(
  projected: readonly ProjectedPin<TData>[],
  radiusPx: number,
): PinCluster<TData>[] {
  const radius = Math.max(1, radiusPx);
  const radiusSq = radius * radius;

  // Bucket every visible pin by cell. Invisible pins never join a cluster.
  const cells = new Map<number, number[]>();
  for (let i = 0; i < projected.length; i++) {
    const entry = projected[i];
    if (!entry.visible) continue;
    const key = cellKey(Math.floor(entry.x / radius), Math.floor(entry.y / radius));
    const bucket = cells.get(key);
    if (bucket) bucket.push(i);
    else cells.set(key, [i]);
  }

  const assigned = new Uint8Array(projected.length);
  const clusters: PinCluster<TData>[] = [];

  // Input order decides which pin seeds a cluster, so the result is deterministic.
  for (let i = 0; i < projected.length; i++) {
    const seed = projected[i];
    if (!seed.visible || assigned[i]) continue;

    const members: number[] = [];
    const cx = Math.floor(seed.x / radius);
    const cy = Math.floor(seed.y / radius);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = cells.get(cellKey(cx + dx, cy + dy));
        if (!bucket) continue;
        for (const j of bucket) {
          if (assigned[j]) continue;
          const other = projected[j];
          const ddx = other.x - seed.x;
          const ddy = other.y - seed.y;
          if (ddx * ddx + ddy * ddy <= radiusSq) {
            assigned[j] = 1;
            members.push(j);
          }
        }
      }
    }

    let sumX = 0;
    let sumY = 0;
    let smallest = projected[members[0]].pin.id;
    const pins: Pin<TData>[] = [];
    for (const j of members) {
      const entry = projected[j];
      sumX += entry.x;
      sumY += entry.y;
      pins.push(entry.pin);
      if (entry.pin.id < smallest) smallest = entry.pin.id;
    }

    clusters.push({
      // Stable across small camera moves, or React rebuilds every marker each time
      // the camera drifts a pixel.
      id: members.length === 1 ? smallest : `cluster:${smallest}:${members.length}`,
      pins,
      indices: members.map((j) => projected[j].index),
      x: sumX / members.length,
      y: sumY / members.length,
    });
  }

  return clusters;
}
