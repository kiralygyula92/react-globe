# React Globe — standalone package specification

**Audience:** an agent (or engineer) building this as a fresh, standalone repository, with no
access to the Wanderglobe application. Everything needed is in this folder.

**What you are building:** an npm-publishable React component library that renders a detailed,
interactive 3D Earth, plus a demo application that exercises every public prop live.

## Document set

Read them in order. Each is self-contained enough to work from, but `02` and `03` are the
implementation contract and must be followed closely.

| File | What it covers |
|---|---|
| `00-OVERVIEW.md` (this file) | Mission, deliverables, repo layout, toolchain, build phases |
| `01-PUBLIC-API.md` | Every exported type, prop, default, and semantic rule |
| `02-ARCHITECTURE.md` | Engine, camera model, controls, layers, overlays, frame loop |
| `03-RENDER-STYLES.md` | The four render styles, shaders, palettes, derived fields |
| `04-ASSETS.md` | Datasets, textures, the vendoring script, licences, caching |
| `05-DEMO-APP.md` | The demo page (playground) — complete, control by control |
| `06-TESTING.md` | Unit tests and end-to-end tests, with the assertions that matter |
| `07-PACKAGING.md` | Library build, package.json, asset strategy, CSS strategy |
| `08-CONSUMER-GUIDE.md` | Step-by-step: install and use it in another app |

---

## 1. Mission

Build a single React component — `<Globe />` — that draws an interactive 3D Earth, and ships as
an npm package with no dependency on any host application.

Hard requirements carried over from the original implementation:

1. **Plain three.js.** No `@react-three/fiber`, no `@react-three/drei`. The package's only
   runtime peer dependencies are `react`, `react-dom` and `three`.
2. **One component, everything as props.** No context providers, no global stores, no
   imperative setup. `<Globe />` with zero props must render a working Earth.
3. **Sealed.** The module imports nothing from a host app. Colours have literal fallbacks;
   design tokens are read through the DOM, never imported.
4. **Self-hosted assets.** Nothing is fetched from a third-party host at runtime.
5. **Four render styles**, three of them shaded per fragment so nothing is baked at a fixed
   resolution.
6. **5 000 pins at an interactive frame rate.**
7. **Every visual element overridable** by a consumer-supplied React component.
8. **A globe nobody is touching must cost approximately nothing per frame.**

## 2. Deliverables

- `packages/globe/` — the library, published as (suggested) `@yourscope/react-globe`.
- `apps/demo/` — a Vite application whose one route is the playground described in `05-DEMO-APP.md`.
- Unit tests (Vitest + jsdom) colocated as `*.spec.ts`.
- End-to-end tests (Playwright) driving the demo app.
- A `scripts/globe-assets.mjs` that regenerates every vendored asset from its upstream source.
- `README.md` covering the public API (the content of `01-PUBLIC-API.md` is the source material).

## 3. Repository layout

A pnpm workspace with two packages. A single-package layout also works — put the demo under
`demo/` and mark it private — but the two-package split is what makes the library build honest,
because the demo consumes the built output rather than the source.

