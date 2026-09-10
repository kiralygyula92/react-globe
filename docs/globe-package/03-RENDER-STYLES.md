# 03 — The four render styles

Four different drawings of the world, not one with the lights turned down.

| Style | What it is |
|---|---|
| `standard` | **The default.** A cel-shaded physical map, taking the realistic render as its reference: land banded by land cover and height from green through straw and sand to brown and snow, sea banded from the coastal shelf out to deep water. Flat colours, no gradients. |
| `realistic` | Satellite imagery — an 8192 × 4096 day map, a normal map for relief, a specular map so oceans catch the light and land does not, a cloud shell and an atmospheric rim. |
| `cartoon` | A printed atlas: each country in one of six saturated poster hues — never the same as a neighbour's — with thick dark outlines and no sky. |
| `modern` | One blue family, gradient rather than flat: land climbs from indigo through electric blue to a hot cyan at the summits, against water that is dark right up to the shore. No coastline outline and no lit coastal edge — lit land meeting dark water directly is the whole picture — with a thin neon hairline left for borders. |

All three flat styles take their coastline from the country polygons, so they need
`assets.countriesGeoJson` (bundled by default) where `realistic` does not. `standard` and `modern`
additionally read a small elevation raster and the low-resolution day map — the first for height,
the second for land cover — and until both are decoded they wear a plain fill, then switch in
place.

---

## 1. Two principles that decide everything below

### 1.1 Nothing is baked at a fixed resolution

The flat styles were painted at first: banded on the CPU into one 2048-wide image. Magnify that
twenty times — which is what `minZoom` does — and every band edge is a soft, pixelated ramp,
because the *colour* was baked at 2048.

They are now **shaded in a fragment shader**. Nothing is baked: the rasters are sampled per
fragment and the banding is applied afterwards, so a band boundary is a level set of a smoothly
interpolated field and comes out pixel-sharp at any zoom. The coastline is a `smoothstep` across
the land mask for the same reason — hard enough to read as an edge, soft enough not to staircase.

It is also cheaper — no per-pixel JavaScript loop and no eight-megapixel readback.

**The banding itself is a sampler setting, not code.** The ramps are 256-wide textures, and
`NearestFilter` turns the same stops into the flat bands of a printed map where `LinearFilter`
turns them into a gradient. That one flag is the whole difference between the physical style and
the neon one.

### 1.2 Land is geometry, not paint

A coastline is an *edge*, and an edge painted into a raster is only ever as accurate as that
raster. At `minZoom` one texel of the 4096-wide land mask covers something like thirty screen
pixels, so the green met the blue up to half a texel from where the shoreline line — drawn from
the polygons — actually ran, and cartoon's dividers were a thirty-pixel smear of one colour into
the next.

Dilating fills, filtering them, not filtering them, doubling the resolution: none of it addresses
that the camera can always close in one step further than the last raster. **Drawing from the
polygons makes the coast and the shoreline line the same edge by construction.**

---

## 2. `SurfaceLayer`

`src/core/layers/SurfaceLayer.ts`. Owns the globe body, the atmosphere shells, the clouds, and
the `LandLayer`.

### 2.1 Constants

```ts
const LAND_MESH_ZOOM = 2.4;   // camera distance below which land is drawn from polygons
const SEGMENTS_W = 384;
const SEGMENTS_H = 192;
export const GLOBE_RADIUS = 1;
const CLOUD_RADIUS = 1.006;
const RIM_RADIUS   = 1.022;
const HALO_RADIUS  = 1.1;
const CLOUD_DRIFT = 0.004;    // radians per second
const CLOUD_STEP  = 0.1;      // seconds between cloud steps — 10 Hz
```

**384 × 192 segments** is 0.94° per segment, so at `minZoom` — where the visible cap is about 25°
across — the limb is built from roughly 27 steps and reads as a clean curve. One draw call either
way; the vertex count is not the bottleneck.

**Cloud drift at 10 Hz** is 0.02° a step — invisible — and it is what lets an otherwise idle globe
stop redrawing sixty times a second.

The atmosphere shells (`rim`, `halo`) share one cheaper `SphereGeometry(1, 96, 48)`.

