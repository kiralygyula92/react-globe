/**
 * Palettes, ramps and the derived fields the three flat styles are shaded from:
 * the land mask, the exact Euclidean distance to land, and the height scale.
 *
 * Nothing here bakes a colour at a fixed resolution. The rasters are sampled per
 * fragment and banded afterwards; the ramps are 256-wide textures whose filter
 * alone decides flat bands (nearest) or a gradient (linear).
 *
 * All colours are rgb() triples; no hex literals.
 */

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  NearestFilter,
  RedFormat,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
} from 'three';
import type { RenderStyle } from '../../types';
import type { PreparedCountry } from '../../utils/geo';
import { isImageBitmap, type DecodedImage } from '../../assets';

export type Rgb = readonly [number, number, number];
export type RampStop = readonly [number, Rgb];

/* -------------------------------------------------------------------- standard */

// Land cover: forest green -> olive -> straw -> pale sand. Nothing above that —
// snow and rock arrive by their own routes.
const COVER_STOPS: readonly RampStop[] = [
  [0.0, [92, 146, 84]],
  [0.16, [116, 162, 88]],
  [0.32, [146, 178, 96]],
  [0.48, [176, 190, 108]],
  [0.62, [202, 196, 126]],
  [0.76, [220, 202, 150]],
  [0.88, [232, 214, 176]],
  [1.0, [240, 228, 202]],
];

// Where height takes over from cover: the browns of a range, then bare rock.
const RELIEF_STOPS: readonly RampStop[] = [
  [0.0, [150, 122, 84]],
  [0.35, [134, 98, 66]],
  [0.7, [112, 78, 58]],
  [1.0, [140, 122, 112]],
];

export const SNOW: Rgb = [246, 248, 250];

// Sea, from the coastal shelf out to deep water.
const SEA_STOPS: readonly RampStop[] = [
  [0.0, [176, 216, 230]],
  [0.07, [156, 205, 224]],
  [0.15, [134, 189, 216]],
  [0.24, [113, 172, 206]],
  [0.34, [95, 155, 197]],
  [0.45, [78, 137, 187]],
  [0.56, [64, 119, 174]],
  [0.67, [52, 102, 160]],
  [0.78, [42, 86, 144]],
  [0.89, [32, 70, 124]],
  [1.0, [24, 58, 104]],
];

/* ---------------------------------------------------------------------- modern */

const NEON_LAND_STOPS: readonly RampStop[] = [
  [0.0, [26, 52, 132]],
  [0.22, [34, 88, 186]],
  [0.45, [42, 138, 226]],
  [0.68, [66, 194, 246]],
  [0.85, [138, 232, 252]],
  [1.0, [226, 250, 255]],
];

// Dark from the shore outward, and barely graded at all. Two earlier versions lit
// the coast, and both read as a halo drawn around every landmass.
const NEON_SEA_STOPS: readonly RampStop[] = [
  [0.0, [10, 26, 68]],
  [0.35, [8, 20, 58]],
  [0.7, [6, 15, 46]],
  [1.0, [4, 10, 34]],
];

/* --------------------------------------------------------------------- cartoon */

/** Six atlas hues, assigned by graph colouring. */
export const CARTOON_FILLS = [38, 96, 172, 268, 320, 14].map((h) => `hsl(${h}, 58%, 62%)`);
export const CARTOON_SEA: Rgb = [55, 122, 168];
/** Islets too small for the dataset. */
export const CARTOON_LAND: Rgb = [214, 200, 168];

/* ------------------------------------------------------------------ thresholds */

export type FlatShaderThresholds = {
  coverDark: number;
  coverBright: number;
  reliefFrom: number;
  snowLight: number;
  snowNeutral: number;
  snowLatitude: number;
  snowHeight: number;
  seaOpen: number;
  seaShallow: number;
  seaImagery: number;
  shelfSharp: number;
  basinTight: number;
  basinWide: number;
  bulkFrom: number;
  bulkTo: number;
};

export const FLAT_THRESHOLDS: FlatShaderThresholds = {
  coverDark: 40,
  coverBright: 190,
  reliefFrom: 0.58,
  snowLight: 200,
  snowNeutral: 30,
  snowLatitude: 58,
  snowHeight: 0.66,
  seaOpen: 62,
  seaShallow: 150,
  seaImagery: 0.55,
  shelfSharp: 2.6,
  basinTight: 0.09,
  basinWide: 0.72,
  bulkFrom: 0.03,
  bulkTo: 0.34,
};

