/**
 * Regenerates every vendored globe asset from its upstream source.
 *
 * Run once; the output is committed. Re-run only to refresh a source:
 *
 *   node scripts/globe-assets.mjs [datasets|textures]
 *
 * Every source is in the public domain (NASA imagery, Natural Earth vectors), and
 * the derived maps — normal and specular — are computed here rather than copied,
 * so the package ships nothing that carries an attribution or licence obligation.
 *
 * Needs `sharp` (a root dev dependency). Prints each file's size so a silently
 * truncated download is visible.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'packages', 'globe', 'src', 'assets');

const NATURAL_EARTH = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

/** 1:50m is ~1 km on the ground; three decimals is ~110 m, so this loses nothing visible. */
const PRECISION = 3;
const FACTOR = 10 ** PRECISION;

const NASA = 'https://eoimages.gsfc.nasa.gov/images/imagerecords';
/** NASA Blue Marble: Next Generation, July 2004, without relief shading. Public domain. */
const BLUE_MARBLE = `${NASA}/74000/74092/world.200407.3x21600x10800.jpg`;
/** NASA Earth Observatory cloud composite. Public domain. */
const CLOUDS = `${NASA}/57000/57747/cloud_combined_2048.jpg`;
/** NASA Visible Earth GEBCO land elevation, greyscale, ocean black. Public domain. */
const ELEVATION = `${NASA}/73000/73934/gebco_08_rev_elev_21600x10800.png`;

/** Tangent-space normal strength per grey level of height difference. */
const NORMAL_STRENGTH = 0.03;

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

