/** Override resolution and path shape, shared by the WebGL and custom renderers. */

import { describe, expect, it } from 'vitest';
import type { PinConnection } from '../../types';
import { SURFACE_LIFT, connectionPath, resolveConnection, type ConnectionDefaults } from './connections';

const DEFAULTS: ConnectionDefaults = {
  type: 'arch',
  archHeight: 0.55,
  lineStyle: 'solid',
  width: 2,
  color: 'rgb(255, 181, 61)',
};

const link = (extra: Partial<PinConnection> = {}): PinConnection => ({ id: 'l', from: 'a', to: 'b', ...extra });

describe('resolveConnection', () => {
  it('falls back to every globe-wide default', () => {
    expect(resolveConnection(link(), DEFAULTS)).toEqual({ ...DEFAULTS, animated: false });
  });

  it('lets a link override each member independently', () => {
    expect(resolveConnection(link({ type: 'line' }), DEFAULTS)).toEqual({ ...DEFAULTS, type: 'line', animated: false });
    expect(resolveConnection(link({ archHeight: 1.1 }), DEFAULTS).archHeight).toBe(1.1);
    expect(resolveConnection(link({ lineStyle: 'dotted' }), DEFAULTS).lineStyle).toBe('dotted');
    expect(resolveConnection(link({ width: 5 }), DEFAULTS).width).toBe(5);
    expect(resolveConnection(link({ color: 'red' }), DEFAULTS).color).toBe('red');
    expect(resolveConnection(link({ width: 5 }), DEFAULTS).color).toBe(DEFAULTS.color);
  });

  it('draws an animated solid link dashed', () => {
    expect(resolveConnection(link({ animated: true }), DEFAULTS).lineStyle).toBe('dashed');
    expect(resolveConnection(link({ animated: true, lineStyle: 'solid' }), DEFAULTS).lineStyle).toBe('dashed');
  });

  it('keeps an animated dotted link dotted', () => {
    const resolved = resolveConnection(link({ animated: true, lineStyle: 'dotted' }), DEFAULTS);
    expect(resolved.lineStyle).toBe('dotted');
    expect(resolved.animated).toBe(true);
  });
});

describe('connectionPath', () => {
  const london = { lat: 51.5, lng: -0.13 };
  const paris = { lat: 48.86, lng: 2.35 };
  const sydney = { lat: -33.87, lng: 151.21 };

  it('keeps a line on the surface lift', () => {
    for (const point of connectionPath({ from: london, to: sydney }, 'line', 0.55)) {
      expect(point.length()).toBeCloseTo(SURFACE_LIFT, 6);
    }
  });

  it('lifts an arch in the middle, above both ends', () => {
    const path = connectionPath({ from: london, to: sydney }, 'arch', 0.55);
    const mid = path[Math.floor(path.length / 2)].length();
    expect(mid).toBeGreaterThan(path[0].length());
    expect(mid).toBeGreaterThan(path[path.length - 1].length());
  });

  it('arches a longer link higher than a shorter one', () => {
    const peak = (to: { lat: number; lng: number }) =>
      Math.max(...connectionPath({ from: london, to }, 'arch', 0.55).map((p) => p.length()));
    expect(peak(sydney)).toBeGreaterThan(peak(paris));
  });
});
