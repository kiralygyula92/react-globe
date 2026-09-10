/**
 * Coordinate maths: lat/lng <-> sphere vectors, great circles, and bounds fitting.
 *
 * The mapping is exactly `THREE.SphereGeometry`'s own vertex formula with its
 * default `phiStart` / `thetaStart`, so an equirectangular texture whose left
 * edge is -180 degrees lands on the sphere unmirrored. Everything in the module
 * is built on this; the landmark tests are what pin it down.
 */

import { Vector3 } from 'three';
import type { LatLng } from '../types';

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * phi = (90 - lat) polar angle, 0 at the north pole;
 * theta = (lng + 180) azimuth, 0 at the antimeridian.
 */
export function latLngToVector3(lat: number, lng: number, radius = 1, target = new Vector3()): Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  const s = Math.sin(phi);
  return target.set(-radius * s * Math.cos(theta), radius * Math.cos(phi), radius * s * Math.sin(theta));
}

/** Inverse of `latLngToVector3`; the vector's length is ignored. */
export function vector3ToLatLng(v: Vector3): LatLng {
  const r = v.length();
  if (r < 1e-12) return { lat: 0, lng: 0 };
  const lat = 90 - Math.acos(clamp(v.y / r, -1, 1)) * RAD;
  const theta = Math.atan2(v.z, -v.x);
  return { lat, lng: wrapLng(theta * RAD - 180) };
}

/** Texture coordinates; v runs bottom to top, matching three's convention. */
export function latLngToUv(lat: number, lng: number): { u: number; v: number } {
  return { u: (lng + 180) / 360, v: (lat + 90) / 180 };
}

/** Wraps a longitude into [-180, 180). */
export function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/** Central angle in radians. Haversine, so it stays accurate when the points are close. */
export function greatCircleAngle(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 0 for coincident points, 1 for antipodal ones. */
export function greatCircleFraction(a: LatLng, b: LatLng): number {
  return greatCircleAngle(a, b) / Math.PI;
}

/** Spherical interpolation between two unit vectors. */
export function slerp(a: Vector3, b: Vector3, t: number, target = new Vector3()): Vector3 {
  const dot = clamp(a.dot(b), -1, 1);
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  if (sinOmega < 1e-6) return target.copy(a).lerp(b, t).normalize();
  const wa = Math.sin((1 - t) * omega) / sinOmega;
  const wb = Math.sin(t * omega) / sinOmega;
  return target.set(a.x * wa + b.x * wb, a.y * wa + b.y * wb, a.z * wa + b.z * wb);
}

/**
 * `segments + 1` points along the great circle from `a` to `b`, each lifted to
 * the radius `lift(t)` returns for its fraction of the way along.
 */
export function greatCirclePath(
  a: LatLng,
  b: LatLng,
  segments: number,
  lift: (t: number) => number,
): Vector3[] {
  const from = latLngToVector3(a.lat, a.lng, 1).normalize();
  const to = latLngToVector3(b.lat, b.lng, 1).normalize();
  // Antipodal endpoints have no unique plane; nudge one so the slerp has one.
  if (from.dot(to) < -0.999999) {
    to.x += 1e-4;
    to.normalize();
  }
  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push(slerp(from, to, t).normalize().multiplyScalar(lift(t)));
  }
  return points;
}

/**
 * The pose that frames every point: the spherical mean of the members, at the
 * distance whose visible cap reaches the widest of them with some margin.
 */
export function fitBounds(
  points: readonly LatLng[],
  minZoom: number,
  maxZoom: number,
): { lat: number; lng: number; zoom: number } {
  if (points.length === 0) return { lat: 0, lng: 0, zoom: maxZoom };

  const sum = new Vector3();
  const scratch = new Vector3();
  for (const p of points) sum.add(latLngToVector3(p.lat, p.lng, 1, scratch));
  const centre = sum.lengthSq() < 1e-12 ? { lat: points[0].lat, lng: points[0].lng } : vector3ToLatLng(sum);

  let widest = 0;
  for (const p of points) widest = Math.max(widest, greatCircleAngle(centre, p));

  const wanted = Math.min(Math.PI / 2 - 0.02, widest * 1.6 + 0.06);
  // Inverse of "a camera d radii out sees a cap of acos(1/d)".
  const zoom = 1 / Math.cos(wanted);
  return { lat: centre.lat, lng: centre.lng, zoom: clamp(zoom, minZoom, maxZoom) };
}