### 2.2 `setStyle(style, textures, countries)`

```ts
setStyle(style: SurfaceStyle, textures: SurfaceTextureSet, countries: readonly PreparedCountry[]) {
  this.disposeMaterials();
  this.currentStyle = { style, textures, countries };

  if (isFlat(style.renderStyle)) {
    const material = this.flatMaterial(style, countries, textures,
      this.land.ready && this.landShowing() ? 'sea' : 'both');
    this.globe.material = material;
    this.shellShader = 'uniforms' in material ? material as ShaderMaterial : null;
  } else {
    // realistic: prepare textures for filtering, build the Phong material
  }

  // Each style gets its own sky. Cartoon asks for none.
  const sky = ATMOSPHERE_COLORS[style.renderStyle];
  const atmosphereVisible = sky.rimIntensity > 0;
  ...
  this.dressLand(style, countries, textures);
  this.setClouds(style.renderStyle === 'realistic' && style.showClouds ? textures.clouds : null, style.grayscale);
}
```

`isFlat(style)` is simply `style !== 'realistic'`.

Every material the layer creates is pushed onto `ownedMaterials` and disposed on the next
`setStyle` or on `dispose()`. Textures handed in via `own(...)` are disposed exactly once each.

### 2.3 The land-mesh distance gate

```ts
setZoom(zoom: number): boolean {
  const close = zoom <= LAND_MESH_ZOOM;
  if (close === this.landClose) return false;
  this.landClose = close;

  if (!this.land.ready) {
    if (close && currentStyleIsFlat) this.scheduleLand(countries);
    return false;
  }

  this.land.setVisible(this.landShowing());
  if (this.shellShader) this.shellShader.uniforms.uForceSea.value = this.landShowing() ? 1 : 0;
  return true;
}
```

`landShowing()` is `landAlways || landClose`, where `landAlways` is true for `cartoon` — its
colour lives in that mesh, so it is drawn always.

**Why the gate exists, and it is not a micro-optimisation.** The first version built the mesh
everywhere and turned a nine-minute end-to-end suite into a two-hour one: an ambient globe sits
behind several routes, so *every* page in the suite was triangulating the world and then
rasterising it in software, to place a coastline whose texels were half a pixel wide. Beyond 2.4
radii the mask is indistinguishable and free.

The coast moves by less than a pixel on the way through the threshold, which is why the swap does
not read as a pop.

### 2.4 The idle-callback build

```ts
private scheduleLand(countries: readonly PreparedCountry[]): void {
  if (this.landBuild !== 0 || this.disposed || countries.length === 0) return;

  const run = (): void => {
    this.landBuild = 0;
    // A route change can retire the globe between the request and the call.
    if (this.disposed) return;
    this.land.build(countries);
    this.landArrived = true;    // picked up by the frame loop
  };

  if (typeof requestIdleCallback === 'function') {
    this.landIdle = true;
    this.landBuild = requestIdleCallback(run, { timeout: 2500 });
  } else {
    this.landIdle = false;
    this.landBuild = setTimeout(run, 120) as unknown as number;
  }
}
```

Track *which* timer is pending (`landIdle`), because `cancelIdleCallback` and `clearTimeout` are
not interchangeable — `dispose()` has to cancel the right one.

`update()` picks up `landArrived` and re-runs `setStyle` with the stored inputs, so the shell is
redressed as sea-only and the mesh as land **in the same frame** — no frame ever shows both.

### 2.5 Atmosphere

A back-faced sphere just outside the globe, additively blended, with `depthWrite: false`:

```glsl
// Back faces, so the normal points away from us: the rim is where the
// shell is most edge-on, which is exactly where 1 - |n.z| peaks.
float rim = 1.0 - abs(vNormalView.z);
gl_FragColor = vec4(uColor, pow(rim, uPower) * uIntensity);   // uPower = 2.6
```