/**
 * The sea's bands fade into one another: many narrow bands, each holding its
 * colour across the middle and easing into the next over the rest.
 */
export const SEA_BANDS = 26;
export const SEA_FADE = 0.36;

export type FlatStyle = Exclude<RenderStyle, 'realistic'>;

export type StyleRamps = {
  land: readonly RampStop[];
  relief: readonly RampStop[];
  sea: readonly RampStop[];
  /** Nearest-filtered land ramps: the flat bands of a printed map. */
  banded: boolean;
  seaBands: number;
};

/** Cartoon reads none of these, but they have to be bound for the shader to link. */
export function rampStops(style: FlatStyle): StyleRamps {
  if (style === 'modern') {
    return { land: NEON_LAND_STOPS, relief: NEON_LAND_STOPS, sea: NEON_SEA_STOPS, banded: false, seaBands: 0 };
  }
  return {
    land: COVER_STOPS,
    relief: RELIEF_STOPS,
    sea: SEA_STOPS,
    banded: true,
    seaBands: style === 'cartoon' ? 0 : SEA_BANDS,
  };
}

/* ----------------------------------------------------------------------- ramps */

/**
 * A 256 x 1 ramp. LinearSRGBColorSpace, not sRGB: these values go straight to an
 * sRGB framebuffer, so they must pass through the sampler untouched.
 */
