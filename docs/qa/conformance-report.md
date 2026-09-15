# PPDS v1.0 conformance — React Globe

Build: `apps/docs/dist` · 80 pages · 2026-09-15 · gate `phase6` (checks 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26)

| # | Check | Result | Gate |
|---|---|---|---|
| 1 | Every docs page resolves to exactly one archetype and contains all its required blocks | PASS | required |
| 2 | Exactly one H1 per page; heading levels never skip | PASS | required |
| 3 | Capability pages contain ## Basics, ## Customization, ## Limitations, ## API in that order | PASS | required |
| 4 | No capability page exceeds 8 H2s or ~2,000 words | PASS | required |
| 5 | Sidebar section order matches §5 | PASS | required |
| 6 | Sidebar, features index and feature matrix render from the same nav data | PASS | required |
| 7 | Nav depth ≤ 3 | PASS | required |
| 8 | Every nav node's pathname resolves to a real page or is an explicit virtual group | PASS | required |
| 9 | Every badge on a rendered page traces back to a nav-node plan/lifecycle | PASS | required |
| 10 | No reference/*.schema.json hand-edited since the last generation (checksum) | PASS | required |
| 11 | Every symbols entry has a reference page | PASS | required |
| 12 | Every reference page's usedBy is non-empty or marked internal | PASS | required |
| 13 | Every pricing-matrix row href resolves | N/A | required |
| 14 | Every capability with a non-free plan appears in the matrix | N/A | required |
| 15 | Every plan card has a distinct CTA verb | N/A | required |
| 16 | llms.txt exists, lists every published docs page, and every entry resolves | PASS | required |
| 17 | Every docs URL + .md returns Markdown | PASS | required |
| 18 | sitemap.xml covers both surfaces | PASS | required |
| 19 | Every page emits the full §7.6 meta set | PASS | required |
| 20 | llms.txt description == meta description == H1 subtitle, per page | PASS | required |
| 21 | Every page has a canonical URL with trailing slash | PASS | required |
| 22 | Every legacy URL 301s | PASS | required |
| 23 | No internal link 404s | PASS | required |
| 24 | Old version docs still resolve | PASS | required |
| 25 | Same section names, badge vocabulary, footer columns and taxonomy terms as the portfolio | PASS | required |
| 26 | Shared components are imported from one place, not forked per plugin | PASS | required |

## Details

### 6. Sidebar, features index and feature matrix render from the same nav data — PASS

Feature matrix: n/a — untiered (EXCEPTIONS E-01).

### 9. Every badge on a rendered page traces back to a nav-node plan/lifecycle — PASS

0 badge(s) rendered.

### 11. Every symbols entry has a reference page — PASS

33 distinct symbol(s) declared across pages; 33 generated.

### 13. Every pricing-matrix row href resolves — N/A

Untiered (EXCEPTIONS E-01).

### 14. Every capability with a non-free plan appears in the matrix — N/A

Untiered (EXCEPTIONS E-01).

### 15. Every plan card has a distinct CTA verb — N/A

Untiered (EXCEPTIONS E-01).

### 17. Every docs URL + .md returns Markdown — PASS

Generated reference is appended to twins in Phase 4.

### 18. sitemap.xml covers both surfaces — PASS

Docs surface only: no marketing surface exists yet (EXCEPTIONS E-02).

### 19. Every page emits the full §7.6 meta set — PASS

plugin:categoryId is emitted empty: categoryId is null until a portfolio exists (EXCEPTIONS E-02).

### 22. Every legacy URL 301s — PASS

1 redirect(s) verified over HTTP; 17 exempt: https://github.com/kiralygyula92/react-globe — repository-hosted, stays live (E-03); https://github.com/kiralygyula92/react-globe/blob/main/packages/globe/README.md — repository-hosted, stays live (E-03); https://github.com/kiralygyula92/react-globe/blob/main/packages/globe/CHANGELOG.md — repository-hosted, stays live (E-03); https://github.com/kiralygyula92/react-globe/blob/main/LICENSE — repository-hosted, stays live (E-03); https://github.com/kiralygyula92/react-globe/blob/main/packages/globe/LICENSE — repository-hosted, stays live (E-03); http://localhost:5173/ — local dev server only, never public (E-08); http://localhost:5173/blank — local dev server only, never public (E-08); docs/globe-package/README.md @ a2ec317 — never had a route (E-04); docs/globe-package/00-OVERVIEW.md @ a2ec317 — never had a route (E-04); docs/globe-package/01-PUBLIC-API.md @ a2ec317 — never had a route (E-04); docs/globe-package/02-ARCHITECTURE.md @ a2ec317 — never had a route (E-04); docs/globe-package/03-RENDER-STYLES.md @ a2ec317 — never had a route (E-04); docs/globe-package/04-ASSETS.md @ a2ec317 — never had a route (E-04); docs/globe-package/05-DEMO-APP.md @ a2ec317 — never had a route (E-04); docs/globe-package/06-TESTING.md @ a2ec317 — never had a route (E-04); docs/globe-package/07-PACKAGING.md @ a2ec317 — never had a route (E-04); docs/globe-package/08-CONSUMER-GUIDE.md @ a2ec317 — never had a route (E-04)

### 23. No internal link 404s — PASS

249 distinct internal target(s) across 82 HTML file(s). External links are verified live in Phase 6.

### 24. Old version docs still resolve — PASS

1 version(s) declared; no previous major exists yet.

### 25. Same section names, badge vocabulary, footer columns and taxonomy terms as the portfolio — PASS

Single plugin: consistency is checked against the canonical vocabulary.

### 26. Shared components are imported from one place, not forked per plugin — PASS

Metrics, testimonial and plan-card blocks do not exist yet (EXCEPTIONS E-01, E-02).

## Content readiness (informational)

- 0 of 47 authored pages still have a TODO one-line description.
- 0 TODO authoring comments remain.
- 0 required headings are still empty.
