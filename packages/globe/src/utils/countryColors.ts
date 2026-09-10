/**
 * Palette-slot assignment for the cartoon style: a graph colouring, not a cycle.
 *
 * Cycling by index lets the dataset's ordering decide, and that ordering is close
 * enough to alphabetical that neighbours regularly came out the same hue and read
 * as one country. The property that matters: touching countries never share a slot.
 */

import type { PreparedCountry } from './geo';

/**
 * Two countries are neighbours when their outlines share a point. Natural Earth
 * cuts countries from one topology, so a shared border really is the same
 * coordinates on both sides; rounding to 5 decimals guards against a float that
 * survived JSON differently on each side.
 */
export function countryAdjacency(countries: readonly PreparedCountry[]): Set<number>[] {
  const owners = new Map<string, number[]>();

  countries.forEach((country, index) => {
    // Each country records each of its own points once, or every ring becomes a
    // self-neighbour and the join slows down.
    const own = new Set<string>();
    for (const polygon of country.polygons) {
      for (const ring of polygon.rings) {
        for (const [lng, lat] of ring) own.add(`${lng.toFixed(5)},${lat.toFixed(5)}`);
      }
    }
    for (const key of own) {
      const list = owners.get(key);
      if (list) list.push(index);
      else owners.set(key, [index]);
    }
  });

  const neighbours = countries.map(() => new Set<number>());
  for (const list of owners.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        neighbours[list[i]].add(list[j]);
        neighbours[list[j]].add(list[i]);
      }
    }
  }
  return neighbours;
}

/**
 * Welsh-Powell: most-connected first (ties by index, for determinism), each
 * taking the free slot used least so far. A country with no free slot takes the
 * least-used slot overall rather than none.
 */
export function assignCountryColors(countries: readonly PreparedCountry[], paletteSize: number): number[] {
  const size = Math.max(1, Math.floor(paletteSize));
  const neighbours = countryAdjacency(countries);
  const order = countries.map((_, i) => i).sort((a, b) => neighbours[b].size - neighbours[a].size || a - b);

  const slots = new Array<number>(countries.length).fill(-1);
  const usage = new Array<number>(size).fill(0);

  for (const country of order) {
    const taken = new Set<number>();
    for (const n of neighbours[country]) if (slots[n] >= 0) taken.add(slots[n]);

    let pick = -1;
    for (let slot = 0; slot < size; slot++) {
      if (taken.has(slot)) continue;
      if (pick < 0 || usage[slot] < usage[pick]) pick = slot;
    }
    if (pick < 0) {
      pick = 0;
      for (let slot = 1; slot < size; slot++) if (usage[slot] < usage[pick]) pick = slot;
    }

    slots[country] = pick;
    usage[pick] += 1;
  }

  return slots;
}
