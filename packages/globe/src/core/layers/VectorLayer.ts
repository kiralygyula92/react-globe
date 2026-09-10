/**
 * Shorelines and country borders, as screen-space lines on the sphere.
 *
 * `worldUnits: false` is what keeps a border the same weight at 1.1 radii and
 * at 4. Lines are decoration: the sphere below owns hit-testing.
 */

import { Group } from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type { FeatureCollection } from 'geojson';
import type { RenderStyle } from '../../types';
import { lineFeaturesToSegments } from '../../utils/geo';
import { parseCssColor } from '../materials/cssColor';

// Radial offsets: the depth buffer still hides the far side, but nothing z-fights.
const SHORELINE_RADIUS = 1.0016;
const BORDER_RADIUS = 1.0022;

type Stroke = { color: string; width: number; opacity: number };

// `modern` gives its coast opacity 0 deliberately: lit land meeting dark water is
// the whole picture. Cartoon's border is heavier than its shoreline because it has
// to sit over the edge of the fill beneath it.
const STROKES: Record<RenderStyle, { shore: Stroke; border: Stroke }> = {
  realistic: {
    shore: { color: 'rgb(214, 233, 255)', width: 1.1, opacity: 0.5 },
    border: { color: 'rgb(255, 226, 172)', width: 1.0, opacity: 0.42 },
  },
  standard: {
    shore: { color: 'rgb(72, 104, 130)', width: 1.0, opacity: 0.6 },
    border: { color: 'rgb(126, 116, 100)', width: 0.9, opacity: 0.55 },
  },
  cartoon: {
    shore: { color: 'rgb(38, 46, 66)', width: 2.4, opacity: 0.9 },
    border: { color: 'rgb(64, 52, 40)', width: 3.2, opacity: 0.85 },
  },
  modern: {
    shore: { color: 'rgb(122, 236, 255)', width: 0.9, opacity: 0 },
    border: { color: 'rgb(110, 206, 255)', width: 0.7, opacity: 0.5 },
  },
};

const GRAY_SHORE = 'rgb(226, 226, 226)';
const GRAY_BORDER = 'rgb(196, 196, 196)';

export function createLineMaterial(): LineMaterial {
  return new LineMaterial({
    linewidth: 1,
    worldUnits: false,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

export function createLineSegments(segments: Float32Array, material: LineMaterial): LineSegments2 {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(segments);
  const line = new LineSegments2(geometry, material);
  // The whole world is in one geometry, so a bounding-sphere test can never reject it.
  line.frustumCulled = false;
  line.raycast = () => undefined;
  return line;
}

function applyStroke(material: LineMaterial, stroke: Stroke, gray: string | null): void {
  material.color.copy(parseCssColor(gray ?? stroke.color).color);
  material.linewidth = stroke.width;
  material.opacity = stroke.opacity;
}

export class VectorLayer {
  readonly group = new Group();
  private readonly shoreMaterial = createLineMaterial();
  private readonly borderMaterial = createLineMaterial();
  private shore: LineSegments2 | null = null;
  private border: LineSegments2 | null = null;
  private shoreSource: FeatureCollection | null = null;
  private borderSource: FeatureCollection | null = null;
  private showShore = true;
  private showBorder = true;

  constructor() {
    this.group.name = 'vectors';
    this.setStyle('standard', false);
  }

  setShorelines(collection: FeatureCollection | null): void {
    if (collection === this.shoreSource) return;
    this.shoreSource = collection;
    this.shore = this.replace(this.shore, collection, SHORELINE_RADIUS, this.shoreMaterial);
    this.syncVisibility();
  }

  setBorders(collection: FeatureCollection | null): void {
    if (collection === this.borderSource) return;
    this.borderSource = collection;
    this.border = this.replace(this.border, collection, BORDER_RADIUS, this.borderMaterial);
    this.syncVisibility();
  }

  setVisibility(shorelines: boolean, borders: boolean): void {
    this.showShore = shorelines;
    this.showBorder = borders;
    this.syncVisibility();
  }

  setStyle(style: RenderStyle, grayscale: boolean): void {
    const strokes = STROKES[style];
    applyStroke(this.shoreMaterial, strokes.shore, grayscale ? GRAY_SHORE : null);
    applyStroke(this.borderMaterial, strokes.border, grayscale ? GRAY_BORDER : null);
    this.syncVisibility();
  }

  setResolution(width: number, height: number): void {
    this.shoreMaterial.resolution.set(width, height);
    this.borderMaterial.resolution.set(width, height);
  }

  dispose(): void {
    this.shore?.geometry.dispose();
    this.border?.geometry.dispose();
    this.shoreMaterial.dispose();
    this.borderMaterial.dispose();
    this.group.clear();
  }

  private replace(
    current: LineSegments2 | null,
    collection: FeatureCollection | null,
    radius: number,
    material: LineMaterial,
  ): LineSegments2 | null {
    if (current) {
      this.group.remove(current);
      current.geometry.dispose();
    }
    if (!collection) return null;
    const line = createLineSegments(lineFeaturesToSegments(collection, radius), material);
    this.group.add(line);
    return line;
  }

  private syncVisibility(): void {
    if (this.shore) this.shore.visible = this.showShore && this.shoreMaterial.opacity > 0;
    if (this.border) this.border.visible = this.showBorder && this.borderMaterial.opacity > 0;
  }
}
