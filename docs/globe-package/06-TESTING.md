# 06 — Testing

Two suites. Unit tests cover the pure logic; end-to-end tests cover everything that needs a real
GPU context, because a hand-written shader and a camera model fail at runtime, not at build time.

---

## 1. Unit tests — Vitest + jsdom

Colocated as `*.spec.ts` next to what they test. `vitest.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', include: ['src/**/*.spec.{ts,tsx}'], globals: true },
});
```

### 1.1 `defaults.spec.ts` — every documented default

The point of this file is that a default can never drift from the README without a test failing.
Assert **each** member of `GLOBE_DEFAULTS` explicitly, by value — not with a snapshot.

Also cover:

- `resolveGlobeProps({})` gives `countryHighlightColor === HIGHLIGHT_BY_STYLE.standard`.
- `resolveGlobeProps({ renderStyle: 'modern' })` gives `HIGHLIGHT_BY_STYLE.modern`.
- A string `countryHighlightColor` wins for every style.
- An object override falls back per style for the styles it omits.
- An explicitly `undefined` prop does **not** override its default.
- `pins` and `connections` omitted return the *same array identity* on repeated calls.
- `clampPose`: latitude to ±85, tilt to [0, 75], zoom to the given range, longitude wrapping
  (e.g. 190 → −170, −190 → 170, 180 → −180).
- `homePose`: `defaultCenter` alone sets lat/lng and keeps the default zoom; `defaultCamera` wins
  member-wise over `defaultCenter`; neither gives `DEFAULT_CAMERA`.
- `mergePose` ignores undefined members.
- `posesMatch` at and just outside each tolerance.

### 1.2 `utils/coordinates.spec.ts` — the landmark contract