```
react-globe/
├─ package.json                 # workspace root, private
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ playwright.config.ts
├─ scripts/
│  └─ globe-assets.mjs          # regenerates packages/globe/src/assets/*
├─ packages/
│  └─ globe/
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ vite.config.ts         # library mode
│     ├─ vitest.config.ts
│     ├─ README.md
│     └─ src/
│        ├─ index.ts                       # the only public surface
│        ├─ Globe.tsx                      # ~865 lines, the component
│        ├─ Globe.lazy.tsx                 # React.lazy wrapper
│        ├─ types.ts                       # all public types
│        ├─ defaults.ts                    # defaults, clamps, pose helpers
│        ├─ assets/
│        │  ├─ index.ts                    # URL resolution + cross-mount cache
│        │  ├─ countries-50m.geojson       # ~1.7 MB
│        │  ├─ coastline-50m.geojson       # ~1.1 MB
│        │  ├─ borders-50m.geojson         # ~350 KB
│        │  ├─ capitals-50m.json           # ~25 KB
│        │  ├─ earth-day-8192.jpg          # ~4.5 MB
│        │  ├─ earth-day-2048.jpg          # ~460 KB
│        │  ├─ earth-normal-2048.jpg       # ~340 KB
│        │  ├─ earth-specular-2048.jpg     # ~225 KB
│        │  ├─ earth-clouds-2048.jpg       # ~830 KB
│        │  └─ earth-topology.png          # ~380 KB
│        ├─ components/                    # DOM overlays and defaults
│        │  ├─ CapitalMarker.tsx
│        │  ├─ CountryLabel.tsx
│        │  ├─ CountryTooltip.tsx
│        │  ├─ DefaultCluster.tsx
│        │  ├─ DefaultConnection.tsx
│        │  ├─ DefaultControls.tsx
│        │  ├─ DefaultPinPopup.tsx
│        │  ├─ GlobeErrorBoundary.tsx
│        │  ├─ GlobeFallback.tsx
│        │  └─ GraticuleLabel.tsx
│        ├─ core/
│        │  ├─ GlobeEngine.ts              # three.js lifecycle, camera, frame loop
│        │  ├─ OverlayPositioner.ts        # per-frame DOM placement
│        │  ├─ controls/
│        │  │  └─ PointerControls.ts       # drag, wheel, pinch, tilt anchor
│        │  ├─ layers/
│        │  │  ├─ SurfaceLayer.ts          # globe body, atmosphere, clouds
│        │  │  ├─ LandLayer.ts             # triangulated country polygons
│        │  │  ├─ VectorLayer.ts           # shorelines + borders
│        │  │  ├─ GraticuleLayer.ts        # lat/lng grid
│        │  │  ├─ HighlightLayer.ts        # hovered-country fill
│        │  │  ├─ PinLayer.ts              # instanced markers
│        │  │  └─ ConnectionLayer.ts       # great-circle links
│        │  └─ materials/
│        │     ├─ surface.ts               # realistic/atmosphere/cloud materials
│        │     ├─ grayscale.ts             # shader-level desaturation
│        │     ├─ flatTexture.ts           # palettes, masks, distance field, ramps
│        │     └─ flatShader.ts            # the GLSL3 fragment shader
│        ├─ hooks/
│        │  ├─ useGlobeAssets.ts           # needs-driven loading
│        │  └─ useReducedMotion.ts
│        └─ utils/
│           ├─ coordinates.ts              # lat/lng <-> vector, great circles, fitBounds
│           ├─ geo.ts                      # GeoJSON prep, hit-testing, triangulation
│           ├─ clustering.ts               # screen-space grid clustering
│           └─ countryColors.ts            # Welsh-Powell palette assignment
└─ apps/
   └─ demo/
      ├─ package.json
      ├─ vite.config.ts
      ├─ index.html
      └─ src/
         ├─ main.tsx
         └─ GlobePlayground.tsx            # the demo page
```

### Naming and style conventions to keep

- Named exports only. No default exports anywhere.
- One `/** ... */` header comment on every file saying what it is.
- Inside the package every import is **relative**. No path aliases — an alias that leaks into
  published `.d.ts` files breaks consumers.
- Colocated tests: `foo.ts` next to `foo.spec.ts`.
- `PascalCase.tsx` for components, `camelCase.ts` for everything else.

## 4. Toolchain and dependencies

The original was built against these versions. Newer minors are fine; the majors matter.

### Library package.json dependencies

```jsonc
{
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "three": ">=0.170"
  },
  "devDependencies": {
    "@types/geojson": "^7946.0.16",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@types/three": "^0.185.4",
    "@vitejs/plugin-react": "^6.0.5",
    "typescript": "^5.6.3",
    "vite": "^8.2.1",
    "vitest": "^4.1.10",
    "jsdom": "^30.0.1"
  },
  "dependencies": {}
}
```

