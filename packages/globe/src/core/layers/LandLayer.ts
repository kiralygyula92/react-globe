/**
 * Land drawn from the country polygons rather than painted into a raster, so the
 * coast and the shoreline line are the same edge by construction.
 *
 * One indexed geometry, ordered by palette slot with one group per run: cartoon
 * hands it six flat materials and gets per-country colour for six draw calls,
 * while the shaded styles hand it a single material and pay for one.
 */

import { BufferAttribute, BufferGeometry, Mesh, type Material } from 'three';
import type { PreparedCountry } from '../../utils/geo';
import { triangulateCountry } from '../../utils/geo';
import { assignCountryColors } from '../../utils/countryColors';

/**
 * Just clear of the sphere and of the chords of the triangles laid over it, and
 * below the shoreline at 1.0016 so the outline still sits on top.
 */
const LAND_RADIUS = 1.001;
export const PALETTE_SIZE = 6;

type LandData = {
  positions: Float32Array;
  uvs: Float32Array;
  index: Uint32Array;
  groups: { start: number; count: number; slot: number }[];
};

/**
 * Keyed by the country array itself. Two globes share that array out of the
 * asset cache, so the second one never spends another quarter-second arriving at
 * the same answer.
 */
const CACHE = new WeakMap<object, LandData>();

export function landData(countries: readonly PreparedCountry[]): LandData {
  const cached = CACHE.get(countries);
  if (cached) return cached;

  const slots = assignCountryColors(countries, PALETTE_SIZE);
  const parts = countries.map((country, i) => ({ slot: slots[i], mesh: triangulateCountry(country, LAND_RADIUS) }));
  parts.sort((a, b) => a.slot - b.slot);

  let vertexCount = 0;
  let indexCount = 0;
  for (const part of parts) {
    vertexCount += part.mesh.positions.length / 3;
    indexCount += part.mesh.index.length;
  }

  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const index = new Uint32Array(indexCount);
  const groups: LandData['groups'] = [];

  let vertexOffset = 0;
  let indexOffset = 0;
  for (const { slot, mesh } of parts) {
    positions.set(mesh.positions, vertexOffset * 3);
    uvs.set(mesh.uvs, vertexOffset * 2);
    for (let i = 0; i < mesh.index.length; i++) index[indexOffset + i] = mesh.index[i] + vertexOffset;

    const last = groups[groups.length - 1];
    if (last && last.slot === slot) last.count += mesh.index.length;
    else groups.push({ start: indexOffset, count: mesh.index.length, slot });

    vertexOffset += mesh.positions.length / 3;
    indexOffset += mesh.index.length;
  }

  const data = { positions, uvs, index, groups };
  CACHE.set(countries, data);
  return data;
}

export class LandLayer {
  private mesh: Mesh | null = null;
  private visible = false;

  /** Called with the mesh once it exists, so the owner can add it to its group. */
  constructor(private readonly onMesh: (mesh: Mesh) => void) {}

  get ready(): boolean {
    return this.mesh !== null;
  }

  build(countries: readonly PreparedCountry[]): void {
    if (this.mesh) return;
    const data = landData(countries);
    // The buffers are shared; each globe wraps them in its own geometry, because
    // disposing one must not empty the other.
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new BufferAttribute(data.uvs, 2));
    geometry.setIndex(new BufferAttribute(data.index, 1));
    for (const group of data.groups) geometry.addGroup(group.start, group.count, group.slot);

    const mesh = new Mesh(geometry);
    mesh.name = 'land';
    // The whole world is in here; a bounding test can never reject it.
    mesh.frustumCulled = false;
    // Hit-testing raycasts the globe itself.
    mesh.raycast = () => undefined;
    mesh.renderOrder = 0;
    // No polygonOffset, deliberately: the offset scales with depth slope, which
    // runs away at the limb and pulled the far side of this shell through the near
    // side. A thousandth of a radius of real clearance works at every angle.
    mesh.visible = this.visible;
    this.mesh = mesh;
    this.onMesh(mesh);
  }

  setMaterials(material: Material | Material[]): void {
    if (this.mesh) this.mesh.material = material;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (this.mesh) this.mesh.visible = visible;
  }

  dispose(): void {
    this.mesh?.geometry.dispose();
    this.mesh?.removeFromParent();
    this.mesh = null;
  }
}
