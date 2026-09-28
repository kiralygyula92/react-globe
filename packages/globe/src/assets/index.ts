/**
 * Bundled asset URLs, and the page-lifetime caches that make a remount free.
 *
 * URLs resolve relative to the module with `new URL(..., import.meta.url)`,
 * which every modern bundler understands and native ESM supports. The library
 * build rewrites them to `./assets/<file>` next to `dist/index.js` and copies the
 * files there under stable names.
 *
 * Decoded images and parsed datasets are cached per URL and shared by every globe on
 * the page. They are kept while any globe is mounted and for a minute after the last
 * one unmounts, so a second globe or a quick remount loads nothing again, and leaving
 * the globe behind gives back the memory — the decoded day map alone is well over
 * 100 MB. `THREE.Texture` objects are deliberately not cached: each engine builds its
 * own from the shared image and disposes it on unmount.
 */

import { Texture } from 'three';
import type { FeatureCollection } from '../geojson';
import type { CapitalRecord, GlobeAssets } from '../types';
import { prepareCountries, type PreparedCountry } from '../utils/geo';

export const DEFAULT_ASSETS = {
  dayTexture: new URL('./earth-day-8192.jpg', import.meta.url).href,
  // Not part of GlobeAssets: the progressive preview of the bundled day map, and
  // the land-cover raster the shaded styles read.
  dayPreview: new URL('./earth-day-2048.jpg', import.meta.url).href,
  normalMap: new URL('./earth-normal-2048.jpg', import.meta.url).href,
  specularMap: new URL('./earth-specular-2048.jpg', import.meta.url).href,
  cloudsTexture: new URL('./earth-clouds-2048.jpg', import.meta.url).href,
  // Not part of GlobeAssets.
  elevation: new URL('./earth-topology.png', import.meta.url).href,
  countriesGeoJson: new URL('./countries-50m.geojson', import.meta.url).href,
  // Not part of GlobeAssets.
  coastlineGeoJson: new URL('./coastline-50m.geojson', import.meta.url).href,
  // Not part of GlobeAssets.
  bordersGeoJson: new URL('./borders-50m.geojson', import.meta.url).href,
  capitalsDataset: new URL('./capitals-50m.json', import.meta.url).href,
} as const;

export type ResolvedAssets = {
  [K in keyof typeof DEFAULT_ASSETS]: K extends keyof GlobeAssets ? NonNullable<GlobeAssets[K]> : string;
};

/** Defaults, then every defined member of the consumer's object. */
export const resolveAssets = (assets: GlobeAssets | undefined): ResolvedAssets =>
  ({
    ...DEFAULT_ASSETS,
    ...Object.fromEntries(Object.entries(assets ?? {}).filter(([, v]) => v !== undefined)),
  }) as ResolvedAssets;

/* ---------------------------------------------------------------------- caches */

/** How long the caches outlive the last globe on the page. */
export const RETAIN_MS = 60_000;

export type DecodedImage = HTMLImageElement | ImageBitmap;

const imageCache = new Map<string, Promise<DecodedImage>>();
const jsonCache = new Map<string, Promise<unknown>>();
const countriesByUrl = new Map<string, Promise<PreparedCountry[]>>();
const countriesByObject = new WeakMap<object, PreparedCountry[]>();

let mountedGlobes = 0;
let evictTimer: ReturnType<typeof setTimeout> | null = null;

/** Empties every cache, closing decoded bitmaps so their memory goes back at once. */
function evict(): void {
  evictTimer = null;
  if (mountedGlobes > 0) return;
  for (const pending of imageCache.values()) {
    pending.then(
      (image) => {
        if (isImageBitmap(image)) image.close();
      },
      () => undefined,
    );
  }
  imageCache.clear();
  jsonCache.clear();
  countriesByUrl.clear();
}

/**
 * Called by every globe when it mounts; the returned function when it unmounts. While
 * any globe holds the caches they are never emptied; after the last lets go they are
 * emptied once `RETAIN_MS` passes with no new globe.
 */
