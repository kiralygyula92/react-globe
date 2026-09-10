/**
 * GeoJSON preparation, geometric hit-testing and triangulation.
 *
 * A country collection is indexed once per load into `PreparedCountry[]`, and
 * everything downstream reads that, never the raw GeoJSON.
 */

import { ShapeUtils, Vector2, Vector3 } from 'three';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from 'geojson';
import type { CountryFeature, CountryProperties, LatLng } from '../types';
import { latLngToVector3 } from './coordinates';

/** [west, south, east, north] */
export type Bbox = [number, number, number, number];

export type PreparedPolygon = { rings: Position[][]; bbox: Bbox };

export type PreparedCountry = {
  feature: CountryFeature;
  id: string;
  name: string;
  polygons: PreparedPolygon[];
  bbox: Bbox;
  labelPoint: LatLng;
  labelPriority: number;
};

export type TriangulatedCountry = {
  positions: Float32Array;
  uvs: Float32Array;
  index: Uint32Array;
};

/** Two degrees is roughly 220 km of chord: below where a flat triangle visibly cuts under the sphere. */
export const MAX_EDGE_DEG = 2;
const MAX_SUBDIVISION_DEPTH = 6;
/** Longest line segment drawn as one chord before it would dip under the surface. */
const MAX_SEGMENT_DEG = 1;

/* ----------------------------------------------------------------- properties */

const text = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' && value !== '-99' ? value : null;

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * Fills in whatever a consumer-supplied collection left out, accepting Natural
 * Earth's raw property names as fallbacks.
 */
export function normaliseProperties(raw: Record<string, unknown> | null | undefined, index: number): CountryProperties {
  const p = raw ?? {};
  const name = text(p.name) ?? text(p.NAME) ?? text(p.ADMIN) ?? text(p.NAME_LONG) ?? `Country ${index + 1}`;
  const isoA3 = text(p.isoA3) ?? text(p.ISO_A3);
  return {
    id: text(p.id) ?? text(p.ADM0_A3) ?? isoA3 ?? name,
    name,
    isoA2: text(p.isoA2) ?? text(p.ISO_A2),
    isoA3,
    labelLat: finite(p.labelLat) ?? finite(p.LABEL_Y),
    labelLng: finite(p.labelLng) ?? finite(p.LABEL_X),
    labelPriority: finite(p.labelPriority) ?? finite(p.LABELRANK) ?? 10,
  };
}

/* ----------------------------------------------------------------- preparation */

function ringBbox(ring: Position[]): Bbox {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [x, y] of ring) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  return [w, s, e, n];
}

/** Signed shoelace area and centroid of a ring, in lng/lat space. */
function ringCentroid(ring: Position[]): { area: number; lat: number; lng: number } {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-12) {
    const [x, y] = ring[0];
    return { area: 0, lat: y, lng: x };
  }
  return { area, lat: cy / (6 * area), lng: cx / (6 * area) };
}

