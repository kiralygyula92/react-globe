# AGENTS.md

Instructions for AI coding agents working in this repository. Claude Code reads them through
`CLAUDE.md`. Humans: see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this repo is

A pnpm monorepo:

- `packages/globe`: the published library `@kiralygyula92/react-globe`, an interactive, detailed
  3D Earth for React, drawn with plain three.js.
- `apps/docs`: the documentation site (React, rendered to static files), which consumes the
  library's built output.
- `content/react-globe`: documentation content (site model, Markdown pages, colocated demos,
  generated reference).
- `e2e`: the Playwright suite, driving the docs playground.
- `scripts`: the asset pipeline (`globe-assets.mjs`) and the docs tooling.

## Rules

1. **Backwards-compatible defaults.** New behavior is opt-in behind a prop; changing a default is a
   breaking change.
2. **Generic and app-agnostic.** No app-specific coupling in the package: integration points are
   props, callbacks, render overrides or CSS custom properties.
3. **No runtime dependencies.** Only the peer dependencies `react`, `react-dom` and `three`.
   Styling is `globe.css`, compiled by Tailwind with the `rg:` prefix and no preflight, themed
   through `--globe-*` custom properties.
4. **Self-hosted, public-domain assets.** Nothing is fetched from a third-party host at runtime.
   Regenerate assets with `pnpm assets`, never by hand.
5. **Strict TypeScript:** no `any` in public types; every public export has JSDoc.
6. **Every behavior has an automated test:** unit (Vitest + jsdom, `*.spec.ts` next to the source)
   or e2e (Playwright against the docs playground).
7. **Accessibility is required:** labeled controls, keyboard operability, visible focus, and no
   animation under `prefers-reduced-motion`.
8. **Only original or permissively licensed material.** Third-party code or assets need a
   compatible license and an entry in `packages/globe/NOTICE`.

## Workflow

- Run `pnpm build && pnpm typecheck && pnpm test && pnpm docs:build && pnpm docs:demos && pnpm e2e`
  before committing.
- Conventional Commits (`feat(docs): …`, `fix(globe): …`), small and focused.
- Public API changes: JSDoc on the export, `pnpm docs:reference`, the matching page in
  `content/react-globe`.
- A moved page needs its old URL in `content/react-globe/redirects.json`, then `pnpm docs:vercel`.
- Never publish to npm, push tags or bump versions yourself; releases follow
  [RELEASING.md](RELEASING.md).
