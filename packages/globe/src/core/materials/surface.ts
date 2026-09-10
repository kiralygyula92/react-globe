/**
 * Materials for the realistic globe, its cloud shell and the atmosphere shells.
 */

import {
  AdditiveBlending,
  BackSide,
  Color,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  MeshPhongMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  Vector3,
  type Texture,
} from 'three';
import type { RenderStyle } from '../../types';
import { applyGrayscale, lumaOf } from './grayscale';
import { parseCssColor } from './cssColor';

/** Each style gets its own sky. Cartoon asks for none: a drawn world with a glow reads as two pictures. */
export const ATMOSPHERE_COLORS = {
  realistic: { rim: 'rgb(122, 176, 255)', halo: 'rgb(86, 140, 226)', rimIntensity: 0.55, haloIntensity: 0.16 },
  standard: { rim: 'rgb(168, 205, 240)', halo: 'rgb(126, 170, 214)', rimIntensity: 0.34, haloIntensity: 0.1 },
  modern: { rim: 'rgb(96, 226, 255)', halo: 'rgb(28, 74, 190)', rimIntensity: 0.9, haloIntensity: 0.3 },
  cartoon: { rim: 'rgb(122, 176, 255)', halo: 'rgb(86, 140, 226)', rimIntensity: 0, haloIntensity: 0 },
} as const satisfies Record<RenderStyle, { rim: string; halo: string; rimIntensity: number; haloIntensity: number }>;

const ATMOSPHERE_POWER = 2.6;

const prepared = new WeakSet<Texture>();

/**
 * Longitude is cyclic, so the seam must repeat rather than sample clamped edge
 * texels; mipmaps plus maximum anisotropy keep tilted, oblique views sharp.
 */
export function prepareSurfaceTexture(texture: Texture, srgb: boolean, anisotropy: number): Texture {
  if (prepared.has(texture)) return texture;
  prepared.add(texture);
  texture.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Phong, not Standard: the dataset shipped is a specular mask — water
 * reflective, land not — which Phong consumes directly, where a PBR material
 * would want a roughness map we would have to invent.
 */
export function createRealisticMaterial(
  day: Texture | null,
  normal: Texture | null,
  specular: Texture | null,
  grayscale: boolean,
): MeshPhongMaterial {
  const material = new MeshPhongMaterial({
    map: day,
    normalMap: normal,
    specularMap: specular,
    // Land reads matte; the map lets oceans catch the sun.
    specular: new Color('rgb(70, 88, 110)'),
    shininess: 18,
    color: day ? new Color('rgb(255, 255, 255)') : new Color('rgb(38, 74, 120)'),
  });
  material.normalScale.set(0.85, 0.85);
  return grayscale ? applyGrayscale(material) : material;
}

export function createCloudMaterial(clouds: Texture, grayscale: boolean): MeshPhongMaterial {
  return new MeshPhongMaterial({
    color: new Color('rgb(255, 255, 255)'),
    alphaMap: clouds,
    transparent: true,
    opacity: grayscale ? 0.5 : 0.62,
    depthWrite: false,
    shininess: 0,
  });
}

const ATMOSPHERE_VERTEX = /* glsl */ `
varying vec3 vNormalView;

void main() {
  vNormalView = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uPower;
varying vec3 vNormalView;

void main() {
  // Back faces, so the normal points away from us: the rim is where the
  // shell is most edge-on, which is exactly where 1 - |n.z| peaks.
  float rim = 1.0 - abs(vNormalView.z);
  gl_FragColor = vec4(uColor, pow(rim, uPower) * uIntensity);
}
`;

/** The colour arrives as raw sRGB, pre-desaturated when the globe is grey. */
export function createAtmosphereMaterial(color: string, intensity: number, grayscale: boolean): ShaderMaterial {
  const rgb = parseCssColor(color).color.getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  const triple: [number, number, number] = [rgb.r, rgb.g, rgb.b];
  const value = grayscale ? new Vector3().setScalar(lumaOf(triple)) : new Vector3(...triple);
  return new ShaderMaterial({
    vertexShader: ATMOSPHERE_VERTEX,
    fragmentShader: ATMOSPHERE_FRAGMENT,
    uniforms: {
      uColor: { value },
      uIntensity: { value: intensity },
      uPower: { value: ATMOSPHERE_POWER },
    },
    side: BackSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
