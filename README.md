# react-globe

An npm-publishable React component that renders a detailed, interactive 3D Earth with plain
three.js, plus a demo application that exercises every public prop live.

The specification this was built from lives in [docs/globe-package/](docs/globe-package/).

## Layout

```
packages/globe/     the library — see packages/globe/README.md for the public API
apps/demo/          the playground: a full-viewport globe with a live control for every prop
e2e/                Playwright suite driving the demo
scripts/            globe-assets.mjs, which regenerates every vendored asset
```

The demo consumes the library's **built** output (`packages/globe/dist`), which keeps the library
build honest.

## Commands

```bash
pnpm install
pnpm build          # library: JS bundle, compiled CSS, declarations, assets
pnpm dev            # build once, then watch the library and serve the demo at http://localhost:5173
pnpm test           # unit tests (Vitest + jsdom)
pnpm typecheck      # library and demo
pnpm e2e            # Playwright suite (needs `pnpm build` first; starts the demo itself)
pnpm assets         # re-download and regenerate packages/globe/src/assets/*
```

The first Playwright run may ask for its browser: `npx playwright install chromium`.

## Credits

Day imagery © [Solar System Scope](https://www.solarsystemscope.com/textures/), CC BY 4.0.
Cloud composite: NASA Earth Observatory. Vector data: [Natural Earth](https://www.naturalearthdata.com/)
(public domain). Normal, specular and topology maps: three.js and three-globe examples (MIT).
