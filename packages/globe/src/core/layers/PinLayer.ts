/**
 * The default marker: one instanced mesh, so one draw call however many pins.
 *
 * The shape is a single LatheGeometry — the tangent line from the tip to the
 * head, then the head's own arc — rather than a cone stuck under a sphere: one
 * draw call and no crease at the join.
 */

import {
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector2,
  Vector3,
} from 'three';
import type { Pin } from '../../types';
import { latLngToVector3 } from '../../utils/coordinates';

const HEAD_RADIUS = 0.017;
/** How far the head's centre sits above the tip. */
const HEAD_CENTRE = 0.058;
const RADIAL_SEGMENTS = 14;
const PROFILE_SEGMENTS = 12;
/** Camera-to-SURFACE distance at which a pin is full size. */
const REFERENCE_DISTANCE = 1.6;
const MIN_DISTANCE = 0.02;
const SHRINK = 0.6;
const MIN_SCREEN_SCALE = 0.5;
const MAX_SCREEN_SCALE = 1.15;
const MIN_CAPACITY = 64;

const BASE_COLOR = new Color('rgb(233, 66, 76)');
const HOVER_COLOR = new Color('rgb(255, 138, 132)');
const SELECTED_COLOR = new Color('rgb(63, 224, 197)');

const UP = new Vector3(0, 1, 0);

function pinProfile(): Vector2[] {
  const points: Vector2[] = [new Vector2(0, 0)];
  // Where a line from the tip grazes the head.
  const grazing = Math.acos(HEAD_RADIUS / HEAD_CENTRE);
  for (let i = 0; i <= PROFILE_SEGMENTS; i++) {
    const phi = grazing + (Math.PI - grazing) * (i / PROFILE_SEGMENTS);
    points.push(new Vector2(HEAD_RADIUS * Math.sin(phi), HEAD_CENTRE - HEAD_RADIUS * Math.cos(phi)));
  }
  return points;
}

/**
 * Screen-constant size, then deliberately giving back part of the approach:
 * closing in shrinks the pin, so the map gains room as it gains detail.
 * `zoom - 1`, not `zoom`: sized against the distance to the surface.
 */
export function pinScaleFor(zoom: number): number {
  const ratio = Math.max(MIN_DISTANCE, zoom - 1) / REFERENCE_DISTANCE;
  const onScreen = Math.min(MAX_SCREEN_SCALE, Math.max(MIN_SCREEN_SCALE, Math.pow(ratio, SHRINK)));
  return ratio * onScreen;
}

export class PinLayer {
  readonly group = new Group();
  private readonly geometry = new LatheGeometry(pinProfile(), RADIAL_SEGMENTS);
  // Unlit and out of the tone mapper's reach, so a marker keeps its exact colour
  // whether it stands in the sun or on the night side.
  private readonly material = new MeshBasicMaterial({ toneMapped: false });
  private mesh: InstancedMesh;
  private positions: Vector3[] = [];
  private orientations: Quaternion[] = [];
  private hidden = new Uint8Array(0);
  private lastScale = -1;
  private hovered = -1;
  private selected = -1;
  private readonly matrix = new Matrix4();
  private readonly scaleVector = new Vector3();

  constructor() {
    this.group.name = 'pins';
    this.mesh = this.createMesh(MIN_CAPACITY);
  }

  setPins(pins: readonly Pin<unknown>[]): void {
    if (pins.length > this.mesh.instanceMatrix.count) {
      this.group.remove(this.mesh);
      this.mesh.dispose();
      this.mesh = this.createMesh(Math.max(MIN_CAPACITY, pins.length));
    }
    this.positions = pins.map((pin) => latLngToVector3(pin.lat, pin.lng, 1));
    this.orientations = this.positions.map((v) => new Quaternion().setFromUnitVectors(UP, v.clone().normalize()));
    this.hidden = new Uint8Array(pins.length);
    this.hovered = -1;
    this.selected = -1;
    this.mesh.count = pins.length;
    for (let i = 0; i < pins.length; i++) this.mesh.setColorAt(i, BASE_COLOR);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.lastScale = -1;
  }

  /** Returns whether any matrix was rewritten. */
  setZoom(zoom: number): boolean {
    const scale = pinScaleFor(zoom);
    // Only rewrite when it matters.
    if (Math.abs(scale - this.lastScale) < 0.005) return false;
    this.lastScale = scale;
    for (let i = 0; i < this.positions.length; i++) this.writeMatrix(i);
    this.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  /**
   * A clustered pin collapses to zero scale: one matrix write per pin that
   * actually changed, instead of rebuilding the mesh when a cluster drifts apart.
   */
  setHiddenIndices(hidden: Uint8Array): boolean {
    let changed = false;
    for (let i = 0; i < this.positions.length; i++) {
      const next = hidden[i] ? 1 : 0;
      if (next === this.hidden[i]) continue;
      this.hidden[i] = next;
      if (this.lastScale >= 0) this.writeMatrix(i);
      changed = true;
    }
    if (changed) this.mesh.instanceMatrix.needsUpdate = true;
    return changed;
  }

  setHovered(index: number): void {
    if (index === this.hovered) return;
    const previous = this.hovered;
    this.hovered = index;
    this.repaint(previous);
    this.repaint(index);
  }

  setSelected(index: number): void {
    if (index === this.selected) return;
    const previous = this.selected;
    this.selected = index;
    this.repaint(previous);
    this.repaint(index);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  dispose(): void {
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }

  private createMesh(capacity: number): InstancedMesh {
    const mesh = new InstancedMesh(this.geometry, this.material, capacity);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    // Hit-testing is screen-space, against the projections the component keeps.
    mesh.raycast = () => undefined;
    this.group.add(mesh);
    return mesh;
  }

  private writeMatrix(i: number): void {
    const s = this.hidden[i] ? 0 : this.lastScale;
    this.scaleVector.setScalar(s);
    this.matrix.compose(this.positions[i], this.orientations[i], this.scaleVector);
    this.mesh.setMatrixAt(i, this.matrix);
  }

  private repaint(index: number): void {
    if (index < 0 || index >= this.positions.length) return;
    const color = index === this.selected ? SELECTED_COLOR : index === this.hovered ? HOVER_COLOR : BASE_COLOR;
    this.mesh.setColorAt(index, color);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
