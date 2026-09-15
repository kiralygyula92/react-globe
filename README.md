# react-globe

A React component that renders a detailed, interactive 3D Earth with plain three.js, plus a demo
application that exercises every public prop live.

**Using the package?** See [packages/globe/README.md](packages/globe/README.md) for installation
and the full API.

## Layout

```
packages/globe/     the library, published to npm as `react-globe`
apps/demo/          the playground: a full-viewport globe with a live control for every prop
apps/docs/          the documentation site (Astro), built to the PPDS v1.0 standard
content/react-globe/  docs content and nav data: plugin.config.json, nav.json, titles.json, Markdown
docs/               PPDS audit, migration map, GAPS.md and EXCEPTIONS.md
e2e/                Playwright suite driving the demo
scripts/            globe-assets.mjs (bundled assets) and ppds/ (docs scaffold, validation, conformance)
```

The demo consumes the library's **built** output (`packages/globe/dist`), which keeps the library
build honest.

## Development

Requires Node 22.12+ and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up).

```bash
pnpm install
pnpm build          # library: JS bundle, compiled CSS, declarations, assets
pnpm dev            # build once, then watch the library and serve the demo at http://localhost:5173
pnpm test           # unit tests (Vitest + jsdom)
pnpm typecheck      # library, demo and docs site
pnpm e2e            # Playwright suite (needs `pnpm build` first; starts the demo itself)
pnpm assets         # re-download and regenerate packages/globe/src/assets/*
```

### Documentation site

```bash
pnpm docs:dev       # docs site at http://localhost:4321/react-globe/
pnpm docs:build     # validate the model, check every nav page has a file, build apps/docs/dist
pnpm docs:check     # PPDS §11 conformance report against the build (--gate phase3 to gate)
pnpm docs:scaffold  # create stub pages for new nav.json entries; never overwrites
```

Pages and their order are data: add a page to `content/react-globe/nav.json` and `titles.json`, run
`pnpm docs:scaffold`, then write the stub. Read `docs/ppds/02-plugin-docs-standard.md` before editing
pages, templates or nav data. Set `DOCS_SITE_URL` to the production origin when building for release.

The first Playwright run may ask for its browser: `npx playwright install chromium`. If port 5173 is
taken, set `DEMO_PORT` (for example `DEMO_PORT=5199 pnpm e2e`): Playwright otherwise reuses
whatever server is already listening there.

## Releasing

1. Bump `version` in `packages/globe/package.json` and add an entry to
   `packages/globe/CHANGELOG.md`.
2. Commit, tag `vX.Y.Z` and push the tag.
3. Publish a GitHub release for the tag. The `publish` workflow runs typecheck, tests and the build,
   then publishes with provenance. It needs an `NPM_TOKEN` repository secret.

To publish by hand instead: `pnpm --filter react-globe publish` (`prepublishOnly` runs the
checks and the build).

To preview exactly what would ship: `pnpm --filter react-globe pack` after `pnpm build`.

## Data sources

All bundled imagery and vector data is public domain: NASA Blue Marble: Next Generation, NASA
Earth Observatory clouds, NASA Visible Earth GEBCO elevation, and
[Natural Earth](https://www.naturalearthdata.com/) vectors. Translated country and capital names come
from Natural Earth and [Wikidata](https://www.wikidata.org/) labels (CC0). The normal and specular
maps are derived from those by `scripts/globe-assets.mjs`.

## License

[MIT](LICENSE)