async function fetchWithRetry(url, attempts = 3, headers = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow', headers });
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

/* ------------------------------------------------------------ localised names */

/**
 * Languages with bundled place names, besides English (which is `name`). Keep in
 * step with GLOBE_LOCALES in packages/globe/src/i18n.
 */
const NAME_LANGUAGES = ['ro', 'de', 'es', 'fr', 'hu'];

const WIKIDATA = 'https://www.wikidata.org/w/api.php';
/** Wikidata asks API clients to identify themselves. */
const USER_AGENT = 'react-globe-assets/1.0 (https://github.com/kiralygyula92/react-globe)';

/** Labels for every id, in every NAME_LANGUAGES language. Wikidata labels are CC0. */
async function wikidataLabels(ids) {
  const labels = new Map();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const url = `${WIKIDATA}?action=wbgetentities&format=json&props=labels&maxlag=5&languages=${NAME_LANGUAGES.join('|')}&ids=${batch.join('|')}`;
    let data;
    for (let attempt = 0; ; attempt++) {
      data = await (await fetchWithRetry(url, 3, { 'User-Agent': USER_AGENT })).json();
      if (data.error?.code !== 'maxlag' || attempt >= 5) break;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    if (data.error) throw new Error(`wikidata: ${data.error.code} ${data.error.info}`);
    for (const [id, entity] of Object.entries(data.entities ?? {})) {
      labels.set(id, Object.fromEntries(Object.entries(entity.labels ?? {}).map(([lang, l]) => [lang, l.value])));
    }
  }
  return labels;
}

/**
 * Natural Earth's own NAME_XX first (it is edited for map labels), Wikidata where
 * Natural Earth has no column for the language (Romanian) or no value. Entries
 * that merely repeat the English name are dropped: the component falls back to
 * `name` anyway.
 */
function localisedNames(properties, english, labels) {
  const names = {};
  for (const lang of NAME_LANGUAGES) {
    const value = nullIfDash(properties[`NAME_${lang.toUpperCase()}`]) ?? labels?.[lang] ?? null;
    if (value && value !== english) names[lang] = value;
  }
  return names;
}

/* ----------------------------------------------------------------- datasets */

async function countries() {
  const source = await fetchJson(`${NATURAL_EARTH}/ne_50m_admin_0_countries.geojson`);
  const kept = source.features.filter((f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
  const labels = await wikidataLabels(kept.map((f) => nullIfDash(f.properties.WIKIDATAID)));
  const features = kept
    .map((f) => {
      const p = f.properties;
      const name = p.NAME ?? p.ADMIN ?? p.NAME_LONG ?? 'Unknown';
      return {
        type: 'Feature',
        properties: {
          id: nullIfDash(p.ADM0_A3) ?? nullIfDash(p.ISO_A3) ?? nullIfDash(p.SOV_A3) ?? String(p.NAME).toUpperCase().slice(0, 3),
          name,
          isoA2: nullIfDash(p.ISO_A2),
          isoA3: nullIfDash(p.ISO_A3),
          labelLat: round(p.LABEL_Y),
          labelLng: round(p.LABEL_X),
          // LABELRANK runs 1 (most important) upward, which is exactly our priority order.
          labelPriority: p.LABELRANK ?? 10,
          names: localisedNames(p, name, labels.get(nullIfDash(p.WIKIDATAID))),
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
  // The simple file has no Wikidata ids or NAME_XX columns; the full one does.
  const full = await fetchJson(`${NATURAL_EARTH}/ne_50m_populated_places.geojson`);
  const fullByKey = new Map(full.features.map((f) => [`${f.properties.NAME}|${f.properties.ADM0_A3}`, f.properties]));
  const kept = data.features.filter((f) => String(f.properties.featurecla ?? '').startsWith('Admin-0 capital'));
  const detail = (p) => fullByKey.get(`${p.name}|${p.adm0_a3}`) ?? {};
  const labels = await wikidataLabels(kept.map((f) => nullIfDash(detail(f.properties).WIKIDATAID)));
  const records = kept
    .map((f) => {
      const p = f.properties;
      const d = detail(p);
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
        names: localisedNames(d, p.name, labels.get(nullIfDash(d.WIKIDATAID))),
      };
    })
    .sort((a, b) => a.labelPriority - b.labelPriority || a.name.localeCompare(b.name));
  await save('capitals-50m.json', JSON.stringify(records));
}

/* ----------------------------------------------------------------- textures */

const fetchBuffer = async (url) => Buffer.from(await (await fetchWithRetry(url)).arrayBuffer());

const jpeg = (image, quality = 90) => image.jpeg({ quality, mozjpeg: true }).toBuffer();

async function dayMaps() {
  const source = await fetchBuffer(BLUE_MARBLE);
  // The full-size decode is ~700 MB of pixels; let sharp stream it.
  const open = () => sharp(source, { limitInputPixels: false });
  await save('earth-day-8192.jpg', await jpeg(open().resize(8192, 4096, { kernel: 'lanczos3' }), 88));
  await save('earth-day-2048.jpg', await jpeg(open().resize(2048, 1024, { kernel: 'lanczos3' })));
}

async function clouds() {
  await save('earth-clouds-2048.jpg', await fetchBuffer(CLOUDS));
}

/** Greyscale height at 2048 x 1024, north row first. Returned for the normal map. */
async function topology() {
  const source = await fetchBuffer(ELEVATION);
  const { data } = await sharp(source, { limitInputPixels: false })
    .greyscale()
    .resize(2048, 1024, { kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const height = new Uint8Array(data.buffer, data.byteOffset, 2048 * 1024);
  await save('earth-topology.png', await sharp(Buffer.from(height), { raw: { width: 2048, height: 1024, channels: 1 } }).png({ compressionLevel: 9 }).toBuffer());
  return height;
}

/**
 * Tangent-space normals from central differences of the height field. Wraps in
 * longitude, clamps at the poles; green points north, as three.js expects.
 */
async function normalMap(height, width = 2048, rows = 1024) {
  const out = Buffer.alloc(width * rows * 3);
  const at = (x, y) => height[Math.min(rows - 1, Math.max(0, y)) * width + ((x + width) % width)];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * NORMAL_STRENGTH;
      const dy = (at(x, y - 1) - at(x, y + 1)) * 0.5 * NORMAL_STRENGTH;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * width + x) * 3;
      out[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
    }
  }
  await save('earth-normal-2048.jpg', await jpeg(sharp(out, { raw: { width, height: rows, channels: 3 } })));
}

/** An SVG path for every ring of a polygon collection, in equirectangular degrees. */
function svgPath(collection) {
  const ring = (r) => `M${r.map(([lng, lat]) => `${lng},${-lat}`).join('L')}Z`;
  return collection.features
    .map(({ geometry: g }) => {
      if (g?.type === 'Polygon') return g.coordinates.map(ring).join('');
      if (g?.type === 'MultiPolygon') return g.coordinates.flat().map(ring).join('');
      return '';
    })
    .join('');
}

/** Water white, land black: land and lakes from Natural Earth, rasterised here. */
async function specularMap() {
  const land = await fetchJson(`${NATURAL_EARTH}/ne_50m_land.geojson`);
  const lakes = await fetchJson(`${NATURAL_EARTH}/ne_50m_lakes.geojson`);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="2048" viewBox="-180 -90 360 180">' +
    '<rect x="-180" y="-90" width="360" height="180" fill="#fff"/>' +
    `<path fill="#000" fill-rule="evenodd" d="${svgPath(land)}"/>` +
    `<path fill="#fff" fill-rule="evenodd" d="${svgPath(lakes)}"/>` +
    '</svg>';
  const image = sharp(Buffer.from(svg)).flatten({ background: '#fff' }).greyscale().resize(2048, 1024, { kernel: 'lanczos3' });
  await save('earth-specular-2048.jpg', await jpeg(image));
}

async function textures() {
  await dayMaps();
  await clouds();
  await normalMap(await topology());
  await specularMap();
}

/* --------------------------------------------------------------------- main */

/** `node scripts/globe-assets.mjs [datasets|textures]` — both when neither is named. */
const only = process.argv[2];

await mkdir(OUT, { recursive: true });
if (only !== 'textures') {
  await countries();
  await lines('ne_50m_coastline', 'coastline-50m.geojson');
  await lines('ne_50m_admin_0_boundary_lines_land', 'borders-50m.geojson');
  await capitals();
}
if (only !== 'datasets') await textures();
console.log(`\nwrote ${OUT}`);
