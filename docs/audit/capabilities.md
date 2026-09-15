# Phase 1 — Reconciled capability list

Plugin: `react-globe` (npm package name as configured in `packages/globe/package.json`; see
[GAPS.md](../GAPS.md) G-01). Audit date: 2026-09-15. Commit audited: `7f39b13`.

## How this list was reconciled

The brief asks for three independent sources. Only two exist:

| Source | What was read | Available |
|---|---|---|
| **S — Source code** | `packages/globe/src/index.ts` (public exports), `types.ts` (`GlobeProps`, `GlobeHandle`, render-prop interfaces), `defaults.ts`, `Globe.tsx`, `core/**`, `components/**`, `hooks/**` | Yes |
| **D — Current docs claims** | `packages/globe/README.md` (the de facto site), root `README.md`, `CHANGELOG.md` | Yes |
| **M — Marketplace listing** | npm: `react-globe` is an **unrelated package** (chrisrzhou, v5.0.2). GitHub repo is private (no public description/topics). | **No** — G-01, G-02 |
| **T — Tests** *(supplementary, not one of the three)* | `e2e/globe.spec.ts` (27 tests), 6 unit spec files | Yes |

The historical `docs/globe-package/*` specification (removed in `7f39b13`) was **not** used as a
source — see G-14.

**Verdict key:** **Confirmed** — S and D agree. **Undocumented** — in S, missing or incomplete
in D. **Discrepancy** — D contradicts S. **Unverified** — D claims something S cannot prove and
no test covers it.

Capability IDs `C-nn` are audit IDs only. Stable `capabilityId`s, slugs, groups, plans and
lifecycles are assigned in Phase 2.

---

## Summary

| ID | Capability | Public symbols (S) | D section | T | Verdict |
|---|---|---|---|---|---|
| C-01 | Globe component & sizing | `Globe`, `GlobeProps.width/height/className` | Use; Props › Sizing | e2e #1 | Confirmed |
| C-02 | Lazy loading & bundler setup | `GlobeLazy` | Globe or GlobeLazy; Vite dev server | — | Confirmed, with limitation (see notes) |
| C-03 | Camera pose (controlled / uncontrolled) | `camera`, `defaultCamera`, `defaultCenter`, `onCameraChange`, `CameraPose` | Props › Camera and interaction | e2e reset, defaultCenter | Confirmed |
| C-04 | Built-in controls | `showControls`, `controlsComponent`, `GlobeControlsRenderProps` | Props › Camera; Render overrides | e2e reset button, overrides | Confirmed |
| C-05 | Imperative camera API | `GlobeHandle.setCamera/reset/flyTo/zoomIn/zoomOut/getCamera`, `ref`, `onReady` | GlobeHandle | e2e handle, zoom/tilt clamp | Confirmed |
| C-06 | Auto-rotate | `GlobeHandle.startAutoRotate/stopAutoRotate` | GlobeHandle | e2e 5 000 pins (used, not asserted) | Confirmed |
| C-07 | Pointer & touch interaction | `enableZoom`, `enableRotation`, `enableTilt`, `minZoom`, `maxZoom` | Props › Camera; intro bullet | e2e drag/tilt/wheel/context menu | **Undocumented** (pinch, context menu) |
| C-08 | Screen projection | `GlobeHandle.latLngToScreen/screenToLatLng`, `ScreenPoint` | GlobeHandle | e2e projection, inversion | Confirmed |
| C-09 | Shorelines & country borders | `showShorelines`, `showCountryBorders` | Props › Geography | — | Confirmed |
| C-10 | Country names | `showCountryNames`, `countryNamesMinZoom` | Props › Geography | e2e country names | Confirmed |
| C-11 | Capitals | `showCapitals`, `capitalsMinZoom`, `CapitalRecord`, `assets.capitalsDataset` | Props › Geography | e2e capitals | Confirmed |
| C-12 | Country hover & click | `highlightCountryOnHover`, `countryHighlightColor`, `showCountryNameOnHover`, `onCountryHover`, `onCountryClick`, `CountryFeature`, `CountryProperties`, `CountryCollection` | Props › Geography; Accessibility | — | Confirmed (untested) |
| C-13 | Graticule | `showGraticule`, `showGraticuleLabels` | Props › Geography | e2e graticule | Confirmed |
| C-14 | Render styles, grayscale & clouds | `renderStyle`, `RenderStyle`, `colorScheme`, `showClouds` | Props › Appearance; intro bullet | e2e styles, shaders, grayscale, clouds | Confirmed |
| C-15 | Background colour | `backgroundColor` | Props › Appearance | e2e design-token background | Confirmed |
| C-16 | Custom assets | `assets`, `GlobeAssets`; package export `./assets/*` | Props › Appearance; Assets | — | **Discrepancy** |
| C-17 | Pins | `pins`, `Pin`, `pinComponent`, `PinRenderProps`, `onPinHover`, `onPinClick` | Props › Pins; Render overrides | e2e overrides, 5 000 pins | **Discrepancy** + **Unverified** |
| C-18 | Pin popups | `showPinPopup`, `pinPopupComponent`, `PinPopupRenderProps`, `PinPopupPlacement` | Props › Pins; Render overrides | e2e overrides | Confirmed |
| C-19 | Pin clustering | `enablePinClustering`, `clusterZoomThreshold`, `clusterRadiusPx`, `clusterComponent`, `ClusterRenderProps`, `onClusterClick` | Props › Pins; Render overrides | e2e clusters; unit < 8 ms | Confirmed |
| C-20 | Connections | `enableConnections`, `connections`, `PinConnection`, `connectionType`, `ConnectionType`, `archHeight`, `connectionLineStyle`, `ConnectionLineStyle`, `connectionWidth`, `connectionColor`, `connectionComponent`, `ConnectionRenderProps`, `ConnectionPathPoint`, `DefaultConnection` | Props › Connections; Render overrides | e2e overrides, unknown endpoint; unit paths | Confirmed |
| C-21 | Theming with CSS custom properties | *(none — CSS variable names are string literals in components)* | Theming | e2e design-token background (demo var only) | Confirmed; **no machine source** |
| C-22 | Isolated stylesheet | package export `./globe.css` | Install | — | Confirmed |
| C-23 | Render overrides (cross-cutting) | `pinComponent`, `pinPopupComponent`, `clusterComponent`, `connectionComponent`, `controlsComponent` | Render overrides | e2e every override | Confirmed |
| C-24 | Lifecycle & error handling | `onReady`, `onError` | Props › Lifecycle | e2e 20× mount/unmount | Confirmed (onError untested) |
| C-25 | Accessibility & reduced motion | *(behaviour only)* | Accessibility | — | Confirmed (untested) |

