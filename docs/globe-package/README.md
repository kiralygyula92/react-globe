# Globe → standalone package

Specification for extracting `src/features/globe/` into a standalone, npm-publishable React
component library, with a demo application built from the existing playground.

**Hand the whole folder to whoever is building it.** It is written to be sufficient on its own —
an agent with these eight files and no access to this repository can build the package.

## Read in order

| | |
|---|---|
| [00-OVERVIEW.md](00-OVERVIEW.md) | Mission, deliverables, repo layout, toolchain, 12 build phases, the non-negotiables |
| [01-PUBLIC-API.md](01-PUBLIC-API.md) | Complete `types.ts`, every prop and default, `GlobeHandle`, render overrides, dev warnings |
| [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | Engine, camera model, controls, the seven layers, overlay positioning, `Globe.tsx`, asset loading, error handling, performance contract |
| [03-RENDER-STYLES.md](03-RENDER-STYLES.md) | The four styles, the GLSL3 shader, palettes, land mask, distance transform, land geometry |
| [04-ASSETS.md](04-ASSETS.md) | Ten vendored files, sources and licences, the regeneration script, caching and decoding |
| [05-DEMO-APP.md](05-DEMO-APP.md) | The demo page in full — layout, fixtures, every control, the `window.__globe` test hook |
| [06-TESTING.md](06-TESTING.md) | Six unit spec files and 26 end-to-end tests, with the assertions that matter |
| [07-PACKAGING.md](07-PACKAGING.md) | Tailwind strategy, design tokens, the `?url` problem, `__DEV__`, `package.json`, library build |
| [08-CONSUMER-GUIDE.md](08-CONSUMER-GUIDE.md) | Step-by-step install and use, the three integration patterns, verification checklist, troubleshooting |

## Where this came from

Derived from the current implementation at [`src/features/globe/`](../../src/features/globe/) —
41 source files, ~8 400 lines — plus its
[README](../../src/features/globe/README.md) and
[DECISIONS](../../src/features/globe/DECISIONS.md), the demo page at
[`playground/GlobePlayground.tsx`](../../src/features/globe/playground/GlobePlayground.tsx), the
asset script at [`scripts/globe-assets.mjs`](../../scripts/globe-assets.mjs), and the end-to-end
suite at [`e2e/globe-feature.spec.ts`](../../e2e/globe-feature.spec.ts).

Constants, thresholds and palettes throughout are the ones the implementation actually ships. Many
were arrived at by measurement or by fixing a specific visible bug — the reasoning is recorded
alongside them so they are not "cleaned up" back into the bug.