```ts
export const ATMOSPHERE_COLORS = {
  realistic: { rim: 'rgb(122, 176, 255)', halo: 'rgb(86, 140, 226)', rimIntensity: 0.55, haloIntensity: 0.16 },
  standard:  { rim: 'rgb(168, 205, 240)', halo: 'rgb(126, 170, 214)', rimIntensity: 0.34, haloIntensity: 0.1 },
  modern:    { rim: 'rgb(96, 226, 255)',  halo: 'rgb(28, 74, 190)',   rimIntensity: 0.9,  haloIntensity: 0.3 },
  cartoon:   { rim: 'rgb(122, 176, 255)', halo: 'rgb(86, 140, 226)',  rimIntensity: 0,    haloIntensity: 0 },
} as const;
```

Cartoon asks for none, because a drawn world with a glow around it reads as two pictures at once.
The modern style leans on its glow hardest: a hot cyan rim over a deep navy halo.

---

## 3. `realistic`

`MeshPhongMaterial`, **not** `MeshStandardMaterial`:

```ts
new MeshPhongMaterial({
  map: day, normalMap: normal, specularMap: specular,
  specular: new Color('rgb(70, 88, 110)'),   // land reads matte; the map lets oceans catch the sun
  shininess: 18,
  color: day ? white : new Color('rgb(38, 74, 120)'),
});
material.normalScale.set(0.85, 0.85);
```

The dataset shipped is a **specular mask** — water reflective, land not — and `MeshPhongMaterial`
consumes that directly. A PBR material would want a roughness map instead and would force us to
invent one.

Texture preparation for the surface maps:

```ts
texture.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
texture.wrapS = RepeatWrapping;          // longitude is cyclic; without this the seam samples clamped edge texels
texture.generateMipmaps = true;
texture.minFilter = LinearMipmapLinearFilter;
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
```

**Sharpness strategy: a preview plus a high-resolution base with mipmapping and maximum
anisotropy — not tiled LOD.** A tile pyramid needs either a tile server or tens of megabytes in
the repo, and neither is justified when the visible cap at `minZoom` is about 25° across: against
an 8192 px-wide source that is roughly 570 texels per 100 screen px, which stays clean. Anisotropy
is what keeps the oblique views that tilt produces from smearing. Past this, sharpness needs a tile
service, which `assets.dayTexture` can be pointed at.

Clouds: a shell at 1.006 radii, `MeshPhongMaterial` with the grayscale cloud map as `alphaMap`,
white, `transparent`, `opacity` 0.62 (0.5 in grayscale), `depthWrite: false`, `shininess: 0`.
Rotated by `CLOUD_DRIFT * elapsed` about Y at 10 Hz.

---

## 4. `grayscale` — a shader edit, never a CSS filter

`src/core/materials/grayscale.ts`. Rewrites a material's fragment shader to collapse its output
to Rec. 709 luminance:

