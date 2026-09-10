/**
 * The fragment shader behind `standard`, `modern` and `cartoon`.
 *
 * Written against GLSL ES 3.00 for `textureLod`, which is what lets the shelf be
 * read off the land mask's mip chain. three's GLSL3 prefix keeps `varying` and
 * `texture2D` working but does not stand in for `gl_FragColor`, so the output is
 * declared explicitly. A hand-written shader fails at runtime, not at build time;
 * the end-to-end suite walks every style and asserts the console stayed clean.
 */

import { GLSL3, ShaderMaterial, Vector3, type Texture } from 'three';
import {
  CARTOON_LAND,
  CARTOON_SEA,
  FLAT_THRESHOLDS,
  SEA_FADE,
  SNOW,
  rampStops,
  type FlatStyle,
  type Rgb,
} from './flatTexture';

/** Which role one instance of the shader plays. */
export type FlatSurface = 'both' | 'sea' | 'land';

export type FlatShaderInputs = {
  style: FlatStyle;
  grayscale: boolean;
  surface: FlatSurface;
  cover: Texture;
  height: Texture;
  mask: Texture;
  depth: Texture;
  landRamp: Texture;
  reliefRamp: Texture;
  seaRamp: Texture;
  heightScale: number;
};

const VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uCover;
uniform sampler2D uHeight;
uniform sampler2D uMask;
uniform sampler2D uDepth;
uniform sampler2D uLandRamp;
uniform sampler2D uReliefRamp;
uniform sampler2D uSeaRamp;

uniform float uHeightScale;
uniform float uLandFrom;
uniform float uLandTo;
uniform float uForceLand;
uniform float uForceSea;

uniform float uCoverDark;
uniform float uCoverBright;
uniform float uReliefFrom;
uniform vec3 uSnow;
uniform float uSnowLight;
uniform float uSnowNeutral;
uniform float uSnowLatitude;
uniform float uSnowHeight;

uniform float uSeaOpen;
uniform float uSeaShallow;
uniform float uSeaImagery;
uniform float uShelfSharp;
uniform float uBasinTight;
uniform float uBasinWide;
uniform float uBulkFrom;
uniform float uBulkTo;
uniform float uSeaBands;
uniform float uSeaFade;

uniform float uNeon;
uniform float uCartoon;
uniform vec3 uCartoonLand;
uniform vec3 uCartoonSea;
uniform float uGrayscale;

varying vec2 vUv;

out vec4 fragColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec2 MASK_SIZE = vec2(4096.0, 2048.0);
const vec2 DEPTH_SIZE = vec2(2048.0, 1024.0);

/** Smootherstep the position within a texel before sampling: bilinear is only
 *  C0, and quantising a slope that jumps at every boundary makes a visible kink. */
vec2 smoothUv(vec2 uv, vec2 size) {
  vec2 p = uv * size - 0.5;
  vec2 f = fract(p);
  return (floor(p) + f * f * (3.0 - 2.0 * f) + 0.5) / size;
}

float maskAt(vec2 uv, float lod) {
  return textureLod(uMask, smoothUv(uv, MASK_SIZE / exp2(lod)), lod).r;
}

/** Steps a value into bands that fade into one another. fade 0 is a hard step;
 *  0.5 is a plain gradient. */
float softBand(float x, float bands, float fade) {
  if (bands < 1.0) return x;
  float t = clamp(x, 0.0, 1.0) * bands;
  float i = floor(t);
  float f = t - i;
  float e = fade <= 0.0 ? 0.0 : smoothstep(0.5 - fade, 0.5 + fade, f);
  return clamp((i + e) / bands, 0.0, 1.0);
}