function polygonsOf(geometry: Geometry | null | undefined): Position[][][] {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

/** Indexes a country collection once per load. */
export function prepareCountries(collection: FeatureCollection): PreparedCountry[] {
  const out: PreparedCountry[] = [];
  const seen = new Set<string>();

  collection.features.forEach((feature: Feature, index) => {
    const polygons: PreparedPolygon[] = polygonsOf(feature.geometry)
      .filter((rings) => rings.length > 0 && rings[0].length >= 4)
      .map((rings) => ({ rings, bbox: ringBbox(rings[0]) }));
    if (polygons.length === 0) return;

    const properties = normaliseProperties(feature.properties, index);
    // A consumer's collection may repeat a key; keep ids unique so caches stay honest.
    let id = properties.id;
    if (seen.has(id)) id = `${id}#${index}`;
    seen.add(id);

    const bbox: Bbox = [Infinity, Infinity, -Infinity, -Infinity];
    let largest = { area: -1, lat: 0, lng: 0 };
    for (const polygon of polygons) {
      bbox[0] = Math.min(bbox[0], polygon.bbox[0]);
      bbox[1] = Math.min(bbox[1], polygon.bbox[1]);
      bbox[2] = Math.max(bbox[2], polygon.bbox[2]);
      bbox[3] = Math.max(bbox[3], polygon.bbox[3]);
      const c = ringCentroid(polygon.rings[0]);
      if (Math.abs(c.area) > largest.area) largest = { area: Math.abs(c.area), lat: c.lat, lng: c.lng };
    }

    const labelPoint =
      properties.labelLat !== null && properties.labelLng !== null
        ? { lat: properties.labelLat, lng: properties.labelLng }
        : { lat: largest.lat, lng: largest.lng };

    const geometry = feature.geometry as Polygon | MultiPolygon;
    out.push({
      feature: { type: 'Feature', geometry, properties: { ...properties, id } },
      id,
      name: properties.name,
      polygons,
      bbox,
      labelPoint,
      labelPriority: properties.labelPriority,
    });
  });

  return out;
}

/* ----------------------------------------------------------------- hit-testing */

/** Even-odd ray casting in lng/lat space. */
export function pointInRing(ring: Position[], lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Inside the outer ring and outside every hole. */
export function pointInPolygon(rings: Position[][], lng: number, lat: number): boolean {
  if (!pointInRing(rings[0], lng, lat)) return false;
  for (let h = 1; h < rings.length; h++) if (pointInRing(rings[h], lng, lat)) return false;
  return true;
}

const inBbox = (b: Bbox, lng: number, lat: number): boolean =>
  lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3];

/** Linear over countries, but bbox-rejected first, so a miss costs a few hundred comparisons. */
export function findCountryAt(countries: readonly PreparedCountry[], lat: number, lng: number): PreparedCountry | null {
  for (const country of countries) {
    if (!inBbox(country.bbox, lng, lat)) continue;
    for (const polygon of country.polygons) {
      if (inBbox(polygon.bbox, lng, lat) && pointInPolygon(polygon.rings, lng, lat)) return country;
    }
  }
  return null;
}

/* --------------------------------------------------------------- triangulation */

const sameAsFirst = (ring: Position[]): boolean => {
  const a = ring[0];
  const b = ring[ring.length - 1];
  return ring.length > 1 && a[0] === b[0] && a[1] === b[1];
};

const toContour = (ring: Position[]): Vector2[] => {
  const points = ring.map(([x, y]) => new Vector2(x, y));
  if (sameAsFirst(ring)) points.pop();
  return points;
};

/**
 * Triangulates a country onto the sphere at `radius`: lng/lat triangulation,
 * antimeridian artefacts dropped, long edges subdivided, every triangle wound
 * outward, output indexed.
 */
export function triangulateCountry(country: PreparedCountry, radius: number): TriangulatedCountry {
  // Flat [lng, lat, lng, lat, ...] vertex list and triangle indices into it.
  const lngLat: number[] = [];
  const triangles: number[] = [];

  for (const polygon of country.polygons) {
    const contour = toContour(polygon.rings[0]);
    const holes = polygon.rings.slice(1).map(toContour).filter((h) => h.length >= 3);
    if (contour.length < 3) continue;

    let faces: number[][];
    try {
      faces = ShapeUtils.triangulateShape(contour, holes);
    } catch {
      // A self-intersecting ring is not worth failing a hover over.
      continue;
    }

    const base = lngLat.length / 2;
    for (const point of contour) lngLat.push(point.x, point.y);
    for (const hole of holes) for (const point of hole) lngLat.push(point.x, point.y);

    for (const [a, b, c] of faces) {
      const la = lngLat[(base + a) * 2];
      const lb = lngLat[(base + b) * 2];
      const lc = lngLat[(base + c) * 2];
      // The triangulation runs on a cylinder cut open at 180 degrees; a triangle
      // spanning more than half the world is an artefact of that cut.
      if (Math.max(la, lb, lc) - Math.min(la, lb, lc) > 180) continue;
      triangles.push(base + a, base + b, base + c);
    }
  }

  // Subdivide by edge length alone, so two triangles sharing an edge always agree
  // on whether it splits, and share the midpoint: no cracks along the seams.
  const midpoints = new Map<number, number>();
  const vertexCount = (): number => lngLat.length / 2;
  const edgeLength = (i: number, j: number): number =>
    Math.hypot(lngLat[i * 2] - lngLat[j * 2], lngLat[i * 2 + 1] - lngLat[j * 2 + 1]);
  const midpoint = (i: number, j: number): number => {
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    const key = lo * 4194304 + hi;
    let m = midpoints.get(key);
    if (m === undefined) {
      m = vertexCount();
      lngLat.push((lngLat[i * 2] + lngLat[j * 2]) / 2, (lngLat[i * 2 + 1] + lngLat[j * 2 + 1]) / 2);
      midpoints.set(key, m);
    }
    return m;
  };

  const out: number[] = [];
  const subdivide = (a: number, b: number, c: number, depth: number): void => {
    if (depth >= MAX_SUBDIVISION_DEPTH) {
      out.push(a, b, c);
      return;
    }
    const splitAB = edgeLength(a, b) > MAX_EDGE_DEG;
    const splitBC = edgeLength(b, c) > MAX_EDGE_DEG;
    const splitCA = edgeLength(c, a) > MAX_EDGE_DEG;
    const splits = Number(splitAB) + Number(splitBC) + Number(splitCA);
    if (splits === 0) {
      out.push(a, b, c);
      return;
    }
    const d = depth + 1;
    if (splits === 3) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      subdivide(a, ab, ca, d);
      subdivide(ab, b, bc, d);
      subdivide(ca, bc, c, d);
      subdivide(ab, bc, ca, d);
      return;
    }
    // Rotate so the split edges come first: one split is (a,b); two are (a,b) and (b,c).
    if (splits === 1) {
      if (splitBC) return subdivide(b, c, a, depth);
      if (splitCA) return subdivide(c, a, b, depth);
      const ab = midpoint(a, b);
      subdivide(a, ab, c, d);
      subdivide(ab, b, c, d);
      return;
    }
    if (!splitCA) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      subdivide(a, ab, c, d);
      subdivide(ab, b, bc, d);
      subdivide(ab, bc, c, d);
      return;
    }
    if (!splitAB) return subdivide(b, c, a, depth);
    return subdivide(c, a, b, depth);
  };

  for (let t = 0; t < triangles.length; t += 3) subdivide(triangles[t], triangles[t + 1], triangles[t + 2], 0);

  // Lift onto the sphere; the uv comes from the same lng/lat, never recovered in a
  // shader, because an atan2 jumps from 1 to 0 at the antimeridian.
  const count = vertexCount();
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const v = new Vector3();
  for (let i = 0; i < count; i++) {
    const lng = lngLat[i * 2];
    const lat = lngLat[i * 2 + 1];
    latLngToVector3(lat, lng, radius, v);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    uvs[i * 2] = (lng + 180) / 360;
    uvs[i * 2 + 1] = (lat + 90) / 180;
  }

  // Wind every triangle outward: Natural Earth is not consistent about ring
  // winding, and a wrong-wound triangle is culled on the side facing the camera.
  const index = new Uint32Array(out.length);
  const pa = new Vector3();
  const pb = new Vector3();
  const pc = new Vector3();
  const e1 = new Vector3();
  const e2 = new Vector3();
  for (let t = 0; t < out.length; t += 3) {
    const a = out[t];
    let b = out[t + 1];
    let c = out[t + 2];
    pa.fromArray(positions, a * 3);
    pb.fromArray(positions, b * 3);
    pc.fromArray(positions, c * 3);
    e1.subVectors(pb, pa);
    e2.subVectors(pc, pa);
    const normal = e1.cross(e2);
    const outward = pa.add(pb).add(pc);
    if (normal.dot(outward) < 0) [b, c] = [c, b];
    index[t] = a;
    index[t + 1] = b;
    index[t + 2] = c;
  }

  return { positions, uvs, index };
}