```ts
export function applyGrayscale<T extends Material>(material: T): T {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    // `colorspace_fragment` is the last thing that touches gl_FragColor, so
    // desaturating just before it catches lighting, maps and fog alike.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <colorspace_fragment>',
      'gl_FragColor.rgb = vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)));\n\t#include <colorspace_fragment>',
    );
  };

  // Materials are keyed by their program cache key; without this, a grey globe
  // and a colour one in the same page would share one compiled program.
  const baseKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${baseKey()}|grayscale`;
  material.needsUpdate = true;
  return material;
}
```

**Both halves are required.** The shader edit is what keeps pins, labels and popups in colour —
they sit in the DOM above the canvas and are the consumer's content, not ours. The cache-key
override is what stops two globes on one page from sharing a program.

The flat shader handles grayscale with its own `uGrayscale` uniform instead, and the atmosphere
material takes a pre-desaturated colour.

---

## 5. The shaded styles — `standard` and `modern`

### 5.1 What is being drawn from

Three fields, none of them a bathymetric raster, because none is among the datasets that can
reasonably be shipped:

**Land cover**, from the 2048 day map already carried as the realistic style's preview. This is
what makes a physical map read as one: the Sahara is sand and the Congo green at much the same
height, and only the imagery knows the difference. Sampled at known places, that map separates
them cleanly — rainforest lands near a luma of 60, temperate cover near 100, steppe near 130, open
desert past 200 — so brightness alone picks the band.

**Height**, from a 2048 topology raster, stretched against its own 96th percentile because the
peaks occupy a thin slice of the 0-255 span. Height *mixes over* cover rather than replacing it,
so a plateau keeps its greens and only a real range turns brown.

**Distance from land** as a stand-in for depth, in two halves:

- *The tight one* — the shelf ringing every coast — is the steepest part of the gradient and the
  part a coarse field renders as blocks. It is read from **three mip levels of the 4096-wide land
  mask**, blended, per fragment: a multi-scale distance estimate that stays smooth at any zoom,
  for three texture reads. None of the three goes coarser than mip 4; past that a texel spans
  several degrees, and magnifying its interpolation puts faint diamonds in the water.
- *The wide one* is an **exact Euclidean distance transform** at 2048 × 1024.

### 5.2 Why an exact distance transform, and not something cheaper

Getting the sea to stop stepping took four attempts, and each failure printed the shape of its own
error onto the open ocean:

1. **Repeated box blurs.** A box blur's support is a *square*, so out where the blurred field
   finally reached zero, the deepest band inherited that square and the ocean ended in a staircase.
2. **Chamfer weights.** A 3-4 chamfer counts a diagonal as 4/3 of a step, and the level sets of
   that metric are octagons — which is precisely what the deep bands were drawing.
3. **Felzenszwalb and Huttenlocher's transform** is exact and linear in the number of texels, so
   its level sets are circles and there is no artefact left to inherit.
4. Separately, the *near-shore* bands stepped because a baked field's steepest region is exactly
   where its grid shows — hence the mip chain.

And bilinear filtering is only C0, so its slope jumps at every texel boundary and quantising that
turns the jump into a visible kink. Easing the position within the texel before sampling
(`smoothUv`) makes the reconstruction smooth across the boundary, for no extra taps.

### 5.3 `distanceToLand` — the implementation

```ts
const DEPTH_W = 2048, DEPTH_H = 1024;
const DEPTH_RANGE = 160;   // texels the field can still tell apart — about 28 degrees of arc
```

`edt1d(f, n, out, v, z)` walks the lower envelope of the parabolas `(q - i)² + f[i]`: `v` holds the
parabolas that are lowest somewhere and `z` the crossings between them, so the whole line is
transformed in one pass forward and one back rather than in a search per cell.

The 2D pass:

1. **Rows first, wrapping in longitude** — run over a *tripled* row and keep the middle, so the
   Pacific grows no seam.
2. **Between the two passes, scale the horizontal distances by `cos(latitude)`** (clamped to a
   minimum of 0.15), because an equirectangular texel is that much narrower in longitude than it
   is tall. Without it the Arctic reads as the farthest place from any coast.
3. Columns.
4. `sqrt` at the end.

The result is written into a `DataTexture` (RedFormat, UnsignedByteType) as
`min(1, distance / DEPTH_RANGE) * 255`, **with the rows flipped**, because a texture is read with
v running bottom to top.

Stored as a plain fraction with no curve applied, because how much of it counts as deep water is
decided per fragment.

### 5.4 The land mask

4096 × 2048, drawn by tracing every country polygon white on black into a 2D canvas with
`fill('evenodd')`. `LinearSRGBColorSpace` (it is a mask; an sRGB decode would bend its midpoint),
`RepeatWrapping`, mipmaps on, `LinearMipmapLinearFilter`.

It is the only input whose sharpness the eye can follow — the colour fields are genuinely smooth
and magnify without complaint, but a coastline is an edge and reads as a staircase if it is too
coarse.

### 5.5 `heightScaleOf`

Draws the elevation raster and the land mask into 2048 × 1024 canvases, builds a histogram of
heights **over land only**, and returns `1 / max(24, the 96th-percentile value)` — so a handful of
summits cannot set the scale for all.

**Remember the flip.** If the elevation source is an `ImageBitmap` (decoded with
`imageOrientation: 'flipY'`), the canvas draw must flip it back:

```ts
if (elevation instanceof ImageBitmap) { ctx.translate(0, DEPTH_H); ctx.scale(1, -1); }
ctx.drawImage(elevation, 0, 0, DEPTH_W, DEPTH_H);
ctx.setTransform(1, 0, 0, 1, 0, 0);
```

**This was the bug that made the first attempt look nothing like the reference.** Both rasters
were being read upside down, so the land cover for the Sahara was coming from the southern ocean.

---

## 6. Palettes — `core/materials/flatTexture.ts`

All colours are `rgb()` triples; no hex literals anywhere.

### 6.1 `standard`

```ts
// Land cover: forest green → olive → straw → pale sand. Nothing above that —
// snow and rock arrive by their own routes.
const COVER_STOPS = [
  [0.00, [ 92, 146,  84]], [0.16, [116, 162,  88]], [0.32, [146, 178,  96]],
  [0.48, [176, 190, 108]], [0.62, [202, 196, 126]], [0.76, [220, 202, 150]],
  [0.88, [232, 214, 176]], [1.00, [240, 228, 202]],
];

