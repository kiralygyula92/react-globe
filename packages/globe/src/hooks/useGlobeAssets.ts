/**
 * Needs-driven asset loading. Each asset is fetched only once something asks for
 * it — with every geography layer off and the realistic style selected, none of
 * the vectors are fetched at all — and kept once it has arrived.
 *
 * A change of source resets that asset to empty first: different sources mean a
 * different globe. Late arrivals after unmount are dropped, and textures among
 * them disposed.
 */

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Texture } from 'three';
import type { FeatureCollection } from 'geojson';
import type { CapitalRecord } from '../types';
import type { PreparedCountry } from '../utils/geo';
import {
  DEFAULT_ASSETS,
  loadCapitals,
  loadCountries,
  loadDecodedImage,
  loadLines,
  loadTexture,
  type DecodedImage,
  type ResolvedAssets,
} from '../assets';

export type AssetNeeds = {
  countries: boolean;
  /** The shaded styles read the height + land-cover rasters. */
  elevation: boolean;
  coastline: boolean;
  borders: boolean;
  capitals: boolean;
  /** The realistic style's day / normal / specular / clouds. */
  textures: boolean;
};

export type LoadedAssets = {
  countries: readonly PreparedCountry[] | null;
  coastline: FeatureCollection | null;
  borders: FeatureCollection | null;
  capitals: readonly CapitalRecord[] | null;
  day: Texture | null;
  normal: Texture | null;
  specular: Texture | null;
  clouds: Texture | null;
  elevation: DecodedImage | null;
  cover: DecodedImage | null;
};

type ErrorRef = RefObject<(error: Error) => void>;

const asError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

/** One asset: loads while needed, keeps what arrived for the current source. */
function useLoaded<T>(
  source: unknown,
  need: boolean,
  load: () => Promise<T>,
  onErrorRef: ErrorRef,
  discard?: (value: T) => void,
): T | null {
  const [state, setState] = useState<{ source: unknown; value: T } | null>(null);
  const loadedFor = useRef<unknown>(undefined);

  useEffect(() => {
    if (!need || loadedFor.current === source) return;
    let alive = true;
    load().then(
      (value) => {
        if (!alive) {
          discard?.(value);
          return;
        }
        loadedFor.current = source;
        setState({ source, value });
      },
      (error: unknown) => {
        if (alive) onErrorRef.current(asError(error));
      },
    );
    return () => {
      alive = false;
    };
    // `load` closes over `source`; the source is the identity that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, need]);

  return state && state.source === source ? state.value : null;
}

/**
 * The bundled 8192 x 4096 day map takes real time to decode and upload, so the
 * globe wears the 2048 preview first and swaps up when the full map is ready.
 * Skipped for a consumer's own day texture: there is no small version of it.
 */
function useDayTexture(source: string, need: boolean, onErrorRef: ErrorRef): Texture | null {
  const [state, setState] = useState<{ source: string; value: Texture } | null>(null);
  const loadedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!need || loadedFor.current === source) return;
    let alive = true;
    let fullDayArrived = false;

    if (source === DEFAULT_ASSETS.dayTexture) {
      loadTexture(DEFAULT_ASSETS.dayPreview).then(
        (texture) => {
          if (!alive || fullDayArrived) {
            texture.dispose();
            return;
          }
          setState({ source, value: texture });
        },
        // The full load reports its own failure; a missing preview is not one.
        () => undefined,
      );
    }

    loadTexture(source).then(
      (texture) => {
        fullDayArrived = true;
        if (!alive) {
          texture.dispose();
          return;
        }
        loadedFor.current = source;
        setState({ source, value: texture });
      },
      (error: unknown) => {
        if (alive) onErrorRef.current(asError(error));
      },
    );

    return () => {
      alive = false;
    };
  }, [source, need, onErrorRef]);

  return state && state.source === source ? state.value : null;
}

const disposeTexture = (texture: Texture): void => texture.dispose();

export function useGlobeAssets(
  sources: ResolvedAssets,
  needs: AssetNeeds,
  onError: (error: Error) => void,
): LoadedAssets {
  // Held in a ref so the effects do not re-run when the callback changes identity.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const countries = useLoaded(sources.countriesGeoJson, needs.countries, () => loadCountries(sources.countriesGeoJson), onErrorRef);
  const coastline = useLoaded(sources.coastlineGeoJson, needs.coastline, () => loadLines(sources.coastlineGeoJson), onErrorRef);
  const borders = useLoaded(sources.bordersGeoJson, needs.borders, () => loadLines(sources.bordersGeoJson), onErrorRef);
  const capitals = useLoaded(sources.capitalsDataset, needs.capitals, () => loadCapitals(sources.capitalsDataset), onErrorRef);

  const day = useDayTexture(sources.dayTexture, needs.textures, onErrorRef);
  const normal = useLoaded(sources.normalMap, needs.textures, () => loadTexture(sources.normalMap), onErrorRef, disposeTexture);
  const specular = useLoaded(sources.specularMap, needs.textures, () => loadTexture(sources.specularMap), onErrorRef, disposeTexture);
  const clouds = useLoaded(sources.cloudsTexture, needs.textures, () => loadTexture(sources.cloudsTexture), onErrorRef, disposeTexture);

  const elevation = useLoaded(sources.elevation, needs.elevation, () => loadDecodedImage(sources.elevation), onErrorRef);
  // Land cover always comes from the bundled preview: it is a raster the shaders
  // read, not the picture the consumer chose to show.
  const cover = useLoaded(sources.dayPreview, needs.elevation, () => loadDecodedImage(sources.dayPreview), onErrorRef);

  return useMemo(
    () => ({ countries, coastline, borders, capitals, day, normal, specular, clouds, elevation, cover }),
    [countries, coastline, borders, capitals, day, normal, specular, clouds, elevation, cover],
  );
}
