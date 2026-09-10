/** Triangulation onto the sphere, on synthetic countries built from small lat/lng boxes. */

import { describe, expect, it } from 'vitest';
import { ShapeUtils, Vector2, Vector3 } from 'three';
import type { FeatureCollection, Position } from 'geojson';
import {
  MAX_EDGE_DEG,
  findCountryAt,
  lineFeaturesToSegments,
  normaliseProperties,
  prepareCountries,
  triangulateCountry,
  type PreparedCountry,
} from './geo';

function country(rings: Position[][], name = 'Box'): PreparedCountry {
  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { name }, geometry: { type: 'Polygon', coordinates: rings } }],
  };
  const [prepared] = prepareCountries(collection);
  return prepared;
}

const box = (w: number, s: number, e: number, n: number): Position[] => [
  [w, s],
  [e, s],
  [e, n],
  [w, n],
  [w, s],
];

function triangles(mesh: ReturnType<typeof triangulateCountry>): Vector3[][] {
  const out: Vector3[][] = [];
  for (let t = 0; t < mesh.index.length; t += 3) {
    out.push([0, 1, 2].map((k) => new Vector3().fromArray(mesh.positions, mesh.index[t + k] * 3)));
  }
  return out;
}

const outward = ([a, b, c]: Vector3[]): number => {
  const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
  return normal.dot(new Vector3().add(a).add(b).add(c));
};

describe('triangulateCountry', () => {
  it('triangulates a simple box into an indexed mesh at the requested radius', () => {
    const mesh = triangulateCountry(country([box(0, 0, 1, 1)]), 1.001);
    expect(mesh.index.length).toBeGreaterThan(0);
    expect(mesh.index.length % 3).toBe(0);
    for (let i = 0; i < mesh.positions.length; i += 3) {
      expect(new Vector3().fromArray(mesh.positions, i).length()).toBeCloseTo(1.001, 5);
    }
  });

  it('winds every triangle outward whichever way the ring runs', () => {
    const ring = box(10, 10, 14, 13);
    const forward = triangles(triangulateCountry(country([ring]), 1));
    const reversed = triangles(triangulateCountry(country([[...ring].reverse()]), 1));
    expect(forward.length).toBeGreaterThan(0);
    expect(reversed.length).toBeGreaterThan(0);
    for (const tri of [...forward, ...reversed]) expect(outward(tri)).toBeGreaterThan(0);
  });

  it('drops triangles spanning more than half the world at the antimeridian', () => {
    // A ring whose points sit on both sides of 180: in lng/lat space it is a
    // box nearly the width of the map.
    const ring: Position[] = [
      [170, -5],
      [-170, -5],
      [-170, 5],
      [170, 5],
      [170, -5],
    ];
    const mesh = triangulateCountry(country([ring]), 1);
    for (let t = 0; t < mesh.index.length; t += 3) {
      const lngs = [0, 1, 2].map((k) => mesh.uvs[mesh.index[t + k] * 2] * 360 - 180);
      expect(Math.max(...lngs) - Math.min(...lngs)).toBeLessThanOrEqual(180);
    }
  });

  it('subdivides edges longer than the limit', () => {
    const ring = box(0, 0, 10, 10);
    const contour = ring.slice(0, -1).map(([x, y]) => new Vector2(x, y));
    const raw = ShapeUtils.triangulateShape(contour, []).length;
    const mesh = triangulateCountry(country([ring]), 1);
    expect(mesh.index.length / 3).toBeGreaterThan(raw);

    // Every edge ends up at or under the limit, in lng/lat space.
    for (let t = 0; t < mesh.index.length; t += 3) {
      for (let k = 0; k < 3; k++) {
        const i = mesh.index[t + k];
        const j = mesh.index[t + ((k + 1) % 3)];
        const du = (mesh.uvs[i * 2] - mesh.uvs[j * 2]) * 360;
        const dv = (mesh.uvs[i * 2 + 1] - mesh.uvs[j * 2 + 1]) * 180;
        expect(Math.hypot(du, dv)).toBeLessThanOrEqual(MAX_EDGE_DEG + 1e-6);
      }
    }
  });

  it('computes uvs as (lng+180)/360, (lat+90)/180 for every vertex', () => {
    const mesh = triangulateCountry(country([box(-30, -20, -25, -16)]), 1);
    const count = mesh.positions.length / 3;
    for (let i = 0; i < count; i++) {
      const v = new Vector3().fromArray(mesh.positions, i * 3);
      const lat = 90 - (Math.acos(v.y / v.length()) * 180) / Math.PI;
      const lng = ((Math.atan2(v.z, -v.x) * 180) / Math.PI) - 180;
      const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
      expect(mesh.uvs[i * 2]).toBeCloseTo((wrapped + 180) / 360, 5);
      expect(mesh.uvs[i * 2 + 1]).toBeCloseTo((lat + 90) / 180, 5);
    }
  });

  it('skips a self-intersecting ring rather than throwing', () => {
    const bowtie: Position[] = [
      [0, 0],
      [4, 4],
      [4, 0],
      [0, 4],
      [0, 0],
    ];
    expect(() => triangulateCountry(country([bowtie]), 1)).not.toThrow();
  });

  it('leaves holes empty', () => {
    const prepared = country([box(0, 0, 6, 6), box(2, 2, 4, 4)]);
    expect(findCountryAt([prepared], 3, 3)).toBeNull();
    expect(findCountryAt([prepared], 1, 1)).toBe(prepared);
  });
});

describe('prepareCountries', () => {
  it('drops polygons with fewer than four points and computes a centroid label point', () => {
    const collection: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { NAME: 'Degenerate' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 1], [0, 0]]] } },
        { type: 'Feature', properties: { NAME: 'Real', ISO_A3: 'REA' }, geometry: { type: 'Polygon', coordinates: [box(0, 0, 2, 2)] } },
      ],
    };
    const prepared = prepareCountries(collection);
    expect(prepared).toHaveLength(1);
    expect(prepared[0].name).toBe('Real');
    expect(prepared[0].id).toBe('REA');
    expect(prepared[0].labelPoint.lat).toBeCloseTo(1, 6);
    expect(prepared[0].labelPoint.lng).toBeCloseTo(1, 6);
  });

  it('accepts raw Natural Earth property names', () => {
    const properties = normaliseProperties({ ADMIN: 'Freedonia', ADM0_A3: 'FRD', ISO_A2: '-99', LABELRANK: 3 }, 0);
    expect(properties).toEqual({
      id: 'FRD',
      name: 'Freedonia',
      isoA2: null,
      isoA3: null,
      labelLat: null,
      labelLng: null,
      labelPriority: 3,
    });
    expect(normaliseProperties({}, 4).labelPriority).toBe(10);
  });
});

describe('lineFeaturesToSegments', () => {
  it('emits segment pairs, splitting long segments so their chords stay near the surface', () => {
    const collection: FeatureCollection = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[0, 0], [10, 0]] } }],
    };
    const segments = lineFeaturesToSegments(collection, 1.002);
    expect(segments.length % 6).toBe(0);
    expect(segments.length / 6).toBeGreaterThanOrEqual(10);
    for (let i = 0; i < segments.length; i += 3) {
      expect(new Vector3().fromArray(segments, i).length()).toBeCloseTo(1.002, 5);
    }
  });
});
