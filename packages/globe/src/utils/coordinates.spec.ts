/**
 * The landmark contract. If the sign convention or the texture orientation ever
 * flips, one of these lands in the wrong place.
 */

import { describe, expect, it } from 'vitest';
import { SphereGeometry, Vector3 } from 'three';
import countriesRaw from '../assets/countries-50m.geojson?raw';
import {
  fitBounds,
  greatCircleAngle,
  greatCircleFraction,
  greatCirclePath,
  latLngToUv,
  latLngToVector3,
  vector3ToLatLng,
  wrapLng,
} from './coordinates';
import { findCountryAt, prepareCountries } from './geo';

const GULF_OF_GUINEA = { lat: 0, lng: 0 };
const LONDON = { lat: 51.5074, lng: -0.1278 };
const SYDNEY = { lat: -33.8688, lng: 151.2093 };
const EARTH_RADIUS_KM = 6371;

const countries = prepareCountries(JSON.parse(countriesRaw));

describe('landmarks on the real dataset', () => {
  it('finds open water at (0, 0)', () => {
    expect(findCountryAt(countries, GULF_OF_GUINEA.lat, GULF_OF_GUINEA.lng)).toBeNull();
  });

  it('finds the United Kingdom at London', () => {
    const country = findCountryAt(countries, LONDON.lat, LONDON.lng);
    expect(country?.feature.properties.isoA3 ?? country?.id).toBe('GBR');
    expect(country?.name).toBe('United Kingdom');
  });

  it('finds Australia at Sydney', () => {
    const country = findCountryAt(countries, SYDNEY.lat, SYDNEY.lng);
    expect(country?.id).toBe('AUS');
    expect(country?.name).toBe('Australia');
  });
});

describe('latLngToVector3', () => {
  it('is exactly SphereGeometry’s own vertex formula', () => {
    const sphere = new SphereGeometry(1, 16, 8);
    const position = sphere.getAttribute('position');
    const uv = sphere.getAttribute('uv');
    const vertex = new Vector3();
    for (let i = 0; i < position.count; i++) {
      const lng = uv.getX(i) * 360 - 180;
      const lat = uv.getY(i) * 180 - 90;
      vertex.fromBufferAttribute(position, i);
      const ours = latLngToVector3(lat, lng, 1);
      expect(ours.distanceTo(vertex)).toBeLessThan(1e-6);
    }
    sphere.dispose();
  });

  it('puts the north pole up and (0, 0) facing +x... or wherever three puts it, consistently', () => {
    expect(latLngToVector3(90, 0).y).toBeCloseTo(1, 10);
    expect(latLngToVector3(-90, 0).y).toBeCloseTo(-1, 10);
    expect(latLngToVector3(0, 0, 2).length()).toBeCloseTo(2, 10);
  });
});

describe('vector3ToLatLng', () => {
  it('round-trips, including at the antimeridian and near the poles', () => {
    const cases = [
      { lat: 0, lng: 0 },
      { lat: 51.5, lng: -0.12 },
      { lat: -33.8, lng: 151.2 },
      { lat: 10, lng: 179.999 },
      { lat: -10, lng: -179.999 },
      { lat: 89.9, lng: 45 },
      { lat: -89.9, lng: -120 },
    ];
    for (const point of cases) {
      const back = vector3ToLatLng(latLngToVector3(point.lat, point.lng, 3));
      expect(back.lat).toBeCloseTo(point.lat, 6);
      expect(wrapLng(back.lng - point.lng)).toBeCloseTo(0, 6);
    }
  });
});

describe('wrapLng', () => {
  it('wraps over its full range', () => {
    expect(wrapLng(0)).toBe(0);
    expect(wrapLng(179.5)).toBe(179.5);
    expect(wrapLng(180)).toBe(-180);
    expect(wrapLng(-180)).toBe(-180);
    expect(wrapLng(190)).toBeCloseTo(-170, 10);
    expect(wrapLng(-190)).toBeCloseTo(170, 10);
    expect(wrapLng(540)).toBe(-180);
    expect(wrapLng(-721)).toBeCloseTo(-1, 10);
  });
});

describe('latLngToUv', () => {
  it('maps the corners, v running bottom to top', () => {
    expect(latLngToUv(-90, -180)).toEqual({ u: 0, v: 0 });
    expect(latLngToUv(90, 180)).toEqual({ u: 1, v: 1 });
    expect(latLngToUv(0, 0)).toEqual({ u: 0.5, v: 0.5 });
  });
});

describe('great circles', () => {
  it('measures London to Sydney within a percent of 16 990 km', () => {
    const km = greatCircleAngle(LONDON, SYDNEY) * EARTH_RADIUS_KM;
    expect(Math.abs(km - 16990) / 16990).toBeLessThan(0.01);
  });

  it('reports the fraction of a half-turn', () => {
    expect(greatCircleFraction({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
    expect(greatCircleFraction({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(1, 10);
  });

  it('returns segments + 1 points, all at the requested lift', () => {
    const path = greatCirclePath(LONDON, SYDNEY, 32, () => 1.5);
    expect(path).toHaveLength(33);
    for (const point of path) expect(point.length()).toBeCloseTo(1.5, 6);
    expect(vector3ToLatLng(path[0]).lat).toBeCloseTo(LONDON.lat, 4);
    expect(vector3ToLatLng(path[32]).lat).toBeCloseTo(SYDNEY.lat, 4);
  });

  it('handles an antipodal pair without producing NaN', () => {
    const path = greatCirclePath({ lat: 0, lng: 0 }, { lat: 0, lng: 180 }, 16, () => 1);
    for (const point of path) {
      expect(Number.isNaN(point.x) || Number.isNaN(point.y) || Number.isNaN(point.z)).toBe(false);
      expect(point.length()).toBeCloseTo(1, 6);
    }
  });
});

describe('fitBounds', () => {
  it('gives a small zoom for a tight cluster', () => {
    const pose = fitBounds(
      [
        { lat: 48.85, lng: 2.35 },
        { lat: 48.72, lng: 2.36 },
        { lat: 49.0, lng: 2.55 },
      ],
      1.1,
      4,
    );
    expect(pose.zoom).toBe(1.1);
    expect(pose.lat).toBeGreaterThan(48.7);
    expect(pose.lat).toBeLessThan(49.0);
  });

  it('clamps a globe-spanning set to maxZoom', () => {
    const pose = fitBounds([LONDON, SYDNEY, { lat: 40, lng: -74 }, { lat: -23, lng: -43 }], 1.1, 4);
    expect(pose.zoom).toBe(4);
  });

  it('returns maxZoom for an empty set', () => {
    expect(fitBounds([], 1.1, 4).zoom).toBe(4);
  });
});