**This is the most important unit test in the package.** It loads the real
`countries-50m.geojson` (via Vite's `?raw` import), prepares it, and asserts three landmarks:

```ts
const GULF_OF_GUINEA = { lat: 0, lng: 0 };       // open water off West Africa
const LONDON  = { lat: 51.5074, lng: -0.1278 };
const SYDNEY  = { lat: -33.8688, lng: 151.2093 };
```

- `findCountryAt(countries, 0, 0)` is `null` — (0, 0) is water.
- `findCountryAt` at London resolves to the United Kingdom, at Sydney to Australia.

If the sign convention or the texture orientation ever flips, one of these lands in the wrong
place. Everything else in the module is built on `latLngToVector3` being *exactly*
`SphereGeometry`'s vertex formula, and this is what pins it down.

Also cover:

- `vector3ToLatLng(latLngToVector3(p))` round-trips, including at the antimeridian and near
  the poles.
- `wrapLng` over its full range.
- `latLngToUv` corners.
- `greatCircleAngle` against a known distance — London to Sydney is ~16 990 km at
  `EARTH_RADIUS_KM = 6371`, so the angle times the radius should land within a percent.
- `greatCirclePath` returns `segments + 1` points, all at the requested lift, and handles an
  antipodal pair without producing NaN.
- `fitBounds`: a tight cluster gives a small zoom; a globe-spanning set clamps to `maxZoom`;
  an empty array returns `maxZoom`.

### 1.3 `utils/geo.spec.ts` — triangulation

Build synthetic countries from small lat/lng boxes.

- A simple box triangulates to a non-empty indexed mesh whose positions all sit at the requested
  radius.
- **Winding**: the same ring and its reverse produce triangles whose face normals both point
  *outward*. This is the assertion that stops the crescent-around-the-limb bug.
- A ring straddling the antimeridian produces no triangle spanning more than half the world.
- Subdivision: a box with edges longer than 2° comes back with more triangles than the
  triangulator produced.
- uvs are `(lng+180)/360, (lat+90)/180` for every vertex.
- A self-intersecting ring is skipped rather than throwing.

### 1.4 `utils/clustering.spec.ts` — the O(n) grid

- Pins inside the radius merge; distant ones do not.
- **Every pin appears exactly once** across all clusters — run 500 pins and assert both the count
  and the set size.
- A cluster's position is the mean of its members.
- Invisible pins are dropped entirely.
- Cluster ids are stable: the same input in the same order gives the same ids.
- **The budget**: 5 000 pins cluster in under 8 ms. This is the algorithmic half of the
  5 000-pin target; the e2e test only checks the frame loop is still running.

### 1.5 `utils/countryColors.spec.ts` — graph colouring

Build a grid of unit boxes that share corners.

- **The property that matters: touching countries never share a slot.** Assert it exhaustively
  over the adjacency it derived.
- Every country gets a slot in `[0, paletteSize)`.
- Isolated countries still get a slot.
- A country with more neighbours than there are slots takes one rather than none.
- Determinism: the same input gives the same assignment.

### 1.6 `core/layers/connections.spec.ts` — override resolution

- A link with no members falls back to every globe-wide default, `animated: false`.
- A link overrides each of `type`, `archHeight`, `lineStyle`, `width`, `color` independently.
- **`animated: true` with `lineStyle: 'solid'` resolves to `'dashed'`.**
- `animated: true` with an explicit `'dotted'` stays `'dotted'`.
- `connectionPath` with `'line'` returns points all at `SURFACE_LIFT`; with `'arch'` the midpoint
  is higher than both ends, and a longer link arches higher than a shorter one.

---

## 2. End-to-end tests — Playwright

One file, `e2e/globe-feature.spec.ts`, driving the demo app. Headless Chromium rasterises in
software, so nothing here is a performance assertion — these are correctness tests that happen to
need a GPU context.

### 2.1 Harness

```ts
const PLAYGROUND = '/';

/** Waits for the engine to report itself ready and the first frames to land. */
async function openPlayground(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(PLAYGROUND);
  await page.waitForFunction(() => '__globe' in window, undefined, { timeout: 30000 });
  await page.waitForTimeout(1200);
  return errors;
}

const setToggle = (page: Page, label: string, on: boolean) =>
  page.locator('label', { hasText: label }).first().locator('input[type=checkbox]').setChecked(on);
```

Most tests return the `errors` array from `openPlayground` and assert `expect(errors).toEqual([])`
at the end. That is how a shader compile failure gets caught.

For sampling pixels, Playwright hands back a PNG and there is no decoder in the repo — but the
browser under test is one. Decode it in the page with an `<img>` + canvas and read the pixel back.

**Screenshot discipline:** use a *page* screenshot with a `clip`, never an element screenshot. The
globe redraws continuously, so waiting for the element to be "stable" never finishes.

### 2.2 The tests

| Test | Asserts |
|---|---|
| renders an interactive globe with no console errors | canvas visible, width > 300, a `webgl2` context exists, `errors` empty |
| the imperative handle moves the camera | `setCamera({lat, lng, zoom, tilt}, {animate:false})` then `getCamera()` matches to 3 dp |
| zoom is clamped | `zoom: 0.1` → 1.1; `zoom: 99` → 4 |
| tilt is clamped | `tilt: -40` → 0; `tilt: 140` → 75 |
| projects the three landmarks | centred on (0,0): the Gulf lands dead centre; London is above it and within 5 % horizontally; **Sydney is `null`** because it is on the far side |
| `screenToLatLng` inverts `latLngToScreen` | round-trip to 1 dp |
| left drag rotates and right drag tilts | dragging right moves the centred longitude **west** (negative); tilt stays 0. Then a right-drag down gives tilt > 10 |
| the canvas suppresses its own context menu and nothing else | `contextmenu` on the canvas is `defaultPrevented`; on `document.body` it is not |
| wheel zooms, and with `enableZoom` off the page scrolls | wheel up reduces zoom; after toggling `enableZoom` off, a dispatched `wheel` event is **not** `defaultPrevented` |
| clusters carry their count and expand | at zoom 3.4 near Paris, cluster buttons whose whole text is a number; max count ≥ 3; at zoom 1.15 there are none |
| capitals appear only once close enough | at zoom 3.6 no "Paris"; at zoom 2 it is visible |
| country names render as crisp DOM text | with `showCountryNames` on at zoom 2.2, "France" is visible |
| every render override replaces its default | `clusterComponent` → a `button.rotate-45`; `controlsComponent` → a button labelled `<`; `pinComponent` → a `span.rotate-45`; `connectionComponent` → an `svg g[stroke] path` |
| an unknown connection endpoint warns instead of throwing | a captured warning contains both `atlantis` and `broken`; `errors` empty; canvas still visible |
| cartoon and grayscale change what is drawn, without a CSS filter | container and canvas both keep `filter: none` through a style change and a grayscale change |
| mounting and unmounting twenty times leaks no WebGL context | 20 navigation round-trips; `webglcontextlost` count is 0; exactly one canvas remains |
| holds a workable frame rate with five thousand pins | fps > 1 — this only catches a frame loop that has stopped |
| right drag keeps the grabbed point under the cursor | grab **off-centre** (42 %, 38 %) — a centred point would stay put whatever the anchoring did. After a 60 px drag, the grabbed coordinate is within 3 px of where it was grabbed, and tilt > 8 |
| a hard tilt cannot throw the globe out of position | a 260 px drag: tilt > 40, but `|lat - 20| < 25` and `|lng| < 25` — the drift cap held |
| reset returns the camera to where the globe opened | move away, `reset({animate:false})`, back to the opening pose |
| the reset button is offered only when there is something to undo | disabled at home, enabled after a zoom, disabled again after clicking it |
| `defaultCenter` is where the globe opens | opening pose is lat 25, lng 8 |
| every render style draws a different globe | four screenshots, four distinct base64 strings |
| every style compiles its shader without complaint | walk all four styles; no error matching `/shader|program|glsl/i`, and `errors` empty |
| the graticule and its labels can be turned on | no "30°E" initially; visible after `showGraticule`; gone again after `showGraticuleLabels` off |
| a design token background reaches WebGL instead of warning | select `var(--globe-demo-bg)`: **no `THREE.Color` warning**, and a corner pixel is the pale blue (`b > r`, `150 < r < 245`) not white |
| clouds can be turned off without changing the style | realistic style, two clipped screenshots differ |

### 2.3 Capturing warnings across the dev client

The unknown-endpoint test needs `console.warn` captured, but Vite's dev client installs its own
`console.warn` afterwards. A plain wrapper gets overwritten; use a getter that survives assignment:

```ts
await page.addInitScript(() => {
  const warnings: string[] = [];
  (window as unknown as { __warnings: string[] }).__warnings = warnings;
  const original = console.warn.bind(console);
  Object.defineProperty(console, 'warn', {
    configurable: true,
    get: () => (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); original(...args); },
    set: () => undefined,
  });
});
```

### 2.4 Timing

The waits in the original are generous and deliberate: 1200 ms after `__globe` appears,
400–700 ms after a toggle, 1500–2500 ms after a style change (the shaded styles have to build a
land mask, a distance field and 170 000 triangles). Under software rendering these are not
padding.

---

## 3. What is deliberately not tested

- **Pixel-exact renders.** The style test asserts four *different* pictures, not four specific
  ones. Software rasterisation is not stable enough across machines for golden images.
- **Frame rate as a number.** The 5 000-pin budget is asserted algorithmically in
  `clustering.spec.ts`; the e2e version only proves the loop is alive.
- **The shader's arithmetic.** There is no way to unit-test GLSL here; the e2e style walk plus a
  clean console is the coverage.
