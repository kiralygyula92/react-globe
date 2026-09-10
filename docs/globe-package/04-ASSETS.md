# 04 — Assets

Everything is vendored into the package and emitted by the bundler as hashed URLs. **Nothing is
fetched from a third-party host at runtime.** About 9 MB is committed.

---

## 1. The manifest

| File | Size | Source | Licence |
|---|---|---|---|
| `countries-50m.geojson` | ~1.7 MB | [Natural Earth](https://www.naturalearthdata.com/) 1:50m `ne_50m_admin_0_countries`, via [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector) | Public domain |
| `coastline-50m.geojson` | ~1.1 MB | Natural Earth `ne_50m_coastline` | Public domain |
| `borders-50m.geojson` | ~350 KB | Natural Earth `ne_50m_admin_0_boundary_lines_land` | Public domain |
| `capitals-50m.json` | ~25 KB | Natural Earth `ne_50m_populated_places_simple`, filtered to admin-0 capitals | Public domain |
| `earth-day-8192.jpg` | ~4.5 MB | Solar System Scope, Blue Marble derivative, 8192 × 4096 | **CC BY 4.0 — credit Solar System Scope** |
| `earth-day-2048.jpg` | ~460 KB | Solar System Scope, the same imagery at 2048 | **CC BY 4.0 — credit Solar System Scope** |
| `earth-topology.png` | ~380 KB | [three-globe](https://github.com/vasturiano/three-globe) example imagery | MIT |
| `earth-clouds-2048.jpg` | ~830 KB | NASA Earth Observatory cloud composite | Public domain, credit NASA |
| `earth-normal-2048.jpg` | ~340 KB | three.js example textures (NASA-derived) | MIT (three.js) |
| `earth-specular-2048.jpg` | ~225 KB | three.js example textures (NASA-derived) | MIT (three.js) |

**The CC BY 4.0 attribution is a legal obligation, not a courtesy.** Credit Solar System Scope in
the package README and in the demo app.

### Why the day map is 8192 and comes from where it does

The base map went from 5400 to 8192 px wide because the first round's texture went soft once the
camera closed in, and practical use means closing in. NASA publishes Blue Marble at 5400 or at
21600 and nothing between, and 21600 is a 30 MB download — so the 8 K comes from Solar System
Scope's derivative instead.

`earth-day-2048.jpg` **must be the same picture** as the 8 K one, or the preview swap would change
the colour of the world mid-load. It serves two jobs: the realistic style's progressive preview,
and the land-cover raster the shaded styles read.

---

## 2. `scripts/globe-assets.mjs`

Run once; the output is committed. Re-run only to refresh a source.

```
node scripts/globe-assets.mjs
```

Plain Node, no dependencies. It lives outside the package folder in the original because that is
where the repo kept its scripts; in the standalone repo put it at `scripts/` and point `OUT` at
`packages/globe/src/assets`.

### 2.1 Coordinate reduction

```js
/** 1:50m is ~1 km on the ground; three decimals is ~110 m, so this loses nothing visible. */
const PRECISION = 3;
```

`roundCoords` rounds every coordinate at any nesting depth. `dedupe` then drops consecutive
duplicate positions left behind by the rounding — but **a ring must keep at least a triangle's
worth of points**, so a ring that would fall below four is kept as it was.

### 2.2 Countries

Filters to `Polygon` / `MultiPolygon`, then cuts the properties down to the seven the module
actually reads:

```js
{
  id: p.ADM0_A3 || p.ISO_A3 || p.SOV_A3 || String(p.NAME).toUpperCase().slice(0, 3),
  name: p.NAME ?? p.ADMIN ?? p.NAME_LONG ?? 'Unknown',
  isoA2: nullIfDash(p.ISO_A2),          // Natural Earth writes '-99' for missing
  isoA3: nullIfDash(p.ISO_A3),
  labelLat: round(p.LABEL_Y),
  labelLng: round(p.LABEL_X),
  // LABELRANK runs 1 (most important) upward, which is exactly our priority order.
  labelPriority: p.LABELRANK ?? 10,
}
```

### 2.3 Lines

Coastline and borders: filter to `LineString` / `MultiLineString`, drop all properties, clean the
geometry.

### 2.4 Capitals

Filter `featurecla` starting with `'Admin-0 capital'`. Per record:

```js
{
  id: `${p.adm0_a3 ?? p.sov_a3 ?? 'XXX'}-${String(p.name).replace(/\s+/g, '-')}`,
  name: p.name,
  country: p.adm0name ?? p.sov0name ?? '',
  isoA2: nullIfDash(p.iso_a2),
  lat: round(lat), lng: round(lng),
  // scalerank runs 0 (biggest) upward; capitals of larger nations show first.
  labelPriority: p.scalerank ?? 8,
}
```

Sorted by `labelPriority`, then name.

### 2.5 Texture URLs

```js
['https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg', 'earth-day-8192.jpg'],
['https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg', 'earth-clouds-2048.jpg'],
['https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg', 'earth-day-2048.jpg'],
['https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg', 'earth-normal-2048.jpg'],
['https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg', 'earth-specular-2048.jpg'],
['https://unpkg.com/three-globe/example/img/earth-topology.png', 'earth-topology.png'],
```

Upstream URLs move. If one 404s, find the equivalent and record the substitution — the script
prints each file's size so a silently-truncated download is visible.

---

## 3. `assets/index.ts`

### 3.1 URL resolution

```ts
import dayTextureUrl   from './earth-day-8192.jpg?url';
import dayPreviewUrl   from './earth-day-2048.jpg?url';
import elevationUrl    from './earth-topology.png?url';
import normalMapUrl    from './earth-normal-2048.jpg?url';
import specularMapUrl  from './earth-specular-2048.jpg?url';
import cloudsTextureUrl from './earth-clouds-2048.jpg?url';
import countriesUrl    from './countries-50m.geojson?url';
import coastlineUrl    from './coastline-50m.geojson?url';
import bordersUrl      from './borders-50m.geojson?url';
import capitalsUrl     from './capitals-50m.json?url';

export const DEFAULT_ASSETS = {
  dayTexture: dayTextureUrl,
  dayPreview: dayPreviewUrl,     // NOT part of GlobeAssets — see below
  normalMap: normalMapUrl,
  specularMap: specularMapUrl,
  cloudsTexture: cloudsTextureUrl,
  elevation: elevationUrl,       // NOT part of GlobeAssets
  countriesGeoJson: countriesUrl,
  coastlineGeoJson: coastlineUrl, // NOT part of GlobeAssets
  bordersGeoJson: bordersUrl,     // NOT part of GlobeAssets
  capitalsDataset: capitalsUrl,
} as const;

export const resolveAssets = (assets: GlobeAssets | undefined) => ({
  ...DEFAULT_ASSETS,
  ...Object.fromEntries(Object.entries(assets ?? {}).filter(([, v]) => v !== undefined)),
} as typeof DEFAULT_ASSETS & GlobeAssets);
```

Note the asymmetry, and keep it: `DEFAULT_ASSETS` carries four slots that `GlobeAssets` does not
expose — `dayPreview`, `elevation`, `coastlineGeoJson`, `bordersGeoJson`. A consumer supplying
their own `dayTexture` gets theirs and **no preview**; there is no small version of it.

> **`?url` is Vite-specific.** See `07-PACKAGING.md` §3 for how to keep this working (or replace
> it) when the package is consumed by webpack, Rollup, Next.js or a plain `<script type=module>`.

### 3.2 The caches

Covered in `02-ARCHITECTURE.md` §8.2. Restated because it is easy to get wrong:

- `imageCache: Map<string, Promise<HTMLImageElement | ImageBitmap>>` — module-level, page-lifetime.
- `jsonCache: Map<string, Promise<unknown>>` — same.
- **`THREE.Texture` objects are never cached.** Each engine builds and disposes its own.
- A rejected promise removes itself from its cache so a retry is possible.

### 3.3 Decoding

```ts
const canDecodeOffThread = typeof createImageBitmap === 'function';
```

Prefer `createImageBitmap(blob, { imageOrientation: 'flipY' })` — a worker-thread decode. A 34-
megapixel decode on the main thread stalls the page hard enough to be felt several components
away. Fall back to `new Image()` + `.decode()`.

```ts
export async function loadTexture(url: string): Promise<Texture> {
  const image = await loadImage(url);
  const texture = new Texture(image);
  // A bitmap decoded with imageOrientation:'flipY' is already the right way up;
  // flipping again would put the north pole at the south.
  texture.flipY = !(typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap);
  texture.needsUpdate = true;
  return texture;
}
```

Error messages are prefixed and name the URL:
`` `[globe] could not load image: ${url} (${res.status})` `` /
`` `[globe] could not load dataset: ${url} (${res.status})` ``.

---

## 4. Supplying your own

```tsx
<Globe assets={{ dayTexture: '/my/earth.jpg', countriesGeoJson: myFeatureCollection }} />
```

Anything left out falls back to the bundled file. `countriesGeoJson` and `capitalsDataset` accept
either a URL or the parsed data directly.

A consumer-supplied `countriesGeoJson` goes through `normaliseProperties`, which accepts Natural
Earth's raw property names (`NAME`, `ADMIN`, `ISO_A3`, `ADM0_A3`) as well as the module's own —
so an unprocessed Natural Earth file works, it just carries no label anchors or priorities and
falls back to computed centroids and a flat priority of 10.
