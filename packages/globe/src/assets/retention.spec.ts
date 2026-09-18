/** The shared caches: kept while any globe is mounted, emptied a while after the last one leaves. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RETAIN_MS, loadCapitals, retainAssets } from './index';

const URL_A = 'https://example.test/capitals-a.json';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn(async () => new Response(JSON.stringify([{ id: 'x', name: 'X', lat: 0, lng: 0 }])));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  // Let every pending eviction run, so one test's caches never leak into the next.
  vi.advanceTimersByTime(RETAIN_MS * 2);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('asset retention', () => {
  it('shares a loaded dataset between globes', async () => {
    const release = retainAssets();
    await loadCapitals(URL_A);
    await loadCapitals(URL_A);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release();
  });

  it('survives a quick remount', async () => {
    let release = retainAssets();
    await loadCapitals(URL_A);
    release();
    vi.advanceTimersByTime(RETAIN_MS / 2);
    release = retainAssets();
    await loadCapitals(URL_A);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release();
  });

  it('gives the memory back once no globe has been mounted for a while', async () => {
    const release = retainAssets();
    await loadCapitals(URL_A);
    release();
    vi.advanceTimersByTime(RETAIN_MS + 1);
    const again = retainAssets();
    await loadCapitals(URL_A);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    again();
  });

  it('never empties the caches while a globe is still mounted', async () => {
    const first = retainAssets();
    const second = retainAssets();
    await loadCapitals(URL_A);
    first();
    vi.advanceTimersByTime(RETAIN_MS * 3);
    await loadCapitals(URL_A);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    second();
  });

  it('ignores a release called twice', async () => {
    const first = retainAssets();
    const second = retainAssets();
    await loadCapitals(URL_A);
    first();
    first();
    vi.advanceTimersByTime(RETAIN_MS * 3);
    await loadCapitals(URL_A);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    second();
  });
});
