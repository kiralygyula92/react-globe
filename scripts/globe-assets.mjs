/**
 * Regenerates every vendored globe asset from its upstream source.
 *
 * Run once; the output is committed. Re-run only to refresh a source:
 *
 *   node scripts/globe-assets.mjs
 *
 * Plain Node, no dependencies. Prints each file's size so a silently truncated
 * download is visible.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'packages', 'globe', 'src', 'assets');

const NATURAL_EARTH = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

/** 1:50m is ~1 km on the ground; three decimals is ~110 m, so this loses nothing visible. */
const PRECISION = 3;
const FACTOR = 10 ** PRECISION;

const TEXTURES = [
  ['https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg', 'earth-day-8192.jpg'],
  ['https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg', 'earth-clouds-2048.jpg'],
  ['https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg', 'earth-day-2048.jpg'],
  ['https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg', 'earth-normal-2048.jpg'],
  ['https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg', 'earth-specular-2048.jpg'],
  ['https://unpkg.com/three-globe/example/img/earth-topology.png', 'earth-topology.png'],
];

/* ------------------------------------------------------------------ helpers */

const round = (value) => {
  const n = Number(value);
  return value == null || Number.isNaN(n) ? null : Math.round(n * FACTOR) / FACTOR;
};

/** Natural Earth writes '-99' where it has nothing. */
const nullIfDash = (value) =>
  value == null || value === '' || value === '-99' || value === -99 ? null : String(value);

/** Rounds every coordinate at any nesting depth. */
function roundCoords(coords) {
  if (typeof coords[0] === 'number') return coords.map((c) => Math.round(c * FACTOR) / FACTOR);
  return coords.map(roundCoords);
}

/** Drops consecutive duplicates left by the rounding, keeping at least `min` points. */
function dedupe(points, min) {
  const out = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
  }
  // A ring must keep at least a triangle's worth of points; below that keep it as it was.
  return out.length < min ? points : out;
}

function cleanGeometry(geometry) {
  const ring = (r) => dedupe(roundCoords(r), 4);
  const line = (l) => dedupe(roundCoords(l), 2);
  switch (geometry.type) {
    case 'Polygon':
      return { type: 'Polygon', coordinates: geometry.coordinates.map(ring) };
    case 'MultiPolygon':
      return { type: 'MultiPolygon', coordinates: geometry.coordinates.map((p) => p.map(ring)) };
    case 'LineString':
      return { type: 'LineString', coordinates: line(geometry.coordinates) };
    case 'MultiLineString':
      return { type: 'MultiLineString', coordinates: geometry.coordinates.map(line) };
    default:
      return geometry;
  }
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error(`could not fetch ${url}: ${lastError?.message ?? lastError}`);
}

const fetchJson = async (url) => (await fetchWithRetry(url)).json();

async function save(file, data) {
  const path = join(OUT, file);
  await writeFile(path, data);
  const bytes = typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength;
  console.log(`${file.padEnd(26)} ${(bytes / 1024).toFixed(0).padStart(6)} KB`);
}

const collection = (features) => JSON.stringify({ type: 'FeatureCollection', features });

/* ----------------------------------------------------------------- datasets */

async function countries() {
  const source = await fetchJson(`${NATURAL_EARTH}/ne_50m_admin_0_countries.geojson`);
  const features = source.features
    .filter((f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'))
    .map((f) => {
      const p = f.properties;
      return {
        type: 'Feature',
        properties: {
          id: nullIfDash(p.ADM0_A3) ?? nullIfDash(p.ISO_A3) ?? nullIfDash(p.SOV_A3) ?? String(p.NAME).toUpperCase().slice(0, 3),
          name: p.NAME ?? p.ADMIN ?? p.NAME_LONG ?? 'Unknown',
          isoA2: nullIfDash(p.ISO_A2),
          isoA3: nullIfDash(p.ISO_A3),
          labelLat: round(p.LABEL_Y),
          labelLng: round(p.LABEL_X),
          // LABELRANK runs 1 (most important) upward, which is exactly our priority order.
          labelPriority: p.LABELRANK ?? 10,
        },
        geometry: cleanGeometry(f.geometry),
      };
    });
  await save('countries-50m.geojson', collection(features));
}

async function lines(source, file) {
  const data = await fetchJson(`${NATURAL_EARTH}/${source}.geojson`);
  const features = data.features
    .filter((f) => f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'))
    .map((f) => ({ type: 'Feature', properties: {}, geometry: cleanGeometry(f.geometry) }));
  await save(file, collection(features));
}

async function capitals() {
  const data = await fetchJson(`${NATURAL_EARTH}/ne_50m_populated_places_simple.geojson`);
  const records = data.features
    .filter((f) => String(f.properties.featurecla ?? '').startsWith('Admin-0 capital'))
    .map((f) => {
      const p = f.properties;
      const [lng, lat] = f.geometry.coordinates;
      return {
        id: `${p.adm0_a3 ?? p.sov_a3 ?? 'XXX'}-${String(p.name).replace(/\s+/g, '-')}`,
        name: p.name,
        country: p.adm0name ?? p.sov0name ?? '',
        isoA2: nullIfDash(p.iso_a2),
        lat: round(lat),
        lng: round(lng),
        // scalerank runs 0 (biggest) upward; capitals of larger nations show first.
        labelPriority: p.scalerank ?? 8,
      };
    })
    .sort((a, b) => a.labelPriority - b.labelPriority || a.name.localeCompare(b.name));
  await save('capitals-50m.json', JSON.stringify(records));
}

async function textures() {
  for (const [url, file] of TEXTURES) {
    const res = await fetchWithRetry(url);
    await save(file, new Uint8Array(await res.arrayBuffer()));
  }
}

/* --------------------------------------------------------------------- main */

await mkdir(OUT, { recursive: true });
await countries();
await lines('ne_50m_coastline', 'coastline-50m.geojson');
await lines('ne_50m_admin_0_boundary_lines_land', 'borders-50m.geojson');
await capitals();
await textures();
console.log(`\nwrote ${OUT}`);
