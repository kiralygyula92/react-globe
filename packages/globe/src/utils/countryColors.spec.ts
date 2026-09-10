/** Graph colouring: touching countries never share a slot. */

import { describe, expect, it } from 'vitest';
import type { Feature, FeatureCollection } from 'geojson';
import { assignCountryColors, countryAdjacency } from './countryColors';
import { prepareCountries } from './geo';

const boxFeature = (w: number, s: number, name: string): Feature => ({
  type: 'Feature',
  properties: { name, id: name },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [w, s],
        [w + 1, s],
        [w + 1, s + 1],
        [w, s + 1],
        [w, s],
      ],
    ],
  },
});

/** Unit boxes that share edges and corners: every interior box has eight neighbours. */
function grid(size: number, extra: Feature[] = []) {
  const features: Feature[] = [];
  for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) features.push(boxFeature(x, y, `c${x}-${y}`));
  const collection: FeatureCollection = { type: 'FeatureCollection', features: [...features, ...extra] };
  return prepareCountries(collection);
}

describe('assignCountryColors', () => {
  it('never gives touching countries the same slot', () => {
    const countries = grid(6);
    const slots = assignCountryColors(countries, 6);
    const neighbours = countryAdjacency(countries);
    let pairs = 0;
    neighbours.forEach((set, i) => {
      for (const j of set) {
        pairs += 1;
        expect(slots[i]).not.toBe(slots[j]);
      }
    });
    expect(pairs).toBeGreaterThan(0);
  });

  it('derives corner-sharing neighbours', () => {
    const countries = grid(3);
    const neighbours = countryAdjacency(countries);
    const centre = countries.findIndex((c) => c.id === 'c1-1');
    expect(neighbours[centre].size).toBe(8);
  });

  it('gives every country a slot in range', () => {
    const slots = assignCountryColors(grid(5), 6);
    for (const slot of slots) {
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(6);
    }
  });

  it('gives an isolated country a slot too', () => {
    const countries = grid(3, [boxFeature(100, 50, 'island')]);
    const slots = assignCountryColors(countries, 6);
    const island = countries.findIndex((c) => c.id === 'island');
    expect(slots[island]).toBeGreaterThanOrEqual(0);
    expect(slots[island]).toBeLessThan(6);
  });

  it('still assigns a slot when neighbours outnumber the palette', () => {
    const slots = assignCountryColors(grid(3), 2);
    for (const slot of slots) expect([0, 1]).toContain(slot);
  });

  it('is deterministic', () => {
    const a = assignCountryColors(grid(6), 6);
    const b = assignCountryColors(grid(6), 6);
    expect(a).toEqual(b);
  });
});