/* ----------------------------------------------------------------------- lines */

function linesOf(geometry: Geometry | null | undefined): Position[][] {
  if (!geometry) return [];
  switch (geometry.type) {
    case 'LineString':
      return [geometry.coordinates];
    case 'MultiLineString':
      return geometry.coordinates;
    case 'Polygon':
      return geometry.coordinates;
    case 'MultiPolygon':
      return geometry.coordinates.flat();
    default:
      return [];
  }
}

/**
 * Flattens lines and polygon rings into the segment-pair array
 * `LineSegmentsGeometry` wants. Long segments are split so their chords do not
 * dip under the sphere and vanish in the middle.
 */
export function lineFeaturesToSegments(collection: FeatureCollection, radius: number): Float32Array {
  const out: number[] = [];
  const a = new Vector3();
  const b = new Vector3();

  const push = (lng0: number, lat0: number, lng1: number, lat1: number): void => {
    latLngToVector3(lat0, lng0, radius, a);
    latLngToVector3(lat1, lng1, radius, b);
    out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };

  for (const feature of collection.features) {
    for (const line of linesOf(feature.geometry)) {
      for (let i = 1; i < line.length; i++) {
        const [lng0, lat0] = line[i - 1];
        const [lng1, lat1] = line[i];
        // A segment jumping the antimeridian is a seam, not a line across the map.
        if (Math.abs(lng1 - lng0) > 180) continue;
        const steps = Math.max(1, Math.ceil(Math.hypot(lng1 - lng0, lat1 - lat0) / MAX_SEGMENT_DEG));
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps;
          const t1 = (s + 1) / steps;
          push(lng0 + (lng1 - lng0) * t0, lat0 + (lat1 - lat0) * t0, lng0 + (lng1 - lng0) * t1, lat0 + (lat1 - lat0) * t1);
        }
      }
    }
  }
  return new Float32Array(out);
}
