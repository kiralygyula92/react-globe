/**
 * Meridians and parallels every 15 degrees, with the equator and the prime
 * meridian drawn stronger. Built once, then only restyled.
 */

import { Group } from 'three';
import type { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import type { RenderStyle } from '../../types';
import { latLngToVector3 } from '../../utils/coordinates';
import { parseCssColor } from '../materials/cssColor';
import { createLineMaterial, createLineSegments } from './VectorLayer';

/** One hour of rotation, and the map convention. */
export const GRATICULE_STEP = 15;
/** Just under the shorelines. */
const RADIUS = 1.0012;
/** Fine enough that a great circle reads as a curve. */
const SAMPLE_DEG = 2;
const PRINCIPAL_BOOST = 2.1;
const MINOR_WIDTH = 0.7;
const PRINCIPAL_WIDTH = 1.1;

const STYLES: Record<RenderStyle, { color: string; opacity: number }> = {
  realistic: { color: 'rgb(226, 238, 255)', opacity: 0.22 },
  standard: { color: 'rgb(88, 116, 142)', opacity: 0.26 },
  cartoon: { color: 'rgb(38, 46, 66)', opacity: 0.25 },
  modern: { color: 'rgb(122, 236, 255)', opacity: 0.26 },
};
const GRAY = 'rgb(210, 210, 210)';

export type GraticuleLabel = { key: string; lat: number; lng: number; text: string };

/** Meridians read off the equator, parallels off Greenwich, plus one 0 degrees at the origin. */
export function graticuleLabels(): GraticuleLabel[] {
  const labels: GraticuleLabel[] = [{ key: 'origin', lat: 0, lng: 0, text: '0°' }];
  for (let lng = -180 + GRATICULE_STEP; lng <= 180; lng += GRATICULE_STEP) {
    if (lng === 0) continue;
    labels.push({ key: `m${lng}`, lat: 0, lng, text: `${Math.abs(lng)}°${lng < 0 ? 'W' : 'E'}` });
  }
  for (let lat = -90 + GRATICULE_STEP; lat < 90; lat += GRATICULE_STEP) {
    if (lat === 0) continue;
    labels.push({ key: `p${lat}`, lat, lng: 0, text: `${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'}` });
  }
  return labels;
}

function graticuleSegments(): { minor: Float32Array; principal: Float32Array } {
  const minor: number[] = [];
  const principal: number[] = [];
  const a = latLngToVector3(0, 0);
  const b = latLngToVector3(0, 0);
  const push = (out: number[], lat0: number, lng0: number, lat1: number, lng1: number): void => {
    latLngToVector3(lat0, lng0, RADIUS, a);
    latLngToVector3(lat1, lng1, RADIUS, b);
    out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };

  // Meridians run pole to pole.
  for (let lng = -180; lng < 180; lng += GRATICULE_STEP) {
    const out = lng === 0 ? principal : minor;
    for (let lat = -90; lat < 90; lat += SAMPLE_DEG) push(out, lat, lng, lat + SAMPLE_DEG, lng);
  }
  // Parallels stop short of the poles, where they would collapse to a point.
  for (let lat = -90 + GRATICULE_STEP; lat < 90; lat += GRATICULE_STEP) {
    const out = lat === 0 ? principal : minor;
    for (let lng = -180; lng < 180; lng += SAMPLE_DEG) push(out, lat, lng, lat, lng + SAMPLE_DEG);
  }
  return { minor: new Float32Array(minor), principal: new Float32Array(principal) };
}

export class GraticuleLayer {
  readonly group = new Group();
  // Two meshes, not one: the principal lines are stronger, and two meshes avoid a
  // per-segment attribute.
  private readonly minorMaterial = createLineMaterial();
  private readonly principalMaterial = createLineMaterial();
  private readonly minor: LineSegments2;
  private readonly principal: LineSegments2;

  constructor() {
    this.group.name = 'graticule';
    const { minor, principal } = graticuleSegments();
    this.minor = createLineSegments(minor, this.minorMaterial);
    this.principal = createLineSegments(principal, this.principalMaterial);
    this.minorMaterial.linewidth = MINOR_WIDTH;
    this.principalMaterial.linewidth = PRINCIPAL_WIDTH;
    this.group.add(this.minor, this.principal);
    this.group.visible = false;
    this.setStyle('standard', false);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setStyle(style: RenderStyle, grayscale: boolean): void {
    const { color, opacity } = STYLES[style];
    const parsed = parseCssColor(grayscale ? GRAY : color).color;
    this.minorMaterial.color.copy(parsed);
    this.principalMaterial.color.copy(parsed);
    this.minorMaterial.opacity = opacity;
    this.principalMaterial.opacity = Math.min(1, opacity * PRINCIPAL_BOOST);
  }

  setResolution(width: number, height: number): void {
    this.minorMaterial.resolution.set(width, height);
    this.principalMaterial.resolution.set(width, height);
  }

  dispose(): void {
    this.minor.geometry.dispose();
    this.principal.geometry.dispose();
    this.minorMaterial.dispose();
    this.principalMaterial.dispose();
    this.group.clear();
  }
}
