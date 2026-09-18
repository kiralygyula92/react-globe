/** The hover fill must outline the country of the dataset in use, not a cached older one. */

import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Position } from '../../geojson';
import { prepareCountries, type PreparedCountry } from '../../utils/geo';
import { HighlightLayer } from './HighlightLayer';

const box = (w: number, s: number, e: number, n: number): Position[] => [
  [w, s],
  [e, s],
  [e, n],
  [w, n],
  [w, s],
];

function country(ring: Position[]): PreparedCountry {
  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { name: 'Box', isoA3: 'BOX' }, geometry: { type: 'Polygon', coordinates: [ring] } }],
  };
  return prepareCountries(collection)[0];
}

describe('HighlightLayer', () => {
  it('reuses the geometry for the same country', () => {
    const layer = new HighlightLayer();
    const small = country(box(0, 0, 10, 10));
    layer.show(small);
    const first = layer.mesh.geometry;
    layer.show(null);
    layer.show(small);
    expect(layer.mesh.geometry).toBe(first);
    layer.dispose();
  });

  it('rebuilds when a new dataset brings a country with the same id', () => {
    const layer = new HighlightLayer();
    const before = country(box(0, 0, 10, 10));
    const after = country(box(0, 0, 40, 40));
    expect(after.id).toBe(before.id);

    layer.show(before);
    const stale = layer.mesh.geometry;
    layer.show(after);
    expect(layer.mesh.geometry).not.toBe(stale);
    expect(layer.mesh.geometry.getAttribute('position').count).toBeGreaterThan(stale.getAttribute('position').count);
    layer.dispose();
  });
});
