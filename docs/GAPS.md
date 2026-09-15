# GAPS

Everything missing, contradictory or unverifiable for the `react-globe` docs restructure (PPDS v1.0).
Opened in Phase 1 (Audit), 2026-09-15, against commit `7f39b13`.

Each item needs a human decision before it is closed. **Blocks** names the phase that cannot finish
while the item is open.

| ID | Severity | Blocks | Status |
|---|---|---|---|
| G-01 | Critical | Phase 2, publish | Open |
| G-02 | High | Phase 2, 5, 6 | Open |
| G-03 | High | Phase 5 | Open |
| G-04 | Medium | Phase 5 | Open |
| G-05 | Medium | Phase 4 | Open |
| G-06 | High | Phase 4 | Open |
| G-07 | High | Phase 5 | Open |
| G-08 | High | Phase 5 | Open |
| G-09 | Medium | Phase 2 | Open |
| G-10 | Medium | Phase 2, 5 | Open |
| G-11 | Medium | Phase 5 | Open |
| G-12 | Low | Phase 1 (item 6) | Open |
| G-13 | Medium | Phase 2 | Open |
| G-14 | Medium | Phase 2 (url-map) | Open |
| G-15 | Low | Phase 3 | Open |

---

## G-01 — Package name is owned by an unrelated npm package
- **Found:** `packages/globe/package.json` `name: "react-globe"`. `npm view react-globe` returns
  chrisrzhou's *react-globe* v5.0.2 (last modified 2022-06-25), repository
  `github.com/chrisrzhou/react-globe`.
- **Impact:** publishing will be rejected; the "marketplace listing" source for capability
  reconciliation (brief Phase 1 step 3) does not exist and the npm URL that would host the README
  shows someone else's product. `plugin.config.json` `id`, the docs namespace `/{plugin-id}/` and
  `links.store` all depend on the final name, and slugs are frozen after Phase 2 (R3).
- **Needs:** owner decision on the published name (e.g. a scoped `@kiralygyula92/react-globe`) before
  Phase 2.

## G-02 — No marketplace listing, no public site, no public repository
- **Found:** GitHub API returns 404 for `kiralygyula92/react-globe` anonymously (private or
  inaccessible); no GitHub Pages site; no hosted demo; package not on npm.
- **Impact:** capability reconciliation used 2 of the 3 required sources (see
  `audit/capabilities.md`). Credibility strip, install counts, ratings, showcase, testimonials (PPDS
  archetype G) have **no source data** and must stay `TODO:` (brief operating rule 4). `links.issues`,
  `links.source`, "Edit this page" deep links and the `repo` field cannot resolve publicly.
- **Needs:** confirmation of intended visibility (public repo? hosting target for the docs site and the
  demo?). Re-run reconciliation against the listing once published.

## G-03 — README overclaims asset overrides
- **Claim:** `packages/globe/README.md` › Props › Appearance: "Override any texture or dataset; anything
  left out uses the bundled file."
- **Code:** `GlobeAssets` exposes only `dayTexture`, `normalMap`, `specularMap`, `cloudsTexture`,
  `countriesGeoJson`, `capitalsDataset`. Coastline, borders, elevation and land-cover rasters are not
  overridable; shaded styles always read land cover from the bundled `earth-day-2048.jpg`.
- **Needs:** decide — narrow the claim (docs fix, becomes a `## Limitations` entry) **or** extend
  `GlobeAssets` (code change). Do not document the broader claim.

## G-04 — Undocumented behaviour
- Two-finger **pinch zoom** and **context-menu suppression** on the canvas
  (`core/controls/PointerControls.ts`).
- **No keyboard control** of the globe canvas itself (only the built-in buttons are focusable).
- `data-globe-root` and `data-globe-fallback` attributes (usable as testing hooks).
- Four **dev-mode warnings** (`Globe.tsx` `devWarn`) are not listed anywhere.
- **Needs:** confirm which are public contract (documented + generated) vs internal.

## G-05 — README signature disagrees with the type
- **Claim:** README `onPinHover` `(pin, event) => void`.
- **Code:** `(pin: Pin<TData> | null, event: PointerEvent) => void`; called with `null` on hover end
  (`Globe.tsx:438`, `:469`).
- **Impact:** proof that the hand-maintained props tables have already drifted (P5). Resolved
  automatically once reference is generated (G-06); listed so it is not ported by hand.

## G-06 — Reference source of truth is incomplete (Phase 4 blocker)
Machine-readable source exists for **types and signatures** (`packages/globe/src/types.ts`, emitted
as `dist/*.d.ts`). It is **insufficient** for PPDS archetype E:
- **Defaults** live in `defaults.ts` (`GLOBE_DEFAULTS`, `DEFAULT_CAMERA`, `HIGHLIGHT_BY_STYLE`,
  constants), not as `@default` tags in the declarations.
- **Descriptions**: most `GlobeProps` members and several `GlobeHandle` methods have **no JSDoc**; the
  prose exists only in the README tables.
