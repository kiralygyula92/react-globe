/**
 * The documented behaviour of a globe that cannot run (docs: Testing guide, Error
 * handling): jsdom has no WebGL, so the globe must report through onError and render
 * its wordless fallback without throwing into the host tree.
 */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Globe } from './Globe';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const containers: HTMLElement[] = [];
afterEach(() => {
  for (const c of containers.splice(0)) c.remove();
  vi.restoreAllMocks();
});

describe('Globe without WebGL', () => {
  it('reports the failure through onError and renders the fallback instead of throwing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    document.body.append(container);
    containers.push(container);
    const onError = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <div style={{ height: 300 }}>
          <Globe onError={onError} />
        </div>,
      );
    });

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(container.querySelector('[data-globe-fallback]')).not.toBeNull();
    expect(container.querySelector('canvas')).toBeNull();

    await act(async () => root.unmount());
  });

  it('keeps sibling content rendered when the globe fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    document.body.append(container);
    containers.push(container);

    const root = createRoot(container);
    await act(async () => {
      root.render(
        <main>
          <h1>Report</h1>
          <Globe />
        </main>,
      );
    });

    expect(container.querySelector('h1')?.textContent).toBe('Report');
    await act(async () => root.unmount());
  });
});