// Where height takes over from cover: the browns of a range, then bare rock.
const RELIEF_STOPS = [
  [0.00, [150, 122,  84]], [0.35, [134,  98,  66]],
  [0.70, [112,  78,  58]], [1.00, [140, 122, 112]],
];

export const SNOW = [246, 248, 250];

// Sea, from the coastal shelf out to deep water.
const SEA_STOPS = [
  [0.00, [176, 216, 230]], [0.07, [156, 205, 224]], [0.15, [134, 189, 216]],
  [0.24, [113, 172, 206]], [0.34, [ 95, 155, 197]], [0.45, [ 78, 137, 187]],
  [0.56, [ 64, 119, 174]], [0.67, [ 52, 102, 160]], [0.78, [ 42,  86, 144]],
  [0.89, [ 32,  70, 124]], [1.00, [ 24,  58, 104]],
];
```

### 6.2 `modern`

```ts
const NEON_LAND_STOPS = [
  [0.00, [ 26,  52, 132]], [0.22, [ 34,  88, 186]], [0.45, [ 42, 138, 226]],
  [0.68, [ 66, 194, 246]], [0.85, [138, 232, 252]], [1.00, [226, 250, 255]],
];

// Dark from the shore outward, and barely graded at all.
const NEON_SEA_STOPS = [
  [0.00, [10, 26, 68]], [0.35, [8, 20, 58]], [0.70, [6, 15, 46]], [1.00, [4, 10, 34]],
];
```

Two earlier versions lit the coast — first with a hot cyan, then merely with a brighter blue — and
both read as a halo drawn around every landmass. The contrast this style wants is lit land against
dark water meeting directly, so the sea gives up its shelf entirely.

`rampStops('modern')` returns `NEON_LAND_STOPS` for **both** `land` and `relief`, and
`banded: false`.

### 6.3 `cartoon`

```ts
export const CARTOON_FILLS = [38, 96, 172, 268, 320, 14].map(h => `hsl(${h}, 58%, 62%)`);
export const CARTOON_SEA  = [55, 122, 168];
export const CARTOON_LAND = [214, 200, 168];   // islets too small for the dataset
```

Six travel-poster hues, assigned by graph colouring (see `02-ARCHITECTURE.md` §6.4).

### 6.4 Thresholds and banding

```ts
export const FLAT_THRESHOLDS: FlatShaderThresholds = {
  coverDark: 40, coverBright: 190,
  reliefFrom: 0.58,
  snowLight: 200, snowNeutral: 30, snowLatitude: 58, snowHeight: 0.66,
  seaOpen: 62, seaShallow: 150, seaImagery: 0.55,
  shelfSharp: 2.6,
  basinTight: 0.09, basinWide: 0.72,
  bulkFrom: 0.03, bulkTo: 0.34,
};