- **CSS custom properties** (16 `--globe-*` tokens) are string literals inside components; no file
  declares the token set, its fallbacks or where each is used.
- **Hand-written reference to retire:** README Props tables (7), `GlobeHandle` interface block, Theming
  token table, asset Sources table (brief operating rule 3).
- **Needs:** decision on the generator input — e.g. add JSDoc + `@default` to `types.ts` and a typed
  token manifest — before Phase 4. **Do not substitute hand-written tables.**

## G-07 — Unverified performance claims
- "**5 000 pins at an interactive frame rate**" (README intro): e2e asserts only `fps > 1` in software
  WebGL; no measurement on real hardware.
- "Triangulating the world … costs **~270 ms**" (README Performance contract): no test or benchmark.
- "A globe nobody is touching costs **approximately nothing per frame**": mechanism confirmed in source
  (render-on-demand), not measured.
- Verified: clustering < 8 ms for 5 000 pins (unit test); 20 mount/unmount cycles leak no context
  (e2e).
- **Needs:** real measurements with stated hardware/browser, or rewording without numbers. Metrics may
  not be invented (operating rule 4).

## G-08 — Unverified compatibility claims
- Peer ranges `react >= 19`, `react-dom >= 19`, `three >= 0.170`: only `react@19.3.0` and
  `three@0.186.0` are installed and tested. `three` 0.170–0.185 untested.
- "Vite, webpack 5, Rollup and native ESM all understand" the asset URLs: only Vite is exercised (demo
  app). webpack 5, Rollup-as-consumer, native ESM, Next.js/SSR untested.
- **SSR:** no claim either way; source has almost no `typeof window` guards. Unknown.
- Browser support: no claim, no matrix. Tests run Chromium only.
- **Needs:** a compatibility test matrix or narrowed claims before the Requirements & compatibility
  page (PPDS §5 section 1) can be written. Guessing a matrix is a critical failure.

## G-09 — No tier, pricing or commercial model defined
- MIT-licensed, no plans. PPDS archetypes D (feature matrix) and H (pricing) and flow F6 are
  tier-dependent.
- **Needs:** confirm the plugin is **untiered/free** so Phase 2 sets every `plan: free`, disables
  `pricing.json`, archetype D and flow F6 — recorded in `EXCEPTIONS.md`, or declare tiers.

## G-10 — No portfolio context
- PPDS §5 feature groups, §2.1 marketing mega-menus, §2.3 shared footer and §12 shared components
  assume a multi-plugin portfolio with a shared marketing surface and component library.
- No portfolio site, other plugins, shared component package, brand, logo, product mark or accent
  colour exist in this repository.
- **Needs:** where the marketing surface and shared components live; whether this plugin is
  portfolio plugin #1 (it would then stress-test and freeze the taxonomy per §12).

## G-11 — No visual assets
- No screenshots, recordings, GIFs, OG/social images or product mark anywhere in the repo or history
  (`audit/assets.csv` A-23).
- Live demos are possible (the component runs in a browser), so the §7.2 fallback ladder should not
  be needed — but a sandbox target (StackBlitz/CodeSandbox or self-hosted) is undecided.
- **Needs:** sandbox decision; the demo app (A-01) must be split into per-capability demos.

## G-12 — No analytics or search data
- Brief Phase 1 step 6 (top 50 pages by traffic, top 30 internal search queries) cannot be done: no
  public site, no analytics, no search.
- **Impact:** Phase 5 "highest-traffic first" ordering has no data; fall back to the editorial order in
  `nav.json`.
- **Needs:** acknowledgement only.

## G-13 — Changelog and versioning are pre-release
- `CHANGELOG.md` has one entry, `1.0.0 - Unreleased`; no tags, no releases, no previous majors.
- Versions page, version selector and Migration section (PPDS §5 sections 1 and 9, §7.5) will have one
  version and no migration pages.
- **Needs:** confirm first public version number (1.0.0 vs 0.x) before `plugin.config.json`
  `currentVersion`/`versions`.

## G-14 — Removed historical documentation
- `docs/globe-package/*` (10 files, ~28 000 words, `audit/pages.csv`) existed in `a2ec317` and was
  removed in `7f39b13` at the owner's instruction because it described the originating application.
- It was never published, so no URL exists and P12 / R6 redirects do not apply — but it is legacy
  content and must appear in `migration/url-map.csv` (brief Phase 2 step 6, "every legacy URL exactly
  once").
- It was **not** used as a capability source and should not be ported, to avoid reintroducing
  originating-project material.
- **Needs:** confirm the map action for these rows (proposed: `retire`, no redirect, reason "never
  published; removed by owner"), recorded in `EXCEPTIONS.md` since §10 forbids `retire` without a
  target only for pages *with traffic*.

## G-15 — Demo app route shares title and is test infrastructure
- `/blank` has no H1 and reuses the playground's `<title>`; it exists only for the unmount e2e test.
- **Needs:** decide whether the demo app is part of the published site (Demos/Showcase) or stays a
  test harness; if published, `/blank` needs an archetype or a noindex exception.
