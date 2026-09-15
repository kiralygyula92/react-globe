/** Every documented default, asserted by value, so none can drift from the README unnoticed. */

import { describe, expect, it } from 'vitest';
import {
  AUTO_ROTATE_SPEED,
  DEFAULT_CAMERA,
  DEFAULT_FLIGHT_MS,
  GLOBE_DEFAULTS,
  HIGHLIGHT_BY_STYLE,
  LAT_CLAMP_DEG,
  ROTATE_STEP_DEG,
  TILT_MAX_DEG,
  TILT_MIN_DEG,
  ZOOM_STEP,
  clampPose,
  highlightFor,
  homePose,
  mergePose,
  posesMatch,
  resolveGlobeProps,
} from './defaults';

describe('GLOBE_DEFAULTS', () => {
  it('holds every documented default', () => {
    expect(GLOBE_DEFAULTS.width).toBe('100%');
    expect(GLOBE_DEFAULTS.height).toBe('100%');

    expect(GLOBE_DEFAULTS.enableZoom).toBe(true);
    expect(GLOBE_DEFAULTS.minZoom).toBe(1.1);
    expect(GLOBE_DEFAULTS.maxZoom).toBe(4.0);
    expect(GLOBE_DEFAULTS.enableRotation).toBe(true);
    expect(GLOBE_DEFAULTS.enableTilt).toBe(true);
    expect(GLOBE_DEFAULTS.showControls).toBe(false);

    expect(GLOBE_DEFAULTS.showShorelines).toBe(true);
    expect(GLOBE_DEFAULTS.showCountryBorders).toBe(true);
    expect(GLOBE_DEFAULTS.showCountryNames).toBe(false);
    expect(GLOBE_DEFAULTS.showCapitals).toBe(false);
    expect(GLOBE_DEFAULTS.capitalsMinZoom).toBe(2.5);
    expect(GLOBE_DEFAULTS.countryNamesMinZoom).toBe(0);
    expect(GLOBE_DEFAULTS.highlightCountryOnHover).toBe(false);
    expect(GLOBE_DEFAULTS.showCountryNameOnHover).toBe(false);
    expect(GLOBE_DEFAULTS.showGraticule).toBe(false);
    expect(GLOBE_DEFAULTS.showGraticuleLabels).toBe(false);

    expect(GLOBE_DEFAULTS.renderStyle).toBe('standard');
    expect(GLOBE_DEFAULTS.colorScheme).toBe('color');
    expect(GLOBE_DEFAULTS.showClouds).toBe(true);
    expect(GLOBE_DEFAULTS.backgroundColor).toBe('transparent');

    expect(GLOBE_DEFAULTS.showPinPopup).toBe(false);
    expect(GLOBE_DEFAULTS.enablePinClustering).toBe(true);
    expect(GLOBE_DEFAULTS.clusterZoomThreshold).toBe(2.0);
    expect(GLOBE_DEFAULTS.clusterRadiusPx).toBe(44);

    expect(GLOBE_DEFAULTS.enableConnections).toBe(false);
    expect(GLOBE_DEFAULTS.connectionType).toBe('arch');
    expect(GLOBE_DEFAULTS.archHeight).toBe(0.55);
    expect(GLOBE_DEFAULTS.connectionLineStyle).toBe('solid');
    expect(GLOBE_DEFAULTS.connectionWidth).toBe(2);
    expect(GLOBE_DEFAULTS.connectionColor).toBe('rgb(255, 181, 61)');

    expect(GLOBE_DEFAULTS.locale).toBe('en');
  });

  it('holds the camera and interaction constants', () => {
    expect(DEFAULT_CAMERA).toEqual({ lat: 20, lng: 0, zoom: 3.2, tilt: 0 });
    expect(Object.isFrozen(DEFAULT_CAMERA)).toBe(true);
    expect(TILT_MIN_DEG).toBe(0);
    expect(TILT_MAX_DEG).toBe(75);
    expect(LAT_CLAMP_DEG).toBe(85);
    expect(ZOOM_STEP).toBe(0.2);
    expect(ROTATE_STEP_DEG).toBe(24);
    expect(DEFAULT_FLIGHT_MS).toBe(900);
    expect(AUTO_ROTATE_SPEED).toBe(0.12);
  });
});

