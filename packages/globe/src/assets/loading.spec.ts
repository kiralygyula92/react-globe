/** A dataset that fails to load says which one, and why, in the same words whatever went wrong. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CountryCollection } from '../types';
import { loadCapitals, loadCountries } from './index';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dataset loading errors', () => {
  it('names the dataset and the status when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not found', { status: 404 })));
    await expect(loadCapitals('https://example.test/gone.json')).rejects.toThrow('[globe] could not load dataset: https://example.test/gone.json (404)');
  });

  it('names the dataset when the response is not JSON', async () => {
    // A host that answers every path with its HTML page, as many single-page setups do.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<!DOCTYPE html><html></html>', { status: 200 })));
    await expect(loadCapitals('https://example.test/html.json')).rejects.toThrow('[globe] could not load dataset: https://example.test/html.json (not JSON)');
  });

  it('rejects a countries object that is not GeoJSON instead of throwing', async () => {
    // TopoJSON where GeoJSON belongs. A throw here would reach React's error boundary, which logs it.
    const topology = { type: 'Topology', objects: {}, arcs: [] } as unknown as CountryCollection;
    let pending: Promise<unknown> | undefined;
    expect(() => {
      pending = loadCountries(topology);
    }).not.toThrow();
    await expect(pending).rejects.toThrow('[globe] could not load dataset: countriesGeoJson (not a FeatureCollection)');
  });
});