export function createRampTexture(stops: readonly RampStop[], banded: boolean): DataTexture {
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let rgb: Rgb;
    if (banded) {
      let pick = stops[0];
      for (const stop of stops) if (stop[0] <= t) pick = stop;
      rgb = pick[1];
    } else {
      let upper = stops.findIndex((stop) => stop[0] >= t);
      if (upper <= 0) upper = Math.max(upper, 1);
      const [t0, c0] = stops[upper - 1];
      const [t1, c1] = stops[upper];
      const f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
      rgb = [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
    data[i * 4] = Math.round(rgb[0]);
    data[i * 4 + 1] = Math.round(rgb[1]);
    data[i * 4 + 2] = Math.round(rgb[2]);
    data[i * 4 + 3] = 255;
  }
  const texture = new DataTexture(data, 256, 1, RGBAFormat, UnsignedByteType);
  texture.colorSpace = LinearSRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = banded ? NearestFilter : LinearFilter;
  texture.magFilter = banded ? NearestFilter : LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/* ---------------------------------------------------------------- derived fields */

export const MASK_W = 4096;
export const MASK_H = 2048;
export const DEPTH_W = 2048;
export const DEPTH_H = 1024;
/** Texels the field can still tell apart — about 28 degrees of arc. */
export const DEPTH_RANGE = 160;

const INF = 1e20;
const DEG = Math.PI / 180;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Traces every country polygon white on black, holes subtracted. */
function paintCountries(ctx: CanvasRenderingContext2D, countries: readonly PreparedCountry[], w: number, h: number): void {
  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgb(255, 255, 255)';
  const sx = w / 360;
  const sy = h / 180;
  for (const country of countries) {
    ctx.beginPath();
    for (const polygon of country.polygons) {
      for (const ring of polygon.rings) {
        ring.forEach(([lng, lat], i) => {
          const x = (lng + 180) * sx;
          const y = (90 - lat) * sy;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
    }
    ctx.fill('evenodd');
  }
}

/**
 * The 1D transform: walks the lower envelope of the parabolas (q - i)^2 + f[i].
 * `v` holds the parabolas lowest somewhere and `z` the crossings between them, so
 * the line is transformed in one pass forward and one back.
 */
export function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/**
 * Exact Euclidean distance from every texel to the nearest land texel
 * (Felzenszwalb & Huttenlocher), as a fraction of DEPTH_RANGE in a byte.
 *
 * `land` is row-major with the north row first; the result has its rows flipped,
 * because a texture is read with v running bottom to top.
 */
export function distanceToLand(land: Uint8Array, width: number, height: number): Uint8Array {
  const grid = new Float64Array(width * height);

  // Rows first, wrapping in longitude: run over a tripled row and keep the middle,
  // so the Pacific grows no seam.
  const n3 = width * 3;
  const f3 = new Float64Array(n3);
  const d3 = new Float64Array(n3);
  const v = new Int32Array(Math.max(n3, height));
  const z = new Float64Array(Math.max(n3, height) + 1);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let j = 0; j < n3; j++) f3[j] = land[row + (j % width)] ? 0 : INF;
    edt1d(f3, n3, d3, v, z);
    // An equirectangular texel is cos(latitude) narrower than it is tall; without
    // this the Arctic reads as the farthest place from any coast.
    const lat = 90 - ((y + 0.5) / height) * 180;
    const c = Math.max(0.15, Math.cos(lat * DEG));
    const c2 = c * c;
    for (let x = 0; x < width; x++) grid[row + x] = d3[width + x] * c2;
  }

  // Then columns.
  const f = new Float64Array(height);
  const d = new Float64Array(height);
  const out = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x];
    edt1d(f, height, d, v, z);
    for (let y = 0; y < height; y++) {
      const fraction = Math.min(1, Math.sqrt(d[y]) / DEPTH_RANGE);
      out[(height - 1 - y) * width + x] = Math.round(fraction * 255);
    }
  }
  return out;
}

/** Shared per country array, so every globe on the page derives these once. */
export type LandFields = {
  /** 4096 x 2048, white land on black, north at the top. */
  mask: HTMLCanvasElement;
  /** 2048 x 1024, 1 for land, north row first. */
  land: Uint8Array;
  /** 2048 x 1024 distance field, south row first. */
  depth: Uint8Array;
  heightScales: WeakMap<object, number>;
};

const FIELDS = new WeakMap<readonly PreparedCountry[], LandFields>();

export function landFields(countries: readonly PreparedCountry[]): LandFields {
  const cached = FIELDS.get(countries);
  if (cached) return cached;

  const mask = createCanvas(MASK_W, MASK_H);
  const maskCtx = mask.getContext('2d');
  if (!maskCtx) throw new Error('[globe] a 2D canvas is unavailable');
  paintCountries(maskCtx, countries, MASK_W, MASK_H);

  const small = createCanvas(DEPTH_W, DEPTH_H);
  const smallCtx = small.getContext('2d', { willReadFrequently: true });
  if (!smallCtx) throw new Error('[globe] a 2D canvas is unavailable');
  paintCountries(smallCtx, countries, DEPTH_W, DEPTH_H);
  const pixels = smallCtx.getImageData(0, 0, DEPTH_W, DEPTH_H).data;
  const land = new Uint8Array(DEPTH_W * DEPTH_H);
  for (let i = 0; i < land.length; i++) land[i] = pixels[i * 4] > 127 ? 1 : 0;

  const fields: LandFields = {
    mask,
    land,
    depth: distanceToLand(land, DEPTH_W, DEPTH_H),
    heightScales: new WeakMap(),
  };
  FIELDS.set(countries, fields);
  return fields;
}

/**
 * 1 / the 96th percentile of height over land (at least 24), because the peaks
 * occupy a thin slice of the 0-255 span and a handful of summits must not set the
 * scale for all.
 */
export function heightScaleOf(elevation: DecodedImage, fields: LandFields): number {
  const cached = fields.heightScales.get(elevation);
  if (cached !== undefined) return cached;

  const canvas = createCanvas(DEPTH_W, DEPTH_H);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 1 / 24;
  // A bitmap decoded with imageOrientation:'flipY' is upside down for a canvas;
  // flip it back, or the heights are read from the wrong hemisphere.
  if (isImageBitmap(elevation)) {
    ctx.translate(0, DEPTH_H);
    ctx.scale(1, -1);
  }
  ctx.drawImage(elevation, 0, 0, DEPTH_W, DEPTH_H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pixels = ctx.getImageData(0, 0, DEPTH_W, DEPTH_H).data;

  const histogram = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < fields.land.length; i++) {
    if (!fields.land[i]) continue;
    histogram[pixels[i * 4]] += 1;
    total += 1;
  }
  let p96 = 255;
  let running = 0;
  for (let value = 0; value < 256; value++) {
    running += histogram[value];
    if (running >= total * 0.96) {
      p96 = value;
      break;
    }
  }
  const scale = 1 / Math.max(24, p96);
  fields.heightScales.set(elevation, scale);
  return scale;
}

/** The land mask as a texture. A mask, so no sRGB decode to bend its midpoint. */
export function createMaskTexture(fields: LandFields): CanvasTexture {
  const texture = new CanvasTexture(fields.mask);
  texture.colorSpace = LinearSRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createDepthTexture(fields: LandFields): DataTexture {
  const texture = new DataTexture(fields.depth, DEPTH_W, DEPTH_H, RedFormat, UnsignedByteType);
  texture.colorSpace = LinearSRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}