describe('resolveGlobeProps', () => {
  it('resolves the highlight colour for the default style', () => {
    expect(resolveGlobeProps({}).countryHighlightColor).toBe(HIGHLIGHT_BY_STYLE.standard);
  });

  it('follows the render style when resolving the highlight colour', () => {
    expect(resolveGlobeProps({ renderStyle: 'modern' }).countryHighlightColor).toBe(HIGHLIGHT_BY_STYLE.modern);
  });

  it('lets a string highlight colour win for every style', () => {
    for (const renderStyle of ['standard', 'realistic', 'cartoon', 'modern'] as const) {
      expect(resolveGlobeProps({ renderStyle, countryHighlightColor: 'red' }).countryHighlightColor).toBe('red');
    }
  });

  it('falls back per style for styles an object override omits', () => {
    const override = { cartoon: 'rgb(1, 2, 3)' };
    expect(resolveGlobeProps({ renderStyle: 'cartoon', countryHighlightColor: override }).countryHighlightColor).toBe(
      'rgb(1, 2, 3)',
    );
    expect(resolveGlobeProps({ renderStyle: 'realistic', countryHighlightColor: override }).countryHighlightColor).toBe(
      HIGHLIGHT_BY_STYLE.realistic,
    );
    expect(highlightFor('modern', undefined)).toBe(HIGHLIGHT_BY_STYLE.modern);
  });

  it('does not let an explicitly undefined prop override its default', () => {
    const resolved = resolveGlobeProps({ minZoom: undefined, renderStyle: undefined, enableZoom: undefined });
    expect(resolved.minZoom).toBe(1.1);
    expect(resolved.renderStyle).toBe('standard');
    expect(resolved.enableZoom).toBe(true);
  });

  it('passes defined props through', () => {
    const resolved = resolveGlobeProps({ minZoom: 1.5, enableZoom: false, className: 'x' });
    expect(resolved.minZoom).toBe(1.5);
    expect(resolved.enableZoom).toBe(false);
    expect(resolved.className).toBe('x');
  });

  it('keeps the identity of omitted pins and connections stable', () => {
    const a = resolveGlobeProps({});
    const b = resolveGlobeProps({});
    expect(a.pins).toBe(b.pins);
    expect(a.connections).toBe(b.connections);
    expect(a.pins).toEqual([]);
    expect(a.connections).toEqual([]);
  });
});

describe('clampPose', () => {
  const clamp = (pose: Partial<{ lat: number; lng: number; zoom: number; tilt: number }>) =>
    clampPose({ lat: 0, lng: 0, zoom: 2, tilt: 0, ...pose }, 1.1, 4);

  it('clamps latitude to +-85', () => {
    expect(clamp({ lat: 90 }).lat).toBe(85);
    expect(clamp({ lat: -120 }).lat).toBe(-85);
    expect(clamp({ lat: 40 }).lat).toBe(40);
  });

  it('clamps tilt to [0, 75]', () => {
    expect(clamp({ tilt: -40 }).tilt).toBe(0);
    expect(clamp({ tilt: 140 }).tilt).toBe(75);
    expect(clamp({ tilt: 30 }).tilt).toBe(30);
  });

  it('clamps zoom to the given range', () => {
    expect(clamp({ zoom: 0.1 }).zoom).toBe(1.1);
    expect(clamp({ zoom: 99 }).zoom).toBe(4);
    expect(clamp({ zoom: 2.5 }).zoom).toBe(2.5);
  });

  it('wraps longitude into [-180, 180)', () => {
    expect(clamp({ lng: 190 }).lng).toBeCloseTo(-170, 10);
    expect(clamp({ lng: -190 }).lng).toBeCloseTo(170, 10);
    expect(clamp({ lng: 180 }).lng).toBe(-180);
    expect(clamp({ lng: -180 }).lng).toBe(-180);
    expect(clamp({ lng: 720 + 45 }).lng).toBeCloseTo(45, 10);
  });
});

describe('homePose', () => {
  it('uses defaultCenter for lat/lng and keeps the default zoom', () => {
    expect(homePose(undefined, { lat: 25, lng: 8 })).toEqual({ lat: 25, lng: 8, zoom: 3.2, tilt: 0 });
  });

  it('lets defaultCamera win member-wise over defaultCenter', () => {
    expect(homePose({ lat: 10, zoom: 3 }, { lat: 25, lng: 8 })).toEqual({ lat: 10, lng: 8, zoom: 3, tilt: 0 });
    expect(homePose({ zoom: 2.8, tilt: 0 }, { lat: 25, lng: 8 })).toEqual({ lat: 25, lng: 8, zoom: 2.8, tilt: 0 });
  });

  it('falls back to DEFAULT_CAMERA with neither', () => {
    expect(homePose(undefined, undefined)).toEqual(DEFAULT_CAMERA);
  });
});

describe('mergePose', () => {
  it('ignores undefined members', () => {
    expect(mergePose({ lat: 1, lng: 2, zoom: 3, tilt: 4 }, { lat: undefined, zoom: 9 })).toEqual({
      lat: 1,
      lng: 2,
      zoom: 9,
      tilt: 4,
    });
    expect(mergePose({ lat: 1, lng: 2, zoom: 3, tilt: 4 }, undefined)).toEqual({ lat: 1, lng: 2, zoom: 3, tilt: 4 });
  });
});

describe('posesMatch', () => {
  const base = { lat: 10, lng: 20, zoom: 2, tilt: 5 };

  it('matches inside each tolerance', () => {
    expect(posesMatch(base, { ...base, lat: 10.009 })).toBe(true);
    expect(posesMatch(base, { ...base, lng: 20.009 })).toBe(true);
    expect(posesMatch(base, { ...base, zoom: 2.0009 })).toBe(true);
    expect(posesMatch(base, { ...base, tilt: 5.009 })).toBe(true);
  });

  it('fails just outside each tolerance', () => {
    expect(posesMatch(base, { ...base, lat: 10.011 })).toBe(false);
    expect(posesMatch(base, { ...base, lng: 20.011 })).toBe(false);
    expect(posesMatch(base, { ...base, zoom: 2.0011 })).toBe(false);
    expect(posesMatch(base, { ...base, tilt: 5.011 })).toBe(false);
  });

  it('wraps longitude across the antimeridian', () => {
    expect(posesMatch({ ...base, lng: 179.999 }, { ...base, lng: -179.999 })).toBe(true);
  });
});