void main() {
  vec3 cover = texture2D(uCover, vUv).rgb * 255.0;
  float light = dot(cover, LUMA);
  float height = clamp(texture2D(uHeight, vUv).r * 255.0 * uHeightScale, 0.0, 1.0);

  // The coastline. Where the threshold sits is a style's own business: at the limb
  // the mask is sampled across a whole mip level, so its coast arrives as a smear
  // of middling values, and a low threshold turns that smear into a rim of land all
  // the way round the planet.
  float land = smoothstep(uLandFrom, uLandTo, texture2D(uMask, vUv).r);

  // Once the land is drawn as polygons, the mask is not asked where the coast is.
  land = mix(mix(land, 1.0, uForceLand), 0.0, uForceSea);

  float coverT = clamp((light - uCoverDark) / (uCoverBright - uCoverDark), 0.0, 1.0);
  float relief = clamp((height - uReliefFrom) / (1.0 - uReliefFrom), 0.0, 1.0);

  // Physical: cover decides the colour, height mixes the browns in over it, so a
  // plateau keeps its greens and only a real range turns brown.
  vec3 physical = mix(texture2D(uLandRamp, vec2(coverT, 0.5)).rgb,
                      texture2D(uReliefRamp, vec2(relief, 0.5)).rgb, relief);
  physical = mix(physical, uSnow, clamp((relief - 0.78) / 0.22, 0.0, 1.0));

  // Snow needs three things to agree: bright, near-neutral, and somewhere snow
  // belongs. Brightness alone calls pale sand an ice cap.
  float latitude = abs(vUv.y * 180.0 - 90.0);
  float cold = step(uSnowLatitude, latitude) + step(uSnowHeight, height);
  float isSnow = min(1.0, cold) * step(uSnowLight, light) * step(abs(cover.r - cover.b), uSnowNeutral);
  physical = mix(physical, uSnow, isSnow);

  // Neon: height carries the ramp, with a little cover so flat land is not one
  // dead sheet of colour.
  vec3 neon = texture2D(uLandRamp, vec2(clamp(height * 0.74 + coverT * 0.34, 0.0, 1.0), 0.5)).rgb;

  // Three mip levels of the mask, blended: near a coast the tightest one still
  // carries land and the value stays low; it climbs as all three empty out.
  float shelf = maskAt(vUv, 2.0) * 0.34 + maskAt(vUv, 3.0) * 0.36 + maskAt(vUv, 4.0) * 0.30;
  float near = clamp(1.0 - shelf * uShelfSharp, 0.0, 1.0);

  float shallow = clamp((light - uSeaOpen) / (uSeaShallow - uSeaOpen), 0.0, 1.0) * uSeaImagery;

  // How far the depth ramp reaches depends on how much land is around. Distance to
  // the nearest coast cannot tell what it is measuring away from, only how far, so
  // on its own it gives a speck in mid-ocean the same broad shelf as a continent.
  float bulk = maskAt(vUv, 5.0) * 0.45 + maskAt(vUv, 6.0) * 0.55;
  float reach = mix(uBasinTight, uBasinWide, smoothstep(uBulkFrom, uBulkTo, bulk));

  // Square-rooted after the reach is applied, so most of the ramp is spent in the
  // water close to shore where the eye actually reads it.
  float basin = sqrt(clamp(texture2D(uDepth, smoothUv(vUv, DEPTH_SIZE)).r / max(reach, 0.02), 0.0, 1.0));
  float depth = min(min(near, basin), 1.0 - shallow);
  vec3 sea = texture2D(uSeaRamp, vec2(softBand(depth, uSeaBands, uSeaFade), 0.5)).rgb;

  vec3 onLand = mix(mix(physical, neon, uNeon), uCartoonLand, uCartoon);
  vec3 onSea = mix(sea, uCartoonSea, uCartoon);
  vec3 color = mix(onSea, onLand, land);
  color = mix(color, vec3(dot(color, LUMA)), uGrayscale);
  fragColor = vec4(color, 1.0);
}
`;

const rgb = ([r, g, b]: Rgb): Vector3 => new Vector3(r / 255, g / 255, b / 255);

export function createFlatMaterial(inputs: FlatShaderInputs): ShaderMaterial {
  const t = FLAT_THRESHOLDS;
  const cartoon = inputs.style === 'cartoon';
  // Cartoon draws its land as polygons and only needs the mask for islets, so it
  // asks for a stricter threshold and the limb rim goes away.
  const [landFrom, landTo] = cartoon ? [0.62, 0.82] : [0.42, 0.58];

  return new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uCover: { value: inputs.cover },
      uHeight: { value: inputs.height },
      uMask: { value: inputs.mask },
      uDepth: { value: inputs.depth },
      uLandRamp: { value: inputs.landRamp },
      uReliefRamp: { value: inputs.reliefRamp },
      uSeaRamp: { value: inputs.seaRamp },

      uHeightScale: { value: inputs.heightScale },
      uLandFrom: { value: landFrom },
      uLandTo: { value: landTo },
      uForceLand: { value: inputs.surface === 'land' ? 1 : 0 },
      uForceSea: { value: inputs.surface === 'sea' ? 1 : 0 },

      uCoverDark: { value: t.coverDark },
      uCoverBright: { value: t.coverBright },
      uReliefFrom: { value: t.reliefFrom },
      uSnow: { value: rgb(SNOW) },
      uSnowLight: { value: t.snowLight },
      uSnowNeutral: { value: t.snowNeutral },
      uSnowLatitude: { value: t.snowLatitude },
      uSnowHeight: { value: t.snowHeight },

      uSeaOpen: { value: t.seaOpen },
      uSeaShallow: { value: t.seaShallow },
      uSeaImagery: { value: t.seaImagery },
      uShelfSharp: { value: t.shelfSharp },
      uBasinTight: { value: t.basinTight },
      uBasinWide: { value: t.basinWide },
      uBulkFrom: { value: t.bulkFrom },
      uBulkTo: { value: t.bulkTo },
      uSeaBands: { value: rampStops(inputs.style).seaBands },
      uSeaFade: { value: SEA_FADE },

      uNeon: { value: inputs.style === 'modern' ? 1 : 0 },
      uCartoon: { value: cartoon ? 1 : 0 },
      uCartoonLand: { value: rgb(CARTOON_LAND) },
      uCartoonSea: { value: rgb(CARTOON_SEA) },
      uGrayscale: { value: inputs.grayscale ? 1 : 0 },
    },
  });
}