export const SEA_BANDS = 26;
export const SEA_FADE = 0.36;
```

**The sea's bands fade into one another.** Hard steps read as contour lines rather than as water,
and wide ones read as a stack of flat plates — so there are many narrow bands, each holding its
colour across the middle and easing into the next over the rest. Land keeps its hard steps: a map
of cover types is meant to look printed. This is why the sea ramp is sampled with **linear**
filtering while the land ramps are **nearest** — the stepping moved out of the sampler and into
`softBand`, which is what let its width and softness become separate numbers.

`cartoon` and `modern` both pass `seaBands: 0` (an unbroken sea): one because it is a drawn world,
the other because its water is nearly one colour.

### 6.5 `createRampTexture(stops, banded)`

A 256 × 1 `DataTexture`, `RGBAFormat`, `LinearSRGBColorSpace` (**not** sRGB — these values go
straight to an sRGB framebuffer, so they must pass through the sampler untouched),
`ClampToEdgeWrapping`, and `min/magFilter = banded ? NearestFilter : LinearFilter`.

`banded` picks the last stop at or below `t`; otherwise it interpolates between the bracketing
pair.

---

## 7. The fragment shader — `core/materials/flatShader.ts`

Written against **GLSL ES 3.00** for one reason: `textureLod`, which is what lets the shelf be
read off the mask's mip chain. three's `GLSL3` prefix keeps `varying`, `texture2D` and the rest
working, but it does **not** stand in for `gl_FragColor` — the fragment output must be declared
explicitly:

```glsl
out vec4 fragColor;
```

A hand-written shader fails at runtime rather than at build time, so the e2e suite walks all four
styles and asserts the console stayed clean.

### 7.1 Helpers

```glsl
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec2 MASK_SIZE  = vec2(4096.0, 2048.0);
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
```

### 7.2 Main, step by step

```glsl
vec3  cover  = texture2D(uCover, vUv).rgb * 255.0;
float light  = dot(cover, LUMA);
float height = clamp(texture2D(uHeight, vUv).r * 255.0 * uHeightScale, 0.0, 1.0);

// The coastline. Where the threshold sits is a style's own business: at the limb
// the mask is sampled across a whole mip level, so its coast arrives as a smear
// of middling values, and a low threshold turns that smear into a rim of land all
// the way round the planet.
float land = smoothstep(uLandFrom, uLandTo, texture2D(uMask, vUv).r);

// Once the land is drawn as polygons, the mask is not asked where the coast is.
land = mix(mix(land, 1.0, uForceLand), 0.0, uForceSea);
```

`uLandFrom` / `uLandTo` are `0.42 / 0.58` for the shaded styles and **`0.62 / 0.82` for cartoon**
— cartoon draws its land as polygons and only needs the mask for islets, so it asks for a stricter
threshold and the limb rim goes away.

```glsl
float coverT = clamp((light - uCoverDark) / (uCoverBright - uCoverDark), 0.0, 1.0);
float relief = clamp((height - uReliefFrom) / (1.0 - uReliefFrom), 0.0, 1.0);

