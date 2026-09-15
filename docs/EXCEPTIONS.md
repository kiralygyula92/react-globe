# EXCEPTIONS

Documented deviations from PPDS v1.0 for `react-globe` (brief operating rule 1). Anything not listed
here must conform. Each entry names the rule, the deviation, the reason and what would remove it.

Opened in Phase 2 (Model), 2026-09-15.

| ID | Rule | Status |
|---|---|---|
| E-01 | §5 D, §6 H, §8.6, §9 F6, §7.1 tier sentence | Accepted (owner: free for now) |
| E-02 | §2.1, §2.3, §6 G, §12 shared components | Deferred to portfolio decision (GAPS G-10) |
| E-03 | §10 "every row MUST have a redirect target", R6 | Accepted (owner) |
| E-04 | §10 retire rule | Accepted (owner) |
| E-05 | R2 vs §3/§5 Overview location | Accepted (interpretation) |
| E-06 | §5 section 9 Migration "one page per version jump" | Accepted until first breaking release |
| E-07 | §5 section 7 Integrations "one page per named target" | Pending GAPS G-08 |

---

## E-01 — Untiered plugin: no pricing, no feature matrix, no conversion flow
- **Rules:** PPDS §6 archetype D (feature matrix, "required for tiered plugins"), archetype H
  (pricing), §8.6 `pricing.json`, §9 flow F6, §7.1 tier-explanation sentence.
- **Deviation:** `plugin.config.json` declares one tier (`free`, `badge: null`); every capability nav
  node has `plan: "free"`. No `pricing.json`, no `/react-globe/features/` matrix, no `/pricing/` page;
  F6 is not applicable; the Overview carries no tier sentence.
- **Reason:** the package is MIT-licensed with no commercial model. PPDS makes D mandatory only for
  tiered plugins and the schema allows a single `free` tier.
- **Removed by:** introducing a paid tier — then add `pricing.json`, archetypes D and H, and F6.

## E-02 — No marketing surface or shared portfolio chrome in this plugin's model
- **Rules:** §2.1 marketing surface, §2.3 shared footer, §6 archetype G landing, §12 shared components.
- **Deviation:** Phase 2 models only the docs surface under `/react-globe/`. No landing page, header
  mega-menu entries, footer columns or `branding` block are defined; `categoryId` is `null`.
- **Reason:** no portfolio site, brand, other plugins or shared component library exist (GAPS G-10).
  These are portfolio-level artefacts, not per-plugin data (§12), and inventing them violates brief
  operating rule 4.
- **Removed by:** a portfolio decision on where the marketing surface and shared components live.

## E-03 — Repository-hosted legacy URLs stay live instead of redirecting
- **Rules:** §10 "every row MUST have a redirect target"; R6 "every URL that existed before … MUST
  301".
- **Deviation:** rows for `README.md`, `packages/globe/README.md`, `CHANGELOG.md` and both `LICENSE`
  files in `docs/migration/url-map.csv` have redirect `none — URL stays live`.
- **Reason:** those URLs are served by GitHub (and npm, for the package README), which cannot issue
  redirects, and the files must continue to exist in the repository and the npm tarball. Nothing is
  removed, so P12 (nothing deleted) is satisfied; the files link to their docs targets instead.
- **Removed by:** not removable while the repository is the host of those files.

## E-04 — Historical specification retired without a live route
- **Rules:** §10 decision rules and "every row MUST have a redirect target"; P12.
- **Deviation:** the 10 `docs/globe-package/*` files are mapped `retire` with a nominal redirect to
  `/react-globe/`; their content is not ported.
- **Reason:** never published (no route, no traffic), and removed in `7f39b13` at the owner's
  instruction because they described the originating application. §10 forbids `retire` only for
  content "with traffic but no home".
- **Removed by:** not applicable; confirm under GAPS G-14.

## E-05 — Overview lives at `/react-globe/`; `/react-globe/getting-started/` redirects to it
- **Rules:** R2 ("`/getting-started/` is Overview") vs §3 (`/{plugin-id}/` → docs root = Overview) and
  §5 section 1 ("Overview (= `/{id}/`)").
- **Interpretation:** the Overview has one canonical URL, `/react-globe/`. The Getting started section
  node is a virtual group (`/react-globe/getting-started-group`), and `/react-globe/getting-started/`
  301s to `/react-globe/` (last row of `url-map.csv`), so R2's bare path still resolves.
- **Reason:** two canonical URLs for one page would violate R4.
- **Removed by:** a clarification of R2 in the standard.

## E-06 — Migration section enabled with no pages
- **Rule:** §5 section 9, "one page per version jump".
- **Deviation:** `migration` is enabled (mandatory) but `/react-globe/migration-group` has no children.
- **Reason:** `1.0.0` is the first release; there is no version jump to document (GAPS G-13). A
  placeholder page would be content with no source.
- **Removed by:** the first breaking release (`1.x → 2.0`) adds `/react-globe/migration/v1-to-v2/`.

## E-07 — Integrations section has a single target
- **Rule:** §5 section 7, "one page per named target".
- **Deviation:** only `/react-globe/integrations/vite/`.
- **Reason:** Vite is the only integration exercised by the repository (demo app). webpack, Next.js /
  SSR, Rollup-as-consumer and native ESM are claimed or plausible but unverified; publishing pages for
  them would be an invented compatibility claim (brief operating rule 4; GAPS G-08).
- **Removed by:** each target verified (build + render check) gets its own page.
