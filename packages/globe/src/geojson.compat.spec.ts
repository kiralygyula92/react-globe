/**
 * The package declares its own GeoJSON types so it can ship with no dependencies.
 * These assignments are the contract that keeps that invisible: anything typed by
 * `@types/geojson` — what most libraries return — goes in and comes out without a cast.
 *
 * The test is the compile: `pnpm typecheck` fails if the shapes drift apart.
 */

import type {
  Feature as TheirFeature,
  FeatureCollection as TheirFeatureCollection,
  Geometry as TheirGeometry,
  MultiPolygon as TheirMultiPolygon,
  Polygon as TheirPolygon,
  Position as TheirPosition,
} from 'geojson';
import { describe, expect, it } from 'vitest';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from './geojson';
import type { CountryCollection, GlobeAssets } from './types';

/** Both directions, because a consumer both passes collections in and reads features out. */
type Exchangeable<Ours, Theirs> = [Theirs extends Ours ? true : false, Ours extends Theirs ? true : false];
type BothWays = [true, true];
const exchangeable = <T extends BothWays>(): T => [true, true] as T;

describe('the GeoJSON types this package declares', () => {
  it('exchanges with the ones @types/geojson defines', () => {
    exchangeable<Exchangeable<Position, TheirPosition>>();
    exchangeable<Exchangeable<Polygon, TheirPolygon>>();
    exchangeable<Exchangeable<MultiPolygon, TheirMultiPolygon>>();
    exchangeable<Exchangeable<Geometry, TheirGeometry>>();
    exchangeable<Exchangeable<Feature, TheirFeature>>();
    exchangeable<Exchangeable<FeatureCollection, TheirFeatureCollection>>();
    expect(true).toBe(true);
  });

  it('accepts a collection typed by @types/geojson as a country dataset', () => {
    const theirs: TheirFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
          properties: { name: 'Somewhere', iso_a3: 'SOM' },
        },
      ],
    };

    // The prop a consumer would pass it to.
    const assets: GlobeAssets = { countriesGeoJson: theirs };
    expect(assets.countriesGeoJson).toBe(theirs);

    // And the other way: what the globe hands back to an onCountryClick handler.
    const ours: CountryCollection = theirs as CountryCollection;
    const back: TheirFeatureCollection = ours;
    expect(back.features).toHaveLength(1);
  });
});
