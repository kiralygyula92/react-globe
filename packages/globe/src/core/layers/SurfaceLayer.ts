/**
 * The globe body, its atmosphere shells, the cloud shell and the land mesh —
 * which is to say, where the four render styles live.
 */

import {
  Color,
  DataTexture,
  FrontSide,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  UnsignedByteType,
  type Material,
  type Texture,
} from 'three';
import type { RenderStyle } from '../../types';
import type { PreparedCountry } from '../../utils/geo';
import { textureFromImage, type DecodedImage } from '../../assets';
import { createFlatMaterial, type FlatSurface } from '../materials/flatShader';
import {
  CARTOON_FILLS,
  CARTOON_SEA,
  createDepthTexture,
  createMaskTexture,
  createRampTexture,
  heightScaleOf,
  landFields,
  rampStops,
  type FlatStyle,
  type Rgb,
} from '../materials/flatTexture';
import {
  ATMOSPHERE_COLORS,
  createAtmosphereMaterial,
  createCloudMaterial,
  createRealisticMaterial,
  prepareSurfaceTexture,
} from '../materials/surface';
import { lumaOf } from '../materials/grayscale';
import { LandLayer } from './LandLayer';

/** Camera distance below which land is drawn from polygons. */
const LAND_MESH_ZOOM = 2.4;
/** 0.94 degrees per segment: at minZoom the limb is ~27 steps and reads as a curve. */
const SEGMENTS_W = 384;
const SEGMENTS_H = 192;
export const GLOBE_RADIUS = 1;
const CLOUD_RADIUS = 1.006;
const RIM_RADIUS = 1.022;
const HALO_RADIUS = 1.1;
/** Radians per second. */
const CLOUD_DRIFT = 0.004;
/** Seconds between cloud steps — 10 Hz, 0.02 degrees a step, invisible. */
const CLOUD_STEP = 0.1;

/** What a flat style wears before its fields exist. */
const PLAIN_FILL: Record<FlatStyle, Rgb> = {
  standard: [95, 155, 197],
  modern: [8, 20, 58],
  cartoon: CARTOON_SEA,
};

export type SurfaceStyle = { renderStyle: RenderStyle; grayscale: boolean; showClouds: boolean };

export type SurfaceTextureSet = {
  day: Texture | null;
  normal: Texture | null;
  specular: Texture | null;
  clouds: Texture | null;
  /** Height raster, read by the shaded styles. */
  elevation: DecodedImage | null;
  /** The low-resolution day map, read by the shaded styles as land cover. */
  cover: DecodedImage | null;
};

export const isFlat = (style: RenderStyle): style is FlatStyle => style !== 'realistic';

type StyleInputs = { style: SurfaceStyle; textures: SurfaceTextureSet; countries: readonly PreparedCountry[] };

export class SurfaceLayer {
  readonly group = new Group();
  private readonly globeGeometry = new SphereGeometry(GLOBE_RADIUS, SEGMENTS_W, SEGMENTS_H);
  /** The atmosphere shells share one cheaper sphere. */
  private readonly shellGeometry = new SphereGeometry(1, 96, 48);
  private readonly globe: Mesh<SphereGeometry, Material>;
  private readonly clouds: Mesh<SphereGeometry, Material>;
  private readonly rim: Mesh<SphereGeometry, Material>;
  private readonly halo: Mesh<SphereGeometry, Material>;
  private readonly land: LandLayer;
  private readonly placeholder: DataTexture;
  private readonly emptyMaterial = new MeshBasicMaterial();

  private ownedMaterials: Material[] = [];
  private readonly ownedTextures = new Set<Texture>();
  private readonly rasterTextures = new Map<DecodedImage, Texture>();
  private readonly ramps = new Map<string, DataTexture>();
  private fieldTextures: { countries: readonly PreparedCountry[]; mask: Texture; depth: Texture } | null = null;

  private currentStyle: StyleInputs | null = null;
  private shellShader: ShaderMaterial | null = null;
  private landCountries: readonly PreparedCountry[] | null = null;
  private landClose = false;
  private landAlways = false;
  /** Whether the land mesh currently wears materials for the current style. */
  private landDressed = false;
  private landArrived = false;
  private landBuild = 0;
  private landIdle = false;
  private disposed = false;
  private cloudClock = 0;
  private cloudElapsed = 0;