**`dependencies` is empty on purpose.** `@types/geojson` and `@types/three` are type-only and
cost nothing at runtime; declare them as devDependencies. Note that `@types/three` must be a
direct devDependency and not relied on transitively — the original repo was getting it hoisted
through another package, and a routine reinstall dropped it and broke the typecheck.

### Demo app extras

`@tailwindcss/vite` + `tailwindcss` v4 (the playground's classes are Tailwind v4 utilities),
`@playwright/test` for e2e.

### TypeScript

`strict: true`. No `any` in the public surface. `target: ES2022`,
`moduleResolution: "Bundler"`, `jsx: "react-jsx"`, `lib: ["ES2023", "DOM", "DOM.Iterable"]`.

### Vite dev-server note (carry this over)

The module imports `three/examples/jsm/lines/*` lazily. Left for Vite to discover mid-session,
the dev server re-optimises and answers whatever else is in flight with a 504. Pre-declare them
in **the demo app's** `vite.config.ts`:

```ts
optimizeDeps: {
  include: [
    'three',
    'three/examples/jsm/lines/Line2.js',
    'three/examples/jsm/lines/LineGeometry.js',
    'three/examples/jsm/lines/LineMaterial.js',
    'three/examples/jsm/lines/LineSegments2.js',
    'three/examples/jsm/lines/LineSegmentsGeometry.js',
  ],
}
```

This is dev-only; production builds never cared.

## 5. Suggested build phases

Each phase ends with something runnable. Do not reorder 1–4.

| Phase | Goal | Done when |
|---|---|---|
| 0 | Scaffold workspace, both packages, demo route renders "hello" | `pnpm dev` serves the demo |
| 1 | `types.ts`, `defaults.ts`, `utils/coordinates.ts`, `utils/geo.ts` + their unit tests | `pnpm test` green; landmark assertions pass |
| 2 | `assets/` vendored via `scripts/globe-assets.mjs`; `hooks/useGlobeAssets.ts` | Datasets fetch and parse in the demo |
| 3 | `GlobeEngine` + `SurfaceLayer` (realistic only) + `PointerControls` | A draggable satellite Earth |
| 4 | `Globe.tsx` shell, error boundary, fallback, `index.ts` barrel | `<Globe />` with zero props works |
| 5 | `VectorLayer`, `GraticuleLayer`, `HighlightLayer`, country hit-testing | Shorelines, borders, grid, hover fill |
| 6 | `OverlayPositioner` + DOM overlays (labels, capitals, tooltip, controls) | Country names with collision avoidance |
| 7 | `PinLayer`, `clustering.ts`, popups, cluster markers | 5 000-pin stress set is smooth |
| 8 | `ConnectionLayer` + `resolveConnection` + SVG override path | Arches and lines, animated flow |
| 9 | `flatTexture.ts`, `flatShader.ts`, `LandLayer`, `countryColors.ts` | All four render styles |
| 10 | The demo playground in full (`05-DEMO-APP.md`) | Every prop has a live control |
| 11 | Playwright suite (`06-TESTING.md`) | Suite green |
| 12 | Library build + packaging (`07-PACKAGING.md`) | `npm pack` produces a consumable tarball |

## 6. The non-negotiables

If any of these regress, the port has failed:

1. `<Globe />` with **no props** renders a physical-map Earth with shorelines and borders,
   left-drag orbit, right-drag tilt, wheel zoom.
2. The frame loop **skips `renderer.render` entirely** when nothing has changed.
3. Unmount disposes every geometry, material and texture, removes every listener, cancels the
   loop, and calls `renderer.forceContextLoss()`. Twenty mount/unmount cycles leak no context.
4. Grayscale happens **in the shader**, never as a CSS filter — pins, labels and popups keep
   their colour.
5. `enableZoom={false}` attaches **no wheel listener at all**, so the page scrolls normally.
6. A failure inside the globe shows a wordless fallback and never takes the host screen down.
7. Right-drag tilt keeps the grabbed point under the cursor to within ~2 px through 28° of tilt.
8. Country hit-testing is geometric (raycast → lat/lng → point-in-polygon), never colour picking.
