# react-globe

A React component that renders a detailed, interactive 3D Earth with plain three.js, plus a demo
application that exercises every public prop live.

**Using the package?** See [packages/globe/README.md](packages/globe/README.md) for installation
and the full API.

## Layout

```
packages/globe/     the library, published to npm as `react-globe`
apps/demo/          the playground: a full-viewport globe with a live control for every prop
e2e/                Playwright suite driving the demo
scripts/            globe-assets.mjs, which regenerates every bundled asset
```

The demo consumes the library's **built** output (`packages/globe/dist`), which keeps the library
build honest.

## Development

Requires Node 20+ and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up).

```bash
pnpm install
pnpm build          # library: JS bundle, compiled CSS, declarations, assets
pnpm dev            # build once, then watch the library and serve the demo at http://localhost:5173
pnpm test           # unit tests (Vitest + jsdom)
pnpm typecheck      # library and demo
pnpm e2e            # Playwright suite (needs `pnpm build` first; starts the demo itself)
pnpm assets         # re-download and regenerate packages/globe/src/assets/*
```

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
[Natural Earth](https://www.naturalearthdata.com/) vectors. The normal and specular maps are
derived from those by `scripts/globe-assets.mjs`.

## License

[MIT](LICENSE)