  constructor(private readonly anisotropy: number) {
    this.group.name = 'surface';

    this.globe = new Mesh(this.globeGeometry, this.emptyMaterial);
    this.globe.name = 'globe';

    this.clouds = new Mesh(this.globeGeometry, this.emptyMaterial);
    this.clouds.scale.setScalar(CLOUD_RADIUS);
    this.clouds.visible = false;
    this.clouds.renderOrder = 3;
    this.clouds.raycast = () => undefined;

    this.rim = new Mesh(this.shellGeometry, this.emptyMaterial);
    this.rim.scale.setScalar(RIM_RADIUS);
    this.halo = new Mesh(this.shellGeometry, this.emptyMaterial);
    this.halo.scale.setScalar(HALO_RADIUS);
    for (const shell of [this.rim, this.halo]) {
      shell.visible = false;
      shell.renderOrder = 4;
      shell.raycast = () => undefined;
    }

    this.land = new LandLayer((mesh) => this.group.add(mesh));
    this.placeholder = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, RGBAFormat, UnsignedByteType);
    this.placeholder.needsUpdate = true;

    this.group.add(this.globe, this.clouds, this.rim, this.halo);
  }

  /** The mesh hit-testing would raycast; the engine intersects a true sphere instead. */
  get pickTarget(): Mesh {
    return this.globe;
  }

  /** Textures to dispose with the layer — or sooner, once nothing refers to them. */
  own(...textures: (Texture | null)[]): void {
    for (const texture of textures) if (texture) this.ownedTextures.add(texture);
  }

  setStyle(style: SurfaceStyle, textures: SurfaceTextureSet, countries: readonly PreparedCountry[]): void {
    this.disposeMaterials();
    this.currentStyle = { style, textures, countries };
    this.landAlways = style.renderStyle === 'cartoon';
    this.shellShader = null;

    if (isFlat(style.renderStyle)) {
      const material = this.flatMaterial(
        style.renderStyle,
        style.grayscale,
        countries,
        textures,
        this.landReadyFor(countries) && this.landShowing() ? 'sea' : 'both',
      );
      this.globe.material = material;
      this.shellShader = material instanceof ShaderMaterial ? material : null;
    } else {
      const day = textures.day ? prepareSurfaceTexture(textures.day, true, this.anisotropy) : null;
      const normal = textures.normal ? prepareSurfaceTexture(textures.normal, false, this.anisotropy) : null;
      const specular = textures.specular ? prepareSurfaceTexture(textures.specular, false, this.anisotropy) : null;
      this.globe.material = this.keep(createRealisticMaterial(day, normal, specular, style.grayscale));
    }

    // Each style gets its own sky. Cartoon asks for none.
    const sky = ATMOSPHERE_COLORS[style.renderStyle];
    const atmosphereVisible = sky.rimIntensity > 0;
    this.rim.visible = atmosphereVisible;
    this.halo.visible = atmosphereVisible && sky.haloIntensity > 0;
    if (atmosphereVisible) {
      this.rim.material = this.keep(createAtmosphereMaterial(sky.rim, sky.rimIntensity, style.grayscale));
      this.halo.material = this.keep(createAtmosphereMaterial(sky.halo, sky.haloIntensity, style.grayscale));
    }

    this.dressLand(style, countries, textures);
    this.setClouds(style.renderStyle === 'realistic' && style.showClouds ? textures.clouds : null, style.grayscale);
    this.releaseUnreferenced(textures);
  }

  /** Returns true when the land-mesh swap happened. */
  setZoom(zoom: number): boolean {
    const close = zoom <= LAND_MESH_ZOOM;
    if (close === this.landClose) return false;
    this.landClose = close;

    const current = this.currentStyle;
    if (!current || !this.landReadyFor(current.countries)) {
      if (close && current && isFlat(current.style.renderStyle)) this.scheduleLand(current.countries);
      return false;
    }

    this.land.setVisible(this.landShowing() && isFlat(current.style.renderStyle) && this.landDressed);
    if (this.shellShader) this.shellShader.uniforms.uForceSea.value = this.landShowing() ? 1 : 0;
    return true;
  }

  /** Cloud drift and land arrival; returns whether anything visible changed. */
  update(delta: number, reducedMotion: boolean): boolean {
    let changed = false;

    if (this.landArrived) {
      this.landArrived = false;
      // Redress the shell as sea-only and the mesh as land in the same frame, so
      // no frame ever shows both.
      const current = this.currentStyle;
      if (current) this.setStyle(current.style, current.textures, current.countries);
      changed = true;
    }

    if (this.clouds.visible && !reducedMotion) {
      this.cloudClock += delta;
      if (this.cloudClock >= CLOUD_STEP) {
        this.cloudElapsed += this.cloudClock;
        this.cloudClock = 0;
        this.clouds.rotation.y = CLOUD_DRIFT * this.cloudElapsed;
        changed = true;
      }
    }

    return changed;
  }

  dispose(): void {
    this.disposed = true;
    if (this.landBuild !== 0) {
      // cancelIdleCallback and clearTimeout are not interchangeable.
      if (this.landIdle) cancelIdleCallback(this.landBuild);
      else clearTimeout(this.landBuild);
      this.landBuild = 0;
    }
    this.disposeMaterials();
    for (const texture of this.ownedTextures) texture.dispose();
    this.ownedTextures.clear();
    for (const texture of this.rasterTextures.values()) texture.dispose();
    this.rasterTextures.clear();
    for (const texture of this.ramps.values()) texture.dispose();
    this.ramps.clear();
    this.fieldTextures?.mask.dispose();
    this.fieldTextures?.depth.dispose();
    this.fieldTextures = null;
    this.placeholder.dispose();
    this.emptyMaterial.dispose();
    this.land.dispose();
    this.globeGeometry.dispose();
    this.shellGeometry.dispose();
    this.group.clear();
  }

  /* ------------------------------------------------------------------ internals */

  private landShowing(): boolean {
    return this.landAlways || this.landClose;
  }

  private landReadyFor(countries: readonly PreparedCountry[]): boolean {
    return this.land.ready && this.landCountries === countries;
  }

  private keep<T extends Material>(material: T): T {
    this.ownedMaterials.push(material);
    return material;
  }

  private disposeMaterials(): void {
    for (const material of this.ownedMaterials) material.dispose();
    this.ownedMaterials = [];
  }

  /** Disposes owned textures the new set no longer refers to — the day preview, once the full map lands. */
  private releaseUnreferenced(textures: SurfaceTextureSet): void {
    const live = new Set([textures.day, textures.normal, textures.specular, textures.clouds]);
    for (const texture of this.ownedTextures) {
      if (live.has(texture)) continue;
      texture.dispose();
      this.ownedTextures.delete(texture);
    }
  }

  private plainFill(style: FlatStyle, grayscale: boolean): MeshBasicMaterial {
    const fill = PLAIN_FILL[style];
    const value = grayscale ? lumaOf(fill) : null;
    const color = value === null
      ? new Color().setRGB(fill[0] / 255, fill[1] / 255, fill[2] / 255, SRGBColorSpace)
      : new Color().setRGB(value / 255, value / 255, value / 255, SRGBColorSpace);
    return this.keep(new MeshBasicMaterial({ color, toneMapped: false }));
  }

  private flatMaterial(
    style: FlatStyle,
    grayscale: boolean,
    countries: readonly PreparedCountry[],
    textures: SurfaceTextureSet,
    surface: FlatSurface,
  ): ShaderMaterial | MeshBasicMaterial {
    const shaded = style !== 'cartoon';
    // Until the fields it is shaded from exist, a flat style wears a plain fill.
    if (countries.length === 0 || (shaded && (!textures.elevation || !textures.cover))) {
      return this.plainFill(style, grayscale);
    }

    const fields = landFields(countries);
    if (this.fieldTextures?.countries !== countries) {
      this.fieldTextures?.mask.dispose();
      this.fieldTextures?.depth.dispose();
      this.fieldTextures = { countries, mask: createMaskTexture(fields), depth: createDepthTexture(fields) };
    }

    const ramps = rampStops(style);
    return this.keep(
      createFlatMaterial({
        style,
        grayscale,
        surface,
        cover: shaded && textures.cover ? this.rasterTexture(textures.cover) : this.placeholder,
        height: shaded && textures.elevation ? this.rasterTexture(textures.elevation) : this.placeholder,
        mask: this.fieldTextures.mask,
        depth: this.fieldTextures.depth,
        landRamp: this.ramp(`${style}:land`, ramps.land, ramps.banded),
        reliefRamp: this.ramp(`${style}:relief`, ramps.relief, ramps.banded),
        // The sea's stepping lives in softBand, so its ramp is always linear.
        seaRamp: this.ramp(`${style}:sea`, ramps.sea, false),
        heightScale: shaded && textures.elevation ? heightScaleOf(textures.elevation, fields) : 1,
      }),
    );
  }

  /** Raw bytes, no colour-space decode: the shader reads them as data. */
  private rasterTexture(image: DecodedImage): Texture {
    let texture = this.rasterTextures.get(image);
    if (!texture) {
      texture = textureFromImage(image);
      texture.colorSpace = NoColorSpace;
      texture.wrapS = RepeatWrapping;
      texture.generateMipmaps = true;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.anisotropy = this.anisotropy;
      this.rasterTextures.set(image, texture);
    }
    return texture;
  }

  private ramp(key: string, stops: Parameters<typeof createRampTexture>[0], banded: boolean): DataTexture {
    let texture = this.ramps.get(key);
    if (!texture) {
      texture = createRampTexture(stops, banded);
      this.ramps.set(key, texture);
    }
    return texture;
  }

  private dressLand(style: SurfaceStyle, countries: readonly PreparedCountry[], textures: SurfaceTextureSet): void {
    this.landDressed = false;
    const renderStyle = style.renderStyle;
    if (!isFlat(renderStyle) || countries.length === 0) {
      this.land.setVisible(false);
      return;
    }

    // A different country set means a different mesh.
    if (this.land.ready && this.landCountries !== countries) this.land.dispose();

    if (!this.land.ready) {
      this.land.setVisible(false);
      if (this.landShowing()) this.scheduleLand(countries);
      return;
    }

    if (renderStyle === 'cartoon') {
      // MeshBasicMaterials take no shader edit, so grey is applied to the colours.
      const materials = CARTOON_FILLS.map((fill) => {
        const color = new Color(fill);
        if (style.grayscale) {
          const c = color.getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
          const l = lumaOf([c.r, c.g, c.b]);
          color.setRGB(l, l, l, SRGBColorSpace);
        }
        // Opaque, so it writes depth: a border on the far side has to be hidden by
        // the near side rather than drawn through it.
        return this.keep(new MeshBasicMaterial({ color, side: FrontSide, toneMapped: false }));
      });
      this.land.setMaterials(materials);
    } else {
      const material = this.flatMaterial(renderStyle, style.grayscale, countries, textures, 'land');
      if (!(material instanceof ShaderMaterial)) {
        // Still wearing the plain fill; there is nothing to draw land with yet.
        this.land.setVisible(false);
        return;
      }
      this.land.setMaterials(material);
    }
    this.landDressed = true;
    this.land.setVisible(this.landShowing());
  }

  /**
   * Triangulating the world costs ~270 ms, so it runs on an idle callback and only
   * once a camera is close enough to draw it (or the style always does).
   */
  private scheduleLand(countries: readonly PreparedCountry[]): void {
    if (this.landBuild !== 0 || this.disposed || countries.length === 0) return;

    const run = (): void => {
      this.landBuild = 0;
      // A route change can retire the globe between the request and the call.
      if (this.disposed) return;
      if (this.currentStyle?.countries !== countries) return;
      this.land.build(countries);
      this.landCountries = countries;
      this.landArrived = true;
    };

    if (typeof requestIdleCallback === 'function') {
      this.landIdle = true;
      this.landBuild = requestIdleCallback(run, { timeout: 2500 });
    } else {
      this.landIdle = false;
      this.landBuild = setTimeout(run, 120) as unknown as number;
    }
  }

  private setClouds(texture: Texture | null, grayscale: boolean): void {
    if (!texture) {
      this.clouds.visible = false;
      return;
    }
    prepareSurfaceTexture(texture, false, this.anisotropy);
    this.clouds.material = this.keep(createCloudMaterial(texture, grayscale));
    this.clouds.visible = true;
  }
}
