/**
 * The hovered-country fill.
 *
 * Three settings here were each a visible bug: 0.0045 radii of clearance (at
 * 0.0026 the sphere's own facets poked through), 2-degree subdivision (at 4 a
 * flat triangle cut under the surface), and FrontSide (DoubleSide drew the far
 * half of a limb-wrapping country through its near one).
 */

import { BufferAttribute, BufferGeometry, FrontSide, Mesh, MeshBasicMaterial } from 'three';
import type { PreparedCountry } from '../../utils/geo';
import { triangulateCountry } from '../../utils/geo';
import { parseCssColor } from '../materials/cssColor';

const HIGHLIGHT_RADIUS = 1.0045;

export class HighlightLayer {
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly empty = new BufferGeometry();
  // Whole geometries per country, swapped on the mesh. Replacing a single
  // attribute instead leaves its GPU buffer allocated until the geometry is
  // disposed, so hovering across a map would strand one buffer per country.
  // Each remembers the country it was built from: a new dataset reuses the ids.
  private readonly cache = new Map<string, { country: PreparedCountry; geometry: BufferGeometry }>();
  private current: PreparedCountry | null = null;

  constructor() {
    const material = new MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      side: FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      toneMapped: false,
    });
    this.mesh = new Mesh(this.empty, material);
    this.mesh.name = 'highlight';
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => undefined;
  }

  show(country: PreparedCountry | null): void {
    if (country === this.current) return;
    this.current = country;
    if (!country) {
      this.mesh.visible = false;
      this.mesh.geometry = this.empty;
      return;
    }
    let cached = this.cache.get(country.id);
    if (cached && cached.country !== country) {
      // Same id, different dataset: the old outline would be highlighted otherwise.
      cached.geometry.dispose();
      cached = undefined;
    }
    if (!cached) {
      const { positions, uvs, index } = triangulateCountry(country, HIGHLIGHT_RADIUS);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
      geometry.setIndex(new BufferAttribute(index, 1));
      cached = { country, geometry };
      this.cache.set(country.id, cached);
    }
    this.mesh.geometry = cached.geometry;
    this.mesh.visible = true;
  }

  /** rgb(), rgba() and named colours; alpha goes to the material's opacity. */
  setColor(value: string): void {
    const { color, alpha } = parseCssColor(value);
    this.mesh.material.color.copy(color);
    this.mesh.material.opacity = alpha;
  }

  dispose(): void {
    for (const { geometry } of this.cache.values()) geometry.dispose();
    this.cache.clear();
    this.empty.dispose();
    this.mesh.material.dispose();
  }
}