export function retainAssets(): () => void {
  mountedGlobes++;
  if (evictTimer !== null) {
    clearTimeout(evictTimer);
    evictTimer = null;
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    mountedGlobes--;
    if (mountedGlobes === 0) evictTimer = setTimeout(evict, RETAIN_MS);
  };
}

/** A rejected promise removes itself, so a retry is possible. */
function cached<T>(cache: Map<string, Promise<T>>, key: string, make: () => Promise<T>): Promise<T> {
  let pending = cache.get(key);
  if (!pending) {
    const created = make();
    pending = created;
    cache.set(key, created);
    created.catch(() => {
      if (cache.get(key) === created) cache.delete(key);
    });
  }
  return pending;
}

export const isImageBitmap = (image: unknown): image is ImageBitmap =>
  typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap;

const canDecodeOffThread = (): boolean => typeof createImageBitmap === 'function';

/**
 * Decodes off the main thread where the browser can: a 34-megapixel decode on the
 * main thread stalls the page hard enough to be felt several components away.
 * A bitmap arrives already flipped for WebGL (`imageOrientation: 'flipY'`).
 */
export function loadDecodedImage(url: string): Promise<DecodedImage> {
  return cached(imageCache, url, async () => {
    if (canDecodeOffThread()) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`[globe] could not load image: ${url} (${res.status})`);
      const blob = await res.blob();
      return createImageBitmap(blob, { imageOrientation: 'flipY' });
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error(`[globe] could not load image: ${url} (decode failed)`);
    }
    return image;
  });
}

/** A fresh texture over the shared decoded image. The caller owns and disposes it. */
export function textureFromImage(image: DecodedImage): Texture {
  const texture = new Texture(image);
  // A bitmap decoded with imageOrientation:'flipY' is already the right way up;
  // flipping again would put the north pole at the south.
  texture.flipY = !isImageBitmap(image);
  texture.needsUpdate = true;
  return texture;
}

export async function loadTexture(url: string): Promise<Texture> {
  return textureFromImage(await loadDecodedImage(url));
}

function loadJson(url: string): Promise<unknown> {
  return cached(jsonCache, url, async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[globe] could not load dataset: ${url} (${res.status})`);
    try {
      return await res.json();
    } catch {
      // Typically an HTML page served in place of a missing file, with a 200 status.
      throw new Error(`[globe] could not load dataset: ${url} (not JSON)`);
    }
  });
}

function asCollection(data: unknown, source: string): FeatureCollection {
  const value = data as FeatureCollection | null;
  if (!value || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new Error(`[globe] could not load dataset: ${source} (not a FeatureCollection)`);
  }
  return value;
}

/**
 * Prepared once per source and shared, so two globes on one page share one array
 * (and, keyed on it, one triangulated land mesh).
 */
export function loadCountries(source: string | FeatureCollection): Promise<PreparedCountry[]> {
  if (typeof source !== 'string') {
    let prepared = countriesByObject.get(source);
    if (!prepared) {
      // Rejected, not thrown: a bad object fails the same way a bad URL does.
      try {
        prepared = prepareCountries(asCollection(source, 'countriesGeoJson'));
      } catch (error) {
        return Promise.reject(error);
      }
      countriesByObject.set(source, prepared);
    }
    return Promise.resolve(prepared);
  }
  return cached(countriesByUrl, source, async () => prepareCountries(asCollection(await loadJson(source), source)));
}

export async function loadLines(url: string): Promise<FeatureCollection> {
  return asCollection(await loadJson(url), url);
}

export async function loadCapitals(source: string | CapitalRecord[]): Promise<CapitalRecord[]> {
  if (typeof source !== 'string') return source;
  const data = await loadJson(source);
  if (!Array.isArray(data)) throw new Error(`[globe] could not load dataset: ${source} (not an array)`);
  return data as CapitalRecord[];
}