// Physical: cover decides the colour, height mixes the browns in over it, so a
// plateau keeps its greens and only a real range turns brown.
vec3 physical = mix(texture2D(uLandRamp,   vec2(coverT, 0.5)).rgb,
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
```

The sea:

```glsl
// Three mip levels of the mask, blended: near a coast the tightest one still
// carries land and the value stays low; it climbs as all three empty out.
float shelf = maskAt(vUv, 2.0) * 0.34 + maskAt(vUv, 3.0) * 0.36 + maskAt(vUv, 4.0) * 0.30;
float near  = clamp(1.0 - shelf * uShelfSharp, 0.0, 1.0);

float shallow = clamp((light - uSeaOpen) / (uSeaShallow - uSeaOpen), 0.0, 1.0) * uSeaImagery;

// How far the depth ramp reaches depends on how much land is around. Distance to
// the nearest coast cannot tell what it is measuring away from, only how far, so
// on its own it gives a speck in mid-ocean the same broad shelf as a continent.
float bulk  = maskAt(vUv, 5.0) * 0.45 + maskAt(vUv, 6.0) * 0.55;
float reach = mix(uBasinTight, uBasinWide, smoothstep(uBulkFrom, uBulkTo, bulk));

// Square-rooted after the reach is applied, so most of the ramp is spent in the
// water close to shore where the eye actually reads it.
float basin = sqrt(clamp(texture2D(uDepth, smoothUv(vUv, DEPTH_SIZE)).r / max(reach, 0.02), 0.0, 1.0));
float depth = min(min(near, basin), 1.0 - shallow);
vec3  sea   = texture2D(uSeaRamp, vec2(softBand(depth, uSeaBands, uSeaFade), 0.5)).rgb;
```

Scaling the reach by the local land fraction costs two texture reads and puts the graded water
where the coasts are. It is what a bathymetric chart shows, and for the same reason: the sea floor
falls away from an isolated peak in tens of kilometres, and from a continental margin over
hundreds.

Composite:

```glsl
vec3 onLand = mix(mix(physical, neon, uNeon), uCartoonLand, uCartoon);
vec3 onSea  = mix(sea, uCartoonSea, uCartoon);
vec3 color  = mix(onSea, onLand, land);
color = mix(color, vec3(dot(color, LUMA)), uGrayscale);
fragColor = vec4(color, 1.0);
```

### 7.3 `surface: 'both' | 'sea' | 'land'`

One shader, three roles, selected by two uniforms:

| Value | `uForceLand` | `uForceSea` | Used for |
|---|---|---|---|
| `'both'` | 0 | 0 | The shell while the land mesh is still being built — coast comes from the mask |
| `'sea'` | 0 | 1 | The shell once the land mesh is drawing |
| `'land'` | 1 | 0 | The land mesh itself |

Cartoon binds the physical ramps too even though it reads none of them — they have to be bound for
the shader to link.

---

## 8. `LandLayer`

`src/core/layers/LandLayer.ts`.

```ts
const LAND_RADIUS = 1.001;
```

Just clear of the sphere and of the chords of the triangles laid over it, and **below** the
shoreline at 1.0016 so the outline still sits on top.

### 8.1 One geometry, grouped by palette slot

`landData(countries)` assigns each country a slot with `assignCountryColors`, triangulates each
country, and merges them into one indexed geometry — ordered by slot, with one
`geometry.addGroup(start, count, slot)` per run.

That means **cartoon hands it an array of six flat materials** and gets its per-country colour for
six draw calls and no vertex-colour attribute, while **the shaded styles hand it a single shader
material** and pay for one. A single material ignores the groups and draws the lot in one call.

All 242 countries come to about 170 000 triangles and 270 ms.

### 8.2 The page-level cache

```ts
const CACHE = new WeakMap<object, LandData>();
```

Keyed by the country array itself. Two globes can be mounted at once and they share that array out
of the asset cache, so there is no reason for the second one to spend another quarter of a second
arriving at the same answer. **The buffers are shared; each globe wraps them in its own
`BufferGeometry`,** because disposing one must not empty the other.

### 8.3 Mesh settings, and one that is deliberately absent

```ts
mesh.frustumCulled = false;      // the whole world is in here; a bounding test can never reject it
mesh.raycast = () => undefined;  // hit-testing raycasts the globe itself
mesh.renderOrder = 0;
```

Cartoon materials: `MeshBasicMaterial({ color, side: FrontSide, toneMapped: false })`. **Opaque,
so it writes depth** — a border on the far side has to be hidden by the near side rather than
drawn through it.

**No `polygonOffset`, deliberately.** The obvious way to hold a decal off the surface it decorates
is a negative offset, and here it drew a wide crescent of one country's colour around the whole
limb: the offset a driver applies scales with the fragment's depth slope, that slope runs away
where the sphere turns edge-on, and the far side of this shell was being pulled through the near
side by it. **A thousandth of a radius of real clearance does the same job at every angle.**

Grayscale for cartoon is applied to the material colours directly (Rec. 709 luma), since these are
`MeshBasicMaterial`s with no shader edit.

---

## 9. Summary of what each style needs

| | `standard` | `realistic` | `cartoon` | `modern` |
|---|---|---|---|---|
| Country polygons | yes | no | yes | yes |
| Land mask + depth field | yes | no | yes (islets only) | yes |
| Elevation + land-cover rasters | yes | no | no (bound but unread) | yes |
| Day / normal / specular / cloud textures | no | yes | no | no |
| Land drawn as geometry | below 2.4 radii | no | **always** | below 2.4 radii |
| Atmosphere | subtle | yes | **none** | strong |
| Ramp filtering | nearest (banded) | — | — | linear (gradient) |
| Sea bands | 26 | — | 0 | 0 |
