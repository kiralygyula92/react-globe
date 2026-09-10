/** The O(n) screen-space grid, including the 5 000-pin budget. */

import { describe, expect, it } from 'vitest';
import { clusterProjectedPins, type ProjectedPin } from './clustering';

function projected(points: { x: number; y: number; visible?: boolean }[]): ProjectedPin<unknown>[] {
  return points.map((p, index) => ({
    pin: { id: `p${String(index).padStart(5, '0')}`, lat: 0, lng: 0 },
    index,
    x: p.x,
    y: p.y,
    visible: p.visible ?? true,
  }));
}

/** Deterministic pseudo-random numbers, so a failure reproduces. */
function random(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('clusterProjectedPins', () => {
  it('merges pins inside the radius and keeps distant ones apart', () => {
    const clusters = clusterProjectedPins(
      projected([
        { x: 100, y: 100 },
        { x: 110, y: 105 },
        { x: 400, y: 400 },
      ]),
      44,
    );
    expect(clusters).toHaveLength(2);
    expect(clusters.find((c) => c.pins.length === 2)?.pins.map((p) => p.id)).toEqual(['p00000', 'p00001']);
    expect(clusters.find((c) => c.pins.length === 1)?.id).toBe('p00002');
  });

  it('places every pin in exactly one cluster', () => {
    const next = random(7);
    const input = projected(Array.from({ length: 500 }, () => ({ x: next() * 800, y: next() * 600 })));
    const clusters = clusterProjectedPins(input, 44);
    const ids = clusters.flatMap((c) => c.pins.map((p) => p.id));
    expect(ids).toHaveLength(500);
    expect(new Set(ids).size).toBe(500);
    const indices = clusters.flatMap((c) => c.indices);
    expect(new Set(indices).size).toBe(500);
  });

  it('positions a cluster at the mean of its members', () => {
    const [cluster] = clusterProjectedPins(
      projected([
        { x: 100, y: 100 },
        { x: 120, y: 110 },
        { x: 110, y: 90 },
      ]),
      44,
    );
    expect(cluster.pins).toHaveLength(3);
    expect(cluster.x).toBeCloseTo(110, 10);
    expect(cluster.y).toBeCloseTo(100, 10);
  });

  it('drops invisible pins entirely', () => {
    const clusters = clusterProjectedPins(
      projected([
        { x: 100, y: 100 },
        { x: 105, y: 100, visible: false },
        { x: 900, y: 900, visible: false },
      ]),
      44,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].pins.map((p) => p.id)).toEqual(['p00000']);
  });

  it('gives stable ids for the same input in the same order', () => {
    const next = random(11);
    const points = Array.from({ length: 300 }, () => ({ x: next() * 500, y: next() * 500 }));
    const a = clusterProjectedPins(projected(points), 44).map((c) => c.id);
    const b = clusterProjectedPins(projected(points), 44).map((c) => c.id);
    expect(a).toEqual(b);
    expect(a.some((id) => id.startsWith('cluster:'))).toBe(true);
  });

  it('names a cluster by its smallest member id and its count', () => {
    const [cluster] = clusterProjectedPins(
      projected([
        { x: 10, y: 10 },
        { x: 12, y: 12 },
      ]),
      44,
    );
    expect(cluster.id).toBe('cluster:p00000:2');
  });

  it('clusters 5 000 pins in under 8 ms', () => {
    const next = random(3);
    const input = projected(Array.from({ length: 5000 }, () => ({ x: next() * 1920, y: next() * 1080 })));
    // Warm up, then take the best of a few runs so a GC pause does not decide it.
    clusterProjectedPins(input, 44);
    let best = Infinity;
    for (let run = 0; run < 5; run++) {
      const start = performance.now();
      clusterProjectedPins(input, 44);
      best = Math.min(best, performance.now() - start);
    }
    expect(best).toBeLessThan(8);
  });
});