---

## Notes per capability

Only capabilities with something to report beyond "Confirmed" are expanded.

### C-02 Lazy loading & bundler setup
- S: `Globe.lazy.tsx` wraps `import('./Globe')` in `React.lazy` + `Suspense` with `GlobeFallback`.
- S/build: `index.ts` also re-exports `Globe` statically, so the library build emits
  `INEFFECTIVE_DYNAMIC_IMPORT` and **`GlobeLazy` does not create a separate chunk** when imported
  from the package entry.
- D: the README states this and gives a workaround (dynamic import of the consumer's own module).
  Claim and code agree; this is a **Limitation**, not a gap.
- D: the Vite `optimizeDeps` recipe is verified by `apps/demo/vite.config.ts`. No equivalent recipe
  or verification exists for other bundlers (G-08).

### C-07 Pointer & touch interaction
- S (`core/controls/PointerControls.ts`): left-drag orbit with inertia, right-drag or
  shift+left-drag tilt anchored on the grabbed point, wheel zoom, **two-finger pinch zoom**,
  context-menu suppression on the canvas only, tilt clamp 0°–75°, latitude clamp ±85°.
- D: mentions left-drag, right-drag, wheel. **Pinch zoom and context-menu suppression are
  undocumented** (G-04).
- S: there is **no keyboard control of the globe itself**; only the built-in control buttons are
  keyboard reachable (C-04). D does not claim otherwise. Candidate Limitation.

### C-16 Custom assets
- D: *"Override any texture or dataset; anything left out uses the bundled file."*
- S (`types.ts` `GlobeAssets`, `hooks/useGlobeAssets.ts`): only `dayTexture`, `normalMap`,
  `specularMap`, `cloudsTexture`, `countriesGeoJson`, `capitalsDataset` are overridable. The
  **coastline, borders, elevation and land-cover rasters are not**, and land cover for the shaded
  styles always comes from the bundled `earth-day-2048.jpg`, even when `dayTexture` is overridden.
- **Discrepancy** — the claim is broader than the implementation (G-03).
- D: "A raw Natural Earth file works: `NAME`, `ADMIN`, `ISO_A3`, `ADM0_A3` accepted as fallbacks" —
  confirmed by `utils/geo.spec.ts` (`NAME`, `ISO_A3` cases).

### C-17 Pins
- D: `onPinHover` documented as `(pin, event) => void`.
  S: `(pin: Pin<TData> | null, event: PointerEvent) => void` — it also fires with `null` on hover
  end. **Discrepancy** (G-05).
- D: "Placed at exact lat/lng, occluded by the globe"; default marker is one instanced mesh; override
  switches to DOM — confirmed in `core/layers/PinLayer.ts` and `Globe.tsx`.
- D: **"5 000 pins at an interactive frame rate"** — the e2e test only asserts `fps > 1` under
  software rendering; the unit test only covers clustering time (< 8 ms). No test or measurement
  supports "interactive frame rate". **Unverified** (G-07).
- D: default popup reads `title`/`name`/`label` and `subtitle`/`description`/`caption` from
  `Pin.data` — convention present in `components/DefaultPinPopup.tsx`.

### C-19 Pin clustering
- D: `onClusterClick` default "fly to fit" — confirmed (`Globe.tsx` → `fitBounds`).
- D: "Clustering is a uniform screen-space grid: O(n), under 8 ms for 5 000 pins" — confirmed by
  `utils/clustering.spec.ts` (best of several runs, on the test machine).

### C-21 Theming with CSS custom properties
- S: 16 `--globe-*` custom properties, each read with a literal fallback inside component styles
  (`components/*.tsx`). No TypeScript type, constant, or CSS file declares the token set.
- D: a hand-maintained table of token → fallback → used-by.
- There is **no machine-readable source of truth** from which the token reference could be
  generated (G-06).

### C-24 Lifecycle & error handling
- S: `onError` is called when the engine constructor throws (WebGL unavailable), on
  `webglcontextlost`, on dataset/texture load failure (`useGlobeAssets`), and from
  `GlobeErrorBoundary` for render errors; the globe then renders `GlobeFallback`.
- D: lists the same four causes. Confirmed by reading; **no test exercises `onError`**.
- D: "Unmount disposes everything… twenty mount/unmount cycles leak nothing" — confirmed by e2e.

### C-25 Accessibility & reduced motion
- S: visually hidden `role="status"` live region announcing the hovered country; built-in controls
  are `<button>`s with `aria-label` and focus-visible outlines; `prefers-reduced-motion` stops
  flights, auto-rotate, cloud drift and connection flow (`GlobeEngine.ts`, `SurfaceLayer.ts`,
  `ConnectionLayer.ts`).
- D: same claims. Confirmed by reading; untested.

---

## Items that are not capabilities

Found in S or D, but they are guides, reference or tooling rather than user-facing capabilities.
Phase 2 decides where they live.

| Item | Evidence | Likely PPDS section |
|---|---|---|
| Performance contract (render-on-demand loop, IntersectionObserver/visibility pause, 20 Hz overlay sets, 10 Hz cloud steps, idle-callback land triangulation at zoom < 2.4, per-URL decode cache) | S confirms every mechanism; D "Performance contract". **"~270 ms" triangulation figure is unmeasured** (G-07) | Guides › Performance |
| TypeScript types (22 exported types) | `index.ts` | Reference (generated) |
| Default values | `defaults.ts` `GLOBE_DEFAULTS`, `DEFAULT_CAMERA`, constants | Reference (generated) — defaults are **not** in the `.d.ts` (G-06) |
| Dev-mode warnings (camera + defaultCamera; showCountryNameOnHover ignored; unknown connection endpoint; asset load errors) | `Globe.tsx` `devWarn` | Reference / Guides › Best practices |
| Data attributes `data-globe-root`, `data-globe-fallback` | `Globe.tsx`, `GlobeFallback.tsx` | Reference (candidate testing hooks) — undocumented (G-04) |
| Bundled assets and their public-domain sources | `src/assets/*`, `scripts/globe-assets.mjs`, README "Sources" | Resources or Customization |
| Asset regeneration script | `scripts/globe-assets.mjs` | Contributor docs, not product docs |
| Demo playground | `apps/demo` | Demos / Showcase (conditional section) |

## Marketing claims with no capability behind them

None found. Every README feature bullet maps to at least one capability above; the two overreaching
claims (C-16 "any texture or dataset", C-17 "interactive frame rate") are recorded as
discrepancy/unverified rather than as missing capabilities.
